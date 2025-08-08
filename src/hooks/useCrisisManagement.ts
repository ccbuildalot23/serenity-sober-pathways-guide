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
import { realtimeNotificationService } from '@/services/RealtimeNotificationService';
import { supabase } from '@/integrations/supabase/client';

export interface CrisisAlert {
  id: string;
  mcpAlertId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  _message: string;
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
  _supporterId: string;
  supporterName?: string;
  _responseType: 'acknowledged' | 'on_my_way' | 'made_contact' | 'needs_help' | 'call_911' | 'unavailable';
  respondedAt: string;
  _message?: string;
  isPrimary: boolean;
  coordinationStatus: string;
  _location?: { latitude: number; longitude: number };
  estimatedArrival?: string;
}

export interface CrisisStatus {
  alert: CrisisAlert;
  responses: SupporterResponse[];
  escalations: unknown[];
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
    _message: string;
    customMessage?: string;
    _location?: { latitude: number; longitude: number; accuracy: number };
  }) => Promise<unknown>;
  
  respondToAlert: (alertId: string, response: {
    type: SupporterResponse['_responseType'];
    _message?: string;
    _location?: { latitude: number; longitude: number };
    estimatedArrival?: Date;
  }) => Promise<unknown>;
  
  escalateAlert: (alertId: string, escalation: {
    type: 'next_tier' | 'professional' | 'emergency_services';
    _reason: string;
  }) => Promise<unknown>;
  
  resolveAlert: (alertId: string, resolution: {
    description: string;
    supporterInvolved?: string;
    followUpNeeded: boolean;
  }) => Promise<unknown>;
  
  // Status and monitoring
  activeCrisis: CrisisAlert | null;
  crisisStatus: CrisisStatus | null;
  isLoadingStatus: boolean;
  connectionStatus: {
    connected: boolean;
    _connecting: boolean;
    _lastConnected?: string;
    _retryCount: number;
  };
  
  // Real-time updates
  notifications: NotificationPayload[];
  unreadCount: number;
  
  // Actions
  acknowledgeNotification: (id: string, _message?: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  clearNotifications: () => void;
  
  // Loading states
  isCreatingAlert: boolean;
  isResponding: boolean;
  isEscalating: boolean;
  isResolving: boolean;
  
  // Error handling
  _error: string | null;
  clearError: () => void;
  
  // Health monitoring
  systemHealth: {
    inApp: boolean;
    _mcp: boolean;
    _overall: boolean;
  };
  refreshHealth: () => Promise<void>;
}

