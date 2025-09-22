import React from 'react';
import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';

const NavigationBar = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 60px;
  background-color: ${props => props.theme.colors.primary};
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 ${props => props.theme.spacing.lg};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  z-index: 1000;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  padding: ${props => props.theme.spacing.sm};
  border-radius: 4px;
  transition: background-color 0.2s ease;
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }
`;

const LanguageTitle = styled.h1`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FlagEmoji = styled.span`
  font-size: 1.5rem;
`;

const AppTitle = styled.span`
  font-size: 1.2rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
`;

interface NavigationProps {
  languageName?: string;
  languageFlag?: string;
  showOverviewButton?: boolean;
}

export const Navigation: React.FC<NavigationProps> = ({ 
  languageName, 
  languageFlag, 
  showOverviewButton = false 
}) => {
  const navigate = useNavigate();

  const handleBackToLanguageSelection = () => {
    navigate('/');
  };

  const handleBackToOverview = () => {
    if (languageName) {
      // Extract language code from name for navigation
      const languageCode = languageName.toLowerCase() === 'german' ? 'de' : 
                          languageName.toLowerCase() === 'spanish' ? 'es' : 
                          languageName.toLowerCase();
      navigate(`/overview/${languageCode}`);
    }
  };

  return (
    <NavigationBar>
      <BackButton onClick={showOverviewButton ? handleBackToOverview : handleBackToLanguageSelection}>
        ← <span>{showOverviewButton ? 'Overview' : 'Languages'}</span>
      </BackButton>
      {languageName && languageFlag && (
        <LanguageTitle>
          <FlagEmoji>{languageFlag}</FlagEmoji>
          {languageName}
        </LanguageTitle>
      )}
      <AppTitle>LevelUp</AppTitle>
    </NavigationBar>
  );
};
