import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import ToliaraLogo from './ToliaraLogo';
import { notificationsAPI } from '../services/api';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Printer, 
  Award, 
  Search, 
  Bell, 
  LogOut, 
  UserCheck, 
  Globe,
  ChevronRight,
  ShieldAlert,
  FileCheck,
  BarChart3,
  Menu,
  X
} from 'lucide-react';

const ROLE_LABELS = {
  CHEF_SERVICE: { title: 'Chef de Service des Diplômes', badge: 'Chef de Service', color: '#070b19' },
  SCOLARITE_CENTRALE: { title: 'Scolarité Centrale', badge: 'Scolarité Centrale', color: '#048b9a' },
  IMPRIMEUR: { title: 'Service d\'Impression', badge: 'Imprimeur', color: '#06b6d4' },
  PRESIDENCE: { title: 'Présidence de l\'Université', badge: 'Présidence', color: '#c0000c' },
  ETUDIANT: { title: 'Portail Étudiant', badge: 'Étudiant', color: '#64748b' }
};

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (user) {
      notificationsAPI.getNotifications()
        .then(res => setNotifications(res.data))
        .catch(err => console.error(err));
    }
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNotificationClick = async (notif) => {
    if (notif.lu) return;
    try {
      await notificationsAPI.marquerLu(notif.id);
      setNotifications((prev) => prev.map((n) => (n.id === notif.id ? { ...n, lu: true } : n)));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.lu).length;

  const roleInfo = ROLE_LABELS[user?.role] || { title: 'Espace Administratif', badge: user?.role, color: '#070b19' };

  // Generate Navigation items based on role
  const getNavItems = () => {
    switch (user?.role) {
      case 'CHEF_SERVICE':
        return [
          { path: '/dashboard', label: 'Dossiers à vérifier', icon: CheckSquare },
          { path: '/verification', label: 'Recherche publique', icon: Search },
        ];
      case 'SCOLARITE_CENTRALE':
        return [
          { path: '/dashboard', label: 'Dossiers académiques', icon: FileCheck },
          { path: '/verification', label: 'Vérification diplôme', icon: Search },
        ];
      case 'IMPRIMEUR':
        return [
          { path: '/dashboard', label: 'File d\'impression', icon: Printer },
          { path: '/verification', label: 'Base des diplômes', icon: Search },
        ];
      case 'PRESIDENCE':
        return [
          { path: '/dashboard', label: 'Tableau de bord & Signatures', icon: BarChart3 },
          { path: '/verification', label: 'Consultation publique', icon: Search },
        ];
      case 'ETUDIANT':
        return [
          { path: '/mes-demandes', label: 'Mes demandes', icon: LayoutDashboard },
          { path: '/nouvelle-demande', label: 'Nouvelle demande', icon: FileCheck },
          { path: '/verification', label: 'Vérifier un diplôme', icon: Search },
        ];
      default:
        return [
          { path: '/verification', label: 'Recherche publique', icon: Search },
        ];
    }
  };

  const navItems = getNavItems();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f8fafc' }}>
      
      {/* Top Header */}
      <header style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '70px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: 'none', padding: '0.5rem', color: '#070b19' }}
            className="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <Link to="/" className="header-brand-compact" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', minWidth: 0 }}>
            <ToliaraLogo size="small" />
          </Link>
        </div>

        {/* User Profile & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>

          <Link to="/verification" className="btn btn-outline header-hide-mobile" style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}>
            <Globe size={16} />
            <span>Guichet Etudiant</span>
          </Link>

          {/* Notifications Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotifs(!showNotifs)}
              style={{
                position: 'relative',
                padding: '0.5rem',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                color: '#070b19',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  right: '2px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#ef4444'
                }} />
              )}
            </button>

            {showNotifs && (
              <div style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '320px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                padding: '1rem',
                zIndex: 50
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#070b19' }}>Notifications</h4>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{unreadCount} non lue(s)</span>
                </div>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>Aucune nouvelle notification.</p>
                ) : (
                  <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {notifications.slice(0, 8).map(n => (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        style={{
                          textAlign: 'left', fontSize: '0.8rem', padding: '0.5rem', borderRadius: '6px',
                          background: n.lu ? '#f8fafc' : '#fff0ee', border: n.lu ? '1px solid transparent' : '1px solid #cbd5e1',
                          cursor: n.lu ? 'default' : 'pointer'
                        }}
                      >
                        <span style={{ fontWeight: n.lu ? 600 : 700, color: '#070b19', display: 'block' }}>{n.titre}</span>
                        <span style={{ color: '#64748b' }}>{n.message}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid #e2e8f0', paddingLeft: '1.25rem' }}>
            <div className="header-hide-mobile" style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#070b19' }}>
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#ffffff',
                backgroundColor: roleInfo.color,
                padding: '0.1rem 0.5rem',
                borderRadius: '9999px',
                display: 'inline-block'
              }}>
                {roleInfo.badge}
              </span>
            </div>

            <button 
              onClick={handleLogout}
              title="Se déconnecter"
              style={{
                padding: '0.5rem',
                borderRadius: '8px',
                color: '#ef4444',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
            >
              <LogOut size={18} />
            </button>
          </div>

        </div>
      </header>

      {/* Main Container with Lateral Sidebar */}
      <div style={{ display: 'flex', marginTop: '70px', minHeight: 'calc(100vh - 70px)' }}>
        
        {/* Lateral Sidebar */}
        <aside style={{
          width: '260px',
          backgroundColor: '#070b19',
          color: '#ffffff',
          padding: '1.5rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'fixed',
          top: '70px',
          bottom: 0,
          left: 0,
          zIndex: 30,
          boxShadow: '4px 0 10px rgba(0,0,0,0.05)'
        }}>
          <div>
            <div style={{ padding: '0 0.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#048b9a', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Circuit Administratif
              </span>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginTop: '0.2rem' }}>
                {roleInfo.title}
              </h3>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem 1rem',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#ffffff' : '#94a3b8',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                      borderLeft: isActive ? '4px solid #048b9a' : '4px solid transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Icon size={18} color={isActive ? '#048b9a' : '#94a3b8'} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer Info in Sidebar */}
          <div style={{
            padding: '1rem',
            borderRadius: '10px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            fontSize: '0.75rem',
            color: '#94a3b8'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff', fontWeight: 600, marginBottom: '0.25rem' }}>
              <ShieldAlert size={14} color="#048b9a" />
              <span>Système Interne</span>
            </div>
            <span>Université de Toliara • Version 2.0</span>
          </div>
        </aside>

        {/* Main Content Area */}
        <main style={{
          flex: 1,
          marginLeft: '260px',
          padding: '2rem',
          maxWidth: 'calc(100vw - 260px)',
          overflowX: 'hidden'
        }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-menu-btn { display: block !important; }
          aside { display: ${mobileMenuOpen ? 'flex' : 'none'} !important; width: 100% !important; z-index: 60 !important; }
          main { margin-left: 0 !important; max-width: 100vw !important; padding: 1rem !important; }
        }
      `}</style>
    </div>
  );
};

export default AppLayout;
