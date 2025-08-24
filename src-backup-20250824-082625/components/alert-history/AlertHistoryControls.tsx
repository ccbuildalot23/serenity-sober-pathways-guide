
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AlertHistoryControlsProps {
  groupBy: 'none' | 'timeOfDay' | 'dayOfWeek';
  onGroupByChange: (value: 'none' | 'timeOfDay' | 'dayOfWeek') => void;
}

const AlertHistoryControls: React.FC<AlertHistoryControlsProps> = ({
  groupBy,
  onGroupByChange
}) => {
  return (
    <div className="flex flex-wrap gap-4">
      <Select value={groupBy} onValueChange={onGroupByChange}>
        <SelectTrigger className="w-48" aria-label="Group alerts">
          <SelectValue placeholder="Group by..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No grouping</SelectItem>
          <SelectItem value="timeOfDay">Time of day</SelectItem>
          <SelectItem value="dayOfWeek">Day of week</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default AlertHistoryControls;
