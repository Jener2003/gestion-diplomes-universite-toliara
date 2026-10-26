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
import Archives from './pages/Archives';
import DefinirMotDePasse from './pages/DefinirMotDePasse';
import Inscription from './pages/Inscription';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUtilisateurs from './pages/admin/AdminUtilisateurs';
import AdminRoles from './pages/admin/AdminRoles';
import AdminEquipes from './pages/admin/AdminEquipes';
import AdminJournal from './pages/admin/AdminJournal';
import AdminSecurite from './pages/admin/AdminSecurite';
import { ROLES_METIER, ROLE_ADMIN } from './services/espaces';

// Espaces métier uniquement : l'administrateur système n'y a pas accès
const ROLES_STAFF = ROLES_METIER;

// Espace Administrateur : routes protégées ici ET refusées par le serveur aux autres rôles
const ROUTES_ADMIN = [
  { path: '/administration', element: <AdminDashboard /> },
  { path: '/administration/utilisateurs', element: <AdminUtilisateurs /> },
  { path: '/administration/roles', element: <AdminRoles /> },
  { path: '/administration/equipes', element: <AdminEquipes /> },
  { path: '/administration/journal', element: <AdminJournal /> },
  { path: '/administration/securite', element: <AdminSecurite /> },
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
          {/* Lien personnel reçu par e-mail (création de compte / réinitialisation) */}
          <Route path="/definir-mot-de-passe/:uid/:token" element={<DefinirMotDePasse />} />
          {/* Inscription par l'agent (code de l'espace, puis validation par l'administrateur) */}
          <Route path="/inscription" element={<Inscription />} />

          {/* Espace Administrateur système */}
          {ROUTES_ADMIN.map(({ path, element }) => (
            <Route key={path} path={path} element={
              <ProtectedRoute allowedRoles={[ROLE_ADMIN]}>{element}</ProtectedRoute>
            } />
          ))}

          {/* Intranet Personnel Administratif */}
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={ROLES_STAFF}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/archives" element={
            <ProtectedRoute allowedRoles={['SCOLARITE_CENTRALE']}>
              <Archives />
            </ProtectedRoute>
          } />

          {/* Enregistrement d'un dossier physique au guichet (Scolarité Établissement, Chef de Service, Scolarité Centrale) */}
          <Route path="/nouvelle-demande" element={
            <ProtectedRoute allowedRoles={['SCOLARITE_ETABLISSEMENT', 'CHEF_SERVICE', 'SCOLARITE_CENTRALE']}>
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
