/**
 * Account Linking Component
 *
 * Exposes development-only account linking without claiming progress sync
 */

import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { LoadingButton } from './feedback/UnifiedLoading';
import {
  remoteStorage,
  RemoteNetworkError,
  RemoteSessionError,
} from '../services/storage/remoteStorage';
import { logger } from '../services/logger';
import { environmentConfig } from '../config/environment';

const Container = styled.div`
  max-width: 500px;
  margin: 0 auto;
  padding: 24px;
  background: #f8f9fa;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
`;

const Title = styled.h2`
  color: #2c3e50;
  margin-bottom: 16px;
  text-align: center;
  font-size: 24px;
`;

const Section = styled.div`
  margin-bottom: 24px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  border-left: 4px solid #3498db;
`;

const SectionTitle = styled.h3`
  color: #34495e;
  margin-bottom: 12px;
  font-size: 18px;
`;

const Description = styled.p`
  color: #7f8c8d;
  margin-bottom: 16px;
  line-height: 1.5;
`;

const CodeDisplay = styled.div`
  background: #ecf0f1;
  padding: 16px;
  border-radius: 8px;
  text-align: center;
  margin: 16px 0;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
  letter-spacing: 2px;
  border: 2px dashed #bdc3c7;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  font-size: 18px;
  border: 2px solid #bdc3c7;
  border-radius: 8px;
  text-align: center;
  font-family: 'Monaco', 'Menlo', monospace;
  letter-spacing: 3px;
  text-transform: uppercase;

  &:focus {
    outline: none;
    border-color: #3498db;
    box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
  }

  &::placeholder {
    color: #95a5a6;
    text-transform: none;
    letter-spacing: normal;
    font-family: inherit;
  }
`;

const StatusMessage = styled.div<{ type: 'success' | 'error' | 'info' }>`
  padding: 12px 16px;
  border-radius: 8px;
  margin: 12px 0;
  font-weight: 500;

  ${props => {
    switch (props.type) {
      case 'success':
        return `
          background: #d5f4e6;
          color: #27ae60;
          border: 1px solid #27ae60;
        `;
      case 'error':
        return `
          background: #fadbd8;
          color: #e74c3c;
          border: 1px solid #e74c3c;
        `;
      case 'info':
        return `
          background: #d6eaf8;
          color: #3498db;
          border: 1px solid #3498db;
        `;
    }
  }}
`;

const DeviceInfo = styled.div`
  background: #e8f5e8;
  padding: 12px 16px;
  border-radius: 8px;
  margin: 12px 0;
  color: #27ae60;
  font-weight: 500;
  text-align: center;
`;

interface AccountLinkingProps {
  titleId?: string;
}

