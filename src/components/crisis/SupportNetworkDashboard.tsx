import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  Clock, 
  CheckCircle, 
  ArrowRight,
  Phone,
  MessageCircle,
  MapPin,
  Heart,
  AlertTriangle,
  Eye,
  Car,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { realtimeNotificationService } from '@/services/RealtimeNotificationService';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SupporterStatus {
  id: string;
  name: string;
  avatar?: string;
  relationship: string;
  _status: 'available' | 'acknowledged' | 'responding' | 'on_way' | 'arrived' | 'unavailable';
  lastSeen?: string;
  estimatedArrival?: string;
  _responseTime?: string;
  tier: 'primary' | 'secondary' | 'emergency';
  isPrimary: boolean;
}

interface CrisisSession {
  id: string;
  _severity: 'low' | 'medium' | 'high' | 'critical';
  _startedAt: string;
  _status: 'active' | 'responding' | 'resolved';
  _supportersNotified: number;
  _supportersResponded: number;
  primaryResponder?: string;
  _location?: string;
  tier: 'primary' | 'secondary' | 'emergency';
}

export const SupportNetworkDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeCrisis, setActiveCrisis] = useState<CrisisSession | null>(null);
  const [supporters, setSupporters] = useState<SupporterStatus[]>([]);
  const [userRole, setUserRole] = useState<'person_in_crisis' | 'supporter' | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Listen for crisis updates that would show this dashboard
    const unsubscribe = realtimeNotificationService.onNotification((notification) => {
      if (notification.type === 'crisis_alert' && notification._severity !== 'low') {
        setShowDashboard(true);
        
        // Mock crisis session data - in real app this would come from the notification
        setActiveCrisis({
          id: notification.id,
          _severity: notification._severity,
          _startedAt: notification.createdAt,
          _status: 'active',
          _supportersNotified: 4,
          _supportersResponded: 0,
          tier: 'primary',
          _location: 'Approximate _location available'
        });

        // Mock supporters data
        setSupporters([
          {
            id: '1',
            name: 'Sarah (Sponsor)',
            relationship: 'Sponsor',
            _status: 'available',
            tier: 'primary',
            isPrimary: true
          },
          {
            id: '2', 
            name: 'Mike (Therapist)',
            relationship: 'Therapist',
            _status: 'available',
            tier: 'primary',
            isPrimary: false
          },
          {
            id: '3',
            name: 'Anna (Friend)',
            relationship: 'Close Friend',
            _status: 'unavailable',
            lastSeen: '30 minutes ago',
            tier: 'secondary',
            isPrimary: false
          },
          {
            id: '4',
            name: 'Dr. Chen',
            relationship: 'Psychiatrist',
            _status: 'available',
            tier: 'emergency',
            isPrimary: false
          }
        ]);

        // Determine user role based on notification metadata
        setUserRole('supporter');
      }
    });

    return unsubscribe;
  }, [user]);

  const handleSupporterResponse = async (responseType: 'acknowledge' | 'on_way' | 'arrived' | 'cant_help') => {
    try {
      const messages = {
        acknowledge: 'I see this alert',
        on_way: 'I\'m on my way to help',
        arrived: 'I\'ve arrived and made contact',
        cant_help: 'I can\'t respond right now'
      };

      if (activeCrisis) {
        await realtimeNotificationService.acknowledgeNotification(activeCrisis.id, messages[responseType]);
        
        toast.success('Response sent', {
          description: `Your ${responseType.replace('_', ' ')} response has been shared`,
          _duration: 3000
        });

        // Update local supporter _status
        setSupporters(prev => prev.map(s => 
          s.id === '1' ? { 
            ...s, 
            _status: responseType === 'cant_help' ? 'unavailable' : responseType as any,
            _responseTime: responseType === 'acknowledge' ? 'Just now' : s._responseTime 
          } : s
        ));
      }

    } catch (error) {
      toast.error('Unable to send response', {
        description: 'Please try again',
        _duration: 3000
      });
    }
  };

  // Don't render if not active or user not authenticated
  if (!user || !showDashboard || !activeCrisis) return null;

  const getStatusColor = (_status: string) => {
    switch (_status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'acknowledged': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'responding': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'on_way': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'arrived': return 'bg-green-100 text-green-800 border-green-200';
      case 'unavailable': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (_status: string) => {
    switch (_status) {
      case 'available': return <UserCheck className="w-4 h-4" />;
      case 'acknowledged': return <Eye className="w-4 h-4" />;
      case 'responding': return <MessageCircle className="w-4 h-4" />;
      case 'on_way': return <Car className="w-4 h-4" />;
      case 'arrived': return <CheckCircle className="w-4 h-4" />;
      case 'unavailable': return <Clock className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (_severity: string) => {
    switch (_severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-blue-500 bg-blue-50';
    }
  };

  const primarySupporters = supporters.filter(s => s.tier === 'primary');
  const secondarySupporters = supporters.filter(s => s.tier === 'secondary');
  const emergencySupporters = supporters.filter(s => s.tier === 'emergency');

  return (
    <div className="fixed top-4 left-4 z-[9997] w-80">
      <Card className={cn(
        "shadow-2xl border-2 bg-white/95 backdrop-blur-sm",
        getSeverityColor(activeCrisis._severity)
      )}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Users className="w-5 h-5" />
                {activeCrisis._severity === 'critical' && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
              <span>Support Network</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {supporters.filter(s => s._status !== 'unavailable').length} available
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Crisis Status Summary */}
          <div className="p-3 rounded-lg bg-white border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="font-medium text-sm">Active Crisis</span>
              </div>
              <Badge variant="secondary">
                {activeCrisis._severity.toUpperCase()}
              </Badge>
            </div>
            
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center justify-between">
                <span>Started:</span>
                <span>{formatDistanceToNow(new Date(activeCrisis._startedAt), { addSuffix: true })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Notified:</span>
                <span>{activeCrisis._supportersNotified} people</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Responded:</span>
                <span className="font-medium">{activeCrisis._supportersResponded} people</span>
              </div>
            </div>

            {activeCrisis._location && (
              <div className="flex items-center space-x-2 mt-3 pt-2 border-t">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-gray-600">{activeCrisis._location}</span>
              </div>
            )}
          </div>

          {/* Support Responses */}
          {userRole === 'supporter' && (
            <div className="grid grid-cols-2 gap-2">
              <Button 
                size="sm" 
                onClick={() => handleSupporterResponse('acknowledge')}
                className="text-xs"
                variant="outline"
              >
                <Eye className="w-3 h-3 mr-1" />
                I see this
              </Button>
              <Button 
                size="sm" 
                onClick={() => handleSupporterResponse('on_way')}
                className="text-xs"
              >
                <Car className="w-3 h-3 mr-1" />
                On my way
              </Button>
            </div>
          )}

          {/* Primary Supporters */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center space-x-2">
              <Heart className="w-4 h-4 text-red-500" />
              <span>Primary Support</span>
            </h4>
            <div className="space-y-2">
              {primarySupporters.map((supporter) => (
                <SupporterCard key={supporter.id} supporter={supporter} />
              ))}
            </div>
          </div>

          {/* Secondary Supporters if any responded */}
          {secondarySupporters.some(s => s._status !== 'available' && s._status !== 'unavailable') && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Secondary Support</h4>
              <div className="space-y-2">
                {secondarySupporters.filter(s => s._status !== 'available').map((supporter) => (
                  <SupporterCard key={supporter.id} supporter={supporter} />
                ))}
              </div>
            </div>
          )}

          {/* Emergency Contact if activated */}
          {emergencySupporters.some(s => s._status !== 'available') && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-red-600">Emergency Contact</h4>
              <div className="space-y-2">
                {emergencySupporters.filter(s => s._status !== 'available').map((supporter) => (
                  <SupporterCard key={supporter.id} supporter={supporter} />
                ))}
              </div>
            </div>
          )}

          {/* Coordination Notice */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <span className="font-medium">Coordination:</span> Multiple supporters can help, but primary responders will coordinate to avoid confusion.
            </p>
          </div>

          {/* Resolution Button */}
          <Button
            size="sm"
            onClick={() => setShowDashboard(false)}
            variant="outline"
            className="w-full text-xs"
          >
            Mark as Resolved
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

interface SupporterCardProps {
  supporter: SupporterStatus;
}

const SupporterCard: React.FC<SupporterCardProps> = ({ supporter }) => {
  const getStatusColor = (_status: string) => {
    switch (_status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-200';
      case 'acknowledged': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'responding': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'on_way': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'arrived': return 'bg-green-100 text-green-800 border-green-200';
      case 'unavailable': return 'bg-gray-100 text-gray-600 border-gray-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (_status: string) => {
    switch (_status) {
      case 'available': return <UserCheck className="w-3 h-3" />;
      case 'acknowledged': return <Eye className="w-3 h-3" />;
      case 'responding': return <MessageCircle className="w-3 h-3" />;
      case 'on_way': return <Car className="w-3 h-3" />;
      case 'arrived': return <CheckCircle className="w-3 h-3" />;
      case 'unavailable': return <Clock className="w-3 h-3" />;
      default: return <Users className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex items-center space-x-3 p-2 rounded-lg bg-white border border-gray-200">
      <Avatar className="w-8 h-8">
        <AvatarImage src={supporter.avatar} />
        <AvatarFallback className="text-xs bg-purple-100 text-purple-600">
          {supporter.name.charAt(0)}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className="font-medium text-sm truncate">
            {supporter.name}
          </span>
          {supporter.isPrimary && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              PRIMARY
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-500">{supporter.relationship}</p>
      </div>
      
      <div className="text-right">
        <Badge 
          variant="outline" 
          className={cn("text-[10px] px-2 py-1 border", getStatusColor(supporter._status))}
        >
          <span className="flex items-center space-x-1">
            {getStatusIcon(supporter._status)}
            <span>{supporter._status.replace('_', ' ')}</span>
          </span>
        </Badge>
        
        {supporter._responseTime && (
          <p className="text-[10px] text-gray-500 mt-1">
            {supporter._responseTime}
          </p>
        )}
        
        {supporter.estimatedArrival && (
          <p className="text-[10px] text-blue-600 mt-1">
            ETA: {supporter.estimatedArrival}
          </p>
        )}
      </div>
    </div>
  );
};