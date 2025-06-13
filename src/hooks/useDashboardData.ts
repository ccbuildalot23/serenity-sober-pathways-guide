
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardDataService } from '@/services/dashboardDataService';
import { toast } from 'sonner';

interface DashboardStats {
  streak: number;
  checkIns: number;
  goals: { completed: number; total: number };
}

interface UserProfile {
  full_name?: string;
  email?: string;
}

export const useDashboardData = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    streak: 0,
    checkIns: 0,
    goals: { completed: 0, total: 0 }
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setError(null);
      const [statsData, profileData] = await Promise.all([
        dashboardDataService.getUserStats(user.id),
        dashboardDataService.getUserProfile(user.id)
      ]);
      
      setStats(statsData);
      setProfile(profileData);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
      toast.error('Failed to load dashboard data', {
        action: {
          label: 'Retry',
          onClick: () => fetchData()
        }
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshStats = useCallback(() => {
    if (user) {
      setLoading(true);
      fetchData();
    }
  }, [user, fetchData]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    stats,
    profile,
    loading,
    error,
    refreshStats
  };
};
