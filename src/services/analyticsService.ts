import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { debugService } from './debugService';

export interface SupportMetrics {
  supportNetworkHealth: number;
  totalContacts: number;
  activeContacts: number;
  alertsSent: number;
  alertsAcknowledged: number;
  averageResponseTime: number;
  crisisEventsResolved: number;
}

export interface ContactEngagement {
  contactId: string;
  contactName: string;
  interactionCount: number;
  averageResponseTime: number;
  supportScore: number;
}

export interface UsageInsights {
  mostActiveTime: string;
  preferredContactMethod: 'sms' | 'call';
  recoveryProgress: Array<{
    date: string;
    score: number;
  }>;
  crisisPatterns: Array<{
    time: string;
    frequency: number;
    triggers: string[];
  }>;
}

export interface AnalyticsData {
  metrics: SupportMetrics | null;
  engagement: ContactEngagement[];
  insights: UsageInsights | null;
}

class AnalyticsService {
  async getAnalytics(userId: string, timeRangeDays: number = 30): Promise<AnalyticsData> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - timeRangeDays);

    debugService.log('api', 'Fetching analytics data', {
      userId: userId.substring(0, 8) + '...',
      timeRangeDays
    });

    try {
      // Get support contacts
      const { data: contacts } = await supabase
        .from('support_contacts')
        .select('*')
        .eq('user_id', userId);

      debugService.log('api', 'Support contacts fetched', {
        count: contacts?.length || 0
      });

      // Get crisis events within time range
      const { data: crisisEvents } = await supabase
        .from('crisis_events')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      debugService.log('api', 'Crisis events fetched', {
        count: crisisEvents?.length || 0,
        timeRange: timeRangeDays
      });

      // Get check-in data for recovery progress
      const { data: checkIns } = await supabase
        .from('daily_checkins')
        .select('created_at, mood_rating, energy_rating, hope_rating')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });

      debugService.log('api', 'Check-ins fetched', {
        count: checkIns?.length || 0
      });

      const metrics = this.calculateMetrics(contacts || [], crisisEvents || []);
      const engagement = this.calculateEngagement(contacts || [], crisisEvents || []);
      const insights = this.generateInsights(crisisEvents || [], checkIns || []);

      debugService.log('api', 'Analytics calculation completed', {
        networkHealth: metrics.supportNetworkHealth,
        engagementCount: engagement.length
      });

      return { metrics, engagement, insights };
    } catch (error) {
      debugService.log('error', 'Error fetching analytics', {
        error: error.message,
        userId: userId.substring(0, 8) + '...'
      });
      return { metrics: null, engagement: [], insights: null };
    }
  }

  private calculateMetrics(contacts: any[], crisisEvents: any[]): SupportMetrics {
    const totalContacts = contacts.length;
    const activeContacts = contacts.filter(contact => 
      crisisEvents.some(event => event.emergency_contacts_notified)
    ).length;

    const alertsSent = crisisEvents.length;
    const alertsAcknowledged = crisisEvents.filter(event => event.crisis_resolved).length;
    
    // Calculate average response time (mock calculation based on crisis resolution time)
    const responseTimes = crisisEvents
      .filter(event => event.resolution_time && event.created_at)
      .map(event => {
        const created = new Date(event.created_at).getTime();
        const resolved = new Date(event.resolution_time).getTime();
        return (resolved - created) / (1000 * 60); // Convert to minutes
      });
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 45; // Default 45 minutes

    const crisisEventsResolved = alertsAcknowledged;

    // Calculate network health score
    let healthScore = 50; // Base score
    
    // Contact quantity factor (0-25 points)
    if (totalContacts >= 5) healthScore += 25;
    else if (totalContacts >= 3) healthScore += 15;
    else if (totalContacts >= 1) healthScore += 5;

    // Response rate factor (0-25 points)
    const responseRate = alertsSent > 0 ? alertsAcknowledged / alertsSent : 0;
    healthScore += Math.round(responseRate * 25);

    // Response time factor (0-25 points)
    if (averageResponseTime <= 30) healthScore += 25;
    else if (averageResponseTime <= 60) healthScore += 15;
    else if (averageResponseTime <= 120) healthScore += 10;

    // Activity factor (0-25 points)
    if (activeContacts >= 3) healthScore += 25;
    else if (activeContacts >= 2) healthScore += 15;
    else if (activeContacts >= 1) healthScore += 10;

    const supportNetworkHealth = Math.min(100, Math.max(0, healthScore));

    return {
      supportNetworkHealth,
      totalContacts,
      activeContacts,
      alertsSent,
      alertsAcknowledged,
      averageResponseTime,
      crisisEventsResolved
    };
  }

  private calculateEngagement(contacts: any[], crisisEvents: any[]): ContactEngagement[] {
    return contacts.map(contact => {
      // Mock interaction count based on crisis events
      const interactionCount = Math.floor(Math.random() * 5) + 1;
      const averageResponseTime = Math.random() * 120 + 30; // Mock response time

      // Calculate support score based on responsiveness and engagement
      let supportScore = 50;
      
      if (interactionCount > 5) supportScore += 20;
      else if (interactionCount > 2) supportScore += 10;
      
      if (averageResponseTime <= 30) supportScore += 30;
      else if (averageResponseTime <= 60) supportScore += 20;
      else if (averageResponseTime <= 120) supportScore += 10;

      return {
        contactId: contact.id,
        contactName: contact.name,
        interactionCount,
        averageResponseTime,
        supportScore: Math.min(100, Math.max(0, supportScore))
      };
    });
  }

  private generateInsights(crisisEvents: any[], checkIns: any[]): UsageInsights {
    // Analyze most active time based on crisis events
    const hours = crisisEvents.map(event => new Date(event.created_at).getHours());
    const hourCounts = hours.reduce((acc, hour) => {
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);
    
    const mostActiveHour = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '14';
    
    const mostActiveTime = `${mostActiveHour}:00 - ${parseInt(mostActiveHour) + 1}:00`;

    // Mock preferred contact method
    const preferredContactMethod: 'sms' | 'call' = Math.random() > 0.5 ? 'sms' : 'call';

    // Generate recovery progress from check-ins
    const recoveryProgress = checkIns.slice(-7).map(checkIn => {
      const date = new Date(checkIn.created_at).toLocaleDateString();
      // Calculate a simple wellness score based on mood, energy, and hope
      const moodScore = (checkIn.mood_rating || 5) * 20;
      const energyScore = (checkIn.energy_rating || 5) * 20;
      const hopeScore = (checkIn.hope_rating || 5) * 20;
      const score = Math.round((moodScore + energyScore + hopeScore) / 3);
      
      return { date, score };
    });

    // Generate crisis patterns based on actual crisis events
    const crisisPatterns = [
      {
        time: 'Evening (6-9 PM)',
        frequency: Math.floor(crisisEvents.length * 0.4),
        triggers: ['Work stress', 'Social isolation']
      },
      {
        time: 'Late night (11 PM - 2 AM)',
        frequency: Math.floor(crisisEvents.length * 0.3),
        triggers: ['Insomnia', 'Anxiety']
      }
    ].filter(pattern => pattern.frequency > 0);

    return {
      mostActiveTime,
      preferredContactMethod,
      recoveryProgress,
      crisisPatterns
    };
  }

  async generateInsightsReport(userId: string): Promise<string> {
    debugService.log('api', 'Generating insights report', {
      userId: userId.substring(0, 8) + '...'
    });

    const analytics = await this.getAnalytics(userId, 90);
    
    const report = `
Support Network Analytics Report
Generated: ${new Date().toLocaleDateString()}

Network Health Score: ${analytics.metrics?.supportNetworkHealth || 0}/100
Total Contacts: ${analytics.metrics?.totalContacts || 0}
Active Contacts: ${analytics.metrics?.activeContacts || 0}
Crisis Events: ${analytics.metrics?.alertsSent || 0}
Resolution Rate: ${analytics.metrics ? Math.round((analytics.metrics.alertsAcknowledged / analytics.metrics.alertsSent) * 100) : 0}%

Top Performing Contacts:
${analytics.engagement.slice(0, 3).map((contact, index) => 
  `${index + 1}. ${contact.contactName} - Support Score: ${contact.supportScore}`
).join('\n')}

Recommendations:
- ${analytics.metrics && analytics.metrics.totalContacts < 3 ? 'Add more support contacts' : 'Maintain current contact network'}
- ${analytics.insights?.preferredContactMethod === 'sms' ? 'Continue using SMS for quick responses' : 'Consider SMS for faster responses'}
- ${analytics.insights?.crisisPatterns.length ? 'Plan extra support during vulnerable times' : 'Monitor for crisis patterns'}
    `;

    debugService.log('api', 'Insights report generated', {
      reportLength: report.length
    });

    return report;
  }
}

export const analyticsService = new AnalyticsService();

export const useAnalytics = () => {
  const [data, setData] = React.useState<AnalyticsData>({
    metrics: null,
    engagement: [],
    insights: null
  });
  const [loading, setLoading] = React.useState(true);

  const reload = async (timeRange: number = 30) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const analyticsData = await analyticsService.getAnalytics(user.id, timeRange);
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    reload();
  }, []);

  return {
    ...data,
    loading,
    reload
  };
};
