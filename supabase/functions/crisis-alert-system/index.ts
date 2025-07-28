import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrisisAlert {
  userId: string;
  content: string;
  riskLevel: 'medium' | 'high' | 'critical';
  source: string;
  location?: { lat: number; lng: number };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, content, riskLevel, source, location }: CrisisAlert = await req.json();

    console.log(`Crisis alert triggered for user ${userId}, risk level: ${riskLevel}`);

    // Create crisis event record
    const { data: crisisEvent, error: crisisError } = await supabase
      .from('crisis_events')
      .insert({
        user_id: userId,
        risk_level: riskLevel,
        notes: `Crisis detected via ${source}`,
        location_data: location || null,
        emergency_contacts_notified: false,
        professional_contacted: false,
        crisis_resolved: false
      })
      .select()
      .single();

    if (crisisError) {
      throw new Error(`Failed to create crisis event: ${crisisError.message}`);
    }

    // Get user's emergency contacts
    const { data: emergencyContacts } = await supabase
      .from('crisis_contacts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_emergency_contact', true)
      .order('priority_order');

    // Get user profile for personalization
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    const userName = profile?.full_name || 'User';

    // Prepare alert messages
    const alertMessage = riskLevel === 'critical' 
      ? `URGENT: ${userName} may be in immediate crisis. Please contact them immediately.`
      : `ALERT: ${userName} may need support. Please check on them when possible.`;

    const detailedMessage = `
Crisis Alert Details:
- User: ${userName}
- Risk Level: ${riskLevel.toUpperCase()}
- Source: ${source}
- Time: ${new Date().toISOString()}
- Content Preview: ${content.substring(0, 200)}...

Please reach out to provide support or contact emergency services if needed.
    `.trim();

    // Send notifications to emergency contacts
    if (emergencyContacts && emergencyContacts.length > 0) {
      for (const contact of emergencyContacts.slice(0, 3)) { // Limit to top 3 contacts
        try {
          // Mock SMS/Email notification (implement with real service)
          console.log(`Sending crisis alert to ${contact.name}: ${contact.phone_number || contact.email}`);
          
          // Log notification attempt
          await supabase
            .from('audit_logs')
            .insert({
              user_id: userId,
              action: 'CRISIS_NOTIFICATION_SENT',
              details_encrypted: JSON.stringify({
                contact_id: contact.id,
                contact_name: contact.name,
                notification_method: contact.phone_number ? 'sms' : 'email',
                risk_level: riskLevel,
                timestamp: new Date().toISOString()
              })
            });

        } catch (notificationError) {
          console.error(`Failed to notify contact ${contact.name}:`, notificationError);
        }
      }

      // Update crisis event - contacts notified
      await supabase
        .from('crisis_events')
        .update({ emergency_contacts_notified: true })
        .eq('id', crisisEvent.id);
    }

    // Create follow-up tasks
    const followUpTasks = [
      {
        user_id: userId,
        crisis_event_id: crisisEvent.id,
        task_type: 'wellness_check',
        scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hours
      },
      {
        user_id: userId,
        crisis_event_id: crisisEvent.id,
        task_type: 'follow_up_call',
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    ];

    if (riskLevel === 'critical') {
      followUpTasks.push({
        user_id: userId,
        crisis_event_id: crisisEvent.id,
        task_type: 'immediate_intervention',
        scheduled_for: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      });
    }

    await supabase
      .from('follow_up_tasks')
      .insert(followUpTasks);

    // Send real-time notification to moderators/support staff
    await supabase
      .from('moderation_queue')
      .insert({
        content_type: 'crisis_alert',
        content_id: crisisEvent.id,
        user_id: userId,
        flag_reason: `Crisis alert: ${riskLevel} risk detected`,
        crisis_risk: riskLevel,
        priority: riskLevel === 'critical' ? 'urgent' : 'high',
        status: 'pending'
      });

    // Log the crisis alert
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'CRISIS_ALERT_TRIGGERED',
        details_encrypted: JSON.stringify({
          crisis_event_id: crisisEvent.id,
          risk_level: riskLevel,
          source: source,
          contacts_notified: emergencyContacts?.length || 0,
          timestamp: new Date().toISOString()
        })
      });

    console.log(`Crisis alert processed successfully for user ${userId}`);

    return new Response(JSON.stringify({
      success: true,
      crisisEventId: crisisEvent.id,
      contactsNotified: emergencyContacts?.length || 0,
      followUpTasksCreated: followUpTasks.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Crisis alert system error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});