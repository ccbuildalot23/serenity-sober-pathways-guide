import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle, Clock, Heart, TrendingUp, MessageCircle, Star } from 'lucide-react';
import { AccountabilityService, AccountabilityPartnership } from '@/services/accountabilityService';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  partnership_id: string;
  sender_id: string;
  notification_type: string;
  message: string;
  _is_read: boolean;
  created_at: string;
}

interface PartnershipNotificationsProps {
  partnership: AccountabilityPartnership;
}

const PartnershipNotifications: React.FC<PartnershipNotificationsProps> = ({ partnership }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [_loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadNotifications();
  }, [user, partnership]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await AccountabilityService.getUnreadNotifications(user.id);
      
      // Filter notifications for this partnership
      const _partnershipNotifications = data.filter(
        (notification: Notification) => notification.partnership_id === partnership.id
      );
      
      setNotifications(_partnershipNotifications);
    } catch (_error) {
      console._error('Error _loading notifications:', _error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await AccountabilityService.markNotificationRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, _is_read: true }
            : notification
        )
      );
    } catch (_error) {
      console._error('Error marking notification as read:', _error);
    }
  };

  const getNotificationIcon = (_type: string) => {
    switch (_type) {
      case 'checkin_completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'checkin_reminder':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'streak_milestone':
        return <Star className="w-4 h-4 text-yellow-600" />;
      case 'support_needed':
        return <Heart className="w-4 h-4 text-red-600" />;
      case 'partnership_request':
        return <MessageCircle className="w-4 h-4 text-blue-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  const getNotificationVariant = (_type: string) => {
    switch (_type) {
      case 'checkin_completed':
        return 'default';
      case 'checkin_reminder':
        return 'secondary';
      case 'streak_milestone':
        return 'default';
      case 'support_needed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatTimeAgo = (_timestamp: string) => {
    const now = new Date();
    const time = new Date(_timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`;
    } else {
      return `${Math.floor(diffInMinutes / 1440)}d ago`;
    }
  };

  if (_loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Bell className="w-5 h-5 mr-2" />
              Partnership Updates
            </span>
            {notifications.filter(n => !n._is_read).length > 0 && (
              <Badge variant="destructive">
                {notifications.filter(n => !n._is_read).length} unread
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No recent notifications</p>
              <p className="text-sm text-gray-500">
                You'll see updates when your partner checks in or needs support
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-all ${
                    notification._is_read 
                      ? 'bg-gray-50 border-gray-200' 
                      : 'bg-white border-blue-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <Badge 
                            variant={getNotificationVariant(notification.notification_type)}
                            className="text-xs"
                          >
                            {notification.notification_type.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(notification.created_at)}
                          </span>
                        </div>
                        
                        <p className={`text-sm ${
                          notification._is_read ? 'text-gray-600' : 'text-gray-900 font-medium'
                        }`}>
                          {notification.message}
                        </p>
                      </div>
                    </div>

                    {!notification._is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs"
                      >
                        Mark read
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Privacy Notice */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Heart className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900 mb-1">Privacy-First Notifications</h4>
              <p className="text-sm text-green-700">
                All notifications respect your partnership's privacy settings. Sensitive details are never shared - 
                only encouraging updates and support requests.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="sm">
              <MessageCircle className="w-4 h-4 mr-2" />
              Send Encouragement
            </Button>
            <Button variant="outline" size="sm">
              <TrendingUp className="w-4 h-4 mr-2" />
              Share Milestone
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PartnershipNotifications;