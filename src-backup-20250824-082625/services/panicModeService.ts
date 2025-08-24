
// Emergency Support Service - You're never alone in this

interface EmergencySupportState {
  isProcessing: boolean;
  lastReachOutTime: number | null;
  supportInterval: number; // Time between emergency requests to prevent accidental duplicates
}

class EmergencySupportService {
  private state: EmergencySupportState = {
    isProcessing: false,
    lastReachOutTime: null,
    supportInterval: 30000 // 30 seconds - prevents accidental double-taps
  };

  canReachOut(): boolean {
    if (!this.state.lastReachOutTime) return true;
    
    const timeSinceLastReachOut = Date.now() - this.state.lastReachOutTime;
    return timeSinceLastReachOut >= this.state.supportInterval;
  }

  reachOutForHelp(): { success: boolean; waitTime?: number; message?: string } {
    if (!this.canReachOut()) {
      const waitTime = this.state.supportInterval - (Date.now() - this.state.lastReachOutTime!);
      return { 
        success: false, 
        waitTime,
        message: "We're still processing your last request. Help is on the way." 
      };
    }

    this.state.lastReachOutTime = Date.now();
    this.state.isProcessing = true;

    // Reset processing state after interval
    setTimeout(() => {
      this.state.isProcessing = false;
    }, this.state.supportInterval);

    return { 
      success: true,
      message: "You're so brave for reaching out. Connecting you to support now."
    };
  }

  getWaitTime(): number {
    if (!this.state.lastReachOutTime || !this.state.isProcessing) return 0;
    return Math.max(0, this.state.supportInterval - (Date.now() - this.state.lastReachOutTime));
  }

  isProcessingRequest(): boolean {
    return this.state.isProcessing && this.getWaitTime() > 0;
  }
}

export const emergencySupportService = new EmergencySupportService();
// For backwards compatibility
export const panicModeService = emergencySupportService;
