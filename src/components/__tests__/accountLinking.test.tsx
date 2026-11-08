import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@emotion/react';
import { AccountLinking } from '../AccountLinking';
import { theme } from '../../styles/theme';

jest.mock('../../config/environment', () => ({
  environmentConfig: { enableRemoteStorage: false },
}));
jest.mock('../../services/storage/remoteStorage', () => ({
  remoteStorage: { getLinkedDevicesCount: jest.fn().mockResolvedValue(1) },
}));

describe('AccountLinking', () => {
  it('explains local-only progress and disables volatile remote account actions', () => {
    render(
      <ThemeProvider theme={theme}>
        <AccountLinking />
      </ThemeProvider>
    );

    expect(screen.getByText(/Progress is saved on this device only/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Account Code' })).toBeDisabled();
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Link This Device' })).toBeDisabled();
  });
});
