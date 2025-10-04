import React, { useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';
import { useViewport } from '../../hooks/useViewport';

const slideUp = keyframes`
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
`;

const slideDown = keyframes`
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(100%);
    opacity: 0;
  }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

interface MobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  fullScreen?: boolean;
  height?: 'auto' | 'half' | 'full';
}

const Backdrop = styled.div<{ isOpen: boolean; isClosing: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
  
  animation: ${props => props.isClosing ? fadeOut : fadeIn} 0.3s ease-out;
  
  @media (min-width: ${props => props.theme.breakpoints.tablet}) {
    align-items: center;
  }
`;

const ModalContent = styled.div<{ 
  height: 'auto' | 'half' | 'full';
  fullScreen: boolean;
  isClosing: boolean;
  isMobile: boolean;
}>`
  background: ${props => props.theme.colors.surface};
  border-radius: ${props => props.isMobile ? '20px 20px 0 0' : '16px'};
  width: 100%;
  max-width: ${props => props.isMobile ? '100%' : '500px'};
  max-height: ${props => {
    if (props.fullScreen) return '100vh';
    switch (props.height) {
      case 'half': return '50vh';
      case 'full': return '90vh';
      default: return '80vh';
    }
  }};
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  
  ${props => props.isMobile ? `
    animation: ${props.isClosing ? slideDown : slideUp} 0.3s ease-out;
  ` : `
    animation: ${props.isClosing ? fadeOut : fadeIn} 0.3s ease-out;
  `}
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${props => props.theme.spacing.lg};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

const ModalTitle = styled.h2`
  color: ${props => props.theme.colors.text};
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.1rem;
  }
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 1.5rem;
  cursor: pointer;
  padding: ${props => props.theme.spacing.xs};
  border-radius: 50%;
  transition: all 0.2s ease;
  min-width: ${props => props.theme.touchTarget.minimum};
  min-height: ${props => props.theme.touchTarget.minimum};
  display: flex;
  align-items: center;
  justify-content: center;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    color: ${props => props.theme.colors.text};
  }
`;

const ModalBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${props => props.theme.spacing.lg};
  
  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
  }
`;

export const MobileModal: React.FC<MobileModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  fullScreen = false,
  height = 'auto',
}) => {
  const [isClosing, setIsClosing] = React.useState(false);
  const { isMobile } = useViewport();
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen && !isClosing) return null;

  return (
    <Backdrop isOpen={isOpen} isClosing={isClosing} onClick={handleBackdropClick}>
      <ModalContent
        ref={contentRef}
        height={height}
        fullScreen={fullScreen}
        isClosing={isClosing}
        isMobile={isMobile}
      >
        {(title || showCloseButton) && (
          <ModalHeader>
            {title && <ModalTitle>{title}</ModalTitle>}
            {showCloseButton && (
              <CloseButton onClick={handleClose}>
                ×
              </CloseButton>
            )}
          </ModalHeader>
        )}
        <ModalBody>{children}</ModalBody>
      </ModalContent>
    </Backdrop>
  );
};