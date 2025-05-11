// src/App.tsx
import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';

// ProtectedRoute wrapper for authenticated routes
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
        console.log('[CampaignDetailWrapper] Rendering with ID:', id);
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

// Loading fallback component
const LoadingFallback: React.FC = () => {
  console.log('[App] Showing loading fallback');
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      Loading...
    </div>
  );
};

const App: React.FC = () => {
  console.log('[App] Rendering App component');
  
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Redirect base path */}
        <Route path="/" element={<Navigate to="/landing" replace />} />

        {/* Public Routes */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/:id" element={<CampaignDetailWrapper />} />

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
    </Suspense>
  );
};

export default App;