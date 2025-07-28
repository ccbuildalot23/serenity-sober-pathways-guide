import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Calendar, Shield, Bell, Heart, TrendingUp, CheckCircle, Clock, Star } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { AccountabilityService, AccountabilityPartnership } from '@/services/accountabilityService';
import { toast } from 'sonner';
import PartnershipRequestForm from './PartnershipRequestForm';
import CheckInForm from './CheckInForm';
import PartnershipNotifications from './PartnershipNotifications';
import SupportAgreementViewer from './SupportAgreementViewer';

const AccountabilityPartnerDashboard: React.FC = () => {
  const [partnerships, setPartnerships] = useState<AccountabilityPartnership[]>([]);
  const [selectedPartnership, setSelectedPartnership] = useState<AccountabilityPartnership | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();

  useEffect(() => {
    loadPartnerships();
  }, [user]);

  const loadPartnerships = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await AccountabilityService.getUserPartnerships(user.id);
      setPartnerships(data);
      
      if (data.length > 0 && !selectedPartnership) {
        setSelectedPartnership(data[0]);
      }
    } catch (error) {
      console.error('Error loading partnerships:', error);
      toast.error('Failed to load accountability partnerships');
    } finally {
      setLoading(false);
    }
  };

  const getPartnerName = (partnership: AccountabilityPartnership) => {
    // In a real app, you'd fetch partner details from profiles table
    const partnerId = partnership.requester_id === user?.id 
      ? partnership.partner_id 
      : partnership.requester_id;
    return `Partner ${partnerId.slice(0, 8)}...`; // Placeholder
  };

  const renderPartnershipCard = (partnership: AccountabilityPartnership) => (
    <Card 
      key={partnership.id}
      className={`cursor-pointer transition-all ${
        selectedPartnership?.id === partnership.id 
          ? 'ring-2 ring-blue-500 border-blue-200' 
          : 'hover:border-gray-300'
      }`}
      onClick={() => setSelectedPartnership(partnership)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">{getPartnerName(partnership)}</p>
              <p className="text-sm text-gray-500">
                Since {new Date(partnership.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <Badge 
              variant={partnership.status === 'accepted' ? 'default' : 'secondary'}
              className="mb-1"
            >
              {partnership.status}
            </Badge>
            <div className="flex items-center text-sm text-gray-500">
              <Shield className="w-3 h-3 mr-1" />
              {partnership.privacy_settings.notification_level} privacy
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center">
            <Heart className="w-6 h-6 mr-2 text-red-500" />
            Accountability Partners
          </h1>
          <p className="text-gray-600">Build supportive recovery partnerships with encrypted privacy</p>
        </div>
        
        <Button 
          onClick={() => setShowRequestForm(true)}
          className="flex items-center"
        >
          <Users className="w-4 h-4 mr-2" />
          Find Partner
        </Button>
      </div>

      {partnerships.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Accountability Partners Yet</h3>
            <p className="text-gray-600 mb-6">
              Connect with a recovery partner for mutual support and encouragement
            </p>
            <Button onClick={() => setShowRequestForm(true)}>
              <Users className="w-4 h-4 mr-2" />
              Find Your First Partner
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Partnerships List */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center">
              <Users className="w-4 h-4 mr-2" />
              Your Partnerships ({partnerships.length})
            </h3>
            
            {partnerships.map(renderPartnershipCard)}
          </div>

          {/* Partnership Details */}
          <div className="lg:col-span-2">
            {selectedPartnership && (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="checkin">Check-In</TabsTrigger>
                  <TabsTrigger value="notifications">
                    <Bell className="w-4 h-4 mr-1" />
                    Alerts
                  </TabsTrigger>
                  <TabsTrigger value="agreement">Agreement</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                  <PartnershipOverview partnership={selectedPartnership} />
                </TabsContent>

                <TabsContent value="checkin">
                  <CheckInForm 
                    partnership={selectedPartnership} 
                    onCheckInComplete={loadPartnerships}
                  />
                </TabsContent>

                <TabsContent value="notifications">
                  <PartnershipNotifications partnership={selectedPartnership} />
                </TabsContent>

                <TabsContent value="agreement">
                  <SupportAgreementViewer partnership={selectedPartnership} />
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      )}

      {/* Partnership Request Form Modal */}
      {showRequestForm && (
        <PartnershipRequestForm
          onClose={() => setShowRequestForm(false)}
          onSubmit={() => {
            setShowRequestForm(false);
            loadPartnerships();
          }}
        />
      )}
    </div>
  );
};

// Partnership Overview Component
const PartnershipOverview: React.FC<{ partnership: AccountabilityPartnership }> = ({ partnership }) => {
  const [streak, setStreak] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    loadStreak();
  }, [partnership]);

  const loadStreak = async () => {
    if (!user) return;
    
    try {
      const streakCount = await AccountabilityService.calculatePartnershipStreak(
        partnership.id, 
        user.id
      );
      setStreak(streakCount);
    } catch (error) {
      console.error('Error loading streak:', error);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Partnership Stats
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{streak}</div>
              <div className="text-sm text-gray-600">Day Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.floor((Date.now() - new Date(partnership.created_at).getTime()) / (1000 * 60 * 60 * 24))}
              </div>
              <div className="text-sm text-gray-600">Days Together</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {partnership.privacy_settings.notification_level === 'detailed' ? 'High' : 
                 partnership.privacy_settings.notification_level === 'summary' ? 'Medium' : 'Low'}
              </div>
              <div className="text-sm text-gray-600">Privacy Level</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {Object.keys(partnership.check_in_schedule).length || 1}
              </div>
              <div className="text-sm text-gray-600">Check-ins/Day</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2 text-blue-600" />
            Privacy Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Share Mood</span>
              <Badge variant={partnership.privacy_settings.share_mood ? 'default' : 'secondary'}>
                {partnership.privacy_settings.share_mood ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Share Progress</span>
              <Badge variant={partnership.privacy_settings.share_progress ? 'default' : 'secondary'}>
                {partnership.privacy_settings.share_progress ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Share Goals</span>
              <Badge variant={partnership.privacy_settings.share_goals ? 'default' : 'secondary'}>
                {partnership.privacy_settings.share_goals ? 'Yes' : 'No'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Share Streaks</span>
              <Badge variant={partnership.privacy_settings.share_streaks ? 'default' : 'secondary'}>
                {partnership.privacy_settings.share_streaks ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-orange-600" />
            Check-In Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {partnership.check_in_schedule.daily_times ? (
              partnership.check_in_schedule.daily_times.map((time: string, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="flex items-center">
                    <Clock className="w-4 h-4 mr-2 text-gray-600" />
                    Daily Check-in
                  </span>
                  <Badge variant="outline">{time}</Badge>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-gray-600" />
                  Flexible Schedule
                </span>
                <Badge variant="outline">As needed</Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountabilityPartnerDashboard;