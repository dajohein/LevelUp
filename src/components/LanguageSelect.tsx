import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';
import { FaGlobeAmericas } from 'react-icons/fa';

const LanguageCard = styled.button`
  background-color: ${props => props.theme.colors.surface};
  border: 2px solid transparent;
  border-radius: ${props => props.theme.borderRadius.lg};
  padding: ${props => props.theme.spacing.xl};
  margin: ${props => props.theme.spacing.md};
  min-width: 220px;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(76, 175, 80, 0.2);
    background-color: ${props => props.theme.colors.background};
  }
`;

const FlagEmoji = styled.span`
  font-size: 2.5rem;
  margin-bottom: ${props => props.theme.spacing.md};
`;

const Container = styled.div`
  min-height: 100vh;
  background-color: ${props => props.theme.colors.background};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.xl};
`;

const Hero = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: ${props => props.theme.spacing.xl};
  text-align: center;
`;

const AppIcon = styled.div`
  background: linear-gradient(135deg, ${props => props.theme.colors.primary} 0%, ${props => props.theme.colors.secondary} 100%);
  border-radius: 50%;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: ${props => props.theme.spacing.lg};
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.3);
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.text};
  font-size: ${props => props.theme.typography.h1.fontSize};
  font-weight: ${props => props.theme.typography.h1.fontWeight};
  margin-bottom: ${props => props.theme.spacing.md};
  text-align: center;
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 1.2rem;
  margin-bottom: ${props => props.theme.spacing.xl};
  text-align: center;
  max-width: 500px;
  line-height: 1.6;
`;

const CardGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${props => props.theme.spacing.lg};
  max-width: 800px;
`;

const LanguageName = styled.div`
  font-weight: 600;
  font-size: 1.2rem;
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.xs};
`;

const LanguageSubtext = styled.div`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
`;

interface Language {
  code: string;
  name: string;
  flag: string;
}

interface LanguageSelectProps {
  languages: Language[];
}

export const LanguageSelect: React.FC<LanguageSelectProps> = ({ languages }) => {
  const navigate = useNavigate();

  const handleLanguageSelect = (languageCode: string) => {
    navigate(`/overview/${languageCode}`);
  };

  return (
    <Container>
      <Hero>
        <AppIcon>
          <FaGlobeAmericas size={40} color="#FFFFFF" />
        </AppIcon>
        <Title>Welcome to LevelUp</Title>
        <Subtitle>
          Master new languages through interactive learning. <br />
          Track your progress, earn achievements, and level up your skills!
        </Subtitle>
      </Hero>
      <CardGrid>
        {languages.map(language => (
          <LanguageCard key={language.code} onClick={() => handleLanguageSelect(language.code)}>
            <FlagEmoji>{language.flag}</FlagEmoji>
            <LanguageName>{language.name}</LanguageName>
            <LanguageSubtext>Start learning</LanguageSubtext>
          </LanguageCard>
        ))}
      </CardGrid>
    </Container>
  );
};
