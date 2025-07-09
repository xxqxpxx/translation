// LinguaLink Color Palette
// Based on Exchange Language Services (ELS) website design

export const colors = {
  // Primary Colors (Blue/Navy from ELS navigation)
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    200: '#90caf9',
    300: '#64b5f6',
    400: '#42a5f5',
    500: '#1976d2', // Main blue from navigation
    600: '#1565c0',
    700: '#0d47a1', // Darker navy blue
    800: '#0d47a1',
    900: '#0a3d91',
    main: '#1976d2',
    dark: '#0d47a1',
    light: '#42a5f5',
    contrastText: '#ffffff',
  },

  // Secondary Colors (Orange/Amber from headers)
  secondary: {
    50: '#fff8e1',
    100: '#ffecb3',
    200: '#ffe082',
    300: '#ffd54f',
    400: '#ffca28',
    500: '#ff9800', // Main orange from ELS contact header
    600: '#fb8c00',
    700: '#f57c00',
    800: '#ef6c00',
    900: '#e65100',
    main: '#ff9800',
    dark: '#f57c00',
    light: '#ffca28',
    contrastText: '#000000',
  },

  // Neutral Colors
  grey: {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#eeeeee',
    300: '#e0e0e0',
    400: '#bdbdbd',
    500: '#9e9e9e',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  },

  // Status Colors
  success: {
    main: '#4caf50',
    light: '#81c784',
    dark: '#388e3c',
    contrastText: '#ffffff',
  },

  warning: {
    main: '#ff9800',
    light: '#ffb74d',
    dark: '#f57c00',
    contrastText: '#000000',
  },

  error: {
    main: '#f44336',
    light: '#e57373',
    dark: '#d32f2f',
    contrastText: '#ffffff',
  },

  info: {
    main: '#2196f3',
    light: '#64b5f6',
    dark: '#1976d2',
    contrastText: '#ffffff',
  },

  // Background Colors
  background: {
    default: '#ffffff',
    paper: '#ffffff',
    grey: '#f8f9fa',
    dark: '#f5f5f5',
  },

  // Text Colors
  text: {
    primary: '#212121',
    secondary: '#757575',
    disabled: '#bdbdbd',
    hint: '#9e9e9e',
  },

  // Brand Colors (ELS specific)
  brand: {
    navy: '#0d47a1',          // ELS navigation dark blue
    blue: '#1976d2',          // ELS main blue
    orange: '#ff9800',        // ELS header orange
    lightBlue: '#42a5f5',     // Light accent blue
    darkGrey: '#424242',      // Dark text
    lightGrey: '#f5f5f5',     // Light backgrounds
  },
} as const;

// CSS Variable mapping for easy use
export const cssVariables = {
  // Primary
  '--color-primary': colors.primary.main,
  '--color-primary-dark': colors.primary.dark,
  '--color-primary-light': colors.primary.light,
  '--color-primary-text': colors.primary.contrastText,
  
  // Secondary
  '--color-secondary': colors.secondary.main,
  '--color-secondary-dark': colors.secondary.dark,
  '--color-secondary-light': colors.secondary.light,
  '--color-secondary-text': colors.secondary.contrastText,
  
  // Neutral
  '--color-white': '#ffffff',
  '--color-black': '#000000',
  '--color-grey-50': colors.grey[50],
  '--color-grey-100': colors.grey[100],
  '--color-grey-200': colors.grey[200],
  '--color-grey-300': colors.grey[300],
  '--color-grey-400': colors.grey[400],
  '--color-grey-500': colors.grey[500],
  '--color-grey-600': colors.grey[600],
  '--color-grey-700': colors.grey[700],
  '--color-grey-800': colors.grey[800],
  '--color-grey-900': colors.grey[900],
  
  // Status
  '--color-success': colors.success.main,
  '--color-warning': colors.warning.main,
  '--color-error': colors.error.main,
  '--color-info': colors.info.main,
  
  // Background
  '--color-bg-default': colors.background.default,
  '--color-bg-paper': colors.background.paper,
  '--color-bg-grey': colors.background.grey,
  '--color-bg-dark': colors.background.dark,
  
  // Text
  '--color-text-primary': colors.text.primary,
  '--color-text-secondary': colors.text.secondary,
  '--color-text-disabled': colors.text.disabled,
  '--color-text-hint': colors.text.hint,
} as const;

// Helper function to apply CSS variables to document
export function applyCSSVariables() {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    Object.entries(cssVariables).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }
}

export type ColorPalette = typeof colors;
export default colors; 