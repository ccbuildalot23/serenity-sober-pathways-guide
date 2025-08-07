/**
 * Crisis Management Hook
 * 
 * Provides a unified React interface for crisis management functionality.
 * Integrates with both in-app notifications and MCP systems.
 * 
 * Features:
 * - Crisis alert creation and management
 * - Real-time status updates
 * - Supporter response tracking
 * - Escalation handling
 * - Connection status monitoring
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { mcpIntegrationBridge } from '@/services/McpIntegrationBridge';
import { realtimeNotificationService, type NotificationPayload } from '@/services/RealtimeNotificationService';
import { supabase } from '@/integrations/supabase/client';

export interface CrisisAlert {
  id: string;
  mcpAlertId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  status: 'created' | 'notified' | 'acknowledged' | 'escalated' | 'resolved';
  createdAt: string;
  updatedAt: string;
  supportersNotified: number;
  responderCount: number;
  firstResponderId?: string;
  tier: 'primary' | 'secondary' | 'emergency';
  escalationLevel: number;
}

export interface SupporterResponse {
  id: string;
  supporterId: string;
  supporterName?: string;
  responseType: 'acknowledged' | 'on_my_way' | 'made_contact' | 'needs_help' | 'call_911' | 'unavailable';
  respondedAt: string;
  message?: string;
  isPrimary: boolean;
  coordinationStatus: string;
  location?: { latitude: number; longitude: number };
  estimatedArrival?: string;
}

export interface CrisisStatus {
  alert: CrisisAlert;
  responses: SupporterResponse[];
  escalations: any[];
  summary: {
    totalResponders: number;
    contactsMade: number;
    needsHelp: number;
    emergencyCalls: number;
    primaryResponder?: string;
  };
  realTimeStatus: {
    connected: boolean;
    lastUpdate: string;
  };
}

export interface UseCrisisManagementReturn {
  // Crisis management
  createCrisisAlert: (params: {
    severity: CrisisAlert['severity'];
    message: string;
    customMessage?: string;
    location?: { latitude: number; longitude: number; accuracy: number };
  }) => Promise<any>;
  
  respondToAlert: (alertId: string, response: {
    type: SupporterResponse['responseType'];
    message?: string;
    location?: { latitude: number; longitude: number };
    estimatedArrival?: Date;
  }) => Promise<any>;
  
  escalateAlert: (alertId: string, escalation: {
    type: 'next_tier' | 'professional' | 'emergency_services';
    reason: string;
  }) => Promise<any>;
  
  resolveAlert: (alertId: string, resolution: {
    description: string;
    supporterInvolved?: string;
    followUpNeeded: boolean;
  }) => Promise<any>;
  
  // Status and monitoring
  activeCrisis: CrisisAlert | null;
  crisisStatus: CrisisStatus | null;
  isLoadingStatus: boolean;
  connectionStatus: {
    connected: boolean;
    connecting: boolean;
    lastConnected?: string;
    retryCount: number;
  };
  
  // Real-time updates
  notifications: NotificationPayload[];
  unreadCount: number;
  
  // Actions
  acknowledgeNotification: (id: string, message?: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  clearNotifications: () => void;
  
  // Loading states
  isCreatingAlert: boolean;
  isResponding: boolean;
  isEscalating: boolean;
  isResolving: boolean;
  
  // Error handling
  error: string | null;
  clearError: () => void;
  
  // Health monitoring
  systemHealth: {
    inApp: boolean;
    mcp: boolean;
    overall: boolean;
  };
  refreshHealth: () => Promise<void>;
}

export const useCrisisManagement = (alertId?: string): UseCrisisManagementReturn => {
  const queryClient = useQueryClient();
  
  // Local state
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    connecting: false,
    lastConnected: undefined as string | undefined,
    retryCount: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState({
    inApp: false,
    mcp: false,
    overall: false
  });
  
  // Refs for cleanup
  const notificationUnsubscribe = useRef<(() => void) | null>(null);
  const connectionUnsubscribe = useRef<(() => void) | null>(null);

  // Query for active crisis
  const { 
    data: activeCrisis, 
    isLoading: isLoadingActiveCrisis 
  } = useQuery({
    queryKey: ['crisis', 'active'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('crisis_alert_notifications')
        .select(`
          *,
          notification_requests (
            user_id,
            message,
            custom_message,
            created_at,
            status
          )
        `)
        .eq('notification_requests.user_id', user.id)
        .in('status', ['scheduled', 'sent', 'acknowledged', 'escalated'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found error
        console.error('[useCrisisManagement] Error fetching active crisis:', error);
        return null;
      }

      return data ? {
        id: data.id,
        mcpAlertId: data.mcp_alert_id,
        severity: data.severity,
        message: data.notification_requests?.custom_message || data.notification_requests?.message || '',
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        supportersNotified: 0, // Would calculate from notification_recipients
        responderCount: data.responder_count,
        firstResponderId: data.first_responder_id,
        tier: data.tier,
        escalationLevel: data.escalation_level
      } as CrisisAlert : null;
    },
    refetchInterval: 10000, // Poll every 10 seconds for active crisis
  });

  // Query for crisis status (if alertId provided)
  const { 
    data: crisisStatus, 
    isLoading: isLoadingStatus 
  } = useQuery({
    queryKey: ['crisis', 'status', alertId],
    queryFn: async () => {
      if (!alertId) return null;
      const unified = await mcpIntegrationBridge.getAlertStatus(alertId);
      return unified.unified as CrisisStatus;
    },
    enabled: !!alertId,
    refetchInterval: 5000, // More frequent updates for specific crisis
  });

  // Mutations
  const createAlertMutation = useMutation({
    mutationFn: async (params: {
      severity: CrisisAlert['severity'];
      message: string;
      customMessage?: string;
      location?: { latitude: number; longitude: number; accuracy: number };
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get support network for MCP integration
      const { data: supportNetwork } = await supabase
        .from('support_network_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const supporterTiers = [
        {
          tier: 'primary' as const,
          contacts: (supportNetwork || [])
            .filter(m => m.priority_order === 1)
            .map(m => ({
              name: m.supporter_name,
              phone: m.phone_number,
              email: m.email,
              relationship: m.relationship,
              priority: m.priority_order
            }))
        },
        {
          tier: 'secondary' as const,
          contacts: (supportNetwork || [])
            .filter(m => m.priority_order === 2)
            .map(m => ({
              name: m.supporter_name,
              phone: m.phone_number,
              email: m.email,
              relationship: m.relationship,
              priority: m.priority_order
            }))
        },
        {
          tier: 'emergency' as const,
          contacts: (supportNetwork || [])
            .filter(m => m.priority_order >= 3)
            .map(m => ({
              name: m.supporter_name,
              phone: m.phone_number,
              email: m.email,
              relationship: m.relationship,
              priority: m.priority_order
            }))
        }
      ].filter(tier => tier.contacts.length > 0);

      return mcpIntegrationBridge.sendCrisisAlert({
        severity: params.severity,
        message: params.message,
        userId: user.id,
        location: params.location ? `${params.location.latitude},${params.location.longitude}` : undefined,
        supporterTiers
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crisis'] });
      toast.success('Crisis alert sent to your support network');
      console.log('[useCrisisManagement] Crisis alert created:', data.unified);
    },
    onError: (error) => {
      setError(`Failed to create crisis alert: ${error.message}`);
      toast.error('Failed to send crisis alert');
      console.error('[useCrisisManagement] Error creating crisis alert:', error);
    }
  });

  const respondMutation = useMutation({
    mutationFn: async (params: {
      alertId: string;
      response: {
        type: SupporterResponse['responseType'];
        message?: string;
        location?: { latitude: number; longitude: number };
        estimatedArrival?: Date;
      };
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      return mcpIntegrationBridge.trackResponse({
        alertId: params.alertId,
        supporterId: user.id,
        responseType: params.response.type,
        message: params.response.message,
        location: params.response.location ? `${params.response.location.latitude},${params.response.location.longitude}` : undefined
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crisis'] });
      toast.success(`Response recorded: ${variables.response.type.replace('_', ' ')}`);
      console.log('[useCrisisManagement] Response recorded:', data.unified);
    },
    onError: (error) => {
      setError(`Failed to record response: ${error.message}`);
      toast.error('Failed to record response');
      console.error('[useCrisisManagement] Error recording response:', error);
    }
  });

  const escalateMutation = useMutation({
    mutationFn: async (params: {
      alertId: string;
      escalation: {
        type: 'next_tier' | 'professional' | 'emergency_services';
        reason: string;
      };
    }) => {
      return mcpIntegrationBridge.escalateSupport({
        alertId: params.alertId,
        escalationType: params.escalation.type,
        reason: params.escalation.reason
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crisis'] });
      toast.success(`Crisis escalated: ${variables.escalation.type.replace('_', ' ')}`);
      console.log('[useCrisisManagement] Crisis escalated:', data.unified);
    },
    onError: (error) => {
      setError(`Failed to escalate crisis: ${error.message}`);
      toast.error('Failed to escalate crisis');
      console.error('[useCrisisManagement] Error escalating crisis:', error);
    }
  });

  const resolveMutation = useMutation({
    mutationFn: async (params: {
      alertId: string;
      resolution: {
        description: string;
        supporterInvolved?: string;
        followUpNeeded: boolean;
      };
    }) => {
      return mcpIntegrationBridge.resolveAlert(params.alertId, params.resolution);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crisis'] });
      toast.success('Crisis resolved successfully');
      console.log('[useCrisisManagement] Crisis resolved:', data.unified);
    },
    onError: (error) => {
      setError(`Failed to resolve crisis: ${error.message}`);
      toast.error('Failed to resolve crisis');
      console.error('[useCrisisManagement] Error resolving crisis:', error);
    }
  });

  // Real-time notification handling
  useEffect(() => {
    // Subscribe to notifications
    notificationUnsubscribe.current = realtimeNotificationService.onNotification((notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
      
      // Show toast for crisis notifications
      if (notification.severity === 'critical' || notification.type === 'crisis_alert') {
        toast.error(notification.title, {
          description: notification.message,
          duration: 10000, // Keep critical notifications longer
        });
      } else {
        toast.info(notification.title, {
          description: notification.message,
        });
      }

      // Invalidate crisis queries on crisis-related notifications
      if (notification.type === 'crisis_alert' || notification.type === 'supporter_response') {
        queryClient.invalidateQueries({ queryKey: ['crisis'] });
      }
    });

    // Subscribe to connection status
    connectionUnsubscribe.current = realtimeNotificationService.onConnectionStatus(setConnectionStatus);

    return () => {
      notificationUnsubscribe.current?.();
      connectionUnsubscribe.current?.();
    };
  }, [queryClient]);

  // Health monitoring
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const health = await mcpIntegrationBridge.healthCheck();
        setSystemHealth(health);
      } catch (error) {
        console.error('[useCrisisManagement] Health check failed:', error);
        setSystemHealth({ inApp: false, mcp: false, overall: false });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Notification actions
  const acknowledgeNotification = useCallback(async (id: string, message?: string) => {
    try {
      await realtimeNotificationService.acknowledgeNotification(id, message);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, acknowledged: true } : n)
      );
      toast.success('Notification acknowledged');
    } catch (error) {
      console.error('[useCrisisManagement] Error acknowledging notification:', error);
      toast.error('Failed to acknowledge notification');
    }
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      await realtimeNotificationService.markNotificationRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('[useCrisisManagement] Error marking notification as read:', error);
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshHealth = useCallback(async () => {
    try {
      const health = await mcpIntegrationBridge.healthCheck();
      setSystemHealth(health);
    } catch (error) {
      console.error('[useCrisisManagement] Error refreshing health:', error);
    }
  }, []);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    // Crisis management
    createCrisisAlert: createAlertMutation.mutateAsync,
    respondToAlert: respondMutation.mutateAsync,
    escalateAlert: escalateMutation.mutateAsync,
    resolveAlert: resolveMutation.mutateAsync,
    
    // Status and monitoring
    activeCrisis,
    crisisStatus,
    isLoadingStatus: isLoadingStatus || isLoadingActiveCrisis,
    connectionStatus,
    
    // Real-time updates
    notifications,
    unreadCount,
    
    // Actions
    acknowledgeNotification,
    markNotificationRead,
    clearNotifications,
    
    // Loading states
    isCreatingAlert: createAlertMutation.isPending,
    isResponding: respondMutation.isPending,
    isEscalating: escalateMutation.isPending,
    isResolving: resolveMutation.isPending,
    
    // Error handling
    error,
    clearError,
    
    // Health monitoring
    systemHealth,
    refreshHealth
  };
};