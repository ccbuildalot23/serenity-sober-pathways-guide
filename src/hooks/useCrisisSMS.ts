import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SendCrisisSMSOptions {
  contactIds?: string[];
  customMessage?: string;
  includeLocation?: boolean;
}

export const useCrisisSMS = () => {
  const [sending, setSending] = useState(false);

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Location access denied or failed:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        }
      );
    });
  };

  const sendCrisisSMS = async (options: SendCrisisSMSOptions = {}) => {
    setSending(true);
    
    try {
      let userLocation;
      
      if (options.includeLocation) {
        try {
          userLocation = await getCurrentLocation();
        } catch (error) {
          console.warn('Could not get location, proceeding without it');
        }
      }

      const { data, error } = await supabase.functions.invoke('send-crisis-sms', {
        body: {
          contactIds: options.contactIds,
          customMessage: options.customMessage,
          includeLocation: options.includeLocation,
          userLocation,
        },
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast.success(
          `Crisis alert sent to ${data.sentCount} contact${data.sentCount !== 1 ? 's' : ''}`,
          {
            description: 'Your emergency contacts have been notified.',
            duration: 5000,
          }
        );
      } else {
        throw new Error(data.error || 'Failed to send crisis SMS');
      }

      return data;
    } catch (error) {
      console.error('Crisis SMS error:', error);
      
      // Show user-friendly error message
      if (error.message?.includes('No emergency contacts found')) {
        toast.error('No emergency contacts found', {
          description: 'Please add emergency contacts before using crisis support.',
          duration: 6000,
        });
      } else if (error.message?.includes('Missing Twilio credentials')) {
        toast.error('SMS service not configured', {
          description: 'Contact the app administrator.',
          duration: 6000,
        });
      } else {
        toast.error('Failed to send crisis alert', {
          description: 'Please try again or call emergency services directly.',
          duration: 6000,
        });
      }
      
      throw error;
    } finally {
      setSending(false);
    }
  };

  const sendLocationUpdate = async (customMessage?: string) => {
    setSending(true);
    
    try {
      const userLocation = await getCurrentLocation();

      const { data, error } = await supabase.functions.invoke('send-location-update', {
        body: {
          userLocation,
          customMessage,
        },
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        toast.success(
          `Location update sent to ${data.sentCount} contact${data.sentCount !== 1 ? 's' : ''}`,
          {
            description: 'Your current location has been shared.',
            duration: 5000,
          }
        );
      } else {
        throw new Error(data.error || 'Failed to send location update');
      }

      return data;
    } catch (error) {
      console.error('Location update error:', error);
      
      if (error.message?.includes('Location data is required')) {
        toast.error('Location access required', {
          description: 'Please allow location access to share your current position.',
          duration: 6000,
        });
      } else if (error.message?.includes('No emergency contacts found')) {
        toast.error('No emergency contacts found', {
          description: 'Please add emergency contacts before sharing location.',
          duration: 6000,
        });
      } else {
        toast.error('Failed to send location update', {
          description: 'Please try again.',
          duration: 6000,
        });
      }
      
      throw error;
    } finally {
      setSending(false);
    }
  };

  return {
    sendCrisisSMS,
    sendLocationUpdate,
    sending,
  };
};