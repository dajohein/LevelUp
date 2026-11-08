import React, { useEffect, useRef, useState } from 'react';
import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';

const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
`;

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const InputWrapper = styled.div<{ 'data-error'?: 'true' }>`
  position: relative;
  width: 100%;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  gap: ${props => props.theme.spacing.sm};
  ${css`
    animation: ${fadeIn} 0.3s ease-out;
  `}

  ${props =>
    props['data-error'] === 'true' &&
    css`
      animation: ${shake} 0.3s ease-in-out;
    `}
`;

const SubmitButton = styled.button`
  min-height: ${props => props.theme.touchTarget.minimum};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.md};
  border: none;
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.primary};
  color: white;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;

  &:hover:not(:disabled) {
    background-color: ${props => props.theme.colors.secondary};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const StyledInput = styled.input<{ isCorrect?: boolean; isError?: boolean }>`
  width: 100%;
  box-sizing: border-box;
  padding: ${props => props.theme.spacing.md};
  font-size: ${props => props.theme.typography.body.fontSize};
  border: 2px solid
    ${props => {
      if (props.isCorrect) return props.theme.colors.success;
      if (props.isError) return props.theme.colors.error;
      return props.theme.colors.primary;
    }};
  border-radius: ${props => props.theme.borderRadius.md};
  background-color: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  transition: all 0.3s ease;
  text-align: center;
  font-weight: 500;

  &:focus {
    outline: none;
    border-color: ${props => {
      if (props.isCorrect) return props.theme.colors.success;
      if (props.isError) return props.theme.colors.error;
      return props.theme.colors.secondary;
    }};
    box-shadow: 0 0 0 3px
      ${props => {
        if (props.isCorrect) return `${props.theme.colors.success}33`;
        if (props.isError) return `${props.theme.colors.error}33`;
        return `${props.theme.colors.secondary}33`;
      }};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &::placeholder {
    color: ${props => props.theme.colors.textSecondary};
    font-style: italic;
  }
`;

const HintText = styled.div<{ isError?: boolean }>`
  position: absolute;
  bottom: -25px;
  left: 0;
  font-size: 0.8rem;
  color: ${props => (props.isError ? props.theme.colors.error : props.theme.colors.textSecondary)};
  ${css`
    animation: ${fadeIn} 0.3s ease-out;
  `}
`;

interface AnimatedInputProps {
  value: string; // Make required for controlled component
  onChange: (value: string) => void; // Make required
  onSubmit: (value: string) => void; // Make required
  isCorrect?: boolean;
  isError?: boolean;
  hint?: string;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const AnimatedInputComponent: React.FC<AnimatedInputProps> = ({
  value,
  onChange,
  onSubmit,
  isCorrect,
  isError,
  hint,
  placeholder = 'Type your answer',
  disabled = false,
  autoFocus = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);
  const hasSubmittedRef = useRef(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    hasSubmittedRef.current = false;
    setHasSubmitted(false);
  }, [value]);

  useEffect(() => {
    if (!disabled) {
      hasSubmittedRef.current = false;
      setHasSubmitted(false);
    }
  }, [disabled]);

  // Focus input when enabled and autoFocus is true
  useEffect(() => {
    if (!disabled && autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled, autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    hasSubmittedRef.current = false;
    setHasSubmitted(false);
    onChange(newValue);
  };

  const handleSubmit = () => {
    const trimmedValue = value.trim();
    if (disabled || hasSubmittedRef.current || !trimmedValue || isComposingRef.current) return;

    hasSubmittedRef.current = true;
    setHasSubmitted(true);
    onSubmit(trimmedValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;

    if (isComposingRef.current || e.nativeEvent.isComposing || e.nativeEvent.keyCode === 229) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    handleSubmit();
  };

  return (
    <InputWrapper data-error={isError ? 'true' : undefined}>
      <StyledInput
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => {
          isComposingRef.current = true;
        }}
        onCompositionEnd={() => {
          isComposingRef.current = false;
        }}
        placeholder={placeholder}
        isCorrect={isCorrect}
        isError={isError}
        disabled={disabled}
        aria-label="Answer input"
        aria-invalid={isError}
        aria-describedby={hint ? 'hint-text' : undefined}
        autoComplete="off"
        spellCheck={false}
      />
      <SubmitButton
        type="button"
        onClick={handleSubmit}
        disabled={disabled || hasSubmitted || !value.trim()}
      >
        Submit answer
      </SubmitButton>
      {hint && (
        <HintText id="hint-text" isError={isError} role="alert" aria-live="polite">
          {hint}
        </HintText>
      )}
    </InputWrapper>
  );
};

export const AnimatedInput = React.memo(AnimatedInputComponent);
