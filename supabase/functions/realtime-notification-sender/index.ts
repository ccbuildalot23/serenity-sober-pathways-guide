import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  expiresInHours?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, type, title, message, data, expiresInHours = 24 }: NotificationRequest = await req.json();

    console.log(`Sending notification to user ${userId}: ${title}`);

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (expiresInHours * 60 * 60 * 1000)).toISOString();

    // Insert notification into database (real-time subscription will handle delivery)
    const { data: notification, error } = await supabase
      .from('realtime_notifications')
      .insert({
        user_id: userId,
        type,
        title,
        message,
        data: data || {},
        expires_at: expiresAt
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`Notification sent successfully: ${notification.id}`);

    return new Response(JSON.stringify({
      success: true,
      notificationId: notification.id,
      message: 'Notification sent successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Notification sender error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});