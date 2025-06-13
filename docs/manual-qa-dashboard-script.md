
# Manual QA Script - Dashboard Page

## Test Scenarios

### 1. Login and Load Dashboard
- [ ] Log in with valid credentials
- [ ] Dashboard loads without errors
- [ ] Stats display correctly (streak, check-ins, goals)
- [ ] No console errors
- [ ] Loading skeletons appear during data fetch

### 2. Live Data Integration
- [ ] Complete a quick check-in
- [ ] Stats update instantly without page reload
- [ ] Goal progress reflects in Weekly Goals widget
- [ ] Check-in count increments

### 3. Session Management
- [ ] Session validation runs every 60 seconds
- [ ] Invalid session redirects to /auth
- [ ] Session warning appears 5 minutes before timeout
- [ ] Sign out always redirects to /auth (even on error)

### 4. Notification Permissions
- [ ] Permission prompt appears on first visit
- [ ] Denial shows dismissible banner
- [ ] Banner can be dismissed and stays dismissed
- [ ] Granted permission enables notifications

### 5. Crisis Features
- [ ] Crisis alert only shows when riskLevel exists
- [ ] Crisis support widget always visible
- [ ] Crisis toolkit accessible via button

### 6. Accessibility Testing
- [ ] All interactive elements keyboard navigable (Tab)
- [ ] Enter/Space activates buttons and links
- [ ] Clear focus outlines visible
- [ ] Aria-labels present on icon-only buttons
- [ ] Screen reader can navigate all content

### 7. Keyboard Shortcuts
- [ ] Ctrl+H navigates to Home
- [ ] Ctrl+C navigates to Calendar
- [ ] Ctrl+T navigates to Crisis Toolkit
- [ ] Ctrl+S navigates to Settings
- [ ] Keyboard shortcuts info tooltip displays correctly

### 8. Mobile Responsiveness
- [ ] All cards stack vertically on screens <600px
- [ ] No horizontal scrolling
- [ ] Text remains readable
- [ ] Buttons remain accessible
- [ ] Touch targets are appropriately sized

### 9. Error Handling
- [ ] Network errors show retry option
- [ ] Failed data loads show error toast
- [ ] Retry button works correctly
- [ ] Graceful degradation when services unavailable

### 10. Loading States
- [ ] Skeleton loaders appear during initial load
- [ ] Loading states for stats refresh
- [ ] Smooth transitions between loading and loaded states

## Expected Results
- Dashboard fully functional across all devices
- No console errors or warnings
- Smooth user experience with immediate feedback
- Proper accessibility compliance
- Robust error handling and recovery
