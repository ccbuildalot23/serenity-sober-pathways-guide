#!/usr/bin/env node

/**
 * GitHub Actions Workflow Monitor for iOS Deployments
 * Monitors the iOS deployment workflow and Build 27 artifacts
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class GitHubActionsMonitor {
  constructor() {
    this.repoOwner = 'your-github-username'; // Update with actual repo info
    this.repoName = 'serenity-sober-pathways-guide';
    this.workflowName = 'iOS App Store Deployment';
    this.logFile = path.join(__dirname, '..', 'github-actions-monitor.log');
    this.statusFile = path.join(__dirname, '..', 'github-actions-status.json');
    
    // Try to get repo info from git remote
    this.detectRepoInfo();
    
    this.log('🔧 GitHub Actions Monitor initialized');
    this.log(`📁 Repository: ${this.repoOwner}/${this.repoName}`);
    this.log(`🚀 Monitoring workflow: ${this.workflowName}`);
  }

  detectRepoInfo() {
    try {
      const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
      const match = remoteUrl.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
      
      if (match) {
        this.repoOwner = match[1];
        this.repoName = match[2];
        this.log(`✅ Detected repository: ${this.repoOwner}/${this.repoName}`);
      }
    } catch (error) {
      this.log(`⚠️ Could not detect repository info: ${error.message}`);
    }
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    
    fs.appendFileSync(this.logFile, logEntry + '\n');
  }

  async makeGitHubRequest(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      const token = process.env.GITHUB_TOKEN;
      
      const requestOptions = {
        hostname: 'api.github.com',
        path: endpoint,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'TestFlight-Monitor/1.0',
          'Accept': 'application/vnd.github.v3+json',
          ...(token && { 'Authorization': `token ${token}` }),
          ...options.headers
        }
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
          } catch (error) {
            reject(new Error(`Failed to parse JSON: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  async getWorkflowRuns() {
    try {
      this.log('📡 Fetching workflow runs...');
      
      const endpoint = `/repos/${this.repoOwner}/${this.repoName}/actions/runs?per_page=10`;
      const response = await this.makeGitHubRequest(endpoint);
      
      if (response.status !== 200) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }
      
      return response.data.workflow_runs;
    } catch (error) {
      this.log(`❌ Failed to fetch workflow runs: ${error.message}`);
      throw error;
    }
  }

  async getWorkflowRunDetails(runId) {
    try {
      const endpoint = `/repos/${this.repoOwner}/${this.repoName}/actions/runs/${runId}`;
      const response = await this.makeGitHubRequest(endpoint);
      
      if (response.status !== 200) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }
      
      return response.data;
    } catch (error) {
      this.log(`❌ Failed to fetch run details for ${runId}: ${error.message}`);
      throw error;
    }
  }

  async getWorkflowRunJobs(runId) {
    try {
      const endpoint = `/repos/${this.repoOwner}/${this.repoName}/actions/runs/${runId}/jobs`;
      const response = await this.makeGitHubRequest(endpoint);
      
      if (response.status !== 200) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }
      
      return response.data.jobs;
    } catch (error) {
      this.log(`❌ Failed to fetch jobs for run ${runId}: ${error.message}`);
      throw error;
    }
  }

  async getArtifacts(runId) {
    try {
      const endpoint = `/repos/${this.repoOwner}/${this.repoName}/actions/runs/${runId}/artifacts`;
      const response = await this.makeGitHubRequest(endpoint);
      
      if (response.status !== 200) {
        throw new Error(`GitHub API returned status ${response.status}`);
      }
      
      return response.data.artifacts;
    } catch (error) {
      this.log(`❌ Failed to fetch artifacts for run ${runId}: ${error.message}`);
      return [];
    }
  }

  async findBuild27Workflow() {
    try {
      this.log('🔍 Searching for Build 27 workflow run...');
      
      const runs = await this.getWorkflowRuns();
      
      // Look for the most recent iOS deployment workflow
      const iosRuns = runs.filter(run => 
        run.name === this.workflowName || 
        run.workflow_id.toString().includes('ios') ||
        run.head_commit?.message?.includes('Build 27') ||
        run.head_commit?.message?.includes('iOS')
      );
      
      if (iosRuns.length === 0) {
        this.log('⚠️ No iOS deployment workflows found in recent runs');
        return null;
      }
      
      // Get the most recent run
      const latestRun = iosRuns[0];
      this.log(`✅ Found workflow run: ${latestRun.id} (${latestRun.status})`);
      
      return latestRun;
    } catch (error) {
      this.log(`❌ Failed to find Build 27 workflow: ${error.message}`);
      return null;
    }
  }

  async analyzeBuild27Status() {
    try {
      const workflowRun = await this.findBuild27Workflow();
      
      if (!workflowRun) {
        return {
          found: false,
          message: 'No recent iOS deployment workflow found'
        };
      }

      // Get detailed run information
      const runDetails = await this.getWorkflowRunDetails(workflowRun.id);
      const jobs = await this.getWorkflowRunJobs(workflowRun.id);
      const artifacts = await this.getArtifacts(workflowRun.id);

      // Analyze the workflow status
      const analysis = {
        found: true,
        runId: workflowRun.id,
        status: workflowRun.status,
        conclusion: workflowRun.conclusion,
        createdAt: workflowRun.created_at,
        updatedAt: workflowRun.updated_at,
        htmlUrl: workflowRun.html_url,
        headCommit: workflowRun.head_commit,
        jobs: jobs.map(job => ({
          name: job.name,
          status: job.status,
          conclusion: job.conclusion,
          startedAt: job.started_at,
          completedAt: job.completed_at,
          steps: job.steps?.length || 0,
          failedSteps: job.steps?.filter(step => step.conclusion === 'failure').length || 0
        })),
        artifacts: artifacts.map(artifact => ({
          name: artifact.name,
          size: artifact.size_in_bytes,
          createdAt: artifact.created_at,
          downloadUrl: artifact.archive_download_url
        })),
        duration: this.calculateDuration(workflowRun.created_at, workflowRun.updated_at),
        buildNumber: this.extractBuildNumber(workflowRun)
      };

      this.log(`📊 Workflow Analysis Complete: ${analysis.status}/${analysis.conclusion}`);
      
      return analysis;
    } catch (error) {
      this.log(`❌ Failed to analyze Build 27 status: ${error.message}`);
      return {
        found: false,
        error: error.message
      };
    }
  }

  calculateDuration(startTime, endTime) {
    if (!startTime || !endTime) return null;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end - start;
    
    const minutes = Math.floor(durationMs / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    return `${minutes}m ${seconds}s`;
  }

  extractBuildNumber(workflowRun) {
    // Try to extract build number from various sources
    if (workflowRun.run_number === 27) return 27;
    if (workflowRun.head_commit?.message?.includes('Build 27')) return 27;
    if (workflowRun.head_commit?.message?.includes('#27')) return 27;
    
    return workflowRun.run_number || null;
  }

  async checkWorkflowHealth() {
    try {
      this.log('🏥 Performing workflow health check...');
      
      const analysis = await this.analyzeBuild27Status();
      
      if (!analysis.found) {
        return {
          healthy: false,
          issues: ['No iOS deployment workflow found'],
          recommendations: ['Check if workflow was triggered', 'Verify branch and triggers']
        };
      }

      const issues = [];
      const recommendations = [];

      // Check workflow completion
      if (analysis.status === 'in_progress') {
        issues.push('Workflow is still running');
        recommendations.push('Wait for workflow to complete');
      } else if (analysis.conclusion === 'failure') {
        issues.push('Workflow failed');
        recommendations.push('Check workflow logs for errors');
      } else if (analysis.conclusion === 'cancelled') {
        issues.push('Workflow was cancelled');
        recommendations.push('Re-run the workflow if needed');
      }

      // Check for failed jobs
      const failedJobs = analysis.jobs?.filter(job => job.conclusion === 'failure') || [];
      if (failedJobs.length > 0) {
        issues.push(`${failedJobs.length} job(s) failed`);
        recommendations.push('Review failed job logs');
      }

      // Check for artifacts (IPA file should be present)
      const ipaArtifacts = analysis.artifacts?.filter(artifact => 
        artifact.name.includes('ios') || 
        artifact.name.includes('build') ||
        artifact.name.includes('ipa')
      ) || [];
      
      if (ipaArtifacts.length === 0 && analysis.conclusion === 'success') {
        issues.push('No iOS build artifacts found');
        recommendations.push('Verify build and upload steps completed');
      }

      return {
        healthy: issues.length === 0,
        issues,
        recommendations,
        analysis
      };
    } catch (error) {
      return {
        healthy: false,
        issues: [`Health check failed: ${error.message}`],
        recommendations: ['Check network connection and GitHub token']
      };
    }
  }

  async generateWorkflowReport() {
    try {
      this.log('📋 Generating workflow report...');
      
      const healthCheck = await this.checkWorkflowHealth();
      
      const report = {
        timestamp: new Date().toISOString(),
        repository: `${this.repoOwner}/${this.repoName}`,
        workflowName: this.workflowName,
        healthy: healthCheck.healthy,
        summary: healthCheck.healthy ? 
          'All systems operational' : 
          `${healthCheck.issues.length} issue(s) detected`,
        details: healthCheck,
        nextActions: healthCheck.recommendations
      };

      // Save report to file
      fs.writeFileSync(this.statusFile, JSON.stringify(report, null, 2));
      
      return report;
    } catch (error) {
      this.log(`❌ Failed to generate workflow report: ${error.message}`);
      throw error;
    }
  }

  async startMonitoring(intervalMinutes = 2) {
    this.log(`🔄 Starting GitHub Actions monitoring (every ${intervalMinutes} minutes)`);
    
    const monitorLoop = async () => {
      try {
        const report = await this.generateWorkflowReport();
        
        this.log(`📊 Status: ${report.healthy ? '✅ Healthy' : '⚠️ Issues detected'}`);
        
        if (!report.healthy) {
          this.log('🚨 Issues found:');
          report.details.issues.forEach(issue => this.log(`   - ${issue}`));
        }
        
        // Continue monitoring
        setTimeout(monitorLoop, intervalMinutes * 60 * 1000);
      } catch (error) {
        this.log(`❌ Error in monitoring loop: ${error.message}`);
        setTimeout(monitorLoop, intervalMinutes * 60 * 1000);
      }
    };
    
    monitorLoop();
  }

  async getLatestArtifacts() {
    try {
      const analysis = await this.analyzeBuild27Status();
      
      if (!analysis.found || !analysis.artifacts) {
        return [];
      }
      
      return analysis.artifacts.map(artifact => ({
        ...artifact,
        downloadCommand: `gh run download ${analysis.runId} -n "${artifact.name}"`,
        webUrl: `https://github.com/${this.repoOwner}/${this.repoName}/actions/runs/${analysis.runId}`
      }));
    } catch (error) {
      this.log(`❌ Failed to get artifacts: ${error.message}`);
      return [];
    }
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new GitHubActionsMonitor();
  
  const command = process.argv[2] || 'report';
  
  switch (command) {
    case 'check':
      monitor.checkWorkflowHealth().then(health => {
        console.log('\n🏥 Workflow Health Check:');
        console.log(JSON.stringify(health, null, 2));
      });
      break;
      
    case 'artifacts':
      monitor.getLatestArtifacts().then(artifacts => {
        console.log('\n📦 Latest Build Artifacts:');
        console.log(JSON.stringify(artifacts, null, 2));
      });
      break;
      
    case 'monitor':
      console.log('🚀 Starting GitHub Actions monitoring...');
      console.log('Press Ctrl+C to stop\n');
      monitor.startMonitoring(2);
      break;
      
    case 'report':
    default:
      monitor.generateWorkflowReport().then(report => {
        console.log('\n📋 GitHub Actions Report:');
        console.log(JSON.stringify(report, null, 2));
      });
      break;
  }
  
  process.on('SIGINT', () => {
    monitor.log('🛑 Monitoring stopped');
    process.exit(0);
  });
}

module.exports = GitHubActionsMonitor;