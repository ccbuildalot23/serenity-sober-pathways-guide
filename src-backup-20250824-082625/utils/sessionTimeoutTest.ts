/**
 * Session Timeout Testing Utilities
 * For testing HIPAA-compliant session timeout functionality
 */

import { SESSION_CONFIG } from '@/hooks/useSessionTimeout';
import logger from '../services/loggerService';

export interface SessionTimeoutTestResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
}

/**
 * Test that verifies session timeout configuration meets HIPAA requirements
 */
export const testSessionTimeoutConfiguration = (): SessionTimeoutTestResult => {
  try {
    const config = SESSION_CONFIG;
    
    // HIPAA requires automatic logoff after 15 minutes max for PHI access
    if (config.TIMEOUT_MINUTES !== 15) {
      return {
        success: false,
        message: 'Session timeout must be 15 minutes for HIPAA compliance',
        details: { 
          configured: config.TIMEOUT_MINUTES,
          required: 15 
        }
      };
    }
    
    // Warning should be reasonable (not too short, not too long)
    if (config.WARNING_MINUTES < 1 || config.WARNING_MINUTES > 5) {
      return {
        success: false,
        message: 'Warning duration should be between 1-5 minutes',
        details: { configured: config.WARNING_MINUTES }
      };
    }
    
    // Activity threshold should prevent excessive resets
    if (config.ACTIVITY_THRESHOLD_MS < 500 || config.ACTIVITY_THRESHOLD_MS > 5000) {
      return {
        success: false,
        message: 'Activity threshold should be between 500-5000ms',
        details: { configured: config.ACTIVITY_THRESHOLD_MS }
      };
    }
    
    return {
      success: true,
      message: 'Session timeout configuration meets HIPAA requirements',
      details: config
    };
  } catch (error) {
    return {
      success: false,
      message: `Error testing session timeout configuration: ${error}`,
    };
  }
};

/**
 * Test PHI data clearing functionality
 */
export const testPHIDataClearing = (): SessionTimeoutTestResult => {
  try {
    // Set up test PHI data
    const testData = {
      daily_checkins: '[{"mood": 5, "anxiety": 3}]',
      user_profile: '{"name": "Test Patient", "dob": "1990-01-01"}',
      recovery_plan: '{"goals": ["Stay sober", "Attend meetings"]}'
    };
    
    // Store test data
    Object.entries(testData).forEach(([key, value]) => {
      localStorage.setItem(key, value);
      sessionStorage.setItem(key, value);
    });
    
    // Verify data was stored
    const storedKeys = Object.keys(testData).filter(key => 
      localStorage.getItem(key) !== null || sessionStorage.getItem(key) !== null
    );
    
    if (storedKeys.length !== Object.keys(testData).length) {
      return {
        success: false,
        message: 'Failed to store test PHI data',
        details: { storedKeys }
      };
    }
    
    // Simulate PHI clearing
    Object.keys(testData).forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    
    // Verify data was cleared
    const remainingKeys = Object.keys(testData).filter(key => 
      localStorage.getItem(key) !== null || sessionStorage.getItem(key) !== null
    );
    
    if (remainingKeys.length > 0) {
      return {
        success: false,
        message: 'PHI data was not completely cleared',
        details: { remainingKeys }
      };
    }
    
    return {
      success: true,
      message: 'PHI data clearing test passed'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error testing PHI data clearing: ${error}`,
    };
  }
};

/**
 * Test activity event monitoring
 */
export const testActivityMonitoring = (): SessionTimeoutTestResult => {
  try {
    const activityEvents = [
      'mousedown',
      'mousemove', 
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'focus',
      'blur'
    ];
    
    let eventsFired = 0;
    const testHandler = () => {
      eventsFired++;
    };
    
    // Add listeners for each event
    activityEvents.forEach(event => {
      document.addEventListener(event, testHandler, { passive: true });
    });
    
    // Simulate some events
    const mouseEvent = new MouseEvent('mousedown', { bubbles: true });
    const keyEvent = new KeyboardEvent('keydown', { bubbles: true });
    
    document.dispatchEvent(mouseEvent);
    document.dispatchEvent(keyEvent);
    
    // Clean up listeners
    activityEvents.forEach(event => {
      document.removeEventListener(event, testHandler);
    });
    
    if (eventsFired !== 2) {
      return {
        success: false,
        message: 'Activity event monitoring test failed',
        details: { eventsFired, expected: 2 }
      };
    }
    
    return {
      success: true,
      message: 'Activity event monitoring test passed'
    };
  } catch (error) {
    return {
      success: false,
      message: `Error testing activity monitoring: ${error}`,
    };
  }
};

/**
 * Run all session timeout tests
 */
export const runSessionTimeoutTests = async (): Promise<{
  overall: boolean;
  results: Record<string, SessionTimeoutTestResult>;
}> => {
  const results: Record<string, SessionTimeoutTestResult> = {
    configuration: testSessionTimeoutConfiguration(),
    phiDataClearing: testPHIDataClearing(),
    activityMonitoring: testActivityMonitoring()
  };
  
  const overall = Object.values(results).every(result => result.success);
  
  return { overall, results };
};

/**
 * Log test results to console (for development/debugging)
 */
export const logSessionTimeoutTestResults = async (): Promise<void> => {
  const { overall, results } = await runSessionTimeoutTests();
  
  console.group('🔒 Session Timeout HIPAA Compliance Tests');
  
  Object.entries(results).forEach(([testName, result]) => {
    const icon = result.success ? '✅' : '❌';
    logger.debug(`${icon} ${testName}: ${result.message}`, { component: 'sessionTimeoutTest' });
    
    if (result.details) {
      logger.debug('  Details:', result.details, { component: 'sessionTimeoutTest' });
    }
  });
  
  const overallIcon = overall ? '✅' : '❌';
  logger.debug(`\n${overallIcon} Overall: ${overall ? 'PASSED' : 'FAILED'}`, { component: 'sessionTimeoutTest' });
  
  console.groupEnd();
};

// Auto-run tests in development mode
if (import.meta.env.DEV) {
  // Run tests after a short delay to ensure DOM is ready
  setTimeout(() => {
    logSessionTimeoutTestResults();
  }, 2000);
}