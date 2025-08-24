
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Heart, Phone, BookOpen } from 'lucide-react';

interface NotificationPreviewProps {
  onEnable: () => void;
  onSkip: () => void;
}

export default function NotificationPreview({ onEnable, onSkip }: NotificationPreviewProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="p-8 bg-white rounded-lg max-w-md mx-auto text-center shadow-xl">
        <div className="mb-6">
          <Bell className="w-16 h-16 text-[#1E3A8A] mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#1E3A8A] mb-2">Stay Encouraged—Your Way</h1>
          <p className="text-gray-600 text-sm">Get gentle reminders to support your recovery journey</p>
        </div>
        
        <ul className="text-left mb-6 space-y-3">
          <li className="flex items-center text-[#1E3A8A]">
            <Heart className="w-4 h-4 mr-3 text-[#10B981]" />
            Daily check‑in reminders
          </li>
          <li className="flex items-center text-[#1E3A8A]">
            <BookOpen className="w-4 h-4 mr-3 text-[#10B981]" />
            Motivational affirmations
          </li>
          <li className="flex items-center text-[#1E3A8A]">
            <Phone className="w-4 h-4 mr-3 text-[#10B981]" />
            Support call prompts
          </li>
          <li className="flex items-center text-[#1E3A8A]">
            <Bell className="w-4 h-4 mr-3 text-[#10B981]" />
            Spiritual principles
          </li>
        </ul>
        
        <div className="flex justify-center gap-4">
          <Button 
            variant="outline" 
            className="border-[#1E3A8A] text-[#1E3A8A] hover:bg-[#1E3A8A] hover:text-white" 
            onClick={onSkip}
          >
            Skip for now
          </Button>
          <Button 
            className="bg-[#10B981] text-white hover:bg-emerald-600" 
            onClick={onEnable}
          >
            Enable Notifications
          </Button>
        </div>
      </div>
    </div>
  );
}
