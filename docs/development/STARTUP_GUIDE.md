# Serenity Recovery Platform - Startup Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

The app will run on http://localhost:8080

## Key Features Status

### ✅ Working Features
- **Authentication**: Sign up/Sign in with email
- **User Types**: Three user types (Patient, Provider, Support Member)
- **Dashboard Routing**: Automatic routing based on user type
- **Error Handling**: Healthcare-focused error boundaries
- **Theme Support**: Light/Dark mode toggle
- **Security**: Enhanced security audit logging

### ⚠️ Features Requiring Supabase Setup
- Real-time notifications
- Database persistence
- Crisis system functionality
- Recovery streak tracking

## Navigation Flow

1. **Landing Page** (`/`) - Marketing landing page
2. **Auth Page** (`/auth`) - Sign in/Sign up
3. **Dashboard** (`/dashboard`) - Automatically routes to appropriate dashboard:
   - Patient Dashboard
   - Provider Dashboard
   - Support Member Dashboard

## Test Accounts

For development, you can create test accounts with any email. The system will automatically assign the "patient" role by default.

## Known Issues & Solutions

### Issue: "get_current_user_role" function not found
**Solution**: Run the migration file `20250805_fix_missing_functions.sql` in your Supabase dashboard

### Issue: Real-time features not working
**Solution**: Ensure Supabase environment variables are correctly set in `.env`:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Development Tips

1. **Debug Mode**: Add `?debug=true` to the auth page URL to see debug information
2. **Skip Auth**: In development mode, use the "Skip to Home" button on the auth page
3. **Clear Storage**: Use the debug panel to clear localStorage and sessionStorage if needed

## Architecture Overview

```
src/
├── components/       # Reusable UI components
│   ├── auth/        # Authentication components
│   ├── crisis/      # Crisis intervention system
│   ├── dashboard/   # Dashboard components
│   └── ui/          # Base UI components (shadcn)
├── contexts/        # React contexts (AuthContext)
├── hooks/           # Custom React hooks
├── pages/           # Page components
├── services/        # API and business logic services
└── integrations/    # External integrations (Supabase)
```

## Important Files

- `src/App.tsx` - Main application router
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/components/DashboardRouter.tsx` - Routes users to appropriate dashboard
- `src/hooks/useUserRole.ts` - Determines user role and permissions

## Troubleshooting

### App won't start
1. Check Node.js version (16+ required)
2. Delete `node_modules` and run `npm install`
3. Check for port conflicts (default: 8080)

### Authentication issues
1. Check Supabase connection
2. Verify environment variables
3. Check browser console for errors

### Database errors
1. Ensure all migrations are run
2. Check RLS policies in Supabase
3. Verify user permissions

## Support

For issues or questions, check the repository issues or contact the development team.