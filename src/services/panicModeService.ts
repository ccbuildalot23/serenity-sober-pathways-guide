
interface PanicModeState {
  isInCooldown: boolean;
  lastPanicTime: number | null;
  cooldownDuration: number; // in milliseconds
}

class PanicModeService {
  private state: PanicModeState = {
    isInCooldown: false,
    lastPanicTime: null,
    cooldownDuration: 30000 // 30 seconds
  };

  canTriggerPanic(): boolean {
    if (!this.state.lastPanicTime) return true;
    
    const timeSinceLastPanic = Date.now() - this.state.lastPanicTime;
    return timeSinceLastPanic >= this.state.cooldownDuration;
  }

  triggerPanic(): { success: boolean; cooldownRemaining?: number } {
    if (!this.canTriggerPanic()) {
      const cooldownRemaining = this.state.cooldownDuration - (Date.now() - this.state.lastPanicTime!);
      return { success: false, cooldownRemaining };
    }

    this.state.lastPanicTime = Date.now();
    this.state.isInCooldown = true;

    // Start cooldown timer
    setTimeout(() => {
      this.state.isInCooldown = false;
    }, this.state.cooldownDuration);

    return { success: true };
  }

  getCooldownRemaining(): number {
    if (!this.state.lastPanicTime || !this.state.isInCooldown) return 0;
    return Math.max(0, this.state.cooldownDuration - (Date.now() - this.state.lastPanicTime));
  }

  isInCooldown(): boolean {
    return this.state.isInCooldown && this.getCooldownRemaining() > 0;
  }
}

export const panicModeService = new PanicModeService();
