/**
 * Therapeutic Design System for Serenity Sober Pathways Guide
 * 
 * Design Principles:
 * - Natural: Calming, organic feel with nature-inspired colors
 * - Certain: Consistent, predictable interactions
 * - Meaningful: Purposeful design that supports recovery
 * - Growing: Adapts to user progress and needs
 */

export const therapeuticColors = {
  // Primary Healing Palette
  sage: {
    50: '#f6f7f6',
    100: '#e3e7e3',
    200: '#c7d0c7',
    300: '#a3b3a3',
    400: '#7a8f7a',
    500: '#5a6f5a', // Primary sage
    600: '#475a47',
    700: '#3a4a3a',
    800: '#2f3b2f',
    900: '#283128',
  },
  emerald: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981', // Primary emerald
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  turquoise: {
    50: '#f0fdfa',
    100: '#ccfbf1',
    200: '#99f6e4',
    300: '#5eead4',
    400: '#2dd4bf',
    500: '#14b8a6', // Primary turquoise
    600: '#0d9488',
    700: '#0f766e',
    800: '#115e59',
    900: '#134e4a',
  },
  sky: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Primary sky blue
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  // Neutral calming palette
  stone: {
    50: '#fafaf9',
    100: '#f5f5f4',
    200: '#e7e5e4',
    300: '#d6d3d1',
    400: '#a8a29e',
    500: '#78716c',
    600: '#57534e',
    700: '#44403c',
    800: '#292524',
    900: '#1c1917',
  },
  // Accent colors for emotional states
  healing: {
    hope: '#10b981', // emerald-500
    peace: '#14b8a6', // turquoise-500
    strength: '#0ea5e9', // sky-500
    wisdom: '#5a6f5a', // sage-500
    comfort: '#f6f7f6', // sage-50
  }
};

export const therapeuticTypography = {
  fonts: {
    sans: ['Inter', 'system-ui', 'sans-serif'],
    serif: ['Merriweather', 'Georgia', 'serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
  },
  fontWeights: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
  lineHeights: {
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },
};

export const therapeuticSpacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
  '4xl': '6rem',
};

export const therapeuticShadows = {
  soft: '0 2px 8px rgba(0, 0, 0, 0.06)',
  gentle: '0 4px 12px rgba(0, 0, 0, 0.08)',
  calm: '0 8px 24px rgba(0, 0, 0, 0.12)',
  serene: '0 16px 48px rgba(0, 0, 0, 0.16)',
  healing: '0 0 0 1px rgba(16, 185, 129, 0.1), 0 4px 12px rgba(16, 185, 129, 0.1)',
};

export const therapeuticBorderRadius = {
  none: '0',
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
};

export const therapeuticTransitions = {
  gentle: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
  smooth: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  calm: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  healing: 'all 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
};

export const therapeuticGradients = {
  primary: 'linear-gradient(135deg, #10b981 0%, #14b8a6 50%, #0ea5e9 100%)',
  secondary: 'linear-gradient(135deg, #5a6f5a 0%, #10b981 100%)',
  calming: 'linear-gradient(135deg, #f6f7f6 0%, #e3e7e3 100%)',
  healing: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
  serene: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
};

