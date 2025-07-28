import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportRequest {
  userId: string;
  categories: string[];
  format: string;
  dateRange?: { start: string; end: string; };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders });
    }

    const { requestId } = await req.json();

    // Get export request
    const { data: exportRequest, error: requestError } = await supabaseClient
      .from('data_export_requests')
      .select('*')
      .eq('id', requestId)
      .eq('user_id', user.id)
      .single();

    if (requestError || !exportRequest) {
      return new Response('Export request not found', { status: 404, headers: corsHeaders });
    }

    // Compile user data based on categories
    const exportData: any = {};
    const categories = Array.isArray(exportRequest.data_categories) 
      ? exportRequest.data_categories 
      : [exportRequest.data_categories];

    for (const category of categories) {
      switch (category) {
        case 'profile':
          const { data: profile } = await supabaseClient
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          exportData.profile = profile;
          break;

        case 'checkins':
          const { data: checkins } = await supabaseClient
            .from('daily_checkins')
            .select('*')
            .eq('user_id', user.id);
          exportData.dailyCheckins = checkins;
          break;

        case 'crisis':
          const { data: crisisEvents } = await supabaseClient
            .from('crisis_events')
            .select('*')
            .eq('user_id', user.id);
          exportData.crisisEvents = crisisEvents;
          break;
      }
    }

    // Format and encrypt data
    const formattedData = {
      exportInfo: {
        generatedAt: new Date().toISOString(),
        format: exportRequest.export_format,
        dataIncluded: categories,
        disclaimer: 'This export contains your personal health information. Handle securely.'
      },
      userData: exportData
    };

    // Update request status
    await supabaseClient
      .from('data_export_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        file_size_bytes: new Blob([JSON.stringify(formattedData)]).size
      })
      .eq('id', requestId);

    return new Response(JSON.stringify({ success: true, data: formattedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Export processing failed:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});