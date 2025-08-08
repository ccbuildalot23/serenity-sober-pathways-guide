import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AcknowledgeBody {
  requestId: string
  message?: string
  acknowledgmentType?: 'immediate' | 'on_my_way' | 'cant_help' | 'delegated'
  estimatedArrival?: number // minutes
  delegatedTo?: string
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

    const body: AcknowledgeBody = await req.json()
    const { 
      requestId, 
      message, 
      acknowledgmentType = 'immediate',
      estimatedArrival,
      delegatedTo
    } = body

    if (!requestId) {
      throw new Error('Request ID is required')
    }

    // Find the notification recipient record
    const { data: recipient, error: recipientError } = await supabaseClient
      .from('notification_recipients')
      .select('*, notification_requests!inner(*)')
      .eq('request_id', requestId)
      .eq('recipient_id', user.id)
      .single()

    if (recipientError || !recipient) {
      throw new Error('Notification not found or you are not a recipient')
    }

    // Check if already acknowledged
    if (recipient.acknowledged_at) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Already acknowledged',
          acknowledgedAt: recipient.acknowledged_at
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }

    // Update the recipient record
    const { error: updateError } = await supabaseClient
      .from('notification_recipients')
      .update({
        acknowledged_at: new Date().toISOString(),
        acknowledgment_message: message,
        acknowledgment_type: acknowledgmentType,
        delivery_status: 'acknowledged',
        read_at: recipient.read_at || new Date().toISOString()
      })
      .eq('id', recipient.id)

    if (updateError) {
      console.error('Failed to update acknowledgment:', updateError)
      throw new Error('Failed to acknowledge notification')
    }

    // Get the request details for the requester
    const request = recipient.notification_requests

    // Update support network member stats
    await supabaseClient
      .from('support_network_members')
      .update({
        notifications_acknowledged: supabaseClient.sql`notifications_acknowledged + 1`,
        last_acknowledged_at: new Date().toISOString()
      })
      .eq('user_id', request.user_id)
      .eq('supporter_user_id', user.id)

    // Calculate response time
    const responseTimeMinutes = Math.floor(
      (new Date().getTime() - new Date(request.created_at).getTime()) / 60000
    )

    // Broadcast acknowledgment to the requester via Realtime
    await supabaseClient.channel(`notifications:${request.user_id}`)
      .send({
        type: 'broadcast',
        event: 'support_acknowledged',
        payload: {
          requestId,
          acknowledgedBy: user.id,
          acknowledgmentType,
          message,
          estimatedArrival,
          delegatedTo,
          responseTimeMinutes,
          timestamp: new Date().toISOString()
        }
      })

    // If this is the first acknowledgment, update the request
    const { data: firstAck } = await supabaseClient
      .from('notification_requests')
      .select('first_acknowledged_at')
      .eq('id', requestId)
      .single()

    if (!firstAck?.first_acknowledged_at) {
      await supabaseClient
        .from('notification_requests')
        .update({
          first_acknowledged_at: new Date().toISOString(),
          status: 'acknowledged'
        })
        .eq('id', requestId)
    }

    // Send push notification to requester if enabled
    // This would integrate with your push notification service
    
    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        requestId,
        acknowledgmentType,
        message: 'Support acknowledgment sent',
        responseTimeMinutes,
        isFirstAcknowledgment: !firstAck?.first_acknowledged_at
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Acknowledgment error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to acknowledge support request'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 400
      }
    )
  }
})