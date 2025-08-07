import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SupportRequestBody {
  urgencyLevel: 'crisis' | 'need_connection' | 'celebrate' | 'check_in'
  message?: string
  location?: {
    latitude: number
    longitude: number
    accuracy?: number
  }
  notifyChannels?: string[]
}

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

    const body: SupportRequestBody = await req.json()
    const { urgencyLevel, message, location, notifyChannels = ['in_app', 'whatsapp'] } = body

    // Validate urgency level
    if (!['crisis', 'need_connection', 'celebrate', 'check_in'].includes(urgencyLevel)) {
      throw new Error('Invalid urgency level')
    }

    // Start a transaction by creating the notification request
    const { data: request, error: requestError } = await supabaseClient
      .from('notification_requests')
      .insert({
        user_id: user.id,
        urgency_level: urgencyLevel,
        custom_message: message,
        location: location || null,
        status: 'pending'
      })
      .select()
      .single()

    if (requestError) {
      console.error('Failed to create request:', requestError)
      throw new Error('Failed to create support request')
    }

    // Get user's support network
    const { data: supportNetwork, error: networkError } = await supabaseClient
      .from('support_network_members')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('priority_order', { ascending: true })

    if (networkError) {
      console.error('Failed to fetch support network:', networkError)
      throw new Error('Failed to fetch support network')
    }

    if (!supportNetwork || supportNetwork.length === 0) {
      // No support network - update request status
      await supabaseClient
        .from('notification_requests')
        .update({ 
          status: 'cancelled',
          cancellation_reason: 'No support network configured'
        })
        .eq('id', request.id)

      return new Response(
        JSON.stringify({
          success: false,
          error: 'No support network configured',
          requestId: request.id,
          message: 'Please add emergency contacts in Settings'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Filter support network based on urgency preferences
    const eligibleSupporters = supportNetwork.filter(member => {
      switch (urgencyLevel) {
        case 'crisis':
          return member.notify_for_crisis
        case 'need_connection':
          return member.notify_for_connection
        case 'celebrate':
          return member.notify_for_celebration
        case 'check_in':
          return member.notify_for_check_in
        default:
          return true
      }
    })

    if (eligibleSupporters.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No support members available for this type of request',
          requestId: request.id
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Create notification recipients
    const recipientPromises = eligibleSupporters.map(async (supporter) => {
      // Determine channels to use for this supporter
      const channels = []
      
      if (notifyChannels.includes('in_app') && supporter.supporter_user_id) {
        channels.push({
          channel: 'in_app',
          identifier: null,
          recipientId: supporter.supporter_user_id
        })
      }
      
      if (notifyChannels.includes('whatsapp') && supporter.whatsapp_enabled && supporter.phone_number) {
        // Check if supporter has opted into WhatsApp
        const { data: optIn } = await supabaseClient
          .from('whatsapp_opt_ins')
          .select('status')
          .eq('user_id', supporter.supporter_user_id)
          .eq('status', 'active')
          .single()

        if (optIn) {
          channels.push({
            channel: 'whatsapp',
            identifier: supporter.phone_number,
            recipientId: supporter.supporter_user_id
          })
        }
      }
      
      if (notifyChannels.includes('email') && supporter.email_enabled && supporter.email) {
        channels.push({
          channel: 'email',
          identifier: supporter.email,
          recipientId: supporter.supporter_user_id || null
        })
      }

      // Insert recipient records for each channel
      const recipientInserts = channels.map(ch => ({
        request_id: request.id,
        recipient_id: ch.recipientId,
        channel: ch.channel,
        channel_identifier: ch.identifier,
        delivery_status: 'queued'
      }))

      if (recipientInserts.length > 0) {
        return supabaseClient
          .from('notification_recipients')
          .insert(recipientInserts)
      }
      
      return null
    })

    // Wait for all recipients to be created
    await Promise.all(recipientPromises.filter(Boolean))

    // Update request status to notified
    await supabaseClient
      .from('notification_requests')
      .update({ 
        status: 'notified',
        notified_at: new Date().toISOString()
      })
      .eq('id', request.id)

    // Trigger notification sending (this would be handled by separate workers)
    // For now, we'll trigger Realtime notifications
    await supabaseClient
      .from('notification_recipients')
      .select('*')
      .eq('request_id', request.id)
      .then(({ data: recipients }) => {
        // Broadcast to Realtime channels
        recipients?.forEach(recipient => {
          if (recipient.channel === 'in_app' && recipient.recipient_id) {
            // This will be picked up by the client's Realtime subscription
            supabaseClient.channel(`notifications:${recipient.recipient_id}`)
              .send({
                type: 'broadcast',
                event: 'new_support_request',
                payload: {
                  requestId: request.id,
                  urgencyLevel,
                  message,
                  fromUserId: user.id,
                  timestamp: new Date().toISOString()
                }
              })
          }
        })
      })

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        requestId: request.id,
        notifiedCount: eligibleSupporters.length,
        urgencyLevel,
        status: 'notified',
        message: `Support request sent to ${eligibleSupporters.length} contact${eligibleSupporters.length !== 1 ? 's' : ''}`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Support request error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to process support request'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 400
      }
    )
  }
})