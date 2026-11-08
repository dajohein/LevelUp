import { ThemeProvider } from '@emotion/react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Navigation } from '../Navigation';
import { theme } from '../../styles/theme';
import { useViewport } from '../../hooks/useViewport';
import { useNavigationProgress } from '../../hooks/useNavigationProgress';
import { getLevelInfo } from '../../services/levelService';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => ({ language: null })),
}));
jest.mock('../../hooks/useViewport');
jest.mock('../../hooks/useNavigationProgress');

const mockViewport = jest.mocked(useViewport);
const mockProgress = jest.mocked(useNavigationProgress);

function getControlledPanel(trigger: HTMLElement): HTMLElement {
  const id = trigger.getAttribute('aria-controls');
  const panel = id ? document.getElementById(id) : null;
  if (!panel) throw new Error('Navigation trigger must control an existing panel');
  return panel;
}

function NavigationPage({ showUserProfile = true }: { showUserProfile?: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <Navigation showUserProfile={showUserProfile} />
      <button onClick={() => navigate('/settings')}>Outside navigation</button>
      <output aria-label="Current route">{location.pathname}</output>
    </>
  );
}

function renderNavigation(isMobile: boolean, path = '/', showUserProfile = true) {
  mockViewport.mockReturnValue({
    width: isMobile ? 375 : 1024,
    height: 800,
    isMobile,
    isTablet: false,
    isDesktop: !isMobile,
    orientation: 'portrait',
    safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
  });
  mockProgress.mockReturnValue({
    isGlobalView: path === '/',
    currentLevel: 1,
    levelInfo: getLevelInfo(1),
    userProgress: {},
    totalXP: 0,
  });
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter
        initialEntries={[path]}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route
            path="/language/:languageCode/*"
            element={<NavigationPage showUserProfile={showUserProfile} />}
          />
          <Route path="*" element={<NavigationPage showUserProfile={showUserProfile} />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe.each([
  { device: 'desktop', isMobile: false, triggerName: 'User navigation', firstLink: /Profile/ },
  { device: 'mobile', isMobile: true, triggerName: 'Navigation', firstLink: 'Home' },
])('$device navigation disclosure', ({ isMobile, triggerName, firstLink }) => {
  test.each(['{Enter}', ' '])(
    'opens with %s, focuses links, and returns focus on Escape',
    async key => {
      const user = userEvent.setup();
      renderNavigation(isMobile);
      const trigger = screen.getByRole('button', { name: triggerName });
      const panel = getControlledPanel(trigger);

      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(panel).toHaveAttribute('hidden');
      expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument();
      await user.tab();
      expect(trigger).toHaveFocus();
      await user.keyboard(key);

      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      expect(panel).not.toHaveAttribute('hidden');
      expect(within(panel).getByRole('link', { name: firstLink })).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(trigger).toHaveFocus();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
      expect(panel).toHaveAttribute('hidden');
    }
  );

  test('closed links are skipped and Tab can leave the open disclosure without a focus trap', async () => {
    const user = userEvent.setup();
    renderNavigation(isMobile);
    const trigger = screen.getByRole('button', { name: triggerName });
    await user.tab();
    if (isMobile) {
      await user.tab();
      expect(screen.getByRole('link', { name: 'View Profile' })).toHaveFocus();
    }
    await user.tab();
    expect(screen.getByRole('button', { name: 'Outside navigation' })).toHaveFocus();
    await user.click(trigger);
    const panel = getControlledPanel(trigger);
    const controls = within(panel).getAllByRole('link');
    for (const link of controls.slice(1)) {
      await user.tab();
      expect(link).toHaveFocus();
    }
    if (isMobile) {
      await user.tab();
      expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveFocus();
    }
    await user.tab();
    expect(screen.getByRole('button', { name: 'Outside navigation' })).toHaveFocus();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('Settings is keyboard reachable and navigates while dismissing the disclosure', async () => {
    const user = userEvent.setup();
    renderNavigation(isMobile);
    await user.tab();
    await user.keyboard('{Enter}');
    const settings = screen.getByRole('link', { name: /Settings/ });
    const links = screen.getAllByRole('link');
    for (let index = 0; index < links.length && document.activeElement !== settings; index++) {
      await user.tab();
    }
    expect(settings).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/settings');
    expect(screen.getByRole('button', { name: triggerName })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  test('Shift+Tab from the first link keeps the preceding control visible and focused', async () => {
    const user = userEvent.setup();
    renderNavigation(isMobile);
    const trigger = screen.getByRole('button', { name: triggerName });
    await user.click(trigger);
    await user.tab({ shift: true });
    if (isMobile) {
      expect(screen.getByRole('link', { name: 'View Profile' })).toHaveFocus();
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    } else {
      expect(trigger).toHaveFocus();
      expect(trigger).toHaveAttribute('aria-expanded', 'true');
      await user.keyboard(' ');
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    }
  });

  test('outside pointer interaction dismisses without stealing focus', async () => {
    const user = userEvent.setup();
    renderNavigation(isMobile);
    const trigger = screen.getByRole('button', { name: triggerName });
    await user.click(trigger);
    const outside = screen.getByRole('button', { name: 'Outside navigation' });
    await user.click(outside);
    expect(outside).toHaveFocus();
    expect(screen.getByRole('button', { name: triggerName })).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });
});

test.each(['de', 'es'])('mobile language links keep the %s route scope', async language => {
  const user = userEvent.setup();
  renderNavigation(true, `/language/${language}`);
  await user.click(screen.getByRole('button', { name: 'Navigation' }));
  expect(screen.getByRole('link', { name: 'View Modules' })).toHaveAttribute(
    'href',
    `/language/${language}`
  );
  expect(screen.getByRole('link', { name: 'Quick Practice' })).toHaveAttribute(
    'href',
    `/sessions/${language}`
  );
  await user.click(screen.getByRole('link', { name: 'Quick Practice' }));
  expect(screen.getByLabelText('Current route')).toHaveTextContent(`/sessions/${language}`);
  expect(screen.getByRole('button', { name: 'Navigation' })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
});

test('mobile close control returns focus, and the compact profile link has a stable name', async () => {
  const user = userEvent.setup();
  renderNavigation(true);
  const trigger = screen.getByRole('button', { name: 'Navigation' });
  await user.click(trigger);
  await user.click(screen.getByRole('button', { name: 'Close navigation' }));
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await user.tab();
  expect(screen.getByRole('link', { name: 'View Profile' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(screen.getByLabelText('Current route')).toHaveTextContent('/profile');
});

test('desktop profile disclosure remains available with existing progress', async () => {
  const user = userEvent.setup();
  renderNavigation(false);
  mockProgress.mockReturnValue({
    isGlobalView: true,
    currentLevel: 1,
    levelInfo: getLevelInfo(1),
    userProgress: { hasProgress: true },
    totalXP: 100,
  });
  await user.click(screen.getByRole('button', { name: 'User navigation' }));
  expect(screen.getByText('100 XP')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Developer Dashboard/ })).toHaveAttribute(
    'href',
    '/developer-dashboard'
  );
  const changeLanguage = screen.getByRole('link', { name: /Change Language/ });
  expect(changeLanguage).toHaveAttribute('href', '/');
  await user.click(changeLanguage);
  expect(screen.getByRole('button', { name: 'User navigation' })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
});

test.each([false, true])('hiding the user profile is respected (mobile: %s)', isMobile => {
  renderNavigation(isMobile, '/', false);
  expect(screen.queryByRole('button', { name: 'User navigation' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'View Profile' })).not.toBeInTheDocument();
});
