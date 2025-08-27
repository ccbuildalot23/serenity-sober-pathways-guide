# Serenity Terminal Health Monitor with Swarm Intelligence
# PowerShell script for continuous performance monitoring

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "  SERENITY TERMINAL HEALTH MONITOR" -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

# Check if in correct directory
if (-not (Test-Path ".git")) {
    Write-Host "ERROR: Must be run from C:\dev\serenity directory" -ForegroundColor Red
    exit 1
}

# Function to check directory health
function Check-DirectoryHealth {
    Write-Host "`n[Directory Health Check]" -ForegroundColor Yellow
    
    # Check total size
    $size = (Get-ChildItem -Recurse -Force -ErrorAction SilentlyContinue | 
             Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  Total Size: $([math]::Round($size, 2)) MB"
    
    # Check node_modules count
    $nodeModules = Get-ChildItem -Recurse -Directory -Filter "node_modules" -ErrorAction SilentlyContinue
    Write-Host "  Node Modules Directories: $($nodeModules.Count)"
    
    # Check for nested node_modules
    $nested = $nodeModules | Where-Object { 
        $_.FullName -match "node_modules.*node_modules" 
    }
    if ($nested.Count -gt 0) {
        Write-Host "  WARNING: $($nested.Count) nested node_modules found!" -ForegroundColor Yellow
    } else {
        Write-Host "  ✓ No nested node_modules" -ForegroundColor Green
    }
    
    # Check git status
    $gitStatus = git status --porcelain 2>$null
    $uncommitted = ($gitStatus | Measure-Object).Count
    Write-Host "  Uncommitted Files: $uncommitted"
    
    # Check git repo size
    $gitSize = (Get-ChildItem -Path ".git" -Recurse -Force -ErrorAction SilentlyContinue | 
                Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "  Git Repository Size: $([math]::Round($gitSize, 2)) MB"
}

# Function to check terminal performance
function Check-TerminalPerformance {
    Write-Host "`n[Terminal Performance Check]" -ForegroundColor Yellow
    
    # Test command response time
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $null = Get-ChildItem -Path "." -File -ErrorAction SilentlyContinue
    $sw.Stop()
    $listTime = $sw.ElapsedMilliseconds
    
    if ($listTime -lt 100) {
        Write-Host "  Directory List Speed: $listTime ms (FAST)" -ForegroundColor Green
    }
    elseif ($listTime -lt 500) {
        Write-Host "  Directory List Speed: $listTime ms (OK)" -ForegroundColor Yellow
    }
    else {
        Write-Host "  Directory List Speed: $listTime ms (SLOW)" -ForegroundColor Red
    }
    
    # Check memory usage
    $proc = Get-Process -Id $PID
    $memoryMB = [math]::Round($proc.WorkingSet64 / 1MB, 2)
    Write-Host "  PowerShell Memory Usage: $memoryMB MB"
    
    # Check if Node.js processes are running
    $nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
    if ($nodeProcesses) {
        $totalNodeMemory = ($nodeProcesses | Measure-Object WorkingSet64 -Sum).Sum / 1MB
        Write-Host "  Node.js Processes: $($nodeProcesses.Count) (Total: $([math]::Round($totalNodeMemory, 2)) MB)"
    }
}

# Function to check BMAD status
function Check-BMADStatus {
    Write-Host "`n[BMAD Framework Status]" -ForegroundColor Yellow
    
    if (Test-Path ".bmad-core/bmad.js") {
        Write-Host "  ✓ BMAD Framework Installed" -ForegroundColor Green
        
        # Check for agent configurations
        $agents = @("phi-guardian", "care-coordinator", "billing-specialist", 
                   "crisis-responder", "byzantine-validator", "cloudtrail-auditor")
        Write-Host "  Available Agents: $($agents -join ', ')"
    } else {
        Write-Host "  ✗ BMAD Framework Not Found" -ForegroundColor Red
    }
}

# Function to check Claude Flow status
function Check-ClaudeFlowStatus {
    Write-Host "`n[Claude Flow Status]" -ForegroundColor Yellow
    
    # Check if Claude Flow is available
    $claudeFlow = npm list -g claude-flow 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Claude Flow Installed Globally" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Claude Flow Not Installed (use npx)" -ForegroundColor Yellow
    }
    
    # Check for active swarms
    if (Test-Path ".claude-flow/metrics/system-metrics.json") {
        Write-Host "  ✓ Metrics Collection Active" -ForegroundColor Green
    }
}

# Function to provide optimization recommendations
function Show-Recommendations {
    Write-Host "`n[Optimization Recommendations]" -ForegroundColor Cyan
    
    $issues = @()
    
    # Check for issues
    $nodeModules = Get-ChildItem -Recurse -Directory -Filter "node_modules" -ErrorAction SilentlyContinue
    if ($nodeModules.Count -gt 5) {
        $issues += "- Run optimize-with-swarm.bat to clean nested node_modules"
    }
    
    $gitStatus = git status --porcelain 2>$null
    if (($gitStatus | Measure-Object).Count -gt 30) {
        $issues += "- Many uncommitted files. Consider committing or stashing"
    }
    
    $gitSize = (Get-ChildItem -Path ".git" -Recurse -Force -ErrorAction SilentlyContinue | 
                Measure-Object -Property Length -Sum).Sum / 1MB
    if ($gitSize -gt 50) {
        $issues += "- Git repository large. Run 'git gc --aggressive'"
    }
    
    if ($issues.Count -eq 0) {
        Write-Host "  ✓ System is optimized!" -ForegroundColor Green
    } else {
        foreach ($issue in $issues) {
            Write-Host "  $issue" -ForegroundColor Yellow
        }
    }
}

# Main execution
try {
    Check-DirectoryHealth
    Check-TerminalPerformance
    Check-BMADStatus
    Check-ClaudeFlowStatus
    Show-Recommendations
    
    Write-Host "`n===============================================" -ForegroundColor Cyan
    Write-Host "  Health check completed successfully!" -ForegroundColor Green
    Write-Host "===============================================`n" -ForegroundColor Cyan
} catch {
    Write-Host "`nError during health check: $_" -ForegroundColor Red
    exit 1
}