import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, KeyRound, Mail, ScrollText, ShieldCheck, LogOut, Menu, X, Server,
} from 'lucide-react';
import { useAuth } from './AuthContext';
import ToliaraLogo from './ToliaraLogo';
import './admin/admin.css';

// Espace distinct des tableaux de bord métier : ni chatbot, ni notifications de dossiers.
const NAV_ADMIN = [
  { to: '/administration', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/administration/utilisateurs', label: 'Utilisateurs', icon: Users },
  { to: '/administration/roles', label: 'Rôles et permissions', icon: KeyRound },
  { to: '/administration/equipes', label: 'Adresses des équipes', icon: Mail },
  { to: '/administration/journal', label: "Journaux d'activité", icon: ScrollText },
  { to: '/administration/securite', label: 'Paramètres de sécurité', icon: ShieldCheck },
];

const AdminLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOuvert, setMenuOuvert] = useState(false);

  const deconnecter = () => {
    logout();
    navigate('/login');
  };

  const nomAffiche = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username;

  return (
    <div className="adm">
      <header className="adm-header">
        <div className="adm-header-gauche">
          <button
            type="button"
            className="adm-bouton-icone adm-menu-mobile"
            onClick={() => setMenuOuvert(!menuOuvert)}
            aria-label={menuOuvert ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {menuOuvert ? <X size={22} /> : <Menu size={22} />}
          </button>
          <Link to="/administration" className="header-brand-compact" style={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>
            <ToliaraLogo size="small" />
          </Link>
        </div>
        <div className="adm-header-droite">
          <span className="adm-utilisateur">{nomAffiche}</span>
          <span className="adm-badge-role">Administrateur système</span>
          <button type="button" className="adm-bouton-icone adm-deconnexion" onClick={deconnecter} title="Se déconnecter" aria-label="Se déconnecter">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      <aside className={`adm-sidebar${menuOuvert ? ' ouvert' : ''}`}>
        <div>
          <div className="adm-sidebar-titre">
            <small>Administration technique</small>
            <strong>Espace Administrateur</strong>
          </div>
          <nav className="adm-nav">
            {NAV_ADMIN.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => (isActive ? 'actif' : '')}
                onClick={() => setMenuOuvert(false)}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="adm-sidebar-pied">
          <strong><Server size={14} /> Gestion des comptes</strong>
          <span>Aucun accès aux dossiers de diplômes depuis cet espace.</span>
        </div>
      </aside>

      {/* Pas d'animation à transform ici : elle décalerait les fenêtres modales (position: fixed) */}
      <main className="adm-main">{children}</main>
    </div>
  );
};

export default AdminLayout;
