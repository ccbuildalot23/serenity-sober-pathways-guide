# Recovery Platform Accessibility Test Suite

## Overview

This comprehensive accessibility test suite is specifically designed for the **Serenity Sober Pathways Guide**, a HIPAA-compliant mental health and substance abuse recovery platform. The tests focus on ensuring critical accessibility during emotional distress scenarios when users are most vulnerable.

## Test Categories

### 1. Crisis State Accessibility Tests (`crisis-state-tests.spec.ts`)
- **Focus**: Testing during high emotional distress scenarios
- **Scenarios Tested**:
  - HALT Assessment during panic attacks
  - Voice commands during crisis
  - One-tap crisis escalation
  - Large touch targets for shaking hands
  - High contrast for crisis indicators
- **Priority**: CRITICAL

### 2. Cognitive Load Testing (`cognitive-load-tests.spec.ts`)
- **Focus**: Testing when users have reduced cognitive capacity
- **Scenarios Tested**:
  - Simplified navigation paths (max 3 choices)
  - Memory-assisted interfaces with visual cues
  - Attention guidance during focus tasks
  - Plain language for complex concepts
  - Error prevention and recovery
- **Priority**: HIGH

### 3. Accessibility Standards Compliance (`accessibility-standards-tests.spec.ts`)
- **Focus**: Comprehensive WCAG 2.1 AA compliance
- **Areas Tested**:
  - Screen reader compatibility for crisis components
  - Complete keyboard navigation
  - Enhanced color contrast (7:1 for crisis indicators)
  - Scalable text for emotional stress
  - Proper ARIA implementation
- **Priority**: CRITICAL

### 4. Mobile Crisis Testing (`mobile-crisis-tests.spec.ts`)
- **Focus**: Mobile accessibility during crisis situations
- **Features Tested**:
  - Extra-large touch targets (60px+ for crisis buttons)
  - Simple gestures (no complex interactions)
  - Offline emergency functionality
  - One-handed mobile navigation
  - Battery optimization for crisis scenarios
- **Priority**: HIGH

### 5. Emotional Distress Scenarios (`emotional-distress-scenarios.spec.ts`)
- **Focus**: Real-world recovery scenarios during vulnerable states
- **Scenarios Tested**:
  - HALT Assessment during panic attacks
  - Craving Timer during severe episodes
  - Meeting Finder during social anxiety
  - Playing It Forward during decision paralysis
  - Multi-system crisis integration
- **Priority**: CRITICAL

## Healthcare-Specific Considerations

### Crisis Button Accessibility
- Minimum 60px touch targets for trembling hands
- High contrast indicators (7:1 ratio)
- Voice activation support
- Keyboard accessible (Tab, Enter, Space)

### Screen Reader Support
- Immediate ARIA live region announcements for crisis
- Proper modal focus management
- Descriptive button labels ("Emergency Crisis Line - Call Now")
- Status updates for timer and assessment progress

### Cognitive Accessibility
- Maximum 3 choices per interface
- Simple sentences (≤15 words)
- Visual memory aids (emojis, progress indicators)
- Consistent terminology across all tools

### Mobile Crisis Optimization
- Thumb-friendly button placement
- Offline functionality for critical features
- Battery optimization mode
- Simple tap gestures only

## Test Data Attributes Required

For tests to pass, components must include these data-testid attributes:

### Crisis System
- `crisis-button` - Main crisis activation button
- `crisis-modal` - Crisis intervention modal
- `emergency-contact-button` - Direct emergency contact
- `crisis-hotline-button` - 988 crisis hotline

### HALT Assessment
- `halt-assessment-form` - Main HALT form container
- `hungry-slider`, `angry-slider`, `lonely-slider`, `tired-slider` - Individual HALT sliders
- `complete-assessment-button` - Submit assessment
- `crisis-alert` - Crisis detection banner

### Craving Timer
- `intensity-before-slider` - Pre-timer intensity input
- `start-timer-button` - Begin timer session
- `timer-display` - Main timer countdown
- `pause-timer-button` - Pause/resume control
- `distraction-grid` - Activity selection grid

### Mobile Interface
- `primary-crisis-button` - Main mobile crisis action
- `mobile-crisis-button` - Mobile-optimized crisis access
- `offline-crisis-button` - Offline mode crisis support

## Running Tests

### Complete Test Suite
```bash
npm run test:accessibility
```

### Individual Test Suites
```bash
npm run test:accessibility:crisis
npm run test:accessibility:cognitive  
npm run test:accessibility:standards
npm run test:accessibility:mobile
npm run test:accessibility:distress
```

### Prerequisites
1. Development server must be running (`npm run dev`)
2. Application accessible at `http://localhost:8080`
3. Test user authentication mocked in beforeEach

## Report Generation

Tests automatically generate:
- **HTML Report**: `test-results/accessibility-report.html`
- **JSON Report**: `test-results/accessibility-report.json`
- **Recommendations**: `test-results/accessibility-recommendations.json`

## Critical Issues to Address

Based on healthcare accessibility requirements:

1. **CRITICAL**: All crisis buttons must be ≥60px for motor impairment
2. **CRITICAL**: Screen reader support for all crisis modals
3. **HIGH**: Keyboard navigation for all recovery tools
4. **HIGH**: Enhanced contrast for crisis indicators
5. **MEDIUM**: Mobile optimization for one-handed use

## Implementation Notes

### Why These Tests Matter
Users of this recovery platform are often in crisis states:
- **Panic attacks**: Impaired motor control, need large targets
- **Severe cravings**: Reduced cognitive function, need simplicity
- **Social anxiety**: Need anonymous/private options
- **Decision paralysis**: Need binary choices, not complex menus

### Accessibility = Life-Saving Support
Every accessibility violation could prevent a user from accessing:
- Crisis hotline (988)
- Emergency contacts
- Coping tools during vulnerable moments
- Support network during relapse risk

### HIPAA Compliance Integration
Tests ensure accessibility doesn't compromise security:
- Secure authentication flows remain accessible
- PHI protection with screen reader compatibility
- Audit logging for accessibility-enabled interactions

## Framework Details

- **Testing Framework**: Playwright with TypeScript
- **Accessibility Engine**: @axe-core/playwright (Deque's axe-core)
- **Device Testing**: Desktop Chrome/Firefox/Safari + Mobile Chrome/Safari
- **Standards**: WCAG 2.1 AA (with AAA for crisis components)

## Future Enhancements

1. **Voice Command Testing**: Complete voice navigation flows
2. **Assistive Technology**: Testing with NVDA, JAWS, VoiceOver
3. **Cognitive Load Measurement**: Quantitative complexity analysis
4. **Real User Testing**: Testing with users in recovery
5. **Performance Impact**: Accessibility feature performance testing

This test suite ensures that when someone needs help the most, the technology doesn't get in their way.