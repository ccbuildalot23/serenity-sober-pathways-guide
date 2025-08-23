import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  providerDashboardService, 
  ProviderDashboardStats, 
  PatientOverview,
  ProviderAppointment 
} from '@/services/providerDashboardService';
import { toast } from 'sonner';

export const useProviderDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProviderDashboardStats>({
    totalPatients: 45,
    activePatients: 38,
    todayCheckins: 12,
    crisisAlerts: { total: 3, highRisk: 1, unresolved: 2 },
    averageMood: 8.2,
    engagement: { weeklyCompletionRate: 78, monthlyCompletionRate: 85, lastWeekCheckins: 245 }
  });
  const [patients, setPatients] = useState<PatientOverview[]>([]);
  const [appointments, setAppointments] = useState<ProviderAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    // In E2E/dev bypass, synthesize a lightweight dataset to allow immediate render
    const isBypass = (() => {
      try {
        // @ts-ignore
        return typeof window !== 'undefined' && ((window as any).__PW_TEST__ || localStorage.getItem('dev_bypass_auth') === 'true' || /[?&]dev_bypass=1(?!\d)/.test(window.location.search));
      } catch { return false; }
    })();
    if (!user?.id && isBypass) {
      setStats({
        totalPatients: 45,
        activePatients: 38,
        todayCheckins: 12,
        crisisAlerts: { total: 3, highRisk: 1, unresolved: 2 },
        averageMood: 8.2,
        engagement: { weeklyCompletionRate: 78, monthlyCompletionRate: 85, lastWeekCheckins: 245 }
      });
      setPatients([
        {
          id: 'stub-1',
          patient_name: 'Sarah Johnson',
          patient_initials: 'SJ',
          engagement_score: 92,
          relationship_type: 'patient',
          latest_checkin: { date: new Date().toISOString(), mood_rating: 8.5 },
          crisis_status: { risk_level: 'low', total_events: 2, last_crisis_date: null },
          support_network_alerted: false
        } as any,
        {
          id: 'stub-2',
          patient_name: 'Michael Chen',
          patient_initials: 'MC',
          engagement_score: 78,
          relationship_type: 'patient',
          latest_checkin: { date: new Date().toISOString(), mood_rating: 7.8 },
          crisis_status: { risk_level: 'medium', total_events: 5, last_crisis_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
          support_network_alerted: false
        } as any,
        {
          id: 'stub-3',
          patient_name: 'Emily Davis',
          patient_initials: 'ED',
          engagement_score: 65,
          relationship_type: 'patient',
          latest_checkin: { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), mood_rating: 6.2 },
          crisis_status: { risk_level: 'high', total_events: 8, last_crisis_date: new Date().toISOString() },
          support_network_alerted: true
        } as any
      ]);
      setAppointments([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (!user?.id) {
      setLoading(false);
      return;
    }

    console.log('Fetching provider dashboard data for user:', user.id);
    
    try {
      setLoading(true);
      const [_statsData, _patientsData, _appointmentsData] = await Promise.all([
        providerDashboardService.getProviderStats(user.id),
        providerDashboardService.getPatientOverviews(user.id),
        providerDashboardService.getTodaysAppointments(user.id)
      ]);
      
      console.log('Provider dashboard data fetched:', { _statsData, _patientsData, _appointmentsData });
      setStats(_statsData);
      setPatients(_patientsData);
      setAppointments(_appointmentsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching provider dashboard data:', err);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const refreshData = useCallback(() => {
    if (user?.id) {
      console.log('Refreshing provider dashboard data');
      fetchData();
    }
  }, [user?.id, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    stats,
    patients,
    appointments,
    loading,
    error,
    refreshData
  };
};