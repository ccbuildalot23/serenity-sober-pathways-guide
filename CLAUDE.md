# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Serenity Sober Pathways is a HIPAA-compliant mental health and substance abuse recovery platform built with React, TypeScript, Vite, and Supabase. The application provides crisis support, daily check-ins, peer support, and provider dashboards for comprehensive recovery management.

## Commands

### Development
```bash
npm run dev                    # Start development server on port 8080
npm run build                  # Build for production
npm run preview               # Preview production build
```

### Testing
```bash
npm run test                  # Run all Playwright tests
npm run test:e2e              # Run E2E tests
npm run test:patient          # Test patient journey
npm run test:provider         # Test provider journey
npm run test:supporter        # Test supporter journey
npm run test:crisis           # Test crisis support
npm run test:mobile           # Test mobile viewports
```

### Code Quality
```bash
npm run lint                  # Run ESLint with up to 1000 warnings allowed
npm run lint:fix              # Auto-fix linting issues
npm run typecheck             # TypeScript type checking
npm run validate:structure    # Validate project structure
```

### Deployment
```bash
npm run vercel-build          # Build for Vercel deployment
npm run deployment:check      # Check deployment readiness
npm run verify-production     # Verify production deployment
npm run lighthouse:validate   # Run Lighthouse performance checks
```

## Architecture

### Core Technologies
- **Frontend**: React 19 with TypeScript, Vite 5, TailwindCSS 3
- **UI Components**: Radix UI, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Mobile**: Capacitor for iOS/Android builds
- **Testing**: Playwright for E2E, multiple browser/device testing
- **CI/CD**: GitHub Actions, Vercel deployment

### Directory Structure
```
src/
├── components/       # Reusable UI components (organized by feature)
│   ├── crisis/      # Crisis management components
│   ├── auth/        # Authentication components
│   ├── dashboard/   # Dashboard components
│   └── ui/          # Base UI components (shadcn)
├── pages/           # Route components
├── services/        # Business logic and API services
├── hooks/           # Custom React hooks
├── contexts/        # React contexts (Auth, Sensory)
├── integrations/    # External service integrations
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
```

### Key Architectural Patterns

#### Authentication Flow
- Supabase Auth with PKCE flow for enhanced security
- Role-based access control (patient, provider, supporter, admin)
- Session management with 15-minute timeout for PHI access
- Password reset flow with email verification

#### Database Schema
- PostgreSQL with Row Level Security (RLS)
- Core tables: profiles, user_roles, daily_checkins, emergency_contacts
- Support network system with tiered contacts
- Crisis notification system with escalation levels

#### Component Organization
- Feature-based organization within components/
- Separation of concerns: UI, business logic, data access
- Custom hooks for shared logic
- Context providers for global state

#### Security & Compliance
- HIPAA compliance with audit logging
- Content Security Policy (CSP) headers
- Secure storage with encryption at rest
- Session security with automatic timeout

## Environment Configuration

### Required Environment Variables
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Deployment Environments
- **Development**: http://localhost:8080
- **Production**: Vercel deployment with security headers
- **Mobile**: Capacitor for iOS/Android apps

## Testing Strategy

### E2E Test Coverage
- Patient journey: check-ins, crisis support, peer support
- Provider journey: patient management, analytics
- Supporter journey: crisis alerts, messaging
- HIPAA compliance: security, audit trails
- Mobile responsiveness: iOS/Android viewports

### Test Credentials (Development)
- Patient: test-patient@serenity.com / TestPass123!
- Provider: test-provider@serenity.com / TestPass123!
- Supporter: test-supporter@serenity.com / TestPass123!

## Critical Features

### Crisis Support System
- One-tap emergency alerts
- Multi-tier supporter notification
- Offline mode with local caching
- Voice-activated crisis assistance
- Real-time escalation protocols

### Daily Check-In System
- Mood, anxiety, sleep tracking
- Pattern analysis and insights
- FHIR-compatible data export
- Celebration animations for milestones

### Provider Dashboard
- Patient management interface
- Analytics and trend visualization
- Care plan creation and tracking
- Crisis alert monitoring
- Secure messaging system

## Development Guidelines

### Code Style
- TypeScript strict mode disabled (gradual migration)
- React functional components with hooks
- TailwindCSS for styling
- Component files < 500 lines
- No hardcoded secrets or API keys

### Git Workflow
- Main branch for production
- Feature branches for development
- Conventional commits enforced
- Husky pre-commit hooks
- CI/CD on push to main/develop

### Performance Considerations
- Lazy loading for routes
- Image optimization
- Code splitting by route
- Service worker for offline support (dev only)
- Chunk size limit: 500KB

## Common Tasks

### Adding a New Feature
1. Create feature branch from main
2. Add components in appropriate feature folder
3. Create/update services in src/services/
4. Add types in src/types/
5. Write E2E tests in tests/e2e/
6. Update routing if needed

### Debugging Authentication
- Check Supabase dashboard for user status
- Verify environment variables are set
- Check browser console for auth errors
- Review network tab for API calls
- Test with AuthDebugPanel component

### Mobile Development
1. Build web assets: `npm run build`
2. Sync with Capacitor: `npx cap sync`
3. Open in IDE: `npx cap open ios/android`
4. Test on device/simulator

## Troubleshooting

### White Screen Issues
- Run `npm run fix:tokens` before build
- Clear browser cache
- Check for chunk loading errors
- Verify Supabase connection

