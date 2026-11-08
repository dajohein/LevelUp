import { useState } from 'react';
import { ThemeProvider } from '@emotion/react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ConfirmationDialog } from '../ui/ConfirmationDialog';
import { SettingsPage } from '../SettingsPage';
import { UserProfilePage } from '../UserProfilePage';
import { theme } from '../../styles/theme';
import { useUserLearningProfile } from '../../hooks/useUserLearningProfile';

jest.mock('../Navigation', () => ({ Navigation: () => null }));
jest.mock('../DirectionalStats', () => ({ DirectionalStats: () => null }));
jest.mock('../UserProfile', () => ({ UserProfile: () => null }));
jest.mock('../StorageManagement', () => ({ StorageManagement: () => null }));
jest.mock('../DataTransfer', () => ({ DataTransfer: () => null }));
jest.mock('../LearningProfileSection', () => ({ LearningProfileDisplay: () => null }));
jest.mock('../../services/moduleService', () => ({ getAvailableLanguages: () => [] }));
jest.mock('../../services/progressService', () => ({ getAllLanguageProgress: () => ({}) }));
jest.mock('../../hooks/useUserLearningProfile');
jest.mock('../../services/pwaUpdateManager', () => ({
  pwaUpdateManager: { getPendingUpdate: () => null },
}));
jest.mock('../../services/storage/remoteStorage', () => ({
  remoteStorage: { getLinkedDevicesCount: async () => 1 },
}));

const mockProfile = jest.mocked(useUserLearningProfile);

beforeAll(() => {
  // jsdom does not implement the browser's modal dialog API.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});

function ConfirmationFixture({ loading = false }: { loading?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open reset</button>
      <ConfirmationDialog
        isOpen={open}
        onClose={() => setOpen(false)}
        onConfirm={jest.fn()}
        title="Reset Learning Profile"
        message="This cannot be undone."
        confirmText="Reset Profile"
        destructive
        isLoading={loading}
      />
    </>
  );
}

describe('accessible dialogs', () => {
  it('labels the reset dialog, focuses cancel, and restores focus on cancel and Escape', async () => {
    const user = userEvent.setup();
    render(<ConfirmationFixture />);
    const opener = screen.getByRole('button', { name: 'Open reset' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Reset Learning Profile' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(within(dialog).getByRole('button', { name: 'Close dialog' })).toBeEnabled();
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(opener).toHaveFocus();

    await user.click(opener);
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('blocks every dismissal and confirmation during reset loading', async () => {
    const user = userEvent.setup();
    render(<ConfirmationFixture loading />);
    await user.click(screen.getByRole('button', { name: 'Open reset' }));
    const dialog = screen.getByRole('dialog', { name: 'Reset Learning Profile' });
    expect(dialog).toHaveFocus();
    expect(within(dialog).getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Close dialog' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Reset Profile' })).toBeDisabled();
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
    fireEvent.click(dialog, { clientX: -1, clientY: -1 });
    expect(dialog).toBeInTheDocument();
  });

  it('wraps keyboard focus at both dialog boundaries', async () => {
    const user = userEvent.setup();
    const visibleRects = document.createElement('div').getClientRects();
    Object.defineProperty(visibleRects, 'length', { value: 1 });
    const rects = jest.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue(visibleRects);
    try {
      render(<ConfirmationFixture />);
      await user.click(screen.getByRole('button', { name: 'Open reset' }));
      const dialog = screen.getByRole('dialog');
      const close = within(dialog).getByRole('button', { name: 'Close dialog' });
      const confirm = within(dialog).getByRole('button', { name: 'Reset Profile' });
      close.focus();
      await user.tab({ shift: true });
      expect(confirm).toHaveFocus();
      await user.tab();
      expect(close).toHaveFocus();
    } finally {
      rects.mockRestore();
    }
  });

  it('opens device linking with a named dialog and restores the trigger on Escape or close', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <SettingsPage />
        </MemoryRouter>
      </ThemeProvider>
    );
    const opener = screen.getByRole('button', { name: 'Link Your Devices' });
    await user.click(opener);
    let dialog = screen.getByRole('dialog', { name: /Link Your Devices/ });
    const close = within(dialog).getByRole('button', { name: 'Close device linking' });
    expect(close).toHaveFocus();
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
    expect(opener).toHaveFocus();

    await user.click(opener);
    dialog = screen.getByRole('dialog', { name: /Link Your Devices/ });
    await user.click(within(dialog).getByRole('button', { name: 'Close device linking' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('runs only one reset when confirmation is triggered repeatedly before state updates', async () => {
    let finishReset!: () => void;
    const resetProfile = jest.fn(
      () =>
        new Promise<void>(resolve => {
          finishReset = resolve;
        })
    );
    mockProfile.mockReturnValue({
      profile: null,
      isLoading: false,
      error: null,
      updateProfile: jest.fn(),
      refreshProfile: jest.fn(),
      resetProfile,
      clearProfile: jest.fn(),
      isRefreshing: false,
      isResetting: false,
    });
    render(
      <ThemeProvider theme={theme}>
        <UserProfilePage />
      </ThemeProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    const confirm = screen.getByRole('button', { name: 'Reset Profile' });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
    expect(resetProfile).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await act(async () => finishReset());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
