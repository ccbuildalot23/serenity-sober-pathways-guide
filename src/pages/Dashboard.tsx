// MVP Core Dashboard - Central hub for all user types

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types/userRoles';
import { Bell, Shield, Users, Activity, FileText, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Dashboard = () => {
  const { user } = useAuth();
  const [userRole] = useState<UserRole>('patient'); // In production, fetch from database

  // Mock data for MVP demonstration
  const crisisAlerts = [
    { id: 1, patient: 'Anonymous User', severity: 'high', time: '2 min ago' },
    { id: 2, patient: 'Anonymous User', severity: 'medium', time: '15 min ago' }
  ];

  const recentCheckIns = [
    { id: 1, mood: 7, date: 'Today', notes: 'Feeling better' },
    { id: 2, mood: 5, date: 'Yesterday', notes: 'Struggled a bit' }
  ];

  const supportNetworkSize = 3;
  const hipaaCompliantActions = 12;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Serenity MVP Dashboard
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Role: {userRole} | HIPAA Compliant Recovery Platform
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Crisis Notification System - Requirement #4 */}
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
            <CardHeader>
              <CardTitle className="text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Crisis Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {crisisAlerts.map(alert => (
                  <div key={alert.id} className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {alert.patient}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {alert.time}
                        </p>
                      </div>
                      <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                        {alert.severity}
                      </Badge>
                    </div>
                  </div>
                ))}
                <Button className="w-full" size="sm">
                  View All Alerts
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Check-in Patterns - Requirement #5 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Check-in Patterns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentCheckIns.map(checkin => (
                  <div key={checkin.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">Mood: {checkin.mood}/10</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {checkin.date}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm mt-2 text-gray-700 dark:text-gray-300">
                      {checkin.notes}
                    </p>
                  </div>
                ))}
                <Button variant="outline" className="w-full" size="sm">
                  <a href="/checkin">Submit Check-in</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Controls - Requirement #6 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Privacy & Access Controls
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Support Network Access</span>
                  <Badge variant="secondary">{supportNetworkSize} members</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">HIPAA Actions Today</span>
                  <Badge variant="outline">{hipaaCompliantActions}</Badge>
                </div>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Users className="w-4 h-4 mr-2" />
                    Manage Support Access
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    View Audit Log
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Care Navigation - Requirement #7 */}
          <Card className="md:col-span-2 lg:col-span-3">
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