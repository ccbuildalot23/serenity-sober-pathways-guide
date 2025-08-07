import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Webhook verification token (set in Meta Business Platform)
const WEBHOOK_VERIFY_TOKEN = Deno.env.get('WHATSAPP_WEBHOOK_VERIFY_TOKEN') || 'serenity_webhook_2025'

serve(async (req) => {
  const url = new URL(req.url)
  
  // Handle webhook verification from Meta - NO AUTH REQUIRED
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode')
    const token = url.searchParams.get('hub.verify_token')
    const challenge = url.searchParams.get('hub.challenge')
    
    console.log('Webhook verification attempt:', { mode, token, challenge })
    
    if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
      console.log('Webhook verified successfully')
      // Return ONLY the challenge value, no JSON wrapper
      return new Response(challenge, { 
        status: 200,
        headers: { 'Content-Type': 'text/plain' }
      })
    } else {
      console.error('Webhook verification failed:', { 
        expectedToken: WEBHOOK_VERIFY_TOKEN, 
        receivedToken: token,
        mode 
      })
      return new Response('Forbidden', { status: 403 })
    }
  }

  // Handle webhook events from Meta
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2))

      // Create Supabase client with service role
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Process each entry
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          const value = change.value

          // Handle message status updates
          if (value.statuses) {
            for (const status of value.statuses) {
              await handleMessageStatus(supabaseClient, status)
            }
          }

          // Handle incoming messages
          if (value.messages) {
            for (const message of value.messages) {
              await handleIncomingMessage(supabaseClient, message, value.contacts)
            }
          }
        }
      }

      // Return 200 to acknowledge receipt
      return new Response('EVENT_RECEIVED', { 
        status: 200,
        headers: corsHeaders 
      })

    } catch (error) {
      console.error('Webhook processing error:', error)
      // Still return 200 to prevent retries
      return new Response('EVENT_RECEIVED', { 
        status: 200,
        headers: corsHeaders 
      })
    }
  }

  return new Response('Method not allowed', { 
    status: 405,
    headers: corsHeaders 
  })
})

// Handle message delivery status updates
async function handleMessageStatus(supabaseClient: any, status: any) {
  const { id, status: deliveryStatus, timestamp, recipient_id } = status
  
  console.log(`Message ${id} to ${recipient_id}: ${deliveryStatus}`)

  // Map WhatsApp status to our status
  const statusMap: Record<string, string> = {
    'sent': 'sent',
    'delivered': 'delivered',
    'read': 'read',
    'failed': 'failed'
  }

  const mappedStatus = statusMap[deliveryStatus] || deliveryStatus

  // Update notification recipient status
  const { error } = await supabaseClient
    .from('notification_recipients')
    .update({
      delivery_status: mappedStatus,
      [`${mappedStatus}_at`]: new Date(parseInt(timestamp) * 1000).toISOString(),
      whatsapp_message_id: id
    })
    .eq('whatsapp_message_id', id)

  if (error) {
    console.error('Failed to update message status:', error)
  }

  // If delivered or read, update analytics
  if (['delivered', 'read'].includes(mappedStatus)) {
    await updateNotificationAnalytics(supabaseClient, mappedStatus)
  }
}

// Handle incoming WhatsApp messages
async function handleIncomingMessage(supabaseClient: any, message: any, contacts: any[]) {
  const { from, id, timestamp, text, type } = message
  
  // Get contact info
  const contact = contacts?.find(c => c.wa_id === from)
  const phoneNumber = `+${from}`
  
  console.log(`Incoming message from ${phoneNumber}: ${text?.body}`)

  // Check if this is an acknowledgment (ACK or similar keywords)
  const acknowledgmentKeywords = ['ack', 'acknowledged', 'on my way', 'omw', 'coming', 'yes', 'ok', 'okay']
  const isAcknowledgment = text?.body && acknowledgmentKeywords.some(
    keyword => text.body.toLowerCase().includes(keyword)
  )

  if (isAcknowledgment) {
    // Find the most recent unacknowledged notification for this phone number
    const { data: recipient } = await supabaseClient
      .from('notification_recipients')
      .select('*, notification_requests!inner(*)')
      .eq('channel_identifier', phoneNumber)
      .eq('channel', 'whatsapp')
      .is('acknowledged_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (recipient) {
      // Update acknowledgment
      await supabaseClient
        .from('notification_recipients')
        .update({
          acknowledged_at: new Date(parseInt(timestamp) * 1000).toISOString(),
          acknowledgment_message: text.body,
          acknowledgment_type: 'immediate',
          delivery_status: 'acknowledged'
        })
        .eq('id', recipient.id)

      // Get user ID from WhatsApp opt-in
      const { data: optIn } = await supabaseClient
        .from('whatsapp_opt_ins')
        .select('user_id')
        .eq('phone_number', phoneNumber)
        .eq('status', 'active')
        .single()

      if (optIn) {
        // Broadcast acknowledgment via Realtime
        const request = recipient.notification_requests
        await supabaseClient.channel(`notifications:${request.user_id}`)
          .send({
            type: 'broadcast',
            event: 'whatsapp_acknowledged',
            payload: {
              requestId: request.id,
              acknowledgedBy: phoneNumber,
              message: text.body,
              timestamp: new Date(parseInt(timestamp) * 1000).toISOString()
            }
          })
      }

      console.log(`Acknowledgment processed for request ${recipient.request_id}`)
    }
  }

  // Check for opt-out messages
  const optOutKeywords = ['stop', 'unsubscribe', 'opt out', 'remove']
  const isOptOut = text?.body && optOutKeywords.some(
    keyword => text.body.toLowerCase() === keyword
  )

  if (isOptOut) {
    // Process opt-out
    await supabaseClient
      .from('whatsapp_opt_ins')
      .update({
        status: 'opted_out',
        opted_out_at: new Date(parseInt(timestamp) * 1000).toISOString()
      })
      .eq('phone_number', phoneNumber)

    console.log(`User ${phoneNumber} opted out`)
  }

  // Store message for audit trail (optional)
  await supabaseClient
    .from('whatsapp_messages')
    .insert({
      whatsapp_message_id: id,
      from_number: phoneNumber,
      message_type: type,
      message_body: text?.body,
      received_at: new Date(parseInt(timestamp) * 1000).toISOString(),
      processed: true
    })
}

// Update notification analytics
async function updateNotificationAnalytics(supabaseClient: any, event: string) {
  const now = new Date()
  const date = now.toISOString().split('T')[0]
  const hour = now.getHours()

  // Increment the appropriate counter
  const updates: Record<string, any> = {}
  
  if (event === 'delivered') {
    updates.whatsapp_sent = supabaseClient.sql`whatsapp_sent + 1`
  } else if (event === 'read') {
    // Calculate read rate
    updates.read_rate = supabaseClient.sql`
      CASE 
        WHEN whatsapp_sent > 0 
        THEN (COALESCE(read_rate * whatsapp_sent, 0) + 1) / whatsapp_sent 
        ELSE 0 
      END
    `
  }

  await supabaseClient
    .from('notification_analytics')
    .upsert({
      date,
      hour,
      ...updates
    })
    .eq('date', date)
    .eq('hour', hour)
}