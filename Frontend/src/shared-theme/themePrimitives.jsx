import { createTheme, alpha } from '@mui/material/styles';

const defaultTheme = createTheme();


export const gray = {
  50: 'hsl(220, 35%, 97%)',
  100: 'hsl(220, 30%, 94%)',
  200: 'hsl(220, 20%, 88%)',
  300: 'hsl(220, 20%, 80%)',
  400: 'hsl(220, 20%, 65%)',
  500: 'hsl(220, 20%, 42%)',
  600: 'hsl(220, 20%, 35%)',
  700: 'hsl(220, 20%, 25%)',
  800: 'hsl(220, 30%, 6%)',
  900: 'hsl(220, 35%, 3%)',
};


export const colorSchemes = {
  light: {
    palette: {
      primary: {
        light: "#FDBA74",
        main: "#F97316",
        dark: "#E65E0C",
        contrastText: "#ffffff",
      },

      secondary: {
        main: "#7C2D12",
        contrastText: "#ffffff",
      },

      info: {
        light: "#FFEDD5",
        main: "#F97316",
        dark: "#C2410C",
        contrastText: "#ffffff",
      },

      warning: {
        light: "#FFF4D6",
        main: "#F4B400",
        dark: "#C49000",
        contrastText: "#000",
      },

      error: {
        light: "#FFE5E5",
        main: "#E53935",
        dark: "#B71C1C",
        contrastText: "#ffffff",
      },

      success: {
        light: "#FFEDD5",
        main: "#F97316",
        dark: "#E65E0C",
        contrastText: "#ffffff",
      },

      grey: {
        ...gray,
      },

      background: {
        default: "#fff",
        paper: "#ffffff",
      },

      // 🚨 FIXED (VERY IMPORTANT)
      text: {
        primary: "#000",     
        secondary: "#000",   
      },

      divider: "rgba(25, 34, 43, 0.1)",

      action: {
        hover: "rgba(249, 115, 22, 0.08)",
        selected: "rgba(249, 115, 22, 0.16)",
      },

      baseShadow:
        "0px 4px 16px rgba(25, 34, 43, 0.06), 0px 8px 20px rgba(25, 34, 43, 0.08)",
    },
  },
};

export const typography = {
  fontFamily: 'Inter, sans-serif',
  h1: {
    fontFamily: "Sora, sans-serif",
    fontSize: defaultTheme.typography.pxToRem(30),
    fontWeight: 600,
    lineHeight: 1.2,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: "Sora, sans-serif",
    fontSize: defaultTheme.typography.pxToRem(36),
    fontWeight: 600,
    lineHeight: 1.2,
  },
  h3: {
    fontFamily: "Sora, sans-serif",
    fontSize: defaultTheme.typography.pxToRem(30),
    lineHeight: 1.2,
  },
  h4: {
    fontFamily: "Sora, sans-serif",
    fontSize: defaultTheme.typography.pxToRem(24),
    fontWeight: 600,
    lineHeight: 1.5,
  },
  h5: {
    fontFamily: "Sora, sans-serif",
    fontSize: defaultTheme.typography.pxToRem(20),
    fontWeight: 600,
  },
  h6: {
    fontFamily: "Sora, sans-serif",
    fontSize: defaultTheme.typography.pxToRem(18),
    fontWeight: 600,
  },
  subtitle1: {
    fontSize: defaultTheme.typography.pxToRem(18),
  },
  subtitle2: {
    fontSize: defaultTheme.typography.pxToRem(14),
    fontWeight: 500,
  },
  body1: {
    fontSize: defaultTheme.typography.pxToRem(14),
  },
  body2: {
    fontSize: defaultTheme.typography.pxToRem(14),
    fontWeight: 400,
  },
  caption: {
    fontSize: defaultTheme.typography.pxToRem(12),
    fontWeight: 400,
  },
};

export const buttonSizing = {
  width: '10.3125rem',
  height: '3.125rem',
  borderRadius: '0.1875rem',
  paddingBlock: '0.75rem',
  paddingInline: '1rem',
  borderWidth: '0.125rem',
  fontSize: '1rem',
  focusOutlineWidth: '0.1875rem',
  focusOutlineOffset: '0.125rem',
  iconGap: '0.75rem',
  iconOnlyWidth: '3.125rem',
  iconOnlyPadding: '0rem',
  primaryColor: '#F55814',
  primaryHoverColor: '#F55814',
  primaryHoverTextColor: '#FFFFFF',
};

export const iconSizes = {
  xs: '0.75rem',
  sm: '1rem',
  md: '1.25rem',
  lg: '1.5rem',
  xl: '2rem',
  xxl: '3rem',
  button: '1.875rem',
};

export const shape = {
  borderRadius: 8,
};
