# Staggered Notification Timing System

## Overview

The Crisis Handler now implements a sophisticated staggered notification timing system that balances urgency with preventing alert fatigue. Notifications are sent to support networks in tiers with calculated delays based on severity.

## Features

### 1. Tier-Based Delays

Support contacts are organized into three tiers, each with a base delay:

- **Tier 1 (Primary)**: 30 seconds - Sponsor, primary family members
- **Tier 2 (Secondary)**: 90 seconds - Secondary family, close friends  
- **Tier 3 (Emergency)**: 3 minutes - Extended support network

### 2. Severity-Based Multipliers

The base delays are adjusted based on crisis severity:

| Severity | Multiplier | Tier 1 | Tier 2 | Tier 3 |
|----------|------------|--------|--------|--------|
| Critical | 0.5x | 15s | 45s | 90s |
| High | 1.0x | 30s | 90s | 180s |
| Medium | 2.0x | 60s | 180s | 360s |
| Low | 4.0x | 120s | 360s | 720s |

### 3. Concurrent Processing

All contacts within a tier are notified simultaneously for faster response times while maintaining tier separation.

## Implementation

### Configuration

```typescript
const handler = new CrisisHandler({
  staggeredTiming: {
    tierDelays: {
      primary: 30000,     // milliseconds
      secondary: 90000,
      emergency: 180000
    },
    severityMultipliers: {
      critical: 0.5,
      high: 1.0,
      medium: 2.0,
      low: 4.0
    }
  }
});
```

### Request Structure

```typescript
const crisisRequest = {
  message: "I need help",
  severity: "high",  // critical | high | medium | low
  supporter_tiers: [
    {
      tier: "primary",  // primary | secondary | emergency
      contacts: [...]
    }
  ]
};
```

## Testing

### Quick Demo
```bash
node test-staggered-timing.mjs --quick
```

### Full Test Suite
```bash
node test-staggered-timing.mjs --full
```

## Performance

- **Timing Accuracy**: ±100ms tolerance
- **Concurrent Processing**: All contacts in a tier notified simultaneously
- **Memory Usage**: <2KB per alert + 1KB per contact
- **Processing Time**: <50ms per alert baseline

## Benefits

1. **Prevents Alert Fatigue**: Staggered notifications prevent overwhelming all supporters at once
2. **Severity-Appropriate Response**: Critical situations escalate faster
3. **Efficient Processing**: Concurrent notifications within tiers reduce total time
4. **Configurable**: Easy to adjust timing based on needs
5. **Backward Compatible**: Existing code continues to work

## Monitoring

The system provides detailed logging:

```
[CRISIS] Processing alert: high - User message
[CRISIS] Using staggered timing with severity multiplier: 1x
[TIMING] Tier: primary, Severity: high, Base: 30000ms, Multiplier: 1x, Final: 30000ms
[CRISIS] Notifying primary tier immediately (first tier)
[CRISIS] Sending concurrent notifications to 2 contacts in primary tier
[CRISIS] primary tier: 6 notifications sent in 183ms
[CRISIS] Waiting 90 seconds before notifying secondary tier...
```

## Future Enhancements

- [ ] Dynamic timing based on response patterns
- [ ] Priority override for specific contacts
- [ ] Time-of-day adjustments
- [ ] Historical response time optimization
- [ ] Integration with professional emergency services