import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import TulearLogo from './TulearLogo';
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
  CHEF_SERVICE: { title: 'Chef de Service des Diplômes', badge: 'Chef de Service', color: '#0a3641' },
  SCOLARITE_CENTRALE: { title: 'Scolarité Centrale', badge: 'Scolarité Centrale', color: '#1d70b8' },
  IMPRIMEUR: { title: 'Service d\'Impression', badge: 'Imprimeur', color: '#06b6d4' },
  PRESIDENCE: { title: 'Présidence de l\'Université', badge: 'Présidence', color: '#7c3aed' },
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

  const roleInfo = ROLE_LABELS[user?.role] || { title: 'Espace Administratif', badge: user?.role, color: '#0a3641' };

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
      default:
        return [
          { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
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
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ display: 'none', padding: '0.5rem', color: '#0a3641' }}
            className="mobile-menu-btn"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <TulearLogo size="small" />
          </Link>
        </div>

        {/* User Profile & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          
          <Link to="/verification" className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem', borderRadius: '10px' }}>
            <Globe size={16} color="#1d70b8" />
            <span className="nav-guichet-text">Guichet Étudiant</span>
          </Link>

          {/* Notifications Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotifs(!showNotifs)}
              style={{
                position: 'relative',
                padding: '0.6rem',
                borderRadius: '50%',
                backgroundColor: showNotifs ? 'rgba(10, 54, 65, 0.08)' : '#f1f5f9',
                color: '#0a3641',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s'
              }}
            >
              <Bell size={20} />
              {notifications.length > 0 && (
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
              <div className="animate-fade-in" style={{
                position: 'absolute',
                top: '48px',
                right: 0,
                width: '320px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '16px',
                boxShadow: 'var(--shadow-lg)',
                padding: '1.25rem',
                zIndex: 50
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0a3641' }}>Notifications</h4>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{notifications.length} récents</span>
                </div>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', padding: '1rem 0' }}>Aucune nouvelle notification.</p>
                ) : (
                  <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {notifications.slice(0, 5).map(n => (
                      <div key={n.id} style={{ fontSize: '0.8rem', padding: '0.6rem 0.75rem', background: '#f8fafc', borderRadius: '8px', borderLeft: '3px solid #1d70b8' }}>
                        <span style={{ fontWeight: 700, color: '#0a3641', display: 'block' }}>{n.titre}</span>
                        <span style={{ color: '#475569', fontSize: '0.75rem' }}>{n.message}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid #e2e8f0', paddingLeft: '1.25rem' }}>
            <div style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#0a3641' }}>
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.username}
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: '#ffffff',
                backgroundColor: roleInfo.color,
                padding: '0.15rem 0.6rem',
                borderRadius: '9999px',
                display: 'inline-block',
                marginTop: '0.1rem'
              }}>
                {roleInfo.badge}
              </span>
            </div>

            <button 
              onClick={handleLogout}
              title="Se déconnecter"
              style={{
                padding: '0.6rem',
                borderRadius: '10px',
                color: '#ef4444',
                backgroundColor: '#fee2e2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fecaca'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#fee2e2'; }}
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
          backgroundColor: '#0a3641',
          backgroundImage: 'linear-gradient(180deg, #0a3641 0%, #051e24 100%)',
          color: '#ffffff',
          padding: '1.75rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'fixed',
          top: '70px',
          bottom: 0,
          left: 0,
          zIndex: 30,
          boxShadow: '4px 0 15px rgba(5, 30, 36, 0.15)'
        }}>
          <div>
            <div style={{ padding: '0 0.5rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#00b4d8', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Circuit Administratif
              </span>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginTop: '0.2rem' }}>
                {roleInfo.title}
              </h3>
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.8rem 1rem',
                      borderRadius: '10px',
                      fontSize: '0.875rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#ffffff' : '#94a3b8',
                      backgroundColor: isActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                      borderLeft: isActive ? '4px solid #00b4d8' : '4px solid transparent',
                      transition: 'all 0.25s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        e.currentTarget.style.color = '#94a3b8';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <Icon size={18} color={isActive ? '#00b4d8' : '#94a3b8'} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer Info in Sidebar */}
          <div style={{
            padding: '1rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            fontSize: '0.75rem',
            color: '#94a3b8'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff', fontWeight: 600, marginBottom: '0.25rem' }}>
              <ShieldAlert size={14} color="#00b4d8" />
              <span>Système Interne</span>
            </div>
            <span>Université de Tuléar • Version 2.0</span>
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
          .nav-guichet-text { display: none !important; }
          aside { display: ${mobileMenuOpen ? 'flex' : 'none'} !important; width: 100% !important; z-index: 60 !important; }
          main { margin-left: 0 !important; max-width: 100vw !important; padding: 1.25rem !important; }
        }
      `}</style>
    </div>
  );
};

export default AppLayout;
