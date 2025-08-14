# Serenity Sober Pathways - Testing Documentation

## Overview

This document outlines the comprehensive testing strategy for the Serenity Sober Pathways platform, including unit tests, integration tests, E2E tests, and specialized testing for HIPAA compliance and AI safety.

## Test Infrastructure

### Testing Frameworks

- **Unit & Integration Tests**: Jest v30 with TypeScript (ts-jest)
- **E2E Tests**: Playwright v1.54
- **Test Environment**: jsdom for browser API simulation
- **Mocking**: Custom mocks for Supabase and Stripe

### Configuration Files

- `jest.config.js` - Jest configuration with TypeScript support
- `tests/setup.ts` - Global test setup with browser API mocks
- `.env.test` - Test environment variables
- `playwright.config.ts` - E2E test configuration

## Test Structure

```
tests/
├── unit/                    # Unit tests
│   ├── services/           # Service layer tests
│   ├── middleware/         # Middleware tests
│   └── agents/            # AI agent tests
├── integration/            # Integration tests
│   ├── FinancialModelService.integration.test.ts
│   └── HealthcareChaosService.integration.test.ts
├── e2e/                    # End-to-end tests
│   ├── patient-journey.spec.ts
│   ├── provider-journey.spec.ts
│   ├── supporter-journey.spec.ts
│   └── crisis-support.spec.ts
├── accessibility/          # Accessibility tests
├── performance/           # Performance tests
└── __mocks__/            # Mock implementations
    ├── @supabase/
    ├── stripe.ts
    └── styleMock.js
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npx jest tests/unit/services/PaymentGatewayService.test.ts

# Run with coverage
npm run test:coverage

# Run in watch mode
npx jest --watch
```

### Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run specific integration test
npx jest tests/integration/FinancialModelService.integration.test.ts
```

### E2E Tests

```bash
# Run all E2E tests
npm test

# Run specific journey
npm run test:patient    # Patient journey
npm run test:provider   # Provider journey
npm run test:supporter  # Supporter journey
npm run test:crisis     # Crisis support

# Run with headed browser
npm run test:e2e:headed

# Run in debug mode
npm run test:e2e:debug

# Run mobile tests
npm run test:mobile
```

### Specialized Tests

```bash
# Accessibility tests
npm run test:accessibility

# Recovery feature tests
npm run test:recovery

# HIPAA compliance validation
npm run validate:hipaa

# Performance tests
npm run test:performance