### Authentication Failures
- Verify Supabase URL and anon key
- Check redirect URLs in Supabase dashboard
- Ensure RLS policies are configured
- Review auth session in localStorage

### Build Failures
- Run `npm ci --legacy-peer-deps`
- Clear node_modules and reinstall
- Check Node version (requires 22.x)
- Verify all environment variables

## Security Notes

- All PHI data encrypted at rest
- API keys only in environment variables
- CSP headers configured for production
- Regular security audits via GitHub Actions
- Business Associate Agreements required for production

## Automatic Agent & Swarm Configuration

### Agent Selection Strategy (ALWAYS APPLY IN PLAN MODE)

#### Framework Assessment Protocol
When entering plan mode, AUTOMATICALLY:
1. Initialize appropriate swarm topology based on task complexity
2. Spawn specialized agents for identified subtasks
3. Use MCP servers for extended capabilities
4. Select optimal framework for the problem domain

### Task-Based Agent Selection

#### Research & Analysis Tasks
- **Primary**: deep-researcher, researcher agents
- **MCP**: mcp__exa (web_search, deep_researcher_start/check)
- **Swarm**: swarm-coordinator with mesh topology for distributed research
- **Framework**: SPARC for systematic analysis

#### Code Development Tasks
- **Primary**: coder, sparc-coder, tdd-london-swarm agents
- **MCP**: mcp__ruv-swarm for orchestration
- **Swarm**: swarm-coordinator with hierarchical topology for structured development
- **Framework**: TDD for test-driven development

#### Architecture & Design Tasks
- **Primary**: system-architect, architecture, sparc-coord agents
- **MCP**: mcp__ruv-swarm with adaptive topology
- **Swarm**: swarm-coordinator with adaptive topology for dynamic planning
- **Framework**: SPARC methodology

#### Security & Compliance Tasks
- **Primary**: security-manager, byzantine-coordinator agents
- **MCP**: mcp__ruv-swarm with consensus protocols
- **Swarm**: swarm-coordinator with byzantine topology for distributed validation
- **Framework**: Byzantine fault-tolerant consensus

#### Testing & Validation Tasks
- **Primary**: tester, reviewer, code-analyzer agents
- **MCP**: mcp__ruv-swarm for parallel testing
- **Swarm**: swarm-coordinator with mesh topology for comprehensive coverage
- **Framework**: Multi-browser/device testing matrix

#### Performance Optimization Tasks
- **Primary**: perf-analyzer, performance-benchmarker agents
- **MCP**: mcp__ruv-swarm with benchmarking
- **Swarm**: swarm-coordinator with adaptive topology for optimization
- **Framework**: Benchmark-driven optimization

### Automatic Swarm Initialization

#### Default Swarm Parameters
```javascript
{
  "topology": "adaptive", // Changes based on task
  "maxAgents": 10,
  "strategy": "balanced",
  "enableCoordination": true,
  "enableLearning": true,
  "persistenceMode": "memory"
}
```

#### Task Complexity Assessment
- **Simple** (1-3 steps): Single agent, no swarm
- **Medium** (4-10 steps): 2-5 agents, mesh topology
- **Complex** (10+ steps): 5-10 agents, hierarchical topology
- **Research**: Adaptive topology with deep researcher

### MCP Server Usage Rules

#### Always Use MCP For:
1. Web searches and documentation lookups
2. Cross-repository operations
3. Performance benchmarking
4. Neural network coordination
5. Distributed memory management

#### MCP Priority Order:
1. `mcp__exa` for research and web operations
2. `mcp__ruv-swarm` for swarm orchestration
3. `mcp__Ref` for documentation searches
4. `mcp__ide` for IDE integration tasks

### TodoWrite Integration

ALWAYS use TodoWrite when:
- Task has 3+ steps
- Planning complex implementations
- Coordinating multiple agents
- Tracking swarm progress
- Breaking down user requirements

### Performance Optimization

#### Parallel Execution Rules:
- Spawn agents concurrently for independent tasks
- Use batch tool calls for efficiency
- Implement memory sharing between agents
- Monitor with mcp__ruv-swarm__memory_usage

#### Resource Management:
- Limit active agents based on complexity
- Use performance benchmarking for optimization
- Implement automatic cleanup after completion
- Share knowledge between sessions

### Framework Selection Matrix

| Task Type | Primary Framework | Secondary | Swarm Type |
|-----------|------------------|-----------|------------|
| New Feature | SPARC + TDD | Agile | Hierarchical |
| Bug Fix | Root Cause Analysis | TDD | Mesh |
| Research | Deep Research | SPARC | Adaptive |
| Security | Byzantine Consensus | Audit | Consensus |
| Performance | Benchmark-Driven | Profiling | Adaptive |
| Architecture | SPARC | DDD | Hierarchical |
| Testing | TDD | BDD | Mesh |
| Documentation | Research | Structure | Ring |

### Automatic Behavior Triggers

When user enters plan mode:
1. Assess task complexity immediately
2. Initialize swarm with appropriate topology
3. Spawn specialized agents proactively
4. Use TodoWrite for task decomposition
5. Select framework based on task type
6. Begin parallel research/analysis
7. Coordinate through MCP servers

### Knowledge Persistence

Configure DAA for:
- Cross-session memory retention
- Agent learning from outcomes
- Pattern recognition improvement
- Collective intelligence growth