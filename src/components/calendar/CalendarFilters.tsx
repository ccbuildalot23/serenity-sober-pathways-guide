
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Search, Filter } from 'lucide-react';

interface CalendarFiltersProps {
  filters: {
    minMood: number;
    maxMood: number;
    triggers: string[];
    searchTerm: string;
  };
  onFiltersChange: (filters: any) => void;
  availableTriggers: string[];
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  filters,
  onFiltersChange,
  availableTriggers,
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search notes & gratitude</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              id="search"
              type="text"
              placeholder="Search..."
              value={filters.searchTerm}
              onChange={(e) =>
                onFiltersChange({ ...filters, searchTerm: e.target.value })
              }
              className="pl-8"
            />
          </div>
        </div>

        {/* Mood Range */}
        <div className="space-y-2">
          <Label>Mood Range: {filters.minMood} - {filters.maxMood}</Label>
          <div className="px-2">
            <Slider
              value={[filters.minMood, filters.maxMood]}
              onValueChange={([min, max]) =>
                onFiltersChange({ ...filters, minMood: min, maxMood: max })
              }
              min={1}
              max={10}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Trigger Filter */}
        {availableTriggers.length > 0 && (
          <div className="space-y-2">
            <Label>Filter by triggers</Label>
            <div className="flex flex-wrap gap-2">
              {availableTriggers.map((trigger) => (
                <Badge
                  key={trigger}
                  variant={filters.triggers.includes(trigger) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    const newTriggers = filters.triggers.includes(trigger)
                      ? filters.triggers.filter((t) => t !== trigger)
                      : [...filters.triggers, trigger];
                    onFiltersChange({ ...filters, triggers: newTriggers });
                  }}
                >
                  {trigger}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Clear Filters */}
        {(filters.searchTerm || filters.minMood > 1 || filters.maxMood < 10 || filters.triggers.length > 0) && (
          <button
            onClick={() =>
              onFiltersChange({
                minMood: 1,
                maxMood: 10,
                triggers: [],
                searchTerm: '',
              })
            }
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Clear all filters
          </button>
        )}
      </CardContent>
    </Card>
  );
};

export default CalendarFilters;
