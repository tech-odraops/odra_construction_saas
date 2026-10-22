import { createTheme } from "@mui/material/styles";

const defaultTheme = createTheme();

export const gray = {
  50: "hsl(220, 35%, 97%)",
  100: "hsl(220, 30%, 94%)",
  200: "hsl(220, 20%, 88%)",
  300: "hsl(220, 20%, 80%)",
  400: "hsl(220, 20%, 65%)",
  500: "hsl(220, 20%, 42%)",
  600: "hsl(220, 20%, 35%)",
  700: "hsl(220, 20%, 25%)",
  800: "hsl(220, 30%, 6%)",
  900: "hsl(220, 35%, 3%)",
};

export const fontWeight = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  bolder: 800
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


export const fontSizing = {
  fontFamily: "Inter, sans-serif",
  headingFontFamily: "Sora, sans-serif",
  h1FontWeight: 600,
  h2FontWeight: 600,
  h4FontWeight: 600,
  h5FontWeight: 600,
  h6FontWeight: 600,
  bodyFontWeight: 400,
  buttonFontWeight: 600,
  subtitle2FontWeight: 500,
  captionFontWeight: 400,
  inputMessageFontWeight: 600,
  h1LetterSpacing: -0.5,
  h1LineHeight: 1.2,
  h2LineHeight: 1.2,
  h3LineHeight: 1.2,
  h4LineHeight: 1.5,
  h1FontSize: defaultTheme.typography.pxToRem(30),
  h2FontSize: defaultTheme.typography.pxToRem(36),
  h3FontSize: defaultTheme.typography.pxToRem(30),
  h4FontSize: defaultTheme.typography.pxToRem(24),
  h5FontSize: defaultTheme.typography.pxToRem(20),
  h6FontSize: defaultTheme.typography.pxToRem(18),
  subtitle1FontSize: defaultTheme.typography.pxToRem(18),
  subtitle2FontSize: defaultTheme.typography.pxToRem(14),
  bodyFontSize: defaultTheme.typography.pxToRem(14),
  captionFontSize: defaultTheme.typography.pxToRem(12),
  buttonFontSize: "1rem",
  buttonLineHeight: "100%",
  buttonLetterSpacing: "0",
  inputMessageFontSize: "13px",
  inputMessageLineHeight: "100%",
  inputMessageLetterSpacing: "0",
  controlFontSize: "1rem",
  controlLineHeight: "1.25",
};

export const typography = {
  fontFamily: fontSizing.fontFamily,
  h1: {
    fontFamily: fontSizing.headingFontFamily,
    fontSize: fontSizing.h1FontSize,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSizing.h1LineHeight,
    letterSpacing: fontSizing.h1LetterSpacing,
  },
  h2: {
    fontFamily: fontSizing.headingFontFamily,
    fontSize: fontSizing.h2FontSize,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSizing.h2LineHeight,
  },
  h3: {
    fontFamily: fontSizing.headingFontFamily,
    fontSize: fontSizing.h3FontSize,
    lineHeight: fontSizing.h3LineHeight,
    fontWeight: fontWeight.semibold,
  },
  h4: {
    fontFamily: fontSizing.headingFontFamily,
    fontSize: fontSizing.h4FontSize,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSizing.h4LineHeight,
  },
  h5: {
    fontFamily: fontSizing.headingFontFamily,
    fontSize: fontSizing.h5FontSize,
    fontWeight: fontWeight.semibold,
  },
  h6: {
    fontFamily: fontSizing.headingFontFamily,
    fontSize: fontSizing.h6FontSize,
    fontWeight: fontWeight.semibold,
  },
  subtitle1: { fontSize: fontSizing.subtitle1FontSize },
  subtitle2: {
    fontSize: fontSizing.subtitle2FontSize,
    fontWeight: fontSizing.subtitle2FontWeight,
  },
  body1: { fontSize: fontSizing.bodyFontSize },
  body2: {
    fontSize: fontSizing.bodyFontSize,
    fontWeight: fontSizing.bodyFontWeight,
  },
  caption: {
    fontSize: fontSizing.captionFontSize,
    fontWeight: fontSizing.captionFontWeight,
  },
};

