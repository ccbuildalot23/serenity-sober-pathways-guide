# Serenity Sober Pathways - Deployment Guide

## 🚨 CRITICAL: Preventing Deployment Failures

This guide explains how to deploy the Serenity Sober Pathways Guide application successfully and avoid common deployment issues.

## Project Structure Overview

This repository contains TWO separate projects:
1. **Main React Application** - The HIPAA-compliant recovery platform
2. **MCP Server** - Model Context Protocol server for crisis communication (in `serenity-crisis-mcp/`)

⚠️ **IMPORTANT**: These projects must remain separate to avoid deployment failures!

## Common Deployment Issues & Solutions

### Issue #1: TypeScript Configuration Conflicts
**Problem**: The root `tsconfig.json` gets overwritten with MCP server configuration, causing React build failures.

**Solution**: 
- The correct `tsconfig.json` should only contain references to `tsconfig.app.json` and `tsconfig.node.json`
- Run `npm run validate:structure` to check configuration
- Run `npm run fix:deployment` to automatically fix issues

### Issue #2: MCP Files in Wrong Location
**Problem**: MCP server files (`index.ts`, `crisis-handler.ts`, etc.) end up in the main `src/` directory.

**Solution**:
- MCP files must be in `serenity-crisis-mcp/src/`
- Our validation script automatically detects and fixes this

### Issue #3: Package.json Conflicts
**Problem**: The main `package.json` gets replaced with MCP server configuration.

**Solution**:
- The main `package.json` must have `"name": "serenity-sober-pathways-guide"`
- MCP server has its own `package.json` in `serenity-crisis-mcp/`

## Deployment Checklist

### Before Every Deployment

1. **Run Validation**:
   ```bash
   npm run validate:structure
   ```
   This checks all critical configurations.

2. **If Validation Fails**:
   ```bash
   npm run fix:deployment
   ```
   This automatically fixes common issues.

3. **Test Build Locally**:
   ```bash
   npm run build
   ```
   Ensure the build completes without errors.

4. **Commit Changes**:
   ```bash
   git add -A
   git commit -m "fix: Ensure deployment structure is correct"
   git push
   ```

### Vercel Deployment Configuration

The application is configured for Vercel deployment with:
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install --legacy-peer-deps`
- Framework: Vite

### Environment Variables

Required environment variables for deployment:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

Set these in your Vercel dashboard under Project Settings > Environment Variables.

## Automated Safeguards

### Pre-commit Hooks
Every commit automatically runs validation to prevent deployment issues:
- Validates TypeScript configuration
- Checks file locations
- Ensures package.json is correct

To skip validation (NOT RECOMMENDED):
```bash
git commit --no-verify
```

### CI/CD Pipeline
GitHub Actions runs additional checks:
- Type checking
- Linting
- Security scanning
- Build verification

## Emergency Recovery

If deployment is failing and automated fixes don't work:

1. **Reset TypeScript Config**:
   ```bash
   echo '{"files":[],"references":[{"path":"./tsconfig.app.json"},{"path":"./tsconfig.node.json"}]}' > tsconfig.json
   ```

2. **Install Missing Dependencies**:
   ```bash
   npm install next-themes @hello-pangea/dnd dompurify terser --legacy-peer-deps
   ```

3. **Move MCP Files** (if in wrong location):
   ```bash
   # Windows
   move src\index.ts serenity-crisis-mcp\src\
   move src\crisis-handler.ts serenity-crisis-mcp\src\
   move src\types.ts serenity-crisis-mcp\src\

   # Mac/Linux
   mv src/index.ts serenity-crisis-mcp/src/
   mv src/crisis-handler.ts serenity-crisis-mcp/src/
   mv src/types.ts serenity-crisis-mcp/src/
   ```

4. **Force Rebuild**:
   ```bash
   rm -rf node_modules dist
   npm install --legacy-peer-deps
   npm run build
   ```

## Development Workflow

### Working on React App
```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev

# Build for production
npm run build
```

### Working on MCP Server
```bash
# Navigate to MCP directory
cd serenity-crisis-mcp

# Install MCP dependencies
npm install

# Build MCP server
npm run build

# Test MCP server
npm run test
```

## Monitoring Deployments

1. **Vercel Dashboard**: Monitor build logs at vercel.com
2. **GitHub Actions**: Check CI/CD status in GitHub
3. **Local Validation**: Always run `npm run validate:structure` before pushing

## Support

If you continue experiencing deployment issues:
1. Run `npm run fix:deployment` first
2. Check this guide for solutions
3. Review the validation output for specific errors
4. Contact support with the full error log

## Key Points to Remember

- ✅ Always validate before deploying
- ✅ Keep MCP server files in `serenity-crisis-mcp/`
- ✅ Never modify the root `tsconfig.json` for MCP
- ✅ Use the automated fix script when issues arise
- ✅ Test builds locally before pushing

This deployment system has been battle-tested to ensure your life-changing application remains available when users need it most.