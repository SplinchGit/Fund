import React from 'react';

const LoadingFallback: React.FC = () => {
  console.log('[App] Showing loading fallback');
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
      Loading...
    </div>
  );
};

export default LoadingFallback;
