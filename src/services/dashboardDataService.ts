
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  streak: number;
  checkIns: number;
  goals: { completed: number; total: number };
  recentCheckins: Array<{
    date: string;
    mood_rating: number | null;
    is_complete: boolean;
  }>;
  crisisAlerts: {
    total: number;
    resolved: number;
    recent: Array<{
      id: string;
      created_at: string;
      risk_level: string | null;
      crisis_resolved: boolean;
    }>;
  };
  supportNetwork: {
    totalMembers: number;
    activeMembers: number;
    members: Array<{
      id: string;
      name: string;
      relationship: string;
      is_emergency_contact: boolean;
      last_contacted: string | null;
    }>;
  };
  upcomingAppointments: Array<{
    id: string;
    title: string;
    scheduled_at: string;
    provider_name: string | null;
    type: string | null;
  }>;
}

export interface UserProfile {
  full_name?: string;
  email?: string;
  recovery_start_date?: string;
  enable_crisis_alerts?: boolean;
}

export const dashboardDataService = {
  async getUserStats(userId: string): Promise<DashboardStats> {
    try {
      console.log('Fetching comprehensive user stats for:', userId);

      // Get recovery streak - with error handling
      let streakData = null;
      try {
        const { data } = await supabase.rpc('get_recovery_streak', { user_uuid: userId });
        streakData = data;
      } catch (streakError) {
        console.warn('Error fetching streak data:', streakError);
      }

      // Get recent check-ins (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentCheckinsData, error: checkinsError } = await supabase
        .from('daily_checkins')
        .select('checkin_date, mood_rating, is_complete, created_at')
        .eq('user_id', userId)
        .gte('checkin_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('checkin_date', { ascending: false });

      if (checkinsError) {
        console.warn('Error fetching recent checkins:', checkinsError);
      }

      // Get total check-ins count
      const { data: totalCheckinsData, error: totalCheckinsError } = await supabase
        .from('daily_checkins')
        .select('id', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_complete', true);

      if (totalCheckinsError) {
        console.warn('Error fetching total checkins:', totalCheckinsError);
      }

      // Get crisis events data
      const { data: crisisEventsData, error: crisisError } = await supabase
        .from('crisis_events')
        .select('id, created_at, risk_level, crisis_resolved')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (crisisError) {
        console.warn('Error fetching crisis events:', crisisError);
      }

      // Get support network data
      const { data: supportNetworkData, error: supportError } = await supabase
        .from('crisis_contacts')
        .select('id, name, relationship, is_emergency_contact, last_contacted')
        .eq('user_id', userId)
        .order('priority_order', { ascending: true });

      if (supportError) {
        console.warn('Error fetching support network:', supportError);
      }

      // Get upcoming appointments (placeholder since appointments table doesn't exist yet)
      // This can be implemented when the appointments table is created
      const upcomingAppointments: any[] = [];
      // TODO: Implement when appointments table is available
      /*
      try {
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select('id, title, scheduled_at, provider_name, type')
          .eq('patient_id', userId)
          .gte('scheduled_at', new Date().toISOString())
          .order('scheduled_at', { ascending: true })
          .limit(5);

        if (!appointmentsError) {
          upcomingAppointments = appointmentsData || [];
        }
      } catch (appointmentError) {
        console.warn('Appointments table not found or error:', appointmentError);
      }
      */

      // Get active goals with progress
      const { data: goalsData, error: goalsError } = await supabase
        .from('recovery_goals')
        .select('id, progress, status')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(100);

      if (goalsError) {
        console.warn('Error fetching goals:', goalsError);
      }

      // Process data
      const completedGoals = goalsData?.filter(goal => goal.progress >= 100).length || 0;
      const totalGoals = goalsData?.length || 0;
      const streak = streakData?.current_streak_days || 0;
      
      const crisisEvents = crisisEventsData || [];
      const totalCrisisAlerts = crisisEvents.length;
      const resolvedCrisisAlerts = crisisEvents.filter(event => event.crisis_resolved).length;
      
      const supportMembers = supportNetworkData || [];
      const totalMembers = supportMembers.length;
      const activeMembers = supportMembers.filter(member => 
        member.last_contacted && 
        new Date(member.last_contacted) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      ).length;

      const result: DashboardStats = {
        streak,
        checkIns: totalCheckinsData?.length || 0,
        goals: {
          completed: completedGoals,
          total: totalGoals
        },
        recentCheckins: (recentCheckinsData || []).map(checkin => ({
          date: checkin.checkin_date,
          mood_rating: checkin.mood_rating,
          is_complete: checkin.is_complete
        })),
        crisisAlerts: {
          total: totalCrisisAlerts,
          resolved: resolvedCrisisAlerts,
          recent: crisisEvents.slice(0, 3).map(event => ({
            id: event.id,
            created_at: event.created_at,
            risk_level: event.risk_level,
            crisis_resolved: event.crisis_resolved
          }))
        },
        supportNetwork: {
          totalMembers,
          activeMembers,
          members: supportMembers.slice(0, 5).map(member => ({
            id: member.id,
            name: member.name,
            relationship: member.relationship,
            is_emergency_contact: member.is_emergency_contact,
            last_contacted: member.last_contacted
          }))
        },
        upcomingAppointments: upcomingAppointments.map(apt => ({
          id: apt.id,
          title: apt.title,
          scheduled_at: apt.scheduled_at,
          provider_name: apt.provider_name,
          type: apt.type
        }))
      };

      console.log('Comprehensive user stats result:', result);
      return result;
    } catch (error) {
      console.error('Error fetching comprehensive user stats:', error);
      // Return default values instead of throwing
      return {
        streak: 0,
        checkIns: 0,
        goals: {
          completed: 0,
          total: 0
        },
        recentCheckins: [],
        crisisAlerts: {
          total: 0,
          resolved: 0,
          recent: []
        },
        supportNetwork: {
          totalMembers: 0,
          activeMembers: 0,
          members: []
        },
        upcomingAppointments: []
      };
    }
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      console.log('Fetching user profile for:', userId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, recovery_start_date, enable_crisis_alerts')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Error fetching profile:', error);
        return null;
      }
      
      console.log('Profile data:', data);
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }
};
