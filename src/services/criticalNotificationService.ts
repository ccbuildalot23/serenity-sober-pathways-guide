/**
 * Critical Notification Service
 * Handles real-time support network notifications
 */

import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Notification types
export type UrgencyLevel = 'crisis' | 'need_connection' | 'celebrate' | 'check_in';
export type NotificationChannel = 'in_app' | 'whatsapp' | 'email' | 'push';
export type AcknowledgmentType = 'immediate' | 'on_my_way' | 'cant_help' | 'delegated';

export interface SupportRequest {
  id: string;
  userId: string;
  urgencyLevel: UrgencyLevel;
  message?: string;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  status: string;
  createdAt: string;
  notifiedAt?: string;
  firstAcknowledgedAt?: string;
  acknowledgmentCount: number;
}

export interface NotificationRecipient {
  id: string;
  requestId: string;
  recipientId: string;
  channel: NotificationChannel;
  deliveryStatus: string;
  sentAt?: string;
  deliveredAt?: string;
  readAt?: string;
  acknowledgedAt?: string;
  acknowledgmentMessage?: string;
  acknowledgmentType?: AcknowledgmentType;
}

export interface SupportNetworkMember {
  id: string;
  userId: string;
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
  private userId: string | null = null;
  private isInitialized = false;

  // Event handlers
  private onNewRequest?: (request: SupportRequest) => void;
  private onAcknowledgment?: (recipient: NotificationRecipient) => void;
  private onStatusUpdate?: (request: SupportRequest) => void;

  /**
   * Initialize the notification service for a user
   */
  async initialize(userId: string) {
    if (this.isInitialized && this.userId === userId) {
      return;
    }

    this.userId = userId;
    
    // Load support network
    await this.loadSupportNetwork();
    
    // Subscribe to real-time channels
    this.subscribeToNotifications();
    this.subscribeToAcknowledgments();
    
    // Load any pending requests
    await this.loadPendingRequests();
    
    this.isInitialized = true;
    console.log('Critical notification service initialized for user:', userId);
  }

  /**
   * Load user's support network
   */
  private async loadSupportNetwork() {
    if (!this.userId) return;

    const { data, error } = await supabase
      .from('support_network_members')
      .select('*')
      .eq('user_id', this.userId)
      .eq('is_active', true)
      .order('priority_order', { ascending: true });

    if (error) {
      console.error('Failed to load support network:', error);
      return;
    }

    this.supportNetwork = data || [];
  }

  /**
   * Load pending support requests
   */
  private async loadPendingRequests() {
    if (!this.userId) return;

    // Load requests where user is the requester
    const { data: myRequests } = await supabase
      .from('notification_requests')
      .select('*, notification_recipients(*)')
      .eq('user_id', this.userId)
      .in('status', ['pending', 'notified', 'acknowledged'])
      .order('created_at', { ascending: false });

    // Load requests where user is a recipient
    const { data: recipientRequests } = await supabase
      .from('notification_recipients')
      .select('*, notification_requests(*)')
      .eq('recipient_id', this.userId)
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
    if (!this.userId) return;

    // Personal notification channel
    const personalChannel = supabase
      .channel(`notifications:${this.userId}`)
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

    this.channels.set('personal', personalChannel);

    // Database changes channel for notification_recipients
    const recipientsChannel = supabase
      .channel('notification_recipients_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_recipients',
          filter: `recipient_id=eq.${this.userId}`
        },
        (payload: RealtimePostgresChangesPayload<NotificationRecipient>) => {
          this.handleRecipientChange(payload);
        }
      )
      .subscribe();

