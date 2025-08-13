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
    totalPatients: 0,
    activePatients: 0,
    todayCheckins: 0,
    crisisAlerts: { total: 0, highRisk: 0, unresolved: 0 },
    averageMood: 0,
    engagement: { weeklyCompletionRate: 0, monthlyCompletionRate: 0, lastWeekCheckins: 0 }
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
        totalPatients: 1,
        activePatients: 1,
        todayCheckins: 0,
        crisisAlerts: { total: 0, highRisk: 0, unresolved: 0 },
        averageMood: 7,
        engagement: { weeklyCompletionRate: 0, monthlyCompletionRate: 0, lastWeekCheckins: 0 }
      });
      setPatients([
        {
          id: 'stub-1',
          patient_name: 'John Smith',
          patient_initials: 'JS',
          engagement_score: 87,
          relationship_type: 'patient',
          latest_checkin: { date: new Date().toISOString(), mood_rating: 8.2 },
          crisis_status: { risk_level: 'low', total_events: 0, last_crisis_date: null },
          support_network_alerted: false
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