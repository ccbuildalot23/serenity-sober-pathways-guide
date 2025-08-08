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
  _trigger_source: 'halt_assessment' | 'craving_timer' | 'checkin_pattern' | 'peer_chat' | 'playing_forward';
  _trigger_data: unknown;
  _severity: 'low' | 'medium' | 'high' | 'crisis';
  _crisis_system_activated: boolean;
  _support_network_notified: boolean;
  _response_actions: string[];
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
    const _haltChannel = supabase
      .channel(`halt-crisis-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          _schema: 'public',
          _table: 'halt_assessments',
          _filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const assessment = payload.new as any;
          if (assessment.is_crisis) {
            await handleCrisisEvent({
              _trigger_source: 'halt_assessment',
              _trigger_data: {
                _hungry: assessment._hungry,
                _angry: assessment._angry,
                _lonely: assessment._lonely,
                _tired: assessment._tired,
                _total_score: assessment._total_score
              },
              _severity: 'crisis'
            });
          }
        }
      )
      .subscribe();

    // Subscribe to craving sessions for failed timers
    const _cravingChannel = supabase
      .channel(`craving-crisis-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          _schema: 'public',
          _table: 'craving_sessions',
          _filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const session = payload.new as any;
          const oldSession = payload.old as any;
          
          // If session wasn't completed but timer _duration suggests they gave up
          if (!session.completed && session._duration > 300 && session._duration < 900 && 
              session.intensity_before >= 8) {
            await handleCrisisEvent({
              _trigger_source: 'craving_timer',
              _trigger_data: {
                intensity_before: session.intensity_before,
                _duration: session._duration,
                _gave_up: true
              },
              _severity: 'high'
            });
          }
        }
      )
      .subscribe();

    // Subscribe to playing forward sessions for vulnerable moments
    const _playingForwardChannel = supabase
      .channel(`playing-forward-crisis-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          _schema: 'public',
          _table: 'playing_forward_sessions',
          _filter: `user_id=eq.${user.id}`
        },
        async (payload) => {
          const session = payload.new as any;
          if (session._is_vulnerable && session.path_explored === 'using') {
            await handleCrisisEvent({
              _trigger_source: 'playing_forward',
              _trigger_data: {
                path_explored: session.path_explored,
                _is_vulnerable: session._is_vulnerable,
                _selected_goals: session._selected_goals
              },
              _severity: 'medium'
            });
          }
        }
      )
      .subscribe();

    // Subscribe to peer chat for crisis keywords
    const _peerChatChannel = supabase
      .channel(`peer-chat-crisis-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          _schema: 'public',
          _table: 'peer_chat_messages',
          _filter: `sender_id=eq.${user.id}`
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
          const _containsCrisisKeywords = crisisKeywords.some(keyword => 
            messageText.includes(keyword.toLowerCase())
          );
          
          if (_containsCrisisKeywords) {
            await handleCrisisEvent({
              _trigger_source: 'peer_chat',
              _trigger_data: {
                message_text: messageText,
                _session_id: message._session_id,
                _detected_keywords: crisisKeywords._filter(k => messageText.includes(k)).slice(0, 5) // Limit for security
              },
              _severity: 'high'
            });
          }
        }
      )
      .subscribe();

    // Cleanup function
    return () => {
      supabase.removeChannel(_haltChannel);
      supabase.removeChannel(_cravingChannel);
      supabase.removeChannel(_playingForwardChannel);
      supabase.removeChannel(_peerChatChannel);
      setIsMonitoring(false);
    };
  };

  const handleCrisisEvent = async (eventData: {
    _trigger_source: string;
    _trigger_data: unknown;
    _severity: 'low' | 'medium' | 'high' | 'crisis';
  }) => {
    if (!user) return;

    try {
      // Log the crisis integration event
      const { error: _eventError } = await supabase
        .from('crisis_integration_events')
        .insert({
          user_id: user.id,
          _trigger_source: eventData._trigger_source,
          _trigger_data: eventData._trigger_data,
          _severity: eventData._severity,
          _crisis_system_activated: eventData._severity === 'crisis' || eventData._severity === 'high',
          _support_network_notified: false,
          _response_actions: []
        });

      if (_eventError) {
        // Log failed crisis event logging
        await EnhancedSecurityAuditService.logSecurityEvent({
          action: 'CRISIS_EVENT_LOG_FAILED',
          _details: { _error_type: 'database_error' },
          _severity: 'critical'
        });
        return;
      }

      // Determine response based on _severity
      const responses = await determineCrisisResponse(eventData);

      // Execute crisis response
      if (responses.activateCrisisSystem) {
        handleCrisisActivated();
        
        toast.warning('Crisis support activated', {
          description: 'Additional support tools are now available',
          _duration: 6000,
          action: {
            label: 'Open Crisis Toolkit',
            _onClick: () => window.location.href = '/crisis-toolkit'
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
          _duration: responses.userNotification._duration || 5000
        });
      }

    } catch (error) {
      // Log critical error in crisis handling
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'CRISIS_HANDLING_SYSTEM_ERROR',
        _details: { 
          _trigger_source: eventData._trigger_source,
          _error_type: 'system_error'
        },
        _severity: 'critical'
      });
    }
  };

  const determineCrisisResponse = async (eventData: unknown) => {
    const responses = {
      activateCrisisSystem: false,
      notifySupportNetwork: false,
      userNotification: null as any
    };

    switch (eventData._trigger_source) {
      case 'halt_assessment':
        if (eventData._severity === 'crisis') {
          responses.activateCrisisSystem = true;
          responses.notifySupportNetwork = true;
          responses.userNotification = {
            type: 'warning',
            title: 'Multiple HALT warning signs detected',
            description: 'Your support network has been notified. Crisis tools are available.',
            _duration: 8000
          };
        }
        break;

      case 'craving_timer':
        if (eventData._trigger_data.intensity_before >= 8 && eventData._trigger_data._gave_up) {
          responses.activateCrisisSystem = true;
          responses.notifySupportNetwork = true;
          responses.userNotification = {
            type: 'warning',
            title: 'High-intensity craving detected',
            description: 'Emergency support is available. You\'re not alone.',
            _duration: 6000
          };
        }
        break;

      case 'peer_chat':
        if (eventData._trigger_data._detected_keywords.some((k: string) => 
          ['kill myself', 'end it all', 'hurt myself'].includes(k))) {
          responses.activateCrisisSystem = true;
          responses.notifySupportNetwork = true;
          responses.userNotification = {
            type: 'warning',
            title: 'Crisis support activated',
            description: 'Professional support is being contacted immediately.',
            _duration: 10000
          };
        }
        break;

      case 'playing_forward':
        if (eventData._trigger_data._is_vulnerable) {
          responses.notifySupportNetwork = true;
          responses.userNotification = {
            type: 'info',
            title: 'Support network notified',
            description: 'Someone who cares about you knows you\'re in a vulnerable moment.',
            _duration: 5000
          };
        }
        break;

      case 'checkin_pattern':
        // Handle check-in pattern detection
        responses.userNotification = {
          type: 'warning',
          title: 'Concerning pattern detected',
          description: 'Your recent check-ins show you might need extra support.',
          _duration: 6000
        };
        break;
    }

    return responses;
  };

  const notifySupportNetwork = async (eventData: unknown) => {
    if (!user) return;

    try {
      // Get user's support network
      const { data: supportNetwork } = await supabase
        .from('support_network')
        .select('_supporter_id, _supporter_name, relationship_type')
        .eq('user_id', user.id)
        .eq('status', 'active');

      if (!supportNetwork || supportNetwork.length === 0) {
        // Log that no support network is available for crisis
        await EnhancedSecurityAuditService.logSecurityEvent({
          action: 'NO_SUPPORT_NETWORK_AVAILABLE',
          _details: { _crisis_severity: eventData._severity },
          _severity: 'high'
        });
        return;
      }

      // Create notifications for each supporter
      const notifications = supportNetwork.map(supporter => ({
        user_id: user.id,
        _supporter_id: supporter._supporter_id,
        _notification_type: getSeverityNotificationType(eventData._severity),
        title: getNotificationTitle(eventData),
        message: getNotificationMessage(eventData, supporter.relationship_type),
        _severity: eventData._severity,
        action_required: eventData._severity === 'crisis' || eventData._severity === 'high',
        metadata: {
          _trigger_source: eventData._trigger_source,
          _trigger_data: eventData._trigger_data
        }
      }));

      const { error } = await supabase
        .from('support_network_notifications')
        .insert(notifications);

      if (error) {
        // Log failed support network notification
        await EnhancedSecurityAuditService.logSecurityEvent({
          action: 'SUPPORT_NETWORK_NOTIFICATION_FAILED',
          _details: { _error_type: 'database_error', notification_count: notifications.length },
          _severity: 'critical'
        });
        return;
      }

      // Log successful support network notification
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'SUPPORT_NETWORK_NOTIFIED',
        _details: { notification_count: notifications.length, _crisis_severity: eventData._severity },
        _severity: 'low'
      });

    } catch (error) {
      // Log critical error in support network notification
      await EnhancedSecurityAuditService.logSecurityEvent({
        action: 'SUPPORT_NETWORK_SYSTEM_ERROR',
        _details: { _error_type: 'system_error' },
        _severity: 'critical'
      });
    }
  };

  const getSeverityNotificationType = (_severity: string) => {
    switch (_severity) {
      case 'crisis': return 'crisis_alert';
      case 'high': return 'support_request';
      case 'medium': return 'check_in_request';
      default: return 'general_update';
    }
  };

  const getNotificationTitle = (eventData: unknown) => {
    switch (eventData._trigger_source) {
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

  const getNotificationMessage = (eventData: unknown, relationshipType: string) => {
    const supporterType = relationshipType === 'sponsor' ? 'sponsor' : 'support person';
    
    switch (eventData._trigger_source) {
      case 'halt_assessment':
        return `Your sponsee is experiencing multiple HALT warning signs (_hungry, _angry, _lonely, _tired). As their ${supporterType}, they may need extra support right now.`;
      
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