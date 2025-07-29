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

    // Check rate limiting (prevent accidental multiple sends)
    const { data: recentAlert, error: alertCheckError } = await supabaseClient
      .from('crisis_alerts')
      .select('alert_time')
      .eq('user_id', user.id)
      .order('alert_time', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (alertCheckError) {
      console.warn('Failed to check recent alerts:', alertCheckError)
    }

    if (recentAlert) {
      const timeSinceLastAlert = Date.now() - new Date(recentAlert.alert_time).getTime()
      const fiveMinutesInMs = 5 * 60 * 1000
      
      if (timeSinceLastAlert < fiveMinutesInMs) {
        const waitTimeMinutes = Math.ceil((fiveMinutesInMs - timeSinceLastAlert) / (60 * 1000))
        throw new Error(`Please wait ${waitTimeMinutes} minute(s) between crisis alerts for your safety`)
      }
    }

    const { contactIds, customMessage, includeLocation, userLocation }: CrisisRequest = await req.json()

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
    let message = customMessage || `🚨 CRISIS ALERT 🚨\n\n${userEmail} has activated their crisis support button and needs immediate help.\n\nPlease reach out to them as soon as possible.\n\nThis is an automated emergency message.`

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

    // Log the crisis alert
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