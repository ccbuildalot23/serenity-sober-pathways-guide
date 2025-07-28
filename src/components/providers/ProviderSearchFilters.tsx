import React, { useState, useEffect } from 'react';
import { Search, Filter, SlidersHorizontal, MapPin, Star, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ProviderService } from '@/services/providerService';
import type { ProviderSearchFilters as SearchFilters } from '@/types/provider';

interface ProviderSearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  resultsCount: number;
  showFilters: boolean;
  onToggleFilters: () => void;
}

interface FilterOptions {
  states: string[];
  specialties: string[];
  insurance: string[];
  tags: string[];
}

export const ProviderSearchFilters: React.FC<ProviderSearchFiltersProps> = ({
  filters,
  onFiltersChange,
  resultsCount,
  showFilters,
  onToggleFilters
}) => {
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    states: [],
    specialties: [],
    insurance: [],
    tags: []
  });

  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const options = await ProviderService.getFilterOptions();
        setFilterOptions(options);
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };

    loadFilterOptions();
  }, []);

  const updateFilters = (updates: Partial<SearchFilters>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const toggleTag = (tag: string) => {
    const newTags = filters.tags.includes(tag)
      ? filters.tags.filter(t => t !== tag)
      : [...filters.tags, tag];
    updateFilters({ tags: newTags });
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: '',
      state: '',
      specialty: '',
      insurance: '',
      tags: [],
      acceptingNewPatients: false,
      sortBy: 'name',
      sortOrder: 'asc'
    });
  };

  const activeFiltersCount = 
    (filters.state ? 1 : 0) + 
    (filters.specialty ? 1 : 0) + 
    (filters.insurance ? 1 : 0) +
    filters.tags.length +
    (filters.acceptingNewPatients ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Search Bar and Controls */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <Input
            placeholder="Search by name, specialty, or keyword..."
            value={filters.searchTerm}
            onChange={(e) => updateFilters({ searchTerm: e.target.value })}
            className="pl-10"
          />
        </div>
        
        <Select value={filters.sortBy} onValueChange={(value: any) => updateFilters({ sortBy: value })}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="rating">Rating</SelectItem>
            <SelectItem value="experience">Experience</SelectItem>
            <SelectItem value="distance">Distance</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={onToggleFilters}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {resultsCount} provider{resultsCount !== 1 ? 's' : ''} found
        </span>
        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-primary hover:underline"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5" />
              Filter Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Location Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  State/Location
                </label>
                <Select value={filters.state} onValueChange={(value) => updateFilters({ state: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All States" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All States</SelectItem>
                    {filterOptions.states.map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Specialty Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Specialty</label>
                <Select value={filters.specialty} onValueChange={(value) => updateFilters({ specialty: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Specialties" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Specialties</SelectItem>
                    {filterOptions.specialties.map(specialty => (
                      <SelectItem key={specialty} value={specialty}>{specialty}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Insurance Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Insurance</label>
                <Select value={filters.insurance} onValueChange={(value) => updateFilters({ insurance: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Insurance" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Insurance</SelectItem>
                    {filterOptions.insurance.map(insurance => (
                      <SelectItem key={insurance} value={insurance}>{insurance}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Availability Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Availability
                </label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="accepting"
                    checked={filters.acceptingNewPatients}
                    onCheckedChange={(checked) => updateFilters({ acceptingNewPatients: !!checked })}
                  />
                  <label htmlFor="accepting" className="text-sm">
                    Accepting new patients
                  </label>
                </div>
              </div>
            </div>

            {/* Tags Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Services & Features</label>
              <div className="flex flex-wrap gap-2">
                {filterOptions.tags.map(tag => (
                  <Badge
                    key={tag}
                    variant={filters.tags.includes(tag) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag.split('-').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};