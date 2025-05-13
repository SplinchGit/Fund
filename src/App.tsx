// src/App.tsx
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// ProtectedRoute wrapper for authenticated routes
import ProtectedRoute from './components/ProtectedRoute';

// Direct imports instead of lazy-loaded for reliability
import LandingPage from './pages/LandingPage';
import CampaignsPage from './pages/CampaignsPage';
import Dashboard from './pages/Dashboard';
import TipJar from './pages/TipJar';
import EditCampaignPage from './pages/EditCampaignPage';
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
        <Route path="/campaigns/:id" element={<CampaignDetail id="" />} />

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