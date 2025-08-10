// Therapeutic Color Palette for Serenity
// Nature-inspired, calming colors that promote healing and hope

export const colors = {
  // Primary - Sage Green (Growth, Renewal, Balance)
  sage: {
    50: '#f0f7f4',
    100: '#e0efe8',
    200: '#c2dfd1',
    300: '#a3cfba',
    400: '#85bfa3',
    500: '#66af8c', // Primary
    600: '#529670',
    700: '#3d7d54',
    800: '#296438',
    900: '#144b1c',
  },
  
  // Secondary - Sky Blue (Peace, Clarity, Serenity)
  sky: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9', // Primary
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  
  // Accent - Warm Sand (Comfort, Stability, Grounding)
  sand: {
    50: '#fdf8f3',
    100: '#fbf0e4',
    200: '#f7dfc8',
    300: '#f2c9a1',
    400: '#eaad72',
    500: '#e2924f', // Primary
    600: '#d87a3f',
    700: '#b56135',
    800: '#914c31',
    900: '#763e29',
  },
  
  // Hope - Sunrise Orange (Optimism, Energy, New Beginnings)
  sunrise: {
    50: '#fff7ed',
    100: '#ffedd5',
    200: '#fed7aa',
    300: '#fdba74',
    400: '#fb923c',
    500: '#f97316', // Primary
    600: '#ea580c',
    700: '#c2410c',
    800: '#9a3412',
    900: '#7c2d12',
  },
  
  // Calm - Lavender (Tranquility, Healing, Spiritual)
  lavender: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7', // Primary
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },
  
  // Therapeutic Gradients
  gradients: {
    // Morning Sky - Hope and New Beginnings
    morning: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    morningLight: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    
    // Ocean Calm - Peace and Serenity
    ocean: 'linear-gradient(135deg, #0ea5e9 0%, #66af8c 100%)',
    oceanDeep: 'linear-gradient(135deg, #667eea 0%, #0ea5e9 100%)',
    
    // Forest Healing - Growth and Renewal
    forest: 'linear-gradient(135deg, #66af8c 0%, #3d7d54 100%)',
    forestLight: 'linear-gradient(135deg, #a3cfba 0%, #66af8c 100%)',
    
    // Sunset Warmth - Comfort and Rest
    sunset: 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)',
    sunsetSoft: 'linear-gradient(135deg, #ffd89b 0%, #ffd89b 100%)',
    
    // Healing Light - Spiritual and Uplifting
    healing: 'linear-gradient(135deg, #a855f7 0%, #f093fb 100%)',
    healingGlow: 'linear-gradient(135deg, #e9d5ff 0%, #bae6fd 100%)',
  },
  
  // Semantic Colors for Emotions
  emotions: {
    // Positive States
    hopeful: '#66af8c',
    peaceful: '#0ea5e9',
    grounded: '#e2924f',
    energized: '#f97316',
    serene: '#a855f7',
    
    // Challenging States (softer representations)
    anxious: '#fdba74', // Soft orange instead of harsh red
    sad: '#7dd3fc', // Light blue instead of dark
    overwhelmed: '#c084fc', // Soft purple instead of intense
    tired: '#f2c9a1', // Warm sand instead of gray
    uncertain: '#bae6fd', // Sky blue instead of murky
  },
  
  // System Colors (Healthcare Appropriate)
  system: {
    success: '#66af8c', // Sage green for achievements
    info: '#0ea5e9', // Sky blue for information
    warning: '#f97316', // Warm orange for gentle alerts
    error: '#fb923c', // Soft coral instead of harsh red
    neutral: '#f2c9a1', // Sand for neutral states
  },
  
  // Dark Mode Support
  dark: {
    // Dark backgrounds with warm undertones
    background: {
      primary: '#1a1f2e',
      secondary: '#232938',
      tertiary: '#2d3548',
      elevated: '#364052',
    },
    // Adjusted colors for dark mode
    sage: '#85bfa3',
    sky: '#7dd3fc',
    sand: '#f2c9a1',
    sunrise: '#fdba74',
    lavender: '#d8b4fe',
  },
};

// CSS Variable Mapping for Tailwind
export const cssVariables = {
  light: {
    '--color-sage': colors.sage[500],
    '--color-sky': colors.sky[500],
    '--color-sand': colors.sand[500],
    '--color-sunrise': colors.sunrise[500],
    '--color-lavender': colors.lavender[500],
    '--color-hope': colors.emotions.hopeful,
    '--color-peace': colors.emotions.peaceful,
    '--gradient-morning': colors.gradients.morning,
    '--gradient-ocean': colors.gradients.ocean,
    '--gradient-forest': colors.gradients.forest,
    '--gradient-sunset': colors.gradients.sunset,
    '--gradient-healing': colors.gradients.healing,
  },
  dark: {
    '--color-sage': colors.dark.sage,
    '--color-sky': colors.dark.sky,
    '--color-sand': colors.dark.sand,
    '--color-sunrise': colors.dark.sunrise,
    '--color-lavender': colors.dark.lavender,
    '--color-hope': colors.dark.sage,
    '--color-peace': colors.dark.sky,
    '--gradient-morning': colors.gradients.morningLight,
    '--gradient-ocean': colors.gradients.oceanDeep,
    '--gradient-forest': colors.gradients.forestLight,
    '--gradient-sunset': colors.gradients.sunsetSoft,
    '--gradient-healing': colors.gradients.healingGlow,
  },
};

// Therapeutic Color Combinations
export const colorCombinations = {
  // Calming combinations
  serenity: [colors.sky[300], colors.sage[300], colors.lavender[200]],
  tranquil: [colors.sky[200], colors.sky[300], colors.sky[400]],
  
  // Energizing combinations
  renewal: [colors.sage[300], colors.sunrise[300], colors.sand[300]],
  vitality: [colors.sunrise[300], colors.sunrise[400], colors.sand[300]],
  
  // Grounding combinations
  stability: [colors.sand[300], colors.sage[400], colors.sand[400]],
  comfort: [colors.sand[200], colors.lavender[200], colors.sage[200]],
  
  // Spiritual combinations
  mindful: [colors.lavender[300], colors.sky[300], colors.lavender[400]],
  healing: [colors.sage[300], colors.lavender[300], colors.sky[300]],
};

export default colors;