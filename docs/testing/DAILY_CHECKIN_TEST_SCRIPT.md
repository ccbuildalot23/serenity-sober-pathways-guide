
# Daily Check-In Manual Test Script

## Test Scenarios

### 1. Section Completion Logic
**Goal:** Verify users must complete all 3 sections before "Complete Check-In" is enabled.

#### Test Steps:
1. Navigate to `/checkin`
2. **Mood Only Test:**
   - Move the mood slider to any value
   - Verify "Mood" section shows ✓ in progress bar
   - Verify "Complete Check-In" button remains disabled
   - Try clicking the button - should show validation message

3. **Wellness Only Test:**
   - Reset page (refresh)
   - Fill all wellness sliders (Energy, Hope, Sobriety Confidence, Recovery Importance, Recovery Strength)
   - Verify "Wellness" section shows ✓ in progress bar
   - Verify "Complete Check-In" button remains disabled

4. **Assessments Only Test:**
   - Reset page (refresh)
   - Answer all 4 assessment questions (PHQ-2 and GAD-2)
   - Verify "Assessments" section shows ✓ in progress bar
   - Verify "Complete Check-In" button remains disabled

5. **Complete All Sections Test:**
   - Fill out all sections completely
   - Verify all sections show ✓ in progress bar
   - Verify progress bar shows 100%
   - Verify "Complete Check-In" button becomes enabled and green
   - Click "Complete Check-In" - should submit successfully

**Expected Results:**
- Button only enabled when all 3 sections complete
- Clear visual feedback on section completion
- Helpful error messages when trying to submit incomplete form

### 2. Submission and Completion State
**Goal:** Verify proper saving and completion state handling.

#### Test Steps:
1. Complete all sections and submit
2. Verify success toast appears
3. Verify page shows "Check-In Complete!" message
4. Verify completion summary displays
5. Navigate away and return to `/checkin`
6. Verify "already checked in" banner still shows
7. Verify form is not accessible

**Expected Results:**
- Data saves to Supabase with today's date
- Completion state persists across page reloads
- Clear completion confirmation

### 3. Draft Persistence
**Goal:** Verify auto-save and draft recovery functionality.

#### Test Steps:
1. Navigate to `/checkin`
2. Fill out mood section partially
3. Fill out some wellness fields
4. **Refresh the page**
5. Verify all previously entered data is restored
6. Complete the check-in
7. **Refresh the page**
8. Verify completion state shows (no draft restoration)

**Expected Results:**
- All form data persists across page refreshes
- Drafts auto-save on every change
- Completed check-ins clear draft data

### 4. Mobile Responsiveness & Accessibility
**Goal:** Verify mobile usability and keyboard navigation.

#### Test Steps:
1. **Mobile Test:**
   - Open on mobile device or use browser dev tools mobile view
   - Verify all cards display properly
   - Verify sliders are usable on touch
   - Verify radio buttons are large enough to tap
   - Verify text is readable

2. **Keyboard Navigation Test:**
   - Use only Tab/Shift+Tab to navigate
   - Verify all interactive elements are reachable
   - Use Enter/Space to activate buttons and select options
   - Verify focus indicators are visible
   - Test with screen reader if available

**Expected Results:**
- Full functionality on mobile devices
- Complete keyboard accessibility
- Clear focus indicators

### 5. Error & Loading Handling
**Goal:** Verify proper error handling and loading states.

#### Test Steps:
1. **Loading State Test:**
   - Complete all sections
   - Click "Complete Check-In"
   - Verify button shows spinner and "Completing..." text
   - Verify button is disabled during submission

2. **Error Handling Test:**
   - Disconnect from internet or simulate network error
   - Try to submit completed form
   - Verify error toast appears
   - Verify form remains in submittable state for retry
   - Reconnect and retry - should work

**Expected Results:**
- Clear loading indicators during submission
- Graceful error handling with retry capability
- User-friendly error messages

### 6. Data Validation
**Goal:** Verify all required fields are properly validated.

#### Test Steps:
1. **Incomplete Mood:**
   - Don't move mood slider from default
   - Try other sections - mood should not be marked complete

2. **Incomplete Wellness:**
   - Leave any wellness slider at default
   - Complete other sections - wellness should not be marked complete

3. **Incomplete Assessments:**
   - Leave any assessment question unselected  
   - Complete other sections - assessments should not be marked complete

**Expected Results:**
- Sections only marked complete when ALL required fields filled
- Clear visual indicators for required fields
- Proper validation messaging

## Success Criteria

✅ **All tests pass without errors**
✅ **Data persists correctly in Supabase**  
✅ **Mobile experience is fully functional**
✅ **Keyboard navigation works completely**
✅ **Loading and error states display properly**
✅ **Draft auto-save works reliably**
✅ **Completion state persists correctly**

## Common Issues to Watch For

- **Draft conflicts:** Ensure completed check-ins properly clear drafts
- **Section validation:** Verify default values don't count as "completed"
- **Mobile touch targets:** Ensure all interactive elements are easily tappable
- **Focus management:** Tab order should be logical and all elements reachable
- **Data persistence:** Check both Supabase and localStorage fallbacks work
- **Time zone handling:** Verify "today" calculations work across time zones
