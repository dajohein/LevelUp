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
  min-height: ${props => props.theme.touchTarget.comfortable};

  &:hover {
    border-color: ${props => props.theme.colors.primary};
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(76, 175, 80, 0.2);
    background-color: ${props => props.theme.colors.background};
  }

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    min-width: 180px;
    min-height: 140px;
    padding: ${props => props.theme.spacing.lg};
    margin: ${props => props.theme.spacing.sm};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    min-width: 150px;
    min-height: 120px;
    padding: ${props => props.theme.spacing.md};
    margin: ${props => props.theme.spacing.xs};
    border-radius: ${props => props.theme.borderRadius.md};
  }
`;

const FlagEmoji = styled.span`
  font-size: 2.5rem;
  margin-bottom: ${props => props.theme.spacing.md};

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 2.2rem;
    margin-bottom: ${props => props.theme.spacing.sm};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 2rem;
    margin-bottom: ${props => props.theme.spacing.xs};
  }
`;

const Container = styled.div`
  min-height: 100vh;
  min-height: 100dvh;
  background-color: ${props => props.theme.colors.background};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: ${props => props.theme.spacing.xl};

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    padding: ${props => props.theme.spacing.lg};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: ${props => props.theme.spacing.md};
    justify-content: flex-start;
    padding-top: ${props => props.theme.spacing.xl};
  }
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
  background: linear-gradient(
    135deg,
    ${props => props.theme.colors.primary} 0%,
    ${props => props.theme.colors.secondary} 100%
  );
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

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1.8rem;
    margin-bottom: ${props => props.theme.spacing.sm};
  }
`;

const Subtitle = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 1.2rem;
  margin-bottom: ${props => props.theme.spacing.xl};
  text-align: center;
  max-width: 500px;
  line-height: 1.6;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 1.1rem;
    margin-bottom: ${props => props.theme.spacing.lg};
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1rem;
    margin-bottom: ${props => props.theme.spacing.md};
    max-width: 400px;
    line-height: 1.5;
  }
`;

const CardGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: ${props => props.theme.spacing.lg};
  max-width: 800px;

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    gap: ${props => props.theme.spacing.md};
    max-width: 600px;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    gap: ${props => props.theme.spacing.sm};
    max-width: 400px;
    flex-direction: column;
    align-items: center;
  }
`;

const LanguageName = styled.div`
  font-weight: 600;
  font-size: 1.2rem;
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.xs};

  @media (max-width: ${props => props.theme.breakpoints.tablet}) {
    font-size: 1.1rem;
  }

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    font-size: 1rem;
  }
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
