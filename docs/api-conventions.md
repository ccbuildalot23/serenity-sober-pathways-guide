# API Conventions & Standards

## Property Naming Conventions

### Underscore Prefix Convention
Internal and private properties in service interfaces use underscore prefixes to denote their visibility and access level.

#### When to Use Underscore Prefixes

**Use underscore prefixes for:**
- Internal state properties that shouldn't be directly accessed
- Metadata that's managed by the system
- Properties that require validation or transformation before use
- Security-sensitive fields

**Examples:**
```typescript
interface AgentResponse {
  _message: string;        // Internal message property
  _confidence: number;     // System-managed confidence score
  _metadata?: Record<string, any>;  // Internal metadata
  _requiresEscalation?: boolean;    // System flag
}

interface CrisisContext {
  _userId: string;         // Protected user identifier
  _supporterId?: string;   // Protected supporter ID
  _responseType: string;   // Internal response classification
  _status: string;         // System-managed status
}
```

### Public vs Private Properties

**Public Properties (no underscore):**
- Properties intended for external consumption
- Data that clients can directly read/write
- Configuration values
- Display-friendly fields

**Private Properties (with underscore):**
- Internal state management
- System-generated values
- Properties requiring special handling
- Security or compliance-related fields

## Service Interface Patterns

### Response Objects
All service response objects should follow this pattern:
```typescript
interface ServiceResponse {
  // Public data
  data?: any;
  success: boolean;
  
  // Internal/system properties
  _processingTimeMs?: number;
  _confidence?: number;
  _metadata?: Record<string, any>;
}
```

### Error Handling
```typescript
interface ServiceError {
  code: string;           // Public error code
  message: string;        // User-facing message
  _details?: any;         // Internal error details
  _stack?: string;        // Stack trace (internal only)
}
```

## Testing Conventions

### Mock Data Structure
Test mocks must exactly match service interfaces, including underscore prefixes:

```typescript
// ✅ Correct
const mockResponse: AgentResponse = {
  _message: 'Test message',
  _confidence: 0.95,
  _metadata: {}
};

// ❌ Incorrect
const mockResponse = {
  message: 'Test message',  // Missing underscore
  confidence: 0.95,         // Missing underscore
  metadata: {}              // Missing underscore
};
```

### Test Assertions
Always use the correct property names in assertions:
```typescript
// ✅ Correct
expect(response._message).toBe('Expected message');
expect(response._confidence).toBeGreaterThan(0.8);

// ❌ Incorrect
expect(response.message).toBe('Expected message');
expect(response.confidence).toBeGreaterThan(0.8);
```

## Database Conventions

### Column Naming
- Use snake_case for database columns
- Prefix system columns with underscore: `_created_at`, `_updated_at`
- Map to camelCase with underscores in TypeScript interfaces

### Table Names
- Use snake_case plural for table names: `user_profiles`, `crisis_events`
- Junction tables: `<table1>_<table2>` (alphabetical order)

## API Endpoint Conventions

### REST Endpoints
- Use kebab-case for URLs: `/api/crisis-events`
- Version APIs: `/api/v1/crisis-events`
- Use proper HTTP methods and status codes

### Request/Response Format
```typescript
// Request
interface ApiRequest {
  data: any;              // Public request data
  _requestId?: string;    // System-generated request ID
  _timestamp?: number;    // System timestamp
}

// Response
interface ApiResponse {
  data?: any;             // Response payload
  error?: ServiceError;   // Error if applicable
  _processingTime?: number;  // Internal metric
  _requestId?: string;    // Correlation ID
}
```

## Migration Guidelines

### Converting Existing Code
When updating existing code to follow conventions:

1. **Identify Internal Properties**: Review interfaces and mark internal properties
2. **Add Underscores**: Prefix internal properties with underscore
3. **Update Tests**: Fix all test files to use new property names
4. **Update Documentation**: Ensure docs reflect the convention
5. **Deprecation Period**: If breaking changes, provide migration period

### Backward Compatibility
For public APIs, consider providing getters for backward compatibility:
```typescript
class AgentResponse {
  _message: string;
  
  // Backward compatibility getter
  get message(): string {
    console.warn('Deprecated: Use _message instead');
    return this._message;
  }
}
```

## Enforcement

### Linting Rules
Add ESLint rules to enforce conventions:
```javascript
// .eslintrc.js
rules: {
  '@typescript-eslint/naming-convention': [
    'error',
    {
      selector: 'property',
      modifiers: ['private'],
      format: ['camelCase'],
      leadingUnderscore: 'require'
    }
  ]
}
```

### Code Review Checklist
- [ ] Internal properties use underscore prefix
- [ ] Test mocks match service interfaces exactly
- [ ] Database columns follow snake_case convention
- [ ] API endpoints use kebab-case
- [ ] Documentation updated for any convention changes

## Common Patterns

### Singleton Services
```typescript
class ServiceName {
  private static instance: ServiceName;
  
  private constructor() {}
  
  static getInstance(): ServiceName {
    if (!ServiceName.instance) {
      ServiceName.instance = new ServiceName();
    }
    return ServiceName.instance;
  }
}

// Export singleton instance
export const serviceName = ServiceName.getInstance();
```

### Agent Responses
```typescript
interface AgentResponse {
  _message: string;
  _confidence: number;
  _metadata?: Record<string, any>;
  _requiresEscalation?: boolean;
  actions?: AgentAction[];
}
```

### Security Context
```typescript
interface SecurityContext {
  _userId: string;
  _tenantId: string;
  _sessionId: string;
  _permissions: string[];
  _encryptionKey?: string;
}
```

## Exceptions

Some system-level properties may not follow these conventions:
- Standard JavaScript/TypeScript properties (constructor, prototype, etc.)
- Third-party library interfaces
- Legacy code under deprecation

Document any exceptions clearly in code comments.