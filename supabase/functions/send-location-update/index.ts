import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LocationUpdateRequest {
  contactIds?: string[]
  userLocation: {
    latitude: number
    longitude: number
  }
  customMessage?: string
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

    const { contactIds, userLocation, customMessage }: LocationUpdateRequest = await req.json()

    if (!userLocation || !userLocation.latitude || !userLocation.longitude) {
      throw new Error('Location data is required')
    }

    // Get user's emergency contacts
    let contactsQuery = supabaseClient
      .from('crisis_contacts')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_emergency_contact', true)
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

    // Prepare location update message
    const userEmail = user.email || 'Unknown user'
    const locationUrl = `https://maps.google.com/maps?q=${userLocation.latitude},${userLocation.longitude}`
    
    let message = customMessage || `📍 LOCATION UPDATE 📍\n\n${userEmail} has shared their current location.\n\nLocation: ${locationUrl}\n\nThis is a follow-up to their previous crisis alert.`

    // Twilio credentials
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioPhoneNumber) {
      throw new Error('Missing Twilio credentials')
    }

    console.log(`Sending location update to ${contacts.length} contacts for user ${user.id}`)

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
          console.log(`Location update sent successfully to ${contact.name} (${contact.phone_number})`)
        } else {
          console.error(`Failed to send location update to ${contact.name}:`, result)
          smsResults.push({
            contact: contact.name,
            phone: contact.phone_number,
            status: 'failed',
            error: result.message || 'Unknown error'
          })
        }
      } catch (error) {
        console.error(`Error sending location update to ${contact.name}:`, error)
        smsResults.push({
          contact: contact.name,
          phone: contact.phone_number,
          status: 'failed',
          error: error.message
        })
      }
    }

    // Update the last_contacted timestamp for successfully notified contacts
    if (sentCount > 0) {
      const successfulContactIds = smsResults
        .filter(result => result.status === 'sent')
        .map(result => contacts.find(c => c.phone_number === result.phone)?.id)
        .filter(Boolean)

      if (successfulContactIds.length > 0) {
        await supabaseClient
          .from('crisis_contacts')
          .update({ last_contacted: new Date().toISOString() })
          .in('id', successfulContactIds)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Location update sent to ${sentCount} of ${contacts.length} contacts`,
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
    console.error('Location Update Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: 'Failed to send location update'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})