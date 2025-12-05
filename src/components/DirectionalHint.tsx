import React, { useState } from 'react';
import styled from '@emotion/styled';
import { FaArrowRight, FaArrowLeft, FaExchangeAlt, FaTimes } from 'react-icons/fa';

const DirectionalIconContainer = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
`;

const DirectionalIcon = styled.button<{ direction: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 2px solid ${props => (props.direction === 'term-to-definition' ? '#2196f3' : '#9c27b0')};
  border-radius: 50%;
  background: ${props =>
    props.direction === 'term-to-definition'
      ? 'rgba(33, 150, 243, 0.2)'
      : 'rgba(156, 39, 176, 0.2)'};
  color: ${props => (props.direction === 'term-to-definition' ? '#2196f3' : '#9c27b0')};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

  &:hover {
    background: ${props =>
      props.direction === 'term-to-definition'
        ? 'rgba(33, 150, 243, 0.35)'
        : 'rgba(156, 39, 176, 0.35)'};
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  &:active {
    transform: scale(0.95);
  }
`;

const Tooltip = styled.div<{ visible: boolean }>`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  padding: 6px 10px;
  border-radius: ${props => props.theme.borderRadius.sm};
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 1px solid ${props => props.theme.colors.textSecondary};
  opacity: ${props => (props.visible ? 1 : 0)};
  visibility: ${props => (props.visible ? 'visible' : 'hidden')};
  transition:
    opacity 0.2s ease,
    visibility 0.2s ease;
  z-index: 1000;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 4px solid transparent;
    border-top-color: ${props => props.theme.colors.surface};
  }
`;

const DetailPopup = styled.div<{ visible: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  background: ${props => props.theme.colors.surface};
  color: ${props => props.theme.colors.text};
  padding: 12px;
  border-radius: ${props => props.theme.borderRadius.md};
  min-width: 240px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  border: 1px solid ${props => props.theme.colors.textSecondary};
  opacity: ${props => (props.visible ? 1 : 0)};
  visibility: ${props => (props.visible ? 'visible' : 'hidden')};
  transition:
    opacity 0.2s ease,
    visibility 0.2s ease;
  z-index: 1001;

  &::before {
    content: '';
    position: absolute;
    bottom: 100%;
    right: 14px;
    border: 6px solid transparent;
    border-bottom-color: ${props => props.theme.colors.surface};
  }
`;

const PopupHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 0.9rem;
`;

const PopupContent = styled.div`
  font-size: 0.8rem;
  color: ${props => props.theme.colors.textSecondary};
  line-height: 1.4;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.theme.colors.textSecondary};
  cursor: pointer;
  padding: 2px;
  border-radius: 2px;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
  }
`;

const DirectionDisplay = styled.div<{ direction: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${props => (props.direction === 'term-to-definition' ? '#2196f3' : '#9c27b0')};
  font-weight: 500;
`;

interface DirectionalHintProps {
  direction?: 'term-to-definition' | 'definition-to-term';
  showHint?: boolean;
  word?: any;
}

export const DirectionalHint: React.FC<DirectionalHintProps> = ({
  direction = 'definition-to-term',
  showHint = true,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  // Temporarily always show hint for testing
  if (!showHint) {
    return null;
  }

  const getDirectionInfo = () => {
    if (direction === 'term-to-definition') {
      return {
        icon: <FaArrowRight size={12} />,
        shortText: 'Term → Definition',
        fullText: 'Translate from source to target language',
        description:
          'You will see a term in your native language and need to provide the translation in the target language you are learning.',
      };
    } else {
      return {
        icon: <FaArrowLeft size={12} />,
        shortText: 'Definition → Term',
        fullText: 'Translate from target to source language',
        description:
          'You will see a term in the target language and need to provide the meaning or translation in your native language.',
      };
    }
  };

  const directionInfo = getDirectionInfo();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPopup(!showPopup);
    setShowTooltip(false);
  };

  const handleClosePopup = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowPopup(false);
  };

  return (
    <DirectionalIconContainer>
      <DirectionalIcon
        direction={direction}
        onClick={handleClick}
        onMouseEnter={() => !showPopup && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={directionInfo.shortText}
      >
        {directionInfo.icon}
      </DirectionalIcon>

      <Tooltip visible={showTooltip && !showPopup}>{directionInfo.shortText}</Tooltip>

      <DetailPopup visible={showPopup}>
        <PopupHeader>
          <DirectionDisplay direction={direction}>
            <FaExchangeAlt size={14} />
            {directionInfo.shortText}
          </DirectionDisplay>
          <CloseButton onClick={handleClosePopup}>
            <FaTimes size={12} />
          </CloseButton>
        </PopupHeader>
        <PopupContent>
          <div style={{ marginBottom: '6px', fontWeight: 500 }}>{directionInfo.fullText}</div>
          <div>{directionInfo.description}</div>
        </PopupContent>
      </DetailPopup>
    </DirectionalIconContainer>
  );
};

export default DirectionalHint;