# CloudTrail validation
npm run validate:cloudtrail
```

## Test Coverage Areas

### 1. Core Services (Unit Tests)

#### DeploymentValidationService
- Infrastructure health checks
- Security configuration validation
- Compliance verification
- Performance benchmarks
- Integration connectivity
- Data integrity checks

#### AISafetyMiddleware
- Bias detection (gender, racial, socioeconomic)
- Hallucination prevention
- Medical accuracy validation
- Toxicity filtering
- Ethical compliance
- Auto-remediation capabilities
- 85% safety threshold enforcement

#### PaymentGatewayService (Stripe)
- Customer creation and management
- Subscription lifecycle (create, update, cancel)
- Payment method handling
- Webhook processing
- Pricing tier validation ($299/$599/$1,999)
- Invoice generation
- Checkout session management

#### RolePermissionMiddleware
- Tri-user architecture (patient, provider, supporter)
- Age-based transitions (under 18 restrictions)
- Guardian access controls
- Resource-based permissions
- API endpoint protection
- Session management

### 2. Healthcare Features

#### EnhancedCrisisDetection
- Crisis signal detection
- Urgency level assessment
- Alert generation
- Escalation protocols
- Response time tracking

#### CarePlanService
- Care plan creation
- Goal management
- Progress tracking
- Provider collaboration
- FHIR compatibility

#### ClinicalDocumentationAgent
- Note generation
- Progress documentation
- Treatment summaries
- Compliance formatting

### 3. Business Logic

#### FinancialModelService
- LTV/CAC calculations
- COGS breakdown
- Pricing validation
- SaaS metrics
- Break-even analysis
- Investor reporting

#### ROIValidationService
- Cost savings calculations
- ER diversion metrics
- Treatment outcomes
- Resource utilization
- Business value reporting

#### PredictiveSalesEngine
- Lead scoring
- Conversion prediction
- Churn analysis
- Revenue forecasting

### 4. Infrastructure

#### HealthcareChaosService
- Resilience testing
- Failure injection
- Recovery validation
- Performance under stress
- Data consistency

#### EnhancedTenantSecurity
- Multi-tenant isolation
- Data encryption
- Access control
- Audit logging
- HIPAA compliance

## Test Data

### Test Credentials

```javascript
// Development/Test Environment Only
const TEST_USERS = {
  patient: {
    email: 'test-patient@serenity.com',
    password: 'TestPass123!'
  },
  provider: {
    email: 'test-provider@serenity.com',
    password: 'TestPass123!'
  },
  supporter: {
    email: 'test-supporter@serenity.com',
    password: 'TestPass123!'
  }
};
```

### Environment Variables

```bash
# .env.test
NODE_ENV=test
VITE_SUPABASE_URL=https://test.supabase.co
VITE_SUPABASE_ANON_KEY=test-anon-key-123456789012345678901234567890
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghijklmnopqrstuvwxyz
STRIPE_WEBHOOK_SECRET=whsec_test_1234567890abcdefghijklmnopqrstuvwxyz
```

## Mocking Strategy

### Supabase Mock

Located in `tests/__mocks__/@supabase/supabase-js.ts`:
- Auth operations (signUp, signIn, signOut)
- Database queries (select, insert, update, delete)
- Storage operations (upload, download, getPublicUrl)
- Realtime subscriptions

### Stripe Mock

Located in `tests/__mocks__/stripe.ts`:
- Customer management
- Subscription operations
- Payment methods
- Webhook handling
- Checkout sessions

### Browser APIs

Configured in `tests/setup.ts`:
- localStorage/sessionStorage with functional storage
- window.matchMedia for responsive testing
- fetch API for network requests

## CI/CD Integration

### GitHub Actions Workflow

The CI pipeline runs tests in the following order:

1. **Code Quality**
   - ESLint
   - TypeScript checking
   - Structure validation

2. **Unit Tests**
   - Service tests
   - Middleware tests
   - Agent tests

3. **Integration Tests**
   - API integration
   - Database operations
   - External services

4. **E2E Tests**
   - User journeys
   - Critical workflows
   - Mobile compatibility

5. **Security Scans**
   - Trivy vulnerability scanning
   - CodeQL analysis

## Known Issues & Limitations

### Current Test Status

- **Unit Tests**: 14 test suites configured
  - 1 passing (simple.test.ts)
  - 13 with TypeScript compilation issues (interface mismatches)
  
### TypeScript Issues

Common errors requiring fixes:
1. Property name mismatches (e.g., `userId` vs `_userId`)
2. Method signature differences
3. Missing type exports
4. Mock type incompatibilities

### Recommended Fixes

1. **Interface Alignment**: Update test files to match actual service interfaces
2. **Mock Enhancement**: Add missing mock methods as discovered
3. **Type Exports**: Ensure all types are properly exported from source files
4. **Test Isolation**: Improve test cleanup between runs

## Best Practices

### Writing Tests

1. **Descriptive Names**: Use clear, specific test descriptions
2. **AAA Pattern**: Arrange, Act, Assert structure
3. **Isolation**: Each test should be independent
4. **Mocking**: Mock external dependencies
5. **Coverage**: Aim for 70%+ code coverage

### Test Organization

1. **File Naming**: `*.test.ts` for unit, `*.spec.ts` for E2E
2. **Grouping**: Use describe blocks for logical grouping
3. **Setup/Teardown**: Use beforeEach/afterEach for cleanup
4. **Data Factories**: Create reusable test data generators

### Performance

1. **Parallel Execution**: Tests run in parallel by default
2. **Selective Testing**: Use .only for debugging
3. **Timeout Management**: Set appropriate timeouts
4. **Resource Cleanup**: Always clean up resources

## Troubleshooting

### Common Issues

1. **localStorage undefined**
   - Solution: Ensure jest.config.js uses 'jsdom' environment

2. **Module not found**
   - Solution: Check moduleNameMapper in jest.config.js

3. **TypeScript errors**
   - Solution: Verify tsconfig paths match jest configuration

4. **Async timeout**
   - Solution: Increase timeout or use proper async/await

### Debug Commands

```bash
# Run with verbose output
npx jest --verbose

# Run single test with debugging
npx jest tests/unit/services/PaymentGatewayService.test.ts --detectOpenHandles

# Check configuration
npx jest --showConfig

# Clear cache
npx jest --clearCache
```

## Maintenance

### Regular Tasks

1. **Weekly**: Review failing tests
2. **Monthly**: Update test dependencies
3. **Quarterly**: Coverage analysis
4. **Annually**: Test strategy review

### Adding New Tests

1. Create test file in appropriate directory
2. Import necessary dependencies
3. Mock external services
4. Write comprehensive test cases
5. Verify locally before committing
6. Update this documentation

## Contact

For testing issues or questions:
- Create issue at: https://github.com/anthropics/claude-code/issues
- Review CI logs in GitHub Actions
- Check test reports in artifacts

## Compliance Notes

All tests must maintain HIPAA compliance:
- No real PHI in test data
- Secure test credentials
- Encrypted test databases
- Audit log verification
- Access control validation

---

*Last Updated: August 2025*
*Version: 1.0.0*