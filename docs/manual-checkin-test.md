
# Daily Check-In Manual QA Test Plan

## Test Environment Setup
- Browser: Chrome, Firefox, Safari
- Screen sizes: Desktop (1920x1080), Tablet (768px), Mobile (375px)
- User: Authenticated user with no check-in completed for today

## Test Cases

### 1. Initial Page Load (Empty State)
**Steps:**
1. Navigate to `/checkin` as authenticated user
2. Verify no existing check-in exists for today

**Expected Results:**
- ✅ Page loads with 3 sections: Mood, Wellness, Assessments
- ✅ Progress bar shows 0/3 sections completed
- ✅ "Complete Check-In" button is disabled and gray
- ✅ No sections have green checkmarks
- ✅ Auto-save indicator is visible at bottom

### 2. Incomplete Submission Validation
**Steps:**
1. Leave all sections empty, click "Complete Check-In"
2. Complete only Mood section, click "Complete Check-In"  
3. Complete Mood + Wellness, click "Complete Check-In"

**Expected Results:**
- ✅ Button remains disabled when sections incomplete
- ✅ Yellow warning message appears: "Complete all sections to finish"
- ✅ No API call is made
- ✅ Incomplete sections show yellow highlighting/warning icons

### 3. Progressive Section Completion
**Steps:**
1. Complete Mood section (select any mood rating 1-10)
2. Verify progress updates
3. Complete Wellness section (all 5 sliders + support checkbox)
4. Verify progress updates  
5. Complete Assessments section (all 4 PHQ-2/GAD-2 questions)
6. Verify final state

**Expected Results:**
- ✅ Progress bar updates: 1/3, 2/3, 3/3
- ✅ Completed sections show green background + checkmark
- ✅ Button enables only when all 3 sections done
- ✅ Button changes to green when ready

### 4. Auto-Save Functionality
**Steps:**
1. Complete Mood section
2. Refresh page (F5)
3. Verify mood selection persists
4. Complete remaining sections partially
5. Refresh again
6. Verify all progress persists

**Expected Results:**
- ✅ All user selections persist across page reloads
- ✅ Completed section states are maintained
- ✅ Progress bar reflects saved state
- ✅ Draft data is stored in localStorage

### 5. Successful Submission
**Steps:**
1. Complete all 3 sections fully
2. Click "Complete Check-In" button
3. Wait for submission to complete

**Expected Results:**
- ✅ Button shows spinner and "Completing..." text
- ✅ Button is disabled during submission
- ✅ Success: Page shows green "Check-In Complete!" banner
- ✅ Form inputs are hidden
- ✅ Summary shows today's mood/energy values
- ✅ "Return to Dashboard" button appears

### 6. Duplicate Prevention
**Steps:**
1. After successful submission, refresh page
2. Try to navigate back to /checkin
3. Verify completed state persists

**Expected Results:**
- ✅ Always shows "Check-In Complete!" state
- ✅ No form inputs are visible
- ✅ Cannot submit another check-in for same day
- ✅ Draft localStorage data is cleared

### 7. Network Error Handling
**Steps:**
1. Open DevTools, go to Network tab
2. Set network to "Offline" or block API calls
3. Complete all sections and submit
4. Verify error handling
5. Re-enable network and retry

**Expected Results:**
- ✅ Error toast appears with clear message
- ✅ User data is not lost
- ✅ Retry button/option is available
- ✅ Successful retry works without data loss

### 8. Mobile Responsiveness (375px width)
**Steps:**
1. Resize browser to 375px width or use device emulation
2. Test all interactions on mobile layout
3. Verify touch targets are adequate (44px minimum)

**Expected Results:**
- ✅ All text is readable
- ✅ Buttons are easily tappable
- ✅ Sliders work with touch
- ✅ Cards stack vertically nicely
- ✅ Progress bar is visible and clear
- ✅ No horizontal scrolling required

### 9. Keyboard Navigation & Accessibility
**Steps:**
1. Navigate entire form using only Tab key
2. Test all inputs with keyboard only
3. Verify screen reader compatibility
4. Check aria-labels and focus indicators

**Expected Results:**
- ✅ All interactive elements are keyboard accessible
- ✅ Tab order is logical (top to bottom)
- ✅ Focus indicators are clearly visible
- ✅ Aria-labels are present for complex inputs
- ✅ Submit button has descriptive aria-label when disabled

### 10. Cross-Browser Testing
**Steps:**
1. Test all above scenarios in Chrome, Firefox, Safari
2. Verify consistent behavior across browsers

**Expected Results:**
- ✅ Identical functionality in all major browsers
- ✅ Visual consistency maintained
- ✅ localStorage works in all browsers

## Test Data Requirements

### Sample Test Responses:
- **Mood:** 7/10
- **Energy:** 6/10  
- **Hope:** 8/10
- **Sobriety Confidence:** 9/10
- **Recovery Importance:** 10/10
- **Recovery Strength:** 7/10
- **Support Needed:** false
- **PHQ-2 Q1:** 1 (Several days)
- **PHQ-2 Q2:** 0 (Not at all)
- **GAD-2 Q1:** 2 (More than half the days)
- **GAD-2 Q2:** 1 (Several days)

## Pass/Fail Criteria
- **PASS:** All test cases pass with expected results ✅
- **FAIL:** Any test case fails or produces unexpected behavior ❌

## Bug Reporting Template
```
**Bug:** [Brief description]
**Steps to Reproduce:** [Numbered steps]
**Expected:** [What should happen]
**Actual:** [What actually happened]  
**Browser:** [Chrome/Firefox/Safari version]
**Screen Size:** [Desktop/Tablet/Mobile]
**Severity:** [High/Medium/Low]
```
