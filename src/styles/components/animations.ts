import { css, keyframes } from '@emotion/react';

// Animation keyframes
export const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

export const fadeOut = keyframes`
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(1.2); }
`;

export const slideIn = keyframes`
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
`;

export const slideOut = keyframes`
  from { transform: translateX(0); }
  to { transform: translateX(-100%); }
`;

export const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const shimmer = keyframes`
  0% { background-position: -800px 0; }
  100% { background-position: 800px 0; }
`;

export const shake = keyframes`
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
`;

export const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

export const letterPop = keyframes`
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

export const successGlow = keyframes`
  0% { box-shadow: 0 0 0 rgba(16, 185, 129, 0.5); }
  50% { box-shadow: 0 0 20px rgba(16, 185, 129, 0.8); }
  100% { box-shadow: 0 0 0 rgba(16, 185, 129, 0.5); }
`;

export const progressGrow = keyframes`
  from { width: 0%; }
  to { width: var(--target-width); }
`;

export const dots = keyframes`
  0%, 20% { color: rgba(0,0,0,0); text-shadow: .25em 0 0 rgba(0,0,0,0), .5em 0 0 rgba(0,0,0,0); }
  40% { color: white; text-shadow: .25em 0 0 rgba(0,0,0,0), .5em 0 0 rgba(0,0,0,0); }
  60% { color: white; text-shadow: .25em 0 0 white, .5em 0 0 rgba(0,0,0,0); }
  80%, 100% { color: white; text-shadow: .25em 0 0 white, .5em 0 0 white; }
`;

// Common animation mixins
export const fadeInAnimation = css`
  animation: ${fadeIn} 0.3s ease-out;
`;

export const shakeAnimation = css`
  animation: ${shake} 0.3s ease-in-out;
`;

export const pulseAnimation = css`
  animation: ${pulse} 0.2s ease-in-out;
`;

export const shimmerAnimation = css`
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
  background-size: 800px 100%;
  animation: ${shimmer} 2s infinite;
`;

// Transition helpers
export const transitions = {
  default: 'all 0.3s ease',
  fast: 'all 0.2s ease',
  slow: 'all 0.5s ease',
  bounce: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

export const hover = {
  scale: css`
    transition: ${transitions.fast};
    &:hover {
      transform: scale(1.05);
    }
  `,
  lift: css`
    transition: ${transitions.default};
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
  `,
  glow: css`
    transition: ${transitions.default};
    &:hover {
      box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
    }
  `,
};