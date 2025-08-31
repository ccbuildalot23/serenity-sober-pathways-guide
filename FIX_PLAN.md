# COMPREHENSIVE FIX PLAN - Serenity Application

## Phase 1: Critical Backend Fixes (30 minutes)

### 1.1 Fix Authentication JSON Parsing
**Problem:** Special characters in password break JSON parsing
**Solution:**
```javascript
// backend/server.js - Update password handling
// Change hardcoded test passwords to not include special chars
const testPasswords = {
  'test-patient@serenity.com': 'TestPass123',
  'test-provider@serenity.com': 'TestPass123',
  'test-supporter@serenity.com': 'TestPass123'
};
```

### 1.2 Fix Database Connection
**Problem:** Backend can't connect to PostgreSQL
**Solution:**
```javascript
// backend/server.js - Fix connection string
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Add connection test
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database connection error:', err.stack);
  } else {
    console.log('✅ Database connected');
    release();
  }
});
```

### 1.3 Clean Up Port Configuration
**Commands:**
```bash
# Kill all frontend instances
taskkill /F /IM node.exe

# Start only one frontend on port 8080
npm run dev
```

## Phase 2: Frontend Integration (20 minutes)

### 2.1 Fix Auth Bypass
**Problem:** Frontend auto-redirects to dashboard without auth
**Solution:**
```typescript
// src/App.tsx - Remove auto-redirect
// Check for actual auth token before allowing dashboard access
const token = localStorage.getItem('auth_token');
if (!token) {
  return <Navigate to="/auth" />;
}
```

### 2.2 Ensure Login Form Displays
**Problem:** Login form not accessible
**Solution:**
```typescript
// src/pages/Auth.tsx
// Force display of login form when no token exists
// Remove any auto-login or bypass logic
```

### 2.3 Connect to Backend API
**Problem:** Frontend not using backend for auth
**Solution:**
```typescript
// src/services/authService.ts
const USE_BACKEND_API = true;
const API_URL = 'http://localhost:3001';
// Ensure all auth calls go to backend
```

## Phase 3: Test Configuration (15 minutes)

### 3.1 Update Playwright Config
**File:** `playwright.config.ts`
```typescript
export default defineConfig({
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:8080',
  }
});
```

### 3.2 Fix Test Credentials
**File:** `tests/e2e/global-setup.ts`
```typescript
const TEST_CREDENTIALS = {
  patient: {
    email: 'test-patient@serenity.com',
    password: 'TestPass123' // Updated password
  }
};
```

## Phase 4: Docker Cleanup (10 minutes)

### 4.1 Remove Broken Containers
```bash
docker stop serenity-redis-sentinel-1 serenity-redis-sentinel-2 serenity-redis-sentinel-3
docker rm serenity-redis-sentinel-1 serenity-redis-sentinel-2 serenity-redis-sentinel-3
```

### 4.2 Simplify Docker Compose
**File:** `docker-compose-mvp.yml`
- Remove sentinel configurations
- Keep only essential services (postgres, redis, backend)

## Phase 5: Environment Variables (5 minutes)

### 5.1 Create Unified .env
**File:** `.env`
```bash
# Backend
PORT=3001
DATABASE_URL=postgresql://serenity_user:serenity_password@localhost:5432/serenity
REDIS_URL=redis://localhost:6379
JWT_SECRET=serenity-jwt-secret-dev-2024

# Frontend
VITE_API_URL=http://localhost:3001
VITE_USE_LOCAL_AUTH=true
```

## Phase 6: Validation Steps (20 minutes)

### 6.1 Test Each Component
```bash
# 1. Database connection
docker exec serenity-db psql -U serenity_user -d serenity -c "\dt"

# 2. Backend health
curl http://localhost:3001/health

# 3. Authentication
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test-patient@serenity.com","password":"TestPass123"}'

# 4. Frontend access
curl http://localhost:8080

# 5. E2E tests
npx playwright test tests/e2e/auth-simple.spec.ts --headed
```

### 6.2 Success Criteria
- [ ] Backend shows database "connected"
- [ ] Auth returns JWT token
- [ ] Frontend shows login form
- [ ] User can login manually
- [ ] At least 1 E2E test passes

## Implementation Order

1. **STOP ALL SERVICES**
   ```bash
   taskkill /F /IM node.exe
   docker-compose -f docker-compose-mvp.yml down
   ```

2. **FIX BACKEND** (Priority 1)
   - Update password handling
   - Fix database connection
   - Test with curl

3. **FIX FRONTEND** (Priority 2)
   - Remove auth bypass
   - Ensure login form displays
   - Test manually in browser

4. **FIX TESTS** (Priority 3)
   - Update configuration
   - Update credentials
   - Run one test

5. **VALIDATE**
   - Run full test suite
   - Check all endpoints
   - Verify integration

## Estimated Time: 90 minutes

## Alternative: Start Fresh
If fixes take longer than 2 hours, consider:
1. Create new branch
2. Use working backend as base
3. Create minimal frontend with just login
4. Build up from working authentication

## Scripts to Create

### quick-fix.sh
```bash
#!/bin/bash
# Quick fix script
echo "Stopping all services..."
taskkill /F /IM node.exe
docker-compose down

echo "Starting fresh..."
docker-compose -f docker-compose-mvp.yml up -d
cd backend && npm start &
cd .. && npm run dev &

echo "Waiting for services..."
sleep 10

echo "Testing..."
curl http://localhost:3001/health
```

This plan addresses all critical issues identified in testing with specific, actionable fixes.