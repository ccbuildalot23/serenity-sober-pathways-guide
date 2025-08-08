// Patient Dashboard - For users in recovery

import React from 'react';
import { Link } from 'react-router-dom';
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

const PatientDashboard = () => {
  return (
    <div className="min-h-screen bg-background" data-testid="patient-dashboard">
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
                Welcome back, Friend. Your journey matters.
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
                  <p className="text-sm font-medium text-muted-foreground">Hope Journey</p>
                  <p className="text-3xl font-bold text-foreground">0</p>
                  <p className="text-xs text-muted-foreground">days of courage</p>
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
                  <p className="text-3xl font-bold text-foreground">0</p>
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
                  <p className="text-3xl font-bold text-foreground">0</p>
                  <p className="text-xs text-muted-foreground">connections</p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tools Used</p>
                  <p className="text-3xl font-bold text-foreground">0</p>
                  <p className="text-xs text-muted-foreground">recovery tools</p>
                </div>
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Daily Check-in */}
          <Card data-testid="daily-checkin-section">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Daily Check-in
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Track your mood and progress today
              </p>
              <Button asChild className="w-full">
                <Link to="/checkin">Start Check-in</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Crisis Support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Crisis Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Immediate help when you need it most
              </p>
              <Button asChild variant="destructive" className="w-full" data-testid="crisis-support-button">
                <Link to="/crisis-support">Get Help Now</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Peer Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Connect with others on similar journeys
              </p>
              <Button asChild variant="outline" className="w-full" data-testid="peer-support-access">
                <Link to="/peer-support">Join Community</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Educational materials and tools
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/resources">Browse Resources</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5" />
                Community
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Engage with the recovery community
              </p>
              <Button asChild variant="outline" className="w-full" data-testid="community-access">
                <Link to="/community">Visit Community</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;