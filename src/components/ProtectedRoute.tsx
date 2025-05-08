import React, { ReactNode } from 'react';
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
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  // While auth state is initializing
  if (isLoading) {
    return <LoadingFallback />;
  }

  // If not authenticated, redirect
  if (!isAuthenticated) {
    return <Navigate to="/landing" replace />;
  }

  // Render protected content
  return <>{children}</>;
};

export default ProtectedRoute;
