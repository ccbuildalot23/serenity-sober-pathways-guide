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
  AlertTriangle
} from 'lucide-react';

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                  <p className="text-sm font-medium text-muted-foreground">Check-ins</p>
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
                  <p className="text-sm font-medium text-muted-foreground">Goals Progress</p>
                  <p className="text-3xl font-bold text-foreground">
                    {stats.goals.completed}/{stats.goals.total}
                  </p>
                  <p className="text-xs text-muted-foreground">goals achieved</p>
                </div>
                <Calendar className="w-8 h-8 text-purple-600" />
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
                Support Network
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Manage your support circle and privacy settings.
              </p>
              <Button variant="outline" className="w-full">
                Manage Support Network
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Privacy & Resources */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Data Sharing</span>
                  <Badge variant="secondary">Limited</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Support Access</span>
                  <Badge variant="outline">Controlled</Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full">
                  Manage Privacy Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Recovery Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  CBT Skills Library
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Mindfulness Exercises
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Serenity Resources
                </Button>
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