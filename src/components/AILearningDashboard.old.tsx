import React from 'react';

export const AILearningDashboard: React.FC<{
  userId: string;
  languageCode: string;
}> = ({ userId, languageCode }) => {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      padding: '1rem',
      margin: '1rem 0',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <h3 style={{ color: 'white', margin: '0 0 1rem 0' }}>
        🤖 AI Learning Coach
      </h3>
      
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '0.5rem',
        marginBottom: '1rem'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '4px',
          padding: '0.75rem',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4CAF50', marginBottom: '0.25rem' }}>
            Building
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase' }}>
            Learning Momentum
          </div>
        </div>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '4px',
          padding: '0.75rem',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#FF9800', marginBottom: '0.25rem' }}>
            Optimal
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase' }}>
            Cognitive Load
          </div>
        </div>
        
        <div style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '4px',
          padding: '0.75rem',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4CAF50', marginBottom: '0.25rem' }}>
            85%
          </div>
          <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.7)', textTransform: 'uppercase' }}>
            Motivation
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.6)', padding: '2rem', fontStyle: 'italic' }}>
        AI insights will appear as learning patterns emerge from your behavior.
        <br />
        <small>User: {userId} | Language: {languageCode}</small>
      </div>
    </div>
  );
};
