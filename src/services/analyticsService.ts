import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect, useCallback } from 'react';

interface Metrics {
  supportNetworkHealth: number;
  totalContacts: number;
  activeContacts: number;
  alertsSent: number;
  alertsAcknowledged: number;
  averageResponseTime: number;
  crisisEventsResolved: number;
}

interface ContactEngagement {
  contactId: string;
  contactName: string;
  interactionCount: number;
  averageResponseTime: number;
  supportScore: number;
}

interface Insights {
  mostActiveTime: string;
  preferredContactMethod: 'sms' | 'call' | 'push';
  recoveryProgress: Array<{ date: string; score: number }>;
  crisisPatterns: Array<{
    time: string;
    frequency: number;
    triggers?: string[];
  }>;
}

export const useAnalytics = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [engagement, setEngagement] = useState<ContactEngagement[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (timeRange: number = 30) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Calculate metrics based on timeRange
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeRange);

      // Fetch support contacts
      const { data: contacts } = await supabase
        .from('support_contacts')
        .select('*')
        .eq('user_id', user.id);

      // Fetch crisis events
      const { data: crisisEvents } = await supabase
        .from('crisis_events')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString());

      // Calculate metrics
      const totalContacts = contacts?.length || 0;
      const activeContacts = Math.floor(totalContacts * 0.7); // Mock: 70% active
      const alertsSent = crisisEvents?.length || 0;
      const alertsAcknowledged = Math.floor(alertsSent * 0.85); // Mock: 85% acknowledged
      const crisisEventsResolved = crisisEvents?.filter(e => e.crisis_resolved)?.length || 0;

      const supportNetworkHealth = calculateNetworkHealth(
        totalContacts,
        activeContacts,
        alertsAcknowledged,
        alertsSent
      );

      setMetrics({
        supportNetworkHealth,
        totalContacts,
        activeContacts,
        alertsSent,
        alertsAcknowledged,
        averageResponseTime: 12, // Mock: 12 minutes average
        crisisEventsResolved
      });

      // Mock engagement data
      const mockEngagement: ContactEngagement[] = contacts?.slice(0, 5).map((contact) => ({
        contactId: contact.id,
        contactName: contact.name,
        interactionCount: Math.floor(Math.random() * 20) + 5,
        averageResponseTime: Math.floor(Math.random() * 30) + 5,
        supportScore: Math.floor(Math.random() * 30) + 70
      })) || [];

      setEngagement(mockEngagement);

      // Mock insights
      setInsights({
        mostActiveTime: '7:00 PM - 9:00 PM',
        preferredContactMethod: 'sms',
        recoveryProgress: generateProgressData(timeRange),
        crisisPatterns: [
          { time: 'Evening (6-9 PM)', frequency: 45, triggers: ['Work stress', 'Isolation'] },
          { time: 'Late Night (11 PM-2 AM)', frequency: 30, triggers: ['Insomnia', 'Cravings'] },
          { time: 'Weekend Afternoons', frequency: 25, triggers: ['Boredom', 'Social events'] }
        ]
      });

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { metrics, engagement, insights, loading, reload };
};

function calculateNetworkHealth(
  totalContacts: number,
  activeContacts: number,
  alertsAcknowledged: number,
  alertsSent: number
): number {
  let score = 0;

  // Contact coverage (30%)
  if (totalContacts >= 5) score += 30;
  else if (totalContacts >= 3) score += 20;
  else if (totalContacts >= 1) score += 10;

  // Active engagement (30%)
  const activeRatio = totalContacts > 0 ? activeContacts / totalContacts : 0;
  score += Math.floor(activeRatio * 30);

  // Response rate (40%)
  const responseRate = alertsSent > 0 ? alertsAcknowledged / alertsSent : 1;
  score += Math.floor(responseRate * 40);

  return Math.min(100, Math.max(0, score));
}

function generateProgressData(days: number): Array<{ date: string; score: number }> {
  const data = [] as Array<{ date: string; score: number }>;
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i -= Math.floor(days / 10)) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    const baseScore = 70;
    const trend = (days - i) / days * 20;
    const randomVariation = Math.random() * 10 - 5;
    const score = Math.floor(baseScore + trend + randomVariation);
    
    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: Math.min(100, Math.max(0, score))
    });
  }
  
  return data;
}

export const analyticsService = {
  async generateInsightsReport(userId: string) {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const { data: contacts } = await supabase
        .from('support_contacts')
        .select('*')
        .eq('user_id', userId);

      const { data: crisisEvents } = await supabase
        .from('crisis_events')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);

      // Generate comprehensive report
      const report = {
        generatedAt: new Date().toISOString(),
        userId,
        profile,
        supportNetwork: {
          totalContacts: contacts?.length || 0,
          contacts: contacts || []
        },
        crisisHistory: {
          totalEvents: crisisEvents?.length || 0,
          resolvedEvents: crisisEvents?.filter(e => e.crisis_resolved)?.length || 0,
          recentEvents: crisisEvents?.slice(0, 5) || []
        },
        recommendations: generateRecommendations(contacts?.length || 0, crisisEvents || [])
      };

      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }
};

function generateRecommendations(contactCount: number, crisisEvents: any[]): string[] {
  const recommendations = [] as string[];

  if (contactCount < 3) {
    recommendations.push('Add more support contacts to strengthen your network (aim for 3-5)');
  }

  if (crisisEvents.length > 10) {
    recommendations.push('Consider scheduling regular check-ins with your support network');
  }

  if (crisisEvents.some(e => !e.crisis_resolved)) {
    recommendations.push('Follow up on unresolved crisis events with your care team');
  }

  recommendations.push('Continue regular use of coping skills and support tools');
  recommendations.push('Celebrate your progress and recovery milestones');

  return recommendations;
}
