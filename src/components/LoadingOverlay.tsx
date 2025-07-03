// src/components/LoadingOverlay.tsx
import React from 'react';

interface LoadingOverlayProps {
  message?: string;
  show: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ 
  message = 'Loading...', 
  show 
}) => {
  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        border: '4px solid rgba(26, 115, 232, 0.2)',
        borderTopColor: '#1a73e8',
        animation: 'spin 1s linear infinite',
        marginBottom: '1rem'
      }} />
      <p style={{
        color: '#5f6368',
        fontSize: '1rem',
        margin: 0,
        textAlign: 'center'
      }}>
        {message}
      </p>
      
      <style>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};