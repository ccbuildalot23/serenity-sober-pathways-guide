import React, { useState } from 'react';
import { Bell, Check, CheckCheck, Settings, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useRecoveryNotifications } from '@/hooks/useRecoveryNotifications';
import { RecoveryNotification } from '@/services/recoveryNotificationService';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { NotificationPreferences } from './NotificationPreferences';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    _loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    snoozeNotification,
  } = useRecoveryNotifications();

  const [showPreferences, setShowPreferences] = useState(false);

  const getPriorityColor = (_priority: RecoveryNotification['_priority']) => {
    switch (_priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'secondary';
      case 'normal': return 'outline';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getNotificationIcon = (_type: RecoveryNotification['notification_type']) => {
    switch (_type) {
      case 'goal_due_reminder':
      case 'goal_overdue':
        return '⏰';
      case 'milestone_achieved':
      case 'goal_completed':
        return '🎉';
      case 'streak_milestone':
        return '🔥';
      case 'provider_feedback':
        return '💬';
      case 'progress_encouragement':
        return '💪';
      case 'weekly_summary':
        return '📊';
      case 'achievement_badge':
        return '🏆';
      default:
        return '📢';
    }
  };

  const handleSnooze = async (_notificationId: string, _minutes: number) => {
    try {
      await snoozeNotification(_notificationId, _minutes);
    } catch (_error) {
      console._error('Error snoozing notification:', _error);
    }
  };

  if (_loading) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Loading notifications...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Mark all read
              </Button>
            )}
            <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Notification Preferences</DialogTitle>
                </DialogHeader>
                <NotificationPreferences onClose={() => setShowPreferences(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-96">
          {notifications.length === 0 ? (
            <div className="text-center py-8 px-4 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No notifications yet</p>
              <p className="text-sm">You'll see your recovery updates here</p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification, _index) => (
                <div key={notification.id}>
                  <div
                    className={`p-4 hover:bg-muted/50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-xl mt-0.5">
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-medium text-sm leading-tight">
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-1">
                            <Badge 
                              variant={getPriorityColor(notification._priority)} 
                              className="text-xs"
                            >
                              {notification._priority}
                            </Badge>
                            
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                  <span className="text-xs">⋯</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!notification.is_read && (
                                  <DropdownMenuItem onClick={() => markAsRead(notification.id)}>
                                    <Check className="w-4 h-4 mr-2" />
                                    Mark as read
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleSnooze(notification.id, 30)}>
                                  <Clock className="w-4 h-4 mr-2" />
                                  Snooze 30min
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSnooze(notification.id, 60)}>
                                  <Clock className="w-4 h-4 mr-2" />
                                  Snooze 1hr
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSnooze(notification.id, 240)}>
                                  <Clock className="w-4 h-4 mr-2" />
                                  Snooze 4hrs
                                </DropdownMenuItem>
                                <Separator />
                                <DropdownMenuItem 
                                  onClick={() => deleteNotification(notification.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          
                          {!notification.is_read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(notification.id)}
                              className="h-6 px-2 text-xs"
                            >
                              <Check className="w-3 h-3 mr-1" />
                              Mark read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {_index < notifications.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}