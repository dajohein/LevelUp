import styled from '@emotion/styled';
import { InputSize } from '../types';
import { transitions } from './animations';

// Form container
export const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.md};
  width: 100%;
  max-width: 400px;
`;

// Input field
export const Input = styled.input<{
  variant?: 'default' | 'error' | 'success';
  size?: InputSize;
}>`
  width: 100%;
  padding: ${props => {
    if (props.size === 'sm') return `${props.theme.spacing.xs} ${props.theme.spacing.sm}`;
    if (props.size === 'lg') return `${props.theme.spacing.md} ${props.theme.spacing.lg}`;
    return `${props.theme.spacing.sm} ${props.theme.spacing.md}`;
  }};
  
  font-size: ${props => {
    if (props.size === 'sm') return '0.875rem';
    if (props.size === 'lg') return '1.125rem';
    return '1rem';
  }}};
  
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid ${props => {
    switch (props.variant) {
      case 'error':
        return props.theme.colors.error;
      case 'success':
        return props.theme.colors.success;
      default:
        return 'rgba(255, 255, 255, 0.1)';
    }
  }};
  
  border-radius: ${props => props.theme.borderRadius.md};
  color: ${props => props.theme.colors.text};
  transition: ${transitions.fast};
  
  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    background: rgba(255, 255, 255, 0.1);
  }
  
  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

// Textarea
export const Textarea = styled.textarea<{
  variant?: 'default' | 'error' | 'success';
  size?: InputSize;
  rows?: number;
}>`
  width: 100%;
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  min-height: ${props => `${(props.rows || 4) * 1.5}rem`};
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid
    ${props => {
      switch (props.variant) {
        case 'error':
          return props.theme.colors.error;
        case 'success':
          return props.theme.colors.success;
        default:
          return 'rgba(255, 255, 255, 0.1)';
      }
    }};
  border-radius: ${props => props.theme.borderRadius.md};
  color: ${props => props.theme.colors.text};
  font-family: inherit;
  font-size: 1rem;
  line-height: 1.5;
  resize: vertical;
  transition: ${transitions.fast};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    background: rgba(255, 255, 255, 0.1);
  }

  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
  }
`;

// Select dropdown
export const Select = styled.select<{
  variant?: 'default' | 'error' | 'success';
  size?: InputSize;
}>`
  width: 100%;
  padding: ${props => {
    if (props.size === 'sm') return `${props.theme.spacing.xs} ${props.theme.spacing.sm}`;
    if (props.size === 'lg') return `${props.theme.spacing.md} ${props.theme.spacing.lg}`;
    return `${props.theme.spacing.sm} ${props.theme.spacing.md}`;
  }};
  background: rgba(255, 255, 255, 0.05);
  border: 2px solid
    ${props => {
      switch (props.variant) {
        case 'error':
          return props.theme.colors.error;
        case 'success':
          return props.theme.colors.success;
        default:
          return 'rgba(255, 255, 255, 0.1)';
      }
    }};
  border-radius: ${props => props.theme.borderRadius.md};
  color: ${props => props.theme.colors.text};
  font-size: 1rem;
  cursor: pointer;
  transition: ${transitions.fast};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary};
    background: rgba(255, 255, 255, 0.1);
  }

  option {
    background: ${props => props.theme.colors.surface};
    color: ${props => props.theme.colors.text};
  }
`;

// Label
export const Label = styled.label<{
  required?: boolean;
  size?: InputSize;
}>`
  display: block;
  margin-bottom: ${props => props.theme.spacing.xs};
  font-weight: 600;
  font-size: ${props => {
    switch (props.size) {
      case 'sm':
        return '0.875rem';
      case 'lg':
        return '1.125rem';
      default:
        return '1rem';
    }
  }};
  color: ${props => props.theme.colors.text};

  ${props =>
    props.required &&
    `
    &::after {
      content: '*';
      color: ${props.theme.colors.error};
      margin-left: 4px;
    }
  `}
`;

