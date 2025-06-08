
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CalendarDays, Heart } from 'lucide-react';

export const QuickActions: React.FC = () => {
  return (
    <div className="grid grid-cols-2 gap-4">
      <Button 
        variant="outline" 
        className="h-16 border-2 border-[#1E3A8A] text-[#1E3A8A] hover:bg-blue-50"
        asChild
      >
        <Link to="/calendar">
          <CalendarDays className="mr-2 h-5 w-5" />
          View Calendar
        </Link>
      </Button>
      <Button 
        variant="outline" 
        className="h-16 border-2 border-[#10B981] text-[#10B981] hover:bg-green-50"
        asChild
      >
        <Link to="/checkin">
          <Heart className="mr-2 h-5 w-5" />
          Full Check-in
        </Link>
      </Button>
    </div>
  );
};
