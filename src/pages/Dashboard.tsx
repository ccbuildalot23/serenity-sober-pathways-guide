// MVP Core Dashboard - Central hub for all user types

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/userRoles';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useUserRole } from '@/hooks/useUserRole';
import { Bell, Shield, Users, Activity, FileText, AlertTriangle, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SupportNetworkWidget } from '@/components/support/SupportNetworkWidget';
import { PresenceStatusWidget } from '@/components/support/PresenceStatusWidget';
import { format } from 'date-fns';

const Dashboard = () => {
  const { user } = useAuth();
  const { role: userRole, loading: roleLoading } = useUserRole();
  const { stats, profile, loading, error } = useDashboardData();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
              <Skeleton className="h-64" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Welcome back, {profile?.full_name || user?.email?.split('@')[0]}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Role: {userRole || 'patient'} | {stats.streak} day streak | HIPAA Compliant Platform
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                HIPAA Secure
              </Badge>
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Crisis Notification System - Requirement #4 */}
          <Card className={`${stats.crisisAlerts.total > 0 ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : ''}`}>
            <CardHeader>
              <CardTitle className={`flex items-center gap-2 ${stats.crisisAlerts.total > 0 ? 'text-red-700 dark:text-red-300' : ''}`}>
                <AlertTriangle className="w-5 h-5" />
                Crisis Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.crisisAlerts.total}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {stats.crisisAlerts.resolved}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Resolved</div>
                  </div>
                </div>
                
                {stats.crisisAlerts.recent.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recent Events</h4>
                    {stats.crisisAlerts.recent.slice(0, 2).map((alert, index) => (
                      <div key={index} className="p-2 bg-white dark:bg-gray-800 rounded text-sm">
                        <div className="flex justify-between items-center">
                          <span>{format(new Date(alert.created_at), 'MMM dd, HH:mm')}</span>
                          <Badge variant={alert.risk_level === 'high' ? 'destructive' : 'secondary'} className="text-xs">
                            {alert.risk_level || 'medium'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Shield className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">All clear - no recent crisis events</p>
                  </div>
                )}
                
                <Button variant="outline" className="w-full" size="sm">
                  <a href="/crisis-intervention">Crisis Resources</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Check-in Patterns - Requirement #5 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recovery Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats.streak}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Day Streak</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {stats.checkIns}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Check-ins</div>
                  </div>
                </div>
                
                {stats.recentCheckins.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recent Check-ins</h4>
                    {stats.recentCheckins.slice(0, 2).map((checkin, index) => (
                      <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">
                              {checkin.mood_rating ? `Mood: ${checkin.mood_rating}/10` : 'In Progress'}
                            </span>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {format(new Date(checkin.date), 'MMM dd')}
                            </p>
                          </div>
                          <Badge variant={checkin.is_complete ? 'default' : 'outline'} className="text-xs">
                            {checkin.is_complete ? 'Complete' : 'Pending'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <TrendingUp className="w-6 h-6 mx-auto text-gray-400 mb-1" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">No recent check-ins</p>
                  </div>
                )}
                
                <Button className="w-full" size="sm">
                  <a href="/checkin">Daily Check-in</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Support Network - Requirement #6 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Support Network
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {stats.supportNetwork.totalMembers}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Total Members</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {stats.supportNetwork.activeMembers}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Active</div>
                  </div>
                </div>
                
                {stats.supportNetwork.members.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Recent Contacts</h4>
                    {stats.supportNetwork.members.slice(0, 2).map((member, index) => (
                      <div key={index} className="p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{member.name}</span>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{member.relationship}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {member.is_emergency_contact ? 'Emergency' : 'Support'}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Users className="w-4 h-4 mr-2" />
                    <a href="/support">Manage Contacts</a>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Shield className="w-4 h-4 mr-2" />
                    Privacy Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Support Network Widget */}
          <SupportNetworkWidget />

          {/* Presence Status Widget */}
          <PresenceStatusWidget />

          {/* Care Navigation - Requirement #7 */}
          <Card className="md:col-span-2 lg:col-span-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Care Navigation & Documentation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Treatment Plan</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Current goals and milestones tracked with HIPAA compliance
                  </p>
                  <Button variant="outline" size="sm">View Plan</Button>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Provider Communications</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Secure messaging and appointment scheduling
                  </p>
                  <Button variant="outline" size="sm">Message Provider</Button>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">Progress Documentation</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Automated progress tracking with privacy controls
                  </p>
                  <Button variant="outline" size="sm">View Progress</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* HIPAA Compliance Notice - Requirement #3 */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                HIPAA Compliance Active
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                This platform maintains HIPAA compliance for pilot launch with: 
                encrypted data transmission, audit logging, granular access controls, 
                and limited data retention policies. All interactions are monitored for security.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;