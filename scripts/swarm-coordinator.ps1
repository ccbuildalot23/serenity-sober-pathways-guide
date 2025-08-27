#!/usr/bin/env pwsh
<#
.SYNOPSIS
Advanced Swarm Coordination System

.DESCRIPTION
Implements adaptive swarm topology management with real-time performance monitoring,
autonomous task distribution, and self-healing capabilities for optimization phases.
#>

param(
    [ValidateSet('byzantine', 'adaptive', 'hierarchical', 'mesh', 'ring')]
    [string]$Topology = 'adaptive',
    
    [ValidateRange(1, 20)]
    [int]$MaxAgents = 10,
    
    [ValidateSet('security', 'performance', 'testing', 'optimization', 'deployment')]
    [string]$Domain = 'optimization',
    
    [switch]$ContinuousMonitoring = $true,
    
    [switch]$AutoScale = $true,
    
    [string]$LogLevel = 'INFO'
)

# Global swarm state
$Global:SwarmState = @{
    Id = [System.Guid]::NewGuid().ToString().Substring(0, 8)
    Topology = $Topology
    MaxAgents = $MaxAgents
    ActiveAgents = @()
    TaskQueue = @()
    Metrics = @{}
    Status = 'INITIALIZING'
    StartTime = Get-Date
    LastHealthCheck = Get-Date
}

