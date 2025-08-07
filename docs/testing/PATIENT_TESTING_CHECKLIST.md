# Patient Features Testing Checklist

## Pre-Testing Setup
- [ ] Ensure development server is running (`npm run dev`)
- [ ] Access application at http://localhost:5173
- [ ] Have browser DevTools open to monitor console errors
- [ ] Clear browser cache and local storage
- [ ] Create or use a test patient account

## 1. Authentication Flow
- [ ] Navigate to /auth
- [ ] Test sign up with new email
- [ ] Verify email validation works
- [ ] Test sign in with existing account
- [ ] Verify redirect to dashboard after login
- [ ] Test logout functionality
- [ ] Verify session persistence on page refresh

## 2. Patient Dashboard (/dashboard or /patient)
### Stats Cards
- [ ] Verify "Hope Journey" streak displays correctly
- [ ] Check "Total Check-ins" count
- [ ] Confirm "Support Network" member count
- [ ] Verify "Goals Progress" shows X/Y format

### Recent Activity
- [ ] Check recent check-ins display (last 7 days)
- [ ] Verify mood ratings show correctly
- [ ] Confirm completion badges work

### Quick Actions
- [ ] Click "Start Today's Check-in" - verify navigation
- [ ] Click "Manage Support Network" - verify navigation
- [ ] Test "Schedule Appointment" button

### Safety Features
- [ ] Verify crisis alert status displays
- [ ] Check emergency notice is visible
- [ ] Test crisis helpline information

## 3. Daily Check-in (/checkin)
### Initial State
- [ ] Verify date displays correctly
- [ ] Check all 3 mood buttons are visible

### Struggling Path
- [ ] Select "Struggling" mood
- [ ] Verify supportive message appears
- [ ] Test "Call Someone Now" button
  - [ ] First time: should prompt for number
  - [ ] Subsequent: should use saved number
- [ ] Test "60-Second Breathing" exercise
  - [ ] Verify timer starts
  - [ ] Check breath prompts change
  - [ ] Confirm stops at 60 seconds
- [ ] Test "Why I Got Clean" feature
  - [ ] First time: should prompt for input
  - [ ] Subsequent: should show saved reason
- [ ] Click "I Need More Help" - verify navigation

### Managing Path
- [ ] Select "Managing" mood
- [ ] Verify encouraging message
- [ ] Test "Practice a Grounding Tool" link
- [ ] Test "Connect with Peers" link
- [ ] Verify back navigation works

### Good Path
- [ ] Select "Good" mood
- [ ] Verify celebration message
- [ ] Test "Share Hope with Others" button
- [ ] Verify back navigation works

## 4. Peer Support (/peer-support)
### Pre-Join
- [ ] Verify anonymous name generation (e.g., "Day123Hope")
- [ ] Check anonymity notice
- [ ] Test "Join Support Room" button

### In Room
- [ ] Verify join message appears
- [ ] Test sending a message
- [ ] Check message appears with correct name
- [ ] Verify other users' messages display
- [ ] Test "Leave Room" button

### Voice Features
- [ ] Test "Record Your Story" button
- [ ] Verify recording indicator
- [ ] Check stop recording works
- [ ] Confirm success message

## 5. Support Network (/support)
### Main View
- [ ] Check if redirects to correct page
- [ ] Verify all support options display
- [ ] Test crisis hotline buttons
- [ ] Check meeting finder functionality

### Contact Management
- [ ] Test "Add Contact" button
- [ ] Fill and submit contact form
- [ ] Verify contact appears in list
- [ ] Test call/message buttons on contacts
- [ ] Test delete contact functionality

### Crisis Features
- [ ] Click "Crisis Contacts" button
- [ ] Verify crisis contact management
- [ ] Test emergency contact setup
- [ ] Check crisis protocol configuration

## 6. Motivation Center (/motivation)
### Tabs
- [ ] Verify all 3 tabs are visible
- [ ] Test tab switching

### Daily Quote
- [ ] Verify quote displays
- [ ] Check author attribution

### My Library
- [ ] Test adding personal motivation
- [ ] Verify edit functionality
- [ ] Test delete functionality

### Achievements
- [ ] Check badge display
- [ ] Verify progress indicators

### Progress Visualization
- [ ] Verify charts load
- [ ] Check data accuracy

## 7. Recovery Planning (/planning)
### Dashboard Tab
- [ ] Verify plan overview displays
- [ ] Check progress tracking

### Templates Tab
- [ ] Browse available templates
- [ ] Test template preview
- [ ] Verify template selection

### Plan Builder Tab
- [ ] Test creating custom plan
- [ ] Add goals and milestones
- [ ] Save plan

### Providers Tab
- [ ] Check provider list
- [ ] Test provider integration features

## 8. Community (/community)
- [ ] Verify success stories load
- [ ] Test story interactions
- [ ] Check moderation indicators
- [ ] Test posting functionality (if available)

## 9. Crisis Support (/crisis-support)
- [ ] Test emergency button
- [ ] Verify crisis toolkit access
- [ ] Try grounding exercises
- [ ] Test emergency contacts setup
- [ ] Verify SMS alert configuration
- [ ] Check warning messages

## 10. Navigation & UI
### Bottom Navigation
- [ ] Test all 6 navigation items
- [ ] Verify active state highlighting
- [ ] Check icon visibility
- [ ] Confirm smooth transitions

### Header
- [ ] Check notification bell icon
- [ ] Test notification dropdown
- [ ] Verify profile access

## 11. Error Handling
- [ ] Test with network disconnected
- [ ] Verify error messages display
- [ ] Check recovery options
- [ ] Test form validation errors

## 12. Mobile Responsiveness
- [ ] Test on mobile viewport (375px)
- [ ] Check tablet viewport (768px)
- [ ] Verify touch interactions
- [ ] Test landscape orientation

## 13. Performance
- [ ] Page load time < 3 seconds
- [ ] Check-in submission < 1 second
- [ ] Smooth scrolling
- [ ] No console errors

## Common Issues to Watch For
1. **Settings Page**: Shows "coming soon" message
2. **Phone Links**: May not work in desktop browser
3. **Voice Recording**: Requires HTTPS and permissions
4. **Real-time Features**: May show connection warnings
5. **Support vs Peer Support**: Navigation confusion

## Post-Testing
- [ ] Document any bugs found
- [ ] Note UI/UX improvements
- [ ] Clear test data if needed
- [ ] Log out of test account