
import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Calendar as CalendarIcon, 
  Download, 
  FileText, 
  FileJson,
  Filter
} from 'lucide-react';

interface CalendarHeaderProps {
  showFilters: boolean;
  onToggleFilters: () => void;
  onExport: (format: 'csv' | 'json') => void;
}

const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  showFilters,
  onToggleFilters,
  onExport,
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-2">
        <CalendarIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Enhanced Mood Calendar</h1>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          onClick={onToggleFilters} 
          variant="outline" 
          size="sm"
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white border shadow-lg">
            <DropdownMenuItem onClick={() => onExport('csv')}>
              <FileText className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('json')}>
              <FileJson className="h-4 w-4 mr-2" />
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default CalendarHeader;
