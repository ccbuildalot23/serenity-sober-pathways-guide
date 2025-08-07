import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// WhatsApp Business API configuration
const WHATSAPP_API_URL = 'https://graph.facebook.com/v17.0'
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
const WHATSAPP_ACCESS_TOKEN = Deno.env.get('WHATSAPP_ACCESS_TOKEN')

interface SendMessageBody {
  to: string
  template?: string
  parameters?: string[]
  message?: string
  type?: 'template' | 'text'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Log the incoming request
    console.log('Incoming request method:', req.method)
    console.log('WhatsApp API URL:', WHATSAPP_API_URL)
    console.log('Phone Number ID:', WHATSAPP_PHONE_NUMBER_ID ? 'Set' : 'Missing')
    console.log('Access Token:', WHATSAPP_ACCESS_TOKEN ? 'Set' : 'Missing')
    
    const body: SendMessageBody = await req.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    const { to, template, parameters, message, type = 'template' } = body

    if (!to) {
      throw new Error('Recipient phone number is required')
    }

    // Format phone number
    let formattedPhone = to.replace(/\D/g, '')
    if (formattedPhone.length === 10) {
      formattedPhone = `1${formattedPhone}` // Add US country code
    }

    let requestBody: any = {
      messaging_product: 'whatsapp',
      to: formattedPhone
    }

    if (type === 'template' && template) {
      // Send template message
      requestBody.type = 'template'
      requestBody.template = {
        name: template,
        language: { code: 'en_US' }
      }

      if (parameters && parameters.length > 0) {
        requestBody.template.components = [
          {
            type: 'body',
            parameters: parameters.map(param => ({
              type: 'text',
              text: param
            }))
          }
        ]
      }
    } else if (type === 'text' && message) {
      // Send plain text message
      requestBody.type = 'text'
      requestBody.text = { body: message }
    } else {
      throw new Error('Invalid message configuration')
    }

    console.log('Sending WhatsApp message:', JSON.stringify(requestBody, null, 2))

    // Send via WhatsApp Business API
    const whatsappResponse = await fetch(
      `${WHATSAPP_API_URL}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      }
    )

    const responseText = await whatsappResponse.text()
    let whatsappData
    try {
      whatsappData = JSON.parse(responseText)
    } catch {
      console.error('Failed to parse WhatsApp response:', responseText)
      throw new Error('Invalid response from WhatsApp API')
    }
    
    if (!whatsappResponse.ok) {
      console.error('WhatsApp API error:', whatsappData)
      console.error('Status:', whatsappResponse.status)
      console.error('Response:', responseText)
      throw new Error(whatsappData.error?.message || `WhatsApp API error: ${whatsappResponse.status}`)
    }

    console.log('WhatsApp message sent successfully:', whatsappData)

    // Store in database for tracking
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    await supabaseClient
      .from('whatsapp_messages')
      .insert({
        whatsapp_message_id: whatsappData.messages?.[0]?.id,
        to_number: `+${formattedPhone}`,
        message_type: type,
        template_name: template,
        message_body: message,
        sent_at: new Date().toISOString(),
        status: 'sent'
      })

    return new Response(
      JSON.stringify({
        success: true,
        messageId: whatsappData.messages?.[0]?.id,
        to: `+${formattedPhone}`,
        status: 'sent'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Send WhatsApp error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send WhatsApp message'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})