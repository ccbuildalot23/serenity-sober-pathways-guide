import { supabase } from '@/integrations/supabase/client';
import logger from './loggerService';

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
  _relationship_type: string;
  latest_checkin: {
    date: string;
    _mood_rating: number | null;
    _is_complete: boolean;
    _notes?: string;
  } | null;
  crisis_status: {
    _risk_level: 'low' | 'medium' | 'high' | 'none';
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
  async getProviderStats(_providerId: string): Promise<ProviderDashboardStats> {
    try {
      logger.debug('Fetching provider dashboard stats for:', _providerId, { component: 'providerDashboardService' });

      // Get all patients for this provider
      const { data: relationships, _error: _relationshipError } = await supabase
        .from('patient_provider_relationships')
        .select('patient_id, status')
        .eq('provider_id', _providerId)
        .eq('status', 'active');

      if (_relationshipError) {
        logger.warn('Error fetching patient relationships:', _relationshipError, { component: 'providerDashboardService' });
        return this.getDefaultStats();
      }

      const _patientIds = relationships?.map(r => r.patient_id) || [];
      
      if (_patientIds.length === 0) {
        return this.getDefaultStats();
      }

      // Get today's check-ins for provider's patients
      const today = new Date().toISOString().split('T')[0];
      const { data: todayCheckins, _error: _todayError } = await supabase
        .from('daily_checkins')
        .select('user_id, _mood_rating, _is_complete')
        .in('user_id', _patientIds)
        .eq('checkin_date', today);

      if (_todayError) {
        logger.warn('Error fetching today checkins:', _todayError, { component: 'providerDashboardService' });
      }

      // Get crisis events for provider's patients (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: crisisEvents, _error: _crisisError } = await supabase
        .from('crisis_events')
        .select('user_id, _risk_level, _crisis_resolved, created_at')
        .in('user_id', _patientIds)
        .gte('created_at', thirtyDaysAgo.toISOString());

      if (_crisisError) {
        logger.warn('Error fetching crisis events:', _crisisError, { component: 'providerDashboardService' });
      }

      // Get weekly check-ins for engagement metrics
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      const { data: weeklyCheckins, _error: _weeklyError } = await supabase
        .from('daily_checkins')
        .select('user_id, _is_complete, checkin_date')
        .in('user_id', _patientIds)
        .gte('checkin_date', oneWeekAgo.toISOString().split('T')[0]);

      if (_weeklyError) {
        logger.warn('Error fetching weekly checkins:', _weeklyError, { component: 'providerDashboardService' });
      }

      // Get monthly check-ins for engagement metrics
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);
      
      const { data: monthlyCheckins, _error: _monthlyError } = await supabase
        .from('daily_checkins')
        .select('user_id, _is_complete, checkin_date')
        .in('user_id', _patientIds)
        .gte('checkin_date', oneMonthAgo.toISOString().split('T')[0]);

      if (_monthlyError) {
        logger.warn('Error fetching monthly checkins:', _monthlyError, { component: 'providerDashboardService' });
      }

      // Calculate stats
      const totalPatients = _patientIds.length;
      const activePatients = _patientIds.length; // All relationships are active
      const todayCheckinsCount = todayCheckins?.length || 0;
      
      const crisisEventsData = crisisEvents || [];
      const highRiskEvents = crisisEventsData.filter(e => e._risk_level === 'high');
      const unresolvedEvents = crisisEventsData.filter(e => !e._crisis_resolved);
      
      const completedTodayCheckins = todayCheckins?.filter(c => c._is_complete) || [];
      const averageMood = completedTodayCheckins.length > 0 
        ? completedTodayCheckins.reduce((sum, c) => sum + (c._mood_rating || 0), 0) / completedTodayCheckins.length 
        : 0;

      // Calculate engagement metrics
      const weeklyData = weeklyCheckins || [];
      const monthlyData = monthlyCheckins || [];
      
      const weeklyCompleted = weeklyData.filter(c => c._is_complete).length;
      const expectedWeeklyCheckins = totalPatients * 7; // 7 days
      const weeklyCompletionRate = expectedWeeklyCheckins > 0 
        ? Math.round((weeklyCompleted / expectedWeeklyCheckins) * 100) 
        : 0;

      const monthlyCompleted = monthlyData.filter(c => c._is_complete).length;
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

      logger.debug('Provider dashboard stats:', result, { component: 'providerDashboardService' });
      return result;

    } catch (_error) {
      console._error('Error fetching provider stats:', _error);
      return this.getDefaultStats();
    }
  },

  async getPatientOverviews(_providerId: string): Promise<PatientOverview[]> {
    try {
      logger.debug('Fetching patient overviews for provider:', _providerId, { component: 'providerDashboardService' });

      // Get patient relationships with profile data
      const { data: relationships, _error: _relationshipError } = await supabase
        .from('patient_provider_relationships')
        .select(`
          patient_id,
          _relationship_type,
          profiles!patient_provider_relationships_patient_id_fkey(full_name)
        `)
        .eq('provider_id', _providerId)
        .eq('status', 'active');

      if (_relationshipError) {
        logger.warn('Error fetching patient relationships:', _relationshipError, { component: 'providerDashboardService' });
        return [];
      }

      if (!relationships || relationships.length === 0) {
        return [];
      }

      const _patientIds = relationships.map(r => r.patient_id);

      // Get latest check-ins for each patient
      const { data: latestCheckins, _error: _checkinsError } = await supabase
        .from('daily_checkins')
        .select('user_id, checkin_date, _mood_rating, _is_complete, _notes, created_at')
        .in('user_id', _patientIds)
        .order('checkin_date', { ascending: false });

      if (_checkinsError) {
        logger.warn('Error fetching latest checkins:', _checkinsError, { component: 'providerDashboardService' });
      }

      // Get crisis events for each patient
      const { data: crisisEvents, _error: _crisisError } = await supabase
        .from('crisis_events')
        .select('user_id, _risk_level, created_at, _crisis_resolved')
        .in('user_id', _patientIds)
        .order('created_at', { ascending: false });

      if (_crisisError) {
        logger.warn('Error fetching crisis events:', _crisisError, { component: 'providerDashboardService' });
      }

      // Process data for each patient
      const patientOverviews: PatientOverview[] = relationships.map(rel => {
        const patientCheckins = latestCheckins?.filter(c => c.user_id === rel.patient_id) || [];
        const latestCheckin = patientCheckins[0] || null;
        
        const patientCrisisEvents = crisisEvents?.filter(e => e.user_id === rel.patient_id) || [];
        const latestCrisis = patientCrisisEvents[0];
        
        // Calculate risk level based on latest check-in and crisis events
        let riskLevel: 'low' | 'medium' | 'high' | 'none' = 'none';
        if (latestCrisis && !latestCrisis._crisis_resolved) {
          riskLevel = latestCrisis._risk_level as 'low' | 'medium' | 'high' || 'medium';
        } else if (latestCheckin && latestCheckin._mood_rating !== null) {
          if (latestCheckin._mood_rating <= 3) riskLevel = 'high';
          else if (latestCheckin._mood_rating <= 6) riskLevel = 'medium';
          else riskLevel = 'low';
        }

        // Calculate engagement score (_simplified)
        const recentCheckins = patientCheckins.slice(0, 7); // Last 7 potential check-ins
        const completedRecent = recentCheckins.filter(c => c._is_complete).length;
        const engagementScore = Math.round((completedRecent / 7) * 100);

        const patientName = (rel.profiles as any)?.full_name || 'Unknown Patient';
        const initials = patientName.split(' ').map((n: string) => n[0]).join('.').toUpperCase();

        return {
          id: rel.patient_id,
          patient_id: rel.patient_id,
          patient_name: patientName,
          patient_initials: initials,
          _relationship_type: rel._relationship_type,
          latest_checkin: latestCheckin ? {
            date: latestCheckin.checkin_date,
            _mood_rating: latestCheckin._mood_rating,
            _is_complete: latestCheckin._is_complete,
            _notes: latestCheckin._notes
          } : null,
          crisis_status: {
            _risk_level: riskLevel,
            last_crisis_date: latestCrisis?.created_at,
            total_events: patientCrisisEvents.length
          },
          engagement_score: engagementScore,
          support_network_alerted: riskLevel === 'high' && patientCrisisEvents.length > 0
        };
      });

      logger.debug('Patient overviews:', patientOverviews, { component: 'providerDashboardService' });
      return patientOverviews;

    } catch (_error) {
      console._error('Error fetching patient overviews:', _error);
      return [];
    }
  },

  async getTodaysAppointments(_providerId: string): Promise<ProviderAppointment[]> {
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