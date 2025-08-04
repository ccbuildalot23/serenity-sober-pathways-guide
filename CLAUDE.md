# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a HIPAA-compliant mental health and substance abuse recovery platform built with React, TypeScript, and Supabase. The application provides comprehensive recovery support tools including crisis intervention, CBT skills, peer support, and daily wellness tracking.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Lint code (minimal ESLint config, no strict rules)
npm run lint

# Preview production build
npm run preview

# Run tests (currently no tests implemented)
npm test
```

## Architecture & Code Organization

### Component Architecture

The codebase uses a **feature-based organization** with enhanced component pattern:

- **Enhanced Components**: All major features use "Enhanced" versions (e.g., `EnhancedCrisisSystem`, `EnhancedCBTSkillsLibrary`)
- **Centralized Exports**: Core components re-exported from `src/components/index.ts`
- **Feature Domains**: Components organized by healthcare domain (crisis/, cbt/, peer-support/, etc.)

### State Management

- **Global State**: React Context for authentication (`AuthContext`)
- **Server State**: TanStack Query for API data with caching
- **Business Logic**: Custom hooks (e.g., `useDashboardData`, `useCrisisSystem`)

### Security Architecture

- **HIPAA Compliance**: Row-Level Security (RLS) policies on all database tables
- **Role-Based Access**: Three user types: patient, support_member, provider
- **Audit Logging**: Use `EnhancedSecurityAuditService` for all security events
- **Input Validation**: Use `EnhancedInputValidator` for all user inputs
- **Protected Routes**: All authenticated pages wrapped in `ProtectedRoute`

### Service Layer

- **Database**: Supabase client with generated TypeScript types
- **Real-time**: Use `EnhancedRealtimeService` for live updates
- **Business Logic**: Services in `src/services/` directory
- **Edge Functions**: Server-side logic in `supabase/functions/`

## Important Implementation Notes

### Component Consolidation

The following enhanced components replace legacy implementations:
- `EnhancedCBTSkillsLibrary` - CBT skills with analytics
- `EnhancedCrisisSystem` - Crisis intervention with offline support
- `EnhancedCalendar` - Recovery tracking calendar
- `EnhancedSecurityAuditService` - Consolidated audit logging
- `EnhancedInputValidator` - Input validation utilities
- `EnhancedRealtimeService` - Real-time subscriptions

### Security Requirements

- Never commit environment variables or secrets
- All user inputs must be validated using `EnhancedInputValidator`
- Use `EnhancedSecurityAuditService` for security events
- Implement proper error boundaries for healthcare data
- Follow HIPAA compliance guidelines in `docs/SECURITY.md`

### Database Migrations

- Migrations in `supabase/migrations/` directory
- 50+ migration files maintain schema version control
- Always test migrations locally before deployment

### Type Safety

- Full TypeScript coverage required
- Supabase types generated in `src/integrations/supabase/types.ts`
- Use proper type definitions from `src/types/` directory

## Common Development Tasks

### Adding a New Feature

1. Create feature directory under `src/components/[domain]/`
2. Implement enhanced component with proper security
3. Add service layer in `src/services/` if needed
4. Create custom hook for business logic
5. Update centralized exports in `src/components/index.ts`
6. Add proper TypeScript types
7. Implement audit logging for security events

### Working with Supabase

- Environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- RLS policies enforced on all tables
- Use edge functions for sensitive operations
- Real-time subscriptions via `EnhancedRealtimeService`

### Deployment

- Vercel deployment configured in `vercel.json`
- Security headers automatically applied
- Environment variables must be set in Vercel dashboard
- Build command: `npm run build`
- Output directory: `dist`

## Healthcare-Specific Patterns

### Crisis Intervention
- Multi-layered response system with offline capabilities
- Emergency contact management
- Crisis plan encryption

### CBT Tools
- Evidence-based therapy components
- Progress tracking and analytics
- Skill practice reminders

### Assessment Frameworks
- PHQ-9, GAD-7, AUDIT assessments
- Standardized scoring algorithms
- Historical tracking

### Peer Support
- Real-time chat with moderation
- Role-based permissions
- Message encryption

## Project Links

- Lovable Project: https://lovable.dev/projects/0774991d-cd10-45cb-be11-ae632aeb1333
- Repository uses Git with automated Lovable commits