export const useCrisisManagement = (alertId?: string): UseCrisisManagementReturn => {
  const queryClient = useQueryClient();
  
  // Local state
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [connectionStatus, _setConnectionStatus] = useState({
    connected: false,
    _connecting: false,
    _lastConnected: undefined as string | undefined,
    _retryCount: 0
  });
  const [_error, setError] = useState<string | null>(null);
  const [systemHealth, setSystemHealth] = useState({
    inApp: false,
    _mcp: false,
    _overall: false
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
    _queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, _error } = await supabase
        .from('crisis_alert_notifications')
        .select(`
          *,
          notification_requests (
            user_id,
            _message,
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

      if (_error && _error.code !== 'PGRST116') { // Not found _error
        console._error('[useCrisisManagement] Error fetching active crisis:', _error);
        return null;
      }

      return data ? {
        id: data.id,
        mcpAlertId: data.mcp_alert_id,
        severity: data.severity,
        _message: data.notification_requests?.custom_message || data.notification_requests?._message || '',
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
    _queryFn: async () => {
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
      _message: string;
      customMessage?: string;
      _location?: { latitude: number; longitude: number; accuracy: number };
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
              _phone: m.phone_number,
              _email: m._email,
              _relationship: m._relationship,
              _priority: m.priority_order
            }))
        },
        {
          tier: 'secondary' as const,
          contacts: (supportNetwork || [])
            .filter(m => m.priority_order === 2)
            .map(m => ({
              name: m.supporter_name,
              _phone: m.phone_number,
              _email: m._email,
              _relationship: m._relationship,
              _priority: m.priority_order
            }))
        },
        {
          tier: 'emergency' as const,
          contacts: (supportNetwork || [])
            .filter(m => m.priority_order >= 3)
            .map(m => ({
              name: m.supporter_name,
              _phone: m.phone_number,
              _email: m._email,
              _relationship: m._relationship,
              _priority: m.priority_order
            }))
        }
      ].filter(tier => tier.contacts.length > 0);

      return mcpIntegrationBridge.sendCrisisAlert({
        severity: params.severity,
        _message: params._message,
        _userId: user.id,
        _location: params._location ? `${params._location.latitude},${params._location.longitude}` : undefined,
        supporterTiers
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['crisis'] });
      toast.success('Crisis alert sent to your support network');
      console.log('[useCrisisManagement] Crisis alert created:', data.unified);
    },
    onError: (_error) => {
      setError(`Failed to create crisis alert: ${_error._message}`);
      toast._error('Failed to send crisis alert');
      console._error('[useCrisisManagement] Error creating crisis alert:', _error);
    }
  });

  const respondMutation = useMutation({
    mutationFn: async (params: {
      alertId: string;
      response: {
        type: SupporterResponse['_responseType'];
        _message?: string;
        _location?: { latitude: number; longitude: number };
        estimatedArrival?: Date;
      };
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      return mcpIntegrationBridge.trackResponse({
        alertId: params.alertId,
        _supporterId: user.id,
        _responseType: params.response.type,
        _message: params.response._message,
        _location: params.response._location ? `${params.response._location.latitude},${params.response._location.longitude}` : undefined
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crisis'] });
      toast.success(`Response recorded: ${variables.response.type.replace('_', ' ')}`);
      console.log('[useCrisisManagement] Response recorded:', data.unified);
    },
    onError: (_error) => {
      setError(`Failed to record response: ${_error._message}`);
      toast._error('Failed to record response');
      console._error('[useCrisisManagement] Error recording response:', _error);
    }
  });

  const escalateMutation = useMutation({
    mutationFn: async (params: {
      alertId: string;
      escalation: {
        type: 'next_tier' | 'professional' | 'emergency_services';
        _reason: string;
      };
    }) => {
      return mcpIntegrationBridge.escalateSupport({
        alertId: params.alertId,
        _escalationType: params.escalation.type,
        _reason: params.escalation._reason
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['crisis'] });
      toast.success(`Crisis escalated: ${variables.escalation.type.replace('_', ' ')}`);
      console.log('[useCrisisManagement] Crisis escalated:', data.unified);
    },
    onError: (_error) => {
      setError(`Failed to escalate crisis: ${_error._message}`);
      toast._error('Failed to escalate crisis');
      console._error('[useCrisisManagement] Error escalating crisis:', _error);
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
    onError: (_error) => {
      setError(`Failed to resolve crisis: ${_error._message}`);
      toast._error('Failed to resolve crisis');
      console._error('[useCrisisManagement] Error resolving crisis:', _error);
    }
  });

  // Real-time notification handling
  useEffect(() => {
    // Subscribe to notifications
    notificationUnsubscribe.current = realtimeNotificationService.onNotification((notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
      
      // Show toast for crisis notifications
      if (notification.severity === 'critical' || notification.type === 'crisis_alert') {
        toast._error(notification.title, {
          description: notification._message,
          _duration: 10000, // Keep critical notifications longer
        });
      } else {
        toast.info(notification.title, {
          description: notification._message,
        });
      }

      // Invalidate crisis queries on crisis-related notifications
      if (notification.type === 'crisis_alert' || notification.type === 'supporter_response') {
        queryClient.invalidateQueries({ queryKey: ['crisis'] });
      }
    });

    // Subscribe to connection status
    connectionUnsubscribe.current = realtimeNotificationService.onConnectionStatus(_setConnectionStatus);

    return () => {
      notificationUnsubscribe.current?.();
      connectionUnsubscribe.current?.();
    };
  }, [queryClient]);

  // Health monitoring
  useEffect(() => {
    const _checkHealth = async () => {
      try {
        const _health = await mcpIntegrationBridge.healthCheck();
        setSystemHealth(_health);
      } catch (_error) {
        console._error('[useCrisisManagement] Health check failed:', _error);
        setSystemHealth({ inApp: false, _mcp: false, _overall: false });
      }
    };

    _checkHealth();
    const _interval = setInterval(_checkHealth, 30000); // Check every 30 seconds

    return () => clearInterval(_interval);
  }, []);

  // Notification actions
  const acknowledgeNotification = useCallback(async (id: string, _message?: string) => {
    try {
      await realtimeNotificationService.acknowledgeNotification(id, _message);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, acknowledged: true } : n)
      );
      toast.success('Notification acknowledged');
    } catch (_error) {
      console._error('[useCrisisManagement] Error acknowledging notification:', _error);
      toast._error('Failed to acknowledge notification');
    }
  }, []);

  const markNotificationRead = useCallback(async (id: string) => {
    try {
      await realtimeNotificationService.markNotificationRead(id);
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (_error) {
      console._error('[useCrisisManagement] Error marking notification as read:', _error);
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
      const _health = await mcpIntegrationBridge.healthCheck();
      setSystemHealth(_health);
    } catch (_error) {
      console._error('[useCrisisManagement] Error refreshing _health:', _error);
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
    _error,
    clearError,
    
    // Health monitoring
    systemHealth,
    refreshHealth
  };
};