export const sizing = {
  buttonWidth: "10.3125rem",
  buttonHeight: "3.125rem",
  buttonBorderRadius: "0.1875rem",
  buttonPaddingBlock: "0.75rem",
  buttonPaddingInline: "1rem",
  buttonBorderWidth: "0.125rem",
  buttonFocusOutlineWidth: "0.1875rem",
  buttonFocusOutlineOffset: "0.125rem",
  buttonIconGap: "0.75rem",
  buttonIconOnlyWidth: "3.125rem",
  buttonIconOnlyPadding: "0rem",
  iconXs: "0.75rem",
  iconSm: "1rem",
  iconMd: "1.25rem",
  iconLg: "1.5rem",
  iconXl: "2rem",
  iconXxl: "3rem",
  iconButton: "1.875rem",
  inputWidth: "13.5625rem",
  inputHeight: "2.9375rem",
  inputPaddingBlock: "0.625rem",
  inputPaddingInline: "0.75rem",
  inputBorderWidth: "0.125rem",
  inputBorderRadius: "0.25rem",
  inputMessageMarginTop: "0.375rem",
  radioGap: "0.875rem",
  radioPadding: "0.25rem",
  radioControlSize: "2.25rem",
  radioBorderWidth: "0.15625rem",
  radioBorderRadius: "50%",
  radioDotSize: "1.125rem",
  controlFocusOutlineWidth: "0.1875rem",
  controlFocusOutlineOffset: "0.125rem",
  toggleGap: "1.25rem",
  toggleTrackWidth: "3rem",
  toggleTrackHeight: "1.75rem",
  toggleTrackPadding: "0.1875rem",
  toggleTrackBorderRadius: "999px",
  toggleThumbSize: "1.25rem",
  toggleThumbOffset: "1.25rem",
  toggleThumbBorderRadius: "50%",
};

export const colors = {
  buttonPrimary: "#F55814",
  buttonHover: "#F55814",
  buttonHoverText: "#FFFFFF",
  iconPrimary: "#F55814",
  iconInverted: "#FFFFFF",
  iconDisabled: "#ACACAC",
  inputBorder: "#BFBFBF",
  inputPlaceholder: "#666666",
  inputError: "#DF361F",
  inputSuccess: "#20A21A",
  inputDisabledBackground: "rgba(237, 237, 237, 0.97)",
  inputEyeIconColor: "#6d7378",
  radioBorder: "#b3b3b3",
  disabledBorder: "#E3E3E3",
  disabledText: "#aaa",
  toggleTrack: "#E3E3E3",
  toggleDisabledText: "#c7c7c7",
};

export const motion = {
  fastDuration: "140ms",
  standardDuration: "180ms",
  spinDuration: "2.8s",
  reducedMotionDuration: "0.01ms",
  easing: "ease",
  linearEasing: "linear",
};

const motionStyles = {
  "--motion-fast-duration": motion.fastDuration,
  "--motion-standard-duration": motion.standardDuration,
  "--motion-spin-duration": motion.spinDuration,
  "--motion-reduced-duration": motion.reducedMotionDuration,
  "--motion-easing": motion.easing,
  "--motion-linear-easing": motion.linearEasing,
};

export const effects = {
  disabledOpacity: 0.55,
  hiddenOpacity: 0,
  visibleOpacity: 1,
  buttonIconInitialScale: 0.7,
  radioDotInitialScale: 0.5,
  activeScale: 1,
  toggleThumbInitialOffset: "0rem",
};

const effectStyles = {
  "--effect-disabled-opacity": effects.disabledOpacity,
  "--effect-hidden-opacity": effects.hiddenOpacity,
  "--effect-visible-opacity": effects.visibleOpacity,
  "--effect-button-icon-initial-scale": effects.buttonIconInitialScale,
  "--effect-radio-dot-initial-scale": effects.radioDotInitialScale,
  "--effect-active-scale": effects.activeScale,
  "--effect-toggle-thumb-initial-offset": effects.toggleThumbInitialOffset,
};

