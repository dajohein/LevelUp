import styled from '@emotion/styled';
import { css } from '@emotion/react';

// Typography components
export const Heading1 = styled.h1<{ color?: string; center?: boolean }>`
  font-size: ${props => props.theme.typography.h1.fontSize};
  font-weight: ${props => props.theme.typography.h1.fontWeight};
  color: ${props => props.color || props.theme.colors.text};
  margin: 0 0 ${props => props.theme.spacing.md} 0;
  line-height: 1.2;
  
  ${props => props.center && css`
    text-align: center;
  `}
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.typography.h1.mobile?.fontSize || '1.8rem'};
  }
`;

export const Heading2 = styled.h2<{ color?: string; center?: boolean }>`
  font-size: ${props => props.theme.typography.h2.fontSize};
  font-weight: ${props => props.theme.typography.h2.fontWeight};
  color: ${props => props.color || props.theme.colors.text};
  margin: 0 0 ${props => props.theme.spacing.md} 0;
  line-height: 1.3;
  
  ${props => props.center && css`
    text-align: center;
  `}
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.typography.h2.mobile?.fontSize || '1.5rem'};
  }
`;

export const Heading3 = styled.h3<{ color?: string; center?: boolean }>`
  font-size: ${props => props.theme.typography.h3.fontSize};
  font-weight: ${props => props.theme.typography.h3.fontWeight};
  color: ${props => props.color || props.theme.colors.text};
  margin: 0 0 ${props => props.theme.spacing.sm} 0;
  line-height: 1.4;
  
  ${props => props.center && css`
    text-align: center;
  `}
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.typography.h3.mobile?.fontSize || '1.2rem'};
  }
`;

export const BodyText = styled.p<{ 
  color?: string; 
  size?: 'small' | 'body' | 'large';
  center?: boolean;
  weight?: 300 | 400 | 500 | 600 | 700;
}>`
  font-size: ${props => {
    switch (props.size) {
      case 'small': return props.theme.typography.small.fontSize;
      case 'large': return '1.125rem';
      default: return props.theme.typography.body.fontSize;
    }
  }};
  font-weight: ${props => props.weight || props.theme.typography.body.fontWeight};
  color: ${props => props.color || props.theme.colors.text};
  line-height: 1.6;
  margin: 0 0 ${props => props.theme.spacing.md} 0;
  
  ${props => props.center && css`
    text-align: center;
  `}
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => {
      switch (props.size) {
        case 'small': return props.theme.typography.small.mobile?.fontSize || '0.8rem';
        case 'large': return '1rem';
        default: return props.theme.typography.body.mobile?.fontSize || '0.95rem';
      }
    }};
  }
`;

export const SmallText = styled.span<{ color?: string; weight?: 300 | 400 | 500 | 600 }>`
  font-size: ${props => props.theme.typography.small.fontSize};
  font-weight: ${props => props.weight || 400};
  color: ${props => props.color || props.theme.colors.textSecondary};
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.typography.small.mobile?.fontSize || '0.8rem'};
  }
`;

export const TextLabel = styled.label<{ required?: boolean }>`
  font-size: ${props => props.theme.typography.small.fontSize};
  font-weight: 500;
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.xs};
  display: block;
  
  ${props => props.required && css`
    &::after {
      content: ' *';
      color: ${props.theme.colors.error};
    }
  `}
`;

export const Link = styled.a<{ variant?: 'primary' | 'secondary' | 'inherit' }>`
  color: ${props => {
    switch (props.variant) {
      case 'secondary': return props.theme.colors.textSecondary;
      case 'inherit': return 'inherit';
      default: return props.theme.colors.primary;
    }
  }};
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;
  
  &:hover {
    color: ${props => {
      switch (props.variant) {
        case 'secondary': return props.theme.colors.text;
        case 'inherit': return props.theme.colors.primary;
        default: return props.theme.colors.secondary;
      }
    }};
    text-decoration: underline;
  }
  
  &:focus {
    outline: none;
    color: ${props => props.theme.colors.secondary};
    text-decoration: underline;
  }
`;

// Text with gradient
export const GradientText = styled.span<{ 
  from?: string; 
  to?: string;
  direction?: string;
}>`
  background: linear-gradient(
    ${props => props.direction || '135deg'},
    ${props => props.from || props.theme.colors.primary} 0%,
    ${props => props.to || props.theme.colors.secondary} 100%
  );
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

// Code text
export const CodeText = styled.code`
  font-family: 'Courier New', Courier, monospace;
  background: rgba(255, 255, 255, 0.1);
  padding: ${props => props.theme.spacing.xs};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: 0.9em;
  color: ${props => props.theme.colors.primary};
`;

// Highlighted text
export const HighlightText = styled.span<{ color?: string }>`
  background-color: ${props => props.color || 'rgba(76, 175, 80, 0.2)'};
  padding: 0 ${props => props.theme.spacing.xs};
  border-radius: ${props => props.theme.borderRadius.sm};
  color: ${props => props.theme.colors.text};
`;

// Text with ellipsis
export const EllipsisText = styled.div<{ lines?: number }>`
  overflow: hidden;
  text-overflow: ellipsis;
  
  ${props => props.lines && props.lines > 1 ? css`
    display: -webkit-box;
    -webkit-line-clamp: ${props.lines};
    -webkit-box-orient: vertical;
    white-space: normal;
  ` : css`
    white-space: nowrap;
  `}
`;

// Text alignment utilities
export const TextCenter = styled.div`
  text-align: center;
`;

export const TextLeft = styled.div`
  text-align: left;
`;

export const TextRight = styled.div`
  text-align: right;
`;