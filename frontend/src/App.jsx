import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import PublicVerification from './pages/PublicVerification';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MesDemandes from './pages/MesDemandes';
import NouvelleDemande from './pages/NouvelleDemande';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './components/AuthContext';
import NotFound from './pages/NotFound';
import Forbidden from './pages/Forbidden';

const ROLES_STAFF = ['CHEF_SERVICE', 'SCOLARITE_CENTRALE', 'IMPRIMEUR', 'PRESIDENCE'];

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/verification" element={<PublicVerification />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Administrative Dashboard — staff roles only, not students */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={ROLES_STAFF}>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Espace étudiant */}
          <Route path="/mes-demandes" element={
            <ProtectedRoute allowedRoles={['ETUDIANT']}>
              <MesDemandes />
            </ProtectedRoute>
          } />
          <Route path="/nouvelle-demande" element={
            <ProtectedRoute allowedRoles={['ETUDIANT']}>
              <NouvelleDemande />
            </ProtectedRoute>
          } />

          <Route path="/forbidden" element={<Forbidden />} />

          {/* Catch-all redirect */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
