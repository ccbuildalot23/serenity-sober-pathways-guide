# Serenity App E2E Test Suite Documentation

## Overview

This comprehensive E2E test suite covers all three user journeys in the Serenity sobriety support application:
- **Patient Journey**: Daily check-ins, crisis support, peer support, and community features
- **Provider Journey**: Patient management, analytics, care plan management
- **Supporter Journey**: Crisis alerts, messaging, location sharing, and emergency response

## Test Files

### 1. Patient Journey Tests (`tests/e2e/patient-journey.spec.ts`)

**Coverage:**
- ✅ Login and dashboard access with role-based verification
- ✅ Daily check-in flow (positive, neutral, negative moods)
- ✅ Crisis support features and emergency resources
- ✅ Peer support chat functionality
- ✅ Community features (milestone sharing, support groups)
- ✅ Navigation and logout handling
- ✅ Role-based access control validation

**Key Test Scenarios:**
- **Positive Mood Check-in**: Tests successful completion with exercise and meditation activities
- **Neutral Mood Check-in**: Tests basic functionality with journaling activity
- **Negative Mood Check-in**: Tests crisis support resource presentation and safety protocols
- **Crisis Support Access**: Tests emergency contacts, breathing exercises, and alert systems
- **Peer Chat**: Tests messaging, community guidelines, and real-time communication
- **Community Engagement**: Tests milestone sharing and support group participation

### 2. Provider Journey Tests (`tests/e2e/provider-journey.spec.ts`)

**Coverage:**
- ✅ Provider login and dashboard access
- ✅ Patient list management and search functionality
- ✅ Detailed patient profile and check-in history analysis
- ✅ Analytics and pattern recognition
- ✅ Care plan creation and management
- ✅ Crisis alert handling and response protocols
- ✅ Provider profile and notification settings
- ✅ Role-based access control validation

**Key Test Scenarios:**
- **Patient Management**: Tests search, filtering, and sorting of patient lists
- **Clinical Analysis**: Tests check-in history review and provider note functionality
- **Care Planning**: Tests creation of personalized recovery plans with goals and interventions
- **Crisis Response**: Tests handling of patient crisis alerts and professional response protocols
- **Analytics Dashboard**: Tests trend analysis and risk assessment tools

### 3. Supporter Journey Tests (`tests/e2e/supporter-journey.spec.ts`)

**Coverage:**
- ✅ Supporter login and dashboard access
- ✅ Supported persons list management
- ✅ Crisis alert reception and response
- ✅ Communication and messaging systems
- ✅ Location sharing settings and emergency protocols
- ✅ Support resources and educational materials
- ✅ Supporter profile and preference management
- ✅ Real-time notifications and alerts
- ✅ Role-based access control validation

**Key Test Scenarios:**
- **Crisis Alert Response**: Tests receiving alerts, location sharing, and emergency communication
- **Message Exchange**: Tests secure messaging with supported persons
- **Emergency Protocols**: Tests location sharing, emergency contacts, and crisis escalation
- **Educational Resources**: Tests access to crisis response guides and professional contacts
- **Notification Management**: Tests real-time alert preferences and notification handling

## Test Credentials

The following test accounts should be created in Supabase before running the tests:

```
Patient Account:
Email: test-patient@serenity.com
Password: TestPass123!
Role: patient

Provider Account:
Email: test-provider@serenity.com
Password: TestPass123!
Role: provider

Supporter Account:
Email: test-supporter@serenity.com
Password: TestPass123!
Role: supporter
```

## Test Utilities

### Helper Functions (`tests/utils/test-helpers.ts`)

**Authentication Helpers:**
- `loginAsPatient(page)`, `loginAsProvider(page)`, `loginAsSupporter(page)`
- `loginAsRole(page, role)` - Generic role-based login
- `logout(page)` - Universal logout function

**Navigation Helpers:**
- `navigateToSection(page, section)` - Navigate between app sections
- `waitForLoadingToComplete(page)` - Wait for page loading states

**Test Data Helpers:**
- `completeCheckIn(page, checkInData)` - Complete daily check-in flow
- `sendMessage(page, recipient, subject, content)` - Send messages between users
- `triggerCrisisAlert(page, message, includeLocation)` - Trigger crisis alerts

**Access Control Helpers:**
- `verifyAccessDenied(page, url)` - Test unauthorized access
- `verifyRoleBasedAccess(page, role)` - Comprehensive role verification

**Form Helpers:**
- `fillProfileForm(page, userType, data)` - Fill user profile forms
- Various form validation utilities

