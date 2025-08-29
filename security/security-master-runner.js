#!/usr/bin/env node

/**
 * Security Master Runner
 * Orchestrates all security audit and compliance tools
 * Provides unified interface for comprehensive security assessment
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');

class SecurityMasterRunner {
  constructor() {
    this.projectRoot = process.cwd();
    this.securityDir = path.join(this.projectRoot, 'security');
    this.reportsDir = path.join(this.projectRoot, 'security-reports');
    this.complianceDir = path.join(this.projectRoot, 'compliance-reports');
    
    this.executionResults = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      overall_status: 'unknown',
      tools_executed: [],
      summary_scores: {},
      critical_findings: [],
      recommendations: [],
      execution_time: 0
    };

    this.availableTools = {
      'comprehensive-security-audit': {
        script: 'comprehensive-security-audit.js',
        description: 'Full security audit with OWASP Top 10, vulnerability scanning, and penetration testing',
        category: 'audit',
        priority: 1
      },
      'hipaa-compliance-validator': {
        script: 'hipaa-compliance-validator.js',
        description: 'HIPAA compliance validation for healthcare applications',
        category: 'compliance',
        priority: 1
      },
      'automated-security-testing': {
        script: 'automated-security-testing.js',
        description: 'Automated security testing framework with threat modeling',
        category: 'testing',
        priority: 2
      },
      'compliance-monitoring-dashboard': {
        script: 'compliance-monitoring-dashboard.js',
        description: 'Real-time compliance monitoring and alerting dashboard',
        category: 'monitoring',
        priority: 3
      },
      'dependency-security-scan': {
        script: '../scripts/security-dependency-scan.cjs',
        description: 'NPM dependency vulnerability scanning',
        category: 'scanning',
        priority: 2
      }
    };

    this.startTime = Date.now();
  }

  async runComprehensiveSecurityAssessment(options = {}) {
    console.log('🛡️  SERENITY SECURITY MASTER RUNNER');
    console.log('='.repeat(60));
    console.log('Comprehensive Security Assessment for Healthcare Platform');
    console.log(`Started: ${new Date().toISOString()}`);
    console.log(`Project: ${this.projectRoot}\n`);

    try {
      // 1. Initialize assessment environment
      await this.initializeAssessment();
      
      // 2. Run security tools based on options
      await this.executeSecurityTools(options);
      
      // 3. Aggregate and analyze results
      await this.aggregateResults();
      
      // 4. Generate master report
      await this.generateMasterReport();
      
      // 5. Display summary and recommendations
      this.displayExecutionSummary();
      
      console.log('\n✅ Comprehensive security assessment completed successfully');
      
    } catch (error) {
      console.error('❌ Security assessment failed:', error.message);
      process.exit(1);
    }
  }

  async initializeAssessment() {
    console.log('🔧 Initializing security assessment environment...');

    // Create required directories
    const dirs = [this.reportsDir, this.complianceDir];
    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   Created directory: ${dir}`);
      }
    });

    // Verify security tools exist
    const missingTools = [];
    Object.entries(this.availableTools).forEach(([toolName, config]) => {
      const toolPath = path.join(this.securityDir, config.script);
      if (!fs.existsSync(toolPath)) {
        missingTools.push(toolName);
      }
    });

    if (missingTools.length > 0) {
      throw new Error(`Missing security tools: ${missingTools.join(', ')}`);
    }

    // Check Node.js and npm dependencies
    try {
      execSync('node --version', { stdio: 'pipe' });
      execSync('npm --version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('Node.js and npm are required but not available');
    }

    console.log('   ✅ Assessment environment initialized');
  }

  async executeSecurityTools(options = {}) {
    console.log('⚡ Executing security assessment tools...');

    const toolsToRun = this.selectToolsToRun(options);
    
    for (const toolName of toolsToRun) {
      const tool = this.availableTools[toolName];
      const startTime = Date.now();
      
      console.log(`\n🔍 Running ${toolName}...`);
      console.log(`   Description: ${tool.description}`);
      
      try {
        const result = await this.executeTool(toolName, tool);
        const executionTime = Date.now() - startTime;
        
        this.executionResults.tools_executed.push({
          name: toolName,
          status: 'completed',
          execution_time: executionTime,
          category: tool.category,
          output_files: result.outputFiles || [],
          score: result.score || 0,
          findings: result.findings || [],
          error: null
        });

        console.log(`   ✅ Completed ${toolName} (${Math.round(executionTime / 1000)}s)`);
        
      } catch (error) {
        const executionTime = Date.now() - startTime;
        
        this.executionResults.tools_executed.push({
          name: toolName,
          status: 'failed',
          execution_time: executionTime,
          category: tool.category,
          output_files: [],
          score: 0,
          findings: [],
          error: error.message
        });

        console.error(`   ❌ Failed ${toolName}: ${error.message}`);
        
        // Continue with other tools unless it's a critical tool
        if (tool.priority === 1) {
          console.error(`   🚨 Critical tool failed - continuing with reduced assessment`);
        }
      }
    }
  }

  selectToolsToRun(options) {
    const { 
      quick = false, 
      compliance_only = false, 
      monitoring = false,
      tools = null 
    } = options;

    // If specific tools requested
    if (tools && Array.isArray(tools)) {
      return tools.filter(tool => this.availableTools[tool]);
    }

    // If quick assessment requested
    if (quick) {
      return Object.entries(this.availableTools)
        .filter(([name, config]) => config.priority === 1)
        .map(([name]) => name);
    }

    // If compliance-only assessment
    if (compliance_only) {
      return Object.entries(this.availableTools)
        .filter(([name, config]) => config.category === 'compliance')
        .map(([name]) => name);
    }

    // If monitoring setup requested
    if (monitoring) {
      return ['compliance-monitoring-dashboard'];
    }

    // Default: run all tools in priority order
    return Object.entries(this.availableTools)
      .sort(([, a], [, b]) => a.priority - b.priority)
      .map(([name]) => name);
  }

  async executeTool(toolName, config) {
    const toolPath = path.join(this.securityDir, config.script);
    
    return new Promise((resolve, reject) => {
      // Special handling for monitoring dashboard (runs as daemon)
      if (toolName === 'compliance-monitoring-dashboard') {
        const child = spawn('node', [toolPath], {
          cwd: this.projectRoot,
          stdio: 'pipe',
          detached: true
        });

        let output = '';
        child.stdout.on('data', (data) => {
          output += data.toString();
        });

        child.stderr.on('data', (data) => {
          output += data.toString();
        });

        // Allow dashboard to start up
        setTimeout(() => {
          if (!child.killed) {
            // Dashboard started successfully
            resolve({
              outputFiles: ['Dashboard running on http://localhost:3001'],
              score: 100,
              findings: ['Compliance monitoring dashboard activated']
            });
          }
        }, 5000);

        child.on('error', (error) => {
          reject(new Error(`Tool execution failed: ${error.message}`));
        });

        return;
      }

      // Standard tool execution
      const child = spawn('node', [toolPath], {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', (data) => {
        output += data.toString();
        // Show real-time output for better UX
        process.stdout.write(data);
      });

      child.stderr.on('data', (data) => {
        errorOutput += data.toString();
        process.stderr.write(data);
      });

      child.on('close', (code) => {
        if (code === 0) {
          // Parse results from output or check for report files
          const result = this.parseToolResults(toolName, output);
          resolve(result);
        } else {
          reject(new Error(`Tool exited with code ${code}: ${errorOutput}`));
        }
      });

      child.on('error', (error) => {
        reject(new Error(`Tool execution failed: ${error.message}`));
      });
    });
  }

  parseToolResults(toolName, output) {
    const result = {
      outputFiles: [],
      score: 0,
      findings: []
    };

    try {
      // Look for generated report files
      const reportPatterns = {
        'comprehensive-security-audit': 'comprehensive-security-audit-*.json',
        'hipaa-compliance-validator': 'hipaa-compliance-*.json',
        'automated-security-testing': 'automated-security-testing-*.json'
      };

      const pattern = reportPatterns[toolName];
      if (pattern) {
        const reportFiles = this.findRecentReportFiles(pattern);
        result.outputFiles = reportFiles;

        // Extract score from latest report
        if (reportFiles.length > 0) {
          const latestReport = this.getLatestReport(reportFiles);
          if (latestReport) {
            result.score = latestReport.overall_score || latestReport.overall_compliance || 0;
            
            // Extract critical findings
            if (latestReport.critical_vulnerabilities) {
              result.findings = latestReport.critical_vulnerabilities.slice(0, 5);
            } else if (latestReport.safeguards) {
              // HIPAA compliance issues
              Object.values(latestReport.safeguards).forEach(safeguard => {
                safeguard.issues.forEach(issue => {
                  if (issue.severity === 'HIGH') {
                    result.findings.push(issue);
                  }
                });
              });
            }
          }
        }
      }

      // Parse output for scores and findings
      const scoreMatch = output.match(/(?:Score|Compliance):\s*(\d+)/i);
      if (scoreMatch) {
        result.score = parseInt(scoreMatch[1]);
      }

      // Look for critical findings in output
      const criticalMatches = output.match(/❌.*|🚨.*|CRITICAL.*|HIGH.*/gi);
      if (criticalMatches) {
        result.findings = result.findings.concat(criticalMatches.slice(0, 3));
      }

    } catch (error) {
      console.warn(`Warning: Could not parse results for ${toolName}: ${error.message}`);
    }

    return result;
  }

  findRecentReportFiles(pattern) {
    const files = [];
    const dirs = [this.reportsDir, this.complianceDir];
    
    dirs.forEach(dir => {
      if (fs.existsSync(dir)) {
        const dirFiles = fs.readdirSync(dir);
        const matchingFiles = dirFiles.filter(file => {
          // Convert glob pattern to regex
          const regex = new RegExp(pattern.replace('*', '.*'));
          return regex.test(file);
        });
        
        matchingFiles.forEach(file => {
          files.push(path.join(dir, file));
        });
      }
    });

    return files;
  }

  getLatestReport(reportFiles) {
    try {
      // Sort by modification time and get the latest
      const latest = reportFiles
        .map(file => ({ file, mtime: fs.statSync(file).mtime }))
        .sort((a, b) => b.mtime - a.mtime)[0];

      if (latest && latest.file.endsWith('.json')) {
        return JSON.parse(fs.readFileSync(latest.file, 'utf8'));
      }
    } catch (error) {
      console.warn(`Warning: Could not read latest report: ${error.message}`);
    }
    return null;
  }

  async aggregateResults() {
    console.log('\n📊 Aggregating security assessment results...');

    // Calculate summary scores by category
    const categories = ['audit', 'compliance', 'testing', 'monitoring', 'scanning'];
    
    categories.forEach(category => {
      const categoryTools = this.executionResults.tools_executed
        .filter(tool => tool.category === category && tool.status === 'completed');
      
      if (categoryTools.length > 0) {
        const avgScore = categoryTools.reduce((sum, tool) => sum + tool.score, 0) / categoryTools.length;
        this.executionResults.summary_scores[category] = Math.round(avgScore);
      }
    });

    // Calculate overall status
    const completedTools = this.executionResults.tools_executed.filter(t => t.status === 'completed');
    const failedTools = this.executionResults.tools_executed.filter(t => t.status === 'failed');
    
    if (completedTools.length === 0) {
      this.executionResults.overall_status = 'failed';
    } else if (failedTools.length > 0) {
      this.executionResults.overall_status = 'partial';
    } else {
      this.executionResults.overall_status = 'success';
    }

    // Aggregate critical findings
    this.executionResults.tools_executed.forEach(tool => {
      if (tool.findings && tool.findings.length > 0) {
        this.executionResults.critical_findings = this.executionResults.critical_findings
          .concat(tool.findings.map(finding => ({
            tool: tool.name,
            finding: finding,
            severity: this.extractSeverity(finding)
          })));
      }
    });

    // Generate recommendations
    this.generateRecommendations();

    // Calculate total execution time
    this.executionResults.execution_time = Date.now() - this.startTime;

    console.log('   ✅ Results aggregation completed');
  }

  extractSeverity(finding) {
    if (typeof finding === 'string') {
      if (finding.includes('CRITICAL') || finding.includes('🚨')) return 'CRITICAL';
      if (finding.includes('HIGH') || finding.includes('❌')) return 'HIGH';
      if (finding.includes('MEDIUM') || finding.includes('⚠️')) return 'MEDIUM';
      return 'LOW';
    } else if (typeof finding === 'object' && finding.severity) {
      return finding.severity;
    }
    return 'UNKNOWN';
  }

  generateRecommendations() {
    const recommendations = [];

    // Based on scores
    const scores = this.executionResults.summary_scores;
    
    if (scores.compliance < 85) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Compliance',
        action: 'Address HIPAA compliance gaps immediately',
        description: 'HIPAA compliance score below acceptable threshold'
      });
    }

    if (scores.audit < 75) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Security',
        action: 'Resolve critical security vulnerabilities',
        description: 'Security audit identified significant vulnerabilities'
      });
    }

    // Based on critical findings
    const criticalCount = this.executionResults.critical_findings
      .filter(f => f.severity === 'CRITICAL' || f.severity === 'HIGH').length;

    if (criticalCount > 5) {
      recommendations.push({
        priority: 'CRITICAL',
        category: 'Immediate Action',
        action: 'Address all critical and high-severity findings',
        description: `${criticalCount} critical/high severity issues require immediate attention`
      });
    }

    // Based on failed tools
    const failedCriticalTools = this.executionResults.tools_executed
      .filter(tool => tool.status === 'failed' && this.availableTools[tool.name].priority === 1);

    if (failedCriticalTools.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'Infrastructure',
        action: 'Fix security tooling infrastructure',
        description: 'Critical security tools failed to execute properly'
      });
    }

    // General recommendations
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Process',
      action: 'Implement continuous security monitoring',
      description: 'Set up automated security monitoring and alerting'
    });

    recommendations.push({
      priority: 'MEDIUM',
      category: 'Training',
      action: 'Conduct security awareness training',
      description: 'Ensure all staff understand security policies and procedures'
    });

    this.executionResults.recommendations = recommendations;
  }

  async generateMasterReport() {
    console.log('📋 Generating comprehensive security assessment report...');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Generate JSON summary report
    const jsonReportPath = path.join(this.reportsDir, `security-master-report-${timestamp}.json`);
    fs.writeFileSync(jsonReportPath, JSON.stringify(this.executionResults, null, 2));

    // Generate HTML executive report
    const htmlReport = this.generateHTMLMasterReport();
    const htmlReportPath = path.join(this.reportsDir, `security-executive-report-${timestamp}.html`);
    fs.writeFileSync(htmlReportPath, htmlReport);

    // Generate markdown summary
    const mdReport = this.generateMarkdownSummary();
    const mdReportPath = path.join(this.reportsDir, `SECURITY_ASSESSMENT_SUMMARY.md`);
    fs.writeFileSync(mdReportPath, mdReport);

    console.log(`   📊 Master report: ${jsonReportPath}`);
    console.log(`   🌐 Executive report: ${htmlReportPath}`);
    console.log(`   📄 Summary report: ${mdReportPath}`);
  }

  generateHTMLMasterReport() {
    const statusColor = this.getStatusColor(this.executionResults.overall_status);
    const overallScore = Object.values(this.executionResults.summary_scores)
      .reduce((sum, score, index, arr) => sum + score / arr.length, 0);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Assessment Executive Report - Serenity Healthcare Platform</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 40px; }
        .status-badge { display: inline-block; padding: 12px 24px; border-radius: 25px; color: white; background: ${statusColor}; font-weight: bold; text-transform: uppercase; font-size: 18px; margin: 10px 0; }
        .score-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .score-card { background: #f8f9fa; padding: 25px; border-radius: 10px; text-align: center; border-left: 4px solid #007bff; }
        .score-value { font-size: 48px; font-weight: bold; color: #007bff; margin: 10px 0; }
        .tools-section { margin: 30px 0; }
        .tool-item { display: flex; justify-content: space-between; align-items: center; padding: 15px; margin: 10px 0; background: #f8f9fa; border-radius: 8px; }
        .tool-success { border-left: 4px solid #28a745; }
        .tool-failed { border-left: 4px solid #dc3545; }
        .findings-section { margin: 30px 0; }
        .finding-item { padding: 15px; margin: 10px 0; border-radius: 8px; }
        .finding-critical { background: #f8d7da; border-left: 4px solid #dc3545; }
        .finding-high { background: #fff3cd; border-left: 4px solid #ffc107; }
        .finding-medium { background: #cff4fc; border-left: 4px solid #0dcaf0; }
        .recommendations { background: #d1ecf1; padding: 20px; border-radius: 10px; margin: 20px 0; }
        .rec-item { margin: 10px 0; padding: 10px; background: white; border-radius: 5px; }
        .rec-critical { border-left: 4px solid #dc3545; }
        .rec-high { border-left: 4px solid #fd7e14; }
        .rec-medium { border-left: 4px solid #ffc107; }
        .summary-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0; text-align: center; }
        .stat-card { background: #e9ecef; padding: 15px; border-radius: 8px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #495057; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ Security Assessment Executive Report</h1>
            <h2>Serenity Sober Pathways Healthcare Platform</h2>
            <div class="status-badge">${this.executionResults.overall_status.toUpperCase()}</div>
            <p><strong>Assessment Date:</strong> ${new Date(this.executionResults.timestamp).toLocaleString()}</p>
            <p><strong>Execution Time:</strong> ${Math.round(this.executionResults.execution_time / 1000)} seconds</p>
        </div>

        <div class="summary-stats">
            <div class="stat-card">
                <div class="stat-value">${this.executionResults.tools_executed.length}</div>
                <div>Tools Executed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.executionResults.tools_executed.filter(t => t.status === 'completed').length}</div>
                <div>Successful</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${this.executionResults.critical_findings.length}</div>
                <div>Findings</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Math.round(overallScore) || 'N/A'}</div>
                <div>Overall Score</div>
            </div>
        </div>

        <div class="score-grid">
            ${Object.entries(this.executionResults.summary_scores).map(([category, score]) => `
                <div class="score-card">
                    <h3>${category.toUpperCase()}</h3>
                    <div class="score-value" style="color: ${this.getScoreColor(score)}">${score}</div>
                    <div>Security Score</div>
                </div>
            `).join('')}
        </div>

        <div class="tools-section">
            <h2>🔧 Security Tools Execution Results</h2>
            ${this.executionResults.tools_executed.map(tool => `
                <div class="tool-item ${tool.status === 'completed' ? 'tool-success' : 'tool-failed'}">
                    <div>
                        <strong>${tool.name}</strong><br>
                        <small>${this.availableTools[tool.name]?.description || 'Security assessment tool'}</small>
                    </div>
                    <div>
                        <span style="color: ${tool.status === 'completed' ? '#28a745' : '#dc3545'};">
                            ${tool.status.toUpperCase()}
                        </span>
                        ${tool.score > 0 ? `<br><small>Score: ${tool.score}</small>` : ''}
                    </div>
                </div>
            `).join('')}
        </div>

        ${this.executionResults.critical_findings.length > 0 ? `
            <div class="findings-section">
                <h2>⚠️ Critical Security Findings</h2>
                ${this.executionResults.critical_findings.slice(0, 10).map(finding => `
                    <div class="finding-item finding-${finding.severity.toLowerCase()}">
                        <strong>[${finding.tool.toUpperCase()}]</strong> ${finding.severity}<br>
                        ${typeof finding.finding === 'object' ? finding.finding.description || finding.finding.type : finding.finding}
                    </div>
                `).join('')}
                ${this.executionResults.critical_findings.length > 10 ? '<p>... and more findings in detailed reports</p>' : ''}
            </div>
        ` : '<div class="findings-section"><h2>✅ No Critical Findings</h2><p>No critical security findings were identified.</p></div>'}

        <div class="recommendations">
            <h2>💡 Security Recommendations</h2>
            ${this.executionResults.recommendations.map(rec => `
                <div class="rec-item rec-${rec.priority.toLowerCase()}">
                    <strong>${rec.priority} Priority</strong> - ${rec.category}<br>
                    <strong>Action:</strong> ${rec.action}<br>
                    <small>${rec.description}</small>
                </div>
            `).join('')}
        </div>

        <div style="margin-top: 40px; padding: 20px; background: #f8f9fa; border-radius: 10px;">
            <h3>📋 Next Steps</h3>
            <ol>
                <li><strong>Review detailed reports</strong> for specific vulnerabilities and compliance gaps</li>
                <li><strong>Prioritize critical and high-severity findings</strong> for immediate remediation</li>
                <li><strong>Implement recommended security controls</strong> based on assessment results</li>
                <li><strong>Schedule regular security assessments</strong> to maintain security posture</li>
                <li><strong>Update security policies and procedures</strong> as needed</li>
            </ol>
        </div>

        <div style="text-align: center; margin-top: 30px; color: #6c757d;">
            <p>This report was generated by the Serenity Security Master Runner</p>
            <p>For questions or concerns, contact: security-officer@serenity.com</p>
        </div>
    </div>
</body>
</html>`;
  }

  generateMarkdownSummary() {
    const overallScore = Object.values(this.executionResults.summary_scores)
      .reduce((sum, score, index, arr) => sum + score / arr.length, 0);

    return `# Security Assessment Summary
## Serenity Sober Pathways Healthcare Platform

**Assessment Date:** ${new Date(this.executionResults.timestamp).toLocaleString()}  
**Overall Status:** ${this.executionResults.overall_status.toUpperCase()}  
**Overall Score:** ${Math.round(overallScore) || 'N/A'}  
**Execution Time:** ${Math.round(this.executionResults.execution_time / 1000)} seconds

---

## 📊 Summary Scores

${Object.entries(this.executionResults.summary_scores).map(([category, score]) => 
  `- **${category.toUpperCase()}:** ${score}/100`
).join('\n')}

## 🔧 Tools Executed

${this.executionResults.tools_executed.map(tool => 
  `- **${tool.name}** (${tool.category}): ${tool.status.toUpperCase()}${tool.score > 0 ? ` - Score: ${tool.score}` : ''}${tool.error ? ` - Error: ${tool.error}` : ''}`
).join('\n')}

## ⚠️ Critical Findings (${this.executionResults.critical_findings.length})

${this.executionResults.critical_findings.slice(0, 10).map(finding => 
  `- **[${finding.tool.toUpperCase()}] ${finding.severity}:** ${typeof finding.finding === 'object' ? finding.finding.description || finding.finding.type : finding.finding}`
).join('\n')}

${this.executionResults.critical_findings.length > 10 ? '\n*... and more findings in detailed reports*' : ''}

## 💡 Recommendations

${this.executionResults.recommendations.map(rec => 
  `### ${rec.priority} Priority: ${rec.action}\n**Category:** ${rec.category}  \n**Description:** ${rec.description}\n`
).join('\n')}

## 📋 Next Steps

1. **Review Detailed Reports:** Examine individual tool reports for specific vulnerabilities
2. **Prioritize Remediation:** Address critical and high-severity findings first
3. **Implement Controls:** Deploy recommended security controls and measures
4. **Schedule Regular Assessments:** Establish ongoing security assessment schedule
5. **Update Procedures:** Revise security policies and procedures as needed

---

**Generated by:** Serenity Security Master Runner v1.0  
**Contact:** security-officer@serenity.com`;
  }

  displayExecutionSummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SECURITY ASSESSMENT EXECUTION SUMMARY');
    console.log('='.repeat(60));

    // Overall status
    const statusIcon = {
      'success': '✅',
      'partial': '⚠️',
      'failed': '❌'
    }[this.executionResults.overall_status];

    console.log(`\n${statusIcon} Overall Status: ${this.executionResults.overall_status.toUpperCase()}`);
    console.log(`⏱️  Total Execution Time: ${Math.round(this.executionResults.execution_time / 1000)} seconds`);

    // Tools summary
    const completed = this.executionResults.tools_executed.filter(t => t.status === 'completed').length;
    const failed = this.executionResults.tools_executed.filter(t => t.status === 'failed').length;
    
    console.log(`\n🔧 Tools Executed: ${this.executionResults.tools_executed.length}`);
    console.log(`   ✅ Completed: ${completed}`);
    console.log(`   ❌ Failed: ${failed}`);

    // Category scores
    console.log('\n📊 Category Scores:');
    Object.entries(this.executionResults.summary_scores).forEach(([category, score]) => {
      const scoreIcon = score >= 90 ? '🟢' : score >= 75 ? '🟡' : score >= 60 ? '🟠' : '🔴';
      console.log(`   ${scoreIcon} ${category.toUpperCase()}: ${score}/100`);
    });

    // Critical findings
    console.log(`\n⚠️  Critical Findings: ${this.executionResults.critical_findings.length}`);
    if (this.executionResults.critical_findings.length > 0) {
      const severityCounts = this.executionResults.critical_findings.reduce((acc, finding) => {
        acc[finding.severity] = (acc[finding.severity] || 0) + 1;
        return acc;
      }, {});

      Object.entries(severityCounts).forEach(([severity, count]) => {
        const severityIcon = {
          'CRITICAL': '🚨',
          'HIGH': '❌',
          'MEDIUM': '⚠️',
          'LOW': '💡'
        }[severity] || '❓';
        console.log(`   ${severityIcon} ${severity}: ${count}`);
      });
    }

    // Top recommendations
    console.log('\n💡 Top Recommendations:');
    this.executionResults.recommendations.slice(0, 3).forEach((rec, index) => {
      const priorityIcon = {
        'CRITICAL': '🚨',
        'HIGH': '❌',
        'MEDIUM': '⚠️',
        'LOW': '💡'
      }[rec.priority] || '📋';
      console.log(`   ${index + 1}. ${priorityIcon} ${rec.action}`);
    });

    // Report locations
    console.log('\n📋 Generated Reports:');
    console.log(`   📊 Security Reports: ${this.reportsDir}/`);
    console.log(`   🏥 Compliance Reports: ${this.complianceDir}/`);
    console.log(`   📄 Summary: ${path.join(this.reportsDir, 'SECURITY_ASSESSMENT_SUMMARY.md')}`);

    // Final status and next steps
    console.log('\n📋 Immediate Next Steps:');
    if (this.executionResults.critical_findings.length > 0) {
      console.log('   1. 🚨 Review and address critical security findings');
      console.log('   2. 📋 Implement high-priority recommendations');
      console.log('   3. 🔄 Schedule follow-up assessment');
    } else {
      console.log('   1. ✅ Review detailed reports for improvement opportunities');
      console.log('   2. 🔄 Schedule regular security assessments');
      console.log('   3. 📚 Update security documentation');
    }

    console.log('\n' + '='.repeat(60));
  }

  getStatusColor(status) {
    const colors = {
      'success': '#28a745',
      'partial': '#ffc107',
      'failed': '#dc3545'
    };
    return colors[status] || '#6c757d';
  }

  getScoreColor(score) {
    if (score >= 90) return '#28a745';
    if (score >= 75) return '#17a2b8';
    if (score >= 60) return '#ffc107';
    return '#dc3545';
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line options
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--quick':
        options.quick = true;
        break;
      case '--compliance-only':
        options.compliance_only = true;
        break;
      case '--monitoring':
        options.monitoring = true;
        break;
      case '--tools':
        options.tools = args[++i]?.split(',');
        break;
      case '--help':
        console.log(`
Serenity Security Master Runner

Usage: node security-master-runner.js [options]

Options:
  --quick           Run only critical priority tools (faster assessment)
  --compliance-only Run only HIPAA compliance validation tools
  --monitoring      Start compliance monitoring dashboard only
  --tools           Comma-separated list of specific tools to run
  --help            Show this help message

Available Tools:
  - comprehensive-security-audit    Full security audit with penetration testing
  - hipaa-compliance-validator      HIPAA compliance validation
  - automated-security-testing      Automated security testing framework
  - compliance-monitoring-dashboard Real-time compliance monitoring
  - dependency-security-scan        NPM dependency vulnerability scanning

Examples:
  node security-master-runner.js --quick
  node security-master-runner.js --compliance-only
  node security-master-runner.js --tools comprehensive-security-audit,hipaa-compliance-validator
  node security-master-runner.js --monitoring
`);
        process.exit(0);
        break;
    }
  }

  const runner = new SecurityMasterRunner();
  runner.runComprehensiveSecurityAssessment(options)
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Security assessment failed:', error);
      process.exit(1);
    });
}

module.exports = { SecurityMasterRunner };