export const theme = {
  colors: {
    primary: '#4CAF50',
    secondary: '#2E7D32',
    background: '#121212',
    surface: '#1E1E1E',
    surfaceHover: '#2A2A2A',
    text: '#FFFFFF',
    textSecondary: '#B0B0B0',
    error: '#CF6679',
    errorHover: '#B85660',
    success: '#4CAF50',
    border: '#333333',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    xxl: '3rem',
  } as const,
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '50%',
  },
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    large: '1440px',
  },
  typography: {
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      mobile: {
        fontSize: '1.8rem',
      },
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      mobile: {
        fontSize: '1.5rem',
      },
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      mobile: {
        fontSize: '1.2rem',
      },
    },
    body: {
      fontSize: '1rem',
      fontWeight: 400,
      mobile: {
        fontSize: '0.95rem',
      },
    },
    small: {
      fontSize: '0.875rem',
      fontWeight: 400,
      mobile: {
        fontSize: '0.8rem',
      },
    },
  },
  touchTarget: {
    minimum: '44px',
    comfortable: '48px',
  },
};

export type ThemeType = typeof theme;
