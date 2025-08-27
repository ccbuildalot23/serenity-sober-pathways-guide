/**
 * Performance Monitor Test Suite
 * Comprehensive testing for healthcare application performance monitoring
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import type { Mock } from 'jest-mock';
import { performanceMonitor } from '../../src/monitoring/performance-monitor';
import type { PerformanceMetrics, CrisisMetrics } from '../../src/monitoring/performance-monitor';

// Mock web-vitals module
jest.mock('web-vitals', () => ({
  onCLS: jest.fn(),
  onFID: jest.fn(),
  onFCP: jest.fn(),
  onLCP: jest.fn(),
  onTTFB: jest.fn(),
}));

// Mock global performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByName: jest.fn(() => [{ duration: 100 }]),
  observer: null as any,
};

// Mock PerformanceObserver
const mockPerformanceObserver = jest.fn((callback) => {
  mockPerformance.observer = {
    observe: jest.fn(),
    disconnect: jest.fn(),
    callback,
  };
  return mockPerformance.observer;
});

// Setup global mocks
Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

Object.defineProperty(global, 'PerformanceObserver', {
  value: mockPerformanceObserver,
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn(),
    Sentry: {
      captureMessage: jest.fn(),
    },
    bmadMonitor: {
      logPerformance: jest.fn(),
    },
    performanceMonitor: null,
  },
  writable: true,
});

Object.defineProperty(global, 'document', {
  value: {
    querySelector: jest.fn(),
  },
  writable: true,
});

Object.defineProperty(global, 'fetch', {
  value: jest.fn(),
  writable: true,
});

describe('Performance Monitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPerformance.now as Mock).mockReturnValue(Date.now());
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('Core Web Vitals Tracking', () => {
    it('should initialize all Core Web Vitals metrics', () => {
      const metrics = performanceMonitor.getMetrics();
      
      expect(metrics).toHaveProperty('cls');
      expect(metrics).toHaveProperty('fid');
      expect(metrics).toHaveProperty('fcp');
      expect(metrics).toHaveProperty('lcp');
      expect(metrics).toHaveProperty('ttfb');
      expect(metrics.customMetrics).toBeInstanceOf(Map);
    });

    it('should track CLS (Cumulative Layout Shift) values', () => {
      const { onCLS } = require('web-vitals');
      const mockMetric = { value: 0.05, id: 'test-cls' };
      
      // Simulate CLS callback
      const clsCallback = (onCLS as Mock).mock.calls[0][0];
      clsCallback(mockMetric);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.cls).toBe(0.05);
    });

    it('should alert when CLS exceeds threshold (0.1)', () => {
      const { onCLS } = require('web-vitals');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockMetric = { value: 0.15, id: 'test-cls' };
      const clsCallback = (onCLS as Mock).mock.calls[0][0];
      clsCallback(mockMetric);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance threshold exceeded for CLS: 0.15 (threshold: 0.1)'
      );
      
      consoleSpy.mockRestore();
    });

    it('should track FID (First Input Delay) values', () => {
      const { onFID } = require('web-vitals');
      const mockMetric = { value: 75, id: 'test-fid' };
      
      const fidCallback = (onFID as Mock).mock.calls[0][0];
      fidCallback(mockMetric);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.fid).toBe(75);
    });

    it('should alert when FID exceeds threshold (100ms) and send performance alert', () => {
      const { onFID } = require('web-vitals');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockMetric = { value: 150, id: 'test-fid' };
      const fidCallback = (onFID as Mock).mock.calls[0][0];
      fidCallback(mockMetric);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance threshold exceeded for FID: 150 (threshold: 100)'
      );
      
      // Check if Sentry alert was sent (FID is critical)
      expect(window.Sentry.captureMessage).toHaveBeenCalledWith(
        'Performance Alert: PERFORMANCE_DEGRADATION',
        expect.objectContaining({
          level: 'warning',
          tags: { performance: true },
          extra: expect.objectContaining({
            metric: 'FID',
            value: 150,
            threshold: 100,
          }),
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should track FCP (First Contentful Paint) values', () => {
      const { onFCP } = require('web-vitals');
      const mockMetric = { value: 1200, id: 'test-fcp' };
      
      const fcpCallback = (onFCP as Mock).mock.calls[0][0];
      fcpCallback(mockMetric);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.fcp).toBe(1200);
    });

    it('should track LCP (Largest Contentful Paint) values', () => {
      const { onLCP } = require('web-vitals');
      const mockMetric = { value: 2000, id: 'test-lcp' };
      
      const lcpCallback = (onLCP as Mock).mock.calls[0][0];
      lcpCallback(mockMetric);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.lcp).toBe(2000);
    });

    it('should alert when LCP exceeds threshold (2500ms) and send performance alert', () => {
      const { onLCP } = require('web-vitals');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockMetric = { value: 3000, id: 'test-lcp' };
      const lcpCallback = (onLCP as Mock).mock.calls[0][0];
      lcpCallback(mockMetric);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance threshold exceeded for LCP: 3000 (threshold: 2500)'
      );
      
      // Check if Sentry alert was sent (LCP is critical)
      expect(window.Sentry.captureMessage).toHaveBeenCalledWith(
        'Performance Alert: PERFORMANCE_DEGRADATION',
        expect.objectContaining({
          level: 'warning',
          tags: { performance: true },
          extra: expect.objectContaining({
            metric: 'LCP',
            value: 3000,
            threshold: 2500,
          }),
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should track TTFB (Time to First Byte) values', () => {
      const { onTTFB } = require('web-vitals');
      const mockMetric = { value: 400, id: 'test-ttfb' };
      
      const ttfbCallback = (onTTFB as Mock).mock.calls[0][0];
      ttfbCallback(mockMetric);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.ttfb).toBe(400);
    });

    it('should alert when TTFB exceeds threshold (600ms)', () => {
      const { onTTFB } = require('web-vitals');
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockMetric = { value: 800, id: 'test-ttfb' };
      const ttfbCallback = (onTTFB as Mock).mock.calls[0][0];
      ttfbCallback(mockMetric);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Performance threshold exceeded for TTFB: 800 (threshold: 600)'
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Crisis Metrics Monitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should initialize crisis metrics', () => {
      const crisisMetrics = performanceMonitor.getCrisisMetrics();
      
      expect(crisisMetrics).toMatchObject({
        loadTime: 0,
        responseTime: 0,
        availability: true,
        errorRate: 0,
      });
    });

    it('should measure crisis button load time and warn if > 500ms', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock crisis button not found initially, then found after 600ms
      let queryCallCount = 0;
      (document.querySelector as Mock).mockImplementation(() => {
        queryCallCount++;
        if (queryCallCount > 6) { // After 600ms (6 * 100ms intervals)
          return { id: 'crisis-button' }; // Crisis button found
        }
        return null;
      });
      
      // Advance timers to simulate 600ms load time
      jest.advanceTimersByTime(600);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Crisis button load time exceeded threshold:')
      );
      
      // Verify alert was sent to BMAD
      expect(window.bmadMonitor.logPerformance).toHaveBeenCalledWith(
        'CRISIS_SLOW_LOAD',
        expect.objectContaining({
          loadTime: expect.any(Number),
        })
      );
      
      consoleSpy.mockRestore();
    });

    it('should not warn if crisis button loads within 500ms', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock crisis button found immediately
      (document.querySelector as Mock).mockReturnValue({ id: 'crisis-button' });
      
      jest.advanceTimersByTime(100);
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should monitor crisis endpoint availability', async () => {
      const mockFetch = fetch as Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
      
      // Advance timer to trigger health check
      jest.advanceTimersByTime(60000); // 1 minute
      
      // Wait for promises to resolve
      await Promise.resolve();
      
      expect(mockFetch).toHaveBeenCalledWith('/api/crisis/health');
      
      const crisisMetrics = performanceMonitor.getCrisisMetrics();
      expect(crisisMetrics.availability).toBe(true);
    });

    it('should alert when crisis endpoint is unavailable', async () => {
      const mockFetch = fetch as Mock;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      
      jest.advanceTimersByTime(60000);
      
      // Wait for promises to resolve
      await Promise.resolve();
      
      expect(window.bmadMonitor.logPerformance).toHaveBeenCalledWith(
        'CRISIS_UNAVAILABLE',
        expect.objectContaining({
          status: 500,
          endpoint: '/api/crisis/health',
        })
      );
    });

    it('should alert when crisis endpoint throws error', async () => {
      const mockFetch = fetch as Mock;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      jest.advanceTimersByTime(60000);
      
      // Wait for promises to resolve
      await Promise.resolve();
      
      expect(window.bmadMonitor.logPerformance).toHaveBeenCalledWith(
        'CRISIS_ERROR',
        expect.objectContaining({
          error: 'Network error',
        })
      );
      
      const crisisMetrics = performanceMonitor.getCrisisMetrics();
      expect(crisisMetrics.availability).toBe(false);
    });
  });

  describe('BMAD Integration', () => {
    it('should log performance events to BMAD monitor', () => {
      const mockMetric = { value: 3000, id: 'test-lcp' };
      const { onLCP } = require('web-vitals');
      const lcpCallback = (onLCP as Mock).mock.calls[0][0];
      
      lcpCallback(mockMetric);
      
      expect(window.bmadMonitor.logPerformance).toHaveBeenCalledWith(
        'PERFORMANCE_DEGRADATION',
        expect.objectContaining({
          metric: 'LCP',
          value: 3000,
          threshold: 2500,
        })
      );
    });

    it('should send alerts to both Sentry and BMAD', () => {
      const mockMetric = { value: 150, id: 'test-fid' };
      const { onFID } = require('web-vitals');
      const fidCallback = (onFID as Mock).mock.calls[0][0];
      
      fidCallback(mockMetric);
      
      // Check Sentry integration
      expect(window.Sentry.captureMessage).toHaveBeenCalledWith(
        'Performance Alert: PERFORMANCE_DEGRADATION',
        expect.any(Object)
      );
      
      // Check BMAD integration
      expect(window.bmadMonitor.logPerformance).toHaveBeenCalledWith(
        'PERFORMANCE_DEGRADATION',
        expect.any(Object)
      );
    });

    it('should handle missing BMAD monitor gracefully', () => {
      const originalBmadMonitor = window.bmadMonitor;
      delete window.bmadMonitor;
      
      const mockMetric = { value: 3000, id: 'test-lcp' };
      const { onLCP } = require('web-vitals');
      const lcpCallback = (onLCP as Mock).mock.calls[0][0];
      
      expect(() => lcpCallback(mockMetric)).not.toThrow();
      
      window.bmadMonitor = originalBmadMonitor;
    });
  });

  describe('Error Tracking and Rate Limiting', () => {
    it('should track JavaScript errors', () => {
      const errorHandler = (window.addEventListener as Mock).mock.calls
        .find(call => call[0] === 'error')[1];
      
      const mockError = {
        error: {
          message: 'Test error',
          stack: 'test stack trace',
        },
      };
      
      errorHandler(mockError);
      
      const crisisMetrics = performanceMonitor.getCrisisMetrics();
      expect(crisisMetrics.errorRate).toBeGreaterThan(0);
    });

    it('should alert on critical crisis-related errors', () => {
      const errorHandler = (window.addEventListener as Mock).mock.calls
        .find(call => call[0] === 'error')[1];
      
      const mockCriticalError = {
        error: {
          message: 'Crisis button not responding',
          stack: 'Error in crisis handling module\n    at crisis.js:123',
        },
      };
      
      errorHandler(mockCriticalError);
      
      expect(window.bmadMonitor.logPerformance).toHaveBeenCalledWith(
        'CRITICAL_ERROR',
        expect.objectContaining({
          message: 'Crisis button not responding',
          stack: expect.stringContaining('crisis'),
        })
      );
    });

    it('should track unhandled promise rejections', () => {
      const rejectionHandler = (window.addEventListener as Mock).mock.calls
        .find(call => call[0] === 'unhandledrejection')[1];
      
      const mockRejection = {
        reason: 'Unhandled promise rejection',
      };
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      rejectionHandler(mockRejection);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Unhandled promise rejection:',
        'Unhandled promise rejection'
      );
      
      consoleSpy.mockRestore();
    });

    it('should alert when error rate exceeds 1%', () => {
      const errorHandler = (window.addEventListener as Mock).mock.calls
        .find(call => call[0] === 'error')[1];
      
      // Simulate multiple errors to trigger high error rate
      for (let i = 0; i < 5; i++) {
        errorHandler({
          error: { message: `Error ${i}`, stack: 'stack' },
        });
      }
      
      // Mock request count to calculate error rate
      performanceMonitor['requestCount'] = 100;
      
      // Trigger error rate calculation
      errorHandler({
        error: { message: 'Final error', stack: 'stack' },
      });
      
      expect(window.bmadMonitor.logPerformance).toHaveBeenCalledWith(
        'HIGH_ERROR_RATE',
        expect.objectContaining({
          rate: expect.any(Number),
          errors: expect.any(Number),
          requests: 100,
        })
      );
    });
  });

  describe('Resource Monitoring', () => {
    it('should monitor large resource loading', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockResourceEntry = {
        entryType: 'resource',
        name: 'large-image.jpg',
        transferSize: 1000000, // 1MB
        duration: 2000,
      };
      
      // Simulate PerformanceObserver callback
      const observerCallback = mockPerformanceObserver.mock.calls[0][0];
      observerCallback({
        getEntries: () => [mockResourceEntry],
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Large resource detected: large-image.jpg (1000000 bytes)')
      );
      
      consoleSpy.mockRestore();
    });

    it('should monitor slow resource loading', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      const mockResourceEntry = {
        entryType: 'resource',
        name: 'slow-script.js',
        transferSize: 10000,
        duration: 4000, // 4 seconds
      };
      
      const observerCallback = mockPerformanceObserver.mock.calls[0][0];
      observerCallback({
        getEntries: () => [mockResourceEntry],
      });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow resource: slow-script.js (4000ms)')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Custom Metrics and Measurements', () => {
    it('should allow custom metric measurement', () => {
      performanceMonitor.measureCustomMetric('page-load-time', 1500);
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.customMetrics.get('page-load-time')).toBe(1500);
    });

    it('should support start/end measurement pattern', () => {
      performanceMonitor.startMeasure('api-call');
      performanceMonitor.endMeasure('api-call');
      
      expect(mockPerformance.mark).toHaveBeenCalledWith('api-call-start');
      expect(mockPerformance.mark).toHaveBeenCalledWith('api-call-end');
      expect(mockPerformance.measure).toHaveBeenCalledWith('api-call', 'api-call-start', 'api-call-end');
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.customMetrics.get('api-call')).toBe(100);
    });
  });

  describe('Observer Pattern and Notifications', () => {
    it('should notify observers when metrics change', () => {
      const mockObserver = jest.fn();
      const unsubscribe = performanceMonitor.subscribe(mockObserver);
      
      performanceMonitor.measureCustomMetric('test-metric', 500);
      
      expect(mockObserver).toHaveBeenCalledWith(
        expect.objectContaining({
          customMetrics: expect.any(Map),
        })
      );
      
      unsubscribe();
    });

    it('should allow unsubscribing from notifications', () => {
      const mockObserver = jest.fn();
      const unsubscribe = performanceMonitor.subscribe(mockObserver);
      
      unsubscribe();
      performanceMonitor.measureCustomMetric('test-metric', 500);
      
      expect(mockObserver).not.toHaveBeenCalled();
    });
  });

  describe('Performance Report Generation', () => {
    it('should generate comprehensive performance report', () => {
      // Set up some mock data
      const { onCLS, onFID, onFCP, onLCP, onTTFB } = require('web-vitals');
      
      (onCLS as Mock).mock.calls[0][0]({ value: 0.05, id: 'cls' });
      (onFID as Mock).mock.calls[0][0]({ value: 75, id: 'fid' });
      (onFCP as Mock).mock.calls[0][0]({ value: 1200, id: 'fcp' });
      (onLCP as Mock).mock.calls[0][0]({ value: 2000, id: 'lcp' });
      (onTTFB as Mock).mock.calls[0][0]({ value: 400, id: 'ttfb' });
      
      performanceMonitor.measureCustomMetric('page-load', 1500);
      
      const report = performanceMonitor.generateReport();
      
      expect(report).toContain('Performance Report');
      expect(report).toContain('Core Web Vitals:');
      expect(report).toContain('CLS: 0.050');
      expect(report).toContain('FID: 75ms');
      expect(report).toContain('FCP: 1200ms');
      expect(report).toContain('LCP: 2000ms');
      expect(report).toContain('TTFB: 400ms');
      expect(report).toContain('Crisis Metrics:');
      expect(report).toContain('Custom Metrics:');
      expect(report).toContain('page-load: 1500.00ms');
    });

    it('should handle missing metrics in report', () => {
      const report = performanceMonitor.generateReport();
      
      expect(report).toContain('CLS: N/A');
      expect(report).toContain('FID: N/A');
      expect(report).toContain('FCP: N/A');
      expect(report).toContain('LCP: N/A');
      expect(report).toContain('TTFB: N/A');
    });
  });

  describe('Healthcare-Specific Requirements', () => {
    it('should meet crisis response time requirements (< 500ms)', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock crisis button found within 400ms
      let queryCallCount = 0;
      (document.querySelector as Mock).mockImplementation(() => {
        queryCallCount++;
        if (queryCallCount > 4) { // After 400ms (4 * 100ms intervals)
          return { id: 'crisis-button' };
        }
        return null;
      });
      
      jest.advanceTimersByTime(400);
      
      expect(consoleSpy).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should prioritize crisis-related error alerts', () => {
      const errorHandler = (window.addEventListener as Mock).mock.calls
        .find(call => call[0] === 'error')[1];
      
      const mockEmergencyError = {
        error: {
          message: 'Emergency contact system failure',
          stack: 'Error in emergency handling\n    at emergency.js:456',
        },
      };
      
      errorHandler(mockEmergencyError);
      
      expect(window.bmadMonitor.logPerformance).toHaveBeenCalledWith(
        'CRITICAL_ERROR',
        expect.objectContaining({
          message: 'Emergency contact system failure',
        })
      );
    });
  });
});