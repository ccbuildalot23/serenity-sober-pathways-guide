#!/usr/bin/env node

/**
 * Compliance Monitoring Dashboard
 * Real-time compliance monitoring and reporting dashboard with automated alerts
 * Integrates with security audits, HIPAA validation, and continuous monitoring
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { execSync } = require('child_process');

class ComplianceMonitoringDashboard {
  constructor() {
    this.dashboardData = {
      timestamp: new Date().toISOString(),
      version: '3.0',
      overall_compliance: 0,
      compliance_status: 'unknown',
      dashboard_metrics: {
        uptime: 0,
        last_updated: null,
        monitoring_status: 'active',
        alert_count: 0,
        critical_issues: 0
      },
      compliance_scores: {
        hipaa_compliance: { score: 0, status: 'unknown', last_check: null },
        security_audit: { score: 0, status: 'unknown', last_check: null },
        vulnerability_assessment: { score: 0, status: 'unknown', last_check: null },
        penetration_testing: { score: 0, status: 'unknown', last_check: null }
      },
      real_time_metrics: {
        active_sessions: 0,
        failed_logins: 0,
        phi_access_events: 0,
        security_alerts: 0,
        system_health: 100
      },
      compliance_trends: [],
      active_alerts: [],
      remediation_status: {
        total_issues: 0,
        resolved: 0,
        in_progress: 0,
        overdue: 0
      },
      kpi_dashboard: {},
      automated_reports: []
    };

    this.projectRoot = process.cwd();
    this.dashboardPort = process.env.DASHBOARD_PORT || 3001;
    this.alertThresholds = {
      compliance_score: 85,
      critical_vulnerabilities: 0,
      failed_logins: 5,
      system_health: 95
    };

    this.startTime = Date.now();
  }

  async startComplianceMonitoring() {
    console.log('📊 Starting Compliance Monitoring Dashboard');
    console.log('='.repeat(60));
    console.log(`Dashboard URL: http://localhost:${this.dashboardPort}`);
    console.log(`Project: ${this.projectRoot}`);
    console.log(`Started: ${this.dashboardData.timestamp}\n`);

    try {
      // 1. Initialize monitoring data
      await this.initializeMonitoringData();
      
      // 2. Start real-time monitoring
      this.startRealTimeMonitoring();
      
      // 3. Generate compliance reports
      await this.generateComplianceReports();
      
      // 4. Start dashboard web server
      this.startDashboardServer();
      
      // 5. Setup automated monitoring
      this.setupAutomatedMonitoring();
      
      console.log('✅ Compliance monitoring dashboard started successfully');
      console.log(`📊 Access dashboard at: http://localhost:${this.dashboardPort}`);
      
      // Keep the process running
      process.on('SIGINT', () => {
        console.log('\n🛑 Shutting down compliance monitoring dashboard...');
        this.saveDashboardData();
        process.exit(0);
      });

    } catch (error) {
      console.error('❌ Failed to start compliance monitoring dashboard:', error.message);
      process.exit(1);
    }
  }

  async initializeMonitoringData() {
    console.log('🔧 Initializing monitoring data...');

    try {
      // Load existing dashboard data if available
      const dashboardDataPath = path.join(this.projectRoot, 'security-reports', 'dashboard-data.json');
      if (fs.existsSync(dashboardDataPath)) {
        const existingData = JSON.parse(fs.readFileSync(dashboardDataPath, 'utf8'));
        // Merge with existing data, keeping structure
        this.dashboardData.compliance_trends = existingData.compliance_trends || [];
        this.dashboardData.remediation_status = existingData.remediation_status || this.dashboardData.remediation_status;
      }

      // Initialize compliance scores from recent reports
      await this.loadRecentComplianceScores();
      
      // Initialize KPI dashboard
      await this.initializeKPIs();
      
      // Set initial metrics
      this.dashboardData.dashboard_metrics.last_updated = new Date().toISOString();
      this.dashboardData.dashboard_metrics.uptime = 0;

      console.log('   ✅ Monitoring data initialized');

    } catch (error) {
      console.error('   ❌ Failed to initialize monitoring data:', error.message);
    }
  }

  async loadRecentComplianceScores() {
    console.log('📋 Loading recent compliance scores...');

    try {
      const reportsDir = path.join(this.projectRoot, 'security-reports');
      const complianceReportsDir = path.join(this.projectRoot, 'compliance-reports');

      // Load HIPAA compliance scores
      if (fs.existsSync(complianceReportsDir)) {
        const hipaaReports = fs.readdirSync(complianceReportsDir)
          .filter(f => f.startsWith('hipaa-compliance-') && f.endsWith('.json'))
          .sort()
          .reverse();

        if (hipaaReports.length > 0) {
          const latestHipaaReport = JSON.parse(
            fs.readFileSync(path.join(complianceReportsDir, hipaaReports[0]), 'utf8')
          );
          
          this.dashboardData.compliance_scores.hipaa_compliance = {
            score: latestHipaaReport.overall_compliance || 0,
            status: latestHipaaReport.compliance_status || 'unknown',
            last_check: latestHipaaReport.timestamp
          };
        }
      }

      // Load security audit scores
      if (fs.existsSync(reportsDir)) {
        const securityReports = fs.readdirSync(reportsDir)
          .filter(f => f.startsWith('comprehensive-security-audit-') && f.endsWith('.json'))
          .sort()
          .reverse();

        if (securityReports.length > 0) {
          const latestSecurityReport = JSON.parse(
            fs.readFileSync(path.join(reportsDir, securityReports[0]), 'utf8')
          );
          
          this.dashboardData.compliance_scores.security_audit = {
            score: latestSecurityReport.overall_score || 0,
            status: latestSecurityReport.compliance_status || 'unknown',
            last_check: latestSecurityReport.timestamp
          };
        }

        // Load automated security testing scores
        const automatedTestReports = fs.readdirSync(reportsDir)
          .filter(f => f.startsWith('automated-security-testing-') && f.endsWith('.json'))
          .sort()
          .reverse();

        if (automatedTestReports.length > 0) {
          const latestTestReport = JSON.parse(
            fs.readFileSync(path.join(reportsDir, automatedTestReports[0]), 'utf8')
          );
          
          this.dashboardData.compliance_scores.penetration_testing = {
            score: latestTestReport.overall_score || 0,
            status: latestTestReport.security_level || 'unknown',
            last_check: latestTestReport.timestamp
          };
        }
      }

      console.log('   ✅ Compliance scores loaded');

    } catch (error) {
      console.error('   ❌ Failed to load compliance scores:', error.message);
    }
  }

  async initializeKPIs() {
    console.log('📊 Initializing KPI dashboard...');

    this.dashboardData.kpi_dashboard = {
      security_kpis: {
        mean_time_to_detection: { value: 0, unit: 'minutes', trend: 'stable' },
        mean_time_to_response: { value: 0, unit: 'minutes', trend: 'stable' },
        vulnerability_remediation_rate: { value: 0, unit: 'percentage', trend: 'stable' },
        security_incidents: { value: 0, unit: 'count', trend: 'stable' }
      },
      compliance_kpis: {
        hipaa_compliance_score: { value: 0, unit: 'percentage', trend: 'stable' },
        audit_findings_resolved: { value: 0, unit: 'percentage', trend: 'stable' },
        policy_exceptions: { value: 0, unit: 'count', trend: 'stable' },
        training_completion_rate: { value: 0, unit: 'percentage', trend: 'stable' }
      },
      operational_kpis: {
        system_uptime: { value: 99.9, unit: 'percentage', trend: 'stable' },
        backup_success_rate: { value: 100, unit: 'percentage', trend: 'stable' },
        user_satisfaction: { value: 0, unit: 'score', trend: 'stable' },
        change_success_rate: { value: 0, unit: 'percentage', trend: 'stable' }
      }
    };

    // Update KPIs from actual data
    await this.updateKPIsFromData();

    console.log('   ✅ KPI dashboard initialized');
  }

  async updateKPIsFromData() {
    try {
      // Update compliance KPIs
      const hipaaScore = this.dashboardData.compliance_scores.hipaa_compliance.score;
      const securityScore = this.dashboardData.compliance_scores.security_audit.score;
      
      this.dashboardData.kpi_dashboard.compliance_kpis.hipaa_compliance_score.value = hipaaScore;
      
      // Calculate overall compliance score
      const scores = Object.values(this.dashboardData.compliance_scores)
        .map(s => s.score)
        .filter(s => s > 0);
      
      if (scores.length > 0) {
        this.dashboardData.overall_compliance = Math.round(
          scores.reduce((sum, score) => sum + score, 0) / scores.length
        );
      }

      // Update system uptime
      const uptimeMinutes = (Date.now() - this.startTime) / (1000 * 60);
      this.dashboardData.dashboard_metrics.uptime = Math.round(uptimeMinutes);

    } catch (error) {
      console.error('Failed to update KPIs:', error.message);
    }
  }

  startRealTimeMonitoring() {
    console.log('⚡ Starting real-time monitoring...');

    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateRealTimeMetrics();
      this.checkAlertConditions();
      this.updateComplianceTrends();
      this.updateKPIsFromData();
      this.dashboardData.dashboard_metrics.last_updated = new Date().toISOString();
    }, 30000);

    // Generate reports every hour
    setInterval(() => {
      this.generateHourlyReport();
    }, 3600000);

    console.log('   ✅ Real-time monitoring started');
  }

  updateRealTimeMetrics() {
    try {
      // Simulate real-time metrics (in production, these would come from actual monitoring)
      this.dashboardData.real_time_metrics = {
        active_sessions: Math.floor(Math.random() * 50) + 10,
        failed_logins: Math.floor(Math.random() * 3),
        phi_access_events: Math.floor(Math.random() * 100) + 20,
        security_alerts: this.dashboardData.active_alerts.length,
        system_health: Math.floor(Math.random() * 5) + 95
      };

      // Update dashboard uptime
      const uptimeMinutes = (Date.now() - this.startTime) / (1000 * 60);
      this.dashboardData.dashboard_metrics.uptime = Math.round(uptimeMinutes);

    } catch (error) {
      console.error('Failed to update real-time metrics:', error.message);
    }
  }

  checkAlertConditions() {
    try {
      const newAlerts = [];

      // Check compliance score threshold
      if (this.dashboardData.overall_compliance < this.alertThresholds.compliance_score) {
        newAlerts.push({
          id: `compliance-${Date.now()}`,
          type: 'COMPLIANCE_ALERT',
          severity: 'HIGH',
          title: 'Compliance Score Below Threshold',
          description: `Overall compliance score (${this.dashboardData.overall_compliance}%) is below threshold (${this.alertThresholds.compliance_score}%)`,
          timestamp: new Date().toISOString(),
          status: 'active'
        });
      }

      // Check failed logins threshold
      if (this.dashboardData.real_time_metrics.failed_logins > this.alertThresholds.failed_logins) {
        newAlerts.push({
          id: `auth-${Date.now()}`,
          type: 'AUTHENTICATION_ALERT',
          severity: 'MEDIUM',
          title: 'High Failed Login Attempts',
          description: `${this.dashboardData.real_time_metrics.failed_logins} failed login attempts detected`,
          timestamp: new Date().toISOString(),
          status: 'active'
        });
      }

      // Check system health threshold
      if (this.dashboardData.real_time_metrics.system_health < this.alertThresholds.system_health) {
        newAlerts.push({
          id: `health-${Date.now()}`,
          type: 'SYSTEM_HEALTH_ALERT',
          severity: 'HIGH',
          title: 'System Health Degraded',
          description: `System health (${this.dashboardData.real_time_metrics.system_health}%) is below threshold (${this.alertThresholds.system_health}%)`,
          timestamp: new Date().toISOString(),
          status: 'active'
        });
      }

      // Add new alerts
      newAlerts.forEach(alert => {
        // Check if alert already exists
        const existingAlert = this.dashboardData.active_alerts.find(a => 
          a.type === alert.type && a.status === 'active'
        );

        if (!existingAlert) {
          this.dashboardData.active_alerts.push(alert);
          this.triggerAlert(alert);
        }
      });

      // Update alert counts
      this.dashboardData.dashboard_metrics.alert_count = this.dashboardData.active_alerts.filter(a => a.status === 'active').length;
      this.dashboardData.dashboard_metrics.critical_issues = this.dashboardData.active_alerts.filter(a => a.severity === 'HIGH' || a.severity === 'CRITICAL').length;

    } catch (error) {
      console.error('Failed to check alert conditions:', error.message);
    }
  }

  triggerAlert(alert) {
    console.log(`🚨 ALERT: ${alert.title} (${alert.severity})`);
    console.log(`   ${alert.description}`);
    console.log(`   Time: ${alert.timestamp}`);

    // In production, this would send notifications via email, Slack, etc.
    this.sendAlertNotification(alert);
  }

  sendAlertNotification(alert) {
    // Simulate sending alert notification
    // In production, integrate with notification services
    const notification = {
      timestamp: alert.timestamp,
      type: alert.type,
      severity: alert.severity,
      message: `${alert.title}: ${alert.description}`,
      dashboard_url: `http://localhost:${this.dashboardPort}`
    };

    // Log notification (in production, send via email/SMS/Slack)
    const logPath = path.join(this.projectRoot, 'logs', 'security-alerts.log');
    if (!fs.existsSync(path.dirname(logPath))) {
      fs.mkdirSync(path.dirname(logPath), { recursive: true });
    }

    fs.appendFileSync(logPath, JSON.stringify(notification) + '\n');
  }

  updateComplianceTrends() {
    try {
      const currentTrend = {
        timestamp: new Date().toISOString(),
        overall_compliance: this.dashboardData.overall_compliance,
        hipaa_score: this.dashboardData.compliance_scores.hipaa_compliance.score,
        security_score: this.dashboardData.compliance_scores.security_audit.score,
        active_alerts: this.dashboardData.active_alerts.length,
        system_health: this.dashboardData.real_time_metrics.system_health
      };

      this.dashboardData.compliance_trends.push(currentTrend);

      // Keep only last 24 hours of trends (assuming 30-second intervals)
      const maxTrends = 24 * 60 * 2; // 24 hours * 60 minutes * 2 (30-second intervals)
      if (this.dashboardData.compliance_trends.length > maxTrends) {
        this.dashboardData.compliance_trends = this.dashboardData.compliance_trends.slice(-maxTrends);
      }

    } catch (error) {
      console.error('Failed to update compliance trends:', error.message);
    }
  }

  async generateComplianceReports() {
    console.log('📋 Generating compliance reports...');

    try {
      const reportsDir = path.join(this.projectRoot, 'compliance-reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      // Generate dashboard summary report
      const summaryReport = await this.generateDashboardSummaryReport();
      const summaryPath = path.join(reportsDir, `dashboard-summary-${timestamp}.json`);
      fs.writeFileSync(summaryPath, JSON.stringify(summaryReport, null, 2));

      // Generate KPI report
      const kpiReport = await this.generateKPIReport();
      const kpiPath = path.join(reportsDir, `kpi-report-${timestamp}.json`);
      fs.writeFileSync(kpiPath, JSON.stringify(kpiReport, null, 2));

      // Generate executive dashboard
      const executiveReport = await this.generateExecutiveDashboard();
      const executivePath = path.join(reportsDir, `executive-dashboard-${timestamp}.html`);
      fs.writeFileSync(executivePath, executiveReport);

      this.dashboardData.automated_reports.push({
        type: 'Dashboard Summary',
        path: summaryPath,
        generated: new Date().toISOString()
      });

      console.log(`   ✅ Reports generated in: ${reportsDir}`);

    } catch (error) {
      console.error('   ❌ Failed to generate compliance reports:', error.message);
    }
  }

  async generateDashboardSummaryReport() {
    return {
      timestamp: new Date().toISOString(),
      overall_compliance: this.dashboardData.overall_compliance,
      compliance_status: this.getComplianceStatus(this.dashboardData.overall_compliance),
      summary_metrics: {
        uptime_hours: Math.round(this.dashboardData.dashboard_metrics.uptime / 60),
        active_alerts: this.dashboardData.dashboard_metrics.alert_count,
        critical_issues: this.dashboardData.dashboard_metrics.critical_issues,
        system_health: this.dashboardData.real_time_metrics.system_health
      },
      compliance_scores: this.dashboardData.compliance_scores,
      top_risks: this.identifyTopRisks(),
      recommendations: this.generateRecommendations()
    };
  }

  async generateKPIReport() {
    return {
      timestamp: new Date().toISOString(),
      kpi_summary: {
        security_score: this.calculateSecurityKPIScore(),
        compliance_score: this.calculateComplianceKPIScore(),
        operational_score: this.calculateOperationalKPIScore()
      },
      detailed_kpis: this.dashboardData.kpi_dashboard,
      trend_analysis: this.analyzeTrends(),
      performance_indicators: this.calculatePerformanceIndicators()
    };
  }

  calculateSecurityKPIScore() {
    const kpis = this.dashboardData.kpi_dashboard.security_kpis;
    // Calculate weighted average of security KPIs
    return Math.round((
      (kpis.mean_time_to_detection.value <= 15 ? 100 : 75) * 0.3 +
      (kpis.mean_time_to_response.value <= 30 ? 100 : 75) * 0.3 +
      (kpis.vulnerability_remediation_rate.value || 80) * 0.2 +
      (kpis.security_incidents.value === 0 ? 100 : 75) * 0.2
    ));
  }

  calculateComplianceKPIScore() {
    const kpis = this.dashboardData.kpi_dashboard.compliance_kpis;
    return Math.round((
      (kpis.hipaa_compliance_score.value || 0) * 0.4 +
      (kpis.audit_findings_resolved.value || 0) * 0.3 +
      (kpis.policy_exceptions.value === 0 ? 100 : 75) * 0.15 +
      (kpis.training_completion_rate.value || 0) * 0.15
    ));
  }

  calculateOperationalKPIScore() {
    const kpis = this.dashboardData.kpi_dashboard.operational_kpis;
    return Math.round((
      (kpis.system_uptime.value || 0) * 0.3 +
      (kpis.backup_success_rate.value || 0) * 0.25 +
      (kpis.user_satisfaction.value || 0) * 0.25 +
      (kpis.change_success_rate.value || 0) * 0.2
    ));
  }

  analyzeTrends() {
    if (this.dashboardData.compliance_trends.length < 2) {
      return { trend: 'insufficient_data', message: 'Need more data for trend analysis' };
    }

    const recent = this.dashboardData.compliance_trends.slice(-10);
    const older = this.dashboardData.compliance_trends.slice(-20, -10);

    const recentAvg = recent.reduce((sum, t) => sum + t.overall_compliance, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((sum, t) => sum + t.overall_compliance, 0) / older.length : recentAvg;

    const change = recentAvg - olderAvg;
    
    if (change > 2) {
      return { trend: 'improving', change: change.toFixed(1), message: 'Compliance scores are improving' };
    } else if (change < -2) {
      return { trend: 'declining', change: change.toFixed(1), message: 'Compliance scores are declining' };
    } else {
      return { trend: 'stable', change: change.toFixed(1), message: 'Compliance scores are stable' };
    }
  }

  calculatePerformanceIndicators() {
    return {
      availability: {
        target: 99.9,
        actual: this.dashboardData.kpi_dashboard.operational_kpis.system_uptime.value,
        status: this.dashboardData.kpi_dashboard.operational_kpis.system_uptime.value >= 99.9 ? 'meeting' : 'below_target'
      },
      security_response: {
        target: 30, // minutes
        actual: this.dashboardData.kpi_dashboard.security_kpis.mean_time_to_response.value,
        status: this.dashboardData.kpi_dashboard.security_kpis.mean_time_to_response.value <= 30 ? 'meeting' : 'below_target'
      },
      compliance_score: {
        target: 85,
        actual: this.dashboardData.overall_compliance,
        status: this.dashboardData.overall_compliance >= 85 ? 'meeting' : 'below_target'
      }
    };
  }

  identifyTopRisks() {
    const risks = [];

    if (this.dashboardData.overall_compliance < 85) {
      risks.push({
        risk: 'Low Compliance Score',
        impact: 'HIGH',
        probability: 'HIGH',
        description: 'Overall compliance score is below acceptable threshold'
      });
    }

    if (this.dashboardData.dashboard_metrics.critical_issues > 0) {
      risks.push({
        risk: 'Critical Security Issues',
        impact: 'HIGH',
        probability: 'HIGH',
        description: `${this.dashboardData.dashboard_metrics.critical_issues} critical security issues require immediate attention`
      });
    }

    if (this.dashboardData.real_time_metrics.system_health < 95) {
      risks.push({
        risk: 'System Health Degradation',
        impact: 'MEDIUM',
        probability: 'MEDIUM',
        description: 'System health metrics indicate potential performance issues'
      });
    }

    return risks.slice(0, 5); // Return top 5 risks
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.dashboardData.overall_compliance < 90) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Compliance',
        action: 'Improve Overall Compliance Score',
        description: 'Focus on addressing compliance gaps in HIPAA and security audits'
      });
    }

    if (this.dashboardData.dashboard_metrics.critical_issues > 0) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Security',
        action: 'Resolve Critical Security Issues',
        description: 'Immediately address all critical security vulnerabilities'
      });
    }

    if (this.dashboardData.active_alerts.length > 5) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'Monitoring',
        action: 'Review Alert Thresholds',
        description: 'Consider adjusting alert thresholds to reduce alert fatigue'
      });
    }

    recommendations.push({
      priority: 'LOW',
      category: 'Process',
      action: 'Implement Automated Remediation',
      description: 'Set up automated remediation for common security issues'
    });

    return recommendations;
  }

  async generateExecutiveDashboard() {
    const complianceColor = this.getComplianceColor(this.dashboardData.overall_compliance);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Executive Compliance Dashboard</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .dashboard { max-width: 1400px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .compliance-score { font-size: 72px; font-weight: bold; color: ${complianceColor}; margin: 20px 0; }
        .status-badge { display: inline-block; padding: 12px 24px; border-radius: 30px; color: white; background: ${complianceColor}; font-weight: bold; text-transform: uppercase; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 48px; font-weight: bold; color: #007bff; margin: 10px 0; }
        .metric-label { font-size: 14px; color: #6c757d; text-transform: uppercase; letter-spacing: 1px; }
        .kpi-section { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin: 20px 0; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; }
        .kpi-item { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; }
        .kpi-value { font-size: 32px; font-weight: bold; color: #28a745; }
        .alert-section { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin: 20px 0; }
        .alert-item { display: flex; align-items: center; padding: 15px; margin: 10px 0; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 5px; }
        .alert-critical { background: #f8d7da; border-left-color: #dc3545; }
        .alert-high { background: #fff3cd; border-left-color: #fd7e14; }
        .alert-icon { width: 24px; height: 24px; margin-right: 15px; border-radius: 50%; }
        .icon-critical { background: #dc3545; }
        .icon-high { background: #fd7e14; }
        .icon-medium { background: #ffc107; }
        .trends-section { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); margin: 20px 0; }
        .risk-matrix { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .risk-item { padding: 15px; border-radius: 8px; border-left: 4px solid #dc3545; background: #f8f9fa; }
        .risk-medium { border-left-color: #ffc107; }
        .risk-low { border-left-color: #28a745; }
        .footer { text-align: center; margin-top: 40px; padding: 20px; color: #6c757d; }
    </style>
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>📊 Executive Compliance Dashboard</h1>
            <div class="compliance-score">${this.dashboardData.overall_compliance}%</div>
            <div class="status-badge">${this.getComplianceStatus(this.dashboardData.overall_compliance)}</div>
            <p><strong>Last Updated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Uptime:</strong> ${Math.round(this.dashboardData.dashboard_metrics.uptime / 60)} hours</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">HIPAA Compliance</div>
                <div class="metric-value" style="color: ${this.getComplianceColor(this.dashboardData.compliance_scores.hipaa_compliance.score)}">
                    ${this.dashboardData.compliance_scores.hipaa_compliance.score}%
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Security Score</div>
                <div class="metric-value" style="color: ${this.getComplianceColor(this.dashboardData.compliance_scores.security_audit.score)}">
                    ${this.dashboardData.compliance_scores.security_audit.score}%
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">System Health</div>
                <div class="metric-value" style="color: ${this.getComplianceColor(this.dashboardData.real_time_metrics.system_health)}">
                    ${this.dashboardData.real_time_metrics.system_health}%
                </div>
            </div>
            <div class="metric-card">
                <div class="metric-label">Active Alerts</div>
                <div class="metric-value" style="color: ${this.dashboardData.dashboard_metrics.alert_count > 0 ? '#dc3545' : '#28a745'}">
                    ${this.dashboardData.dashboard_metrics.alert_count}
                </div>
            </div>
        </div>

        <div class="kpi-section">
            <h2>🎯 Key Performance Indicators</h2>
            <div class="kpi-grid">
                <div class="kpi-item">
                    <div class="kpi-value">${this.calculateSecurityKPIScore()}%</div>
                    <div>Security KPIs</div>
                </div>
                <div class="kpi-item">
                    <div class="kpi-value">${this.calculateComplianceKPIScore()}%</div>
                    <div>Compliance KPIs</div>
                </div>
                <div class="kpi-item">
                    <div class="kpi-value">${this.calculateOperationalKPIScore()}%</div>
                    <div>Operational KPIs</div>
                </div>
            </div>
        </div>

        ${this.dashboardData.active_alerts.length > 0 ? `
            <div class="alert-section">
                <h2>🚨 Active Alerts (${this.dashboardData.active_alerts.length})</h2>
                ${this.dashboardData.active_alerts.slice(0, 5).map(alert => `
                    <div class="alert-item ${alert.severity === 'HIGH' || alert.severity === 'CRITICAL' ? 'alert-critical' : alert.severity === 'MEDIUM' ? 'alert-high' : ''}">
                        <div class="alert-icon icon-${alert.severity.toLowerCase()}"></div>
                        <div>
                            <strong>${alert.title}</strong> - ${alert.severity}<br>
                            <small>${alert.description}</small><br>
                            <small style="color: #6c757d;">${new Date(alert.timestamp).toLocaleString()}</small>
                        </div>
                    </div>
                `).join('')}
            </div>
        ` : '<div class="alert-section"><h2>✅ No Active Alerts</h2><p>All systems are operating normally.</p></div>'}

        <div class="trends-section">
            <h2>📈 Compliance Trends</h2>
            ${this.analyzeTrends().trend === 'improving' ? 
                '<p style="color: #28a745;">📈 <strong>Improving:</strong> Compliance scores are trending upward.</p>' :
                this.analyzeTrends().trend === 'declining' ?
                '<p style="color: #dc3545;">📉 <strong>Declining:</strong> Compliance scores are trending downward.</p>' :
                '<p style="color: #007bff;">📊 <strong>Stable:</strong> Compliance scores remain stable.</p>'
            }
            <p><strong>Trend Analysis:</strong> ${this.analyzeTrends().message}</p>
        </div>

        ${this.identifyTopRisks().length > 0 ? `
            <div class="alert-section">
                <h2>⚠️ Top Risks</h2>
                <div class="risk-matrix">
                    ${this.identifyTopRisks().map(risk => `
                        <div class="risk-item ${risk.impact === 'MEDIUM' ? 'risk-medium' : risk.impact === 'LOW' ? 'risk-low' : ''}">
                            <strong>${risk.risk}</strong> (${risk.impact} Impact)<br>
                            <small>${risk.description}</small>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : ''}

        <div class="footer">
            <p>Dashboard auto-refreshes every 30 seconds | Generated by Serenity Compliance Monitoring System</p>
            <p><strong>Next Scheduled Audit:</strong> ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
        </div>
    </div>
</body>
</html>`;
  }

  startDashboardServer() {
    console.log('🌐 Starting dashboard web server...');

    const server = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.url === '/') {
        // Serve main dashboard
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(this.generateMainDashboard());
      } else if (req.url === '/api/dashboard') {
        // API endpoint for dashboard data
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.dashboardData, null, 2));
      } else if (req.url === '/api/alerts') {
        // API endpoint for alerts
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.dashboardData.active_alerts, null, 2));
      } else if (req.url === '/api/metrics') {
        // API endpoint for real-time metrics
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(this.dashboardData.real_time_metrics, null, 2));
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    server.listen(this.dashboardPort, () => {
      console.log(`   ✅ Dashboard server running on http://localhost:${this.dashboardPort}`);
    });
  }

  generateMainDashboard() {
    return this.generateExecutiveDashboard();
  }

  setupAutomatedMonitoring() {
    console.log('⚙️ Setting up automated monitoring...');

    // Save dashboard data every 5 minutes
    setInterval(() => {
      this.saveDashboardData();
    }, 300000);

    // Generate daily compliance report
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.generateDailyReport();
      // Then generate daily reports every 24 hours
      setInterval(() => {
        this.generateDailyReport();
      }, 86400000);
    }, timeUntilMidnight);

    console.log('   ✅ Automated monitoring configured');
  }

  saveDashboardData() {
    try {
      const dataPath = path.join(this.projectRoot, 'security-reports', 'dashboard-data.json');
      const dir = path.dirname(dataPath);
      
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(dataPath, JSON.stringify(this.dashboardData, null, 2));
    } catch (error) {
      console.error('Failed to save dashboard data:', error.message);
    }
  }

  generateHourlyReport() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const reportPath = path.join(this.projectRoot, 'security-reports', `hourly-monitoring-${timestamp}.json`);
      
      const report = {
        timestamp: new Date().toISOString(),
        type: 'hourly_monitoring',
        compliance_score: this.dashboardData.overall_compliance,
        active_alerts: this.dashboardData.active_alerts.length,
        system_health: this.dashboardData.real_time_metrics.system_health,
        kpi_snapshot: this.dashboardData.kpi_dashboard
      };

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`📊 Hourly report generated: ${reportPath}`);

    } catch (error) {
      console.error('Failed to generate hourly report:', error.message);
    }
  }

  generateDailyReport() {
    try {
      console.log('📅 Generating daily compliance report...');

      const timestamp = new Date().toISOString().split('T')[0];
      const reportPath = path.join(this.projectRoot, 'compliance-reports', `daily-compliance-${timestamp}.json`);
      
      const report = {
        date: timestamp,
        type: 'daily_compliance',
        summary: {
          overall_compliance: this.dashboardData.overall_compliance,
          compliance_status: this.getComplianceStatus(this.dashboardData.overall_compliance),
          uptime_hours: Math.round(this.dashboardData.dashboard_metrics.uptime / 60),
          total_alerts: this.dashboardData.active_alerts.length,
          critical_issues: this.dashboardData.dashboard_metrics.critical_issues
        },
        detailed_scores: this.dashboardData.compliance_scores,
        kpi_performance: {
          security: this.calculateSecurityKPIScore(),
          compliance: this.calculateComplianceKPIScore(),
          operational: this.calculateOperationalKPIScore()
        },
        trends: this.analyzeTrends(),
        top_risks: this.identifyTopRisks(),
        recommendations: this.generateRecommendations()
      };

      if (!fs.existsSync(path.dirname(reportPath))) {
        fs.mkdirSync(path.dirname(reportPath), { recursive: true });
      }

      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`   ✅ Daily report generated: ${reportPath}`);

    } catch (error) {
      console.error('   ❌ Failed to generate daily report:', error.message);
    }
  }

  getComplianceStatus(score) {
    if (score >= 95) return 'excellent';
    if (score >= 85) return 'good';
    if (score >= 75) return 'fair';
    if (score >= 60) return 'needs-improvement';
    return 'critical';
  }

  getComplianceColor(score) {
    if (score >= 90) return '#28a745';
    if (score >= 75) return '#17a2b8';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
  }
}

// Main execution
async function main() {
  const dashboard = new ComplianceMonitoringDashboard();
  await dashboard.startComplianceMonitoring();
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Failed to start compliance monitoring dashboard:', error);
    process.exit(1);
  });
}

module.exports = { ComplianceMonitoringDashboard };