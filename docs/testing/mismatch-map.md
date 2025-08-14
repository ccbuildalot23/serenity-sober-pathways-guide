# Test-Implementation Mismatch Mapping

## Overview
This document maps the mismatches between test expectations and actual service implementations discovered during test alignment.

## Selector Mismatches (E2E Tests)

### Authentication Forms
| Test Expects | Implementation Has | Location |
|--------------|-------------------|----------|
| `[data-testid="email-input"]` | `[data-testid="email"]` | Login/Register forms |
| `[data-testid="password-input"]` | `[data-testid="password"]` | Login/Register forms |
| `[data-testid="login-button"]` | `[data-testid="login-button submit-login"]` | Login form |

### Missing Elements
| Test Expects | Status | Notes |
|--------------|--------|-------|
| `[data-testid="help-video"]` | Missing | Required for multimedia accessibility tests |
| `[data-testid="video-captions"]` | Missing | Required for accessibility compliance |
| `[data-testid="crisis-banner"]` | Missing | Expected in crisis support tests |

## API Response Mismatches

### Crisis Detection Service
| Test Expects | Service Returns | File |
|--------------|----------------|------|
| `confidence > 0.6` | `confidence: 0.21` | `EnhancedCrisisDetection.test.ts` |
| `riskLevel: "critical"` | `riskLevel: "low"` | `EnhancedCrisisDetection.test.ts` |
| `isCrisis: true` | `isCrisis: false` | `EnhancedCrisisDetection.test.ts` |

### Financial Model Service
| Test Expects | Issue | File |
|--------------|-------|------|
| `toBeFinite()` matcher | Jest matcher not available | `FinancialModelService.test.ts` |
| Numeric validation | Tests use unavailable matchers | Multiple test files |

### ROI Validation Service
| Test Expects | Service Has | File |
|--------------|------------|------|
| `validateReferralLossRange()` | Method doesn't exist | `ROIValidationService.test.ts` |
| `calculateROI()` | Different method signature | `ROIValidationService.test.ts` |

## Component Import Issues

### PatientDashboard.tsx
| Missing Import | Usage | Fixed |
|---------------|-------|-------|
| `Loader2` | Loading spinners | ✅ Yes |

## Test Configuration Issues

### Jest Configuration
| Issue | Impact | Solution |
|-------|--------|----------|
| Missing `jest-extended` | `toBeFinite()` unavailable | Add to Jest setup |
| Missing matchers | Unit tests fail | Configure additional matchers |

### Playwright Configuration
| Issue | Impact | Solution |
|-------|--------|----------|
| Timeout too short | E2E tests timeout | Increase from 10s to 30s |
| Base URL mismatch | Tests can't find app | Verify localhost:8080 |

## Service Interface Mismatches

### Payment Gateway Service
| Test Interface | Actual Interface | Impact |
|---------------|-----------------|--------|
| `response.message` | `response._message` | Assertions fail |
| `userId` | `_userId` | Property undefined |
| `payment.status` | `payment._status` | Test failures |

### Billing Service
| Test Interface | Actual Interface | Impact |
|---------------|-----------------|--------|
| Public properties | Underscore-prefixed | Tests can't access |
| Method signatures | Different params | Call failures |

## Recommended Fixes

### Priority 1 - Critical (Blocks all tests)
1. ✅ Fix Loader2 import in PatientDashboard.tsx
2. Standardize test selectors across all forms
3. Add jest-extended to test configuration

### Priority 2 - High (Major test failures)
1. Align test selectors with implementation
2. Fix service method signatures
3. Update test expectations for crisis detection

### Priority 3 - Medium (Individual test failures)
1. Add missing UI elements or update tests
2. Fix property name conventions (remove underscores)
3. Update test data fixtures

## Naming Conventions

### Proposed Standards
- **Test selectors**: Use simple names without spaces (e.g., `email`, not `email-input`)
- **API responses**: No underscore prefixes for public properties
- **Service methods**: Consistent naming across tests and implementation
- **Component imports**: All used components must be imported

## Next Steps
1. Fix all Priority 1 issues
2. Run tests to verify fixes
3. Address Priority 2 issues systematically
4. Document any new conventions in api-conventions.md