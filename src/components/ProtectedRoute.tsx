// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

// Simple full-screen loader component
const LoadingFallback: React.FC = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontFamily: 'sans-serif',
  }}>
    Loading...
  </div>
);

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('[ProtectedRoute] Auth check:', { isAuthenticated, isLoading });

  // While auth state is initializing
  if (isLoading) {
    return <LoadingFallback />;
  }

  // If not authenticated, redirect to landing
  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Not authenticated, redirecting to landing');
    return <Navigate to="/landing" replace />;
  }

  // Render protected content
  console.log('[ProtectedRoute] User authenticated, rendering protected content');
  return <>{children}</>;
};

export default ProtectedRoute;