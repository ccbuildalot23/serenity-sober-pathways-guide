# BMAD Diagnostic Swarm Deployment Script
# Deploys multiple AI agents in parallel for comprehensive analysis

param(
    [switch]$FullAnalysis = $false,
    [switch]$SecurityFocus = $false,
    [switch]$PerformanceFocus = $false
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "   BMAD DIAGNOSTIC SWARM DEPLOYMENT" -ForegroundColor Magenta
Write-Host "========================================" -ForegroundColor Magenta
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
Write-Host ""

$logDir = "swarm-diagnostics/$(Get-Date -Format 'yyyy-MM-dd-HHmm')"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# Define swarm agents
$swarmAgents = @()

# Core diagnostic agents (always run)
$swarmAgents += @(
    @{Name="Code Analyzer"; Command="node .bmad-core/bmad.js analyze"; Priority=1},
    @{Name="Security Scanner"; Command="node scripts/security-dependency-scan.cjs"; Priority=1},
    @{Name="HIPAA Validator"; Command="node .bmad-core/bmad.js hipaa-audit"; Priority=1}
)

if ($SecurityFocus -or $FullAnalysis) {
    $swarmAgents += @(
        @{Name="Byzantine Validator"; Command="node .bmad-core/bmad.js agent byzantine-validator"; Priority=2},
        @{Name="CloudTrail Auditor"; Command="node .bmad-core/bmad.js agent cloudtrail-auditor"; Priority=2},
        @{Name="PHI Guardian"; Command="node .bmad-core/bmad.js agent phi-guardian"; Priority=2}
    )
}

if ($PerformanceFocus -or $FullAnalysis) {
    $swarmAgents += @(
        @{Name="Performance Benchmarker"; Command="npm run lighthouse:test"; Priority=3},
        @{Name="Bundle Analyzer"; Command="npm run build -- --mode development"; Priority=3}
    )
}

if ($FullAnalysis) {
    $swarmAgents += @(
        @{Name="Test Coverage"; Command="npm run test:coverage"; Priority=4},
        @{Name="Type Checker"; Command="npm run typecheck"; Priority=4},
        @{Name="Linter"; Command="npm run lint"; Priority=4}
    )
}

Write-Host "SWARM CONFIGURATION" -ForegroundColor Cyan
Write-Host "-------------------" -ForegroundColor DarkCyan
Write-Host "Total Agents: $($swarmAgents.Count)" -ForegroundColor Yellow
Write-Host "Log Directory: $logDir" -ForegroundColor Yellow
Write-Host ""

# Deploy agents in parallel batches by priority
$priorities = $swarmAgents.Priority | Select-Object -Unique | Sort-Object

foreach ($priority in $priorities) {
    $priorityAgents = $swarmAgents | Where-Object { $_.Priority -eq $priority }
    
    Write-Host "DEPLOYING PRIORITY $priority AGENTS" -ForegroundColor Cyan
    Write-Host "--------------------------------" -ForegroundColor DarkCyan
    
    $jobs = @()
    
    foreach ($agent in $priorityAgents) {
        Write-Host "  Spawning: $($agent.Name)..." -ForegroundColor Yellow
        
        $job = Start-Job -Name $agent.Name -ScriptBlock {
            param($command, $logPath)
            
            try {
                $output = Invoke-Expression $command 2>&1
                $output | Out-File $logPath -Encoding UTF8
                
                return @{
                    Success = $true
                    Output = $output
                }
            } catch {
                return @{
                    Success = $false
                    Error = $_.Exception.Message
                }
            }
        } -ArgumentList $agent.Command, "$logDir/$($agent.Name -replace ' ', '-').log"
        
        $jobs += $job
    }
    
    # Wait for this priority batch to complete
    Write-Host "  Waiting for Priority $priority agents..." -ForegroundColor DarkYellow
    
    $completed = 0
    while ($jobs | Where-Object { $_.State -eq 'Running' }) {
        Start-Sleep -Seconds 2
        $running = ($jobs | Where-Object { $_.State -eq 'Running' }).Count
        $newCompleted = ($jobs | Where-Object { $_.State -ne 'Running' }).Count
        
        if ($newCompleted -gt $completed) {
            $completed = $newCompleted
            Write-Host "  Progress: $completed/$($jobs.Count) completed" -ForegroundColor DarkYellow
        }
    }
    
    # Collect results
    foreach ($job in $jobs) {
        $result = Receive-Job -Job $job
        
        if ($result.Success) {
            Write-Host "  [OK] $($job.Name)" -ForegroundColor Green
        } else {
            Write-Host "  [FAILED] $($job.Name)" -ForegroundColor Red
        }
        
        Remove-Job -Job $job
    }
    
    Write-Host ""
}

# Generate diagnostic report
Write-Host "GENERATING DIAGNOSTIC REPORT" -ForegroundColor Cyan
Write-Host "----------------------------" -ForegroundColor DarkCyan

$report = @"
# BMAD Swarm Diagnostic Report
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Swarm Configuration
- Total Agents Deployed: $($swarmAgents.Count)
- Analysis Type: $(if ($FullAnalysis) { "Full Analysis" } elseif ($SecurityFocus) { "Security Focus" } elseif ($PerformanceFocus) { "Performance Focus" } else { "Core Diagnostics" })

## Key Findings

### Security Status
$(Get-Content "$logDir/Security-Scanner.log" -ErrorAction SilentlyContinue | Select-String "Status:|vulnerabilities:" -Context 0,1 | Out-String)

### HIPAA Compliance
$(Get-Content "$logDir/HIPAA-Validator.log" -ErrorAction SilentlyContinue | Select-String "COMPLIANT|NON-COMPLIANT" -Context 1,1 | Out-String)

### Code Analysis
$(Get-Content "$logDir/Code-Analyzer.log" -ErrorAction SilentlyContinue | Select-String "Issues found:|Health Score:" -Context 0,2 | Out-String)

## Detailed Logs
All detailed logs available in: $logDir

## Recommendations
1. Review security scan results for any vulnerabilities
2. Address HIPAA compliance issues if any
3. Optimize performance based on benchmark results
4. Fix type errors and linting issues
5. Improve test coverage if below 80%
"@

$report | Out-File "$logDir/swarm-report.md" -Encoding UTF8

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   SWARM DIAGNOSTIC COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "Report: $logDir/swarm-report.md" -ForegroundColor Cyan
Write-Host ""

# Open report
Start-Process "$logDir/swarm-report.md"