
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, X } from 'lucide-react';

interface NotificationBannerProps {
  onEnable: () => void;
  onDismiss: () => void;
}

export default function NotificationBanner({ onEnable, onDismiss }: NotificationBannerProps) {
  return (
    <div className="bg-[#1E3A8A] text-white p-4 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-[#10B981]" />
        <div>
          <p className="font-medium">Stay connected to your recovery</p>
          <p className="text-sm text-blue-100">Enable notifications for gentle daily reminders</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onEnable}
          className="text-white hover:bg-blue-800 hover:text-white"
        >
          Enable Now
        </Button>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={onDismiss}
          className="text-white hover:bg-blue-800 hover:text-white p-1"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
