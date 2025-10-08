# Unified Component Library

A comprehensive design system with standardized CSS components for the LevelUp application.

## 🎨 Architecture

### **Separation of Concerns**
- **Components**: `/src/components/ui/` - React component implementations
- **Styles**: `/src/styles/components/` - Pure CSS-in-JS styled components
- **Theme**: `/src/styles/theme.ts` - Design tokens and configuration
- **Types**: `/src/styles/types.ts` - TypeScript type definitions

### **Key Features**
- ✅ **Fully typed** with TypeScript
- ✅ **Mobile-first responsive design**
- ✅ **Dark theme optimized**
- ✅ **Accessibility focused** (WCAG guidelines)
- ✅ **Touch-friendly** (44px+ touch targets)
- ✅ **Performance optimized** with Emotion
- ✅ **Language isolation compliant**

## 🚀 Quick Start

```tsx
import { 
  BaseButton, 
  Card, 
  Heading1, 
  Container,
  theme 
} from '@/components/ui';

function MyComponent() {
  return (
    <Container padding center>
      <Card variant="glass" interactive>
        <Heading1 center>Welcome to LevelUp</Heading1>
        <BaseButton variant="primary" size="lg">
          Get Started
        </BaseButton>
      </Card>
    </Container>
  );
}
```

## 📚 Component Categories

### **1. Buttons**
- `BaseButton` - Primary button component with variants
- `IconButton` - Square button for icons
- `FAB` - Floating Action Button
- `ButtonGroup` - Group multiple buttons

**Variants**: `primary`, `secondary`, `outline`, `ghost`, `danger`
**Sizes**: `sm`, `md`, `lg`, `xl`

### **2. Cards**
- `Card` - Base card component
- `StatCard` - Statistics display card
- `LanguageCard` - Language selection card
- `CardGrid`, `CardRow` - Layout components

**Variants**: `default`, `elevated`, `outlined`, `glass`, `highlight`

### **3. Typography**
- `Heading1`, `Heading2`, `Heading3` - Semantic headings
- `BodyText` - Paragraph text with sizes
- `SmallText` - Secondary text
- `Link` - Styled links
- `GradientText` - Text with gradient effects

### **4. Forms**
- `Input`, `Textarea`, `Select` - Form controls
- `Checkbox`, `Radio` - Selection inputs
- `Form`, `FieldGroup` - Layout components
- `ErrorText`, `HelpText` - Validation feedback

### **5. Layout & Containers**
- `Container` - Max-width content container
- `PageContainer` - Full-page layout wrapper
- `FlexContainer`, `GridContainer` - Flexible layouts
- `Section`, `HeroSection` - Semantic sections

### **6. Navigation**
- `Header`, `Footer` - Page structure
- `NavBar`, `NavItem` - Navigation components
- `TabList`, `Tab` - Tab navigation
- `Breadcrumb` - Breadcrumb navigation

### **7. Progress & Loading**
- `ProgressBar` - Linear progress indicator
- `CircularProgress` - Circular progress
- `LoadingSpinner` - Simple spinner
- `Skeleton` - Loading placeholders
- `MasteryGauge` - App-specific mastery display

### **8. Feedback & Modals**
- `Alert`, `Toast` - Notifications
- `Modal*` components - Modal dialogs
- `Tooltip` - Contextual tooltips
- `FeedbackOverlay` - Game feedback
- `EmptyState`, `ErrorContainer` - State components

### **9. Responsive Layouts**
- `ResponsiveGrid` - Adaptive grid
- `ResponsiveFlex` - Breakpoint-aware flex
- `ShowOnMobile`, `HideOnMobile` - Visibility helpers
- `TwoColumnLayout` - Common two-column pattern

## 🎨 Theme System

```tsx
const theme = {
  colors: {
    primary: '#4CAF50',     // Brand green
    secondary: '#2E7D32',   // Darker green
    background: '#121212',  // Dark background
    surface: '#1E1E1E',     // Card backgrounds
    text: '#FFFFFF',        // Primary text
    textSecondary: '#B0B0B0', // Secondary text
    error: '#CF6679',       // Error states
    success: '#4CAF50',     // Success states
  },
  spacing: {
    xs: '0.25rem',  // 4px
    sm: '0.5rem',   // 8px
    md: '1rem',     // 16px
    lg: '1.5rem',   // 24px
    xl: '2rem',     // 32px
    xxl: '3rem',    // 48px
  },
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    large: '1440px',
  },
  typography: {
    h1: { fontSize: '2.5rem', fontWeight: 600 },
    h2: { fontSize: '2rem', fontWeight: 600 },
    h3: { fontSize: '1.5rem', fontWeight: 600 },
    body: { fontSize: '1rem', fontWeight: 400 },
    small: { fontSize: '0.875rem', fontWeight: 400 },
  }
}
```

