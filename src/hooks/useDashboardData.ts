
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
  const [hasFetched, setHasFetched] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.id || hasFetched) {
      setLoading(false);
      return;
    }

    console.log('Starting dashboard data fetch for user:', user.id);
    setLoading(true);
    setError(null);

    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const dataPromise = Promise.all([
        dashboardDataService.getUserStats(user.id),
        dashboardDataService.getUserProfile(user.id)
      ]);

      const [statsData, profileData] = await Promise.race([dataPromise, timeoutPromise]) as [DashboardStats, UserProfile | null];
      
      console.log('Dashboard data fetched successfully:', { statsData, profileData });
      setStats(statsData);
      setProfile(profileData);
      setHasFetched(true);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
      
      // Don't show toast for timeout errors to avoid spam
      if (!(err as Error).message.includes('timeout')) {
        toast.error('Failed to load dashboard data', {
          action: {
            label: 'Retry',
            onClick: () => {
              setHasFetched(false);
              fetchData();
            }
          }
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user?.id, hasFetched]);

  const refreshStats = useCallback(() => {
    if (user?.id) {
      console.log('Refreshing dashboard stats');
      setHasFetched(false);
      setLoading(true);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id && !hasFetched) {
      // Small delay to prevent immediate execution
      const timer = setTimeout(() => {
        fetchData();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [user?.id, hasFetched, fetchData]);

  return {
    stats,
    profile,
    loading,
    error,
    refreshStats
  };
};
