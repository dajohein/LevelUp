import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { usePerformanceMonitor, useBreakpoints } from '../../hooks/useOptimization';

const PerformancePanel = styled.div<{ isVisible: boolean }>`
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: ${props => props.theme.spacing.sm};
  border-radius: ${props => props.theme.borderRadius.sm};
  font-family: monospace;
  font-size: 0.8rem;
  z-index: 9999;
  min-width: 200px;
  opacity: ${props => props.isVisible ? 0.9 : 0};
  pointer-events: ${props => props.isVisible ? 'auto' : 'none'};
  transition: opacity 0.3s ease;
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const MetricLabel = styled.span`
  color: #ccc;
`;

const MetricValue = styled.span<{ warning?: boolean }>`
  color: ${props => props.warning ? '#ff6b6b' : '#4ecdc4'};
  font-weight: bold;
`;

const ToggleButton = styled.button`
  position: fixed;
  top: 10px;
  right: 220px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  padding: 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.7rem;
  z-index: 10000;
  
  &:hover {
    background: rgba(0, 0, 0, 0.9);
  }
`;

const NetworkStatus = styled.div<{ online: boolean }>`
  color: ${props => props.online ? '#4ecdc4' : '#ff6b6b'};
  font-weight: bold;
`;

interface PerformanceMonitorProps {
  enabled?: boolean;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  enabled = process.env.NODE_ENV === 'development' 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const metrics = usePerformanceMonitor();
  const { breakpoint, screenSize } = useBreakpoints();

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Storage usage monitoring
  const [storageUsage, setStorageUsage] = useState<{used: number, quota: number}>({ used: 0, quota: 0 });

  useEffect(() => {
    const updateStorageUsage = async () => {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        try {
          const estimate = await navigator.storage.estimate();
          setStorageUsage({
            used: Math.round((estimate.usage || 0) / 1024 / 1024 * 100) / 100,
            quota: Math.round((estimate.quota || 0) / 1024 / 1024 / 1024 * 100) / 100
          });
        } catch (error) {
          console.warn('Storage estimate not available:', error);
        }
      }
    };

    updateStorageUsage();
    const interval = setInterval(updateStorageUsage, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!enabled) return null;

  return (
    <>
      <ToggleButton onClick={() => setIsVisible(!isVisible)}>
        📊 {isVisible ? 'Hide' : 'Show'} Perf
      </ToggleButton>
      
      <PerformancePanel isVisible={isVisible}>
        <MetricRow>
          <MetricLabel>Render:</MetricLabel>
          <MetricValue warning={metrics.renderTime > 100}>
            {metrics.renderTime}ms
          </MetricValue>
        </MetricRow>
        
        {metrics.memoryUsage > 0 && (
          <MetricRow>
            <MetricLabel>Memory:</MetricLabel>
            <MetricValue warning={metrics.memoryUsage > 100}>
              {metrics.memoryUsage}MB
            </MetricValue>
          </MetricRow>
        )}
        
        {metrics.loadTime > 0 && (
          <MetricRow>
            <MetricLabel>Load:</MetricLabel>
            <MetricValue warning={metrics.loadTime > 3000}>
              {Math.round(metrics.loadTime / 1000 * 100) / 100}s
            </MetricValue>
          </MetricRow>
        )}
        
        <MetricRow>
          <MetricLabel>Screen:</MetricLabel>
          <MetricValue>
            {screenSize.width}×{screenSize.height} ({breakpoint})
          </MetricValue>
        </MetricRow>
        
        <MetricRow>
          <MetricLabel>Storage:</MetricLabel>
          <MetricValue warning={storageUsage.used > storageUsage.quota * 0.8}>
            {storageUsage.used}MB / {storageUsage.quota}GB
          </MetricValue>
        </MetricRow>
        
        <MetricRow>
          <MetricLabel>Network:</MetricLabel>
          <NetworkStatus online={isOnline}>
            {isOnline ? 'Online' : 'Offline'}
          </NetworkStatus>
        </MetricRow>
        
        <MetricRow>
          <MetricLabel>FPS:</MetricLabel>
          <MetricValue>
            {Math.round(1000 / (metrics.renderTime || 16))}
          </MetricValue>
        </MetricRow>
      </PerformancePanel>
    </>
  );
};