## 📱 Responsive Design Patterns

### **Mobile-First Approach**
```tsx
// Responsive grid that adapts to screen size
<ResponsiveGrid 
  columns={{
    mobile: 1,
    tablet: 2,
    desktop: 3
  }}
  gap="md"
>
  <Card>Content 1</Card>
  <Card>Content 2</Card>
  <Card>Content 3</Card>
</ResponsiveGrid>
```

### **Breakpoint Utilities**
```tsx
<>
  <ShowOnMobile>
    <MobileNavigation />
  </ShowOnMobile>
  
  <HideOnMobile>
    <DesktopNavigation />
  </HideOnMobile>
</>
```

## 🔧 Component Patterns

### **Common Button Patterns**
```tsx
// Primary action
<BaseButton variant="primary" size="lg" fullWidth>
  Start Learning
</BaseButton>

// Secondary action
<BaseButton variant="outline" size="md">
  Learn More
</BaseButton>

// Icon button
<IconButton variant="ghost">
  <FaSettings />
</IconButton>

// Button group
<ButtonGroup orientation="horizontal">
  <BaseButton variant="outline">Previous</BaseButton>
  <BaseButton variant="primary">Next</BaseButton>
</ButtonGroup>
```

### **Card Layouts**
```tsx
// Interactive language card
<LanguageCard 
  selected={selectedLanguage === 'de'}
  onClick={() => setLanguage('de')}
>
  <span role="img">🇩🇪</span>
  <Heading3>German</Heading3>
  <BodyText size="small">Learn German vocabulary</BodyText>
</LanguageCard>

// Statistics card
<StatCard highlight={isTopPerformer}>
  <Heading2>{score}</Heading2>
  <SmallText>Points</SmallText>
</StatCard>
```

### **Form Patterns**
```tsx
<Form onSubmit={handleSubmit}>
  <FieldGroup>
    <Label required>Username</Label>
    <Input 
      type="text"
      placeholder="Enter username"
      variant={errors.username ? 'error' : 'default'}
    />
    {errors.username && (
      <ErrorText>{errors.username}</ErrorText>
    )}
  </FieldGroup>
  
  <BaseButton type="submit" variant="primary" fullWidth>
    Create Account
  </BaseButton>
</Form>
```

## 🎯 Migration Guide

### **Before (Direct styled components)**
```tsx
const StyledCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 1.5rem;
  // ... more styles
`;
```

### **After (Unified library)**
```tsx
import { Card } from '@/components/ui';

<Card variant="default" padding="lg">
  {content}
</Card>
```

## 📋 Best Practices

### **1. Use Semantic Components**
```tsx
// ✅ Good - semantic and accessible
<Heading1>Page Title</Heading1>
<BodyText>Description text</BodyText>

// ❌ Avoid - non-semantic
<div style={{ fontSize: '2.5rem', fontWeight: 600 }}>Title</div>
```

### **2. Responsive Design**
```tsx
// ✅ Good - mobile-first responsive
<ResponsiveText
  size={{
    mobile: '1rem',
    tablet: '1.125rem',
    desktop: '1.25rem'
  }}
>
  Responsive text
</ResponsiveText>

// ❌ Avoid - hardcoded breakpoints
<div css={css`
  @media (max-width: 768px) { font-size: 16px; }
`}>
```

### **3. Theme Consistency**
```tsx
// ✅ Good - use theme tokens
<BaseButton variant="primary">Action</BaseButton>

// ❌ Avoid - hardcoded colors
<button style={{ backgroundColor: '#4CAF50' }}>Action</button>
```

### **4. Language Isolation**
```tsx
// ✅ Good - language-scoped components
<LanguageCard selected={currentLanguage === 'de'}>
  German Content
</LanguageCard>

// ❌ Avoid - mixed language data
<Card>{germanData.title} - {spanishData.subtitle}</Card>
```

## 🔍 Performance Notes

- **Tree Shaking**: Import only needed components
- **Bundle Size**: Optimized with Emotion's compile-time optimizations
- **Runtime Performance**: Minimal re-renders with stable theme object
- **Memory Usage**: Reusable styled components reduce memory footprint

## 🚀 Future Enhancements

- [ ] **Storybook Integration** - Visual component documentation
- [ ] **Accessibility Testing** - Automated a11y validation
- [ ] **Animation Library** - Pre-built micro-interactions
- [ ] **Icon System** - Standardized icon components
- [ ] **Color Variants** - Light theme support
- [ ] **Component Analytics** - Usage tracking and optimization

---

*This unified component library provides a solid foundation for consistent, maintainable, and scalable UI development while maintaining the architectural principles of language data isolation and performance optimization.*