export const componentStyles = {
  button: {
    ...motionStyles,
    ...effectStyles,
    fontFamily: fontSizing.fontFamily,
    "--button-width": sizing.buttonWidth,
    "--button-height": sizing.buttonHeight,
    "--button-border-radius": sizing.buttonBorderRadius,
    "--button-padding-block": sizing.buttonPaddingBlock,
    "--button-padding-inline": sizing.buttonPaddingInline,
    "--button-border-width": sizing.buttonBorderWidth,
    "--button-font-size": fontSizing.buttonFontSize,
    "--button-font-weight": fontSizing.buttonFontWeight,
    "--button-line-height": fontSizing.buttonLineHeight,
    "--button-letter-spacing": fontSizing.buttonLetterSpacing,
    "--button-focus-outline-width": sizing.buttonFocusOutlineWidth,
    "--button-focus-outline-offset": sizing.buttonFocusOutlineOffset,
    "--button-focus-color": colorSchemes.light.palette.primary.light,
    "--button-icon-gap": sizing.buttonIconGap,
    "--button-icon-size": sizing.iconButton,
    "--button-icon-only-width": sizing.buttonIconOnlyWidth,
    "--button-icon-only-padding": sizing.buttonIconOnlyPadding,
    "--button-primary-color": colors.buttonPrimary,
    "--button-primary-hover-color": colors.buttonHover,
    "--button-primary-hover-text-color": colors.buttonHoverText,
  },
  input: {
    ...motionStyles,
    fontFamily: fontSizing.fontFamily,
    "--input-width": sizing.inputWidth,
    "--input-height": sizing.inputHeight,
    "--input-padding-block": sizing.inputPaddingBlock,
    "--input-padding-inline": sizing.inputPaddingInline,
    "--input-border-width": sizing.inputBorderWidth,
    "--input-border-radius": sizing.inputBorderRadius,
    "--input-icon-gap": sizing.buttonIconGap,
    "--input-border-color": colors.inputBorder,
    "--input-background-color": colorSchemes.light.palette.background.paper,
    "--input-focus-border-color": colorSchemes.light.palette.primary.main,
    "--input-error-color": colors.inputError,
    "--input-success-color": colors.inputSuccess,
    "--input-disabled-background-color": colors.inputDisabledBackground,
    "--input-icon-color": colorSchemes.light.palette.text.primary,
    "--input-placeholder-color": colors.inputPlaceholder,
    "--input-message-margin-top": sizing.inputMessageMarginTop,
    "--input-message-font-size": fontSizing.inputMessageFontSize,
    "--input-message-font-weight": fontSizing.inputMessageFontWeight,
    "--input-message-line-height": fontSizing.inputMessageLineHeight,
    "--input-message-letter-spacing": fontSizing.inputMessageLetterSpacing,
  },
  radioButton: {
    ...motionStyles,
    ...effectStyles,
    fontFamily: fontSizing.fontFamily,
    fontSize: fontSizing.controlFontSize,
    lineHeight: fontSizing.controlLineHeight,
    "--radio-gap": sizing.radioGap,
    "--radio-padding": sizing.radioPadding,
    "--radio-control-size": sizing.radioControlSize,
    "--radio-border-width": sizing.radioBorderWidth,
    "--radio-border-radius": sizing.radioBorderRadius,
    "--radio-dot-size": sizing.radioDotSize,
    "--radio-focus-outline-width": sizing.controlFocusOutlineWidth,
    "--radio-focus-outline-offset": sizing.controlFocusOutlineOffset,
    "--radio-border-color": colors.radioBorder,
    "--radio-disabled-border-color": colors.disabledBorder,
    "--radio-disabled-text-color": colors.disabledText,
    "--radio-text-color": colorSchemes.light.palette.text.primary,
    "--radio-background-color": colorSchemes.light.palette.background.paper,
    "--radio-focus-color": colorSchemes.light.palette.primary.light,
    "--radio-primary-color": colorSchemes.light.palette.primary.main,
  },
  toggleSwitch: {
    ...motionStyles,
    ...effectStyles,
    fontFamily: fontSizing.fontFamily,
    fontSize: fontSizing.controlFontSize,
    lineHeight: fontSizing.controlLineHeight,
    "--toggle-gap": sizing.toggleGap,
    "--toggle-track-width": sizing.toggleTrackWidth,
    "--toggle-track-height": sizing.toggleTrackHeight,
    "--toggle-track-padding": sizing.toggleTrackPadding,
    "--toggle-track-border-radius": sizing.toggleTrackBorderRadius,
    "--toggle-thumb-size": sizing.toggleThumbSize,
    "--toggle-thumb-offset": sizing.toggleThumbOffset,
    "--toggle-thumb-border-radius": sizing.toggleThumbBorderRadius,
    "--toggle-focus-outline-width": sizing.controlFocusOutlineWidth,
    "--toggle-focus-outline-offset": sizing.controlFocusOutlineOffset,
    "--toggle-text-color": colorSchemes.light.palette.text.primary,
    "--toggle-track-color": colors.toggleTrack,
    "--toggle-disabled-text-color": colors.toggleDisabledText,
    "--toggle-background-color": colorSchemes.light.palette.background.paper,
    "--toggle-primary-color": colorSchemes.light.palette.primary.main,
    "--toggle-focus-color": colorSchemes.light.palette.primary.light,
  },
};

export const shape = {
  borderRadius: "8px",
  borderRadiusLarge: "16px",
};
