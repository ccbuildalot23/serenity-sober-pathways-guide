
export interface LocationData {
  coordinates: {
    latitude: number;
    longitude: number;
  };
  address: string;
  accuracy: 'High' | 'Medium' | 'Low';
  timestamp: Date;
}

export interface GeolocationError {
  code: number;
  message: string;
}

// Mock function to convert coordinates to readable address
const mockReverseGeocode = async (lat: number, lng: number): Promise<string> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock address generation based on coordinates
  const streets = ['Main St', 'Oak Ave', 'Pine Rd', 'Elm Dr', 'Cedar Ln'];
  const cities = ['Downtown', 'Riverside', 'Hillside', 'Parkview', 'Lakeside'];
  const states = ['CA', 'NY', 'TX', 'FL', 'WA'];
  
  const streetNum = Math.floor(Math.abs(lat * lng) * 1000) % 9999 + 1;
  const street = streets[Math.floor(Math.abs(lat * 10) % streets.length)];
  const city = cities[Math.floor(Math.abs(lng * 10) % cities.length)];
  const state = states[Math.floor(Math.abs(lat + lng) % states.length)];
  const zip = Math.floor(Math.abs(lat * lng) * 10000) % 90000 + 10000;
  
  return `${streetNum} ${street}, ${city}, ${state} ${zip}`;
};

const getAccuracyLevel = (accuracy: number): 'High' | 'Medium' | 'Low' => {
  if (accuracy <= 10) return 'High';
  if (accuracy <= 100) return 'Medium';
  return 'Low';
};

export const getCurrentLocation = (): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject({
        code: 0,
        message: 'Geolocation is not supported by this browser'
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords;
          const address = await mockReverseGeocode(latitude, longitude);
          
          const locationData: LocationData = {
            coordinates: { latitude, longitude },
            address,
            accuracy: getAccuracyLevel(accuracy),
            timestamp: new Date()
          };
          
          // Cache to localStorage
          localStorage.setItem('lastKnownLocation', JSON.stringify(locationData));
          
          resolve(locationData);
        } catch (error) {
          reject({
            code: -1,
            message: 'Failed to get address for location'
          });
        }
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
        
        reject({
          code: error.code,
          message
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  });
};

export const getCachedLocation = (): LocationData | null => {
  const cached = localStorage.getItem('lastKnownLocation');
  if (!cached) return null;
  
  try {
    const location = JSON.parse(cached);
    return {
      ...location,
      timestamp: new Date(location.timestamp)
    };
  } catch {
    return null;
  }
};

export const clearCachedLocation = (): void => {
  localStorage.removeItem('lastKnownLocation');
};
