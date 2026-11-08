import { ThemeProvider } from '@emotion/react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { SettingsPage } from '../SettingsPage';
import { theme } from '../../styles/theme';
import { dataTransferService } from '../../services/dataTransferService';

jest.mock('../Navigation', () => ({ Navigation: () => null }));
jest.mock('../AccountLinking', () => ({ AccountLinking: () => null }));
jest.mock('../../services/pwaUpdateManager', () => ({
  pwaUpdateManager: { getPendingUpdate: () => null },
}));
jest.mock('../../services/dataTransferService', () => ({
  dataTransferService: {
    downloadExport: jest.fn<Promise<void>, []>(),
    previewImport: jest.fn<ReturnType<typeof dataTransferService.previewImport>, [File]>(),
    importData: jest.fn<
      ReturnType<typeof dataTransferService.importData>,
      Parameters<typeof dataTransferService.importData>
    >(),
  },
}));

const transferService = jest.mocked(dataTransferService);

function renderSettings() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <SettingsPage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe('Settings data transfer actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('exports from Settings and reports success or failure', async () => {
    const user = userEvent.setup();
    renderSettings();

    transferService.downloadExport.mockImplementationOnce(() => undefined);
    await user.click(screen.getByRole('button', { name: 'Export Learning Data' }));
    expect(transferService.downloadExport).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Your learning data was downloaded successfully.'
    );

    transferService.downloadExport.mockImplementationOnce(() => {
      throw new Error('download failed');
    });
    await user.click(screen.getByRole('button', { name: 'Export Learning Data' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Export failed.');
  });

  it('previews an import, allows cancellation without importing, and reports import success', async () => {
    const user = userEvent.setup();
    renderSettings();

    const preview = {
      success: true,
      data: {
        version: '2.0.0',
        exportDate: '2026-11-08T00:00:00.000Z',
        totalWords: 2,
        languages: [
          { code: 'de', name: 'German', wordCount: 1, totalXP: 10 },
          { code: 'es', name: 'Spanish', wordCount: 1, totalXP: 20 },
        ],
      },
    };
    transferService.previewImport.mockResolvedValue(preview);

    await user.click(screen.getByRole('button', { name: 'Import from Device' }));
    const file = new File(['{}'], 'levelup.json', { type: 'application/json' });
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).not.toBeNull();
    fireEvent.change(fileInput as HTMLInputElement, { target: { files: [file] } });

    const dialog = await screen.findByRole('dialog', { name: 'Import Progress Data' });
    expect(transferService.previewImport).toHaveBeenCalledWith(file);
    expect(within(dialog).getByRole('checkbox', { name: /German/ })).toBeChecked();
    expect(within(dialog).getByRole('checkbox', { name: /Spanish/ })).toBeChecked();

    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(transferService.importData).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Import from Device' }));
    fireEvent.change(fileInput as HTMLInputElement, { target: { files: [file] } });
    const reopenedDialog = await screen.findByRole('dialog', { name: 'Import Progress Data' });
    await user.click(within(reopenedDialog).getByRole('checkbox', { name: /Spanish/ }));
    transferService.importData.mockResolvedValueOnce({
      success: true,
      message: 'Successfully imported 1 language: de',
      importedLanguages: ['de'],
    });
    await user.click(
      within(reopenedDialog).getByRole('button', { name: 'Import Selected Languages' })
    );

    await waitFor(() => {
      expect(transferService.importData).toHaveBeenCalledWith(file, {
        selectedLanguages: ['de'],
        mergeWithExisting: true,
        overwriteExisting: false,
      });
    });
    expect(await within(reopenedDialog).findByRole('status')).toHaveTextContent(
      'Reload the app to show the imported progress.'
    );
    expect(within(reopenedDialog).getByRole('button', { name: 'Reload App' })).toBeInTheDocument();
  });

  it('shows invalid-file errors rather than silently ignoring them', async () => {
    const user = userEvent.setup();
    renderSettings();
    transferService.previewImport.mockResolvedValueOnce({
      success: false,
      error: 'Invalid export file format',
    });

    await user.click(screen.getByRole('button', { name: 'Import from Device' }));
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, {
      target: { files: [new File(['bad'], 'invalid.json', { type: 'application/json' })] },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid export file format');
    expect(transferService.importData).not.toHaveBeenCalled();
  });
});
