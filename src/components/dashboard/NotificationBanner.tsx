
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';
import { notificationPermissionService } from '@/services/notificationPermissionService';

interface NotificationBannerProps {
  onDismiss: () => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({ onDismiss }) => {
  const handleDismiss = () => {
    notificationPermissionService.dismissBanner();
    onDismiss();
  };

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                Enable Notifications
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Receive reminders and crisis alerts to support your recovery journey
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900"
            aria-label="Dismiss notification banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
