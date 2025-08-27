#!/usr/bin/env pwsh
<#
.SYNOPSIS
Execute Complete Orchestration System

.DESCRIPTION
Master script to execute the comprehensive orchestration plan for implementing
Phases 2-6 of the optimization strategy with autonomous swarm coordination.
#>

param(
    [ValidateSet('all', '2', '3', '4', '5', '6', 'validate')]
    [string]$Phase = 'all',
    
    [ValidateSet('autonomous', 'interactive', 'diagnostic', 'validate')]
    [string]$Mode = 'autonomous',
    
    [switch]$DryRun,
    [switch]$Verbose,
    [switch]$EnableSwarm = $true,
    [switch]$ContinuousMonitoring = $true,
    [int]$MaxAgents = 10
)

# Global orchestration state
$Global:OrchestrationState = @{
    Id = [System.Guid]::NewGuid().ToString().Substring(0, 8)
    StartTime = Get-Date
    Phase = $Phase
    Mode = $Mode
    Status = 'INITIALIZING'
    Results = @{}
    Logs = @()
    SwarmActive = $false
}

function Write-OrchestrationLog {
    param(
        [string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR', 'DEBUG', 'SUCCESS')]
        [string]$Level = 'INFO',
        [string]$Component = 'ORCHESTRATOR'
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = @{
        Timestamp = $timestamp
        Level = $Level
        Component = $Component
        Message = $Message
    }
    
    $Global:OrchestrationState.Logs += $logEntry
    
    $color = switch ($Level) {
        'ERROR' { 'Red' }
        'WARN' { 'Yellow' }
        'SUCCESS' { 'Green' }
        'DEBUG' { 'Cyan' }
        default { 'White' }
    }
    
    $logMessage = "[$timestamp] [$Level] [$Component] $Message"
    Write-Host $logMessage -ForegroundColor $color
    
    if ($Verbose -or $Level -in @('ERROR', 'WARN', 'SUCCESS')) {
        $logFile = "orchestration-logs/$((Get-Date).ToString('yyyy-MM-dd-HHmm'))/orchestration-$($Global:OrchestrationState.Id).log"
        $logDir = Split-Path $logFile -Parent
        if (-not (Test-Path $logDir)) {
            New-Item -ItemType Directory -Path $logDir -Force | Out-Null
        }
        $logMessage | Out-File -FilePath $logFile -Append -Encoding UTF8
    }
}

function Test-SystemPrerequisites {
    Write-OrchestrationLog "Testing system prerequisites..." -Level 'INFO'
    
    $prerequisites = @(
        @{ Name = 'PowerShell'; Command = '$PSVersionTable.PSVersion.Major'; MinVersion = 5; Critical = $true },
        @{ Name = 'Node.js'; Command = 'node --version'; Pattern = 'v(\d+)'; MinVersion = 20; Critical = $true },
        @{ Name = 'npm'; Command = 'npm --version'; Pattern = '(\d+)'; MinVersion = 10; Critical = $true },
        @{ Name = 'Git'; Command = 'git --version'; Pattern = 'git version (\d+)'; MinVersion = 2; Critical = $true },
        @{ Name = 'TypeScript'; Command = 'npx tsc --version'; Pattern = 'Version (\d+)'; MinVersion = 4; Critical = $false }
    )
    
    $allCriticalPassed = $true
    $results = @{}
    
    foreach ($prereq in $prerequisites) {
        try {
            $result = Invoke-Expression $prereq.Command 2>$null
            
            if ($result) {
                if ($prereq.Pattern) {
                    if ($result -match $prereq.Pattern) {
                        $version = [int]$matches[1]
                        $passed = $version -ge $prereq.MinVersion
                    } else {
                        $passed = $false
                        $version = "Unknown"
                    }
                } else {
                    $version = [int]$result
                    $passed = $version -ge $prereq.MinVersion
                }
                
                $results[$prereq.Name] = @{
                    Available = $true
                    Version = if ($prereq.Pattern) { $result } else { $version }
                    Passed = $passed
                    Critical = $prereq.Critical
                }
                
                if ($passed) {
                    Write-OrchestrationLog "✓ $($prereq.Name): $($results[$prereq.Name].Version)" -Level 'SUCCESS'
                } else {
                    $level = if ($prereq.Critical) { 'ERROR' } else { 'WARN' }
                    Write-OrchestrationLog "✗ $($prereq.Name): $($results[$prereq.Name].Version) (requires >= $($prereq.MinVersion))" -Level $level
                    if ($prereq.Critical) { $allCriticalPassed = $false }
                }
            } else {
                $results[$prereq.Name] = @{
                    Available = $false
                    Passed = $false
                    Critical = $prereq.Critical
                }
                
                $level = if ($prereq.Critical) { 'ERROR' } else { 'WARN' }
                Write-OrchestrationLog "✗ $($prereq.Name): Not found" -Level $level
                if ($prereq.Critical) { $allCriticalPassed = $false }
            }
        }
        catch {
            $results[$prereq.Name] = @{
                Available = $false
                Passed = $false
                Error = $_.Exception.Message
                Critical = $prereq.Critical
            }
            
            $level = if ($prereq.Critical) { 'ERROR' } else { 'WARN' }
            Write-OrchestrationLog "✗ $($prereq.Name): Error - $($_.Exception.Message)" -Level $level
            if ($prereq.Critical) { $allCriticalPassed = $false }
        }
    }
    
    $Global:OrchestrationState.Results['Prerequisites'] = $results
    
    if (-not $allCriticalPassed) {
        throw "Critical prerequisites not met. Please install missing dependencies and try again."
    }
    
    Write-OrchestrationLog "All critical prerequisites met" -Level 'SUCCESS'
    return $results
}

function Initialize-SwarmCoordination {
    if (-not $EnableSwarm) {
        Write-OrchestrationLog "Swarm coordination disabled" -Level 'INFO'
        return $null
    }
    
    Write-OrchestrationLog "Initializing swarm coordination system..." -Level 'INFO'
    
    try {
        # Check if swarm coordinator exists
        $swarmScript = "scripts/swarm-coordinator.ps1"
        if (-not (Test-Path $swarmScript)) {
            Write-OrchestrationLog "Swarm coordinator script not found at $swarmScript" -Level 'WARN'
            return $null
        }
        
        # Initialize swarm with adaptive topology
        $swarmConfig = @{
            Topology = 'adaptive'
            MaxAgents = $MaxAgents
            Domain = 'optimization'
            ContinuousMonitoring = $ContinuousMonitoring
            AutoScale = $true
        }
        
        Write-OrchestrationLog "Starting swarm with configuration: $($swarmConfig | ConvertTo-Json -Compress)" -Level 'INFO'
        
        if (-not $DryRun) {
            $swarmResult = & $swarmScript -Topology $swarmConfig.Topology -MaxAgents $swarmConfig.MaxAgents -Domain $swarmConfig.Domain -ContinuousMonitoring:$swarmConfig.ContinuousMonitoring -AutoScale:$swarmConfig.AutoScale
            
            if ($LASTEXITCODE -eq 0) {
                $Global:OrchestrationState.SwarmActive = $true
                Write-OrchestrationLog "✓ Swarm coordination system initialized successfully" -Level 'SUCCESS'
                return $swarmConfig
            } else {
                Write-OrchestrationLog "Swarm initialization failed with exit code: $LASTEXITCODE" -Level 'WARN'
                return $null
            }
        } else {
            Write-OrchestrationLog "DRY RUN: Would initialize swarm coordination" -Level 'INFO'
            return $swarmConfig
        }
    }
    catch {
        Write-OrchestrationLog "Error initializing swarm: $($_.Exception.Message)" -Level 'ERROR'
        return $null
    }
}

function Invoke-OrchestrationPhase {
    param([string]$PhaseNumber)
    
    Write-OrchestrationLog "=== Executing Phase $PhaseNumber ===" -Level 'INFO'
    
    $phaseStartTime = Get-Date
    $phaseResult = @{
        Phase = $PhaseNumber
        StartTime = $phaseStartTime
        Status = 'RUNNING'
        Scripts = @()
        Errors = @()
        Duration = 0
    }
    
    # Phase configuration
    $phaseConfigs = @{
        '2' = @{
            Name = 'Security Enhancement to 95%'
            Scripts = @(
                'scripts/implement-hsts-preload.ps1',
                'scripts/setup-csp-nonce-policies.ps1',
                'scripts/setup-redis-rate-limiting.ps1',
                'scripts/setup-sentry-security-monitoring.ps1',
                'scripts/automated-security-testing.ps1'
            )
        }
        '3' = @{
            Name = 'Performance Optimization'
            Scripts = @(
                'scripts/optimize-bundle-size.ps1',
                'scripts/implement-service-worker.ps1',
                'scripts/optimize-mobile-performance.ps1',
                'scripts/setup-performance-monitoring.ps1'
            )
        }
        '4' = @{
            Name = 'Testing Infrastructure'
            Scripts = @(
                'scripts/fix-jest-configuration.ps1',
                'scripts/setup-parallel-testing.ps1',
                'scripts/implement-coverage-tracking.ps1',
                'scripts/optimize-test-execution.ps1'
            )
        }
        '5' = @{
            Name = 'AI-Powered Continuous Optimization'
            Scripts = @(
                'scripts/deploy-monitoring-swarm.ps1',
                'scripts/implement-self-healing.ps1',
                'scripts/setup-health-reporting.ps1',
                'scripts/configure-ai-optimization.ps1'
            )
        }
        '6' = @{
            Name = 'Deployment Pipeline'
            Scripts = @(
                'scripts/fix-cicd-pipeline.ps1',
                'scripts/setup-mobile-deployment.ps1',
                'scripts/implement-blue-green-deployment.ps1',
                'scripts/configure-deployment-monitoring.ps1'
            )
        }
    }
    
    $phaseConfig = $phaseConfigs[$PhaseNumber]
    if (-not $phaseConfig) {
        $phaseResult.Status = 'ERROR'
        $phaseResult.Errors += "Unknown phase: $PhaseNumber"
        return $phaseResult
    }
    
    Write-OrchestrationLog $phaseConfig.Name -Level 'INFO'
    
    # Execute phase scripts
    foreach ($scriptPath in $phaseConfig.Scripts) {
        $scriptName = Split-Path $scriptPath -Leaf
        Write-OrchestrationLog "Executing: $scriptName" -Level 'INFO'
        
        $scriptResult = @{
            Name = $scriptName
            Path = $scriptPath
            StartTime = Get-Date
            Status = 'RUNNING'
        }
        
        try {
            if (Test-Path $scriptPath) {
                if (-not $DryRun) {
                    $job = Start-Job -ScriptBlock {
                        param($ScriptPath, $DryRun, $Verbose)
                        & $ScriptPath -DryRun:$DryRun -LogLevel $(if ($Verbose) { 'DEBUG' } else { 'INFO' })
                        return $LASTEXITCODE
                    } -ArgumentList $scriptPath, $DryRun, $Verbose
                    
                    # Wait with timeout (10 minutes per script)
                    $timeout = Wait-Job -Job $job -Timeout 600
                    
                    if ($timeout) {
                        $exitCode = Receive-Job -Job $job
                        Remove-Job -Job $job -Force
                        
                        if ($exitCode -eq 0) {
                            $scriptResult.Status = 'SUCCESS'
                            Write-OrchestrationLog "✓ $scriptName completed successfully" -Level 'SUCCESS'
                        } else {
                            $scriptResult.Status = 'FAILED'
                            $scriptResult.ExitCode = $exitCode
                            $phaseResult.Errors += "$scriptName failed with exit code: $exitCode"
                            Write-OrchestrationLog "✗ $scriptName failed (Exit Code: $exitCode)" -Level 'ERROR'
                        }
                    } else {
                        Stop-Job -Job $job -ErrorAction SilentlyContinue
                        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
                        $scriptResult.Status = 'TIMEOUT'
                        $phaseResult.Errors += "$scriptName timed out after 10 minutes"
                        Write-OrchestrationLog "✗ $scriptName timed out" -Level 'ERROR'
                    }
                } else {
                    $scriptResult.Status = 'SKIPPED'
                    Write-OrchestrationLog "DRY RUN: Would execute $scriptName" -Level 'INFO'
                }
            } else {
                $scriptResult.Status = 'NOT_FOUND'
                $phaseResult.Errors += "Script not found: $scriptPath"
                Write-OrchestrationLog "✗ Script not found: $scriptPath" -Level 'WARN'
            }
        }
        catch {
            $scriptResult.Status = 'ERROR'
            $scriptResult.Error = $_.Exception.Message
            $phaseResult.Errors += "$scriptName error: $($_.Exception.Message)"
            Write-OrchestrationLog "✗ $scriptName error: $($_.Exception.Message)" -Level 'ERROR'
        }
        
        $scriptResult.EndTime = Get-Date
        $scriptResult.Duration = ($scriptResult.EndTime - $scriptResult.StartTime).TotalSeconds
        $phaseResult.Scripts += $scriptResult
        
        # Interactive mode - ask to continue on error
        if ($Mode -eq 'interactive' -and $scriptResult.Status -in @('FAILED', 'ERROR', 'TIMEOUT')) {
            $continue = Read-Host "Script $scriptName failed. Continue with phase? (y/N)"
            if ($continue -notmatch '^[Yy]') {
                Write-OrchestrationLog "User chose to stop phase execution" -Level 'WARN'
                break
            }
        }
    }
    
    # Determine final phase status
    $failedScripts = ($phaseResult.Scripts | Where-Object { $_.Status -in @('FAILED', 'ERROR', 'TIMEOUT') }).Count
    $successfulScripts = ($phaseResult.Scripts | Where-Object { $_.Status -eq 'SUCCESS' }).Count
    
    if ($failedScripts -eq 0) {
        $phaseResult.Status = 'SUCCESS'
        Write-OrchestrationLog "✓ Phase $PhaseNumber completed successfully ($successfulScripts/$($phaseResult.Scripts.Count) scripts)" -Level 'SUCCESS'
    } elseif ($successfulScripts -gt $failedScripts) {
        $phaseResult.Status = 'PARTIAL'
        Write-OrchestrationLog "⚠ Phase $PhaseNumber partially completed ($successfulScripts successful, $failedScripts failed)" -Level 'WARN'
    } else {
        $phaseResult.Status = 'FAILED'
        Write-OrchestrationLog "✗ Phase $PhaseNumber failed ($failedScripts/$($phaseResult.Scripts.Count) scripts failed)" -Level 'ERROR'
    }
    
    $phaseResult.EndTime = Get-Date
    $phaseResult.Duration = ($phaseResult.EndTime - $phaseResult.StartTime).TotalMinutes
    
    return $phaseResult
}

function Test-OrchestrationValidation {
    Write-OrchestrationLog "Running orchestration system validation..." -Level 'INFO'
    
    $validationResults = @{
        MasterScript = $false
        PhaseScripts = @{}
        SwarmCoordination = $false
        Documentation = $false
    }
    
    # Test master orchestrator
    $masterScript = "scripts/master-orchestrator.ps1"
    if (Test-Path $masterScript) {
        Write-OrchestrationLog "✓ Master orchestrator found" -Level 'SUCCESS'
        $validationResults.MasterScript = $true
    } else {
        Write-OrchestrationLog "✗ Master orchestrator not found at $masterScript" -Level 'ERROR'
    }
    
    # Test phase scripts
    $phaseScripts = @{
        '2' = @('implement-hsts-preload.ps1', 'setup-csp-nonce-policies.ps1')
        '3' = @('optimize-bundle-size.ps1')
        '4' = @('fix-jest-configuration.ps1')
        '5' = @('deploy-monitoring-swarm.ps1')
        '6' = @('implement-blue-green-deployment.ps1')
    }
    
    foreach ($phase in $phaseScripts.Keys) {
        $validationResults.PhaseScripts[$phase] = @{}
        
        foreach ($script in $phaseScripts[$phase]) {
            $scriptPath = "scripts/$script"
            if (Test-Path $scriptPath) {
                Write-OrchestrationLog "✓ Phase $phase script found: $script" -Level 'SUCCESS'
                $validationResults.PhaseScripts[$phase][$script] = $true
            } else {
                Write-OrchestrationLog "✗ Phase $phase script missing: $script" -Level 'ERROR'
                $validationResults.PhaseScripts[$phase][$script] = $false
            }
        }
    }
    
    # Test swarm coordination
    $swarmScript = "scripts/swarm-coordinator.ps1"
    if (Test-Path $swarmScript) {
        Write-OrchestrationLog "✓ Swarm coordinator found" -Level 'SUCCESS'
        $validationResults.SwarmCoordination = $true
    } else {
        Write-OrchestrationLog "✗ Swarm coordinator not found at $swarmScript" -Level 'ERROR'
    }
    
    # Test documentation
    $docs = @(
        "docs/deployment/blue-green-deployment.md"
    )
    
    $allDocsFound = $true
    foreach ($doc in $docs) {
        if (Test-Path $doc) {
            Write-OrchestrationLog "✓ Documentation found: $doc" -Level 'SUCCESS'
        } else {
            Write-OrchestrationLog "✗ Documentation missing: $doc" -Level 'WARN'
            $allDocsFound = $false
        }
    }
    $validationResults.Documentation = $allDocsFound
    
    # Calculate overall validation score
    $totalChecks = 1 + $phaseScripts.Values.Count + 1 + 1  # master + phase scripts + swarm + docs
    $passedChecks = 0
    
    if ($validationResults.MasterScript) { $passedChecks++ }
    if ($validationResults.SwarmCoordination) { $passedChecks++ }
    if ($validationResults.Documentation) { $passedChecks++ }
    
    foreach ($phase in $validationResults.PhaseScripts.Keys) {
        $passedChecks += ($validationResults.PhaseScripts[$phase].Values | Where-Object { $_ -eq $true }).Count
    }
    
    $validationScore = [Math]::Round(($passedChecks / $totalChecks) * 100, 1)
    
    Write-OrchestrationLog "Validation completed: $validationScore% ($passedChecks/$totalChecks checks passed)" -Level $(if ($validationScore -ge 80) { 'SUCCESS' } else { 'WARN' })
    
    return @{
        Score = $validationScore
        Results = $validationResults
        Passed = $validationScore -ge 80
    }
}

function New-FinalReport {
    Write-OrchestrationLog "Generating comprehensive orchestration report..." -Level 'INFO'
    
    $endTime = Get-Date
    $totalDuration = ($endTime - $Global:OrchestrationState.StartTime).TotalMinutes
    
    $report = @{
        OrchestrationId = $Global:OrchestrationState.Id
        StartTime = $Global:OrchestrationState.StartTime
        EndTime = $endTime
        TotalDuration = [Math]::Round($totalDuration, 2)
        Phase = $Global:OrchestrationState.Phase
        Mode = $Global:OrchestrationState.Mode
        
        Summary = @{
            Status = $Global:OrchestrationState.Status
            PhasesExecuted = $Global:OrchestrationState.Results.Keys.Count
            TotalScripts = 0
            SuccessfulScripts = 0
            FailedScripts = 0
            SwarmActive = $Global:OrchestrationState.SwarmActive
        }
        
        PhaseResults = $Global:OrchestrationState.Results
        SystemInfo = @{
            PowerShellVersion = $PSVersionTable.PSVersion.ToString()
            OS = [System.Environment]::OSVersion.ToString()
            Machine = [System.Environment]::MachineName
            User = [System.Environment]::UserName
        }
        
        Configuration = @{
            EnableSwarm = $EnableSwarm
            ContinuousMonitoring = $ContinuousMonitoring
            MaxAgents = $MaxAgents
            DryRun = $DryRun
            Verbose = $Verbose
        }
        
        Logs = $Global:OrchestrationState.Logs
    }
    
    # Calculate script statistics
    foreach ($phaseKey in $Global:OrchestrationState.Results.Keys) {
        $phaseResult = $Global:OrchestrationState.Results[$phaseKey]
        if ($phaseResult.Scripts) {
            $report.Summary.TotalScripts += $phaseResult.Scripts.Count
            $report.Summary.SuccessfulScripts += ($phaseResult.Scripts | Where-Object { $_.Status -eq 'SUCCESS' }).Count
            $report.Summary.FailedScripts += ($phaseResult.Scripts | Where-Object { $_.Status -in @('FAILED', 'ERROR', 'TIMEOUT') }).Count
        }
    }
    
    # Determine overall status
    if ($report.Summary.FailedScripts -eq 0) {
        $report.Summary.Status = 'SUCCESS'
    } elseif ($report.Summary.SuccessfulScripts -gt $report.Summary.FailedScripts) {
        $report.Summary.Status = 'PARTIAL_SUCCESS'
    } else {
        $report.Summary.Status = 'FAILED'
    }
    
    # Save detailed report
    $reportDir = "orchestration-logs/$((Get-Date).ToString('yyyy-MM-dd-HHmm'))"
    if (-not (Test-Path $reportDir)) {
        New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
    }
    
    $reportPath = "$reportDir/orchestration-report-$($Global:OrchestrationState.Id).json"
    $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $reportPath -Encoding UTF8
    
    # Create summary report
    $summaryPath = "$reportDir/orchestration-summary-$($Global:OrchestrationState.Id).md"
    $summaryContent = @"
# Orchestration Report - $($Global:OrchestrationState.Id)

## Executive Summary
- **Status**: $($report.Summary.Status)
- **Duration**: $($report.TotalDuration) minutes
- **Phase**: $($report.Phase)
- **Mode**: $($report.Mode)

## Results
- **Phases Executed**: $($report.Summary.PhasesExecuted)
- **Total Scripts**: $($report.Summary.TotalScripts)
- **Successful**: $($report.Summary.SuccessfulScripts)
- **Failed**: $($report.Summary.FailedScripts)
- **Success Rate**: $([Math]::Round(($report.Summary.SuccessfulScripts / [Math]::Max(1, $report.Summary.TotalScripts)) * 100, 1))%

## Configuration
- **Swarm Enabled**: $($report.Configuration.EnableSwarm)
- **Swarm Active**: $($report.Summary.SwarmActive)
- **Max Agents**: $($report.Configuration.MaxAgents)
- **Continuous Monitoring**: $($report.Configuration.ContinuousMonitoring)
- **Dry Run**: $($report.Configuration.DryRun)

## Phase Details
$(foreach ($phaseKey in $report.PhaseResults.Keys) {
    $phaseResult = $report.PhaseResults[$phaseKey]
    if ($phaseResult.Phase) {
        "### Phase $($phaseResult.Phase)
- **Status**: $($phaseResult.Status)
- **Duration**: $([Math]::Round($phaseResult.Duration, 2)) minutes
- **Scripts**: $($phaseResult.Scripts.Count)
- **Errors**: $($phaseResult.Errors.Count)

"
    }
})

## System Information
- **Machine**: $($report.SystemInfo.Machine)
- **User**: $($report.SystemInfo.User)
- **PowerShell**: $($report.SystemInfo.PowerShellVersion)
- **OS**: $($report.SystemInfo.OS)

---
Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
Orchestration ID: $($Global:OrchestrationState.Id)
"@

    $summaryContent | Out-File -FilePath $summaryPath -Encoding UTF8
    
    Write-OrchestrationLog "Report saved to: $reportPath" -Level 'SUCCESS'
    Write-OrchestrationLog "Summary saved to: $summaryPath" -Level 'SUCCESS'
    
    return $report
}

# ============================================================================
# MAIN EXECUTION LOGIC
# ============================================================================

function Main {
    Write-OrchestrationLog "=== SERENITY OPTIMIZATION ORCHESTRATOR ===" -Level 'INFO'
    Write-OrchestrationLog "Orchestration ID: $($Global:OrchestrationState.Id)" -Level 'INFO'
    Write-OrchestrationLog "Phase: $Phase | Mode: $Mode | Dry Run: $DryRun" -Level 'INFO'
    
    try {
        $Global:OrchestrationState.Status = 'RUNNING'
        
        # Phase 1: Prerequisites
        Write-OrchestrationLog "Phase 1: Testing Prerequisites" -Level 'INFO'
        $prerequisites = Test-SystemPrerequisites
        
        # Handle validation mode
        if ($Phase -eq 'validate' -or $Mode -eq 'validate') {
            $validation = Test-OrchestrationValidation
            $Global:OrchestrationState.Results['Validation'] = $validation
            
            Write-OrchestrationLog "=== VALIDATION RESULTS ===" -Level 'INFO'
            Write-OrchestrationLog "Validation Score: $($validation.Score)%" -Level $(if ($validation.Passed) { 'SUCCESS' } else { 'WARN' })
            
            if (-not $validation.Passed) {
                Write-OrchestrationLog "Validation failed. Please check missing components." -Level 'ERROR'
                $Global:OrchestrationState.Status = 'VALIDATION_FAILED'
            } else {
                Write-OrchestrationLog "All validation checks passed!" -Level 'SUCCESS'
                $Global:OrchestrationState.Status = 'VALIDATION_PASSED'
            }
            
            return New-FinalReport
        }
        
        # Phase 2: Initialize Swarm
        if ($EnableSwarm) {
            Write-OrchestrationLog "Initializing Swarm Coordination" -Level 'INFO'
            $swarmConfig = Initialize-SwarmCoordination
            if ($swarmConfig) {
                $Global:OrchestrationState.Results['SwarmConfiguration'] = $swarmConfig
            }
        }
        
        # Phase 3-8: Execute Optimization Phases
        $phasesToExecute = if ($Phase -eq 'all') {
            @('2', '3', '4', '5', '6')
        } else {
            @($Phase)
        }
        
        Write-OrchestrationLog "Executing phases: $($phasesToExecute -join ', ')" -Level 'INFO'
        
        $allPhasesPassed = $true
        
        foreach ($phaseNumber in $phasesToExecute) {
            $phaseResult = Invoke-OrchestrationPhase -PhaseNumber $phaseNumber
            $Global:OrchestrationState.Results["Phase$phaseNumber"] = $phaseResult
            
            if ($phaseResult.Status -eq 'FAILED') {
                $allPhasesPassed = $false
                
                if ($Mode -eq 'interactive') {
                    $continue = Read-Host "Phase $phaseNumber failed. Continue to next phase? (y/N)"
                    if ($continue -notmatch '^[Yy]') {
                        Write-OrchestrationLog "User chose to stop orchestration" -Level 'WARN'
                        break
                    }
                } elseif ($Mode -eq 'autonomous') {
                    Write-OrchestrationLog "Continuing to next phase (autonomous mode)" -Level 'INFO'
                } else {
                    Write-OrchestrationLog "Stopping orchestration due to phase failure" -Level 'ERROR'
                    break
                }
            }
        }
        
        # Final Status
        if ($allPhasesPassed) {
            $Global:OrchestrationState.Status = 'SUCCESS'
            Write-OrchestrationLog "=== ORCHESTRATION COMPLETED SUCCESSFULLY ===" -Level 'SUCCESS'
        } else {
            $Global:OrchestrationState.Status = 'PARTIAL_SUCCESS'
            Write-OrchestrationLog "=== ORCHESTRATION PARTIALLY COMPLETED ===" -Level 'WARN'
        }
        
        # Generate final report
        $finalReport = New-FinalReport
        
        Write-OrchestrationLog "Total Duration: $($finalReport.TotalDuration) minutes" -Level 'INFO'
        Write-OrchestrationLog "Scripts Executed: $($finalReport.Summary.TotalScripts)" -Level 'INFO'
        Write-OrchestrationLog "Success Rate: $([Math]::Round(($finalReport.Summary.SuccessfulScripts / [Math]::Max(1, $finalReport.Summary.TotalScripts)) * 100, 1))%" -Level 'INFO'
        
        return $finalReport
        
    }
    catch {
        $Global:OrchestrationState.Status = 'ERROR'
        Write-OrchestrationLog "ORCHESTRATION ERROR: $($_.Exception.Message)" -Level 'ERROR'
        Write-OrchestrationLog $_.ScriptStackTrace -Level 'DEBUG'
        
        $finalReport = New-FinalReport
        return $finalReport
    }
}

# Execute main orchestration
if ($MyInvocation.InvocationName -ne '.') {
    $result = Main
    
    # Set exit code based on orchestration result
    $exitCode = switch ($result.Summary.Status) {
        'SUCCESS' { 0 }
        'VALIDATION_PASSED' { 0 }
        'PARTIAL_SUCCESS' { 1 }
        'VALIDATION_FAILED' { 2 }
        'ERROR' { 3 }
        default { 1 }
    }
    
    Write-OrchestrationLog "Exiting with code: $exitCode" -Level 'INFO'
    exit $exitCode
}