// Unified UI Component Library
// Import all styled components and export them as a cohesive library

// Base components
export * from '../../styles/components/buttons';
export * from '../../styles/components/cards';
export * from '../../styles/components/containers';
export * from '../../styles/components/forms';
export * from '../../styles/components/typography';
export * from '../../styles/components/progress';
export * from '../../styles/components/feedback';
export * from '../../styles/components/navigation';
export * from '../../styles/components/layouts';

// Game-specific components (Phase 2+)
export * from '../../styles/components/badges';
export * from '../../styles/components/gameCards';
export * from '../../styles/components/interactive';
export * from '../../styles/components/dataDisplay';
export * from '../../styles/components/gameLayouts';
export * from '../../styles/components/gameUI';

// Animations and utilities
export * from '../../styles/components/animations';
export * from '../../styles/types';

// Re-export theme for convenience
export { theme } from '../../styles/theme';

// Component groups for easier importing
export {
  // Buttons
  BaseButton,
  IconButton,
  FAB,
  ButtonGroup,
} from '../../styles/components/buttons';

export {
  // Cards
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  StatCard,
  LanguageCard,
  CardGrid,
  CardRow,
} from '../../styles/components/cards';

export {
  // Layout & Containers
  Container,
  Section,
  FlexContainer,
  GridContainer,
  ContentWrapper,
  Spacer,
  CenteredContent,
  TwoColumnLayout,
  SidebarLayout,
  LayoutSidebar as Sidebar,
  MainContent,
  StickyContainer,
  ScrollContainer,
  ImageContainer,
} from '../../styles/components/containers';

export {
  // Typography
  Heading1,
  Heading2,
  Heading3,
  BodyText,
  SmallText,
  Link,
  GradientText,
  CodeText,
  HighlightText,
  EllipsisText,
} from '../../styles/components/typography';

export {
  // Forms
  Form,
  Input,
  Textarea,
  Select,
  Label,
  Checkbox,
  Radio,
  FieldGroup,
  FieldItem,
  HelpText,
  FormSection,
  FormActions,
  SearchInput,
} from '../../styles/components/forms';

export {
  // Progress indicators
  ProgressBar,
  CircularProgress,
  LoadingSpinner,
  Skeleton,
  LoadingDots,
  StepIndicator,
  Step,
  ProgressRing,
  MasteryGauge,
} from '../../styles/components/progress';

export {
  // Feedback components
  Alert,
  Toast,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  LoadingOverlay,
  ErrorContainer,
  EmptyState,
  Tooltip,
  FeedbackOverlay,
  CloseButton,
} from '../../styles/components/feedback';

export {
  // Navigation
  Layout,
  Header,
  Main,
  Footer,
  NavBar,
  NavItem,
  Breadcrumb,
  TabList,
  Tab,
} from '../../styles/components/navigation';

export {
  // Responsive layouts
  ResponsiveGrid,
  ResponsiveFlex,
  ResponsiveContainer,
  ShowOnMobile,
  HideOnMobile,
  ShowOnTablet,
  ShowOnDesktop,
  ResponsiveCard,
  ResponsiveText,
  ResponsiveStack,
  Breakpoint,
} from '../../styles/components/layouts';

export {
  // Badge system
  Badge,
  DifficultyBadge,
  LevelBadge,
  AchievementBadge,
  StatusBadge,
  PulsingBadge,
  ActivityIndicator,
} from '../../styles/components/badges';

export {
  // Game-specific cards (using aliases to avoid duplicates)
  ModuleCard,
  WordCard,
  LanguageCard as GameLanguageCard, // Alias to avoid duplicate with base LanguageCard
  AnalyticCard,
  ActivityCard,
  RecommendationCard,
  SectionCard,
  FeedbackCard,
  ModuleGrid,
  LanguageGrid,
  AnalyticsGrid,
} from '../../styles/components/gameCards';

export {
  // Interactive components (using aliases to avoid duplicates)
  Tooltip as InteractiveTooltip, // Alias to avoid duplicate with base Tooltip
  ActionButton,
  FilterButton,
  QuickPracticeButton,
  ViewDetailsButton,
  DirectionalIcon,
  CloseButton as InteractiveCloseButton, // Alias to avoid duplicate with base CloseButton
  NavigationHint,
  ToggleButton,
  TooltipWrapper,
} from '../../styles/components/interactive';

export {
  // Data display components
  StatRow,
  StatLabel,
  StatValue,
  StatsContainer,
  ProgressStats,
  ScoreDisplay,
  ScoreValue,
  ScoreLabel,
  DataGrid,
  DataCell,
  KeyValuePair,
  KeyValueKey,
  KeyValueValue,
  AnalyticsSummary,
  ProgressMetrics,
  MetricItem,
  MetricValue,
  MetricLabel,
  WeeklyProgressItem,
  ProgressStatsLabel,
  ProgressStatsValue,
  DataTable,
  DataTableHeader,
  DataTableRow,
  QuickStats,
  TrendIndicator,
} from '../../styles/components/dataDisplay';

export {
  // Game layouts (using aliases to avoid duplicates)
  GameContainer,
  SessionLayout,
  AnalyticsLayout,
  ModuleLayout,
  LanguageOverviewLayout,
  SettingsLayout,
  ProfileLayout,
  ContentWrapper as GameContentWrapper, // Alias to avoid duplicate
  NavigationLayout,
  HeaderLayout,
  SectionLayout,
  GridLayout,
  FlexLayout,
  CenteredLayout,
  SidebarLayout as GameSidebarLayout, // Alias to avoid duplicate
  SidebarContent,
  MainContent as GameMainContent, // Alias to avoid duplicate
  ScrollableLayout,
  QuizLayout,
  MobileFirstLayout,
  PWALayout,
} from '../../styles/components/gameLayouts';

export {
  // Missing analytics components
  AnalyticValue,
  AnalyticLabel,
  WeekLabel,
  SectionHeader,
  AnalyticsProgressBar,
  AnalyticsTitle,
  AnalyticsSubSection,
} from '../../styles/components/dataDisplay';

export {
  // Module card child components  
  ModuleHeader,
  ModuleIcon,
  ModuleInfo,
  ModuleName,
  ModuleDescription,
  ModuleContent,
  ModuleActions,
  // Word card child components
  WordTerm,
  WordDefinition,
  MasteryInfo,
  MasteryBar,
  MasteryLevel,
  // Language card child components
  LanguageHeader,
  LanguageFlag,
  LanguageInfo,
  LanguageName,
  LanguageFrom,
} from '../../styles/components/gameCards';

export {
  // Game UI components
  SessionProgressBar,
  ProgressItem,
  ProgressValue,
  ProgressLabel,
  QuickDashContainer,
  DeepDiveContainer,
  StreakChallengeContainer,
  PrecisionModeContainer,
  BossBattleContainer,
  SpeedMeter,
  StreakMultiplier,
  AccuracyMeter,
  BrainMeter,
  BossAvatar,
  BossNamePlate,
  BossName,
  SkipButtonContainer,
  GameActionButton,
  BossIndicator,
} from '../../styles/components/gameUI';