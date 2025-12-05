import React, { useState } from 'react';
import {
  // Layout
  Container,
  ResponsiveGrid,
  FlexContainer,

  // Typography
  Heading1,
  Heading2,
  BodyText,

  // Components
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  BaseButton,
  LanguageCard,
  StatCard,
  ProgressBar,
  Alert,

  // Forms
  Form,
  FieldGroup,
  Label,
  Input,
  Select,

  // Responsive utilities
  ShowOnMobile,
  HideOnMobile,

  // Theme
  theme,
} from '@/components/ui';

interface ComponentShowcaseProps {
  onLanguageSelect?: (language: string) => void;
}

export const ComponentShowcase: React.FC<ComponentShowcaseProps> = ({ onLanguageSelect }) => {
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [formData, setFormData] = useState({ name: '', level: '' });
  const [showAlert, setShowAlert] = useState(false);

  const languages = [
    { code: 'de', name: 'German', flag: '🇩🇪', progress: 75 },
    { code: 'es', name: 'Spanish', flag: '🇪🇸', progress: 45 },
    { code: 'fr', name: 'French', flag: '🇫🇷', progress: 30 },
  ];

  const stats = [
    { label: 'Words Learned', value: '1,247', highlight: true },
    { label: 'Study Streak', value: '12 days', highlight: false },
    { label: 'Accuracy', value: '94%', highlight: false },
    { label: 'Level', value: 'Advanced', highlight: true },
  ];

  const handleLanguageSelect = (langCode: string) => {
    setSelectedLanguage(langCode);
    onLanguageSelect?.(langCode);
    setShowAlert(true);
    setTimeout(() => setShowAlert(false), 3000);
  };

  return (
    <Container maxWidth="1200px">
      <Container padding="lg" center>
        {/* Header Section */}
        <FlexContainer direction="column" align="center" gap="lg">
          <Heading1 center>Component Library Showcase</Heading1>
          <BodyText center size="large" color={theme.colors.textSecondary}>
            Demonstrating the unified design system with responsive components
          </BodyText>
        </FlexContainer>

        {/* Alert Demo */}
        {showAlert && (
          <Alert variant="success" dismissible>
            🎉 Language selected: {languages.find(l => l.code === selectedLanguage)?.name}
          </Alert>
        )}

        {/* Language Selection Section */}
        <Card variant="glass" padding="xl">
          <CardHeader>
            <CardTitle>Choose Your Language</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveGrid columns={{ mobile: 1, tablet: 2, desktop: 3 }} gap="md">
              {languages.map(lang => (
                <LanguageCard
                  key={lang.code}
                  selected={selectedLanguage === lang.code}
                  interactive
                  onClick={() => handleLanguageSelect(lang.code)}
                >
                  <div style={{ fontSize: '3rem', marginBottom: theme.spacing.md }}>
                    {lang.flag}
                  </div>
                  <Heading2 center>{lang.name}</Heading2>
                  <BodyText center size="small" color={theme.colors.textSecondary}>
                    {lang.progress}% Complete
                  </BodyText>
                  <ProgressBar
                    value={lang.progress}
                    height="6px"
                    animated
                    color={
                      selectedLanguage === lang.code
                        ? theme.colors.primary
                        : theme.colors.textSecondary
                    }
                  />
                </LanguageCard>
              ))}
            </ResponsiveGrid>
          </CardContent>
        </Card>

        {/* Statistics Section */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Your Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveGrid columns={{ mobile: 2, tablet: 4, desktop: 4 }} gap="md">
              {stats.map((stat, index) => (
                <StatCard key={index} highlight={stat.highlight}>
                  <Heading2>{stat.value}</Heading2>
                  <BodyText size="small" center color={theme.colors.textSecondary}>
                    {stat.label}
                  </BodyText>
                </StatCard>
              ))}
            </ResponsiveGrid>
          </CardContent>
        </Card>

        {/* Form Section */}
        <Card variant="default">
          <CardHeader>
            <CardTitle>User Preferences</CardTitle>
          </CardHeader>
          <CardContent>
            <Form onSubmit={e => e.preventDefault()}>
              <ResponsiveGrid columns={{ mobile: 1, tablet: 2 }} gap="md">
                <FieldGroup>
                  <Label required>Display Name</Label>
                  <Input
                    type="text"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                  />
                </FieldGroup>

                <FieldGroup>
                  <Label>Current Level</Label>
                  <Select
                    value={formData.level}
                    onChange={e => setFormData({ ...formData, level: e.target.value })}
                  >
                    <option value="">Select level</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </Select>
                </FieldGroup>
              </ResponsiveGrid>

              <FlexContainer justify="end" gap="sm">
                <BaseButton variant="outline" type="button">
                  Cancel
                </BaseButton>
                <BaseButton variant="primary" type="submit">
                  Save Preferences
                </BaseButton>
              </FlexContainer>
            </Form>
          </CardContent>
        </Card>

        {/* Responsive Visibility Demo */}
        <Card variant="outlined">
          <CardContent>
            <ShowOnMobile>
              <Alert variant="info">📱 This message only appears on mobile devices</Alert>
            </ShowOnMobile>

            <HideOnMobile>
              <Alert variant="info">💻 This message is hidden on mobile devices</Alert>
            </HideOnMobile>

            <BodyText center>
              Resize your browser window to see responsive behavior in action!
            </BodyText>
          </CardContent>
        </Card>

        {/* Button Showcase */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Button Variants & Sizes</CardTitle>
          </CardHeader>
          <CardContent>
            <FlexContainer direction="column" gap="lg">
              {/* Button variants */}
              <div>
                <BodyText weight={500}>Variants:</BodyText>
                <FlexContainer gap="sm" wrap>
                  <BaseButton variant="primary">Primary</BaseButton>
                  <BaseButton variant="secondary">Secondary</BaseButton>
                  <BaseButton variant="outline">Outline</BaseButton>
                  <BaseButton variant="ghost">Ghost</BaseButton>
                  <BaseButton variant="danger">Danger</BaseButton>
                </FlexContainer>
              </div>

              {/* Button sizes */}
              <div>
                <BodyText weight={500}>Sizes:</BodyText>
                <FlexContainer gap="sm" wrap>
                  <BaseButton variant="primary" size="sm">
                    Small
                  </BaseButton>
                  <BaseButton variant="primary" size="md">
                    Medium
                  </BaseButton>
                  <BaseButton variant="primary" size="lg">
                    Large
                  </BaseButton>
                  <BaseButton variant="primary" size="xl">
                    Extra Large
                  </BaseButton>
                </FlexContainer>
              </div>
            </FlexContainer>
          </CardContent>
        </Card>
      </Container>
    </Container>
  );
};
