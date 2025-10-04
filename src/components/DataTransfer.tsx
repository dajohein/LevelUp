import React, { useState, useRef } from 'react';
import styled from '@emotion/styled';
import { FaDownload, FaUpload, FaFileExport, FaFileImport, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { dataTransferService, ImportResult } from '../services/dataTransferService';
import { logger } from '../services/logger';

const Container = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: ${props => props.theme.spacing.xl};
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const Title = styled.h2`
  color: ${props => props.theme.colors.text};
  font-size: 1.5rem;
  margin-bottom: ${props => props.theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.md};
`;

const Description = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: ${props => props.theme.spacing.lg};
  line-height: 1.6;
`;

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${props => props.theme.spacing.lg};
  margin-bottom: ${props => props.theme.spacing.lg};

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ActionCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: ${props => props.theme.spacing.lg};
`;

const ActionTitle = styled.h3`
  color: ${props => props.theme.colors.text};
  font-size: 1.1rem;
  margin-bottom: ${props => props.theme.spacing.sm};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const ActionDescription = styled.p`
  color: ${props => props.theme.colors.textSecondary};
  font-size: 0.9rem;
  margin-bottom: ${props => props.theme.spacing.md};
  line-height: 1.5;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' | 'success' | 'warning' }>`
  background: ${props => {
    switch (props.variant) {
      case 'success': return 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
      case 'warning': return 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)';
      case 'secondary': return 'rgba(255, 255, 255, 0.1)';
      default: return 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)';
    }
  }};
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 20px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  justify-content: center;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const HiddenFileInput = styled.input`
  display: none;
`;

const ImportModal = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  border-radius: 16px;
  padding: 2rem;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
`;

const ModalTitle = styled.h3`
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.lg};
  display: flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
`;

const PreviewCard = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: ${props => props.theme.spacing.md};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const PreviewItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0;
  color: ${props => props.theme.colors.textSecondary};
`;

const LanguageList = styled.div`
  max-height: 200px;
  overflow-y: auto;
  margin: ${props => props.theme.spacing.md} 0;
`;

