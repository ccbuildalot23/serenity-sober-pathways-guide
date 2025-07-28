import { supabase } from '@/integrations/supabase/client';

export interface ProviderDashboardStats {
  totalPatients: number;
  activePatients: number;
  todayCheckins: number;
  crisisAlerts: {
    total: number;
    highRisk: number;
    unresolved: number;
  };
  averageMood: number;
  engagement: {
    weeklyCompletionRate: number;
    monthlyCompletionRate: number;
    lastWeekCheckins: number;
  };
}

export interface PatientOverview {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_initials: string;
  relationship_type: string;
  latest_checkin: {
    date: string;
    mood_rating: number | null;
    is_complete: boolean;
    notes?: string;
  } | null;
  crisis_status: {
    risk_level: 'low' | 'medium' | 'high' | 'none';
    last_crisis_date?: string;
    total_events: number;
  };
  engagement_score: number;
  support_network_alerted?: boolean;
}

export interface ProviderAppointment {
  id: string;
  patient_id: string;
  patient_name: string;
  title: string;
  scheduled_at: string;
  type: string;
  status: string;
}

export const providerDashboardService = {
  async getProviderStats(providerId: string): Promise<ProviderDashboardStats> {
    try {
      console.log('Fetching provider dashboard stats for:', providerId);

      // Get all patients for this provider
      const { data: relationships, error: relationshipError } = await supabase
        .from('patient_provider_relationships')
        .select('patient_id, status')
        .eq('provider_id', providerId)
        .eq('status', 'active');

      if (relationshipError) {
        console.warn('Error fetching patient relationships:', relationshipError);
        return this.getDefaultStats();
      }

      const patientIds = relationships?.map(r => r.patient_id) || [];
      
      if (patientIds.length === 0) {
        return this.getDefaultStats();
      }

      // Get today's check-ins for provider's patients
      const today = new Date().toISOString().split('T')[0];
      const { data: todayCheckins, error: todayError } = await supabase
        .from('daily_checkins')
        .select('user_id, mood_rating, is_complete')
        .in('user_id', patientIds)
        .eq('checkin_date', today);

      if (todayError) {
        console.warn('Error fetching today checkins:', todayError);
      }

      // Get crisis events for provider's patients (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: crisisEvents, error: crisisError } = await supabase
        .from('crisis_events')
        .select('user_id, risk_level, crisis_resolved, created_at')
        .in('user_id', patientIds)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (crisisError) {
        console.warn('Error fetching crisis events:', crisisError);
      }

      // Get weekly check-ins for engagement metrics
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: weeklyCheckins, error: weeklyError } = await supabase
        .from('daily_checkins')
        .select('user_id, is_complete, checkin_date')
        .in('user_id', patientIds)
        .gte('checkin_date', oneWeekAgo.toISOString().split('T')[0]);

      if (weeklyError) {
        console.warn('Error fetching weekly checkins:', weeklyError);
      }

      // Get monthly check-ins for engagement metrics
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      
      const { data: monthlyCheckins, error: monthlyError } = await supabase
        .from('daily_checkins')
        .select('user_id, is_complete, checkin_date')
        .in('user_id', patientIds)
        .gte('checkin_date', oneMonthAgo.toISOString().split('T')[0]);

      if (monthlyError) {
        console.warn('Error fetching monthly checkins:', monthlyError);
      }

      // Calculate stats
      const totalPatients = patientIds.length;
      const activePatients = patientIds.length; // All relationships are active
      const todayCheckinsCount = todayCheckins?.length || 0;
      
      const crisisEventsData = crisisEvents || [];
      const highRiskEvents = crisisEventsData.filter(e => e.risk_level === 'high');
      const unresolvedEvents = crisisEventsData.filter(e => !e.crisis_resolved);
      
      const completedTodayCheckins = todayCheckins?.filter(c => c.is_complete) || [];
      const averageMood = completedTodayCheckins.length > 0 
        ? completedTodayCheckins.reduce((sum, c) => sum + (c.mood_rating || 0), 0) / completedTodayCheckins.length 
        : 0;

      // Calculate engagement metrics
      const weeklyData = weeklyCheckins || [];
      const monthlyData = monthlyCheckins || [];
      
      const weeklyCompleted = weeklyData.filter(c => c.is_complete).length;
      const expectedWeeklyCheckins = totalPatients * 7; // 7 days
      const weeklyCompletionRate = expectedWeeklyCheckins > 0 
        ? Math.round((weeklyCompleted / expectedWeeklyCheckins) * 100) 
        : 0;

      const monthlyCompleted = monthlyData.filter(c => c.is_complete).length;
      const expectedMonthlyCheckins = totalPatients * 30; // 30 days
      const monthlyCompletionRate = expectedMonthlyCheckins > 0 
        ? Math.round((monthlyCompleted / expectedMonthlyCheckins) * 100) 
        : 0;

      const result: ProviderDashboardStats = {
        totalPatients,
        activePatients,
        todayCheckins: todayCheckinsCount,
        crisisAlerts: {
          total: crisisEventsData.length,
          highRisk: highRiskEvents.length,
          unresolved: unresolvedEvents.length
        },
        averageMood: Math.round(averageMood * 10) / 10,
        engagement: {
          weeklyCompletionRate,
          monthlyCompletionRate,
          lastWeekCheckins: weeklyCompleted
        }
      };

      console.log('Provider dashboard stats:', result);
      return result;

    } catch (error) {
      console.error('Error fetching provider stats:', error);
      return this.getDefaultStats();
    }
  },

  async getPatientOverviews(providerId: string): Promise<PatientOverview[]> {
    try {
      console.log('Fetching patient overviews for provider:', providerId);

      // Get patient relationships with profile data
      const { data: relationships, error: relationshipError } = await supabase
        .from('patient_provider_relationships')
        .select(`
          patient_id,
          relationship_type,
          profiles!patient_provider_relationships_patient_id_fkey(full_name)
        `)
        .eq('provider_id', providerId)
        .eq('status', 'active');

      if (relationshipError) {
        console.warn('Error fetching patient relationships:', relationshipError);
        return [];
      }

      if (!relationships || relationships.length === 0) {
        return [];
      }

      const patientIds = relationships.map(r => r.patient_id);

      // Get latest check-ins for each patient
      const { data: latestCheckins, error: checkinsError } = await supabase
        .from('daily_checkins')
        .select('user_id, checkin_date, mood_rating, is_complete, notes, created_at')
        .in('user_id', patientIds)
        .order('checkin_date', { ascending: false });

      if (checkinsError) {
        console.warn('Error fetching latest checkins:', checkinsError);
      }

      // Get crisis events for each patient
      const { data: crisisEvents, error: crisisError } = await supabase
        .from('crisis_events')
        .select('user_id, risk_level, created_at, crisis_resolved')
        .in('user_id', patientIds)
        .order('created_at', { ascending: false });

      if (crisisError) {
        console.warn('Error fetching crisis events:', crisisError);
      }

      // Process data for each patient
      const patientOverviews: PatientOverview[] = relationships.map(rel => {
        const patientCheckins = latestCheckins?.filter(c => c.user_id === rel.patient_id) || [];
        const latestCheckin = patientCheckins[0] || null;
        
        const patientCrisisEvents = crisisEvents?.filter(e => e.user_id === rel.patient_id) || [];
        const latestCrisis = patientCrisisEvents[0];
        
        // Calculate risk level based on latest check-in and crisis events
        let riskLevel: 'low' | 'medium' | 'high' | 'none' = 'none';
        if (latestCrisis && !latestCrisis.crisis_resolved) {
          riskLevel = latestCrisis.risk_level as 'low' | 'medium' | 'high' || 'medium';
        } else if (latestCheckin && latestCheckin.mood_rating !== null) {
          if (latestCheckin.mood_rating <= 3) riskLevel = 'high';
          else if (latestCheckin.mood_rating <= 6) riskLevel = 'medium';
          else riskLevel = 'low';
        }

        // Calculate engagement score (simplified)
        const recentCheckins = patientCheckins.slice(0, 7); // Last 7 potential check-ins
        const completedRecent = recentCheckins.filter(c => c.is_complete).length;
        const engagementScore = Math.round((completedRecent / 7) * 100);

        const patientName = (rel.profiles as any)?.full_name || 'Unknown Patient';
        const initials = patientName.split(' ').map((n: string) => n[0]).join('.').toUpperCase();

        return {
          id: rel.patient_id,
          patient_id: rel.patient_id,
          patient_name: patientName,
          patient_initials: initials,
          relationship_type: rel.relationship_type,
          latest_checkin: latestCheckin ? {
            date: latestCheckin.checkin_date,
            mood_rating: latestCheckin.mood_rating,
            is_complete: latestCheckin.is_complete,
            notes: latestCheckin.notes
          } : null,
          crisis_status: {
            risk_level: riskLevel,
            last_crisis_date: latestCrisis?.created_at,
            total_events: patientCrisisEvents.length
          },
          engagement_score: engagementScore,
          support_network_alerted: riskLevel === 'high' && patientCrisisEvents.length > 0
        };
      });

      console.log('Patient overviews:', patientOverviews);
      return patientOverviews;

    } catch (error) {
      console.error('Error fetching patient overviews:', error);
      return [];
    }
  },

  async getTodaysAppointments(providerId: string): Promise<ProviderAppointment[]> {
    // Placeholder for appointments - can be implemented when appointments table exists
    // TODO: Implement when appointments table is available
    return [];
  },

  getDefaultStats(): ProviderDashboardStats {
    return {
      totalPatients: 0,
      activePatients: 0,
      todayCheckins: 0,
      crisisAlerts: {
        total: 0,
        highRisk: 0,
        unresolved: 0
      },
      averageMood: 0,
      engagement: {
        weeklyCompletionRate: 0,
        monthlyCompletionRate: 0,
        lastWeekCheckins: 0
      }
    };
  }
};