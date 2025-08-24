import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Heart, 
  Clock, 
  Users, 
  ChevronDown, 
  ChevronUp,
  Phone,
  MessageCircle,
  AlertTriangle,
  Check,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { realtimeNotificationService, NotificationPayload } from '@/services/RealtimeNotificationService';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const NotificationPanel: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [connectionStatus, _setConnectionStatus] = useState(
    realtimeNotificationService.getConnectionStatus()
  );

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time notifications
    const unsubscribeNotifications = realtimeNotificationService.onNotification((notification) => {
      setNotifications(prev => {
        // Avoid duplicates and limit to 10 most recent
        const filtered = prev.filter(n => n.id !== notification.id);
        return [notification, ...filtered].slice(0, 10);
      });

      // Auto-expand for critical notifications
      if (notification._severity === 'critical') {
        setIsExpanded(true);
      }
    });

    // Subscribe to connection status
    const unsubscribeConnection = realtimeNotificationService.onConnectionStatus(_setConnectionStatus);

    return () => {
      unsubscribeNotifications();
      unsubscribeConnection();
    };
  }, [user]);

  const handleNotificationAction = async (_notificationId: string, _action: string) => {
    try {
      switch (_action) {
        case 'acknowledge':
          await realtimeNotificationService.acknowledgeNotification(_notificationId, 'I see this');
          toast.success('Response sent', {
            description: 'The person knows you\'ve seen their alert',
            _duration: 3000
          });
          break;
        case 'respond':
          await realtimeNotificationService.acknowledgeNotification(_notificationId, 'I can help - on my way');
          toast.success('Response sent', {
            description: 'You\'ve indicated you can help',
            _duration: 3000
          });
          break;
        case 'escalate':
          // Handle escalation logic
          toast.info('Escalating...', {
            description: 'Getting additional support',
            _duration: 3000
          });
          break;
        case 'dismiss':
          // Remove from local state
          setNotifications(prev => prev.filter(n => n.id !== _notificationId));
          break;
      }

      // Mark as read
      await realtimeNotificationService.markNotificationRead(_notificationId);

    } catch (error) {
      console.error('Error handling notification _action:', error);
      toast.error('Error', {
        description: 'Unable to send response. Please try again.',
        _duration: 5000
      });
    }
  };

  const getSeverityColor = (_severity: string) => {
    switch (_severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTypeIcon = (_type: string) => {
    switch (_type) {
      case 'crisis_alert': return <AlertTriangle className="w-4 h-4" />;
      case 'supporter_response': return <MessageCircle className="w-4 h-4" />;
      case 'escalation': return <Phone className="w-4 h-4" />;
      case 'resolution': return <Check className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  // Don't render if no notifications or user not authenticated
  if (!user || notifications.length === 0) return null;

  const criticalNotifications = notifications.filter(n => n._severity === 'critical');
  const otherNotifications = notifications.filter(n => n._severity !== 'critical');

  return (
    <div className="fixed top-4 right-4 z-[9998] w-96 max-h-[80vh]">
      <Card className="shadow-2xl border-2 bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <div className="relative">
                <Bell className="w-5 h-5" />
                {criticalNotifications.length > 0 && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </div>
              <span>Active Alerts</span>
              {notifications.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {notifications.length}
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center space-x-2">
              {/* Connection status indicator */}
              <div className={cn(
                "w-2 h-2 rounded-full",
                connectionStatus.connected ? "bg-green-500" : "bg-red-500"
              )} />
              
              {/* Expand/collapse button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1"
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className="pt-0">
            <ScrollArea className="max-h-96">
              <div className="space-y-3">
                {/* Critical notifications first */}
                {criticalNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onAction={handleNotificationAction}
                    isUrgent={true}
                  />
                ))}

                {/* Separator if both types exist */}
                {criticalNotifications.length > 0 && otherNotifications.length > 0 && (
                  <Separator className="my-4" />
                )}

                {/* Other notifications */}
                {otherNotifications.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    onAction={handleNotificationAction}
                    isUrgent={false}
                  />
                ))}
              </div>
            </ScrollArea>

            {!connectionStatus.connected && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">Connection issue</span>
                  <br />
                  Some alerts may be delayed
                </p>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
};

interface NotificationCardProps {
  notification: NotificationPayload;
  onAction: (id: string, _action: string) => void;
  isUrgent: boolean;
}

const NotificationCard: React.FC<NotificationCardProps> = ({ 
  notification, 
  onAction, 
  isUrgent 
}) => {
  const getSeverityColor = (_severity: string) => {
    switch (_severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getTypeIcon = (_type: string) => {
    switch (_type) {
      case 'crisis_alert': return <AlertTriangle className="w-4 h-4" />;
      case 'supporter_response': return <MessageCircle className="w-4 h-4" />;
      case 'escalation': return <Phone className="w-4 h-4" />;
      case 'resolution': return <Check className="w-4 h-4" />;
      default: return <Bell className="w-4 h-4" />;
    }
  };

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-all _duration-200",
      isUrgent 
        ? "bg-red-50 border-red-200 shadow-lg ring-2 ring-red-300/50" 
        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
    )}>
      <div className="flex items-start space-x-3">
        <div className="mt-0.5">
          {getTypeIcon(notification._type)}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-sm leading-tight">
              {notification.title}
            </h4>
            <Badge 
              className={cn("text-xs px-2 py-0.5", getSeverityColor(notification._severity))}
            >
              {notification._severity}
            </Badge>
          </div>
          
          <p className="text-sm text-gray-600 mb-3 leading-relaxed">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
            
            {notification.actions && notification.actions.length > 0 && (
              <div className="flex items-center space-x-2">
                {notification.actions.map((_action) => (
                  <Button
                    key={_action.id}
                    size="sm"
                    variant={_action.primary ? "default" : "outline"}
                    onClick={() => onAction(notification.id, _action._type)}
                    className={cn(
                      "h-7 px-3 text-xs",
                      _action.destructive && "text-red-600 hover:text-red-700"
                    )}
                  >
                    {_action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};