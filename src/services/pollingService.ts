
import { supabase } from '@/integrations/supabase/client';

interface PollingOptions {
  interval: number;
  enabled: boolean;
}

class PollingService {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private lastChecks: Map<string, Date> = new Map();

  /**
   * Start polling for crisis events
   */
  startCrisisEventPolling(userId: string, callback: (events: any[]) => void, options: PollingOptions = { interval: 30000, enabled: true }) {
    if (!options.enabled) return;

    const key = `crisis-events-${userId}`;
    this.stopPolling(key);

    const poll = async () => {
      try {
        const lastCheck = this.lastChecks.get(key) || new Date(Date.now() - options.interval);
        
        const { data, error } = await supabase
          .from('crisis_events')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', lastCheck.toISOString())
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Polling error:', error);
          return;
        }

        if (data && data.length > 0) {
          callback(data);
        }

        this.lastChecks.set(key, new Date());
      } catch (error) {
        console.error('Crisis event polling failed:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const intervalId = setInterval(poll, options.interval);
    this.intervals.set(key, intervalId);

    console.log(`Started crisis event polling for user ${userId} every ${options.interval}ms`);
  }

  /**
   * Start polling for support contact changes
   */
  startContactPolling(userId: string, callback: (contacts: any[]) => void, options: PollingOptions = { interval: 60000, enabled: true }) {
    if (!options.enabled) return;

    const key = `contacts-${userId}`;
    this.stopPolling(key);

    let lastContactHash = '';

    const poll = async () => {
      try {
        const { data, error } = await supabase
          .from('support_contacts')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (error) {
          console.error('Contact polling error:', error);
          return;
        }

        // Simple hash to detect changes
        const currentHash = JSON.stringify(data);
        if (currentHash !== lastContactHash) {
          lastContactHash = currentHash;
          callback(data || []);
        }
      } catch (error) {
        console.error('Contact polling failed:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const intervalId = setInterval(poll, options.interval);
    this.intervals.set(key, intervalId);

    console.log(`Started contact polling for user ${userId} every ${options.interval}ms`);
  }

  /**
   * Stop specific polling
   */
  stopPolling(key: string) {
    const intervalId = this.intervals.get(key);
    if (intervalId) {
      clearInterval(intervalId);
      this.intervals.delete(key);
      this.lastChecks.delete(key);
      console.log(`Stopped polling for ${key}`);
    }
  }

  /**
   * Stop all polling
   */
  stopAllPolling() {
    this.intervals.forEach((intervalId, key) => {
      clearInterval(intervalId);
      console.log(`Stopped polling for ${key}`);
    });
    this.intervals.clear();
    this.lastChecks.clear();
  }

  /**
   * Get active polling count
   */
  getActivePollingCount(): number {
    return this.intervals.size;
  }
}

export const pollingService = new PollingService();
