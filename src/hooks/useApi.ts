/**
 * Custom hooks for API interactions
 */

import { useState, useCallback } from 'react';
import { apiService } from '@/services/apiService';
import { toast } from 'sonner';

// Generic API hook for mutations
export function useApiMutation<T = any, P = any>(
  apiCall: (params: P) => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    successMessage?: string;
    errorMessage?: string;
  }
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);

  const mutate = useCallback(async (params: P) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await apiCall(params);
      setData(result);
      
      if (options?.successMessage) {
        toast.success(options.successMessage);
      }
      
      options?.onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      
      if (options?.errorMessage) {
        toast.error(options.errorMessage);
      } else {
        toast.error(error.message || 'An error occurred');
      }
      
      options?.onError?.(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [apiCall, options]);

  return { mutate, loading, error, data };
}

// Authentication hooks
export function useLogin() {
  return useApiMutation(
    ({ email, password }: { email: string; password: string }) => 
      apiService.login(email, password),
    {
      successMessage: 'Login successful!',
      errorMessage: 'Invalid credentials'
    }
  );
}

export function useLogout() {
  return useApiMutation(
    () => apiService.logout(),
    {
      successMessage: 'Logged out successfully',
      onSuccess: () => {
        window.location.href = '/auth';
      }
    }
  );
}

// Check-in hooks
export function useCreateCheckIn() {
  return useApiMutation(
    (data: {
      mood: string;
      anxiety_level: number;
      sleep_hours: number;
      medication_taken: boolean;
      notes?: string;
    }) => apiService.createCheckIn(data),
    {
      successMessage: 'Check-in saved successfully!',
      errorMessage: 'Failed to save check-in'
    }
  );
}

// Crisis hooks
export function useTriggerCrisis() {
  return useApiMutation(
    (data: {
      severity?: string;
      message?: string;
      location?: { lat: number; lng: number; address: string };
    }) => apiService.createCrisisAlert({
      severity: data.severity,
      message: data.message,
      location_lat: data.location?.lat,
      location_lng: data.location?.lng,
      location_address: data.location?.address
    }),
    {
      successMessage: 'Crisis alert sent to your support network',
      errorMessage: 'Failed to send crisis alert'
    }
  );
}

// Notification hooks
export function useMarkNotificationRead() {
  return useApiMutation(
    (notificationId: string) => apiService.markNotificationRead(notificationId)
  );
}