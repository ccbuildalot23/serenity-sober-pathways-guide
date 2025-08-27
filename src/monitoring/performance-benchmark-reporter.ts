/**
 * Performance Benchmark Reporter
 * Generates comprehensive performance reports for healthcare application monitoring
 */

import { performanceMonitor, type PerformanceMetrics, type CrisisMetrics } from './performance-monitor';

interface BenchmarkConfig {
  testName: string;
  environment: 'development' | 'staging' | 'production';
  browserInfo?: string;
  deviceInfo?: string;
  networkCondition?: string;
  testDuration?: number;
}

interface BenchmarkResult {
  config: BenchmarkConfig;
  timestamp: number;
  coreWebVitals: PerformanceMetrics;
  crisisMetrics: CrisisMetrics;
  customMetrics: Record<string, number>;
  resourceMetrics: ResourceMetrics;
  complianceStatus: ComplianceStatus;
}

interface ResourceMetrics {
  totalResources: number;
  totalTransferSize: number;
  jsTransferSize: number;
  cssTransferSize: number;
  imageTransferSize: number;
  largeResources: Array<{
    url: string;
    size: number;
    type: string;
  }>;
  slowResources: Array<{
    url: string;
    loadTime: number;
    type: string;
  }>;
}

interface ComplianceStatus {
  hipaaCompliant: boolean;
  crisisResponseCompliant: boolean;
  accessibilityCompliant: boolean;
  performanceCompliant: boolean;
  issues: string[];
  recommendations: string[];
}

interface PerformanceThresholds {
  cls: number;
  fid: number;
  fcp: number;
  lcp: number;
  ttfb: number;
  crisisLoadTime: number;
  errorRate: number;
}

class PerformanceBenchmarkReporter {
  private static readonly HEALTHCARE_THRESHOLDS: PerformanceThresholds = {
    cls: 0.1,     // Good: < 0.1
    fid: 100,     // Good: < 100ms
    fcp: 1800,    // Good: < 1.8s
    lcp: 2500,    // Good: < 2.5s
    ttfb: 600,    // Good: < 600ms
    crisisLoadTime: 500,  // Critical: < 500ms
    errorRate: 1,  // Critical: < 1%
  };

  private benchmarkResults: BenchmarkResult[] = [];

  async runBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
    console.log(`🚀 Starting performance benchmark: ${config.testName}`);
    console.log(`📱 Environment: ${config.environment}`);
    
    const startTime = Date.now();
    
    // Collect baseline metrics
    const coreWebVitals = performanceMonitor.getMetrics();
    const crisisMetrics = performanceMonitor.getCrisisMetrics();
    
    // Collect resource metrics
    const resourceMetrics = await this.collectResourceMetrics();
    
    // Run custom measurements
    const customMetrics = await this.runCustomMeasurements();
    
    // Assess compliance status
    const complianceStatus = this.assessCompliance(coreWebVitals, crisisMetrics);
    
    const result: BenchmarkResult = {
      config,
      timestamp: startTime,
      coreWebVitals,
      crisisMetrics,
      customMetrics,
      resourceMetrics,
      complianceStatus,
    };
    
    this.benchmarkResults.push(result);
    
    console.log(`✅ Benchmark completed: ${config.testName}`);
    console.log(`⏱️ Duration: ${Date.now() - startTime}ms`);
    
