import { theme } from './theme';

// Type helpers for styled components
export type SpacingKey = keyof typeof theme.spacing;
export type ColorKey = keyof typeof theme.colors;
export type BorderRadiusKey = keyof typeof theme.borderRadius;
export type BreakpointKey = keyof typeof theme.breakpoints;
export type TypographyKey = keyof typeof theme.typography;

// Theme interface for styled components
export interface ThemeProps {
  theme: typeof theme;
}

// Base variant types
export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';
export type CardVariant = 'default' | 'elevated' | 'glass' | 'language';
export type InputSize = 'sm' | 'md' | 'lg';
