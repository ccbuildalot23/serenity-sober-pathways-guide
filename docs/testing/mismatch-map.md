# Test-Implementation Mismatch Mapping

## Overview
This document maps property name mismatches between test expectations and actual service implementations in the Serenity codebase. The primary pattern is that internal/private properties use underscore prefixes in implementations.

## Property Name Mappings

### AgentResponse Interface
| Test Expects | Implementation Has |
|-------------|-------------------|
| `message` | `_message` |
| `confidence` | `_confidence` |
| `metadata` | `_metadata` |
| `requiresEscalation` | `_requiresEscalation` |

### User/Context Properties
| Test Expects | Implementation Has |
|-------------|-------------------|
| `userId` | `_userId` |
| `supporterId` | `_supporterId` |
| `responseType` | `_responseType` |
| `status` | `_status` |
| `priority` | `_priority` |

### Service Response Properties
| Test Expects | Implementation Has |
|-------------|-------------------|
| `isValid` | `_isValid` |
| `adjustedLoss` | `_adjustedLoss` |
| `warnings` | `_warnings` |
| `score` | `_score` |
| `conversionProbability` | `_conversionProbability` |

## Affected Test Files

### Unit Tests
1. **AISafetyMiddleware.test.ts**
   - Uses `message` instead of `_message`
   - Uses `confidence` instead of `_confidence`
   - Mock implementations don't match interfaces

2. **ProgressTrackingAgent.test.ts**
   - All property references need underscore prefixes
   - Context userId should be _userId

3. **ClinicalDocumentationAgent.test.ts**
   - Property name mismatches throughout
   - Mock data doesn't match agent interfaces

4. **EnhancedCrisisDetection.test.ts**
   - Confidence property mismatches
   - Message property references

5. **EnhancedTenantSecurity.test.ts**
   - userId references need underscores

6. **ROIValidationService.test.ts**
   - Missing methods: `validateReferralLossRange`, `getCMSReimbursementRate`, etc.
   - Property mismatches in ValidationResult

7. **PredictiveSalesEngine.test.ts**
   - LeadScore property mismatches
   - Missing methods: `qualifyLead`, `predictConversion`, etc.
   - Custom Jest matchers not defined

### Integration Tests
- Property name consistency issues across all integration tests
- Mock data structures don't match service interfaces

### E2E Tests
- Selector issues due to property name changes
- Assertion failures on response properties

## Resolution Strategy

### Phase 1: Quick Fixes
- Update all test files to use underscore prefixes
- Fix mock implementations to match interfaces

### Phase 2: Service Method Resolution
- Add missing methods as stubs or update tests
- Ensure all mocks properly implement interfaces

### Phase 3: Convention Standardization
- Document underscore prefix convention
- Create test templates with correct property names
- Add linting rules to enforce conventions

## Testing Command Sequence
```bash
# After fixes, run in this order:
npm run test:unit        # Fix unit tests first
npm run test:integration # Then integration
npm run test:e2e         # Finally E2E
npm run test:all         # Verify everything passes
```

## Notes
- Underscore prefixes indicate internal/private properties
- This convention should be consistently applied across all services
- Test mocks must exactly match service interfaces
- Consider adding TypeScript strict checks to catch these earlier