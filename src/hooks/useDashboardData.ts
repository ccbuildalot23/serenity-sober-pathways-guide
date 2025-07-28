import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { dashboardDataService, DashboardStats, UserProfile } from '@/services/dashboardDataService';
import { toast } from 'sonner';

export const useDashboardData = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    streak: 0,
    checkIns: 0,
    goals: { completed: 0, total: 0 },
    recentCheckins: [],
    crisisAlerts: { total: 0, resolved: 0, recent: [] },
    supportNetwork: { totalMembers: 0, activeMembers: 0, members: [] },
    upcomingAppointments: []
  });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    console.log('Fetching dashboard data for user:', user.id);
    
    try {
      const [statsData, profileData] = await Promise.all([
        dashboardDataService.getUserStats(user.id),
        dashboardDataService.getUserProfile(user.id)
      ]);
      
      console.log('Dashboard data fetched:', { statsData, profileData });
      setStats(statsData);
      setProfile(profileData);
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
      
      // Set default values to prevent blank screen
      setStats({
        streak: 0,
        checkIns: 0,
        goals: { completed: 0, total: 0 },
        recentCheckins: [],
        crisisAlerts: { total: 0, resolved: 0, recent: [] },
        supportNetwork: { totalMembers: 0, activeMembers: 0, members: [] },
        upcomingAppointments: []
      });
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const refreshStats = useCallback(() => {
    if (user?.id) {
      console.log('Refreshing dashboard stats');
      setLoading(true);
      fetchData();
    }
  }, [user?.id, fetchData]);

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
