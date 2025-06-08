
import React from 'react';
import { Download, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CalendarHeaderProps {
  onExport: () => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({ onExport }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CalendarIcon className="w-6 h-6 text-blue-900" />
        <h1 className="text-2xl font-bold text-blue-900">Recovery Calendar</h1>
      </div>
      <Button onClick={onExport} variant="outline" className="flex items-center gap-2">
        <Download className="w-4 h-4" />
        Export Report
      </Button>
    </div>
  );
};

export default CalendarHeader;
