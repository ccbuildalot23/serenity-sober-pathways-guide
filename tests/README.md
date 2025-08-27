# Serenity App Test Suite

## Overview

This directory contains comprehensive test suites for the Serenity sobriety support application, covering accessibility, E2E user journeys, integration testing, and unit tests.

## Test Structure

```
tests/
├── accessibility/          # Accessibility and WCAG compliance tests
├── e2e/                    # End-to-end user journey tests
├── integration/            # API and service integration tests
├── unit/                   # Unit tests for components and utilities
└── utils/                  # Test utilities and helpers
```

## E2E Test Suite

### Test Files

- `patient-journey.spec.ts` - Complete patient user journey testing
- `provider-journey.spec.ts` - Healthcare provider workflow testing  
- `supporter-journey.spec.ts` - Support person functionality testing

### Test Coverage

**Patient Journey:**
- ✅ Authentication and role-based access
- ✅ Daily check-in flows (positive/neutral/negative moods)
- ✅ Crisis support and emergency features
- ✅ Peer support chat and community engagement
- ✅ Milestone sharing and support group participation

**Provider Journey:**
- ✅ Patient list management and analytics
- ✅ Check-in history analysis and pattern recognition
- ✅ Care plan creation and management
- ✅ Crisis alert handling and professional response
- ✅ Provider dashboard and clinical tools

**Supporter Journey:**
- ✅ Crisis alert reception and emergency response
- ✅ Communication with supported persons
- ✅ Location sharing and emergency protocols
- ✅ Educational resources and crisis guides
- ✅ Real-time notification management

## Running Tests

### Prerequisites

1. **Test Environment Setup:**
   ```bash
   npm install
   npx playwright install
   ```

2. **Test User Accounts** (create in Supabase):
   - Patient: test-patient@serenity.com / TestSerenity2024!@#
   - Provider: test-provider@serenity.com / TestSerenity2024!@#
   - Supporter: test-supporter@serenity.com / TestSerenity2024!@#

3. **Development Server:**
   Ensure app is running on http://localhost:5173

### Test Commands

```bash
# Run all E2E tests
npm run test:e2e

# Run specific user journey
npm run test:patient
npm run test:provider
npm run test:supporter

# Run in headed mode (browser visible)
npm run test:e2e:headed

# Debug mode with step-through
npm run test:e2e:debug

# Run accessibility tests
npm run test:accessibility

# View test report
npx playwright show-report
```

### Browser Support

Tests run across multiple browsers:
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Chrome (Pixel 5), Safari (iPhone 12)

Mobile testing is especially important for crisis support features.

## Test Utilities

The `tests/utils/` directory contains:

- **test-helpers.ts**: Authentication, navigation, and form helpers
- **global-setup.ts**: Test environment initialization
- **global-teardown.ts**: Cleanup procedures

Key helper functions:
```javascript
// Authentication
await loginAsPatient(page);
await loginAsProvider(page);
await loginAsSupporter(page);

// Role-based access testing
await verifyRoleBasedAccess(page, 'patient');

// Crisis testing
await triggerCrisisAlert(page, 'Emergency message', true);

// Check-in completion
await completeCheckIn(page, TEST_DATA.CHECK_IN_DATA.positive);
```

## Key Features Tested

### Crisis Support System
- Emergency contact activation
- Location sharing protocols
- Real-time alert delivery
- Multi-modal communication (SMS, push, in-app)
- Offline functionality validation

### Role-Based Access Control
- User authentication flows
- Dashboard access verification
- Feature restriction enforcement  
- Unauthorized access prevention
- Session management

### Real-Time Features
- Peer support chat
- Crisis notifications
- Live status updates
- Presence indicators
- Message delivery

### Mobile Responsiveness
- Touch interface validation
- Crisis button accessibility
- Emergency feature availability
- Network connectivity handling

## Test Data Management

### Mock Data
Consistent test data is defined in `TEST_DATA` constants:
- User profiles for each role
- Check-in scenarios (mood states)
- Standard message templates
- Crisis response scenarios

### State Isolation
- Browser contexts are isolated between tests
- Local storage cleared between runs
- Database state managed via test environment
- Session management tested independently

## Debugging and Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify test users exist in Supabase
   - Check role assignments are correct
   - Validate email/password combinations

2. **Element Selection Issues**
   - Ensure `data-testid` attributes exist
   - Use appropriate wait strategies
   - Check for dynamic content loading

3. **Timing Issues**
   - Increase timeouts for slow operations
   - Wait for network idle states
   - Use explicit waits for real-time features

### Debug Helpers

```javascript
// Take debug screenshots
await takeDebugScreenshot(page, 'current-state');

// Wait for real-time updates
await waitForRealtimeUpdate(page, '[data-testid="alert"]');

// Handle expected errors
await handleExpectedError(page, 'Expected error message');
```

## Continuous Integration

### GitHub Actions Integration
- Automatic test execution on PRs
- Multi-browser validation
- Failure artifact collection
- Performance monitoring

### Test Reporting
- HTML reports with detailed results
- JSON/XML outputs for CI/CD
- Screenshot/video capture on failures
- Test execution metrics

## Maintenance

### Regular Tasks
- Update test user credentials quarterly
- Review and refresh test scenarios
- Maintain `data-testid` attributes
- Update browser versions and dependencies

### Quality Monitoring
- Track test execution times
- Identify and fix flaky tests
- Monitor failure patterns
- Update based on user feedback

## Contributing

When adding new features:

1. **Add data-testid attributes** to new UI elements
2. **Update relevant test files** to cover new functionality
3. **Add test helpers** for commonly used operations
4. **Update role-based access tests** if permissions change
5. **Test mobile responsiveness** for new features

## Documentation

- **Full E2E Documentation**: `docs/testing/E2E_TEST_DOCUMENTATION.md`
- **Accessibility Testing**: `tests/accessibility/README.md`
- **Playwright Configuration**: `playwright.config.ts`

This test suite ensures the Serenity app maintains high quality and reliability while supporting users in their most critical moments of need.