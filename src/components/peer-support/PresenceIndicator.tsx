import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PresenceIndicatorProps {
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen?: string;
  customMessage?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PresenceIndicator: React.FC<PresenceIndicatorProps> = ({
  status,
  lastSeen,
  customMessage,
  showText = false,
  size = 'md',
  className
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'busy':
        return 'bg-red-500';
      case 'offline':
      default:
        return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online':
        return customMessage || 'Online';
      case 'away':
        return customMessage || 'Away';
      case 'busy':
        return customMessage || 'Busy';
      case 'offline':
      default:
        if (lastSeen) {
          const lastSeenDate = new Date(lastSeen);
          const now = new Date();
          const diffMinutes = Math.floor((now.getTime() - lastSeenDate.getTime()) / (1000 * 60));
          
          if (diffMinutes < 1) {
            return 'Just now';
          } else if (diffMinutes < 60) {
            return `${diffMinutes}m ago`;
          } else if (diffMinutes < 1440) {
            return `${Math.floor(diffMinutes / 60)}h ago`;
          } else {
            return `${Math.floor(diffMinutes / 1440)}d ago`;
          }
        }
        return 'Offline';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-2 h-2';
      case 'lg':
        return 'w-4 h-4';
      case 'md':
      default:
        return 'w-3 h-3';
    }
  };

  if (showText) {
    return (
      <Badge 
        variant={status === 'online' ? 'default' : 'secondary'}
        className={cn("flex items-center gap-1.5", className)}
      >
        <div className={cn(
          "rounded-full flex-shrink-0",
          getStatusColor(),
          getSizeClasses()
        )} />
        <span className="text-xs">{getStatusText()}</span>
      </Badge>
    );
  }

  return (
    <div 
      className={cn(
        "rounded-full border-2 border-white relative",
        getStatusColor(),
        getSizeClasses(),
        className
      )}
      title={getStatusText()}
    >
      {status === 'busy' && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-1 h-1 bg-white rounded-full" />
        </div>
      )}
    </div>
  );
};