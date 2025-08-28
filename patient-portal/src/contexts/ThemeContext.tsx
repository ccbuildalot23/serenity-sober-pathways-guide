import React, {createContext, useContext, useReducer, useEffect, ReactNode} from 'react';
import {Appearance, ColorSchemeName} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeColors {
  primary: string;
  primaryVariant: string;
  secondary: string;
  secondaryVariant: string;
  background: string;
  surface: string;
  error: string;
  warning: string;
  success: string;
  accent: string;
  outline: string;
  onPrimary: string;
  onSecondary: string;
  onBackground: string;
  onSurface: string;
  onError: string;
  text: {
    primary: string;
    secondary: string;
    disabled: string;
  };
  border: string;
}

interface ThemeState {
  mode: 'light' | 'dark' | 'system';
  colors: ThemeColors;
  isDark: boolean;
}

type ThemeAction =
  | {type: 'SET_THEME_MODE'; payload: 'light' | 'dark' | 'system'}
  | {type: 'SET_SYSTEM_THEME'; payload: boolean}
  | {type: 'UPDATE_COLORS'; payload: Partial<ThemeColors>};

const lightColors: ThemeColors = {
  primary: '#1976D2',
  primaryVariant: '#1565C0',
  secondary: '#03DAC6',
  secondaryVariant: '#018786',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  error: '#B00020',
  warning: '#FF9800',
  success: '#4CAF50',
  accent: '#FF5722',
  outline: '#E0E0E0',
  onPrimary: '#FFFFFF',
  onSecondary: '#000000',
  onBackground: '#000000',
  onSurface: '#000000',
  onError: '#FFFFFF',
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#BDBDBD',
  },
  border: '#E0E0E0',
};

const darkColors: ThemeColors = {
  primary: '#BB86FC',
  primaryVariant: '#3700B3',
  secondary: '#03DAC6',
  secondaryVariant: '#03DAC6',
  background: '#121212',
  surface: '#1E1E1E',
  error: '#CF6679',
  warning: '#FF9800',
  success: '#4CAF50',
  accent: '#FF5722',
  outline: '#3E3E3E',
  onPrimary: '#000000',
  onSecondary: '#000000',
  onBackground: '#FFFFFF',
  onSurface: '#FFFFFF',
  onError: '#000000',
  text: {
    primary: '#FFFFFF',
    secondary: '#AAAAAA',
    disabled: '#666666',
  },
  border: '#3E3E3E',
};

const initialState: ThemeState = {
  mode: 'system',
  colors: lightColors,
  isDark: false,
};

const themeReducer = (state: ThemeState, action: ThemeAction): ThemeState => {
  switch (action.type) {
    case 'SET_THEME_MODE':
      const systemIsDark = Appearance.getColorScheme() === 'dark';
      const newIsDark = action.payload === 'dark' || 
        (action.payload === 'system' && systemIsDark);
      
      return {
        ...state,
        mode: action.payload,
        isDark: newIsDark,
        colors: newIsDark ? darkColors : lightColors,
      };
    case 'SET_SYSTEM_THEME':
      if (state.mode === 'system') {
        return {
          ...state,
          isDark: action.payload,
          colors: action.payload ? darkColors : lightColors,
        };
      }
      return state;
    case 'UPDATE_COLORS':
      return {
        ...state,
        colors: {...state.colors, ...action.payload},
      };
    default:
      return state;
  }
};

interface ThemeContextType {
  ...ThemeState;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  updateColors: (colors: Partial<ThemeColors>) => void;
  resetColors: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({children}) => {
  const [state, dispatch] = useReducer(themeReducer, initialState);

  useEffect(() => {
    loadThemePreference();
    
    // Listen to system theme changes
    const subscription = Appearance.addChangeListener(({colorScheme}) => {
      dispatch({type: 'SET_SYSTEM_THEME', payload: colorScheme === 'dark'});
    });

    return () => subscription?.remove();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme_mode');
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        dispatch({type: 'SET_THEME_MODE', payload: savedTheme as 'light' | 'dark' | 'system'});
      } else {
        // Default to system theme on first load
        const systemIsDark = Appearance.getColorScheme() === 'dark';
        dispatch({type: 'SET_SYSTEM_THEME', payload: systemIsDark});
      }

      // Load custom colors if any
      const customColors = await AsyncStorage.getItem('custom_theme_colors');
      if (customColors) {
        const parsedColors = JSON.parse(customColors);
        dispatch({type: 'UPDATE_COLORS', payload: parsedColors});
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const setThemeMode = async (mode: 'light' | 'dark' | 'system') => {
    try {
      await AsyncStorage.setItem('theme_mode', mode);
      dispatch({type: 'SET_THEME_MODE', payload: mode});
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const updateColors = async (colors: Partial<ThemeColors>) => {
    try {
      const customColors = {...colors};
      await AsyncStorage.setItem('custom_theme_colors', JSON.stringify(customColors));
      dispatch({type: 'UPDATE_COLORS', payload: colors});
    } catch (error) {
      console.error('Failed to save custom colors:', error);
    }
  };

  const resetColors = async () => {
    try {
      await AsyncStorage.removeItem('custom_theme_colors');
      dispatch({
        type: 'UPDATE_COLORS', 
        payload: state.isDark ? darkColors : lightColors
      });
    } catch (error) {
      console.error('Failed to reset colors:', error);
    }
  };

  const contextValue: ThemeContextType = {
    ...state,
    setThemeMode,
    updateColors,
    resetColors,
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

// Theme utility functions
export const getThemeColors = (isDark: boolean): ThemeColors => {
  return isDark ? darkColors : lightColors;
};

export const createThemeVariant = (baseColors: ThemeColors, overrides: Partial<ThemeColors>): ThemeColors => {
  return {...baseColors, ...overrides};
};

// Paper theme configuration
export const theme = {
  colors: lightColors,
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
  },
};