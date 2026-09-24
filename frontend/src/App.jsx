import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PublicVerification from './pages/PublicVerification';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NouvelleDemande from './pages/NouvelleDemande';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './components/AuthContext';
import NotFound from './pages/NotFound';
import Forbidden from './pages/Forbidden';

const ROLES_STAFF = [
  'SCOLARITE_ETABLISSEMENT',
  'SCOLARITE_CENTRALE',
  'CHEF_SERVICE',
  'IMPRIMEUR',
  'AGENT_TRANSMISSION',
  'PRESIDENCE'
];

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verification" element={<Navigate to="/login" replace />} />

          {/* Intranet Personnel Administratif */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={ROLES_STAFF}>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Enregistrement d'un dossier physique au guichet (Scolarité Établissement, Chef de Service, Scolarité Centrale) */}
          <Route path="/nouvelle-demande" element={
            <ProtectedRoute allowedRoles={['SCOLARITE_ETABLISSEMENT', 'CHEF_SERVICE', 'SCOLARITE_CENTRALE', 'PRESIDENCE']}>
              <NouvelleDemande />
            </ProtectedRoute>
          } />

          {/* Redirection compatibilité */}
          <Route path="/mes-demandes" element={<Navigate to="/dashboard" replace />} />
          <Route path="/forbidden" element={<Forbidden />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
