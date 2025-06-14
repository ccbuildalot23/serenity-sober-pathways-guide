
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Calendar } from 'lucide-react';

interface CalendarHeaderProps {
  onExport: () => void;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({ onExport }) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Mood Calendar</h1>
      </div>
      <Button onClick={onExport} variant="outline" size="sm">
        <Download className="h-4 w-4 mr-2" />
        Export Month
      </Button>
    </div>
  );
};

export default CalendarHeader;