export const AccountLinking: React.FC<AccountLinkingProps> = ({ titleId }) => {
  const [accountCode, setAccountCode] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);
  const [linkedDevices, setLinkedDevices] = useState(0);
  const [codeExpires, setCodeExpires] = useState<number | null>(null);
  // The saved sync session was refused by the server; the user can start a new one explicitly
  const [sessionLost, setSessionLost] = useState(false);

  useEffect(() => {
    if (environmentConfig.enableRemoteStorage) {
      checkLinkedDevices();
    }
  }, []);

  useEffect(() => {
    // Update code expiry countdown
    let interval: NodeJS.Timeout;
    if (codeExpires) {
      interval = setInterval(() => {
        if (codeExpires <= Date.now()) {
          setAccountCode('');
          setCodeExpires(null);
          setMessage({ text: 'Account code has expired. Generate a new one.', type: 'info' });
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [codeExpires]);

  const checkLinkedDevices = async () => {
    try {
      const count = await remoteStorage.getLinkedDevicesCount();
      setLinkedDevices(count);
    } catch (error) {
      logger.warn('Failed to check linked devices:', error);
    }
  };

  const generateCode = async () => {
    setLoading(true);
    setMessage(null);
    // sessionLost is decided by the outcome below, not cleared up front: during a reset-and-retry
    // the reset button must stay on screen (showing its progress) instead of vanishing under the
    // user's finger, which also drops keyboard focus

    try {
      const result = await remoteStorage.generateAccountCode();
      setSessionLost(false);
      setAccountCode(result.code);
      setCodeExpires(result.expires);
      setMessage({
        text: 'Secure account code generated! Share this 8-character code with your other device.',
        type: 'success',
      });
    } catch (error) {
      setSessionLost(error instanceof RemoteSessionError);
      if (error instanceof RemoteSessionError) {
        // Say what happened and offer the way out instead of a generic failure
        setMessage({
          text: 'Your saved sync session is no longer valid (it may have expired). Your progress on this device is safe. Reset the sync session to continue.',
          type: 'error',
        });
      } else if (error instanceof RemoteNetworkError || !navigator.onLine) {
        setMessage({
          text: 'Could not reach the sync server. Check your connection and try again.',
          type: 'error',
        });
      } else {
        setMessage({
          text: 'Failed to generate account code. Please try again.',
          type: 'error',
        });
      }
      logger.error('Failed to generate account code:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetSessionAndRetry = async () => {
    if (loading) return; // a double tap must not reset (and generate) twice
    setLoading(true);
    try {
      // Only the sync session is replaced; progress stored on this device is never touched
      await remoteStorage.resetSession();
    } catch (error) {
      logger.error('Failed to reset the sync session:', error);
      setMessage({
        text: 'Could not reset the sync session. Your progress on this device is safe.',
        type: 'error',
      });
      setLoading(false);
      return;
    }
    await generateCode();
  };

  const linkDevice = async () => {
    if (!linkCode.trim()) {
      setMessage({ text: 'Please enter an account code.', type: 'error' });
      return;
    }

    setLoading(true);
    setMessage(null);
    setSessionLost(false); // a stale reset button would otherwise stay with no message explaining it

    try {
      const result = await remoteStorage.linkDeviceWithCode(linkCode.trim());
      if (typeof result.linkedDevices === 'number') setLinkedDevices(result.linkedDevices);
      setLinkCode('');
      setMessage({
        text:
          typeof result.linkedDevices === 'number'
            ? `Device linked to your account. Progress was not transferred. Total devices: ${result.linkedDevices}`
            : 'Device linked to your account. Progress was not transferred.',
        type: 'success',
      });
    } catch (error) {
      setMessage({
        text: 'Failed to link device. Check the code and try again.',
        type: 'error',
      });
      logger.error('Failed to link device:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (expires: number): string => {
    const remaining = Math.max(0, expires - Date.now());
    const minutes = Math.floor(remaining / (60 * 1000));
    const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <Container>
      <Title id={titleId}>🔗 Device Linking</Title>

      {linkedDevices > 1 && (
        <DeviceInfo>Account session linked across {linkedDevices} devices</DeviceInfo>
      )}

      <StatusMessage type="info">
        {environmentConfig.enableRemoteStorage
          ? 'Linking identifies your account on another device but does not yet transfer or merge learning progress between devices. Your local progress remains saved on this device.'
          : 'Remote sync is unavailable. Progress is saved on this device only; linking is disabled until durable remote storage is available.'}
      </StatusMessage>

      <Section>
        <SectionTitle>📱 Link Another Device</SectionTitle>
        <Description>
          Generate a code, then enter it on your other device to link it to this account. Linking
          does not sync or copy learning progress.
        </Description>

        {accountCode ? (
          <>
            <CodeDisplay>{accountCode}</CodeDisplay>
            {codeExpires && (
              <div style={{ textAlign: 'center', color: '#7f8c8d', fontSize: '14px' }}>
                Expires in: {formatTimeRemaining(codeExpires)}
              </div>
            )}
          </>
        ) : (
          <LoadingButton
            onClick={generateCode}
            isLoading={loading}
            disabled={!environmentConfig.enableRemoteStorage}
            loadingText="Generating..."
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s',
              width: '100%',
              marginTop: '12px',
              background: '#3498db',
              color: 'white',
            }}
          >
            Generate Account Code
          </LoadingButton>
        )}
      </Section>

      <Section>
        <SectionTitle>💻 Link to Existing Account</SectionTitle>
        <Description>
          Enter the account code from your other device to link this device to that account.
          Progress is not transferred.
        </Description>

        <Input
          type="text"
          placeholder="Enter code (e.g., A3B7K9M2)"
          value={linkCode}
          onChange={e => setLinkCode(e.target.value.toUpperCase())}
          maxLength={8}
          disabled={!environmentConfig.enableRemoteStorage}
        />

        <LoadingButton
          onClick={linkDevice}
          isLoading={loading}
          loadingText="Linking..."
          disabled={!environmentConfig.enableRemoteStorage || !linkCode.trim()}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            transition: 'all 0.2s',
            width: '100%',
            marginTop: '12px',
            background: '#ecf0f1',
            color: '#34495e',
          }}
        >
          Link This Device
        </LoadingButton>
      </Section>

      {message && (
        <StatusMessage
          type={message.type}
          role={message.type === 'error' ? 'alert' : 'status'}
          aria-live={message.type === 'error' ? 'assertive' : 'polite'}
        >
          {message.text}
        </StatusMessage>
      )}

      {sessionLost && (
        <LoadingButton
          onClick={resetSessionAndRetry}
          isLoading={loading}
          loadingText="Resetting..."
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            width: '100%',
            background: '#e67e22',
            color: 'white',
          }}
        >
          Reset sync session and try again
        </LoadingButton>
      )}
    </Container>
  );
};
