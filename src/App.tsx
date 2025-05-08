// src/App.tsx
import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';

// Authentication context and protected-route wrapper
import { AuthProvider } from './components/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy-loaded pages
const LandingPage = React.lazy(() => import('./pages/LandingPage'));
const CampaignsPage = React.lazy(() => import('./pages/CampaignsPage'));
const CampaignDetailWrapper = React.lazy(() =>
  import('./pages/CampaignDetailPage').then(module => {
    const Component = module.CampaignDetail;
    return {
      default: () => {
        const { id } = useParams();
        return <Component id={id ?? ''} />;
      }
    };
  })
);
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const TipJar = React.lazy(() => import('./pages/TipJar'));
const CreateCampaignForm = React.lazy(() =>
  import('./components/CreateCampaignForm').then(m => ({ default: m.CreateCampaignForm }))
);
const EditCampaignPage = React.lazy(() => import('./pages/EditCampaignPage'));

// Loading fallback
const LoadingFallback: React.FC = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    Loading...
  </div>
);

/**
 * App Component
 */
const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/landing" replace />} />

          {/* Public Routes */}
          <Route
            path="/landing"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <LandingPage />
              </Suspense>
            }
          />
          <Route
            path="/campaigns"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <CampaignsPage />
              </Suspense>
            }
          />
          <Route
            path="/campaigns/:id"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <CampaignDetailWrapper />
              </Suspense>
            }
          />

          {/* Protected Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tip-jar"
            element={
              <ProtectedRoute>
                <TipJar />
              </ProtectedRoute>
            }
          />
          <Route
            path="/new-campaign"
            element={
              <ProtectedRoute>
                <CreateCampaignForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/campaigns/:id/edit"
            element={
              <ProtectedRoute>
                <EditCampaignPage />
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/landing" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
