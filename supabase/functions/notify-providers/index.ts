import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: { persistSession: false }
      }
    )

    const { patientId, supporterId, location, alertType } = await req.json()

    console.log('Notifying providers for:', { patientId, supporterId, location, alertType })

    // Get all providers who have access to this patient
    const { data: providers, error: providersError } = await supabaseClient
      .from('user_roles')
      .select('user_id, profiles!inner(full_name, email)')
      .eq('role', 'provider')

    if (providersError) {
      console.error('Error fetching providers:', providersError)
      throw providersError
    }

    // Get patient info
    const { data: patientData, error: patientError } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', patientId)
      .single()

    if (patientError) {
      console.error('Error fetching patient:', patientError)
      throw patientError
    }

    // Get supporter info
    const { data: supporterData, error: supporterError } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', supporterId)
      .single()

    if (supporterError) {
      console.error('Error fetching supporter:', supporterError)
      throw supporterError
    }

    // Create notifications for all providers
    const notifications = providers.map(provider => ({
      user_id: provider.user_id,
      title: alertType === 'emergency_location' ? 'Emergency Location Alert' : 'Location Shared',
      message: `${patientData.full_name} has shared their location with supporter ${supporterData.full_name}. ${alertType === 'emergency_location' ? 'This is an emergency alert.' : ''}`,
      notification_type: alertType,
      metadata: {
        patient_id: patientId,
        supporter_id: supporterId,
        location: location,
        alert_type: alertType,
        timestamp: new Date().toISOString()
      },
      priority: alertType === 'emergency_location' ? 'high' : 'medium'
    }))

    // Insert notifications
    const { error: notificationError } = await supabaseClient
      .from('recovery_notifications')
      .insert(notifications)

    if (notificationError) {
      console.error('Error creating notifications:', notificationError)
      throw notificationError
    }

    // Send push notifications or SMS if configured
    // This would integrate with external services like Twilio, Firebase, etc.
    
    console.log(`Successfully notified ${providers.length} providers`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        providersNotified: providers.length,
        message: 'Providers notified successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in notify-providers function:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An error occurred while notifying providers'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})