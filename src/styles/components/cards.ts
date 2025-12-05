import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { hover, transitions } from './animations';
import { theme } from '../theme';

// Card variants
export const cardVariants = {
  default: css`
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
  `,

  elevated: css`
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  `,

  outlined: css`
    background: transparent;
    border: 2px solid rgba(255, 255, 255, 0.2);
  `,

  glass: css`
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
  `,

  highlight: css`
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.2);
  `,
};

// Base card component
export const Card = styled.div<{
  variant?: keyof typeof cardVariants;
  interactive?: boolean;
  padding?: keyof typeof theme.spacing;
}>`
  border-radius: ${props => props.theme.borderRadius.lg};
  transition: ${transitions.default};
  position: relative;
  overflow: hidden;

  /* Variant styles */
  ${props => cardVariants[props.variant || 'default']}

  /* Padding */
  padding: ${props => {
    const paddingKey = props.padding || 'lg';
    return props.theme.spacing[paddingKey];
  }};

  /* Interactive states */
  ${props =>
    props.interactive &&
    css`
      cursor: pointer;
      ${hover.lift}

      &:active {
        transform: translateY(0px) scale(0.98);
      }
    `}

  /* Mobile optimizations */
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    border-radius: ${props => props.theme.borderRadius.md};
    padding: ${props => props.theme.spacing.md};
  }
`;

// Card header
export const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: ${props => props.theme.spacing.md};
  padding-bottom: ${props => props.theme.spacing.sm};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

// Card title
export const CardTitle = styled.h3`
  margin: 0;
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.h3.fontSize};
  font-weight: ${props => props.theme.typography.h3.fontWeight};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: ${props => props.theme.typography.h3.mobile?.fontSize || '1.2rem'};
  }
`;

// Card content
export const CardContent = styled.div`
  color: ${props => props.theme.colors.text};
  line-height: 1.6;
`;

// Card footer
export const CardFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${props => props.theme.spacing.sm};
  margin-top: ${props => props.theme.spacing.md};
  padding-top: ${props => props.theme.spacing.sm};
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

// Stat card (commonly used pattern)
export const StatCard = styled(Card)<{ highlight?: boolean }>`
  text-align: center;
  min-width: 120px;

  ${props =>
    props.highlight &&
    css`
      ${cardVariants.highlight}
    `}
`;

// Language card (specialized card)
export const LanguageCard = styled(Card)<{ selected?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 200px;
  max-width: 250px;

  ${props =>
    props.selected &&
    css`
      ${cardVariants.highlight}
      transform: scale(1.02);
    `}

  ${props =>
    !props.selected &&
    css`
      ${hover.scale}
    `}
  
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    min-width: 160px;
    max-width: 200px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    min-width: 140px;
    max-width: 180px;
  }
`;

// Grid layouts for cards
export const CardGrid = styled.div<{
  columns?: number;
  minWidth?: string;
  gap?: keyof typeof theme.spacing;
}>`
  display: grid;
  grid-template-columns: ${props =>
    props.columns
      ? `repeat(${props.columns}, 1fr)`
      : `repeat(auto-fit, minmax(${props.minWidth || '200px'}, 1fr))`};
  gap: ${props => {
    const gapKey = props.gap || 'md';
    return props.theme.spacing[gapKey];
  }};

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: ${props => props.theme.spacing.sm};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: ${props => props.theme.spacing.xs};
  }
`;

// Flex layouts for cards
export const CardRow = styled.div<{
  wrap?: boolean;
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around';
  gap?: keyof typeof theme.spacing;
}>`
  display: flex;
  flex-wrap: ${props => (props.wrap ? 'wrap' : 'nowrap')};
  justify-content: ${props => props.justify || 'flex-start'};
  gap: ${props => {
    const gapKey = props.gap || 'md';
    return props.theme.spacing[gapKey];
  }};

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;
    gap: ${props => props.theme.spacing.sm};
  }
`;