const LanguageCheckbox = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  
  input {
    margin: 0;
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: ${props => props.theme.spacing.lg};
`;

const StatusMessage = styled.div<{ type: 'success' | 'error' | 'warning' }>`
  background: ${props => {
    switch (props.type) {
      case 'success': return 'rgba(76, 175, 80, 0.2)';
      case 'error': return 'rgba(244, 67, 54, 0.2)';
      case 'warning': return 'rgba(255, 152, 0, 0.2)';
    }
  }};
  border: 1px solid ${props => {
    switch (props.type) {
      case 'success': return 'rgba(76, 175, 80, 0.5)';
      case 'error': return 'rgba(244, 67, 54, 0.5)';
      case 'warning': return 'rgba(255, 152, 0, 0.5)';
    }
  }};
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
  color: ${props => props.theme.colors.text};
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const DataTransfer: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [importModal, setImportModal] = useState<{
    isOpen: boolean;
    preview?: any;
    selectedLanguages: string[];
    mergeMode: boolean;
  }>({
    isOpen: false,
    selectedLanguages: [],
    mergeMode: true
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await dataTransferService.downloadExport();
      logger.info('✅ Export completed successfully');
    } catch (error) {
      logger.error('❌ Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const preview = await dataTransferService.previewImport(file);
      
      if (preview.success && preview.data) {
        setImportModal({
          isOpen: true,
          preview: { file, ...preview.data },
          selectedLanguages: preview.data.languages.map(l => l.code),
          mergeMode: true
        });
      } else {
        alert(`Invalid file: ${preview.error}`);
      }
    } catch (error) {
      logger.error('❌ File preview failed:', error);
      alert('Could not read the selected file. Please choose a valid LevelUp export file.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    if (!importModal.preview?.file) return;

    try {
      const result = await dataTransferService.importData(importModal.preview.file, {
        selectedLanguages: importModal.selectedLanguages,
        mergeWithExisting: importModal.mergeMode,
        overwriteExisting: !importModal.mergeMode
      });

      setImportResult(result);
      
      if (result.success && result.importedLanguages && result.importedLanguages.length > 0) {
        // Close modal and refresh page after successful import
        setTimeout(() => {
          setImportModal({ ...importModal, isOpen: false });
          if (confirm('Import completed! The page will reload to refresh all data.')) {
            window.location.reload();
          }
        }, 2000);
      }
    } catch (error) {
      logger.error('❌ Import failed:', error);
      setImportResult({
        success: false,
        message: 'Import failed due to an unexpected error.'
      });
    }
  };

  const toggleLanguageSelection = (languageCode: string) => {
    setImportModal(prev => ({
      ...prev,
      selectedLanguages: prev.selectedLanguages.includes(languageCode)
        ? prev.selectedLanguages.filter(code => code !== languageCode)
        : [...prev.selectedLanguages, languageCode]
    }));
  };

  const selectAllLanguages = () => {
    if (!importModal.preview?.languages) return;
    setImportModal(prev => ({
      ...prev,
      selectedLanguages: prev.preview.languages.map((l: any) => l.code)
    }));
  };

  const selectNoLanguages = () => {
    setImportModal(prev => ({
      ...prev,
      selectedLanguages: []
    }));
  };

  return (
    <Container>
      <Title>
        <FaFileExport />
        Progress Transfer
      </Title>
      
      <Description>
        Transfer your learning progress between different LevelUp app instances. 
        Export your data to back it up or move it to another device, and import 
        progress from other LevelUp installations.
      </Description>

      <ActionGrid>
        <ActionCard>
          <ActionTitle>
            <FaDownload />
            Export Progress
          </ActionTitle>
          <ActionDescription>
            Download all your learning progress, including word mastery, XP, 
            and settings as a JSON file. This creates a complete backup of your data.
          </ActionDescription>
          <Button onClick={handleExport} disabled={isExporting}>
            <FaFileExport />
            {isExporting ? 'Exporting...' : 'Export All Data'}
          </Button>
        </ActionCard>

        <ActionCard>
          <ActionTitle>
            <FaUpload />
            Import Progress
          </ActionTitle>
          <ActionDescription>
            Import progress from another LevelUp app. You can choose which languages 
            to import and whether to merge with or replace your existing progress.
          </ActionDescription>
          <Button onClick={() => fileInputRef.current?.click()}>
            <FaFileImport />
            Choose Import File
          </Button>
          <HiddenFileInput
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileSelect}
          />
        </ActionCard>
      </ActionGrid>

      {/* Import Modal */}
      <ImportModal isOpen={importModal.isOpen}>
        <ModalContent>
          <ModalTitle>
            <FaFileImport />
            Import Progress Data
          </ModalTitle>

          {importModal.preview && (
            <>
              <PreviewCard>
                <h4 style={{ margin: '0 0 12px 0', color: '#fff' }}>File Preview</h4>
                <PreviewItem>
                  <span>Export Version:</span>
                  <span>{importModal.preview.version}</span>
                </PreviewItem>
                <PreviewItem>
                  <span>Export Date:</span>
                  <span>{new Date(importModal.preview.exportDate).toLocaleDateString()}</span>
                </PreviewItem>
                <PreviewItem>
                  <span>Total Words:</span>
                  <span>{importModal.preview.totalWords}</span>
                </PreviewItem>
                <PreviewItem>
                  <span>Languages:</span>
                  <span>{importModal.preview.languages.length}</span>
                </PreviewItem>
              </PreviewCard>

              <div>
                <h4 style={{ margin: '12px 0', color: '#fff' }}>Select Languages to Import</h4>
                <ButtonRow>
                  <Button variant="secondary" onClick={selectAllLanguages}>
                    Select All
                  </Button>
                  <Button variant="secondary" onClick={selectNoLanguages}>
                    Select None
                  </Button>
                </ButtonRow>
                
                <LanguageList>
                  {importModal.preview.languages.map((language: any) => (
                    <LanguageCheckbox key={language.code}>
                      <input
                        type="checkbox"
                        checked={importModal.selectedLanguages.includes(language.code)}
                        onChange={() => toggleLanguageSelection(language.code)}
                      />
                      <span>
                        {language.name} ({language.wordCount} words, {language.totalXP} XP)
                      </span>
                    </LanguageCheckbox>
                  ))}
                </LanguageList>
              </div>

              <div>
                <h4 style={{ margin: '12px 0', color: '#fff' }}>Import Mode</h4>
                <LanguageCheckbox>
                  <input
                    type="radio"
                    name="importMode"
                    checked={importModal.mergeMode}
                    onChange={() => setImportModal(prev => ({ ...prev, mergeMode: true }))}
                  />
                  <span>Merge with existing progress (recommended)</span>
                </LanguageCheckbox>
                <LanguageCheckbox>
                  <input
                    type="radio"
                    name="importMode"
                    checked={!importModal.mergeMode}
                    onChange={() => setImportModal(prev => ({ ...prev, mergeMode: false }))}
                  />
                  <span>Replace existing progress (overwrites current data)</span>
                </LanguageCheckbox>
              </div>

              {importResult && (
                <StatusMessage type={importResult.success ? 'success' : 'error'}>
                  {importResult.success ? <FaCheckCircle /> : <FaExclamationTriangle />}
                  <div>
                    <div>{importResult.message}</div>
                    {importResult.errors && (
                      <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                        {importResult.errors.map((error, index) => (
                          <div key={index}>• {error}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </StatusMessage>
              )}

              <ButtonRow>
                <Button
                  variant="success"
                  onClick={handleImport}
                  disabled={importModal.selectedLanguages.length === 0 || importResult?.success}
                >
                  <FaUpload />
                  Import Selected Languages
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setImportModal({ ...importModal, isOpen: false });
                    setImportResult(null);
                  }}
                >
                  Cancel
                </Button>
              </ButtonRow>
            </>
          )}
        </ModalContent>
      </ImportModal>
    </Container>
  );
};