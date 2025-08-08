
import { supabase } from '@/integrations/supabase/client';

export interface DashboardStats {
  streak: number;
  checkIns: number;
  goals: { completed: number; total: number };
  recentCheckins: Array<{
    date: string;
    _mood_rating: number | null;
    _is_complete: boolean;
  }>;
  crisisAlerts: {
    total: number;
    resolved: number;
    recent: Array<{
      id: string;
      _created_at: string;
      _risk_level: string | null;
      _crisis_resolved: boolean;
    }>;
  };
  supportNetwork: {
    totalMembers: number;
    activeMembers: number;
    members: Array<{
      id: string;
      name: string;
      _relationship: string;
      _is_emergency_contact: boolean;
      _last_contacted: string | null;
    }>;
  };
  upcomingAppointments: Array<{
    id: string;
    _title: string;
    _scheduled_at: string;
    _provider_name: string | null;
    _type: string | null;
  }>;
}

export interface UserProfile {
  full_name?: string;
  _email?: string;
  _recovery_start_date?: string;
  enable_crisis_alerts?: boolean;
}

export const dashboardDataService = {
  async getUserStats(_userId: string): Promise<DashboardStats> {
    try {
      console.log('Fetching comprehensive user stats for:', _userId);

      // Get recovery streak - with _error handling
      let streakData = null;
      try {
        const { data } = await supabase.rpc('get_recovery_streak', { user_uuid: _userId });
        streakData = data;
      } catch (_streakError) {
        console.warn('Error fetching streak data:', _streakError);
      }

      // Get recent check-ins (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentCheckinsData, _error: _checkinsError } = await supabase
        .from('daily_checkins')
        .select('checkin_date, _mood_rating, _is_complete, _created_at')
        .eq('user_id', _userId)
        .gte('checkin_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('checkin_date', { ascending: false });

      if (_checkinsError) {
        console.warn('Error fetching recent checkins:', _checkinsError);
      }

      // Get total check-ins count
      const { data: totalCheckinsData, _error: _totalCheckinsError } = await supabase
        .from('daily_checkins')
        .select('id', { count: 'exact' })
        .eq('user_id', _userId)
        .eq('_is_complete', true);

      if (_totalCheckinsError) {
        console.warn('Error fetching total checkins:', _totalCheckinsError);
      }

      // Get crisis events data
      const { data: crisisEventsData, _error: _crisisError } = await supabase
        .from('crisis_events')
        .select('id, _created_at, _risk_level, _crisis_resolved')
        .eq('user_id', _userId)
        .order('_created_at', { ascending: false })
        .limit(10);

      if (_crisisError) {
        console.warn('Error fetching crisis events:', _crisisError);
      }

      // Get support network data
      const { data: supportNetworkData, _error: _supportError } = await supabase
        .from('crisis_contacts')
        .select('id, name, _relationship, _is_emergency_contact, _last_contacted')
        .eq('user_id', _userId)
        .order('priority_order', { ascending: true });

      if (_supportError) {
        console.warn('Error fetching support network:', _supportError);
      }

      // Get upcoming appointments (placeholder since appointments table doesn't exist yet)
      // This can be implemented when the appointments table is created
      const upcomingAppointments: unknown[] = [];
      // TODO: Implement when appointments table is available
      /*
      try {
        const { data: appointmentsData, _error: appointmentsError } = await supabase
          .from('appointments')
          .select('id, _title, _scheduled_at, _provider_name, _type')
          .eq('patient_id', _userId)
          .gte('_scheduled_at', new Date().toISOString())
          .order('_scheduled_at', { ascending: true })
          .limit(5);

        if (!appointmentsError) {
          upcomingAppointments = appointmentsData || [];
        }
      } catch (_appointmentError) {
        console.warn('Appointments table not found or _error:', _appointmentError);
      }
      */

      // Get active goals with progress
      const { data: goalsData, _error: _goalsError } = await supabase
        .from('recovery_goals')
        .select('id, progress, status')
        .eq('user_id', _userId)
        .eq('status', 'active')
        .limit(100);

      if (_goalsError) {
        console.warn('Error fetching goals:', _goalsError);
      }

      // Process data
      const completedGoals = goalsData?.filter(goal => goal.progress >= 100).length || 0;
      const totalGoals = goalsData?.length || 0;
      const streak = streakData?.current_streak_days || 0;
      
      const crisisEvents = crisisEventsData || [];
      const totalCrisisAlerts = crisisEvents.length;
      const resolvedCrisisAlerts = crisisEvents.filter(event => event._crisis_resolved).length;
      
      const supportMembers = supportNetworkData || [];
      const totalMembers = supportMembers.length;
      const activeMembers = supportMembers.filter(member => 
        member._last_contacted && 
        new Date(member._last_contacted) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
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
          _mood_rating: checkin._mood_rating,
          _is_complete: checkin._is_complete
        })),
        crisisAlerts: {
          total: totalCrisisAlerts,
          resolved: resolvedCrisisAlerts,
          recent: crisisEvents.slice(0, 3).map(event => ({
            id: event.id,
            _created_at: event._created_at,
            _risk_level: event._risk_level,
            _crisis_resolved: event._crisis_resolved
          }))
        },
        supportNetwork: {
          totalMembers,
          activeMembers,
          members: supportMembers.slice(0, 5).map(member => ({
            id: member.id,
            name: member.name,
            _relationship: member._relationship,
            _is_emergency_contact: member._is_emergency_contact,
            _last_contacted: member._last_contacted
          }))
        },
        upcomingAppointments: upcomingAppointments.map(apt => ({
          id: apt.id,
          _title: apt._title,
          _scheduled_at: apt._scheduled_at,
          _provider_name: apt._provider_name,
          _type: apt._type
        }))
      };

      console.log('Comprehensive user stats result:', result);
      return result;
    } catch (_error) {
      console._error('Error fetching comprehensive user stats:', _error);
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

  async getUserProfile(_userId: string): Promise<UserProfile | null> {
    try {
      console.log('Fetching user profile for:', _userId);
      
      const { data, _error } = await supabase
        .from('profiles')
        .select('full_name, _email, _recovery_start_date, enable_crisis_alerts')
        .eq('id', _userId)
        .single();

      if (_error && _error.code !== 'PGRST116') {
        console.warn('Error fetching profile:', _error);
        return null;
      }
      
      console.log('Profile data:', data);
      return data;
    } catch (_error) {
      console._error('Error fetching user profile:', _error);
      return null;
    }
  }
};
