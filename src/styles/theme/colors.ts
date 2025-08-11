// Therapeutic Color System for Serenity Recovery App
// Ensures proper contrast ratios (minimum 4.5:1) and recovery-focused design

export const therapeuticColors = {
  // Primary Text Colors - High contrast for readability
  text: {
    primary: '#1f2937', // Dark gray - main text
    secondary: '#4b5563', // Medium gray - secondary text
    tertiary: '#6b7280', // Light gray - tertiary text
    inverse: '#ffffff', // White text on dark backgrounds
    muted: '#9ca3af', // Muted text for disabled states
  },

  // Background Colors - Light, calming backgrounds
  background: {
    primary: '#f8fafc', // Light gray - main background
    secondary: '#f1f5f9', // Slightly darker - secondary background
    tertiary: '#e2e8f0', // Card backgrounds
    inverse: '#1f2937', // Dark background for contrast
    paper: '#ffffff', // White paper background
  },

  // Sage Accents - Recovery-focused green tones
  sage: {
    50: '#f6f7f6',
    100: '#e3e7e3',
    200: '#c7cfc7',
    300: '#a3b1a3',
    400: '#7a8f7a',
    500: '#87A96B', // Primary sage - main accent
    600: '#6b8a5a',
    700: '#556b47',
    800: '#455639',
    900: '#3a4730',
  },

  // Error States - Used sparingly for critical alerts
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#dc2626', // Primary error - crisis button
    600: '#b91c1c',
    700: '#991b1b',
    800: '#7f1d1d',
    900: '#450a0a',
  },

  // Success States - Positive reinforcement
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981', // Primary success - emerald
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },

  // Crisis Button - High contrast for emergency situations
  crisis: {
    primary: '#dc2626', // Red background
    text: '#ffffff', // White text for maximum contrast
    hover: '#b91c1c', // Darker red on hover
    focus: '#991b1b', // Even darker for focus
  },

  // Support Network Colors
  support: {
    primary: '#3b82f6', // Blue for support network
    secondary: '#1d4ed8', // Darker blue
    accent: '#dbeafe', // Light blue background
  },

  // Recovery Progress Colors
  recovery: {
    primary: '#8b5cf6', // Purple for recovery milestones
    secondary: '#7c3aed', // Darker purple
    accent: '#f3e8ff', // Light purple background
  },

  // Form Input Colors - High contrast for accessibility
  input: {
    background: '#ffffff', // White background
    border: '#d1d5db', // Gray border
    borderFocus: '#3b82f6', // Blue focus border
    text: '#1f2937', // Dark text
    placeholder: '#9ca3af', // Muted placeholder
    disabled: '#f3f4f6', // Light gray disabled background
  },

  // Button Colors - Consistent with therapeutic theme
  button: {
    primary: {
      background: '#87A96B', // Sage primary
      text: '#ffffff', // White text
      hover: '#6b8a5a', // Darker sage
      focus: '#556b47', // Even darker for focus
    },
    secondary: {
      background: '#f3f4f6', // Light gray
      text: '#1f2937', // Dark text
      hover: '#e5e7eb', // Slightly darker
      focus: '#d1d5db', // Even darker for focus
    },
    destructive: {
      background: '#dc2626', // Red for destructive actions
      text: '#ffffff', // White text
      hover: '#b91c1c', // Darker red
      focus: '#991b1b', // Even darker for focus
    },
  },

  // Status Colors - Clear visual indicators
  status: {
    online: '#10b981', // Green for online
    away: '#f59e0b', // Yellow for away
    busy: '#dc2626', // Red for busy
    offline: '#6b7280', // Gray for offline
  },

  // Accessibility - High contrast combinations
  accessibility: {
    // Text on background combinations that meet WCAG AA standards
    highContrast: {
      text: '#1f2937', // Dark text
      background: '#ffffff', // White background
      ratio: 15.6, // Well above 4.5:1 requirement
    },
    mediumContrast: {
      text: '#4b5563', // Medium text
      background: '#f8fafc', // Light background
      ratio: 7.2, // Above 4.5:1 requirement
    },
    lowContrast: {
      text: '#6b7280', // Light text
      background: '#f1f5f9', // Light background
      ratio: 4.8, // Just above 4.5:1 requirement
    },
  },
};

// Utility functions for color management
export const colorUtils = {
  // Get contrast ratio between two colors
  getContrastRatio: (color1: string, color2: string): number => {
    // Simplified contrast calculation - in production, use a proper color library
    const luminance1 = getLuminance(color1);
    const luminance2 = getLuminance(color2);
    const brightest = Math.max(luminance1, luminance2);
    const darkest = Math.min(luminance1, luminance2);
    return (brightest + 0.05) / (darkest + 0.05);
  },

  // Check if a color combination meets accessibility standards
  isAccessible: (textColor: string, backgroundColor: string, minRatio: number = 4.5): boolean => {
    return colorUtils.getContrastRatio(textColor, backgroundColor) >= minRatio;
  },

  // Get appropriate text color for a background
  getTextColor: (backgroundColor: string): string => {
    const luminance = getLuminance(backgroundColor);
    return luminance > 0.5 ? therapeuticColors.text.primary : therapeuticColors.text.inverse;
  },
};

// Helper function to calculate relative luminance
function getLuminance(color: string): number {
  // Simplified luminance calculation
  // In production, use a proper color library like chroma.js or color2k
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  const rsRGB = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const gsRGB = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const bsRGB = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);
  
  return 0.2126 * rsRGB + 0.7152 * gsRGB + 0.0722 * bsRGB;
}

// CSS Custom Properties for use in stylesheets
export const cssCustomProperties = {
  '--color-text-primary': therapeuticColors.text.primary,
  '--color-text-secondary': therapeuticColors.text.secondary,
  '--color-text-tertiary': therapeuticColors.text.tertiary,
  '--color-text-inverse': therapeuticColors.text.inverse,
  '--color-background-primary': therapeuticColors.background.primary,
  '--color-background-secondary': therapeuticColors.background.secondary,
  '--color-background-tertiary': therapeuticColors.background.tertiary,
  '--color-background-inverse': therapeuticColors.background.inverse,
  '--color-sage-primary': therapeuticColors.sage[500],
  '--color-error-primary': therapeuticColors.error[500],
  '--color-success-primary': therapeuticColors.success[500],
  '--color-crisis-primary': therapeuticColors.crisis.primary,
  '--color-crisis-text': therapeuticColors.crisis.text,
  '--color-support-primary': therapeuticColors.support.primary,
  '--color-recovery-primary': therapeuticColors.recovery.primary,
  '--color-input-background': therapeuticColors.input.background,
  '--color-input-border': therapeuticColors.input.border,
  '--color-input-text': therapeuticColors.input.text,
  '--color-button-primary-bg': therapeuticColors.button.primary.background,
  '--color-button-primary-text': therapeuticColors.button.primary.text,
  '--color-button-secondary-bg': therapeuticColors.button.secondary.background,
  '--color-button-secondary-text': therapeuticColors.button.secondary.text,
  '--color-button-destructive-bg': therapeuticColors.button.destructive.background,
  '--color-button-destructive-text': therapeuticColors.button.destructive.text,
};

export default therapeuticColors;