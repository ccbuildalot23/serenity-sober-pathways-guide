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
  Filter,
  Sparkles,
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
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-lg">
          <CalendarIcon className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            Recovery Calendar
            <Sparkles className="h-5 w-5 text-yellow-500" />
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Track your progress, celebrate your journey</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onToggleFilters}
          variant="outline"
          size="sm"
          className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
        >
          <Filter className="h-4 w-4 mr-2" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Progress
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-white dark:bg-gray-800 border shadow-lg">
            <DropdownMenuItem
              onClick={() => onExport('csv')}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileText className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onExport('json')}
              className="hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <FileJson className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default CalendarHeader;
