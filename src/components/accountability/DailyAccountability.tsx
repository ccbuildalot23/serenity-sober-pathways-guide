
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, Trophy, Target, TrendingUp, Users, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface AccountabilityPartner {
  id: string;
  name: string;
  checkInTime: string;
  lastCheckIn?: string;
  streak: number;
}

const DailyAccountability: React.FC = () => {
  const [partners, setPartners] = useState<AccountabilityPartner[]>([]);
  const [todayCheckedIn, setTodayCheckedIn] = useState(false);
  const [streak, setStreak] = useState(0);
  const [nextCheckIn, setNextCheckIn] = useState<Date | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadAccountabilityData();
    setupCheckInReminders();
  }, [user]);

  const loadAccountabilityData = async () => {
    if (!user) return;

    try {
      // Since accountability_partners table doesn't exist, we'll use support_contacts as partners
      const { data: contactData } = await supabase
        .from('support_contacts')
        .select('*')
        .eq('user_id', user.id);

      // Load check-in history from daily_checkins (not daily_check_ins)
      const { data: checkInData } = await supabase
        .from('daily_checkins')
        .select('*')
        .eq('user_id', user.id)
        .order('checkin_date', { ascending: false })
        .limit(30);

      // Calculate streak
      const currentStreak = calculateStreak(checkInData || []);
      setStreak(currentStreak);

      // Check if already checked in today
      const today = new Date().toISOString().split('T')[0];
      const checkedInToday = checkInData?.some(
        check => check.checkin_date === today
      );
      setTodayCheckedIn(checkedInToday || false);

      // Convert contacts to partners format
      const partnersData: AccountabilityPartner[] = (contactData || []).map(contact => ({
        id: contact.id,
        name: contact.name,
        checkInTime: '09:00', // Default time since we don't have this field
        lastCheckIn: undefined,
        streak: 0 // Default streak
      }));

      setPartners(partnersData);
    } catch (error) {
      console.error('Error loading accountability data:', error);
    }
  };

  const calculateStreak = (checkIns: any[]) => {
    if (!checkIns.length) return 0;

    let streak = 0;
    const today = new Date();
    const dates = checkIns.map(c => new Date(c.checkin_date));

    for (let i = 0; i < dates.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);

      if (dates[i].toDateString() === expectedDate.toDateString()) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const setupCheckInReminders = async () => {
    if (!user) return;

    try {
      // Since user_preferences table doesn't exist, we'll use profile settings
      const { data: profile } = await supabase
        .from('profiles')
        .select('assessment_reminder_time')
        .eq('id', user.id)
        .single();

      if (profile?.assessment_reminder_time) {
        const [hours, minutes] = profile.assessment_reminder_time.split(':');
        const next = new Date();
        next.setHours(parseInt(hours), parseInt(minutes), 0);

        if (next < new Date()) {
          next.setDate(next.getDate() + 1);
        }

        setNextCheckIn(next);
      }
    } catch (error) {
      console.error('Error setting up reminders:', error);
    }
  };

  const performCheckIn = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('daily_checkins')
        .insert({
          user_id: user.id,
          checkin_date: new Date().toISOString().split('T')[0],
          mood_rating: 7, // This would come from a mood selector
          notes: 'Feeling strong today'
        });

      if (error) throw error;

      setTodayCheckedIn(true);
      setStreak(streak + 1);

      // Notify accountability partners (simplified since notifications table doesn't exist)
      console.log('Check-in completed, would notify partners:', partners.length);

      toast.success('Check-in complete! Keep up the great work!');
    } catch (error) {
      console.error('Error checking in:', error);
      toast.error('Failed to complete check-in');
    }
  };

  const addAccountabilityPartner = () => {
    toast.info('Partner matching feature coming soon!');
  };

  return (
    <div className="space-y-4">
      {/* Streak Card */}
      <Card className="bg-gradient-to-r from-green-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Trophy className="w-5 h-5 mr-2 text-yellow-600" />
              Your Streak
            </span>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {streak} Days
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={(streak / 30) * 100} className="h-3" />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Current: {streak} days</span>
              <span>Goal: 30 days</span>
            </div>

            {!todayCheckedIn && (
              <Button
                onClick={performCheckIn}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Target className="w-4 h-4 mr-2" />
                Complete Today's Check-In
              </Button>
            )}

            {todayCheckedIn && (
              <div className="text-center p-3 bg-green-100 rounded-lg">
                <p className="text-green-700 font-semibold">✓ Today's check-in complete!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Accountability Partners */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2 text-blue-600" />
            Accountability Partners
          </CardTitle>
        </CardHeader>
        <CardContent>
          {partners.length === 0 ? (
            <div className="text-center space-y-4">
              <p className="text-gray-600">No accountability partners yet</p>
              <Button onClick={addAccountabilityPartner} variant="outline">
                Find a Partner
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {partners.map(partner => (
                <div
                  key={partner.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-semibold">{partner.name}</p>
                    <p className="text-sm text-gray-600">Check-in time: {partner.checkInTime}</p>
                  </div>
                  <Badge
                    variant={
                      partner.lastCheckIn === new Date().toISOString().split('T')[0]
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {partner.streak} day streak
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Check-In Reminder */}
      {nextCheckIn && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Bell className="w-5 h-5 mr-2 text-blue-600" />
                <span className="text-sm">Next check-in reminder:</span>
              </div>
              <span className="font-semibold text-blue-700">
                {nextCheckIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DailyAccountability;
