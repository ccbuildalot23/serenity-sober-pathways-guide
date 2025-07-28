// Patient Dashboard - For users in recovery

import React from 'react';
import { Link } from 'react-router-dom';
import { useDashboardData } from '@/hooks/useDashboardData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart, 
  Calendar, 
  TrendingUp, 
  Shield, 
  Users, 
  BookOpen,
  CheckCircle,
  AlertTriangle,
  Clock,
  Activity,
  UserCheck,
  PhoneCall
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

const PatientDashboard = () => {
  const { stats, profile, loading } = useDashboardData();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Heart className="w-8 h-8 text-primary" />
                Serenity Dashboard
              </h1>
              <p className="mt-2 text-muted-foreground">
                Welcome back, {profile?.full_name || 'Friend'}. Your journey matters.
              </p>
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="w-3 h-3" />
              Patient Portal
            </Badge>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Serenity Streak</p>
                  <p className="text-3xl font-bold text-foreground">{stats.streak}</p>
                  <p className="text-xs text-muted-foreground">days strong</p>
                </div>
                <TrendingUp className="w-8 h-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Check-ins</p>
                  <p className="text-3xl font-bold text-foreground">{stats.checkIns}</p>
                  <p className="text-xs text-muted-foreground">completed</p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Support Network</p>
                  <p className="text-3xl font-bold text-foreground">{stats.supportNetwork.totalMembers}</p>
                  <p className="text-xs text-muted-foreground">
                    {stats.supportNetwork.activeMembers} active this month
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Goals Progress</p>
                  <p className="text-3xl font-bold text-foreground">
                    {stats.goals.completed}/{stats.goals.total}
                  </p>
                  <p className="text-xs text-muted-foreground">goals achieved</p>
                </div>
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Overview */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Recent Check-ins */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Check-ins (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.recentCheckins.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentCheckins.slice(0, 5).map((checkin, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {format(parseISO(checkin.date), 'MMM d')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Mood: {checkin.mood_rating?.toFixed(1) || 'N/A'}/10
                        </p>
                      </div>
                      <Badge variant={checkin.is_complete ? "default" : "secondary"}>
                        {checkin.is_complete ? "Complete" : "Incomplete"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">
                  No recent check-ins found
                </p>
              )}
            </CardContent>
          </Card>

          {/* Crisis Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 w-5" />
                Safety Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Crisis Events</span>
                  <Badge variant={stats.crisisAlerts.total === 0 ? "default" : "destructive"}>
                    {stats.crisisAlerts.total} total
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Resolved Events</span>
                  <Badge variant="secondary">
                    {stats.crisisAlerts.resolved} resolved
                  </Badge>
                </div>
                {stats.crisisAlerts.recent.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">Recent Events:</p>
                    {stats.crisisAlerts.recent.map((alert) => (
                      <div key={alert.id} className="text-xs mb-1">
                        {format(parseISO(alert.created_at), 'MMM d')} - 
                        Risk: {alert.risk_level || 'Unknown'}
                        {alert.crisis_resolved && <span className="text-green-600 ml-1">✓</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Daily Check-in
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Share how you're feeling today and track your progress.
              </p>
              <Link to="/checkin">
                <Button className="w-full">
                  Start Today's Check-in
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Support Network ({stats.supportNetwork.totalMembers})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.supportNetwork.members.length > 0 ? (
                <div className="space-y-3">
                  {stats.supportNetwork.members.slice(0, 3).map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.relationship}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {member.is_emergency_contact && (
                          <Badge variant="destructive" className="text-xs">Emergency</Badge>
                        )}
                        {member.last_contacted && (
                          <UserCheck className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                  <Link to="/support">
                    <Button variant="outline" className="w-full mt-3">
                      Manage Support Network
                    </Button>
                  </Link>
                </div>
              ) : (
                <div>
                  <p className="text-muted-foreground mb-4">
                    No support network members added yet.
                  </p>
                  <Link to="/support">
                    <Button className="w-full">
                      Add Support Members
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Appointments & Resources */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Appointments Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Upcoming Appointments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats.upcomingAppointments.length > 0 ? (
                <div className="space-y-3">
                  {stats.upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{appointment.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(appointment.scheduled_at), 'MMM d, h:mm a')}
                          </p>
                          {appointment.provider_name && (
                            <p className="text-xs text-muted-foreground">
                              with {appointment.provider_name}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline">
                          {appointment.type || 'Appointment'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No upcoming appointments</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Schedule Appointment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recovery Resources */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Recovery Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Link to="/checkin/history">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    📊 View Check-in History
                  </Button>
                </Link>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  🧠 CBT Skills Library
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  🧘 Mindfulness Exercises
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  📚 Serenity Resources
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Privacy Controls */}
        <div className="grid md:grid-cols-1 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy & Safety Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Crisis Alerts</span>
                    <Badge variant={profile?.enable_crisis_alerts ? "default" : "secondary"}>
                      {profile?.enable_crisis_alerts ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Support Access</span>
                    <Badge variant="outline">Controlled</Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Data Sharing</span>
                    <Badge variant="secondary">Limited</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Recovery Date</span>
                    <span className="text-xs text-muted-foreground">
                      {profile?.recovery_start_date ? 
                        format(parseISO(profile.recovery_start_date), 'MMM yyyy') : 
                        'Not set'
                      }
                    </span>
                  </div>
                </div>
                <div className="flex items-center">
                  <Button variant="outline" size="sm" className="w-full">
                    Manage Privacy Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Emergency Notice */}
        <div className="mt-8 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-destructive">
                Need Help Right Now?
              </h3>
              <p className="text-sm text-destructive/80 mt-1">
                If you're experiencing a crisis, reach out immediately: 988 Suicide & Crisis Lifeline
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;