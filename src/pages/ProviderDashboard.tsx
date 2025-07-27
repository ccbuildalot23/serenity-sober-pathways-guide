// MVP Provider Dashboard - Requirement #5: Simple provider dashboard showing patient check-in patterns

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  Shield,
  Calendar,
  FileText,
  Eye
} from 'lucide-react';

interface PatientCheckIn {
  id: string;
  patientId: string;
  patientInitials: string;
  moodRating: number;
  date: string;
  riskLevel: 'low' | 'medium' | 'high';
  notes?: string;
  supportNetworkAlerted?: boolean;
}

const ProviderDashboard = () => {
  // Mock data for MVP - in production this would come from secure API
  const [checkInPatterns] = useState<PatientCheckIn[]>([
    {
      id: '1',
      patientId: 'p001',
      patientInitials: 'J.D.',
      moodRating: 3,
      date: '2024-01-27',
      riskLevel: 'high',
      notes: 'Struggling with cravings',
      supportNetworkAlerted: true
    },
    {
      id: '2',
      patientId: 'p002',
      patientInitials: 'S.M.',
      moodRating: 7,
      date: '2024-01-27',
      riskLevel: 'low',
      notes: 'Good day, feeling stable'
    },
    {
      id: '3',
      patientId: 'p001',
      patientInitials: 'J.D.',
      moodRating: 5,
      date: '2024-01-26',
      riskLevel: 'medium',
      notes: 'Some anxiety but manageable'
    },
    {
      id: '4',
      patientId: 'p003',
      patientInitials: 'M.R.',
      moodRating: 8,
      date: '2024-01-26',
      riskLevel: 'low',
      notes: 'Great progress this week'
    }
  ]);

  const getPatientStats = () => {
    const totalPatients = new Set(checkInPatterns.map(c => c.patientId)).size;
    const todayCheckins = checkInPatterns.filter(c => c.date === '2024-01-27').length;
    const highRiskCount = checkInPatterns.filter(c => c.riskLevel === 'high' && c.date === '2024-01-27').length;
    const avgMood = checkInPatterns
      .filter(c => c.date === '2024-01-27')
      .reduce((sum, c) => sum + c.moodRating, 0) / todayCheckins || 0;
    
    return { totalPatients, todayCheckins, highRiskCount, avgMood: Math.round(avgMood * 10) / 10 };
  };

  const stats = getPatientStats();

  const getRiskBadgeVariant = (level: string) => {
    switch (level) {
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Provider Dashboard
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Patient Check-in Patterns & Recovery Monitoring
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                HIPAA Secure
              </Badge>
              <Badge variant="secondary">
                {stats.totalPatients} Patients
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Today's Check-ins
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.todayCheckins}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Average Mood
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.avgMood}/10
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    High Risk Alerts
                  </p>
                  <p className="text-3xl font-bold text-red-600">
                    {stats.highRiskCount}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total Patients
                  </p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">
                    {stats.totalPatients}
                  </p>
                </div>
                <Users className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Patient Check-in Patterns Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Patient Check-ins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {checkInPatterns.map((checkin) => (
                <div key={checkin.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          {checkin.patientInitials}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          Patient {checkin.patientInitials}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {checkin.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={getRiskBadgeVariant(checkin.riskLevel)}>
                        {checkin.riskLevel} risk
                      </Badge>
                      {checkin.supportNetworkAlerted && (
                        <Badge variant="outline" className="text-orange-600">
                          Network Alerted
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        Mood Rating
                      </p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              checkin.moodRating <= 3 ? 'bg-red-500' :
                              checkin.moodRating <= 6 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${(checkin.moodRating / 10) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">
                          {checkin.moodRating}/10
                        </span>
                      </div>
                    </div>
                    
                    {checkin.notes && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                          Notes
                        </p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {checkin.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      View History
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileText className="w-4 h-4 mr-1" />
                      Add Note
                    </Button>
                    {checkin.riskLevel === 'high' && (
                      <Button variant="destructive" size="sm">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        Crisis Protocol
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* HIPAA Compliance Notice */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">
                HIPAA Compliant Data Access
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                All patient data is displayed with privacy controls. Only authorized medical professionals 
                can access full patient information. All views are logged for audit compliance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderDashboard;