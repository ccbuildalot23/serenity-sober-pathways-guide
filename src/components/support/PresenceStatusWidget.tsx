import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Users, Settings, Clock, BellOff, Wifi, WifiOff } from 'lucide-react';
import { usePresenceManagement } from '@/hooks/useSupportNetwork';
import { NotificationPreferencesDialog } from './NotificationPreferencesDialog';

interface PresenceStatusWidgetProps {
  className?: string;
}

export const PresenceStatusWidget: React.FC<PresenceStatusWidgetProps> = ({ className = "" }) => {
  const { currentStatus, doNotDisturb, loading, updatePresence, toggleDoNotDisturb } = usePresenceManagement();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Wifi className="w-4 h-4" />;
      case 'away': return <Clock className="w-4 h-4" />;
      case 'busy': return <BellOff className="w-4 h-4" />;
      default: return <WifiOff className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'Online';
      case 'away': return 'Away';
      case 'busy': return 'Busy';
      default: return 'Offline';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            My Availability
          </div>
          <NotificationPreferencesDialog>
            <Button size="sm" variant="outline">
              <Settings className="w-4 h-4" />
            </Button>
          </NotificationPreferencesDialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status Display */}
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-4 h-4 rounded-full ${getStatusColor(currentStatus)}`}></div>
              {doNotDisturb && (
                <BellOff className="w-2 h-2 absolute -top-1 -right-1 text-gray-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {getStatusIcon(currentStatus)}
                <span className="font-medium">{getStatusText(currentStatus)}</span>
              </div>
              {doNotDisturb && (
                <p className="text-xs text-gray-600 dark:text-gray-400">Do not disturb active</p>
              )}
            </div>
          </div>
          <Badge variant={currentStatus === 'online' ? 'default' : 'secondary'}>
            {currentStatus === 'online' ? 'Available' : 'Away'}
          </Badge>
        </div>

        {/* Status Controls */}
        <div className="space-y-3">
          <div>
            <Label htmlFor="status-select">Status</Label>
            <Select 
              value={currentStatus} 
              onValueChange={(value: any) => updatePresence(value)}
              disabled={loading}
            >
              <SelectTrigger id="status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    Online
                  </div>
                </SelectItem>
                <SelectItem value="away">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    Away
                  </div>
                </SelectItem>
                <SelectItem value="busy">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    Busy
                  </div>
                </SelectItem>
                <SelectItem value="offline">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    Offline
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Do Not Disturb</Label>
              <p className="text-sm text-gray-600 dark:text-gray-400">Block all notifications temporarily</p>
            </div>
            <Switch
              checked={doNotDisturb}
              onCheckedChange={toggleDoNotDisturb}
              disabled={loading}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="pt-2 border-t">
          <div className="grid grid-cols-2 gap-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => updatePresence('online')}
              disabled={loading || currentStatus === 'online'}
            >
              Go Online
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => updatePresence('away')}
              disabled={loading || currentStatus === 'away'}
            >
              Set Away
            </Button>
          </div>
        </div>

        {/* Status Description */}
        <div className="text-xs text-gray-600 dark:text-gray-400 p-2 bg-blue-50 dark:bg-blue-950 rounded">
          <strong>Online:</strong> Available for support requests and alerts<br />
          <strong>Away:</strong> Limited availability, urgent alerts only<br />
          <strong>Busy:</strong> Emergency alerts only<br />
          <strong>Offline:</strong> No notifications except crisis alerts
        </div>
      </CardContent>
    </Card>
  );
};