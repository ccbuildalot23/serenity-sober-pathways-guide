/**
 * Response Coordination System
 * Manages multi-supporter responses to prevent chaos and ensure effective crisis intervention
 */

export interface ResponseCoordinator {
  trackResponse(response: SupporterResponse): Promise<CoordinationResult>;
  getActiveResponders(alertId: string): Promise<ActiveResponder[]>;
  claimResponse(alertId: string, supporterId: string): Promise<ClaimResult>;
  delegateResponse(fromSupporterId: string, toSupporterId: string, alertId: string): Promise<boolean>;
  escalateToNextTier(alertId: string, reason: string): Promise<EscalationResult>;
}

export interface SupporterResponse {
  alertId: string;
  supporterId: string;
  supporterName: string;
  responseType: 'acknowledged' | 'made_contact' | 'needs_help' | 'call_911' | 'in_transit' | 'unavailable';
  timestamp: Date;
  location?: string;
  estimatedArrival?: Date;
  message?: string;
  contactDuration?: number; // minutes with the person
}

export interface ActiveResponder {
  supporterId: string;
  name: string;
  status: 'acknowledged' | 'in_transit' | 'on_scene' | 'providing_support';
  responseTime: number; // seconds since alert
  location?: string;
  isPrimaryResponder: boolean;
}

export interface CoordinationResult {
  success: boolean;
  action: 'accepted' | 'delegated' | 'escalated' | 'resolved';
  primaryResponder?: string;
  backupResponders: string[];
  conflictResolution?: string;
  nextSteps: string[];
}

export interface ClaimResult {
  success: boolean;
  claimedBy: string;
  previousClaimer?: string;
  message: string;
}

export interface EscalationResult {
  escalated: boolean;
  newTier: string;
  contactsNotified: number;
  reason: string;
  professionalServicesEngaged: boolean;
}

export class ResponseCoordinatorService implements ResponseCoordinator {
  private activeResponses: Map<string, Map<string, SupporterResponse>> = new Map();
  private primaryResponders: Map<string, string> = new Map();
  private responseHistory: Map<string, SupporterResponse[]> = new Map();
  private escalationQueue: Map<string, EscalationRequest[]> = new Map();

  async trackResponse(response: SupporterResponse): Promise<CoordinationResult> {
    const { alertId, supporterId, responseType } = response;
    
    // Initialize alert tracking if needed
    if (!this.activeResponses.has(alertId)) {
      this.activeResponses.set(alertId, new Map());
      this.responseHistory.set(alertId, []);
    }

    // Store response
    const alertResponses = this.activeResponses.get(alertId)!;
    alertResponses.set(supporterId, response);
    
    // Add to history
    this.responseHistory.get(alertId)!.push(response);

    // Coordinate based on response type
    let result: CoordinationResult;
    
    switch (responseType) {
      case 'made_contact':
        result = await this.handleMadeContact(alertId, supporterId, response);
        break;
        
      case 'needs_help':
        result = await this.handleNeedsHelp(alertId, supporterId, response);
        break;
        
      case 'call_911':
        result = await this.handleEmergency(alertId, supporterId, response);
        break;
        
      case 'in_transit':
        result = await this.handleInTransit(alertId, supporterId, response);
        break;
        
      case 'unavailable':
        result = await this.handleUnavailable(alertId, supporterId);
        break;
        
      default: // 'acknowledged'
        result = await this.handleAcknowledged(alertId, supporterId);
        break;
    }

    // Log coordination decision
    this.logCoordination(alertId, supporterId, result);
    
    return result;
  }

  private async handleMadeContact(
    alertId: string, 
    supporterId: string, 
    response: SupporterResponse
  ): Promise<CoordinationResult> {
    // Set as primary responder if first to make contact
    if (!this.primaryResponders.has(alertId)) {
      this.primaryResponders.set(alertId, supporterId);
      
      // Notify other responders to stand down
      const otherResponders = await this.notifyStandDown(alertId, supporterId);
      
      return {
        success: true,
        action: 'accepted',
        primaryResponder: supporterId,
        backupResponders: otherResponders,
        nextSteps: [
          'Monitor situation',
          'Provide direct support',
          'Update status regularly',
          'Escalate if needed'
        ]
      };
    } else {
      // Already have primary responder
      const primaryId = this.primaryResponders.get(alertId)!;
      
      return {
        success: true,
        action: 'delegated',
        primaryResponder: primaryId,
        backupResponders: [supporterId],
        conflictResolution: `${supporterId} standing by as backup`,
        nextSteps: [
          'Remain available as backup',
          'Check in with primary responder',
          'Be ready to assist if escalated'
        ]
      };
    }
  }

