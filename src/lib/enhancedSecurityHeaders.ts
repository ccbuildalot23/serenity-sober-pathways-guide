
/**
 * Enhanced Security Headers with stricter CSP and additional protections
 */
export class EnhancedSecurityHeaders {
  private static sessionTimeout = 30 * 60 * 1000; // 30 minutes
  private static deviceFingerprint: string | null = null;
  
  static applyEnhancedSecurity() {
    // Enhanced Content Security Policy with necessary permissions for app functionality
    const _cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: https://vercel.live",
      // Allow connections to Supabase and other necessary services
      "connect-src 'self' https://tqyiqstpvwztvofrxpuf.supabase.co wss://tqyiqstpvwztvofrxpuf.supabase.co https://*.supabase.co wss://*.supabase.co https://api.ipify.org https://vercel.live",
      "frame-src 'self' https://vercel.live",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests"
    ].join('; ');

    this.setMetaTag('Content-Security-Policy', _cspDirectives);
    
    // Basic security headers only - remove overly restrictive ones
    this.setMetaTag('X-Content-Type-Options', 'nosniff');
    this.setMetaTag('X-Frame-Options', 'SAMEORIGIN');
    this.setMetaTag('X-XSS-Protection', '1; mode=block');
    this.setMetaTag('Referrer-Policy', 'strict-origin-when-cross-origin');
    this.setMetaTag('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    // Generate device fingerprint for session validation
    this.generateDeviceFingerprint();
    
    // Set up session timeout monitoring
    this.initializeSessionTimeout();
    
    if (import.meta.env.DEV) {
      console.log('Enhanced security headers applied with functional CSP');
    }
  }

  private static generateDeviceFingerprint(): void {
    try {
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        navigator.platform,
        navigator.cookieEnabled,
        navigator.onLine
      ].join('|');
      
      // Create a hash of the fingerprint
      this.deviceFingerprint = btoa(fingerprint).substring(0, 32);
      localStorage.setItem('device_fp', this.deviceFingerprint);
      
      if (import.meta.env.DEV) {
        console.log('Device fingerprint generated for session validation');
      }
    } catch (_error) {
      console.warn('Could not generate device fingerprint:', _error);
    }
  }

  private static initializeSessionTimeout(): void {
    // Clear any existing timeout
    const existingTimeout = localStorage.getItem('session_timeout_id');
    if (existingTimeout) {
      clearTimeout(parseInt(existingTimeout));
    }
    
    // Set new session timeout
    const timeoutId = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.sessionTimeout);
    
    localStorage.setItem('session_timeout_id', timeoutId.toString());
    localStorage.setItem('session_last_activity', Date.now().toString());
    
    // Reset timeout on user activity
    this.setupActivityMonitoring();
  }

  private static setupActivityMonitoring(): void {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const _resetTimeout = () => {
      localStorage.setItem('session_last_activity', Date.now().toString());
      this.initializeSessionTimeout();
    };
    
    events.forEach(event => {
      document.addEventListener(event, _resetTimeout, { passive: true });
    });
  }

  private static handleSessionTimeout(): void {
    if (import.meta.env.DEV) {
      console.warn('Session timeout - cleaning up authentication state');
    }
    
    // Clear session data
    Object.keys(localStorage).forEach((_key) => {
      if (_key.startsWith('supabase.auth.') || _key.includes('sb-') || _key.includes('supabase-auth')) {
        localStorage.removeItem(_key);
      }
    });
    
    // Redirect to auth page
    window.location.href = '/auth';
  }

  static validateSession(): boolean {
    const _lastActivity = localStorage.getItem('session_last_activity');
    const storedFingerprint = localStorage.getItem('device_fp');
    
    if (!_lastActivity || !storedFingerprint) {
      return false;
    }
    
    const timeSinceActivity = Date.now() - parseInt(_lastActivity);
    const fingerprintMatch = storedFingerprint === this.deviceFingerprint;
    
    if (timeSinceActivity > this.sessionTimeout || !fingerprintMatch) {
      this.handleSessionTimeout();
      return false;
    }
    
    return true;
  }

  private static setMetaTag(name: string, content: string) {
    const existing = document.querySelector(`meta[http-equiv="${name}"]`);
    if (existing) {
      existing.remove();
    }

    const meta = document.createElement('meta');
    meta.setAttribute('http-equiv', name);
    meta.setAttribute('content', content);
    document.head.appendChild(meta);
  }

  private static setNonce(nonce: string) {
    document.documentElement.setAttribute('data-csp-nonce', nonce);
  }
}