    this.channels.set('recipients', recipientsChannel);
  }

  /**
   * Subscribe to acknowledgment updates
   */
  private subscribeToAcknowledgments() {
    if (!this.userId) return;

    const acknowledgeChannel = supabase
      .channel('acknowledgments')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notification_recipients'
        },
        (payload: RealtimePostgresChangesPayload<NotificationRecipient>) => {
          // Check if this acknowledgment is for one of our requests
          const requestId = (payload.new as any)?.request_id;
          if (requestId && this.activeRequests.has(requestId)) {
            this.handleAcknowledgmentUpdate(payload.new as NotificationRecipient);
          }
        }
      )
      .subscribe();

    this.channels.set('acknowledgments', acknowledgeChannel);
  }

  /**
   * Handle new support request notification
   */
  private handleNewSupportRequest(payload: any) {
    const { requestId, urgencyLevel, message, fromUserId, timestamp } = payload;

    // Show notification
    this.showNotification(urgencyLevel, message, fromUserId);

    // Update active requests
    this.loadRequestDetails(requestId);

    // Trigger event handler
    if (this.onNewRequest) {
      this.onNewRequest({
        id: requestId,
        userId: fromUserId,
        urgencyLevel,
        message,
        status: 'notified',
        createdAt: timestamp,
        acknowledgmentCount: 0
      });
    }
  }

  /**
   * Handle acknowledgment from support member
   */
  private handleAcknowledgment(payload: any) {
    const { requestId, acknowledgedBy, acknowledgmentType, message, responseTimeMinutes } = payload;

    // Update request status
    const request = this.activeRequests.get(requestId);
    if (request) {
      request.acknowledgmentCount++;
      if (!request.firstAcknowledgedAt) {
        request.firstAcknowledgedAt = new Date().toISOString();
        request.status = 'acknowledged';
      }
      this.activeRequests.set(requestId, request);
    }

    // Show notification
    toast.success('Support acknowledged!', {
      description: `Response received in ${responseTimeMinutes} minutes`,
      duration: 5000
    });

    // Trigger event handler
    if (this.onAcknowledgment) {
      this.onAcknowledgment({
        id: '',
        requestId,
        recipientId: acknowledgedBy,
        channel: 'in_app',
        deliveryStatus: 'acknowledged',
        acknowledgedAt: new Date().toISOString(),
        acknowledgmentMessage: message,
        acknowledgmentType
      });
    }
  }

  /**
   * Handle WhatsApp acknowledgment
   */
  private handleWhatsAppAcknowledgment(payload: any) {
    const { requestId, acknowledgedBy, message, timestamp } = payload;

    toast.success('WhatsApp acknowledgment received!', {
      description: `From: ${acknowledgedBy}`,
      duration: 5000
    });

    // Update request
    const request = this.activeRequests.get(requestId);
    if (request) {
      request.acknowledgmentCount++;
      this.activeRequests.set(requestId, request);
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
  private handleAcknowledgmentUpdate(recipient: any) {
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
  private async loadRequestDetails(requestId: string) {
    const { data, error } = await supabase
      .from('notification_requests')
      .select('*, notification_recipients(*)')
      .eq('id', requestId)
      .single();

    if (!error && data) {
      this.activeRequests.set(requestId, this.mapToSupportRequest(data));
      if (data.notification_recipients) {
        this.pendingNotifications.set(requestId, data.notification_recipients);
      }
    }
  }

  /**
   * Show notification to user
   */
  private showNotification(urgencyLevel: UrgencyLevel, message?: string, fromUserId?: string) {
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

    toast(urgencyText[urgencyLevel], {
      description: message || 'Tap to respond',
      icon: urgencyEmoji[urgencyLevel],
      duration: urgencyLevel === 'crisis' ? 0 : 10000, // Crisis notifications don't auto-dismiss
      action: {
        label: 'Respond',
        onClick: () => this.openResponseModal(fromUserId)
      }
    });

    // Play sound for crisis
    if (urgencyLevel === 'crisis') {
      this.playNotificationSound();
    }
  }

  /**
   * Play notification sound
   */
  private playNotificationSound() {
    // Create and play a notification sound
    const audio = new Audio('/notification-sound.mp3');
    audio.play().catch(e => console.log('Could not play sound:', e));
  }

  /**
   * Open response modal
   */
  private openResponseModal(requestId?: string) {
    // This would trigger a modal in your UI
    window.dispatchEvent(new CustomEvent('open-support-response', { 
      detail: { requestId } 
    }));
  }

  /**
   * Map database record to SupportRequest
   */
  private mapToSupportRequest(record: any): SupportRequest {
    return {
      id: record.id,
      userId: record.user_id,
      urgencyLevel: record.urgency_level,
      message: record.custom_message,
      location: record.location,
      status: record.status,
      createdAt: record.created_at,
      notifiedAt: record.notified_at,
      firstAcknowledgedAt: record.first_acknowledged_at,
      acknowledgmentCount: record.acknowledgment_count || 0
    };
  }

  /**
   * Request support from network
   */
  async requestSupport(
    urgencyLevel: UrgencyLevel,
    message?: string,
    includeLocation: boolean = false
  ): Promise<string> {
    let location;
    
    if (includeLocation) {
      location = await this.getCurrentLocation();
    }

    const { data, error } = await supabase.functions.invoke('support-request', {
      body: {
        urgencyLevel,
        message,
        location
      }
    });

    if (error) {
      throw error;
    }

    return data.requestId;
  }

  /**
   * Acknowledge a support request
   */
  async acknowledgeRequest(
    requestId: string,
    message?: string,
    acknowledgmentType: AcknowledgmentType = 'immediate'
  ): Promise<boolean> {
    const { data, error } = await supabase.functions.invoke('acknowledge-support', {
      body: {
        requestId,
        message,
        acknowledgmentType
      }
    });

    if (error) {
      throw error;
    }

    return data.success;
  }

  /**
   * Get current location
   */
  private getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy: number } | undefined> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(undefined);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          console.warn('Location error:', error);
          resolve(undefined);
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
    return allNotifications.filter(n => !n.acknowledgedAt);
  }

  /**
   * Cleanup and disconnect
   */
  disconnect() {
    this.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.activeRequests.clear();
    this.pendingNotifications.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const criticalNotificationService = new CriticalNotificationService();