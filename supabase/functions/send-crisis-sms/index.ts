import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CrisisRequest {
  contactIds?: string[]
  customMessage?: string
  includeLocation?: boolean
  isTestMessage?: boolean
  supportLevel?: string
  userLocation?: {
    latitude: number
    longitude: number
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body first to check for test messages
    const requestBody = await req.json()
    
    // SECURITY FIX: Enhanced rate limiting using database function
    // Skip rate limiting for test messages to allow testing
    const { data: rateLimitOk, error: rateLimitError } = await supabaseClient
      .rpc('check_crisis_alert_rate_limit', { user_uuid: user.id })

    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError)
      throw new Error('Security check failed. Please try again.')
    }

    if (!rateLimitOk) {
      console.warn(`Rate limit exceeded for user ${user.id}`)
      // For test messages, show a warning but allow to proceed
      const { isTestMessage } = requestBody
      if (!isTestMessage) {
        throw new Error('Crisis alert rate limit exceeded. Please wait 5 minutes between alerts for your safety.')
      }
    }

    // SECURITY FIX: Input validation and sanitization
    const { contactIds, customMessage, includeLocation, userLocation, isTestMessage }: CrisisRequest = requestBody

    // Validate input parameters
    if (customMessage && typeof customMessage !== 'string') {
      throw new Error('Invalid message format')
    }
    
    if (customMessage && customMessage.length > 1000) {
      throw new Error('Message too long (max 1000 characters)')
    }

    if (contactIds && (!Array.isArray(contactIds) || contactIds.length > 10)) {
      throw new Error('Invalid contact IDs (max 10 contacts)')
    }

    if (userLocation) {
      if (typeof userLocation.latitude !== 'number' || typeof userLocation.longitude !== 'number') {
        throw new Error('Invalid location coordinates')
      }
      if (Math.abs(userLocation.latitude) > 90 || Math.abs(userLocation.longitude) > 180) {
        throw new Error('Invalid location coordinates range')
      }
    }

    // Get user's emergency contacts
    let contactsQuery = supabaseClient
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('priority_order', { ascending: true })

    if (contactIds && contactIds.length > 0) {
      contactsQuery = contactsQuery.in('id', contactIds)
    }

    const { data: contacts, error: contactsError } = await contactsQuery
    if (contactsError) {
      throw new Error(`Failed to fetch contacts: ${contactsError.message}`)
    }

    if (!contacts || contacts.length === 0) {
      throw new Error('No emergency contacts found')
    }

    // Prepare SMS message
    const userEmail = user.email || 'Unknown user'
    let message: string
    
    if (isTestMessage && customMessage) {
      // Use the test message as provided
      message = customMessage
    } else if (customMessage) {
      message = customMessage
    } else {
      message = `🚨 CRISIS ALERT 🚨\n\n${userEmail} has activated their crisis support button and needs immediate help.\n\nPlease reach out to them as soon as possible.\n\nThis is an automated emergency message.`
    }

    if (includeLocation && userLocation) {
      message += `\n\nLocation: https://maps.google.com/maps?q=${userLocation.latitude},${userLocation.longitude}`
    }

    // Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Missing Twilio credentials')
    }

    console.log(`Sending crisis SMS to ${contacts.length} contacts for user ${user.id}`)

    // Send SMS to each contact
    const smsResults = []
    let sentCount = 0

    for (const contact of contacts) {
      try {
        const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`
          },
          body: new URLSearchParams({
            From: twilioPhoneNumber,
            To: contact.phone_number,
            Body: message
          })
        })

        const result = await response.json()
        
        if (response.ok) {
          smsResults.push({
            contact: contact.name,
            phone: contact.phone_number,
            status: 'sent',
            sid: result.sid
          })
          sentCount++
          console.log(`SMS sent successfully to ${contact.name} (${contact.phone_number})`)
        } else {
          console.error(`Failed to send SMS to ${contact.name}:`, result)
          smsResults.push({
            contact: contact.name,
            phone: contact.phone_number,
            status: 'failed',
            error: result.message || 'Unknown error'
          })
        }
      } catch (error) {
        console.error(`Error sending SMS to ${contact.name}:`, error)
        smsResults.push({
          contact: contact.name,
          phone: contact.phone_number,
          status: 'failed',
          error: error.message
        })
      }
    }

    // Log the crisis alert (don't log test messages as real alerts)
    if (!isTestMessage) {
      const { error: logError } = await supabaseClient
        .from('crisis_alerts')
        .insert({
          user_id: user.id,
          contacts_notified: sentCount,
          location_shared: includeLocation || false,
          message_sent: message,
          status: sentCount > 0 ? 'sent' : 'failed'
        })

      if (logError) {
        console.error('Failed to log crisis alert:', logError)
      }
    } else {
      console.log(`Test message sent to ${sentCount} contacts for user ${user.id}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Crisis alert sent to ${sentCount} of ${contacts.length} contacts`,
        sentCount,
        totalContacts: contacts.length,
        results: smsResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Crisis SMS Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Failed to send crisis SMS'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})