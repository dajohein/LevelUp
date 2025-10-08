import styled from '@emotion/styled';
import { SpacingKey } from '../types';

// Base container with responsive padding
export const Container = styled.div<{
  padding?: SpacingKey;
  center?: boolean;
  maxWidth?: string;
}>`
  width: 100%;
  max-width: ${props => props.maxWidth || '1200px'};
  margin: 0 auto;
  padding: ${props => {
    const paddingKey = props.padding || 'md';
    return props.theme.spacing[paddingKey];
  }};
  
  ${props => props.center && `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  `}
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.sm};
  }
`;

// Section container for page sections
export const Section = styled.section<{
  padding?: SpacingKey;
  background?: string;
}>`
  width: 100%;
  padding: ${props => {
    const paddingKey = props.padding || 'xl';
    return `${props.theme.spacing[paddingKey]} 0`;
  }};
  background: ${props => props.background || 'transparent'};
`;

// Flex containers
export const FlexContainer = styled('div', {
  shouldForwardProp: (prop: string) => !['direction', 'align', 'justify', 'gap', 'wrap'].includes(prop),
})<{
  direction?: 'row' | 'column';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'space-between' | 'space-around' | 'space-evenly';
  gap?: SpacingKey;
  wrap?: boolean;
}>`
  display: flex;
  flex-direction: ${props => props.direction || 'row'};
  align-items: ${props => {
    switch (props.align) {
      case 'start': return 'flex-start';
      case 'end': return 'flex-end';
      default: return props.align || 'center';
    }
  }};
  justify-content: ${props => {
    switch (props.justify) {
      case 'start': return 'flex-start';
      case 'end': return 'flex-end';
      default: return props.justify || 'center';
    }
  }};
  gap: ${props => {
    const gapKey = props.gap || 'md';
    return props.theme.spacing[gapKey];
  }};
  flex-wrap: ${props => props.wrap ? 'wrap' : 'nowrap'};
`;

// Grid containers
export const GridContainer = styled('div', {
  shouldForwardProp: (prop: string) => !['columns', 'gap', 'minColumnWidth'].includes(prop),
})<{
  columns?: number;
  gap?: SpacingKey;
  minColumnWidth?: string;
}>`
  display: grid;
  grid-template-columns: ${props => 
    props.minColumnWidth 
      ? `repeat(auto-fit, minmax(${props.minColumnWidth}, 1fr))`
      : `repeat(${props.columns || 2}, 1fr)`
  };
  gap: ${props => {
    const gapKey = props.gap || 'md';
    return props.theme.spacing[gapKey];
  }};
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    grid-template-columns: 1fr;
  }
`;

// Content wrapper with max width
export const ContentWrapper = styled.div<{
  size?: SpacingKey;
}>`
  max-width: 100%;
  width: 100%;
  padding: ${props => {
    const size = props.size || 'md';
    return props.theme.spacing[size];
  }};
  
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    max-width: 800px;
    margin: 0 auto;
  }
`;

// Responsive spacer
export const Spacer = styled.div<{
  size?: SpacingKey;
}>`
  height: ${props => {
    const size = props.size || 'md';
    return props.theme.spacing[size];
  }};
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    height: ${props => props.theme.spacing.sm};
  }
`;

// Centered content
export const CenteredContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 50vh;
  padding: ${props => props.theme.spacing.xl};
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.lg};
    min-height: 40vh;
  }
`;

// Two column layout
export const TwoColumnLayout = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${props => props.theme.spacing.xl};
  
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.lg};
  }
`;

// Sidebar layout
export const SidebarLayout = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.xl};
  
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    flex-direction: column;
    gap: ${props => props.theme.spacing.lg};
  }
`;

export const LayoutSidebar = styled.aside<{ width?: string }>`
  flex: 0 0 ${props => props.width || '300px'};
  
  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    flex: none;
    width: 100%;
  }
`;

export const MainContent = styled.main`
  flex: 1;
  min-width: 0; /* Prevent flex item from overflowing */
`;

// Sticky container
export const StickyContainer = styled.div<{
  top?: string;
  zIndex?: number;
}>`
  position: sticky;
  top: ${props => props.top || '0'};
  z-index: ${props => props.zIndex || 10};
  background: ${props => props.theme.colors.background};
`;

// Scroll container
export const ScrollContainer = styled.div<{
  maxHeight?: string;
  hideScrollbar?: boolean;
}>`
  max-height: ${props => props.maxHeight || '400px'};
  overflow-y: auto;
  
  ${props => props.hideScrollbar && `
    scrollbar-width: none;
    -ms-overflow-style: none;
    
    &::-webkit-scrollbar {
      display: none;
    }
  `}
`;

// Responsive image container
export const ImageContainer = styled.div<{
  aspectRatio?: string;
  borderRadius?: boolean;
}>`
  position: relative;
  width: 100%;
  aspect-ratio: ${props => props.aspectRatio || '16/9'};
  overflow: hidden;
  border-radius: ${props => props.borderRadius ? props.theme.borderRadius.md : '0'};
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;