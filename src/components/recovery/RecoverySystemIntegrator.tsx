import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useCrisisSystem } from '@/hooks/useCrisisSystem';
import { toast } from 'sonner';
import { EnhancedInputValidator } from '@/lib/enhancedInputValidation';
import { EnhancedSecurityAuditService } from '@/services/EnhancedSecurityAuditService';

interface CrisisIntegrationEvent {
  id: string;
  user_id: string;
  trigger_source: 'halt_assessment' | 'craving_timer' | 'checkin_pattern' | 'peer_chat' | 'playing_forward';
  trigger_data: any;
  severity: 'low' | 'medium' | 'high' | 'crisis';
  crisis_system_activated: boolean;
  support_network_notified: boolean;
  response_actions: string[];
  created_at: string;
}

interface RecoverySystemIntegratorProps {
  children?: React.ReactNode;
}

const RecoverySystemIntegrator: React.FC<RecoverySystemIntegratorProps> = ({ children }) => {
  const { user } = useAuth();
  const { handleCrisisActivated } = useCrisisSystem();
  const [isMonitoring, setIsMonitoring] = useState(false);

  useEffect(() => {
    if (user && !isMonitoring) {
      setupCrisisIntegration();
      setIsMonitoring(true);
    }
  }, [user]);

  const setupCrisisIntegration = () => {
    if (!user) return;

    // Subscribe to HALT assessments for crisis detection
    const haltChannel = supabase
      .channel(`halt-crisis-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'halt_assessments',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const assessment = payload.new as any;
          if (assessment.is_crisis) {
            await handleCrisisEvent({
              trigger_source: 'halt_assessment',
              trigger_data: {
                hungry: assessment.hungry,
                angry: assessment.angry,
                lonely: assessment.lonely,
                tired: assessment.tired,
                total_score: assessment.total_score
              },
              severity: 'crisis'
            });
          }
        }
      )
      .subscribe();

    // Subscribe to craving sessions for failed timers
    const cravingChannel = supabase
      .channel(`craving-crisis-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'craving_sessions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const session = payload.new as any;
          const oldSession = payload.old as any;
          
          // If session wasn't completed but timer duration suggests they gave up
          if (!session.completed && session.duration > 300 && session.duration < 900 && 
              session.intensity_before >= 8) {
            await handleCrisisEvent({
              trigger_source: 'craving_timer',
              trigger_data: {
                intensity_before: session.intensity_before,
                duration: session.duration,
                gave_up: true
              },
              severity: 'high'
            });
          }
        }
      )
      .subscribe();

    // Subscribe to playing forward sessions for vulnerable moments
    const playingForwardChannel = supabase
      .channel(`playing-forward-crisis-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'playing_forward_sessions',
          filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const session = payload.new as any;
          if (session.is_vulnerable && session.path_explored === 'using') {
            await handleCrisisEvent({
              trigger_source: 'playing_forward',
              trigger_data: {
                path_explored: session.path_explored,
                is_vulnerable: session.is_vulnerable,
                selected_goals: session.selected_goals
              },
              severity: 'medium'
            });
          }
        }
      )
      .subscribe();

    // Subscribe to peer chat for crisis keywords
    const peerChatChannel = supabase
      .channel(`peer-chat-crisis-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'peer_chat_messages',
          filter: `sender_id=eq.${user.id}`
        },
        async (payload) => {
          const message = payload.new as any;
          const crisisKeywords = [
            'want to use', 'thinking about using', 'relapse', 'can\'t do this',
            'give up', 'end it all', 'hurt myself', 'not worth it', 'kill myself',
            'overdose', 'pills', 'drinking', 'using again'
          ];
          
          // Sanitize message before analysis
          const sanitizedMessage = EnhancedInputValidator.sanitizeText(message.message_text || '');
          const messageText = sanitizedMessage.toLowerCase();
          const containsCrisisKeywords = crisisKeywords.some(keyword => 
            messageText.includes(keyword.toLowerCase())
          );
          
          if (containsCrisisKeywords) {
            await handleCrisisEvent({
              trigger_source: 'peer_chat',
              trigger_data: {
                message_text: messageText,
                session_id: message.session_id,
                detected_keywords: crisisKeywords.filter(k => messageText.includes(k)).slice(0, 5) // Limit for security
              },
              severity: 'high'
            });
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(haltChannel);
      supabase.removeChannel(cravingChannel);
      supabase.removeChannel(playingForwardChannel);
      supabase.removeChannel(peerChatChannel);
      setIsMonitoring(false);
    };
  };

  const handleCrisisEvent = async (eventData: {
    trigger_source: string;
    trigger_data: any;
    severity: 'low' | 'medium' | 'high' | 'crisis';
  }) => {
    if (!user) return;

    try {
      // Log the crisis integration event
      const { error: eventError } = await supabase
        .from('crisis_integration_events')
        .insert({
          user_id: user.id,
          trigger_source: eventData.trigger_source,
          trigger_data: eventData.trigger_data,
          severity: eventData.severity,
          crisis_system_activated: eventData.severity === 'crisis' || eventData.severity === 'high',
          support_network_notified: false,
          response_actions: []
        });

      if (eventError) {
        // Log failed crisis event logging
        await EnhancedSecurityAuditService.logSecurityEvent({
          action: 'CRISIS_EVENT_LOG_FAILED',
          details: { error_type: 'database_error' },
          severity: 'critical'
        });
        return;
      }

      // Determine response based on severity
      const responses = await determineCrisisResponse(eventData);

      // Execute crisis response
      if (responses.activateCrisisSystem) {
        handleCrisisActivated();
        
        toast.warning('Crisis support activated', {
          description: 'Additional support tools are now available',
          duration: 6000,
          action: {
            label: 'Open Crisis Toolkit',
            onClick: () => window.location.href = '/crisis-toolkit'
          }
        });
      }

      // Notify support network if needed
      if (responses.notifySupportNetwork) {
        await notifySupportNetwork(eventData);
      }

      // Show appropriate user notification
      if (responses.userNotification) {
        toast[responses.userNotification.type](responses.userNotification.title, {
          description: responses.userNotification.description,
          duration: responses.userNotification.duration || 5000
        });
      }

    } catch (error) {
      // Log critical error in crisis handling
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'CRISIS_HANDLING_SYSTEM_ERROR',
        details: { 
          trigger_source: eventData.trigger_source,
          error_type: 'system_error'
        },
        severity: 'critical'
      });
    }
  };

  const determineCrisisResponse = async (eventData: any) => {
    const responses = {
      activateCrisisSystem: false,
      notifySupportNetwork: false,
      userNotification: null as any
    };

    switch (eventData.trigger_source) {
      case 'halt_assessment':
        if (eventData.severity === 'crisis') {
          responses.activateCrisisSystem = true;
          responses.notifySupportNetwork = true;
          responses.userNotification = {
            type: 'warning',
            title: 'Multiple HALT warning signs detected',
            description: 'Your support network has been notified. Crisis tools are available.',
            duration: 8000
          };
        }
        break;

      case 'craving_timer':
        if (eventData.trigger_data.intensity_before >= 8 && eventData.trigger_data.gave_up) {
          responses.activateCrisisSystem = true;
          responses.notifySupportNetwork = true;
          responses.userNotification = {
            type: 'warning',
            title: 'High-intensity craving detected',
            description: 'Emergency support is available. You\'re not alone.',
            duration: 6000
          };
        }
        break;

      case 'peer_chat':
        if (eventData.trigger_data.detected_keywords.some((k: string) => 
          ['kill myself', 'end it all', 'hurt myself'].includes(k))) {
          responses.activateCrisisSystem = true;
          responses.notifySupportNetwork = true;
          responses.userNotification = {
            type: 'warning',
            title: 'Crisis support activated',
            description: 'Professional support is being contacted immediately.',
            duration: 10000
          };
        }
        break;

      case 'playing_forward':
        if (eventData.trigger_data.is_vulnerable) {
          responses.notifySupportNetwork = true;
          responses.userNotification = {
            type: 'info',
            title: 'Support network notified',
            description: 'Someone who cares about you knows you\'re in a vulnerable moment.',
            duration: 5000
          };
        }
        break;

      case 'checkin_pattern':
        // Handle check-in pattern detection
        responses.userNotification = {
          type: 'warning',
          title: 'Concerning pattern detected',
          description: 'Your recent check-ins show you might need extra support.',
          duration: 6000
        };
        break;
    }

    return responses;
  };

  const notifySupportNetwork = async (eventData: any) => {
    if (!user) return;

    try {
      // Get user's support network
      const { data: supportNetwork } = await supabase
        .from('support_network')
        .select('supporter_id, supporter_name, relationship_type')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!supportNetwork || supportNetwork.length === 0) {
        // Log that no support network is available for crisis
        await EnhancedSecurityAuditService.logSecurityEvent({
          action: 'NO_SUPPORT_NETWORK_AVAILABLE',
          details: { crisis_severity: eventData.severity },
          severity: 'high'
        });
        return;
      }

      // Create notifications for each supporter
      const notifications = supportNetwork.map(supporter => ({
        user_id: user.id,
        supporter_id: supporter.supporter_id,
        notification_type: getSeverityNotificationType(eventData.severity),
        title: getNotificationTitle(eventData),
        message: getNotificationMessage(eventData, supporter.relationship_type),
        severity: eventData.severity,
        action_required: eventData.severity === 'crisis' || eventData.severity === 'high',
        metadata: {
          trigger_source: eventData.trigger_source,
          trigger_data: eventData.trigger_data
        }
      }));

      const { error } = await supabase
        .from('support_network_notifications')
        .insert(notifications);

      if (error) {
        // Log failed support network notification
        await EnhancedSecurityAuditService.logSecurityEvent({
          action: 'SUPPORT_NETWORK_NOTIFICATION_FAILED',
          details: { error_type: 'database_error', notification_count: notifications.length },
          severity: 'critical'
        });
        return;
      }

      // Log successful support network notification
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'SUPPORT_NETWORK_NOTIFIED',
        details: { notification_count: notifications.length, crisis_severity: eventData.severity },
        severity: 'low'
      });

    } catch (error) {
      // Log critical error in support network notification
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'SUPPORT_NETWORK_SYSTEM_ERROR',
        details: { error_type: 'system_error' },
        severity: 'critical'
      });
    }
  };

  const getSeverityNotificationType = (severity: string) => {
    switch (severity) {
      case 'crisis': return 'crisis_alert';
      case 'high': return 'support_request';
      case 'medium': return 'check_in_request';
      default: return 'general_update';
    }
  };

  const getNotificationTitle = (eventData: any) => {
    switch (eventData.trigger_source) {
      case 'halt_assessment':
        return 'HALT Assessment Alert';
      case 'craving_timer':
        return 'Craving Support Needed';
      case 'peer_chat':
        return 'Crisis Keywords Detected';
      case 'playing_forward':
        return 'Vulnerable Moment Alert';
      default:
        return 'Support Request';
    }
  };

  const getNotificationMessage = (eventData: any, relationshipType: string) => {
    const supporterType = relationshipType === 'sponsor' ? 'sponsor' : 'support person';
    
    switch (eventData.trigger_source) {
      case 'halt_assessment':
        return `Your sponsee is experiencing multiple HALT warning signs (hungry, angry, lonely, tired). As their ${supporterType}, they may need extra support right now.`;
      
      case 'craving_timer':
        return `Your sponsee experienced a high-intensity craving and may need encouragement. Consider reaching out as their ${supporterType}.`;
      
      case 'peer_chat':
        return `Crisis language was detected in your sponsee's peer chat messages. This requires immediate attention as their ${supporterType}.`;
      
      case 'playing_forward':
        return `Your sponsee is exploring difficult scenarios and may be in a vulnerable state. A check-in from their ${supporterType} could be helpful.`;
      
      default:
        return `Your sponsee may need additional support. Please consider reaching out as their ${supporterType}.`;
    }
  };

  // This component is invisible - it just provides integration services
  return <>{children}</>;
};

export default RecoverySystemIntegrator;