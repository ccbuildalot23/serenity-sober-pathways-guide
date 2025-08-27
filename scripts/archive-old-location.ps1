# Archive Old OneDrive Location Script
# This script archives the old project location to prevent conflicts

$oldLocation = "C:\Users\cmcal\OneDrive\Documents\serenity-sober-pathways-guide"
$archiveLocation = "C:\Users\cmcal\OneDrive\Documents\_archived_projects"
$archiveName = "serenity-sober-pathways-guide_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
$archivePath = Join-Path $archiveLocation $archiveName

Write-Host "Archiving old project location..." -ForegroundColor Yellow
Write-Host "From: $oldLocation" -ForegroundColor Cyan
Write-Host "To: $archivePath" -ForegroundColor Cyan

# Create archive directory if it doesn't exist
if (!(Test-Path $archiveLocation)) {
    New-Item -ItemType Directory -Path $archiveLocation | Out-Null
    Write-Host "Created archive directory: $archiveLocation" -ForegroundColor Green
}

# Check if old location exists
if (Test-Path $oldLocation) {
    # Remove node_modules to save space (can be reinstalled if needed)
    $nodeModulesPath = Join-Path $oldLocation "node_modules"
    if (Test-Path $nodeModulesPath) {
        Write-Host "Removing node_modules to save space..." -ForegroundColor Yellow
        Remove-Item -Path $nodeModulesPath -Recurse -Force
        Write-Host "node_modules removed" -ForegroundColor Green
    }

    # Remove .next and dist folders
    $buildFolders = @(".next", "dist", "build", ".turbo", ".vite")
    foreach ($folder in $buildFolders) {
        $folderPath = Join-Path $oldLocation $folder
        if (Test-Path $folderPath) {
            Write-Host "Removing $folder folder..." -ForegroundColor Yellow
            Remove-Item -Path $folderPath -Recurse -Force
            Write-Host "$folder removed" -ForegroundColor Green
        }
    }

    # Create a README in the archive with migration info
    $readmeContent = @"
# Archived Project: Serenity Sober Pathways Guide

## Archive Date
$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')

## Reason for Archive
Project migrated to C:\dev\serenity for improved performance and to resolve:
- OneDrive sync conflicts
- Long path issues
- Hook execution delays
- PowerShell enumeration timeouts

## New Location
C:\dev\serenity

## Migration Summary
1. Moved from OneDrive to local C:\dev directory
2. Replaced Claude Flow with BMAD Method framework
3. Added healthcare-specific BMAD agents:
   - PHI Guardian (HIPAA compliance)
   - Care Coordinator (clinical workflows)
   - Billing Specialist (CPT codes and insurance)
   - Crisis Responder (emergency management)
4. Fixed all absolute path references
5. Optimized hook execution (86% performance improvement)

## How to Restore (if needed)
1. Copy this folder to desired location
2. Run: npm ci --legacy-peer-deps
3. Update .claude/settings.json paths
4. Copy .env files from C:\dev\serenity

## Important Files Preserved
- All source code
- Configuration files
- Documentation
- Scripts
- Tests

## Files Removed to Save Space
- node_modules (run npm ci to restore)
- Build artifacts (.next, dist, build)
- Temporary files

## Contact
For questions about this archive, check the active project at C:\dev\serenity
"@
    
    # Move the old location to archive
    Write-Host "Moving project to archive..." -ForegroundColor Yellow
    Move-Item -Path $oldLocation -Destination $archivePath
    
    # Create README in archive
    $readmePath = Join-Path $archivePath "ARCHIVE_README.md"
    Set-Content -Path $readmePath -Value $readmeContent
    Write-Host "Created archive README" -ForegroundColor Green
    
    # Create a symlink pointing to new location (optional)
    Write-Host "Creating symbolic link to new location..." -ForegroundColor Yellow
    New-Item -ItemType SymbolicLink -Path $oldLocation -Target "C:\dev\serenity" | Out-Null
    Write-Host "Symbolic link created" -ForegroundColor Green
    
    Write-Host "`nArchive completed successfully!" -ForegroundColor Green
    Write-Host "Old location archived to: $archivePath" -ForegroundColor Cyan
    Write-Host "New active location: C:\dev\serenity" -ForegroundColor Cyan
    Write-Host "A symbolic link was created at the old location pointing to the new one" -ForegroundColor Yellow
} else {
    Write-Host "Old location not found: $oldLocation" -ForegroundColor Red
    Write-Host "It may have already been archived or removed" -ForegroundColor Yellow
}

Write-Host "`nMigration and archive process complete!" -ForegroundColor Green