import styled from '@emotion/styled';
import { keyframes, css } from '@emotion/react';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: ${props => props.theme.colors.background};
`;

const Spinner = styled.div`
  width: 50px;
  height: 50px;
  border: 5px solid ${props => props.theme.colors.surface};
  border-top: 5px solid ${props => props.theme.colors.primary};
  border-radius: 50%;
  ${css`
    animation: ${spin} 1s linear infinite;
  `}
`;

const LoadingText = styled.p`
  margin-top: ${props => props.theme.spacing.lg};
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.body.fontSize};
`;

interface LoadingProps {
  message?: string;
}

export const Loading: React.FC<LoadingProps> = ({ message = 'Loading...' }) => (
  <LoadingContainer>
    <Spinner />
    <LoadingText>{message}</LoadingText>
  </LoadingContainer>
);
