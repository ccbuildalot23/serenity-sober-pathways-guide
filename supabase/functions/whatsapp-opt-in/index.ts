import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OptInBody {
  phoneNumber: string
  consentMethod: 'qr_code' | 'sms_link' | 'in_app' | 'manual'
  consentMessage?: string
}

// WhatsApp Business API configuration
const WHATSAPP_API_URL = 'https://graph.facebook.com/v17.0'
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
const _WHATSAPP_BUSINESS_ID = Deno.env.get('WHATSAPP_BUSINESS_ID')

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client with user context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const body: OptInBody = await req.json()
    const { phoneNumber, consentMethod, consentMessage } = body

    if (!phoneNumber) {
      throw new Error('Phone number is required')
    }

    // Validate and format phone number
    let formattedPhone = phoneNumber.replace(/\D/g, '')
    
    // Add country code if not present (assuming US)
    if (formattedPhone.length === 10) {
      formattedPhone = `+1${formattedPhone}`
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+${formattedPhone}`
    }

    // Validate phone format
    if (!/^\+[1-9]\d{1,14}$/.test(formattedPhone)) {
      throw new Error('Invalid phone number format')
    }

    // Check if already opted in
    const { data: existingOptIn } = await supabaseClient
      .from('whatsapp_opt_ins')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (existingOptIn && existingOptIn.status === 'active') {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Already opted in to WhatsApp notifications',
          optedInAt: existingOptIn.opted_in_at
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Store or update opt-in record with pending status
    const { data: optIn, error: optInError } = await supabaseClient
      .from('whatsapp_opt_ins')
      .upsert({
        user_id: user.id,
        phone_number: formattedPhone,
        country_code: formattedPhone.substring(0, formattedPhone.length - 10),
        consent_method: consentMethod,
        consent_message: consentMessage || `User opted in via ${consentMethod}`,
        status: 'pending',
        verification_code: verificationCode,
        verification_attempts: 0
      })
      .select()
      .single()

    if (optInError) {
      console.error('Failed to create opt-in record:', optInError)
      throw new Error('Failed to process opt-in request')
    }

    // Send verification message via WhatsApp Business API
    if (WHATSAPP_PHONE_NUMBER_ID && WHATSAPP_ACCESS_TOKEN) {
      try {
        const whatsappResponse = await fetch(
          `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: formattedPhone.replace('+', ''),
              type: 'template',
              template: {
                name: 'opt_in_verification', // You need to create this template in Meta Business
                language: {
                  code: 'en_US'
                },
                components: [
                  {
                    type: 'body',
                    parameters: [
                      {
                        type: 'text',
                        text: verificationCode
                      }
                    ]
                  }
                ]
              }
            })
          }
        )

        const whatsappData = await whatsappResponse.json()
        
        if (!whatsappResponse.ok) {
          console.error('WhatsApp API error:', whatsappData)
          // Don't fail the whole process, just log the error
        } else {
          // Update with WhatsApp message ID
          await supabaseClient
            .from('whatsapp_opt_ins')
            .update({
              whatsapp_user_id: whatsappData.contacts?.[0]?.wa_id
            })
            .eq('id', optIn.id)
        }
      } catch (whatsappError) {
        console.error('WhatsApp send error:', whatsappError)
        // Continue anyway - user can verify manually
      }
    }

    // Generate opt-in link for fallback
    const optInLink = `${Deno.env.get('PUBLIC_URL')}/whatsapp-verify?code=${verificationCode}&id=${optIn.id}`

    // Return success with verification instructions
    return new Response(
      JSON.stringify({
        success: true,
        optInId: optIn.id,
        phoneNumber: formattedPhone,
        status: 'pending_verification',
        verificationRequired: true,
        verificationCode, // In production, don't return this
        optInLink,
        message: 'Please check WhatsApp for verification code, or use the code provided'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('WhatsApp opt-in error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process WhatsApp opt-in'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 400
      }
    )
  }
})