## Running the Tests

### Prerequisites

1. **Environment Setup:**
   ```bash
   npm install
   npm install -D @playwright/test
   npx playwright install
   ```

2. **Test User Creation:**
   Create the test users in your Supabase database using the credentials above.

3. **Development Server:**
   Ensure your development server is running on `http://localhost:5173`

### Command Options

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test patient-journey.spec.ts

# Run tests in headed mode (browser visible)
npx playwright test --headed

# Run tests on specific browser
npx playwright test --project=chromium

# Run tests in debug mode
npx playwright test --debug

# Generate test report
npx playwright show-report
```

### Mobile Testing

The test suite includes mobile browser configurations:
- **Mobile Chrome**: Tests on Pixel 5 dimensions (393×851)
- **Mobile Safari**: Tests on iPhone 12 dimensions (390×844)

Crisis support features are especially important to test on mobile devices where users are most likely to access them during emergencies.

## Test Data Management

### Mock Data
The test suite uses consistent test data defined in `TEST_DATA` constants:
- Check-in scenarios (positive, neutral, negative moods)
- Standard messages for different situations
- User profile information templates

### State Management
- Tests use isolated browser contexts
- Local storage is cleared between test runs
- Database state should be managed via Supabase test environment

## Role-Based Access Control Testing

Each test suite includes comprehensive RBAC validation:

1. **Positive Access**: Verify users can access their designated areas
2. **Negative Access**: Verify users cannot access unauthorized areas
3. **Redirect Testing**: Verify proper redirects to access-denied pages
4. **Session Management**: Test logout and session expiration scenarios

## Crisis Support Testing

Special attention is paid to crisis support functionality:
- **Emergency Contact Testing**: Verify all emergency contact methods work
- **Location Sharing**: Test GPS location sharing in crisis scenarios
- **Real-time Alerts**: Verify immediate notification delivery
- **Multi-modal Communication**: Test SMS, push notifications, and in-app alerts
- **Offline Functionality**: Test crisis features when network is unavailable

## Performance Considerations

- **Test Timeout**: Individual tests timeout after 30 seconds
- **Action Timeout**: Individual actions timeout after 10 seconds
- **Expect Timeout**: Assertions timeout after 10 seconds
- **Parallel Execution**: Tests run in parallel for faster completion
- **Retry Logic**: Tests retry twice on CI environments

## Debugging and Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify test user accounts exist in Supabase
   - Check email/password combinations
   - Ensure proper role assignments

2. **Element Not Found**
   - Verify `data-testid` attributes exist in components
   - Check for dynamic content loading
   - Use appropriate wait strategies

3. **Network Issues**
   - Ensure development server is running
   - Check baseURL configuration
   - Verify API endpoints are accessible

### Debug Helpers

```javascript
// Take screenshot for debugging
await takeDebugScreenshot(page, 'debug-state');

// Wait for real-time updates
await waitForRealtimeUpdate(page, '[data-testid="notification"]');

// Handle expected errors gracefully
await handleExpectedError(page, 'Expected error message');
```

## Continuous Integration

### GitHub Actions Support
- Tests run automatically on pull requests
- Retry logic handles flaky test scenarios
- Multiple browser testing ensures compatibility
- Test artifacts (screenshots, videos) are saved on failures

### Test Reporting
- HTML reports provide detailed test results
- JSON/XML reports for CI/CD integration
- Screenshots and videos for failure analysis
- Performance metrics tracking

## Future Enhancements

### Planned Additions
1. **A/B Testing Support**: Test different UI variations
2. **Load Testing Integration**: Performance testing under load
3. **Visual Regression Testing**: Automated screenshot comparisons
4. **API Testing Integration**: Backend service validation
5. **Accessibility Testing**: WCAG compliance validation

### Test Coverage Expansion
1. **Multi-language Support**: Test internationalization features
2. **Offline Mode Testing**: Comprehensive PWA functionality testing
3. **Cross-platform Testing**: Desktop, tablet, and mobile variations
4. **Integration Testing**: Third-party service integration validation

## Maintenance

### Regular Updates Required
- Update test credentials quarterly
- Review and update test data scenarios
- Maintain `data-testid` attributes in components
- Update browser versions and Playwright dependencies

### Monitoring
- Track test execution times
- Monitor flaky test patterns
- Review failure rates across browsers
- Update test scenarios based on user feedback

---

This test suite provides comprehensive coverage of the Serenity app's critical user journeys while ensuring robust role-based access control and crisis support functionality. Regular maintenance and updates will ensure continued reliability as the application evolves.