
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import { LocationData } from '@/services/geolocationService';

interface LocationSelectorProps {
  includeLocation: boolean;
  onLocationToggle: (checked: boolean) => void;
  isLoadingLocation: boolean;
  locationData: LocationData | null;
  locationError: string | null;
}

const LocationSelector = ({ 
  includeLocation, 
  onLocationToggle, 
  isLoadingLocation, 
  locationData, 
  locationError 
}: LocationSelectorProps) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="location"
          checked={includeLocation}
          onCheckedChange={onLocationToggle}
          disabled={isLoadingLocation}
        />
        <label 
          htmlFor="location"
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
        >
          Include my current location
        </label>
        {isLoadingLocation && (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        )}
      </div>

      {includeLocation && locationData && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-start space-x-2">
            <MapPin className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-blue-800 font-medium">Current Location:</p>
              <p className="text-xs text-blue-700 break-words">{locationData.address}</p>
              <div className="flex items-center space-x-2 mt-1">
                <Badge 
                  variant={locationData.accuracy === 'High' ? 'default' : locationData.accuracy === 'Medium' ? 'secondary' : 'destructive'}
                  className="text-xs"
                >
                  Accuracy: {locationData.accuracy}
                </Badge>
                <span className="text-xs text-blue-600">
                  {new Date(locationData.timestamp).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {locationError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-800 font-medium">Location access failed</p>
              <p className="text-xs text-red-700">{locationError}</p>
              <p className="text-xs text-red-600 mt-1">Alert will be sent without location.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSelector;