    return result;
  }

  private async collectResourceMetrics(): Promise<ResourceMetrics> {
    if (typeof window === 'undefined' || !window.performance) {
      return {
        totalResources: 0,
        totalTransferSize: 0,
        jsTransferSize: 0,
        cssTransferSize: 0,
        imageTransferSize: 0,
        largeResources: [],
        slowResources: [],
      };
    }

    const resourceEntries = window.performance.getEntriesByType('resource') as any[]; // PerformanceResourceTiming[]
    
    let totalTransferSize = 0;
    let jsTransferSize = 0;
    let cssTransferSize = 0;
    let imageTransferSize = 0;
    const largeResources: ResourceMetrics['largeResources'] = [];
    const slowResources: ResourceMetrics['slowResources'] = [];

    resourceEntries.forEach((entry) => {
      const transferSize = entry.transferSize || 0;
      const loadTime = entry.duration;
      const url = entry.name;
      
      totalTransferSize += transferSize;
      
      // Categorize by type
      if (url.match(/\.(js|mjs)$/)) {
        jsTransferSize += transferSize;
      } else if (url.match(/\.css$/)) {
        cssTransferSize += transferSize;
      } else if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) {
        imageTransferSize += transferSize;
      }
      
      // Flag large resources (> 500KB)
      if (transferSize > 500000) {
        largeResources.push({
          url,
          size: transferSize,
          type: this.getResourceType(url),
        });
      }
      
      // Flag slow resources (> 3s)
      if (loadTime > 3000) {
        slowResources.push({
          url,
          loadTime,
          type: this.getResourceType(url),
        });
      }
    });

    return {
      totalResources: resourceEntries.length,
      totalTransferSize,
      jsTransferSize,
      cssTransferSize,
      imageTransferSize,
      largeResources,
      slowResources,
    };
  }

  private getResourceType(url: string): string {
    if (url.match(/\.(js|mjs)$/)) return 'JavaScript';
    if (url.match(/\.css$/)) return 'CSS';
    if (url.match(/\.(png|jpg|jpeg|gif|webp|svg)$/)) return 'Image';
    if (url.match(/\.(woff|woff2|ttf|eot)$/)) return 'Font';
    return 'Other';
  }

  private async runCustomMeasurements(): Promise<Record<string, number>> {
    const measurements: Record<string, number> = {};
    
    if (typeof window === 'undefined') {
      return measurements;
    }

    // Measure DOM complexity
    measurements.domNodes = document.querySelectorAll('*').length;
    measurements.domDepth = this.measureDOMDepth();
    
    // Measure memory usage (if available)
    if ((window.performance as any).memory) {
      const memory = (window.performance as any).memory;
      measurements.usedJSHeapSize = memory.usedJSHeapSize;
      measurements.totalJSHeapSize = memory.totalJSHeapSize;
      measurements.jsHeapSizeLimit = memory.jsHeapSizeLimit;
    }
    
    // Measure network timing
    const navTiming = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navTiming) {
      measurements.dnsLookupTime = navTiming.domainLookupEnd - navTiming.domainLookupStart;
      measurements.tcpConnectTime = navTiming.connectEnd - navTiming.connectStart;
      measurements.sslTime = navTiming.connectEnd - navTiming.secureConnectionStart;
      measurements.domContentLoadedTime = navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart;
      measurements.domInteractiveTime = navTiming.domInteractive - navTiming.navigationStart;
      measurements.pageLoadTime = navTiming.loadEventEnd - navTiming.navigationStart;
    }
    
    // Measure crisis-specific metrics
    measurements.crisisButtonCount = document.querySelectorAll('[data-crisis-button], [data-testid="crisis-button"]').length;
    measurements.emergencyContactsLoaded = document.querySelectorAll('[data-emergency-contact]').length;
    
    return measurements;
  }

  private measureDOMDepth(): number {
    let maxDepth = 0;
    
    const traverse = (element: any, depth: number) => {
      maxDepth = Math.max(maxDepth, depth);
      for (const child of element.children) {
        traverse(child, depth + 1);
      }
    };
    
    if (document.body) {
      traverse(document.body, 1);
    }
    
    return maxDepth;
  }

  private assessCompliance(
    coreWebVitals: PerformanceMetrics,
    crisisMetrics: CrisisMetrics
  ): ComplianceStatus {
    const issues: string[] = [];
    const recommendations: string[] = [];
    
    // Core Web Vitals compliance
    const thresholds = PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS;
    
    if (coreWebVitals.cls !== null && coreWebVitals.cls > thresholds.cls) {
      issues.push(`CLS (${coreWebVitals.cls.toFixed(3)}) exceeds threshold (${thresholds.cls})`);
      recommendations.push('Optimize layout stability by setting dimensions on images and ads');
    }
    
    if (coreWebVitals.fid !== null && coreWebVitals.fid > thresholds.fid) {
      issues.push(`FID (${coreWebVitals.fid}ms) exceeds threshold (${thresholds.fid}ms)`);
      recommendations.push('Reduce JavaScript execution time and optimize main thread blocking');
    }
    
    if (coreWebVitals.fcp !== null && coreWebVitals.fcp > thresholds.fcp) {
      issues.push(`FCP (${coreWebVitals.fcp}ms) exceeds threshold (${thresholds.fcp}ms)`);
      recommendations.push('Optimize critical rendering path and reduce server response time');
    }
    
    if (coreWebVitals.lcp !== null && coreWebVitals.lcp > thresholds.lcp) {
      issues.push(`LCP (${coreWebVitals.lcp}ms) exceeds threshold (${thresholds.lcp}ms)`);
      recommendations.push('Optimize largest contentful element loading and reduce resource load times');
    }
    
    if (coreWebVitals.ttfb !== null && coreWebVitals.ttfb > thresholds.ttfb) {
      issues.push(`TTFB (${coreWebVitals.ttfb}ms) exceeds threshold (${thresholds.ttfb}ms)`);
      recommendations.push('Optimize server performance and use CDN for faster response times');
    }
    
    // Crisis response compliance
    const crisisCompliant = crisisMetrics.loadTime <= thresholds.crisisLoadTime &&
                            crisisMetrics.availability &&
                            crisisMetrics.errorRate <= thresholds.errorRate;
    
    if (!crisisCompliant) {
      if (crisisMetrics.loadTime > thresholds.crisisLoadTime) {
        issues.push(`Crisis load time (${crisisMetrics.loadTime}ms) exceeds critical threshold (${thresholds.crisisLoadTime}ms)`);
        recommendations.push('Prioritize crisis component loading and implement preloading strategies');
      }
      
      if (!crisisMetrics.availability) {
        issues.push('Crisis services are not available');
        recommendations.push('Implement crisis service redundancy and health monitoring');
      }
      
      if (crisisMetrics.errorRate > thresholds.errorRate) {
        issues.push(`Crisis error rate (${crisisMetrics.errorRate}%) exceeds threshold (${thresholds.errorRate}%)`);
        recommendations.push('Improve error handling and implement retry mechanisms for crisis features');
      }
    }
    
    // Overall performance compliance
    const performanceCompliant = issues.length === 0;
    
    return {
      hipaaCompliant: true, // Assume HIPAA compliance is handled elsewhere
      crisisResponseCompliant: crisisCompliant,
      accessibilityCompliant: true, // Assume accessibility compliance is handled elsewhere
      performanceCompliant,
      issues,
      recommendations,
    };
  }

  generateDetailedReport(result: BenchmarkResult): string {
    const { config, coreWebVitals, crisisMetrics, customMetrics, resourceMetrics, complianceStatus } = result;
    
    return `
# Performance Benchmark Report

**Test Name:** ${config.testName}
**Environment:** ${config.environment}
**Timestamp:** ${new Date(result.timestamp).toISOString()}
**Browser:** ${config.browserInfo || 'Unknown'}
**Device:** ${config.deviceInfo || 'Unknown'}
**Network:** ${config.networkCondition || 'Unknown'}

## Executive Summary

${complianceStatus.performanceCompliant 
  ? '✅ **PASSED** - All performance thresholds met' 
  : '❌ **FAILED** - Performance issues identified'}

${complianceStatus.crisisResponseCompliant 
  ? '✅ **CRISIS READY** - Crisis response systems performing within requirements' 
  : '🚨 **CRISIS ISSUES** - Crisis response systems need attention'}

## Core Web Vitals

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| **CLS** | ${coreWebVitals.cls?.toFixed(3) || 'N/A'} | ${PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS.cls} | ${this.getStatusIcon(coreWebVitals.cls, PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS.cls, 'lower')} |
| **FID** | ${coreWebVitals.fid || 'N/A'}ms | ${PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS.fid}ms | ${this.getStatusIcon(coreWebVitals.fid, PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS.fid, 'lower')} |
| **FCP** | ${coreWebVitals.fcp || 'N/A'}ms | ${PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS.fcp}ms | ${this.getStatusIcon(coreWebVitals.fcp, PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS.fcp, 'lower')} |
| **LCP** | ${coreWebVitals.lcp || 'N/A'}ms | ${PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS.lcp}ms | ${this.getStatusIcon(coreWebVitals.lcp, PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS.lcp, 'lower')} |
| **TTFB** | ${coreWebVitals.ttfb || 'N/A'}ms | ${PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS.ttfb}ms | ${this.getStatusIcon(coreWebVitals.ttfb, PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS.ttfb, 'lower')} |

## Crisis Response Metrics

| Metric | Value | Threshold | Status |
|--------|-------|-----------|--------|
| **Load Time** | ${crisisMetrics.loadTime.toFixed(0)}ms | ${PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS.crisisLoadTime}ms | ${this.getStatusIcon(crisisMetrics.loadTime, PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS.crisisLoadTime, 'lower')} |
| **Availability** | ${crisisMetrics.availability ? '100%' : '0%'} | 100% | ${crisisMetrics.availability ? '✅' : '❌'} |
| **Error Rate** | ${crisisMetrics.errorRate.toFixed(2)}% | ${PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS.errorRate}% | ${this.getStatusIcon(crisisMetrics.errorRate, PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS.errorRate, 'lower')} |
| **Response Time** | ${crisisMetrics.responseTime.toFixed(0)}ms | - | ℹ️ |

## Resource Analysis

**Total Resources:** ${resourceMetrics.totalResources}
**Total Transfer Size:** ${(resourceMetrics.totalTransferSize / 1024 / 1024).toFixed(2)} MB

### Resource Breakdown
- **JavaScript:** ${(resourceMetrics.jsTransferSize / 1024 / 1024).toFixed(2)} MB
- **CSS:** ${(resourceMetrics.cssTransferSize / 1024 / 1024).toFixed(2)} MB  
- **Images:** ${(resourceMetrics.imageTransferSize / 1024 / 1024).toFixed(2)} MB

### Performance Issues
${resourceMetrics.largeResources.length > 0 ? `
**Large Resources (>500KB):**
${resourceMetrics.largeResources.map(r => `- ${r.type}: ${(r.size / 1024 / 1024).toFixed(2)} MB - ${r.url}`).join('\n')}
` : '✅ No large resources detected'}

${resourceMetrics.slowResources.length > 0 ? `
**Slow Resources (>3s):**
${resourceMetrics.slowResources.map(r => `- ${r.type}: ${r.loadTime.toFixed(0)}ms - ${r.url}`).join('\n')}
` : '✅ No slow resources detected'}

## Custom Metrics

${Object.entries(customMetrics).map(([key, value]) => {
  if (key.includes('Time') || key.includes('Duration')) {
    return `**${key}:** ${value.toFixed(0)}ms`;
  } else if (key.includes('Size') || key.includes('Heap')) {
    return `**${key}:** ${(value / 1024 / 1024).toFixed(2)} MB`;
  } else {
    return `**${key}:** ${value.toFixed(0)}`;
  }
}).join('\n')}

## Compliance Status

### Performance Compliance: ${complianceStatus.performanceCompliant ? '✅ PASS' : '❌ FAIL'}
### Crisis Response Compliance: ${complianceStatus.crisisResponseCompliant ? '✅ PASS' : '🚨 FAIL'}

${complianceStatus.issues.length > 0 ? `
### Issues Identified
${complianceStatus.issues.map(issue => `- ❌ ${issue}`).join('\n')}
` : '✅ No performance issues identified'}

${complianceStatus.recommendations.length > 0 ? `
### Recommendations
${complianceStatus.recommendations.map(rec => `- 💡 ${rec}`).join('\n')}
` : ''}

## Healthcare-Specific Analysis

**Crisis Response Readiness:** ${crisisMetrics.loadTime <= 500 ? '✅ EXCELLENT' : crisisMetrics.loadTime <= 1000 ? '⚠️ ACCEPTABLE' : '❌ NEEDS IMPROVEMENT'}

**Patient Safety Impact:** ${complianceStatus.crisisResponseCompliant ? 'LOW RISK' : 'HIGH RISK - Immediate attention required'}

**Regulatory Compliance:** Performance metrics ${complianceStatus.performanceCompliant ? 'support' : 'may impact'} HIPAA technical safeguards

---
*Report generated on ${new Date().toISOString()}*
*Performance monitoring powered by Serenity Performance Monitor*
    `.trim();
  }

  private getStatusIcon(value: number | null, threshold: number, comparison: 'lower' | 'higher'): string {
    if (value === null) return 'ℹ️';
    
    if (comparison === 'lower') {
      return value <= threshold ? '✅' : value <= threshold * 1.2 ? '⚠️' : '❌';
    } else {
      return value >= threshold ? '✅' : value >= threshold * 0.8 ? '⚠️' : '❌';
    }
  }

  generateComparisonReport(results: BenchmarkResult[]): string {
    if (results.length < 2) {
      return 'Not enough data for comparison report. Need at least 2 benchmark results.';
    }
    
    const latest = results[results.length - 1];
    const baseline = results[0];
    
    return `
# Performance Comparison Report

**Baseline:** ${baseline.config.testName} (${new Date(baseline.timestamp).toLocaleDateString()})
**Latest:** ${latest.config.testName} (${new Date(latest.timestamp).toLocaleDateString()})

## Core Web Vitals Comparison

| Metric | Baseline | Latest | Change | Trend |
|--------|----------|--------|--------|--------|
| **CLS** | ${baseline.coreWebVitals.cls?.toFixed(3) || 'N/A'} | ${latest.coreWebVitals.cls?.toFixed(3) || 'N/A'} | ${this.calculateChange(baseline.coreWebVitals.cls, latest.coreWebVitals.cls)} | ${this.getTrend(baseline.coreWebVitals.cls, latest.coreWebVitals.cls, 'lower')} |
| **FID** | ${baseline.coreWebVitals.fid || 'N/A'}ms | ${latest.coreWebVitals.fid || 'N/A'}ms | ${this.calculateChange(baseline.coreWebVitals.fid, latest.coreWebVitals.fid)} | ${this.getTrend(baseline.coreWebVitals.fid, latest.coreWebVitals.fid, 'lower')} |
| **FCP** | ${baseline.coreWebVitals.fcp || 'N/A'}ms | ${latest.coreWebVitals.fcp || 'N/A'}ms | ${this.calculateChange(baseline.coreWebVitals.fcp, latest.coreWebVitals.fcp)} | ${this.getTrend(baseline.coreWebVitals.fcp, latest.coreWebVitals.fcp, 'lower')} |
| **LCP** | ${baseline.coreWebVitals.lcp || 'N/A'}ms | ${latest.coreWebVitals.lcp || 'N/A'}ms | ${this.calculateChange(baseline.coreWebVitals.lcp, latest.coreWebVitals.lcp)} | ${this.getTrend(baseline.coreWebVitals.lcp, latest.coreWebVitals.lcp, 'lower')} |
| **TTFB** | ${baseline.coreWebVitals.ttfb || 'N/A'}ms | ${latest.coreWebVitals.ttfb || 'N/A'}ms | ${this.calculateChange(baseline.coreWebVitals.ttfb, latest.coreWebVitals.ttfb)} | ${this.getTrend(baseline.coreWebVitals.ttfb, latest.coreWebVitals.ttfb, 'lower')} |

## Crisis Response Comparison

| Metric | Baseline | Latest | Change | Trend |
|--------|----------|--------|--------|--------|
| **Load Time** | ${baseline.crisisMetrics.loadTime.toFixed(0)}ms | ${latest.crisisMetrics.loadTime.toFixed(0)}ms | ${this.calculateChange(baseline.crisisMetrics.loadTime, latest.crisisMetrics.loadTime)} | ${this.getTrend(baseline.crisisMetrics.loadTime, latest.crisisMetrics.loadTime, 'lower')} |
| **Error Rate** | ${baseline.crisisMetrics.errorRate.toFixed(2)}% | ${latest.crisisMetrics.errorRate.toFixed(2)}% | ${this.calculateChange(baseline.crisisMetrics.errorRate, latest.crisisMetrics.errorRate)} | ${this.getTrend(baseline.crisisMetrics.errorRate, latest.crisisMetrics.errorRate, 'lower')} |

## Overall Performance Score

**Baseline Score:** ${this.calculatePerformanceScore(baseline)}/100
**Latest Score:** ${this.calculatePerformanceScore(latest)}/100
**Change:** ${this.calculatePerformanceScore(latest) - this.calculatePerformanceScore(baseline) > 0 ? '+' : ''}${(this.calculatePerformanceScore(latest) - this.calculatePerformanceScore(baseline)).toFixed(1)} points

${this.calculatePerformanceScore(latest) > this.calculatePerformanceScore(baseline) 
  ? '📈 **Performance Improved**' 
  : this.calculatePerformanceScore(latest) < this.calculatePerformanceScore(baseline) 
    ? '📉 **Performance Degraded**' 
    : '➡️ **Performance Unchanged**'}
    `.trim();
  }

  private calculateChange(baseline: number | null, latest: number | null): string {
    if (baseline === null || latest === null) return 'N/A';
    
    const change = ((latest - baseline) / baseline) * 100;
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  }

  private getTrend(baseline: number | null, latest: number | null, preferredDirection: 'lower' | 'higher'): string {
    if (baseline === null || latest === null) return 'ℹ️';
    
    if (latest === baseline) return '➡️';
    
    const improved = preferredDirection === 'lower' ? latest < baseline : latest > baseline;
    return improved ? '📈' : '📉';
  }

  private calculatePerformanceScore(result: BenchmarkResult): number {
    let score = 100;
    const thresholds = PerformanceBenchmarkReporter.HEALTHCARE_THRESHOLDS;
    
    // Core Web Vitals (70% of score)
    if (result.coreWebVitals.cls !== null && result.coreWebVitals.cls > thresholds.cls) {
      score -= 15 * Math.min((result.coreWebVitals.cls / thresholds.cls), 2);
    }
    
    if (result.coreWebVitals.fid !== null && result.coreWebVitals.fid > thresholds.fid) {
      score -= 15 * Math.min((result.coreWebVitals.fid / thresholds.fid), 2);
    }
    
    if (result.coreWebVitals.lcp !== null && result.coreWebVitals.lcp > thresholds.lcp) {
      score -= 20 * Math.min((result.coreWebVitals.lcp / thresholds.lcp), 2);
    }
    
    if (result.coreWebVitals.fcp !== null && result.coreWebVitals.fcp > thresholds.fcp) {
      score -= 10 * Math.min((result.coreWebVitals.fcp / thresholds.fcp), 2);
    }
    
    if (result.coreWebVitals.ttfb !== null && result.coreWebVitals.ttfb > thresholds.ttfb) {
      score -= 10 * Math.min((result.coreWebVitals.ttfb / thresholds.ttfb), 2);
    }
    
    // Crisis Response (30% of score)
    if (result.crisisMetrics.loadTime > thresholds.crisisLoadTime) {
      score -= 20 * Math.min((result.crisisMetrics.loadTime / thresholds.crisisLoadTime), 2);
    }
    
    if (!result.crisisMetrics.availability) {
      score -= 10;
    }
    
    return Math.max(0, score);
  }

  exportResults(format: 'json' | 'csv' | 'markdown' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.benchmarkResults, null, 2);
      case 'csv':
        return this.exportToCSV();
      case 'markdown':
        return this.benchmarkResults.map(result => this.generateDetailedReport(result)).join('\n\n---\n\n');
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private exportToCSV(): string {
    if (this.benchmarkResults.length === 0) return '';
    
    const headers = [
      'Timestamp', 'Test Name', 'Environment',
      'CLS', 'FID', 'FCP', 'LCP', 'TTFB',
      'Crisis Load Time', 'Crisis Availability', 'Crisis Error Rate',
      'Performance Score', 'Crisis Compliant'
    ];
    
    const rows = this.benchmarkResults.map(result => [
      new Date(result.timestamp).toISOString(),
      result.config.testName,
      result.config.environment,
      result.coreWebVitals.cls?.toFixed(3) || '',
      result.coreWebVitals.fid?.toString() || '',
      result.coreWebVitals.fcp?.toString() || '',
      result.coreWebVitals.lcp?.toString() || '',
      result.coreWebVitals.ttfb?.toString() || '',
      result.crisisMetrics.loadTime.toFixed(0),
      result.crisisMetrics.availability.toString(),
      result.crisisMetrics.errorRate.toFixed(2),
      this.calculatePerformanceScore(result).toFixed(1),
      result.complianceStatus.crisisResponseCompliant.toString()
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
  }

  clearResults(): void {
    this.benchmarkResults = [];
  }

  getResults(): BenchmarkResult[] {
    return [...this.benchmarkResults];
  }
}

// Singleton instance
export const performanceBenchmarkReporter = new PerformanceBenchmarkReporter();

// Auto-initialize on load
if (typeof window !== 'undefined') {
  window.performanceBenchmarkReporter = performanceBenchmarkReporter;
}

declare global {
  interface Window {
    performanceBenchmarkReporter: PerformanceBenchmarkReporter;
  }
}

export default performanceBenchmarkReporter;