import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Goal {
  id: string;
  user_id: string;
  title: string;
  target_date: string;
  status: string;
  progress: number;
  milestones: Array<{
    id: string;
    title: string;
    completed: boolean;
    target_date?: string;
  }>;
}

interface CheckinStats {
  user_id: string;
  streak_count: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Running recovery notification scheduler...');

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 1. Check for goal due date reminders
    await processGoalReminders(supabase, now);

    // 2. Check for streak milestones
    await processStreakMilestones(supabase);

    // 3. Check for overdue goals
    await processOverdueGoals(supabase, today);

    // 4. Generate weekly summaries (if it's the user's preferred day)
    await processWeeklySummaries(supabase, now);

    // 5. Clean up expired notifications
    await cleanupExpiredNotifications(supabase);

    console.log('Notification scheduler completed successfully');

    return new Response(
      JSON.stringify({ success: true, timestamp: now.toISOString() }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in notification scheduler:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function processGoalReminders(supabase: any, now: Date) {
  console.log('Processing goal reminders...');

  // Get all active goals with upcoming due dates
  const { data: goals, error: goalsError } = await supabase
    .from('recovery_goals')
    .select('*')
    .eq('status', 'active')
    .gte('target_date', now.toISOString().split('T')[0]);

  if (goalsError) {
    console.error('Error fetching goals:', goalsError);
    return;
  }

  for (const goal of goals || []) {
    // Get user's notification preferences
    const { data: prefs } = await supabase
      .from('recovery_notification_preferences')
      .select('*')
      .eq('user_id', goal.user_id)
      .single();

    if (!prefs?.goal_reminders_enabled) continue;

    const dueDate = new Date(goal.target_date);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Check if we should send a reminder today
    if (prefs.goal_reminder_days_before.includes(daysUntilDue)) {
      // Check if we haven't already sent this reminder
      const { data: existingNotification } = await supabase
        .from('recovery_notifications')
        .select('id')
        .eq('user_id', goal.user_id)
        .eq('notification_type', 'goal_due_reminder')
        .eq('data->>goal_id', goal.id)
        .eq('data->>days_until_due', daysUntilDue.toString())
        .single();

      if (!existingNotification) {
        // Create reminder notification
        await supabase
          .from('recovery_notifications')
          .insert({
            user_id: goal.user_id,
            notification_type: 'goal_due_reminder',
            title: `Goal Reminder: ${goal.title}`,
            message: `Your goal "${goal.title}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}. Keep up the great work!`,
            data: {
              goal_id: goal.id,
              days_until_due: daysUntilDue,
              goal_title: goal.title,
              target_date: goal.target_date
            },
            priority: daysUntilDue <= 1 ? 'high' : 'normal',
            delivery_methods: prefs.delivery_methods
          });

        console.log(`Created goal reminder for user ${goal.user_id}, goal: ${goal.title}`);
      }
    }
  }
}

async function processStreakMilestones(supabase: any) {
  console.log('Processing streak milestones...');

  // Get users with current streaks
  const { data: streaks, error: streaksError } = await supabase
    .from('checkin_stats')
    .select('user_id, streak_count')
    .gt('streak_count', 0);

  if (streaksError) {
    console.error('Error fetching streaks:', streaksError);
    return;
  }

  for (const streak of streaks || []) {
    // Get user's notification preferences
    const { data: prefs } = await supabase
      .from('recovery_notification_preferences')
      .select('*')
      .eq('user_id', streak.user_id)
      .single();

    if (!prefs?.streak_notifications_enabled) continue;

    // Check if current streak is a milestone
    if (prefs.streak_milestones.includes(streak.streak_count)) {
      // Check if we haven't already celebrated this milestone
      const { data: existingNotification } = await supabase
        .from('recovery_notifications')
        .select('id')
        .eq('user_id', streak.user_id)
        .eq('notification_type', 'streak_milestone')
        .eq('data->>streak_days', streak.streak_count.toString())
        .single();

      if (!existingNotification) {
        // Create milestone celebration
        const message = streak.streak_count === 1 
          ? 'Congratulations on starting your recovery journey!' 
          : `Amazing! You've maintained your recovery streak for ${streak.streak_count} days!`;

        await supabase
          .from('recovery_notifications')
          .insert({
            user_id: streak.user_id,
            notification_type: 'streak_milestone',
            title: `🔥 ${streak.streak_count} Day Streak!`,
            message,
            data: {
              streak_days: streak.streak_count,
              milestone_type: 'daily_streak'
            },
            priority: 'high',
            delivery_methods: prefs.delivery_methods
          });

        console.log(`Created streak milestone for user ${streak.user_id}: ${streak.streak_count} days`);
      }
    }
  }
}

async function processOverdueGoals(supabase: any, today: string) {
  console.log('Processing overdue goals...');

  // Get all overdue active goals
  const { data: overdueGoals, error: overdueError } = await supabase
    .from('recovery_goals')
    .select('*')
    .eq('status', 'active')
    .lt('target_date', today);

  if (overdueError) {
    console.error('Error fetching overdue goals:', overdueError);
    return;
  }

  for (const goal of overdueGoals || []) {
    // Check if we haven't already sent an overdue notification today
    const { data: existingNotification } = await supabase
      .from('recovery_notifications')
      .select('id')
      .eq('user_id', goal.user_id)
      .eq('notification_type', 'goal_overdue')
      .eq('data->>goal_id', goal.id)
      .gte('created_at', today)
      .single();

    if (!existingNotification) {
      const daysOverdue = Math.floor((new Date().getTime() - new Date(goal.target_date).getTime()) / (1000 * 60 * 60 * 24));
      
      await supabase
        .from('recovery_notifications')
        .insert({
          user_id: goal.user_id,
          notification_type: 'goal_overdue',
          title: `Goal Overdue: ${goal.title}`,
          message: `Your goal "${goal.title}" was due ${daysOverdue} day${daysOverdue !== 1 ? 's' : ''} ago. Consider updating your target date or breaking it into smaller steps.`,
          data: {
            goal_id: goal.id,
            days_overdue: daysOverdue,
            goal_title: goal.title,
            target_date: goal.target_date
          },
          priority: 'normal'
        });

      console.log(`Created overdue notification for user ${goal.user_id}, goal: ${goal.title}`);
    }
  }
}

async function processWeeklySummaries(supabase: any, now: Date) {
  console.log('Processing weekly summaries...');

  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

  // Get users who have weekly summaries enabled for today
  const { data: users, error: usersError } = await supabase
    .from('recovery_notification_preferences')
    .select('user_id, delivery_methods')
    .eq('weekly_summary_enabled', true)
    .eq('weekly_summary_day', currentDay);

  if (usersError) {
    console.error('Error fetching users for weekly summary:', usersError);
    return;
  }

  for (const user of users || []) {
    // Check if we haven't already sent a summary this week
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const { data: existingSummary } = await supabase
      .from('recovery_notifications')
      .select('id')
      .eq('user_id', user.user_id)
      .eq('notification_type', 'weekly_summary')
      .gte('created_at', weekStart.toISOString())
      .single();

    if (!existingSummary) {
      // Generate summary data
      const weekAgo = new Date(now);
      weekAgo.setDate(now.getDate() - 7);

      // Get check-ins from the past week
      const { data: checkins } = await supabase
        .from('daily_checkins')
        .select('checkin_date, mood_rating, is_complete')
        .eq('user_id', user.user_id)
        .gte('checkin_date', weekAgo.toISOString().split('T')[0])
        .order('checkin_date', { ascending: false });

      // Get completed goals this week
      const { data: completedGoals } = await supabase
        .from('recovery_goals')
        .select('title, completed_at')
        .eq('user_id', user.user_id)
        .eq('status', 'completed')
        .gte('completed_at', weekAgo.toISOString());

      const checkinCount = checkins?.filter(c => c.is_complete)?.length || 0;
      const avgMood = checkins?.length ? 
        checkins.reduce((sum, c) => sum + (c.mood_rating || 0), 0) / checkins.length : 0;

      const summaryMessage = `This week: ${checkinCount}/7 check-ins completed, ${completedGoals?.length || 0} goal${(completedGoals?.length || 0) !== 1 ? 's' : ''} achieved${avgMood > 0 ? `, average mood: ${avgMood.toFixed(1)}/10` : ''}. Keep building momentum!`;

      await supabase
        .from('recovery_notifications')
        .insert({
          user_id: user.user_id,
          notification_type: 'weekly_summary',
          title: '📊 Your Weekly Summary',
          message: summaryMessage,
          data: {
            week_start: weekStart.toISOString(),
            checkin_count: checkinCount,
            completed_goals: completedGoals?.length || 0,
            average_mood: avgMood
          },
          priority: 'normal',
          delivery_methods: user.delivery_methods
        });

      console.log(`Created weekly summary for user ${user.user_id}`);
    }
  }
}

async function cleanupExpiredNotifications(supabase: any) {
  console.log('Cleaning up expired notifications...');

  const { error } = await supabase
    .rpc('cleanup_expired_notifications');

  if (error) {
    console.error('Error cleaning up notifications:', error);
  } else {
    console.log('Expired notifications cleaned up successfully');
  }
}