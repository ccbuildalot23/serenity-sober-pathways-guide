
import { supabase } from '@/integrations/supabase/client';
import logger from './loggerService';

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
  startCrisisEventPolling(userId: string, callback: (events: unknown[]) => void, options: PollingOptions = { interval: 30000, enabled: true }) {
    if (!options.enabled) return;

    const key = `crisis-events-${userId}`;
    this.stopPolling(key);

    const poll = async () => {
      try {
        const lastCheck = this.lastChecks.get(key) || new Date(Date.now() - options.interval);
        
        const { data, _error } = await supabase
          .from('crisis_events')
          .select('*')
          .eq('user_id', userId)
          .gte('created_at', lastCheck.toISOString())
          .order('created_at', { ascending: false });

        if (_error) {
          console._error('Polling _error:', _error);
          return;
        }

        if (data && data.length > 0) {
          callback(data);
        }

        this.lastChecks.set(key, new Date());
      } catch (_error) {
        console._error('Crisis event polling failed:', _error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const _intervalId = setInterval(poll, options.interval);
    this.intervals.set(key, _intervalId);

    logger.debug(`Started crisis event polling for user ${userId} every ${options.interval}ms`, { component: 'pollingService' });
  }

  /**
   * Start polling for support contact changes
   */
  startContactPolling(userId: string, callback: (contacts: unknown[]) => void, options: PollingOptions = { interval: 60000, enabled: true }) {
    if (!options.enabled) return;

    const key = `contacts-${userId}`;
    this.stopPolling(key);

    let lastContactHash = '';

    const poll = async () => {
      try {
        const { data, _error } = await supabase
          .from('support_contacts')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false });

        if (_error) {
          console._error('Contact polling _error:', _error);
          return;
        }

        // Simple hash to detect changes
        const currentHash = JSON.stringify(data);
        if (currentHash !== lastContactHash) {
          lastContactHash = currentHash;
          callback(data || []);
        }
      } catch (_error) {
        console._error('Contact polling failed:', _error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    const _intervalId = setInterval(poll, options.interval);
    this.intervals.set(key, _intervalId);

    logger.debug(`Started contact polling for user ${userId} every ${options.interval}ms`, { component: 'pollingService' });
  }

  /**
   * Stop specific polling
   */
  stopPolling(key: string) {
    const _intervalId = this.intervals.get(key);
    if (_intervalId) {
      clearInterval(_intervalId);
      this.intervals.delete(key);
      this.lastChecks.delete(key);
      logger.debug(`Stopped polling for ${key}`, { component: 'pollingService' });
    }
  }

  /**
   * Stop all polling
   */
  stopAllPolling() {
    this.intervals.forEach((_intervalId, key) => {
      clearInterval(_intervalId);
      logger.debug(`Stopped polling for ${key}`, { component: 'pollingService' });
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
