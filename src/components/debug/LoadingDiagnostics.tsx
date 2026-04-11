import React, { useEffect, useState, useRef } from 'react';
import styled from '@emotion/styled';

/** Extends Window with a dev-only render-tracking helper. */
interface DevWindow extends Window {
  trackRender?: (componentName: string) => void;
}

const DiagnosticsContainer = styled.div`
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 10px;
  border-radius: 8px;
  font-family: monospace;
  font-size: 12px;
  z-index: 10000;
  max-width: 300px;
  display: ${process.env.NODE_ENV === 'development' ? 'block' : 'none'};
`;

const DiagnosticItem = styled.div<{ warning?: boolean; error?: boolean }>`
  margin: 2px 0;
  color: ${props => (props.error ? '#ff6b6b' : props.warning ? '#ffa726' : '#4caf50')};
`;

interface RenderInfo {
  component: string;
  count: number;
  lastRender: number;
}

export const LoadingDiagnostics: React.FC = () => {
  const [renderCounts, setRenderCounts] = useState<Map<string, RenderInfo>>(new Map());
  const [infiniteLoopWarnings, setInfiniteLoopWarnings] = useState<string[]>([]);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Monitor render patterns
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const warnings: string[] = [];

      renderCounts.forEach((info, component) => {
        // Check for rapid re-renders (more than 10 in 5 seconds)
        if (info.count > 10 && now - info.lastRender < 5000) {
          warnings.push(`${component}: ${info.count} renders in 5s`);
        }
      });

      setInfiniteLoopWarnings(warnings);

      // Reset counters every 10 seconds
      if (now % 10000 < 1000) {
        setRenderCounts(new Map());
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [renderCounts]);

  // Hook to track component renders
  const trackRender = useCallback((componentName: string) => {
    const now = Date.now();
    setRenderCounts(prev => {
      const current = prev.get(componentName) || {
        component: componentName,
        count: 0,
        lastRender: now,
      };
      const updated = new Map(prev);
      updated.set(componentName, {
        ...current,
        count: current.count + 1,
        lastRender: now,
      });
      return updated;
    });
  }, []);

  // Expose tracking function globally for development (side-effect must live in an effect)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      (window as DevWindow).trackRender = trackRender;
    }
    return () => {
      if (process.env.NODE_ENV === 'development') {
        delete (window as DevWindow).trackRender;
      }
    };
  }, [trackRender]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <DiagnosticsContainer>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🔍 Loading Diagnostics</div>

      {infiniteLoopWarnings.length > 0 && (
        <div>
          <DiagnosticItem error>⚠️ Potential Issues:</DiagnosticItem>
          {infiniteLoopWarnings.map((warning, i) => (
            <DiagnosticItem key={i} warning>
              • {warning}
            </DiagnosticItem>
          ))}
        </div>
      )}

      <div>
        <DiagnosticItem>📊 Recent Renders:</DiagnosticItem>
        {Array.from(renderCounts.entries())
          .sort(([, a], [, b]) => b.count - a.count)
          .slice(0, 5)
          .map(([component, info]) => (
            <DiagnosticItem key={component} warning={info.count > 5} error={info.count > 10}>
              {component}: {info.count}x
            </DiagnosticItem>
          ))}
      </div>

      <div style={{ marginTop: '8px', fontSize: '10px', opacity: 0.7 }}>
        Add trackRender(&apos;ComponentName&apos;) to useEffect to monitor
      </div>
    </DiagnosticsContainer>
  );
};

export default React.memo(LoadingDiagnostics);
