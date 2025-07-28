import React from 'react';
import { Users, Circle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useUserPresence } from '@/hooks/useUserPresence';
import { formatDistanceToNow } from 'date-fns';

interface OnlineUsersIndicatorProps {
  forumId?: string;
  showDetails?: boolean;
}

const OnlineUsersIndicator: React.FC<OnlineUsersIndicatorProps> = ({ 
  forumId, 
  showDetails = false 
}) => {
  const { onlineUsers, userCount } = useUserPresence(forumId);

  if (showDetails) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Online Now
          </CardTitle>
          <CardDescription>
            {userCount} {userCount === 1 ? 'person' : 'people'} currently active
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-2">
          {onlineUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one else is online right now</p>
          ) : (
            onlineUsers.slice(0, 10).map((presence) => (
              <div key={presence.id} className="flex items-center gap-2">
                <Circle 
                  className={`h-3 w-3 ${
                    presence.status === 'online' ? 'text-green-500 fill-green-500' :
                    presence.status === 'away' ? 'text-yellow-500 fill-yellow-500' :
                    'text-gray-500 fill-gray-500'
                  }`}
                />
                <span className="text-sm">Anonymous User</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(presence.last_seen), { addSuffix: true })}
                </span>
              </div>
            ))
          )}
          
          {onlineUsers.length > 10 && (
            <p className="text-xs text-muted-foreground">
              +{onlineUsers.length - 10} more online
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="flex items-center gap-1 cursor-help">
            <Circle className="h-2 w-2 text-green-500 fill-green-500" />
            <Users className="h-3 w-3" />
            {userCount}
          </Badge>
        </TooltipTrigger>
        
        <TooltipContent>
          <p>
            {userCount} {userCount === 1 ? 'person' : 'people'} online{forumId ? ' in this forum' : ''}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default OnlineUsersIndicator;