import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ModerationRequest {
  content: string;
  contentType: 'forum_post' | 'forum_reply' | 'success_story';
  contentId: string;
  userId: string;
}

interface ModerationResult {
  approved: boolean;
  flagged: boolean;
  sentiment: 'positive' | 'negative' | 'neutral';
  crisisRisk: 'low' | 'medium' | 'high';
  reasons: string[];
  confidence: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { content, contentType, contentId, userId }: ModerationRequest = await req.json();

    console.log(`Moderating ${contentType} content:`, { contentId, userId });

    // OpenAI moderation check
    const moderationResponse = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: content,
      }),
    });

    const moderationData = await moderationResponse.json();
    const moderation = moderationData.results[0];

    // AI analysis for sentiment and crisis detection
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI content moderator for a mental health and addiction recovery community. Analyze the content for:
1. Sentiment (positive/negative/neutral)
2. Crisis risk level (low/medium/high) - detect suicidal ideation, self-harm, substance abuse relapse indicators
3. Community guidelines violations
4. Provide specific reasons for any flags

Respond in valid JSON format:
{
  "sentiment": "positive|negative|neutral",
  "crisisRisk": "low|medium|high",
  "flagged": boolean,
  "reasons": ["reason1", "reason2"],
  "confidence": 0.95
}`
          },
          {
            role: 'user',
            content: content
          }
        ],
        temperature: 0.1,
      }),
    });

    const analysisData = await analysisResponse.json();
    const analysis = JSON.parse(analysisData.choices[0].message.content);

    // Determine final moderation result
    const result: ModerationResult = {
      approved: !moderation.flagged && !analysis.flagged,
      flagged: moderation.flagged || analysis.flagged,
      sentiment: analysis.sentiment,
      crisisRisk: analysis.crisisRisk,
      reasons: [
        ...(moderation.flagged ? ['OpenAI moderation flag'] : []),
        ...analysis.reasons
      ],
      confidence: analysis.confidence
    };

    console.log('Moderation result:', result);

    // Update content moderation status in database
    const tableName = contentType === 'forum_post' ? 'forum_posts' : 
                     contentType === 'forum_reply' ? 'forum_replies' : 'success_stories';
    
    const moderationStatus = result.approved ? 'approved' : 
                           result.crisisRisk === 'high' ? 'blocked' : 'flagged';

    await supabase
      .from(tableName)
      .update({ 
        moderation_status: moderationStatus,
        is_moderated: true 
      })
      .eq('id', contentId);

    // Log moderation action
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'AI_MODERATION',
        details_encrypted: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          moderation_result: result,
          timestamp: new Date().toISOString()
        })
      });

    // Create moderation queue entry if flagged
    if (result.flagged || result.crisisRisk !== 'low') {
      await supabase
        .from('moderation_queue')
        .insert({
          content_type: contentType,
          content_id: contentId,
          user_id: userId,
          flag_reason: result.reasons.join(', '),
          sentiment: result.sentiment,
          crisis_risk: result.crisisRisk,
          ai_confidence: result.confidence,
          priority: result.crisisRisk === 'high' ? 'urgent' : 
                   result.crisisRisk === 'medium' ? 'high' : 'normal',
          status: 'pending'
        });
    }

    // Send crisis alert if high risk
    if (result.crisisRisk === 'high') {
      await supabase.functions.invoke('crisis-alert-system', {
        body: {
          userId,
          content,
          riskLevel: 'high',
          source: `${contentType}_moderation`
        }
      });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI moderation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});