// src/App.tsx
import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';

// ProtectedRoute wrapper for authenticated routes
import ProtectedRoute from './components/ProtectedRoute';

// Direct imports
import LandingPage from './pages/LandingPage';
import CampaignsPage from './pages/CampaignsPage';
import Dashboard from './pages/Dashboard';
import TipJar from './pages/TipJar';
import EditCampaignPage from './pages/EditCampaignPage'; // Your existing component
import { CampaignDetail } from './pages/CampaignDetailPage';
import { CreateCampaignForm } from './components/CreateCampaignForm';

// Loading fallback component
const LoadingFallback: React.FC = () => {
  console.log('[App] Showing loading fallback');
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      Loading...
    </div>
  );
};

// Wrapper component to provide 'id' prop to CampaignDetail (if it still needs it)
const CampaignDetailWrapper: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  if (!id) {
    console.error("[CampaignDetailWrapper] ID parameter is missing!");
    return <Navigate to="/campaigns" replace />;
  }
  return <CampaignDetail id={id} />; // Assuming CampaignDetail still requires 'id' prop
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
        {/* Using CampaignDetailWrapper, assuming CampaignDetail still expects 'id' prop */}
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
              {/*
                MODIFIED: Render EditCampaignPage directly.
                This assumes EditCampaignPage uses the useParams() hook internally
                to get the ':id' from the URL, like this:

                // Inside your src/pages/EditCampaignPage.tsx
                // import { useParams } from 'react-router-dom';
                // const EditCampaignPage: React.FC = () => {
                //   const { id } = useParams<{id: string}>();
                //   // ... use id to fetch campaign data for editing ...
                //   return <div>Editing Campaign ID: {id}</div>;
                // };
              */}
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