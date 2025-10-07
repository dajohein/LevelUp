/**
 * Storage Debug Component
 * 
 * Provides debugging tools for testing server-side storage in the browser
 */

import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { enhancedStorage } from '../../services/storage/enhancedStorage';
import { getStorageStatus } from '../../services/storage/storageInitializer';
import { remoteStorage } from '../../services/storage/remoteStorage';

const DebugContainer = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 400px;
  max-height: 600px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  border-radius: 8px;
  padding: 16px;
  font-family: monospace;
  font-size: 12px;
  overflow-y: auto;
  z-index: 10000;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
`;

const Section = styled.div`
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #333;
`;

const Button = styled.button`
  background: #007acc;
  color: white;
  border: none;
  padding: 4px 8px;
  margin: 2px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 10px;
  
  &:hover {
    background: #005fa3;
  }
  
  &:disabled {
    background: #555;
    cursor: not-allowed;
  }
`;

const Status = styled.div<{ status: 'success' | 'error' | 'info' }>`
  color: ${props => 
    props.status === 'success' ? '#4caf50' :
    props.status === 'error' ? '#f44336' : '#2196f3'
  };
  margin: 4px 0;
`;

interface StorageDebugProps {
  isVisible: boolean;
  onClose: () => void;
}

export const StorageDebug: React.FC<StorageDebugProps> = ({ isVisible, onClose }) => {
  const [status, setStatus] = useState<any>(null);
  const [logs, setLogs] = useState<Array<{ type: 'success' | 'error' | 'info'; message: string }>>([]);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  const addLog = (type: 'success' | 'error' | 'info', message: string) => {
    setLogs(prev => [...prev.slice(-10), { type, message }]);
  };

  const refreshStatus = async () => {
    try {
      const storageStatus = await getStorageStatus();
      setStatus(storageStatus);
      addLog('info', 'Status refreshed');
    } catch (error) {
      addLog('error', `Status refresh failed: ${error}`);
    }
  };

  const testWordProgress = async () => {
    try {
      const testData = {
        'test': {
          wordId: 'test',
          xp: 10,
          lastPracticed: new Date().toISOString(),
          timesCorrect: 1,
          timesIncorrect: 0,
          learningPhase: 'practice' as const
        }
      };

      // Test save
      const saveResult = await enhancedStorage.saveWordProgress('en', testData);
      if (saveResult.success) {
        addLog('success', 'Word progress saved');
        
        // Test load
        const loadResult = await enhancedStorage.loadWordProgress('en');
        if (loadResult.success) {
          addLog('success', `Word progress loaded (${Object.keys(loadResult.data || {}).length} words)`);
          setTestResults(prev => ({ ...prev, wordProgress: 'success' }));
        } else {
          addLog('error', 'Word progress load failed');
          setTestResults(prev => ({ ...prev, wordProgress: 'load_failed' }));
        }
      } else {
        addLog('error', 'Word progress save failed');
        setTestResults(prev => ({ ...prev, wordProgress: 'save_failed' }));
      }
    } catch (error) {
      addLog('error', `Word progress test failed: ${error}`);
      setTestResults(prev => ({ ...prev, wordProgress: 'error' }));
    }
  };

  const testRemoteStorage = async () => {
    try {
      const health = await remoteStorage.healthCheck();
      if (health.success && health.data?.status === 'healthy') {
        addLog('success', 'Remote storage healthy');
        setTestResults(prev => ({ ...prev, remote: 'healthy' }));
      } else {
        addLog('error', 'Remote storage unhealthy');
        setTestResults(prev => ({ ...prev, remote: 'unhealthy' }));
      }
    } catch (error) {
      addLog('error', `Remote storage test failed: ${error}`);
      setTestResults(prev => ({ ...prev, remote: 'error' }));
    }
  };

  const getAnalytics = async () => {
    try {
      const analytics = await enhancedStorage.getStorageAnalytics();
      if (analytics.success) {
        addLog('success', `Analytics: Cache hit rate ${(analytics.data.cache.hitRate * 100).toFixed(1)}%`);
        setTestResults(prev => ({ ...prev, analytics: analytics.data }));
      } else {
        addLog('error', 'Analytics failed');
      }
    } catch (error) {
      addLog('error', `Analytics failed: ${error}`);
    }
  };

  useEffect(() => {
    if (isVisible) {
      refreshStatus();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <DebugContainer>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <strong>🔧 Storage Debug</strong>
        <Button onClick={onClose}>✕</Button>
      </div>

      <Section>
        <strong>System Status</strong>
        <Button onClick={refreshStatus}>Refresh</Button>
        {status && (
          <div>
            <Status status="info">Initialized: {status.initialized ? '✅' : '❌'}</Status>
            <Status status="info">Remote: {status.remoteEnabled ? '🌐' : '📱'}</Status>
          </div>
        )}
      </Section>

      <Section>
        <strong>Tests</strong>
        <div>
          <Button onClick={testWordProgress}>Test Word Progress</Button>
          <Button onClick={testRemoteStorage}>Test Remote Storage</Button>
          <Button onClick={getAnalytics}>Get Analytics</Button>
        </div>
        {Object.entries(testResults).map(([test, result]) => (
          <Status 
            key={test} 
            status={result === 'success' || result === 'healthy' ? 'success' : 'error'}
          >
            {test}: {String(result)}
          </Status>
        ))}
      </Section>

      <Section>
        <strong>Console ({logs.length}/10)</strong>
        {logs.slice(-5).map((log, index) => (
          <Status key={index} status={log.type}>
            {log.message}
          </Status>
        ))}
      </Section>

      <div style={{ fontSize: '10px', color: '#666' }}>
        Press Ctrl+Shift+S to toggle
      </div>
    </DebugContainer>
  );
};

export default StorageDebug;