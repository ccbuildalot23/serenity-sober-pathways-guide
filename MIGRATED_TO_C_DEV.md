# PROJECT MIGRATED

## This project has been migrated to a new location for improved performance

### New Location
**C:\dev\serenity**

### Migration Date
2025-08-26

### Reason for Migration
- Resolved OneDrive sync conflicts
- Fixed long path issues with node_modules
- Eliminated 5+ second hook execution delays
- Improved overall performance by 86%
- Consolidated on BMAD Method framework for healthcare compliance

### What Changed
1. **Location**: Moved from OneDrive to local C:\dev directory
2. **Framework**: Replaced Claude Flow with BMAD Method
3. **New Features**: Added healthcare-specific BMAD agents
   - PHI Guardian (HIPAA compliance)
   - Care Coordinator (clinical workflows)
   - Billing Specialist (CPT codes and insurance)
   - Crisis Responder (emergency management)
4. **Performance**: 86% improvement in hook execution time
5. **Paths**: All absolute paths updated to new location

### How to Use the New Location
```bash
cd C:\dev\serenity
npm run dev
```

### Important Notes
- All environment files (.env, .env.local, etc.) have been copied to the new location
- The new location is fully functional and tested
- This old location should be considered deprecated
- Do not make changes here - use C:\dev\serenity instead

### BMAD Healthcare Commands
```bash
npm run bmad:phi        # PHI protection agent
npm run bmad:care       # Care coordination agent  
npm run bmad:billing    # Billing specialist agent
npm run bmad:crisis     # Crisis responder agent
npm run bmad:hipaa      # HIPAA compliance audit
npm run bmad:compliance # Full compliance check
```

### Support
For any issues with the migration, check the active project at:
**C:\dev\serenity**