import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellRing, Wifi, WifiOff } from 'lucide-react';
import { useCrisisNotifications } from '@/hooks/useCrisisNotifications';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';

interface CrisisNotificationBellProps {
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export const CrisisNotificationBell: React.FC<CrisisNotificationBellProps> = ({
  className,
  size = 'default'
}) => {
  const {
    notifications,
    unreadCount,
    activeCrisisCount,
    connectionStatus,
    markAsRead,
    acknowledge,
    dismiss
  } = useCrisisNotifications();

  const [isOpen, setIsOpen] = useState(false);

  const getButtonSize = () => {
    switch (size) {
      case 'sm': return 'h-8 w-8';
      case 'lg': return 'h-12 w-12';
      default: return 'h-10 w-10';
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'lg': return 'w-6 h-6';
      default: return 'w-5 h-5';
    }
  };

  const recentNotifications = notifications.slice(0, 5);
  const hasCriticalAlerts = notifications.some(n => n.severity === 'critical' && !n.metadata?.isRead);
  const hasActiveNotifications = unreadCount > 0 || activeCrisisCount > 0;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            getButtonSize(),
            "relative",
            hasActiveNotifications && "text-orange-600 hover:text-orange-700",
            hasCriticalAlerts && "text-red-600 hover:text-red-700",
            className
          )}
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          {hasActiveNotifications ? (
            <BellRing className={cn(getIconSize(), hasCriticalAlerts && "animate-pulse")} />
          ) : (
            <Bell className={getIconSize()} />
          )}
          
          {/* Notification badge */}
          {unreadCount > 0 && (
            <Badge 
              variant={hasCriticalAlerts ? "destructive" : "default"}
              className={cn(
                "absolute -top-1 -right-1 text-xs min-w-[1.5rem] h-5 flex items-center justify-center",
                size === 'sm' && "text-[10px] min-w-[1.25rem] h-4",
                size === 'lg' && "text-sm min-w-[1.75rem] h-6"
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
          
          {/* Connection status indicator */}
          <div className={cn(
            "absolute -bottom-1 -right-1 w-3 h-3 rounded-full border border-white",
            connectionStatus.connected ? "bg-green-500" : "bg-red-500",
            size === 'sm' && "w-2 h-2",
            size === 'lg' && "w-4 h-4"
          )} />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80" sideOffset={8}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          <div className="flex items-center space-x-2">
            {connectionStatus.connected ? (
              <div className="flex items-center space-x-1 text-green-600">
                <Wifi className="w-3 h-3" />
                <span className="text-xs">Connected</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-red-600">
                <WifiOff className="w-3 h-3" />
                <span className="text-xs">Offline</span>
              </div>
            )}
          </div>
        </div>

        {/* Active crisis summary */}
        {activeCrisisCount > 0 && (
          <>
            <div className="p-3 bg-red-50 border-b">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-800">
                  {activeCrisisCount} active crisis {activeCrisisCount === 1 ? 'alert' : 'alerts'}
                </span>
              </div>
            </div>
          </>
        )}

        {/* Notifications list */}
        {recentNotifications.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {recentNotifications.map((notification, index) => (
              <div key={notification.id}>
                <DropdownMenuItem
                  className={cn(
                    "p-3 flex items-start space-x-3 cursor-pointer",
                    !notification.metadata?.isRead && "bg-blue-50",
                    notification.severity === 'critical' && "bg-red-50 border-l-4 border-l-red-500"
                  )}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!notification.metadata?.isRead) {
                      markAsRead(notification.id);
                    }
                  }}
                >
                  <div className="w-2 h-2 rounded-full mt-2 bg-blue-500" 
                       style={{
                         backgroundColor: 
                           notification.severity === 'critical' ? 'rgb(239 68 68)' :
                           notification.severity === 'high' ? 'rgb(249 115 22)' :
                           notification.severity === 'medium' ? 'rgb(234 179 8)' :
                           'rgb(59 130 246)'
                       }} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium text-sm leading-tight truncate">
                        {notification.title}
                      </h4>
                      <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mt-1 leading-relaxed line-clamp-2">
                      {notification.message}
                    </p>
                    
                    {/* Quick actions for unread notifications */}
                    {!notification.metadata?.isRead && notification.actions && (
                      <div className="flex items-center space-x-2 mt-2">
                        {notification.actions.slice(0, 2).map((action) => (
                          <Button
                            key={action.id}
                            size="sm"
                            variant="outline"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                if (action.type === 'acknowledge') {
                                  await acknowledge(notification.id, action.label);
                                } else if (action.type === 'dismiss') {
                                  dismiss(notification.id);
                                }
                                setIsOpen(false);
                              } catch (error) {
                                // Error handling is done in the hook
                              }
                            }}
                            className="h-6 px-2 text-xs"
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </DropdownMenuItem>
                
                {index < recentNotifications.length - 1 && <DropdownMenuSeparator />}
              </div>
            ))}
          </div>
        )}

        {/* Footer actions */}
        {notifications.length > 5 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="p-3 text-center text-sm text-gray-600">
              Showing 5 of {notifications.length} notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};