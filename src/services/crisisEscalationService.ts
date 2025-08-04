// Support Connection Service - Getting you the help you deserve

export type SupportLevel = 'immediate' | 'urgent';

export const connectToSupport = (level: SupportLevel) => {
  if (level === 'urgent') {
    // For life-threatening emergencies
    window.location.href = 'tel:911';
  } else if (level === 'immediate') {
    // For crisis support and someone to talk to
    window.location.href = 'tel:988';
  }
};

// Keep for backwards compatibility
export const escalateCrisis = connectToSupport;
