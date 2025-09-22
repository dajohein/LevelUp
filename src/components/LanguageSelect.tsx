import styled from '@emotion/styled';
import { useNavigate } from 'react-router-dom';

const LanguageButton = styled.button`
  padding: 1.5rem 2rem;
  margin: 0.5rem;
  font-size: 1.2rem;
  border: none;
  border-radius: 12px;
  background-color: ${props => props.theme.colors.primary};
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 180px;
  justify-content: center;

  &:hover {
    background-color: ${props => props.theme.colors.secondary};
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  }
`;

const FlagEmoji = styled.span`
  font-size: 1.5rem;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 2rem;
  background-color: ${props => props.theme.colors.background};
`;

const Title = styled.h1`
  color: ${props => props.theme.colors.text};
  margin-bottom: 2rem;
  text-align: center;
`;

const ButtonContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  max-width: 800px;
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
    navigate(`/sessions/${languageCode}`);
  };

  return (
    <Container>
      <Title>Choose Your Language</Title>
      <ButtonContainer>
        {languages.map(language => (
          <LanguageButton key={language.code} onClick={() => handleLanguageSelect(language.code)}>
            <FlagEmoji>{language.flag}</FlagEmoji>
            {language.name}
          </LanguageButton>
        ))}
      </ButtonContainer>
    </Container>
  );
};
