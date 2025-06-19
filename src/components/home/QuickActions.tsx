import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { CalendarDays, Heart } from 'lucide-react';

export const QuickActions: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Button
        variant="outline"
        className="h-16 btn-outline-navy focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        asChild
      >
        <Link to="/calendar" aria-label="View recovery calendar and check-in history">
          <CalendarDays className="mr-2 h-5 w-5" />
          View Calendar
        </Link>
      </Button>
      <Button
        variant="outline"
        className="h-16 btn-outline-emerald focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        asChild
      >
        <Link to="/checkin" aria-label="Complete detailed daily check-in assessment">
          <Heart className="mr-2 h-5 w-5" />
          Full Check-in
        </Link>
      </Button>
    </div>
  );
};

export default QuickActions;
