# 🧪 Testing & Navigation Guide

## Quick Start Testing

### 1. Open the Application
The dev server should be running at: http://localhost:8080

### 2. Test Different User Roles

#### As a Patient:
1. Go to http://localhost:8080/login
2. Use test credentials:
   - Email: `test-patient@serenity.com`
   - Password: `TestPass123!`
3. Or use dev bypass in console:
   ```javascript
   localStorage.setItem('dev_bypass_auth', 'true');
   localStorage.setItem('pw_role', 'patient');
   window.location.href = '/patient/dashboard';
   ```

#### As a Provider:
1. Go to http://localhost:8080/login
2. Use test credentials:
   - Email: `test-provider@serenity.com`
   - Password: `TestPass123!`
3. Or use dev bypass in console:
   ```javascript
   localStorage.setItem('dev_bypass_auth', 'true');
   localStorage.setItem('pw_role', 'provider');
   window.location.href = '/provider/dashboard';
   ```

#### As a Supporter:
1. Go to http://localhost:8080/login
2. Use test credentials:
   - Email: `test-supporter@serenity.com`
   - Password: `TestPass123!`
3. Or use dev bypass in console:
   ```javascript
   localStorage.setItem('dev_bypass_auth', 'true');
   localStorage.setItem('pw_role', 'support_member');
   window.location.href = '/supporter/dashboard';
   ```

## 📋 Complete Page Directory

### Authentication & Onboarding
- `/login` - Login page with glass morphism design
- `/signup` - Sign up page
- `/forgot-password` - Password recovery
- `/reset-password` - Password reset
- `/provider-signup` - Provider registration
- `/supporter-signup` - Supporter registration

### Patient Experience
- `/patient/dashboard` - Main patient dashboard
- `/checkin` - Daily check-in form
- `/progress` - Progress tracking and analytics
- `/resources` - Recovery resources
- `/motivation` - Motivational content
- `/community` - Community support
- `/calendar` - Appointment calendar
- `/support-network` - Support network management
- `/accountability-partners` - Accountability partners
- `/recovery-planning` - Recovery plan creation
- `/relapse-prevention` - Relapse prevention tools
- `/manage-triggers` - Trigger management
- `/voice-support` - Voice-activated support

### Provider Portal
- `/provider/dashboard` - Provider main dashboard
- `/provider/analytics` - Patient analytics
- `/provider/patients` - Patient management
- `/provider/care-plans` - Care plan management
- `/provider/patient/:id` - Individual patient profile
- `/provider/profile` - Provider profile settings
- `/provider/demo` - Demo page for providers
- `/provider/quick-onboard` - Quick onboarding

### Crisis & Support
- `/crisis-support` - Crisis support page
- `/crisis-help` - Emergency help
- `/crisis-intervention` - Crisis intervention tools
- `/crisis-toolkit` - Crisis management toolkit
- `/mobile-crisis` - Mobile crisis support
- `/peer-support` - Peer support chat
- `/support` - General support page
- `/comprehensive-support` - Comprehensive support resources

### Supporter Portal
- `/supporter/dashboard` - Supporter dashboard
- `/supporter/messages` - Message center
- `/supporter/resources` - Supporter resources
- `/supporter/profile` - Supporter profile

### Admin & Compliance
- `/admin/dashboard` - Admin dashboard
- `/admin/crisis-monitor` - Crisis monitoring
- `/security-audit` - Security audit dashboard
- `/hipaa-security` - HIPAA compliance dashboard
- `/compliance-management` - Compliance management
- `/regulatory-compliance` - Regulatory compliance
- `/data-export` - Data export tools
- `/notification-management` - Notification settings
- `/pilot-readiness` - Pilot readiness assessment
- `/security-fixes-status` - Security status

### Clinical & Professional
- `/clinical-directory` - Clinical directory
- `/clinical-protocols` - Clinical protocols
- `/practice-management` - Practice management
- `/providers` - Provider directory
- `/peer-supervision` - Peer supervision tools
- `/platform` - Platform overview
- `/pilot` - Pilot program info

### Settings & Profile
- `/settings` - User settings
- `/profile` - User profile
- `/notification-management` - Notification preferences

### Static Pages
- `/` - Home page
- `/contact` - Contact page
- `/privacy` - Privacy policy
- `/terms` - Terms of service
- `/not-found` - 404 page
- `/access-denied` - Access denied page

## 🎨 Testing the Glass Morphism Design

### What to Look For:
1. **Glass Effect**: Semi-transparent backgrounds with backdrop blur
2. **Gradient Headers**: Beautiful gradient text in headings
3. **Smooth Animations**: Elements should animate in smoothly
4. **Hover Effects**: Cards should have subtle hover animations
5. **Consistent Styling**: All pages should have the same premium feel

### Key Design Elements:
- **GlassCard Components**: Look for the frosted glass effect on cards
- **MetricWidget**: Dashboard metrics with gradient backgrounds
- **Motion Animations**: Smooth page transitions and element reveals
- **Premium Colors**: Lavender, sage, coral, and sky gradients

## 🔧 Browser Developer Tools

To inspect the glass morphism effects:
1. Press `F12` to open DevTools
2. Inspect elements to see:
   - `backdrop-blur-xl` classes
   - `bg-white/60` opacity backgrounds
   - `GlassCard` components
   - Motion animation properties

## 🚀 Quick Navigation Commands

Open multiple pages quickly in new tabs:
```bash
# Open all main dashboards
start http://localhost:8080/patient/dashboard
start http://localhost:8080/provider/dashboard
start http://localhost:8080/supporter/dashboard
start http://localhost:8080/admin/dashboard
```

## 📱 Mobile Testing

To test mobile responsiveness:
1. Open DevTools (F12)
2. Click the device toggle (Ctrl+Shift+M)
3. Select different device sizes
4. Navigate through pages to test responsive design

## ✅ Checklist for Testing

- [ ] Home page loads with glass morphism design
- [ ] Login/signup pages have premium styling
- [ ] Patient dashboard shows GlassCard components
- [ ] Provider dashboard has gradient headers
- [ ] Crisis pages maintain urgency with elegant design
- [ ] Settings pages have consistent styling
- [ ] Mobile view works properly
- [ ] Animations are smooth
- [ ] Hover effects work on cards
- [ ] Navigation between pages is seamless