  private async handleNeedsHelp(
    alertId: string,
    supporterId: string,
    response: SupporterResponse
  ): Promise<CoordinationResult> {
    // Escalate to additional supporters
    const escalation = await this.escalateToNextTier(alertId, response.message || 'Supporter needs assistance');
    
    // Get backup responders
    const backupResponders = await this.getAvailableBackups(alertId);
    
    return {
      success: true,
      action: 'escalated',
      primaryResponder: supporterId,
      backupResponders,
      nextSteps: [
        'Additional supporters notified',
        'Professional services on standby',
        'Maintain support until help arrives',
        'Document situation for handoff'
      ]
    };
  }

  private async handleEmergency(
    alertId: string,
    supporterId: string,
    response: SupporterResponse
  ): Promise<CoordinationResult> {
    // Immediate emergency protocol
    this.primaryResponders.set(alertId, supporterId);
    
    // Notify all available supporters
    const allResponders = await this.notifyEmergencyProtocol(alertId);
    
    return {
      success: true,
      action: 'escalated',
      primaryResponder: supporterId,
      backupResponders: allResponders,
      conflictResolution: 'EMERGENCY PROTOCOL ACTIVATED',
      nextSteps: [
        '911 services dispatched',
        'All supporters notified',
        'Location shared with emergency services',
        'Family contacts being notified',
        'Crisis team mobilized'
      ]
    };
  }

  private async handleInTransit(
    alertId: string,
    supporterId: string,
    response: SupporterResponse
  ): Promise<CoordinationResult> {
    const alertResponses = this.activeResponses.get(alertId)!;
    
    // Check if someone already made contact
    const contactMade = Array.from(alertResponses.values())
      .some(r => r.responseType === 'made_contact');
    
    if (contactMade) {
      return {
        success: true,
        action: 'delegated',
        primaryResponder: this.primaryResponders.get(alertId),
        backupResponders: [supporterId],
        conflictResolution: 'Contact already made, stand down unless needed',
        nextSteps: ['Monitor situation', 'Remain available as backup']
      };
    }
    
    // Track ETA and coordinate arrivals
    const otherInTransit = Array.from(alertResponses.values())
      .filter(r => r.supporterId !== supporterId && r.responseType === 'in_transit');
    
    return {
      success: true,
      action: 'accepted',
      backupResponders: otherInTransit.map(r => r.supporterId),
      nextSteps: [
        `ETA: ${response.estimatedArrival?.toLocaleTimeString() || 'Unknown'}`,
        'Proceed to location',
        'Update status upon arrival',
        `${otherInTransit.length} other supporters also en route`
      ]
    };
  }

  private async handleUnavailable(alertId: string, supporterId: string): Promise<CoordinationResult> {
    // Remove from active responders
    const alertResponses = this.activeResponses.get(alertId)!;
    alertResponses.delete(supporterId);
    
    // Check if we need to escalate
    const activeCount = alertResponses.size;
    if (activeCount < 2) {
      await this.escalateToNextTier(alertId, 'Insufficient responders available');
    }
    
    return {
      success: true,
      action: 'delegated',
      backupResponders: Array.from(alertResponses.keys()),
      nextSteps: ['Supporter marked unavailable', 'Others notified to respond']
    };
  }

  private async handleAcknowledged(alertId: string, supporterId: string): Promise<CoordinationResult> {
    const alertResponses = this.activeResponses.get(alertId)!;
    
    return {
      success: true,
      action: 'accepted',
      backupResponders: Array.from(alertResponses.keys()).filter(id => id !== supporterId),
      nextSteps: [
        'Alert acknowledged',
        'Awaiting further action',
        'Other supporters also notified'
      ]
    };
  }

  async getActiveResponders(alertId: string): Promise<ActiveResponder[]> {
    const alertResponses = this.activeResponses.get(alertId);
    if (!alertResponses) return [];
    
    const primaryId = this.primaryResponders.get(alertId);
    const now = Date.now();
    
    return Array.from(alertResponses.values()).map(response => {
      const responseTime = Math.floor((now - response.timestamp.getTime()) / 1000);
      
      let status: ActiveResponder['status'] = 'acknowledged';
      if (response.responseType === 'made_contact') {
        status = 'on_scene';
      } else if (response.responseType === 'in_transit') {
        status = 'in_transit';
      } else if (response.contactDuration && response.contactDuration > 0) {
        status = 'providing_support';
      }
      
      return {
        supporterId: response.supporterId,
        name: response.supporterName,
        status,
        responseTime,
        location: response.location,
        isPrimaryResponder: response.supporterId === primaryId
      };
    });
  }

