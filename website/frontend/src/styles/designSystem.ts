// Design System based on ELS website color scheme
export const designSystem = {
  // Color Palette (extracted from ELS website)
  colors: {
    // Primary Colors (Navy/Blue)
    primary: {
      main: '#1976d2',      // Main navigation blue
      dark: '#0d47a1',      // Darker navy blue
      light: '#42a5f5',     // Light blue accent
      text: '#ffffff',      // White text on primary
    },
    
    // Secondary Colors (Orange/Amber)
    secondary: {
      main: '#ff9800',      // Header orange
      dark: '#f57c00',      // Darker orange
      light: '#ffca28',     // Light orange
      text: '#000000',      // Dark text on secondary
    },
    
    // Neutral Colors
    neutral: {
      white: '#ffffff',
      black: '#000000',
      grey50: '#fafafa',
      grey100: '#f5f5f5',
      grey200: '#eeeeee',
      grey300: '#e0e0e0',
      grey400: '#bdbdbd',
      grey500: '#9e9e9e',
      grey600: '#757575',
      grey700: '#616161',
      grey800: '#424242',
      grey900: '#212121',
    },
    
    // Status Colors
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',
    
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
  },
  
  // Breakpoints for responsive design
  breakpoints: {
    xs: '0px',        // Extra small devices (phones)
    sm: '600px',      // Small devices (tablets)
    md: '900px',      // Medium devices (small laptops)
    lg: '1200px',     // Large devices (desktops)
    xl: '1536px',     // Extra large devices
  },
  
  // Typography Scale
  typography: {
    fontFamily: '"Roboto", "Helvetica Neue", Arial, sans-serif',
    
    // Font Sizes (responsive)
    fontSize: {
      xs: '0.75rem',    // 12px
      sm: '0.875rem',   // 14px  
      base: '1rem',     // 16px
      lg: '1.125rem',   // 18px
      xl: '1.25rem',    // 20px
      '2xl': '1.5rem',  // 24px
      '3xl': '1.875rem', // 30px
      '4xl': '2.25rem', // 36px
      '5xl': '3rem',    // 48px
    },
    
    // Font Weights
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    
    // Line Heights
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  
  // Spacing Scale (8px base unit)
  spacing: {
    0: '0px',
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    5: '20px',
    6: '24px',
    8: '32px',
    10: '40px',
    12: '48px',
    16: '64px',
    20: '80px',
    24: '96px',
    32: '128px',
  },
  
  // Border Radius
  borderRadius: {
    none: '0px',
    sm: '4px',
    base: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  
  // Shadows
  shadows: {
    sm: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
    base: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
    md: '0 10px 20px rgba(0, 0, 0, 0.19), 0 6px 6px rgba(0, 0, 0, 0.23)',
    lg: '0 14px 28px rgba(0, 0, 0, 0.25), 0 10px 10px rgba(0, 0, 0, 0.22)',
    xl: '0 19px 38px rgba(0, 0, 0, 0.30), 0 15px 12px rgba(0, 0, 0, 0.22)',
  },
  
  // Z-Index Scale
  zIndex: {
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modal: 1040,
    popover: 1050,
    tooltip: 1060,
  },
  
  // Animation/Transition
  transition: {
    fast: '150ms ease-in-out',
    base: '250ms ease-in-out',
    slow: '350ms ease-in-out',
  },
} as const;

// CSS Media Queries
export const mediaQueries = {
  sm: `@media (min-width: ${designSystem.breakpoints.sm})`,
  md: `@media (min-width: ${designSystem.breakpoints.md})`,
  lg: `@media (min-width: ${designSystem.breakpoints.lg})`,
  xl: `@media (min-width: ${designSystem.breakpoints.xl})`,
  
  // Max width queries
  maxSm: `@media (max-width: ${designSystem.breakpoints.sm})`,
  maxMd: `@media (max-width: ${designSystem.breakpoints.md})`,
  maxLg: `@media (max-width: ${designSystem.breakpoints.lg})`,
  
  // Touch devices
  touch: '@media (hover: none) and (pointer: coarse)',
  
  // Reduced motion
  reducedMotion: '@media (prefers-reduced-motion: reduce)',
  
  // Dark mode
  dark: '@media (prefers-color-scheme: dark)',
};

// Utility functions for responsive design
export const responsive = {
  // Convert px to rem
  pxToRem: (px: number): string => `${px / 16}rem`,
  
  // Create responsive CSS object
  responsive: (values: { xs?: string; sm?: string; md?: string; lg?: string; xl?: string }) => {
    const styles: Record<string, string> = {};
    
    if (values.xs) styles.default = values.xs;
    if (values.sm) styles[mediaQueries.sm] = values.sm;
    if (values.md) styles[mediaQueries.md] = values.md;
    if (values.lg) styles[mediaQueries.lg] = values.lg;
    if (values.xl) styles[mediaQueries.xl] = values.xl;
    
    return styles;
  },
  
  // Touch-friendly sizing
  touchTarget: {
    minHeight: '44px',
    minWidth: '44px',
    [mediaQueries.maxSm]: {
      minHeight: '48px',
      minWidth: '48px',
    },
  },
};

// Component design tokens
export const components = {
  // Button variants
  button: {
    primary: {
      backgroundColor: designSystem.colors.primary.main,
      color: designSystem.colors.primary.text,
      borderRadius: designSystem.borderRadius.base,
      padding: `${designSystem.spacing[3]} ${designSystem.spacing[6]}`,
      fontSize: designSystem.typography.fontSize.sm,
      fontWeight: designSystem.typography.fontWeight.semibold,
      transition: designSystem.transition.base,
      border: 'none',
      cursor: 'pointer',
      ...responsive.touchTarget,
      
      '&:hover': {
        backgroundColor: designSystem.colors.primary.dark,
        boxShadow: designSystem.shadows.base,
      },
      
      '&:focus': {
        outline: `2px solid ${designSystem.colors.primary.light}`,
        outlineOffset: '2px',
      },
    },
    
    secondary: {
      backgroundColor: designSystem.colors.secondary.main,
      color: designSystem.colors.secondary.text,
      borderRadius: designSystem.borderRadius.base,
      padding: `${designSystem.spacing[3]} ${designSystem.spacing[6]}`,
      fontSize: designSystem.typography.fontSize.sm,
      fontWeight: designSystem.typography.fontWeight.semibold,
      transition: designSystem.transition.base,
      border: 'none',
      cursor: 'pointer',
      ...responsive.touchTarget,
      
      '&:hover': {
        backgroundColor: designSystem.colors.secondary.dark,
        boxShadow: designSystem.shadows.base,
      },
    },
    
    outlined: {
      backgroundColor: 'transparent',
      color: designSystem.colors.primary.main,
      border: `2px solid ${designSystem.colors.primary.main}`,
      borderRadius: designSystem.borderRadius.base,
      padding: `${designSystem.spacing[3]} ${designSystem.spacing[6]}`,
      fontSize: designSystem.typography.fontSize.sm,
      fontWeight: designSystem.typography.fontWeight.semibold,
      transition: designSystem.transition.base,
      cursor: 'pointer',
      ...responsive.touchTarget,
      
      '&:hover': {
        backgroundColor: designSystem.colors.primary.main,
        color: designSystem.colors.primary.text,
      },
    },
  },
  
  // Card styles
  card: {
    backgroundColor: designSystem.colors.background.paper,
    borderRadius: designSystem.borderRadius.md,
    boxShadow: designSystem.shadows.sm,
    padding: designSystem.spacing[6],
    transition: designSystem.transition.base,
    
    '&:hover': {
      boxShadow: designSystem.shadows.base,
    },
  },
  
  // Input styles
  input: {
    backgroundColor: designSystem.colors.background.paper,
    border: `1px solid ${designSystem.colors.neutral.grey300}`,
    borderRadius: designSystem.borderRadius.base,
    padding: `${designSystem.spacing[3]} ${designSystem.spacing[4]}`,
    fontSize: designSystem.typography.fontSize.base,
    color: designSystem.colors.text.primary,
    transition: designSystem.transition.fast,
    ...responsive.touchTarget,
    
    '&:focus': {
      outline: 'none',
      borderColor: designSystem.colors.primary.main,
      borderWidth: '2px',
      boxShadow: `0 0 0 1px ${designSystem.colors.primary.light}`,
    },
    
    '&::placeholder': {
      color: designSystem.colors.text.hint,
    },
  },
};

// Export everything as default
export default designSystem; 