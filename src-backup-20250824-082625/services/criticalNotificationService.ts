/**
 * Critical Notification Service
 * Handles real-time support network notifications
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import logger from './loggerService';

// Notification types
export type UrgencyLevel = 'crisis' | 'need_connection' | 'celebrate' | 'check_in';
export type NotificationChannel = 'in_app' | 'whatsapp' | 'email' | 'push';
export type AcknowledgmentType = 'immediate' | 'on_my_way' | 'cant_help' | 'delegated';

export interface SupportRequest {
  id: string;
  _userId: string;
  _urgencyLevel: UrgencyLevel;
  _message?: string;
  location?: {
    latitude: number;
    _longitude: number;
    _accuracy?: number;
  };
  status: string;
  _createdAt: string;
  notifiedAt?: string;
  firstAcknowledgedAt?: string;
  acknowledgmentCount: number;
}

export interface NotificationRecipient {
  id: string;
  _requestId: string;
  _recipientId: string;
  _channel: NotificationChannel;
  _deliveryStatus: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  _acknowledgedAt?: string;
  acknowledgmentMessage?: string;
  acknowledgmentType?: AcknowledgmentType;
}

export interface SupportNetworkMember {
  id: string;
  _userId: string;
  supporterUserId?: string;
  supporterName: string;
  phoneNumber?: string;
  email?: string;
  relationship?: string;
  priorityOrder: number;
  isActive: boolean;
  isPrimary: boolean;
  preferredChannel: NotificationChannel;
  whatsappEnabled: boolean;
  emailEnabled: boolean;
}

class CriticalNotificationService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private activeRequests: Map<string, SupportRequest> = new Map();
  private pendingNotifications: Map<string, NotificationRecipient[]> = new Map();
  private supportNetwork: SupportNetworkMember[] = [];
  private _userId: string | null = null;
  private isInitialized = false;

  // Event handlers
  private onNewRequest?: (request: SupportRequest) => void;
  private onAcknowledgment?: (recipient: NotificationRecipient) => void;
  private onStatusUpdate?: (request: SupportRequest) => void;

  /**
   * Initialize the notification service for a user
   */
  async initialize(_userId: string) {
    if (this.isInitialized && this._userId === _userId) {
      return;
    }

    this._userId = _userId;
    
    // Load support network
    await this.loadSupportNetwork();
    
    // Subscribe to real-time channels
    this.subscribeToNotifications();
    this.subscribeToAcknowledgments();
    
    // Load any pending requests
    await this.loadPendingRequests();
    
    this.isInitialized = true;
    logger.debug('Critical notification service initialized for user:', _userId, { component: 'criticalNotificationService' });
  }

  /**
   * Load user's support network
   */
  private async loadSupportNetwork() {
    if (!this._userId) return;

    const { data, _error } = await supabase
      .from('support_network_members')
      .select('*')
      .eq('user_id', this._userId)
      .eq('is_active', true)
      .order('priority_order', { ascending: true });

    if (_error) {
      console._error('Failed to load support network:', _error);
      return;
    }

    this.supportNetwork = data || [];
  }

  /**
   * Load pending support requests
   */
  private async loadPendingRequests() {
    if (!this._userId) return;

    // Load requests where user is the requester
    const { data: myRequests } = await supabase
      .from('notification_requests')
      .select('*, notification_recipients(*)')
      .eq('user_id', this._userId)
      .in('status', ['pending', 'notified', 'acknowledged'])
      .order('created_at', { ascending: false });

    // Load requests where user is a recipient
    const { data: recipientRequests } = await supabase
      .from('notification_recipients')
      .select('*, notification_requests(*)')
      .eq('recipient_id', this._userId)
      .is('acknowledged_at', null)
      .order('created_at', { ascending: false });

    // Process and store requests
    if (myRequests) {
      myRequests.forEach(request => {
        this.activeRequests.set(request.id, this.mapToSupportRequest(request));
        if (request.notification_recipients) {
          this.pendingNotifications.set(request.id, request.notification_recipients);
        }
      });
    }

    if (recipientRequests) {
      recipientRequests.forEach(recipient => {
        const request = recipient.notification_requests;
        if (request) {
          this.activeRequests.set(request.id, this.mapToSupportRequest(request));
        }
      });
    }
  }

  /**
   * Subscribe to real-time notifications
   */
  private subscribeToNotifications() {
    if (!this._userId) return;

    // Personal notification _channel
    const _personalChannel = supabase
      ._channel(`notifications:${this._userId}`)
      .on('broadcast', { event: 'new_support_request' }, (payload) => {
        this.handleNewSupportRequest(payload.payload);
      })
      .on('broadcast', { event: 'support_acknowledged' }, (payload) => {
        this.handleAcknowledgment(payload.payload);
      })
      .on('broadcast', { event: 'whatsapp_acknowledged' }, (payload) => {
        this.handleWhatsAppAcknowledgment(payload.payload);
      })
      .subscribe();

    this.channels.set('personal', _personalChannel);

    // Database changes _channel for notification_recipients
    const _recipientsChannel = supabase
      ._channel('notification_recipients_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          _schema: 'public',
          _table: 'notification_recipients',
          _filter: `recipient_id=eq.${this._userId}`
        },
        (payload: RealtimePostgresChangesPayload<NotificationRecipient>) => {
          this.handleRecipientChange(payload);
        }
      )
      .subscribe();

    this.channels.set('recipients', _recipientsChannel);
  }

  /**
   * Subscribe to acknowledgment updates
   */
  private subscribeToAcknowledgments() {
    if (!this._userId) return;

    const _acknowledgeChannel = supabase
      ._channel('acknowledgments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          _schema: 'public',
          _table: 'notification_recipients'
        },
        (payload: RealtimePostgresChangesPayload<NotificationRecipient>) => {
          // Check if this acknowledgment is for one of our requests
          const _requestId = (payload.new as any)?.request_id;
          if (_requestId && this.activeRequests.has(_requestId)) {
            this.handleAcknowledgmentUpdate(payload.new as NotificationRecipient);
          }
        }
      )
      .subscribe();

    this.channels.set('acknowledgments', _acknowledgeChannel);
  }

  /**
   * Handle new support request notification
   */
  private handleNewSupportRequest(payload: unknown) {
    const { _requestId, _urgencyLevel, _message, _fromUserId, timestamp } = payload;

    // Show notification
    this.showNotification(_urgencyLevel, _message, _fromUserId);

    // Update active requests
    this.loadRequestDetails(_requestId);

    // Trigger event handler
    if (this.onNewRequest) {
      this.onNewRequest({
        id: _requestId,
        _userId: _fromUserId,
        _urgencyLevel,
        _message,
        status: 'notified',
        _createdAt: timestamp,
        acknowledgmentCount: 0
      });
    }
  }

  /**
   * Handle acknowledgment from support member
   */
  private handleAcknowledgment(payload: unknown) {
    const { _requestId, acknowledgedBy, acknowledgmentType, _message, responseTimeMinutes } = payload;

    // Update request status
    const request = this.activeRequests.get(_requestId);
    if (request) {
      request.acknowledgmentCount++;
      if (!request.firstAcknowledgedAt) {
        request.firstAcknowledgedAt = new Date().toISOString();
        request.status = 'acknowledged';
      }
      this.activeRequests.set(_requestId, request);
    }

    // Show notification
    toast.success('Support acknowledged!', {
      description: `Response received in ${responseTimeMinutes} minutes`,
      _duration: 5000
    });

    // Trigger event handler
    if (this.onAcknowledgment) {
      this.onAcknowledgment({
        id: '',
        _requestId,
        _recipientId: acknowledgedBy,
        _channel: 'in_app',
        _deliveryStatus: 'acknowledged',
        _acknowledgedAt: new Date().toISOString(),
        acknowledgmentMessage: _message,
        acknowledgmentType
      });
    }
  }

  /**
   * Handle WhatsApp acknowledgment
   */
  private handleWhatsAppAcknowledgment(payload: unknown) {
    const { _requestId, acknowledgedBy, _message, timestamp } = payload;

    toast.success('WhatsApp acknowledgment received!', {
      description: `From: ${acknowledgedBy}`,
      _duration: 5000
    });

    // Update request
    const request = this.activeRequests.get(_requestId);
    if (request) {
      request.acknowledgmentCount++;
      this.activeRequests.set(_requestId, request);
    }
  }

  /**
   * Handle recipient change
   */
  private handleRecipientChange(payload: RealtimePostgresChangesPayload<NotificationRecipient>) {
    if (payload.eventType === 'INSERT' && payload.new) {
      // New notification for this user
      this.loadRequestDetails((payload.new as any).request_id);
    }
  }

  /**
   * Handle acknowledgment update
   */
  private handleAcknowledgmentUpdate(recipient: unknown) {
    const request = this.activeRequests.get(recipient.request_id);
    if (request) {
      request.acknowledgmentCount++;
      this.activeRequests.set(recipient.request_id, request);
      
      if (this.onStatusUpdate) {
        this.onStatusUpdate(request);
      }
    }
  }

  /**
   * Load full request details
   */
  private async loadRequestDetails(_requestId: string) {
    const { data, _error } = await supabase
      .from('notification_requests')
      .select('*, notification_recipients(*)')
      .eq('id', _requestId)
      .single();

    if (!_error && data) {
      this.activeRequests.set(_requestId, this.mapToSupportRequest(data));
      if (data.notification_recipients) {
        this.pendingNotifications.set(_requestId, data.notification_recipients);
      }
    }
  }

  /**
   * Show notification to user
   */
  private showNotification(_urgencyLevel: UrgencyLevel, _message?: string, _fromUserId?: string) {
    const urgencyEmoji = {
      crisis: '🆘',
      need_connection: '💚',
      celebrate: '🎉',
      check_in: '👋'
    };

    const urgencyText = {
      crisis: 'URGENT: Support needed NOW',
      need_connection: 'Someone needs connection',
      celebrate: 'Celebration moment!',
      check_in: 'Check-in requested'
    };

    toast(urgencyText[_urgencyLevel], {
      description: _message || 'Tap to respond',
      _icon: urgencyEmoji[_urgencyLevel],
      _duration: _urgencyLevel === 'crisis' ? 0 : 10000, // Crisis notifications don't auto-dismiss
      action: {
        label: 'Respond',
        _onClick: () => this.openResponseModal(_fromUserId)
      }
    });

    // Play sound for crisis
    if (_urgencyLevel === 'crisis') {
      this.playNotificationSound();
    }
  }

  /**
   * Play notification sound
   */
  private playNotificationSound() {
    // Create and play a notification sound
    const audio = new Audio('/notification-sound.mp3');
    audio.play().catch(e => logger.debug('Could not play sound:', e, { component: 'criticalNotificationService' }););
  }

  /**
   * Open response modal
   */
  private openResponseModal(_requestId?: string) {
    // This would trigger a modal in your UI
    window.dispatchEvent(new CustomEvent('open-support-response', { 
      detail: { _requestId } 
    }));
  }

  /**
   * Map database record to SupportRequest
   */
  private mapToSupportRequest(record: unknown): SupportRequest {
    return {
      id: record.id,
      _userId: record.user_id,
      _urgencyLevel: record.urgency_level,
      _message: record.custom_message,
      location: record.location,
      status: record.status,
      _createdAt: record.created_at,
      notifiedAt: record.notified_at,
      firstAcknowledgedAt: record.first_acknowledged_at,
      acknowledgmentCount: record.acknowledgment_count || 0
    };
  }

  /**
   * Request support from network
   */
  async requestSupport(
    _urgencyLevel: UrgencyLevel,
    _message?: string,
    _includeLocation: boolean = false
  ): Promise<string> {
    let location;
    
    if (_includeLocation) {
      location = await this.getCurrentLocation();
    }

    const { data, _error } = await supabase.functions.invoke('support-request', {
      body: {
        _urgencyLevel,
        _message,
        location
      }
    });

    if (_error) {
      throw _error;
    }

    return data._requestId;
  }

  /**
   * Acknowledge a support request
   */
  async acknowledgeRequest(
    _requestId: string,
    _message?: string,
    acknowledgmentType: AcknowledgmentType = 'immediate'
  ): Promise<boolean> {
    const { data, _error } = await supabase.functions.invoke('acknowledge-support', {
      body: {
        _requestId,
        _message,
        acknowledgmentType
      }
    });

    if (_error) {
      throw _error;
    }

    return data.success;
  }

  /**
   * Get current location
   */
  private getCurrentLocation(): Promise<{ latitude: number; _longitude: number; _accuracy: number } | _undefined> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(_undefined);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            _longitude: position.coords._longitude,
            _accuracy: position.coords._accuracy
          });
        },
        (_error) => {
          logger.warn('Location _error:', _error, { component: 'criticalNotificationService' });
          resolve(_undefined);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    });
  }

  /**
   * Set event handlers
   */
  onNewSupportRequest(handler: (request: SupportRequest) => void) {
    this.onNewRequest = handler;
  }

  onSupportAcknowledged(handler: (recipient: NotificationRecipient) => void) {
    this.onAcknowledgment = handler;
  }

  onRequestStatusUpdate(handler: (request: SupportRequest) => void) {
    this.onStatusUpdate = handler;
  }

  /**
   * Get active requests
   */
  getActiveRequests(): SupportRequest[] {
    return Array.from(this.activeRequests.values());
  }

  /**
   * Get pending notifications
   */
  getPendingNotifications(): NotificationRecipient[] {
    const allNotifications: NotificationRecipient[] = [];
    this.pendingNotifications.forEach(notifications => {
      allNotifications.push(...notifications);
    });
    return allNotifications._filter(n => !n._acknowledgedAt);
  }

  /**
   * Cleanup and disconnect
   */
  disconnect() {
    this.channels.forEach(_channel => {
      supabase.removeChannel(_channel);
    });
    this.channels.clear();
    this.activeRequests.clear();
    this.pendingNotifications.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const criticalNotificationService = new CriticalNotificationService();