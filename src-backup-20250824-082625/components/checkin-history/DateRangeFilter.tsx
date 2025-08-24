import React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
  value: {
    start: Date;
    end: Date;
    preset: '7d' | '30d' | '90d' | 'custom';
  };
  onChange: (dateRange: unknown) => void;
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ value, onChange }) => {
  const handlePresetChange = (preset: '7d' | '30d' | '90d') => {
    const end = new Date();
    const start = new Date();
    
    switch (preset) {
      case '7d':
        start.setDate(end.getDate() - 7);
        break;
      case '30d':
        start.setDate(end.getDate() - 30);
        break;
      case '90d':
        start.setDate(end.getDate() - 90);
        break;
    }
    
    onChange({ start, end, preset });
  };

  const handleCustomDate = (date: Date | undefined, type: 'start' | 'end') => {
    if (!date) return;
    
    const _newRange = {
      ...value,
      [type]: date,
      preset: 'custom' as const
    };
    
    onChange(_newRange);
  };

  const presets = [
    { label: '7 Days', value: '7d' as const },
    { label: '30 Days', value: '30d' as const },
    { label: '90 Days', value: '90d' as const }
  ];

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Date Range</label>
      
      {/* Preset Buttons */}
      <div className="flex gap-2">
        {presets.map(({ label, value: _presetValue }) => (
          <Button
            key={_presetValue}
            variant={value.preset === _presetValue ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePresetChange(_presetValue)}
          >
            {label}
          </Button>
        ))}
      </div>

      {/* Custom Date Range */}
      <div className="flex gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full justify-start text-left font-normal",
                !value.start && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.start ? format(value.start, "MMM d, yyyy") : "Start date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value.start}
              onSelect={(date) => handleCustomDate(date, 'start')}
              disabled={(date) => date > new Date() || date < new Date("2020-01-01")}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full justify-start text-left font-normal",
                !value.end && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.end ? format(value.end, "MMM d, yyyy") : "End date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value.end}
              onSelect={(date) => handleCustomDate(date, 'end')}
              disabled={(date) => date > new Date() || date < value.start}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};