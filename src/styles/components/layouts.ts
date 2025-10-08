import styled from '@emotion/styled';
import { css } from '@emotion/react';

// Layout components for responsive design
export const ResponsiveGrid = styled.div<{
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: string;
  minWidth?: string;
}>`
  display: grid;
  gap: ${props => props.gap || props.theme.spacing.md};
  
  /* Mobile first */
  grid-template-columns: repeat(
    ${props => props.columns?.mobile || 1}, 
    1fr
  );
  
  /* Tablet */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: repeat(
      ${props => props.columns?.tablet || props.columns?.mobile || 2}, 
      1fr
    );
  }
  
  /* Desktop */
  @media (min-width: ${props => props.theme.breakpoints.desktop}) {
    grid-template-columns: ${props => 
      props.minWidth 
        ? `repeat(auto-fit, minmax(${props.minWidth}, 1fr))`
        : `repeat(${props.columns?.desktop || props.columns?.tablet || 3}, 1fr)`
    };
  }
`;

// Flex layout with responsive behavior
export const ResponsiveFlex = styled.div<{
  direction?: {
    mobile?: 'row' | 'column';
    tablet?: 'row' | 'column';
    desktop?: 'row' | 'column';
  };
  gap?: string;
  align?: string;
  justify?: string;
}>`
  display: flex;
  gap: ${props => props.gap || props.theme.spacing.md};
  align-items: ${props => props.align || 'center'};
  justify-content: ${props => props.justify || 'flex-start'};
  
  /* Mobile */
  flex-direction: ${props => props.direction?.mobile || 'column'};
  
  /* Tablet */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    flex-direction: ${props => 
      props.direction?.tablet || 
      props.direction?.mobile || 
      'row'
    };
  }
  
  /* Desktop */
  @media (min-width: ${props => props.theme.breakpoints.desktop}) {
    flex-direction: ${props => 
      props.direction?.desktop || 
      props.direction?.tablet || 
      'row'
    };
  }
`;

// Container with responsive padding
export const ResponsiveContainer = styled.div<{
  maxWidth?: string;
  padding?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
}>`
  width: 100%;
  max-width: ${props => props.maxWidth || '1200px'};
  margin: 0 auto;
  
  /* Mobile padding */
  padding: ${props => 
    props.padding?.mobile || 
    `0 ${props.theme.spacing.md}`
  };
  
  /* Tablet padding */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => 
      props.padding?.tablet || 
      props.padding?.mobile || 
      `0 ${props.theme.spacing.lg}`
    };
  }
  
  /* Desktop padding */
  @media (min-width: ${props => props.theme.breakpoints.desktop}) {
    padding: ${props => 
      props.padding?.desktop || 
      props.padding?.tablet || 
      `0 ${props.theme.spacing.xl}`
    };
  }
`;

// Hide/show on different breakpoints
export const ShowOnMobile = styled.div`
  display: block;
  
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    display: none;
  }
`;

export const HideOnMobile = styled.div`
  display: none;
  
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    display: block;
  }
`;

export const ShowOnTablet = styled.div`
  display: none;
  
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    display: block;
  }
  
  @media (min-width: ${props => props.theme.breakpoints.desktop}) {
    display: none;
  }
`;

export const ShowOnDesktop = styled.div`
  display: none;
  
  @media (min-width: ${props => props.theme.breakpoints.desktop}) {
    display: block;
  }
`;

// Two-column layout that stacks on mobile
export const ResponsiveTwoColumn = styled.div<{
  ratio?: string; // e.g., "1fr 2fr" or "300px 1fr"
  gap?: string;
  reverseOnMobile?: boolean;
}>`
  display: grid;
  gap: ${props => props.gap || props.theme.spacing.lg};
  
  /* Mobile: single column */
  grid-template-columns: 1fr;
  
  ${props => props.reverseOnMobile && css`
    > *:first-of-type {
      order: 2;
    }
    > *:last-of-type {
      order: 1;
    }
  `}
  
  /* Desktop: two columns */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: ${props => props.ratio || '1fr 1fr'};
    
    ${props => props.reverseOnMobile && css`
      > * {
        order: initial;
      }
    `}
  }
`;