// Checkbox with custom styling
export const Checkbox = styled.input<{
  size?: InputSize;
}>`
  appearance: none;
  width: ${props => {
    if (props.size === 'sm') return '16px';
    if (props.size === 'lg') return '24px';
    return '20px';
  }};
  height: ${props => {
    if (props.size === 'sm') return '16px';
    if (props.size === 'lg') return '24px';
    return '20px';
  }};

  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: ${props => props.theme.borderRadius.sm};
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  position: relative;
  transition: ${transitions.fast};

  &:checked {
    background: ${props => props.theme.colors.primary};
    border-color: ${props => props.theme.colors.primary};

    &::after {
      content: '✓';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      color: white;
      font-size: 12px;
      font-weight: bold;
    }
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}33;
  }
`;

// Radio button
export const Radio = styled.input<{
  size?: InputSize;
}>`
  appearance: none;
  width: ${props => {
    if (props.size === 'sm') return '16px';
    if (props.size === 'lg') return '24px';
    return '20px';
  }};
  height: ${props => {
    if (props.size === 'sm') return '16px';
    if (props.size === 'lg') return '24px';
    return '20px';
  }};

  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: ${props => props.theme.borderRadius.full};
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  position: relative;
  transition: ${transitions.fast};

  &:checked {
    background: ${props => props.theme.colors.primary};
    border-color: ${props => props.theme.colors.primary};

    &::after {
      content: '';
      position: absolute;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: white;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px ${props => props.theme.colors.primary}33;
  }
`;

// Field group for radio/checkbox groups
export const FieldGroup = styled.div<{
  direction?: 'row' | 'column';
  gap?: 'sm' | 'md' | 'lg';
}>`
  display: flex;
  flex-direction: ${props => props.direction || 'column'};
  gap: ${props => {
    switch (props.gap) {
      case 'sm':
        return props.theme.spacing.xs;
      case 'lg':
        return props.theme.spacing.md;
      default:
        return props.theme.spacing.sm;
    }
  }};
`;

// Field item for individual radio/checkbox
export const FieldItem = styled.label`
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  cursor: pointer;
  padding: ${props => props.theme.spacing.xs};
  border-radius: ${props => props.theme.borderRadius.sm};
  transition: ${transitions.fast};

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

// Help text
export const HelpText = styled.div<{
  variant?: 'default' | 'error' | 'success';
}>`
  font-size: 0.875rem;
  margin-top: ${props => props.theme.spacing.xs};
  color: ${props => {
    switch (props.variant) {
      case 'error':
        return props.theme.colors.error;
      case 'success':
        return props.theme.colors.success;
      default:
        return props.theme.colors.textSecondary;
    }
  }};
`;

// Form section
export const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.md};
  padding: ${props => props.theme.spacing.lg};
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: ${props => props.theme.borderRadius.lg};
  background: rgba(255, 255, 255, 0.02);
`;

// Form actions (button group)
export const FormActions = styled.div<{
  align?: 'left' | 'center' | 'right' | 'space-between';
}>`
  display: flex;
  gap: ${props => props.theme.spacing.md};
  margin-top: ${props => props.theme.spacing.lg};

  ${props => {
    switch (props.align) {
      case 'center':
        return 'justify-content: center;';
      case 'right':
        return 'justify-content: flex-end;';
      case 'space-between':
        return 'justify-content: space-between;';
      default:
        return 'justify-content: flex-start;';
    }
  }}

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    flex-direction: column;

    & > * {
      width: 100%;
    }
  }
`;

// Search input with icon
export const SearchInput = styled.div`
  position: relative;
  width: 100%;

  input {
    padding-left: ${props => props.theme.spacing.xl};
  }

  &::before {
    content: '🔍';
    position: absolute;
    left: ${props => props.theme.spacing.sm};
    top: 50%;
    transform: translateY(-50%);
    color: ${props => props.theme.colors.textSecondary};
    z-index: 1;
  }
`;