export const therapeuticComponents = {
  button: {
    primary: {
      base: 'bg-gradient-to-r from-emerald-500 to-turquoise-500 hover:from-emerald-600 hover:to-turquoise-600 text-white font-medium px-6 py-3 rounded-xl shadow-gentle transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2',
      disabled: 'bg-stone-300 text-stone-500 cursor-not-allowed transform-none shadow-none',
    },
    secondary: {
      base: 'bg-white border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 font-medium px-6 py-3 rounded-xl shadow-soft transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2',
    },
    ghost: {
      base: 'text-emerald-700 hover:bg-emerald-50 font-medium px-4 py-2 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-300',
    },
  },
  card: {
    base: 'bg-white rounded-2xl shadow-soft border border-stone-100 overflow-hidden transition-all duration-300 hover:shadow-gentle',
    elevated: 'bg-white rounded-2xl shadow-calm border border-stone-100 overflow-hidden transition-all duration-300 hover:shadow-seren',
    healing: 'bg-gradient-to-br from-emerald-50 to-turquoise-50 rounded-2xl shadow-healing border border-emerald-100 overflow-hidden',
  },
  input: {
    base: 'w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 transition-all duration-200 bg-white',
    error: 'w-full px-4 py-3 border border-red-300 rounded-xl focus:ring-2 focus:ring-red-300 focus:border-red-300 transition-all duration-200 bg-red-50',
  },
  modal: {
    overlay: 'fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 z-50',
    content: 'bg-white rounded-2xl shadow-seren max-w-md w-full p-6 transform transition-all duration-300',
  },
};

export const therapeuticAnimations = {
  fadeIn: 'animate-fade-in',
  slideUp: 'animate-slide-up',
  scaleIn: 'animate-scale-in',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
};

// CSS Custom Properties for easy theming
export const therapeuticCSSVariables = `
  :root {
    /* Primary Colors */
    --color-sage-50: ${therapeuticColors.sage[50]};
    --color-sage-100: ${therapeuticColors.sage[100]};
    --color-sage-500: ${therapeuticColors.sage[500]};
    --color-sage-900: ${therapeuticColors.sage[900]};
    
    --color-emerald-50: ${therapeuticColors.emerald[50]};
    --color-emerald-100: ${therapeuticColors.emerald[100]};
    --color-emerald-500: ${therapeuticColors.emerald[500]};
    --color-emerald-900: ${therapeuticColors.emerald[900]};
    
    --color-turquoise-50: ${therapeuticColors.turquoise[50]};
    --color-turquoise-100: ${therapeuticColors.turquoise[100]};
    --color-turquoise-500: ${therapeuticColors.turquoise[500]};
    --color-turquoise-900: ${therapeuticColors.turquoise[900]};
    
    --color-sky-50: ${therapeuticColors.sky[50]};
    --color-sky-100: ${therapeuticColors.sky[100]};
    --color-sky-500: ${therapeuticColors.sky[500]};
    --color-sky-900: ${therapeuticColors.sky[900]};
    
    /* Healing Colors */
    --color-hope: ${therapeuticColors.healing.hope};
    --color-peace: ${therapeuticColors.healing.peace};
    --color-strength: ${therapeuticColors.healing.strength};
    --color-wisdom: ${therapeuticColors.healing.wisdom};
    --color-comfort: ${therapeuticColors.healing.comfort};
    
    /* Gradients */
    --gradient-primary: ${therapeuticGradients.primary};
    --gradient-secondary: ${therapeuticGradients.secondary};
    --gradient-calm: ${therapeuticGradients.calming};
    --gradient-healing: ${therapeuticGradients.healing};
    --gradient-seren: ${therapeuticGradients.serene};
    
    /* Shadows */
    --shadow-soft: ${therapeuticShadows.soft};
    --shadow-gentle: ${therapeuticShadows.gentle};
    --shadow-calm: ${therapeuticShadows.calm};
    --shadow-seren: ${therapeuticShadows.serene};
    --shadow-healing: ${therapeuticShadows.healing};
    
    /* Transitions */
    --transition-gentle: ${therapeuticTransitions.gentle};
    --transition-smooth: ${therapeuticTransitions.smooth};
    --transition-calm: ${therapeuticTransitions.calm};
    --transition-healing: ${therapeuticTransitions.healing};
  }
`;

export default {
  colors: therapeuticColors,
  typography: therapeuticTypography,
  spacing: therapeuticSpacing,
  shadows: therapeuticShadows,
  borderRadius: therapeuticBorderRadius,
  transitions: therapeuticTransitions,
  gradients: therapeuticGradients,
  components: therapeuticComponents,
  animations: therapeuticAnimations,
  cssVariables: therapeuticCSSVariables,
};
