import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationQueueItem {
  id: string;
  crisis_alert_id: string | null;
  recipient_id: string;
  priority: number;
  queue_type: string;
  scheduled_for: string;
  notification_payload: any;
  channel: string;
  retry_count: number;
  max_retries: number;
  status: string;
}

interface ProcessingResult {
  success: boolean;
  error?: string;
  deliveryStatus: 'sent' | 'delivered' | 'failed';
  retryAfter?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user } } = await supabaseClient.auth.getUser(
      req.headers.get('Authorization')?.replace('Bearer ', '') ?? ''
    )

    console.log('[NotificationProcessor] Processing notification queue...')

    // Get pending notifications that are ready to process
    const { data: pendingNotifications, error: fetchError } = await supabaseClient
      .from('notification_queue')
      .select('*')
      .eq('status', 'queued')
      .lte('scheduled_for', new Date().toISOString())
      .order('priority', { ascending: true })
      .order('scheduled_for', { ascending: true })
      .limit(50) // Process in batches

    if (fetchError) {
      console.error('[NotificationProcessor] Error fetching notifications:', fetchError)
      throw fetchError
    }

    console.log(`[NotificationProcessor] Found ${pendingNotifications?.length || 0} notifications to process`)

    const processingResults = []

    // Process each notification
    for (const notification of pendingNotifications || []) {
      try {
        // Mark as processing
        await supabaseClient
          .from('notification_queue')
          .update({
            status: 'processing',
            processing_started_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        // Process the notification based on channel
        const result = await processNotification(supabaseClient, notification)
        
        // Update notification status based on result
        const updateData: any = {
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }

        if (result.success) {
          updateData.status = 'sent'
        } else {
          // Handle failure with retry logic
          if (notification.retry_count < notification.max_retries) {
            const retryDelay = Math.min(
              notification.retry_delay_seconds * Math.pow(2, notification.retry_count),
              3600 // Max 1 hour delay
            )
            
            updateData.status = 'failed'
            updateData.retry_count = notification.retry_count + 1
            updateData.next_retry_at = new Date(Date.now() + (retryDelay * 1000)).toISOString()
            updateData.last_error = result.error
          } else {
            updateData.status = 'failed'
            updateData.last_error = `Max retries exceeded: ${result.error}`
          }
        }

        await supabaseClient
          .from('notification_queue')
          .update(updateData)
          .eq('id', notification.id)

        // Create delivery status record for real-time tracking
        if (result.success) {
          await supabaseClient
            .from('realtime_delivery_status')
            .insert({
              notification_queue_id: notification.id,
              recipient_id: notification.recipient_id,
              sent_at: new Date().toISOString(),
              delivery_events: [{
                event: 'sent',
                timestamp: new Date().toISOString(),
                channel: notification.channel
              }]
            })
        }

        processingResults.push({
          notificationId: notification.id,
          success: result.success,
          error: result.error
        })

        console.log(`[NotificationProcessor] Processed notification ${notification.id}: ${result.success ? 'SUCCESS' : 'FAILED'}`)

      } catch (error) {
        console.error(`[NotificationProcessor] Error processing notification ${notification.id}:`, error)
        
        // Mark as failed
        await supabaseClient
          .from('notification_queue')
          .update({
            status: 'failed',
            last_error: error.message,
            processed_at: new Date().toISOString()
          })
          .eq('id', notification.id)

        processingResults.push({
          notificationId: notification.id,
          success: false,
          error: error.message
        })
      }
    }

    // Clean up old processed notifications (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    await supabaseClient
      .from('notification_queue')
      .delete()
      .in('status', ['sent', 'delivered', 'cancelled'])
      .lt('processed_at', sevenDaysAgo)

    // Re-queue failed notifications that are ready for retry
    const { data: retryNotifications } = await supabaseClient
      .from('notification_queue')
      .select('id')
      .eq('status', 'failed')
      .lte('next_retry_at', new Date().toISOString())
      .lt('retry_count', supabaseClient.from('notification_queue').select('max_retries'))

    if (retryNotifications?.length) {
      await supabaseClient
        .from('notification_queue')
        .update({
          status: 'queued',
          processing_started_at: null,
          next_retry_at: null
        })
        .in('id', retryNotifications.map(n => n.id))

      console.log(`[NotificationProcessor] Re-queued ${retryNotifications.length} notifications for retry`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: processingResults.length,
        successful: processingResults.filter(r => r.success).length,
        failed: processingResults.filter(r => !r.success).length,
        results: processingResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('[NotificationProcessor] Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

/**
 * Process individual notification based on channel
 */
async function processNotification(
  supabaseClient: any, 
  notification: NotificationQueueItem
): Promise<ProcessingResult> {
  
  const payload = notification.notification_payload
  
  try {
    switch (notification.channel) {
      case 'in_app':
        return await processInAppNotification(supabaseClient, notification)
        
      case 'push':
        return await processPushNotification(supabaseClient, notification)
        
      case 'email':
        return await processEmailNotification(supabaseClient, notification)
        
      case 'whatsapp':
        return await processWhatsAppNotification(supabaseClient, notification)
        
      default:
        throw new Error(`Unsupported channel: ${notification.channel}`)
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      deliveryStatus: 'failed'
    }
  }
}

/**
 * Process in-app notification via Supabase Realtime
 */
async function processInAppNotification(
  supabaseClient: any,
  notification: NotificationQueueItem
): Promise<ProcessingResult> {
  
  try {
    // Create notification recipient record
    const { data: recipient, error: recipientError } = await supabaseClient
      .from('notification_recipients')
      .insert({
        request_id: notification.crisis_alert_id ? (
          await supabaseClient
            .from('crisis_alert_notifications')
            .select('request_id')
            .eq('id', notification.crisis_alert_id)
            .single()
        ).data?.request_id : null,
        recipient_id: notification.recipient_id,
        channel: 'in_app',
        sent_at: new Date().toISOString(),
        delivery_status: 'sent'
      })
      .select()
      .single()

    if (recipientError) {
      throw new Error(`Failed to create recipient record: ${recipientError.message}`)
    }

    // The actual real-time delivery will be handled by RealtimeNotificationService
    // when it detects the new notification_recipients record
    
    console.log(`[NotificationProcessor] In-app notification sent to ${notification.recipient_id}`)
    
    return {
      success: true,
      deliveryStatus: 'sent'
    }

  } catch (error) {
    console.error('[NotificationProcessor] Error processing in-app notification:', error)
    return {
      success: false,
      error: error.message,
      deliveryStatus: 'failed'
    }
  }
}

/**
 * Process push notification (placeholder - integrate with your push service)
 */
async function processPushNotification(
  supabaseClient: any,
  notification: NotificationQueueItem
): Promise<ProcessingResult> {
  
  try {
    // Get user's push notification preferences
    const { data: preferences } = await supabaseClient
      .from('user_notification_preferences')
      .select('channels_enabled')
      .eq('user_id', notification.recipient_id)
      .single()

    if (!preferences?.channels_enabled?.push) {
      return {
        success: false,
        error: 'Push notifications disabled for user',
        deliveryStatus: 'failed'
      }
    }

    // TODO: Integrate with your push notification service (Firebase, Apple Push, etc.)
    // For now, we'll simulate success
    console.log(`[NotificationProcessor] Push notification would be sent to ${notification.recipient_id}`)
    
    // Create recipient record
    await supabaseClient
      .from('notification_recipients')
      .insert({
        request_id: notification.crisis_alert_id ? (
          await supabaseClient
            .from('crisis_alert_notifications')
            .select('request_id')
            .eq('id', notification.crisis_alert_id)
            .single()
        ).data?.request_id : null,
        recipient_id: notification.recipient_id,
        channel: 'push',
        sent_at: new Date().toISOString(),
        delivery_status: 'sent'
      })

    return {
      success: true,
      deliveryStatus: 'sent'
    }

  } catch (error) {
    console.error('[NotificationProcessor] Error processing push notification:', error)
    return {
      success: false,
      error: error.message,
      deliveryStatus: 'failed'
    }
  }
}

/**
 * Process email notification (placeholder - integrate with your email service)
 */
async function processEmailNotification(
  supabaseClient: any,
  notification: NotificationQueueItem
): Promise<ProcessingResult> {
  
  try {
    // Get user's email
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('email')
      .eq('id', notification.recipient_id)
      .single()

    if (!profile?.email) {
      return {
        success: false,
        error: 'No email address for user',
        deliveryStatus: 'failed'
      }
    }

    // TODO: Integrate with your email service (SendGrid, AWS SES, etc.)
    // For now, we'll simulate success
    console.log(`[NotificationProcessor] Email would be sent to ${profile.email}`)
    
    // Create recipient record
    await supabaseClient
      .from('notification_recipients')
      .insert({
        request_id: notification.crisis_alert_id ? (
          await supabaseClient
            .from('crisis_alert_notifications')
            .select('request_id')
            .eq('id', notification.crisis_alert_id)
            .single()
        ).data?.request_id : null,
        recipient_id: notification.recipient_id,
        channel: 'email',
        channel_identifier: profile.email,
        sent_at: new Date().toISOString(),
        delivery_status: 'sent'
      })

    return {
      success: true,
      deliveryStatus: 'sent'
    }

  } catch (error) {
    console.error('[NotificationProcessor] Error processing email notification:', error)
    return {
      success: false,
      error: error.message,
      deliveryStatus: 'failed'
    }
  }
}

/**
 * Process WhatsApp notification (placeholder - will be implemented in Week 2)
 */
async function processWhatsAppNotification(
  supabaseClient: any,
  notification: NotificationQueueItem
): Promise<ProcessingResult> {
  
  try {
    // TODO: Implement WhatsApp Business API integration in Week 2
    console.log(`[NotificationProcessor] WhatsApp notification queued for Week 2 implementation`)
    
    return {
      success: false,
      error: 'WhatsApp notifications will be implemented in Week 2',
      deliveryStatus: 'failed',
      retryAfter: 604800 // Retry in 1 week
    }

  } catch (error) {
    console.error('[NotificationProcessor] Error processing WhatsApp notification:', error)
    return {
      success: false,
      error: error.message,
      deliveryStatus: 'failed'
    }
  }
}