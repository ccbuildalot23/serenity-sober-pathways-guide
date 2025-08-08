
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Search, Filter } from 'lucide-react';

interface CalendarFiltersProps {
  filters: {
    _minMood: number;
    _maxMood: number;
    _triggers: string[];
    _searchTerm: string;
  };
  onFiltersChange: (filters: unknown) => void;
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
              value={filters._searchTerm}
              onChange={(e) =>
                onFiltersChange({ ...filters, _searchTerm: e.target.value })
              }
              className="pl-8"
            />
          </div>
        </div>

        {/* Mood Range */}
        <div className="space-y-2">
          <Label>Mood Range: {filters._minMood} - {filters._maxMood}</Label>
          <div className="px-2">
            <Slider
              value={[filters._minMood, filters._maxMood]}
              onValueChange={([min, max]) =>
                onFiltersChange({ ...filters, _minMood: min, _maxMood: max })
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
            <Label>Filter by _triggers</Label>
            <div className="flex flex-wrap gap-2">
              {availableTriggers.map((trigger) => (
                <Badge
                  key={trigger}
                  variant={filters._triggers.includes(trigger) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => {
                    const newTriggers = filters._triggers.includes(trigger)
                      ? filters._triggers.filter((t) => t !== trigger)
                      : [...filters._triggers, trigger];
                    onFiltersChange({ ...filters, _triggers: newTriggers });
                  }}
                >
                  {trigger}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Clear Filters */}
        {(filters._searchTerm || filters._minMood > 1 || filters._maxMood < 10 || filters._triggers.length > 0) && (
          <button
            onClick={() =>
              onFiltersChange({
                _minMood: 1,
                _maxMood: 10,
                _triggers: [],
                _searchTerm: '',
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
