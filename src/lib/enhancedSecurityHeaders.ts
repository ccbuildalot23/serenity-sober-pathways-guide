
/**
 * Enhanced Security Headers with stricter CSP and additional protections
 */
export class EnhancedSecurityHeaders {
  private static sessionTimeout = 30 * 60 * 1000; // 30 minutes
  private static deviceFingerprint: string | null = null;
  
  static applyEnhancedSecurity() {
    // Generate a unique nonce for this session
    const nonce = crypto.randomUUID();
    
    // Enhanced Content Security Policy with stricter controls
    const cspDirectives = [
      "default-src 'self'",
      "script-src 'self' 'strict-dynamic'",
      `style-src 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      // Stricter connect-src - only allow specific Supabase endpoints
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
      "block-all-mixed-content",
      "require-trusted-types-for 'script'" // Additional XSS protection
    ].join('; ');

    this.setMetaTag('Content-Security-Policy', cspDirectives);
    
    // Enhanced security headers
    this.setMetaTag('X-Content-Type-Options', 'nosniff');
    this.setMetaTag('X-Frame-Options', 'DENY');
    this.setMetaTag('X-XSS-Protection', '1; mode=block');
    this.setMetaTag('Referrer-Policy', 'strict-origin-when-cross-origin');
    this.setMetaTag('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), magnetometer=(), gyroscope=()');
    
    // Enhanced Cross-Origin policies
    this.setMetaTag('Cross-Origin-Embedder-Policy', 'require-corp');
    this.setMetaTag('Cross-Origin-Opener-Policy', 'same-origin');
    this.setMetaTag('Cross-Origin-Resource-Policy', 'same-origin');

    // Generate device fingerprint for session validation
    this.generateDeviceFingerprint();
    
    // Set up session timeout monitoring
    this.initializeSessionTimeout();
    
    // Store nonce for potential use
    this.setNonce(nonce);
    
    if (import.meta.env.DEV) {
      console.log('Enhanced security headers applied with stricter CSP and session management');
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
    } catch (error) {
      console.warn('Could not generate device fingerprint:', error);
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
    
    const resetTimeout = () => {
      localStorage.setItem('session_last_activity', Date.now().toString());
      this.initializeSessionTimeout();
    };
    
    events.forEach(event => {
      document.addEventListener(event, resetTimeout, { passive: true });
    });
  }

  private static handleSessionTimeout(): void {
    if (import.meta.env.DEV) {
      console.warn('Session timeout - cleaning up authentication state');
    }
    
    // Clear session data
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-') || key.includes('supabase-auth')) {
        localStorage.removeItem(key);
      }
    });
    
    // Redirect to auth page
    window.location.href = '/auth';
  }

  static validateSession(): boolean {
    const lastActivity = localStorage.getItem('session_last_activity');
    const storedFingerprint = localStorage.getItem('device_fp');
    
    if (!lastActivity || !storedFingerprint) {
      return false;
    }
    
    const timeSinceActivity = Date.now() - parseInt(lastActivity);
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