  async claimResponse(alertId: string, supporterId: string): Promise<ClaimResult> {
    const currentPrimary = this.primaryResponders.get(alertId);
    
    if (currentPrimary === supporterId) {
      return {
        success: false,
        claimedBy: supporterId,
        message: 'Already the primary responder'
      };
    }
    
    // Allow claim if no primary or if claiming with higher priority
    if (!currentPrimary) {
      this.primaryResponders.set(alertId, supporterId);
      return {
        success: true,
        claimedBy: supporterId,
        message: 'Successfully claimed as primary responder'
      };
    }
    
    // Handle claim conflict
    return {
      success: false,
      claimedBy: currentPrimary,
      previousClaimer: currentPrimary,
      message: `Already claimed by ${currentPrimary}. Coordinate with them or escalate if needed.`
    };
  }

  async delegateResponse(
    fromSupporterId: string, 
    toSupporterId: string, 
    alertId: string
  ): Promise<boolean> {
    const currentPrimary = this.primaryResponders.get(alertId);
    
    if (currentPrimary !== fromSupporterId) {
      return false; // Can only delegate if you're the primary
    }
    
    // Transfer primary responsibility
    this.primaryResponders.set(alertId, toSupporterId);
    
    // Log the delegation
    const response: SupporterResponse = {
      alertId,
      supporterId: toSupporterId,
      supporterName: `Delegated from ${fromSupporterId}`,
      responseType: 'acknowledged',
      timestamp: new Date(),
      message: `Taking over from ${fromSupporterId}`
    };
    
    await this.trackResponse(response);
    
    return true;
  }

  async escalateToNextTier(alertId: string, reason: string): Promise<EscalationResult> {
    // Initialize escalation queue if needed
    if (!this.escalationQueue.has(alertId)) {
      this.escalationQueue.set(alertId, []);
    }
    
    const escalationRequest: EscalationRequest = {
      alertId,
      reason,
      timestamp: new Date(),
      tier: this.getNextTier(alertId)
    };
    
    this.escalationQueue.get(alertId)!.push(escalationRequest);
    
    // Simulate escalation (in real system, would notify next tier)
    const contactsNotified = await this.notifyTier(escalationRequest.tier, alertId);
    
    return {
      escalated: true,
      newTier: escalationRequest.tier,
      contactsNotified,
      reason,
      professionalServicesEngaged: escalationRequest.tier === 'emergency'
    };
  }

  // Helper methods
  private async notifyStandDown(alertId: string, primarySupporterId: string): Promise<string[]> {
    const alertResponses = this.activeResponses.get(alertId);
    if (!alertResponses) return [];
    
    return Array.from(alertResponses.keys()).filter(id => id !== primarySupporterId);
  }

  private async getAvailableBackups(alertId: string): Promise<string[]> {
    const alertResponses = this.activeResponses.get(alertId);
    if (!alertResponses) return [];
    
    return Array.from(alertResponses.values())
      .filter(r => r.responseType === 'acknowledged' || r.responseType === 'in_transit')
      .map(r => r.supporterId);
  }

  private async notifyEmergencyProtocol(alertId: string): Promise<string[]> {
    // In real system, would trigger emergency notifications
    console.log(`[EMERGENCY] Protocol activated for alert ${alertId}`);
    return ['911', 'crisis_team', 'family_emergency_contact'];
  }

  private getNextTier(alertId: string): string {
    const history = this.responseHistory.get(alertId) || [];
    const tiersNotified = new Set(history.map(r => this.getTierFromResponse(r)));
    
    if (!tiersNotified.has('secondary')) return 'secondary';
    if (!tiersNotified.has('emergency')) return 'emergency';
    return 'professional';
  }

  private getTierFromResponse(response: SupporterResponse): string {
    // In real system, would look up supporter's tier
    return 'primary'; // Simplified for demo
  }

  private async notifyTier(tier: string, alertId: string): Promise<number> {
    // In real system, would actually notify the tier
    console.log(`[ESCALATION] Notifying ${tier} tier for alert ${alertId}`);
    
    switch (tier) {
      case 'secondary': return 3;
      case 'emergency': return 2;
      case 'professional': return 1;
      default: return 0;
    }
  }

  private logCoordination(alertId: string, supporterId: string, result: CoordinationResult): void {
    console.log(`[COORDINATION] Alert: ${alertId}, Supporter: ${supporterId}`);
    console.log(`  Action: ${result.action}`);
    console.log(`  Primary: ${result.primaryResponder || 'None'}`);
    console.log(`  Backups: ${result.backupResponders.join(', ') || 'None'}`);
    if (result.conflictResolution) {
      console.log(`  Conflict: ${result.conflictResolution}`);
    }
    console.log(`  Next Steps: ${result.nextSteps.join('; ')}`);
  }
}

interface EscalationRequest {
  alertId: string;
  reason: string;
  timestamp: Date;
  tier: string;
}

// Export singleton instance
export const responseCoordinator = new ResponseCoordinatorService();