// Card that adjusts layout based on screen size
export const ResponsiveCard = styled.div<{
  horizontal?: {
    tablet?: boolean;
    desktop?: boolean;
  };
}>`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.md};
  
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.md};
  
  /* Tablet horizontal layout */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    ${props => props.horizontal?.tablet && css`
      flex-direction: row;
      align-items: center;
    `}
  }
  
  /* Desktop horizontal layout */
  @media (min-width: ${props => props.theme.breakpoints.desktop}) {
    padding: ${props => props.theme.spacing.lg};
    
    ${props => props.horizontal?.desktop && css`
      flex-direction: row;
      align-items: center;
    `}
  }
`;

// Responsive text sizing
export const ResponsiveText = styled.div<{
  size?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  weight?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
}>`
  /* Mobile */
  font-size: ${props => props.size?.mobile || '1rem'};
  font-weight: ${props => props.weight?.mobile || 400};
  
  /* Tablet */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: ${props => props.size?.tablet || props.size?.mobile || '1.125rem'};
    font-weight: ${props => props.weight?.tablet || props.weight?.mobile || 400};
  }
  
  /* Desktop */
  @media (min-width: ${props => props.theme.breakpoints.desktop}) {
    font-size: ${props => props.size?.desktop || props.size?.tablet || '1.25rem'};
    font-weight: ${props => props.weight?.desktop || props.weight?.tablet || 400};
  }
`;

// Responsive spacing
export const ResponsiveStack = styled.div<{
  gap?: {
    mobile?: string;
    tablet?: string;
    desktop?: string;
  };
  horizontal?: boolean;
}>`
  display: flex;
  flex-direction: ${props => props.horizontal ? 'row' : 'column'};
  
  /* Mobile */
  gap: ${props => 
    props.gap?.mobile || 
    props.theme.spacing.sm
  };
  
  /* Tablet */
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    gap: ${props => 
      props.gap?.tablet || 
      props.gap?.mobile || 
      props.theme.spacing.md
    };
  }
  
  /* Desktop */
  @media (min-width: ${props => props.theme.breakpoints.desktop}) {
    gap: ${props => 
      props.gap?.desktop || 
      props.gap?.tablet || 
      props.theme.spacing.lg
    };
  }
`;

// Breakpoint-specific component rendering
export const Breakpoint = styled.div<{
  show?: ('mobile' | 'tablet' | 'desktop')[];
  hide?: ('mobile' | 'tablet' | 'desktop')[];
}>`
  ${props => {
    if (props.show) {
      return css`
        display: none;
        
        ${props.show.includes('mobile') && css`
          @media (max-width: ${props.theme.breakpoints.tablet}) {
            display: block;
          }
        `}
        
        ${props.show.includes('tablet') && css`
          @media (min-width: ${props.theme.breakpoints.tablet}) and (max-width: ${props.theme.breakpoints.desktop}) {
            display: block;
          }
        `}
        
        ${props.show.includes('desktop') && css`
          @media (min-width: ${props.theme.breakpoints.desktop}) {
            display: block;
          }
        `}
      `;
    }
    
    if (props.hide) {
      return css`
        display: block;
        
        ${props.hide.includes('mobile') && css`
          @media (max-width: ${props.theme.breakpoints.tablet}) {
            display: none;
          }
        `}
        
        ${props.hide.includes('tablet') && css`
          @media (min-width: ${props.theme.breakpoints.tablet}) and (max-width: ${props.theme.breakpoints.desktop}) {
            display: none;
          }
        `}
        
        ${props.hide.includes('desktop') && css`
          @media (min-width: ${props.theme.breakpoints.desktop}) {
            display: none;
          }
        `}
      `;
    }
    
    return '';
  }}
`;