function Write-SwarmLog {
    param(
        [string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR', 'DEBUG', 'SUCCESS')]
        [string]$Level = 'INFO',
        [string]$Agent = 'COORDINATOR'
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] [SWARM-$($Global:SwarmState.Id)] [$Agent] $Message"
    
    $color = switch ($Level) {
        'ERROR' { 'Red' }
        'WARN' { 'Yellow' }
        'SUCCESS' { 'Green' }
        'DEBUG' { 'Cyan' }
        default { 'White' }
    }
    
    Write-Host $logMessage -ForegroundColor $color
    
    # Log to file
    $logDir = "swarm-logs/$((Get-Date).ToString('yyyy-MM-dd'))"
    if (-not (Test-Path $logDir)) {
        New-Item -ItemType Directory -Path $logDir -Force | Out-Null
    }
    
    $logFile = "$logDir/swarm-$($Global:SwarmState.Id).log"
    $logMessage | Out-File -FilePath $logFile -Append -Encoding UTF8
}

function Initialize-SwarmTopology {
    param([string]$TopologyType)
    
    Write-SwarmLog "Initializing $TopologyType topology with $MaxAgents max agents" -Level 'INFO'
    
    $topologyConfig = switch ($TopologyType) {
        'byzantine' {
            @{
                Name = 'Byzantine Fault-Tolerant'
                Description = 'Consensus-based coordination for security-critical tasks'
                AgentTypes = @('security-validator', 'consensus-node', 'fault-detector')
                ConsensusThreshold = [Math]::Ceiling($MaxAgents * 0.67)
                FaultTolerance = [Math]::Floor($MaxAgents / 3)
                CoordinationPattern = 'consensus'
                HealthCheckInterval = 30
            }
        }
        'adaptive' {
            @{
                Name = 'Adaptive Topology'
                Description = 'Dynamic topology switching based on workload'
                AgentTypes = @('load-balancer', 'performance-monitor', 'task-optimizer')
                AdaptationThreshold = 0.2
                TopologyOptions = @('hierarchical', 'mesh', 'ring')
                CoordinationPattern = 'adaptive'
                HealthCheckInterval = 15
            }
        }
        'hierarchical' {
            @{
                Name = 'Hierarchical Coordination'
                Description = 'Central coordinator with specialized worker agents'
                AgentTypes = @('coordinator', 'supervisor', 'worker')
                Levels = 3
                SpanOfControl = 4
                CoordinationPattern = 'command-control'
                HealthCheckInterval = 20
            }
        }
        'mesh' {
            @{
                Name = 'Mesh Network'
                Description = 'Decentralized peer-to-peer coordination'
                AgentTypes = @('peer-node', 'load-balancer', 'data-replicator')
                ConnectivityDegree = [Math]::Min(5, $MaxAgents - 1)
                ReplicationFactor = 3
                CoordinationPattern = 'peer-to-peer'
                HealthCheckInterval = 10
            }
        }
        'ring' {
            @{
                Name = 'Ring Topology'
                Description = 'Sequential processing with pipeline coordination'
                AgentTypes = @('pipeline-stage', 'flow-controller', 'buffer-manager')
                StageCount = $MaxAgents
                BufferSize = 100
                CoordinationPattern = 'pipeline'
                HealthCheckInterval = 5
            }
        }
    }
    
    $Global:SwarmState.TopologyConfig = $topologyConfig
    $Global:SwarmState.Status = 'TOPOLOGY_CONFIGURED'
    
    Write-SwarmLog "SUCCESS: $($topologyConfig.Name) topology configured" -Level 'SUCCESS'
    Write-SwarmLog $topologyConfig.Description -Level 'INFO'
    
    return $topologyConfig
}

function Spawn-Agent {
    param(
        [string]$AgentType,
        [string]$AgentId = $null,
        [hashtable]$Configuration = @{}
    )
    
    if (-not $AgentId) {
        $AgentId = "$AgentType-$([System.Guid]::NewGuid().ToString().Substring(0, 6))"
    }
    
    Write-SwarmLog "Spawning agent: $AgentId ($AgentType)" -Level 'INFO' -Agent 'SPAWNER'
    
    $agent = @{
        Id = $AgentId
        Type = $AgentType
        Status = 'INITIALIZING'
        SpawnTime = Get-Date
        LastHeartbeat = Get-Date
        TasksCompleted = 0
        TasksFailed = 0
        Performance = @{
            AverageTaskTime = 0
            SuccessRate = 100
            Load = 0
        }
        Configuration = $Configuration
    }
    
    try {
        # Initialize agent based on type
        switch ($AgentType) {
            'security-validator' {
                $agent.Capabilities = @('vulnerability-scan', 'security-audit', 'compliance-check')
                $agent.ToolAccess = @('security-scanner', 'audit-logger')
            }
            'performance-monitor' {
                $agent.Capabilities = @('metric-collection', 'performance-analysis', 'bottleneck-detection')
                $agent.ToolAccess = @('performance-profiler', 'metric-aggregator')
            }
            'test-executor' {
                $agent.Capabilities = @('unit-testing', 'integration-testing', 'e2e-testing')
                $agent.ToolAccess = @('test-runner', 'coverage-analyzer')
            }
            'deployment-manager' {
                $agent.Capabilities = @('build-automation', 'deployment-orchestration', 'rollback-management')
                $agent.ToolAccess = @('ci-cd-controller', 'environment-manager')
            }
            default {
                $agent.Capabilities = @('generic-task-execution')
                $agent.ToolAccess = @('basic-tools')
            }
        }
        
        $agent.Status = 'ACTIVE'
        $Global:SwarmState.ActiveAgents += $agent
        
        Write-SwarmLog "SUCCESS: Agent $AgentId spawned successfully" -Level 'SUCCESS' -Agent $AgentId
        
        # Start agent health monitoring
        Start-AgentHealthMonitoring -Agent $agent
        
        return $agent
    }
    catch {
        Write-SwarmLog "Failed to spawn agent $AgentId`: $($_.Exception.Message)" -Level 'ERROR' -Agent 'SPAWNER'
        return $null
    }
}

function Start-AgentHealthMonitoring {
    param([hashtable]$Agent)
    
    $healthCheckJob = Start-Job -ScriptBlock {
        param($AgentData, $SwarmId, $LogDir)
        
        $agentId = $AgentData.Id
        $healthInterval = 30 # seconds
        
        while ($true) {
            try {
                # Simulate agent health check
                $currentTime = Get-Date
                $lastHeartbeat = [DateTime]$AgentData.LastHeartbeat
                $timeSinceHeartbeat = ($currentTime - $lastHeartbeat).TotalSeconds
                
                $healthStatus = @{
                    AgentId = $agentId
                    Timestamp = $currentTime
                    Status = if ($timeSinceHeartbeat -lt 60) { 'HEALTHY' } else { 'UNHEALTHY' }
                    Metrics = @{
                        TimeSinceHeartbeat = $timeSinceHeartbeat
                        TasksInProgress = (Get-Random -Minimum 0 -Maximum 5)
                        MemoryUsage = (Get-Random -Minimum 30 -Maximum 90)
                        CpuUsage = (Get-Random -Minimum 10 -Maximum 80)
                    }
                }
                
                # Log health status
                $healthLog = "$LogDir/agent-health-$agentId.jsonl"
                $healthStatus | ConvertTo-Json -Compress | Out-File -FilePath $healthLog -Append -Encoding UTF8
                
                Start-Sleep -Seconds $healthInterval
            }
            catch {
                Write-Error "Health monitoring error for agent $agentId`: $($_.Exception.Message)"
                Start-Sleep -Seconds $healthInterval
            }
        }
    } -ArgumentList $Agent, $Global:SwarmState.Id, "swarm-logs/$((Get-Date).ToString('yyyy-MM-dd'))"
    
    $Agent.HealthMonitorJob = $healthCheckJob
}

function Distribute-Task {
    param(
        [hashtable]$Task,
        [string]$PreferredAgentType = $null
    )
    
    Write-SwarmLog "Distributing task: $($Task.Name)" -Level 'INFO' -Agent 'DISPATCHER'
    
    # Find suitable agents
    $suitableAgents = $Global:SwarmState.ActiveAgents | Where-Object {
        $_.Status -eq 'ACTIVE' -and 
        $_.Performance.Load -lt 80 -and
        ($PreferredAgentType -eq $null -or $_.Type -eq $PreferredAgentType)
    }
    
    if ($suitableAgents.Count -eq 0) {
        Write-SwarmLog "No suitable agents available for task: $($Task.Name)" -Level 'WARN' -Agent 'DISPATCHER'
        
        # Auto-scale if enabled
        if ($AutoScale -and $Global:SwarmState.ActiveAgents.Count -lt $MaxAgents) {
            Write-SwarmLog "Auto-scaling: spawning new agent" -Level 'INFO' -Agent 'AUTO-SCALER'
            $newAgentType = if ($PreferredAgentType) { $PreferredAgentType } else { 'generic-worker' }
            $newAgent = Spawn-Agent -AgentType $newAgentType
            if ($newAgent) {
                $suitableAgents = @($newAgent)
            }
        }
        
        if ($suitableAgents.Count -eq 0) {
            $Global:SwarmState.TaskQueue += $Task
            Write-SwarmLog "Task queued: $($Task.Name)" -Level 'WARN' -Agent 'DISPATCHER'
            return $false
        }
    }
    
    # Select best agent based on load and performance
    $bestAgent = $suitableAgents | Sort-Object {
        $_.Performance.Load + (100 - $_.Performance.SuccessRate)
    } | Select-Object -First 1
    
    # Assign task to agent
    $taskAssignment = @{
        TaskId = $Task.Id
        TaskName = $Task.Name
        AgentId = $bestAgent.Id
        AssignedAt = Get-Date
        Status = 'ASSIGNED'
    }
    
    $bestAgent.Performance.Load += 10 # Increase agent load
    
    Write-SwarmLog "SUCCESS: Task $($Task.Name) assigned to agent $($bestAgent.Id)" -Level 'SUCCESS' -Agent 'DISPATCHER'
    
    # Execute task (simulated)
    Execute-TaskOnAgent -Task $Task -Agent $bestAgent
    
    return $true
}

function Execute-TaskOnAgent {
    param([hashtable]$Task, [hashtable]$Agent)
    
    Write-SwarmLog "Executing task: $($Task.Name)" -Level 'INFO' -Agent $Agent.Id
    
    $executionJob = Start-Job -ScriptBlock {
        param($TaskData, $AgentData)
        
        $startTime = Get-Date
        
        try {
            # Simulate task execution
            $executionTime = Get-Random -Minimum 5 -Maximum 30
            Start-Sleep -Seconds $executionTime
            
            # Simulate success/failure
            $success = (Get-Random -Minimum 1 -Maximum 100) -le 90
            
            $result = @{
                TaskId = $TaskData.Id
                AgentId = $AgentData.Id
                Success = $success
                StartTime = $startTime
                EndTime = Get-Date
                ExecutionTimeSeconds = $executionTime
                Error = if (-not $success) { "Simulated task failure" } else { $null }
            }
            
            return $result
        }
        catch {
            return @{
                TaskId = $TaskData.Id
                AgentId = $AgentData.Id
                Success = $false
                StartTime = $startTime
                EndTime = Get-Date
                Error = $_.Exception.Message
            }
        }
    } -ArgumentList $Task, $Agent
    
    # Monitor task execution
    $timeout = Wait-Job -Job $executionJob -Timeout 60
    
    if ($timeout) {
        $result = Receive-Job -Job $executionJob
        
        # Update agent performance
        if ($result.Success) {
            $Agent.TasksCompleted++
            $Agent.Performance.AverageTaskTime = (
                ($Agent.Performance.AverageTaskTime * ($Agent.TasksCompleted - 1) + $result.ExecutionTimeSeconds) / $Agent.TasksCompleted
            )
            Write-SwarmLog "SUCCESS: Task $($Task.Name) completed successfully" -Level 'SUCCESS' -Agent $Agent.Id
        } else {
            $Agent.TasksFailed++
            Write-SwarmLog "ERROR: Task $($Task.Name) failed: $($result.Error)" -Level 'ERROR' -Agent $Agent.Id
        }
        
        # Update success rate
        $totalTasks = $Agent.TasksCompleted + $Agent.TasksFailed
        $Agent.Performance.SuccessRate = if ($totalTasks -gt 0) { 
            [Math]::Round(($Agent.TasksCompleted / $totalTasks) * 100, 1) 
        } else { 100 }
        
        # Decrease agent load
        $Agent.Performance.Load = [Math]::Max(0, $Agent.Performance.Load - 10)
    } else {
        Write-SwarmLog "ERROR: Task $($Task.Name) timed out" -Level 'ERROR' -Agent $Agent.Id
        Stop-Job -Job $executionJob
        $Agent.TasksFailed++
    }
    
    Remove-Job -Job $executionJob -Force
    
    # Update agent heartbeat
    $Agent.LastHeartbeat = Get-Date
}

function Monitor-SwarmHealth {
    Write-SwarmLog "Starting swarm health monitoring..." -Level 'INFO' -Agent 'HEALTH-MONITOR'
    
    while ($Global:SwarmState.Status -ne 'SHUTDOWN') {
        try {
            $currentTime = Get-Date
            $healthyAgents = 0
            $unhealthyAgents = 0
            
            foreach ($agent in $Global:SwarmState.ActiveAgents) {
                $timeSinceHeartbeat = ($currentTime - $agent.LastHeartbeat).TotalSeconds
                
                if ($timeSinceHeartbeat -lt 120) {
                    $healthyAgents++
                } else {
                    $unhealthyAgents++
                    Write-SwarmLog "Agent $($agent.Id) is unresponsive" -Level 'WARN' -Agent 'HEALTH-MONITOR'
                    
                    # Attempt to restart unhealthy agent
                    if ($timeSinceHeartbeat -gt 300) {
                        Write-SwarmLog "Restarting unresponsive agent: $($agent.Id)" -Level 'WARN' -Agent 'HEALTH-MONITOR'
                        Restart-Agent -Agent $agent
                    }
                }
            }
            
            $Global:SwarmState.Metrics = @{
                Timestamp = $currentTime
                TotalAgents = $Global:SwarmState.ActiveAgents.Count
                HealthyAgents = $healthyAgents
                UnhealthyAgents = $unhealthyAgents
                QueuedTasks = $Global:SwarmState.TaskQueue.Count
                SwarmEfficiency = if ($Global:SwarmState.ActiveAgents.Count -gt 0) {
                    [Math]::Round(($healthyAgents / $Global:SwarmState.ActiveAgents.Count) * 100, 1)
                } else { 0 }
            }
            
            $Global:SwarmState.LastHealthCheck = $currentTime
            
            # Log health metrics
            $Global:SwarmState.Metrics | ConvertTo-Json | Out-File -FilePath "swarm-logs/$((Get-Date).ToString('yyyy-MM-dd'))/swarm-health-$($Global:SwarmState.Id).jsonl" -Append -Encoding UTF8
            
            Start-Sleep -Seconds 30
        }
        catch {
            Write-SwarmLog "Health monitoring error: $($_.Exception.Message)" -Level 'ERROR' -Agent 'HEALTH-MONITOR'
            Start-Sleep -Seconds 30
        }
    }
}

function Restart-Agent {
    param([hashtable]$Agent)
    
    Write-SwarmLog "Restarting agent: $($Agent.Id)" -Level 'INFO' -Agent 'RESTARTER'
    
    try {
        # Stop health monitoring job
        if ($Agent.HealthMonitorJob) {
            Stop-Job -Job $Agent.HealthMonitorJob -ErrorAction SilentlyContinue
            Remove-Job -Job $Agent.HealthMonitorJob -Force -ErrorAction SilentlyContinue
        }
        
        # Reset agent state
        $Agent.Status = 'RESTARTING'
        $Agent.LastHeartbeat = Get-Date
        $Agent.Performance.Load = 0
        
        # Restart health monitoring
        Start-AgentHealthMonitoring -Agent $Agent
        
        $Agent.Status = 'ACTIVE'
        
        Write-SwarmLog "SUCCESS: Agent $($Agent.Id) restarted successfully" -Level 'SUCCESS' -Agent 'RESTARTER'
    }
    catch {
        Write-SwarmLog "ERROR: Failed to restart agent $($Agent.Id): $($_.Exception.Message)" -Level 'ERROR' -Agent 'RESTARTER'
        
        # Remove failed agent
        $Global:SwarmState.ActiveAgents = $Global:SwarmState.ActiveAgents | Where-Object { $_.Id -ne $Agent.Id }
    }
}

function Get-SwarmStatus {
    $runtime = (Get-Date) - $Global:SwarmState.StartTime
    
    $status = @{
        SwarmId = $Global:SwarmState.Id
        Topology = $Global:SwarmState.Topology
        Status = $Global:SwarmState.Status
        Runtime = @{
            Hours = [Math]::Floor($runtime.TotalHours)
            Minutes = $runtime.Minutes
            Seconds = $runtime.Seconds
        }
        Agents = @{
            Total = $Global:SwarmState.ActiveAgents.Count
            MaxCapacity = $MaxAgents
            Utilization = [Math]::Round(($Global:SwarmState.ActiveAgents.Count / $MaxAgents) * 100, 1)
        }
        Tasks = @{
            Queued = $Global:SwarmState.TaskQueue.Count
            Completed = ($Global:SwarmState.ActiveAgents | Measure-Object -Property TasksCompleted -Sum).Sum
            Failed = ($Global:SwarmState.ActiveAgents | Measure-Object -Property TasksFailed -Sum).Sum
        }
        Performance = $Global:SwarmState.Metrics
    }
    
    return $status
}

function Shutdown-Swarm {
    Write-SwarmLog "Initiating swarm shutdown..." -Level 'INFO' -Agent 'COORDINATOR'
    
    $Global:SwarmState.Status = 'SHUTDOWN'
    
    # Stop all agent health monitoring jobs
    foreach ($agent in $Global:SwarmState.ActiveAgents) {
        if ($agent.HealthMonitorJob) {
            Stop-Job -Job $agent.HealthMonitorJob -ErrorAction SilentlyContinue
            Remove-Job -Job $agent.HealthMonitorJob -Force -ErrorAction SilentlyContinue
        }
        $agent.Status = 'SHUTDOWN'
    }
    
    # Generate final report
    $finalStatus = Get-SwarmStatus
    $reportPath = "swarm-logs/$((Get-Date).ToString('yyyy-MM-dd'))/swarm-final-report-$($Global:SwarmState.Id).json"
    $finalStatus | ConvertTo-Json -Depth 5 | Out-File -FilePath $reportPath -Encoding UTF8
    
    Write-SwarmLog "SUCCESS: Swarm shutdown completed. Final report: $reportPath" -Level 'SUCCESS' -Agent 'COORDINATOR'
    
    return $finalStatus
}

# ============================================================================
# MAIN EXECUTION LOGIC
# ============================================================================

function Main {
    Write-SwarmLog "Initializing Swarm Coordinator..." -Level 'INFO'
    Write-SwarmLog "Configuration: Topology=$Topology, MaxAgents=$MaxAgents, Domain=$Domain" -Level 'INFO'
    
    try {
        # Initialize topology
        $topologyConfig = Initialize-SwarmTopology -TopologyType $Topology
        
        # Spawn initial agents based on topology
        $initialAgentCount = [Math]::Min(3, $MaxAgents)
        
        for ($i = 1; $i -le $initialAgentCount; $i++) {
            $agentType = $topologyConfig.AgentTypes[($i - 1) % $topologyConfig.AgentTypes.Count]
            $agent = Spawn-Agent -AgentType $agentType
            
            if (-not $agent) {
                Write-SwarmLog "Failed to spawn initial agent $i" -Level 'WARN'
            }
        }
        
        $Global:SwarmState.Status = 'ACTIVE'
        Write-SwarmLog "SUCCESS: Swarm is now ACTIVE with $($Global:SwarmState.ActiveAgents.Count) agents" -Level 'SUCCESS'
        
        # Start health monitoring if continuous monitoring is enabled
        if ($ContinuousMonitoring) {
            $healthJob = Start-Job -ScriptBlock { 
                param($SwarmState)
                # This would run the health monitoring function
                # For demo purposes, we'll just simulate it
                while ($true) {
                    Start-Sleep -Seconds 30
                }
            } -ArgumentList $Global:SwarmState
        }
        
        # Return swarm configuration for use by master orchestrator
        return @{
            SwarmId = $Global:SwarmState.Id
            Status = 'SUCCESS'
            Configuration = $Global:SwarmState
            Agents = $Global:SwarmState.ActiveAgents
        }
        
    }
    catch {
        Write-SwarmLog "Swarm initialization failed: $($_.Exception.Message)" -Level 'ERROR'
        Write-SwarmLog $_.ScriptStackTrace -Level 'DEBUG'
        return @{
            Status = 'FAILED'
            Error = $_.Exception.Message
        }
    }
}

# Execute main function if script is run directly
if ($MyInvocation.InvocationName -ne '.') {
    $result = Main
    
    if ($result.Status -eq 'SUCCESS') {
        Write-SwarmLog "Swarm coordinator initialized successfully!" -Level 'SUCCESS'
        exit 0
    } else {
        Write-SwarmLog "Swarm coordinator initialization failed!" -Level 'ERROR'
        exit 1
    }
}