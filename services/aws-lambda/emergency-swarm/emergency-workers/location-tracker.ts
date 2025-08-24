/**
 * Location Tracker Worker
 * Tracks and updates emergency location data
 */

import { Context } from 'aws-lambda';

interface LocationRequest {
  emergencyId: string;
  patientId: string;
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: string;
  };
}

export const handler = async (event: LocationRequest, context: Context): Promise<any> => {
  console.log('Location tracker worker invoked');

  const locationData = {
    emergencyId: event.emergencyId,
    patientId: event.patientId,
    location: {
      ...event.location,
      timestamp: event.location.timestamp || new Date().toISOString(),
      accuracy: event.location.accuracy || 50
    },
    nearestFacilities: await findNearestFacilities(event.location),
    estimatedResponseTime: calculateResponseTime(event.location)
  };

  return {
    success: true,
    locationData,
    trackedAt: new Date().toISOString()
  };
};

async function findNearestFacilities(location: any): Promise<any[]> {
  // In production, this would call a geolocation API
  return [
    {
      type: 'hospital',
      name: 'General Hospital',
      distance: '2.3 miles',
      estimatedTime: '5 minutes'
    },
    {
      type: 'crisis_center',
      name: 'Crisis Response Center',
      distance: '1.8 miles',
      estimatedTime: '4 minutes'
    }
  ];
}

function calculateResponseTime(location: any): string {
  // Simplified calculation
  return '3-5 minutes';
}