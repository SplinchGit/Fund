// src/components/ProtectedRoute.tsx

// # ############################################################################ #
// # #                             SECTION 1 - IMPORTS                            #
// # ############################################################################ #
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

// # ############################################################################ #
// # #             SECTION 2 - HELPER COMPONENT: LOADING FALLBACK             #
// # ############################################################################ #
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

// # ############################################################################ #
// # #             SECTION 3 - INTERFACE: PROTECTED ROUTE PROPS               #
// # ############################################################################ #
interface ProtectedRouteProps {
  children: React.ReactNode;
}

// # ############################################################################ #
// # #          SECTION 4 - MAIN COMPONENT: PROTECTEDROUTE - SETUP            #
// # ############################################################################ #
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  console.log('[ProtectedRoute] Auth check:', { isAuthenticated, isLoading });

// # ############################################################################ #
// # #       SECTION 5 - MAIN COMPONENT: PROTECTEDROUTE - LOADING STATE       #
// # ############################################################################ #
  // While auth state is initializing
  if (isLoading) {
    return <LoadingFallback />;
  }

// # ############################################################################ #
// # #  SECTION 6 - MAIN COMPONENT: PROTECTEDROUTE - UNAUTHENTICATED STATE  #
// # ############################################################################ #
  // If not authenticated, redirect to landing
  if (!isAuthenticated) {
    console.log('[ProtectedRoute] Not authenticated, redirecting to landing');
    return <Navigate to="/landing" replace />;
  }

// # ############################################################################ #
// # # SECTION 7 - MAIN COMPONENT: PROTECTEDROUTE - AUTHENTICATED CONTENT #
// # ############################################################################ #
  // Render protected content
  console.log('[ProtectedRoute] User authenticated, rendering protected content');
  return <>{children}</>;
};

// # ############################################################################ #
// # #                        SECTION 8 - DEFAULT EXPORT                        #
// # ############################################################################ #
export default ProtectedRoute;