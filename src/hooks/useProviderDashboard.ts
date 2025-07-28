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
    if (!user?.id) {
      setLoading(false);
      return;
    }

    console.log('Fetching provider dashboard data for user:', user.id);
    
    try {
      setLoading(true);
      const [statsData, patientsData, appointmentsData] = await Promise.all([
        providerDashboardService.getProviderStats(user.id),
        providerDashboardService.getPatientOverviews(user.id),
        providerDashboardService.getTodaysAppointments(user.id)
      ]);
      
      console.log('Provider dashboard data fetched:', { statsData, patientsData, appointmentsData });
      setStats(statsData);
      setPatients(patientsData);
      setAppointments(appointmentsData);
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