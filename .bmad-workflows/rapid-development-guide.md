# BMAD Method Rapid Development Guide

## Healthcare Recovery Platform - 6-Day Sprint Methodology

### Overview
This guide implements the BMAD Method for rapid development of a HIPAA-compliant mental health and substance abuse recovery platform. The methodology emphasizes iterative development with daily deliverables.

## Sprint Structure

### Day 1: Foundation (Infrastructure)
**Goal**: Establish secure, scalable infrastructure
- Authentication & authorization
- Database architecture with RLS
- Security framework
- Core routing and navigation

### Day 2: Core Features (MVP)
**Goal**: Deliver immediate user value
- Crisis intervention system
- CBT skills library
- Clinical assessments
- Daily wellness tracking

### Day 3: Enhanced Features (Differentiation)
**Goal**: Add competitive advantages
- Peer support community
- Recovery calendar
- Progress analytics
- Push notifications

### Day 4: Security & Compliance (Protection)
**Goal**: Ensure HIPAA compliance
- Audit logging implementation
- Data encryption layers
- Input validation everywhere
- Penetration testing

### Day 5: Testing & Optimization (Quality)
**Goal**: Ensure reliability and performance
- Unit test coverage > 80%
- Integration testing
- Performance optimization
- Accessibility compliance

### Day 6: Deployment & Documentation (Launch)
**Goal**: Go live with confidence
- Production deployment
- User onboarding materials
- API documentation
- Monitoring setup

## Rapid Development Commands

### Component Scaffolding
```bash
# Generate enhanced component
npx bmad scaffold component --enhanced --name="FeatureName" --domain="healthcare"

# Generate service layer
npx bmad scaffold service --name="ServiceName" --with-tests

# Generate API endpoint
npx bmad scaffold api --name="endpoint" --method="GET|POST|PUT|DELETE"
```

### Code Analysis
```bash
# Analyze codebase for improvements
npm run bmad:analyze

# Check HIPAA compliance
npm run hipaa:compliance

# Security vulnerability scan
npm run security:audit
```

### Testing Shortcuts
```bash
# Run specific day's tests
npm run test:day-1
npm run test:day-2
# ... etc

# Full test suite
npm run test:all

# Coverage report
npm run test:coverage
```

## Development Patterns

### Enhanced Component Pattern
```typescript
// All major features use Enhanced pattern
import { EnhancedComponent } from '@/components/enhanced';

export const EnhancedFeature = () => {
  // Built-in security
  // Automatic audit logging
  // Input validation
  // Error boundaries
  // Performance monitoring
};
```

### Service Layer Pattern
```typescript
// Business logic in services
import { createService } from '@/services/base';

export const FeatureService = createService({
  name: 'feature',
  methods: {
    // CRUD operations
    // Business rules
    // Data validation
  },
  security: {
    requireAuth: true,
    roles: ['patient', 'provider'],
    auditLog: true
  }
});
```

### Real-time Pattern
```typescript
// Use EnhancedRealtimeService
import { useRealtime } from '@/services/realtime';

const { subscribe, publish } = useRealtime('channel-name');
```

## Quality Gates

### Pre-commit Checks
1. ESLint passes
2. TypeScript compiles
3. No console.logs
4. No hardcoded secrets

### Pre-deployment Checks
1. All tests pass
2. Security scan clean
3. HIPAA compliance verified
4. Performance benchmarks met

## Troubleshooting

### Common Issues

#### Issue: Slow build times
```bash
# Clear cache and rebuild
rm -rf node_modules/.cache
npm run build:clean
```

#### Issue: Type errors
```bash
# Regenerate Supabase types
npx supabase gen types typescript --local
```

#### Issue: Authentication failures
```bash
# Check Supabase connection
npm run test:storage
```

## Best Practices

1. **Always use Enhanced components** for healthcare features
2. **Implement audit logging** for all data modifications
3. **Validate all inputs** using EnhancedInputValidator
4. **Test offline scenarios** for critical features
5. **Document security decisions** in code comments
6. **Use feature flags** for gradual rollouts
7. **Monitor performance** with built-in analytics

## Resources

- [HIPAA Compliance Checklist](./docs/SECURITY.md)
- [Component Library](./src/components/README.md)
- [API Documentation](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## Support

For BMAD Method support:
- Check `.bmad-config.json` for configuration
- Run `npm run bmad:analyze` for diagnostics
- Review workflow files in `.bmad-workflows/`

## Version
BMAD Method v4.35.3 - Healthcare Specialized Configuration