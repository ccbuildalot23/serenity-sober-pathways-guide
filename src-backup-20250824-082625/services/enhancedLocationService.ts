
import { debugService } from './debugService';

export interface EnhancedLocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  method: 'gps' | 'network' | 'ip-based' | 'cached' | 'manual';
  timestamp: Date;
  address?: string;
}

export interface LocationError {
  code: number;
  message: string;
  method: string;
}

class EnhancedLocationService {
  private lastKnownLocation: EnhancedLocationData | null = null;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  async getCurrentLocation(): Promise<EnhancedLocationData> {
    debugService.log('location', 'Starting enhanced location request');
    
    const sources = [
      () => this.getGPSLocation(),
      () => this.getNetworkLocation(), 
      () => this.getIPBasedLocation(),
      () => this.getCachedLocation()
    ];
    
    for (const [index, source] of sources.entries()) {
      try {
        const location = await source();
        if (this.validateLocation(location)) {
          debugService.log('location', 'Location obtained', {
            method: location.method,
            accuracy: location.accuracy,
            sourceIndex: index
          });
          this.cacheLocation(location);
          return location;
        }
      } catch (error) {
        debugService.log('location', 'Location source failed', {
          sourceIndex: index,
          error: error.message
        });
        continue;
      }
    }
    
    throw new Error('Unable to determine location from any source');
  }

  private async getGPSLocation(): Promise<EnhancedLocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const address = await this.reverseGeocode(latitude, longitude);
          
          resolve({
            latitude,
            longitude,
            accuracy,
            method: 'gps',
            timestamp: new Date(),
            address
          });
        },
        (error) => {
          let message = 'Unknown error occurred';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out';
              break;
          }
          
          debugService.log('location', 'GPS location failed', {
            code: error.code,
            message
          });
          
          reject({ code: error.code, message, method: 'gps' });
        },
        options
      );
    });
  }

  private async getNetworkLocation(): Promise<EnhancedLocationData> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: false, // Use network-based location
        timeout: 5000,
        maximumAge: 600000 // 10 minutes
      };

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          const address = await this.reverseGeocode(latitude, longitude);
          
          resolve({
            latitude,
            longitude,
            accuracy,
            method: 'network',
            timestamp: new Date(),
            address
          });
        },
        (error) => {
          reject({ 
            code: error.code, 
            message: 'Network location failed',
            method: 'network'
          });
        },
        options
      );
    });
  }

  private async getIPBasedLocation(): Promise<EnhancedLocationData> {
    try {
      debugService.log('location', 'Attempting IP-based location');
      
      // Using ipapi.co as a fallback
      const response = await fetch('https://ipapi.co/json/', {
        timeout: 5000
      } as any);
      
      if (!response.ok) {
        throw new Error('IP geolocation service unavailable');
      }
      
      const data = await response.json();
      
      if (!data.latitude || !data.longitude) {
        throw new Error('Invalid IP geolocation response');
      }
      
      return {
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        accuracy: 5000, // Less accurate - city level
        method: 'ip-based',
        timestamp: new Date(),
        address: `${data.city}, ${data.region}, ${data.country_name}`
      };
    } catch (error) {
      debugService.log('location', 'IP-based location failed', { error: error.message });
      throw error;
    }
  }

  private getCachedLocation(): EnhancedLocationData {
    if (!this.lastKnownLocation) {
      throw new Error('No cached location available');
    }

    const age = Date.now() - this.lastKnownLocation.timestamp.getTime();
    if (age > this.CACHE_DURATION) {
      throw new Error('Cached location too old');
    }

    debugService.log('location', 'Using cached location', {
      age: Math.round(age / 1000),
      method: this.lastKnownLocation.method
    });

    return {
      ...this.lastKnownLocation,
      method: 'cached'
    };
  }

  private validateLocation(location: EnhancedLocationData): boolean {
    // Check if coordinates are valid
    if (Math.abs(location.latitude) > 90 || Math.abs(location.longitude) > 180) {
      debugService.log('location', 'Invalid coordinates', {
        latitude: location.latitude,
        longitude: location.longitude
      });
      return false;
    }
    
    // Check accuracy threshold
    if (location.accuracy > 10000) { // More than 10km accuracy
      debugService.log('location', 'Low accuracy location', {
        accuracy: location.accuracy,
        method: location.method
      });
      // Still valid, but log the low accuracy
    }
    
    return true;
  }

  private cacheLocation(location: EnhancedLocationData): void {
    this.lastKnownLocation = location;
    
    // Also cache to localStorage
    try {
      localStorage.setItem('lastKnownLocation', JSON.stringify({
        ...location,
        timestamp: location.timestamp.toISOString()
      }));
    } catch (error) {
      debugService.log('location', 'Failed to cache location', { error: error.message });
    }
  }

  private async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      // Mock implementation - in production you'd use a real geocoding service
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'Elm Dr', 'Cedar Ln'];
      const cities = ['Downtown', 'Riverside', 'Hillside', 'Parkview', 'Lakeside'];
      const states = ['CA', 'NY', 'TX', 'FL', 'WA'];
      
      const streetNum = Math.floor(Math.abs(lat * lng) * 1000) % 9999 + 1;
      const street = streets[Math.floor(Math.abs(lat * 10) % streets.length)];
      const city = cities[Math.floor(Math.abs(lng * 10) % cities.length)];
      const state = states[Math.floor(Math.abs(lat + lng) % states.length)];
      const zip = Math.floor(Math.abs(lat * lng) * 10000) % 90000 + 10000;
      
      return `${streetNum} ${street}, ${city}, ${state} ${zip}`;
    } catch (error) {
      debugService.log('location', 'Reverse geocoding failed', { error: error.message });
      return 'Address unavailable';
    }
  }

  handleLocationPermissionDenied(): { showManualEntry: boolean; message: string } {
    debugService.log('location', 'Location permission denied - offering manual entry');
    
    return {
      showManualEntry: true,
      message: 'You can still share your location by entering an address'
    };
  }

  clearCachedLocation(): void {
    this.lastKnownLocation = null;
    localStorage.removeItem('lastKnownLocation');
    debugService.log('location', 'Cached location cleared');
  }

  getLocationFromStorage(): EnhancedLocationData | null {
    try {
      const cached = localStorage.getItem('lastKnownLocation');
      if (!cached) return null;
      
      const location = JSON.parse(cached);
      return {
        ...location,
        timestamp: new Date(location.timestamp)
      };
    } catch (error) {
      debugService.log('location', 'Failed to load cached location', { error: error.message });
      return null;
    }
  }
}

export const enhancedLocationService = new EnhancedLocationService();
