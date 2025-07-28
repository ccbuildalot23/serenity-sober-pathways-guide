import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VoiceCrisisRequest {
  userId: string;
  transcript: string;
  audioData?: string;
  location?: { lat: number; lng: number };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { userId, transcript, audioData, location }: VoiceCrisisRequest = await req.json();

    console.log(`Voice crisis assistant activated for user ${userId}`);

    // Analyze the transcript for crisis indicators
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
            content: `You are a crisis intervention AI assistant. Analyze the user's speech for:
1. Crisis level (low/medium/high/critical)
2. Emotional state
3. Immediate safety concerns
4. Appropriate response strategy

Respond in JSON format:
{
  "crisisLevel": "low|medium|high|critical",
  "emotionalState": "description",
  "immediateRisk": boolean,
  "recommendedActions": ["action1", "action2"],
  "supportiveResponse": "empathetic response to speak aloud",
  "escalateToHuman": boolean
}`
          },
          {
            role: 'user',
            content: `User said: "${transcript}"`
          }
        ],
        temperature: 0.1,
      }),
    });

    const analysisData = await analysisResponse.json();
    const analysis = JSON.parse(analysisData.choices[0].message.content);

    console.log('Crisis analysis result:', analysis);

    // Create supportive voice response
    const speechResponse = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        input: analysis.supportiveResponse,
        voice: 'nova', // Warm, supportive female voice
        response_format: 'mp3',
      }),
    });

    const speechAudioBuffer = await speechResponse.arrayBuffer();
    const speechBase64 = btoa(String.fromCharCode(...new Uint8Array(speechAudioBuffer)));

    // Log the crisis interaction
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action: 'VOICE_CRISIS_INTERACTION',
        details_encrypted: JSON.stringify({
          transcript: transcript.substring(0, 200), // Limit for privacy
          crisis_level: analysis.crisisLevel,
          emotional_state: analysis.emotionalState,
          immediate_risk: analysis.immediateRisk,
          escalate_to_human: analysis.escalateToHuman,
          timestamp: new Date().toISOString()
        })
      });

    // If high risk, trigger crisis alert system
    if (analysis.crisisLevel === 'high' || analysis.crisisLevel === 'critical' || analysis.immediateRisk) {
      await supabase.functions.invoke('crisis-alert-system', {
        body: {
          userId,
          content: transcript,
          riskLevel: analysis.crisisLevel,
          source: 'voice_crisis_assistant',
          location
        }
      });
    }

    // Create real-time notification for immediate support
    if (analysis.escalateToHuman) {
      await supabase.functions.invoke('realtime-notification-sender', {
        body: {
          userId,
          type: 'crisis_escalation',
          title: 'Crisis Support Requested',
          message: 'Voice crisis assistant has escalated this to human support.',
          data: {
            crisis_level: analysis.crisisLevel,
            requires_immediate_attention: analysis.immediateRisk
          }
        }
      });
    }

    // Generate emergency resources based on crisis level
    const emergencyResources = await generateEmergencyResources(analysis.crisisLevel);

    return new Response(JSON.stringify({
      success: true,
      analysis: {
        crisisLevel: analysis.crisisLevel,
        emotionalState: analysis.emotionalState,
        immediateRisk: analysis.immediateRisk,
        escalateToHuman: analysis.escalateToHuman
      },
      response: {
        audioContent: speechBase64,
        text: analysis.supportiveResponse,
        recommendedActions: analysis.recommendedActions
      },
      emergencyResources
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Voice crisis assistant error:', error);
    
    // Always provide a supportive fallback response
    const fallbackResponse = "I hear that you're going through a difficult time. You're not alone, and help is available. Please consider reaching out to a crisis hotline or trusted person for immediate support.";
    
    // Generate fallback audio
    try {
      const fallbackSpeech = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: fallbackResponse,
          voice: 'nova',
          response_format: 'mp3',
        }),
      });

      const fallbackAudioBuffer = await fallbackSpeech.arrayBuffer();
      const fallbackBase64 = btoa(String.fromCharCode(...new Uint8Array(fallbackAudioBuffer)));

      return new Response(JSON.stringify({
        success: false,
        error: 'Analysis failed, providing fallback support',
        response: {
          audioContent: fallbackBase64,
          text: fallbackResponse,
          recommendedActions: ['Contact crisis hotline', 'Reach out to trusted person', 'Use grounding techniques']
        },
        emergencyResources: await generateEmergencyResources('high')
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (fallbackError) {
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        response: {
          text: fallbackResponse,
          recommendedActions: ['Contact crisis hotline: 988', 'Call emergency services: 911', 'Reach out to trusted person']
        }
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  }
});

async function generateEmergencyResources(crisisLevel: string) {
  const baseResources = [
    {
      name: 'National Suicide Prevention Lifeline',
      phone: '988',
      description: '24/7 crisis support'
    },
    {
      name: 'Crisis Text Line',
      phone: 'Text HOME to 741741',
      description: 'Text-based crisis support'
    }
  ];

  if (crisisLevel === 'critical' || crisisLevel === 'high') {
    return [
      {
        name: 'Emergency Services',
        phone: '911',
        description: 'Immediate emergency response'
      },
      ...baseResources,
      {
        name: 'SAMHSA National Helpline',
        phone: '1-800-662-4357',
        description: 'Substance abuse and mental health'
      }
    ];
  }

  return baseResources;
}