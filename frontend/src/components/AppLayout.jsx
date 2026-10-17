import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import ToliaraLogo from './ToliaraLogo';
import ChatbotWidget from './ChatbotWidget';
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
  X,
  Truck,
  Building2,
  SendHorizontal,
  Archive,
  CheckCheck
} from 'lucide-react';

export const ROLE_LABELS = {
  SCOLARITE_ETABLISSEMENT: { title: 'Scolarité d\'Établissement', badge: 'Scolarité Établissement', color: '#00b4d8' },
  SCOLARITE_CENTRALE: { title: 'Scolarité Centrale (Rectorat)', badge: 'Scolarité Centrale', color: '#048b9a' },
  CHEF_SERVICE: { title: 'Chef de Service des Diplômes', badge: 'Chef de Service', color: '#0a3641' },
  IMPRIMEUR: { title: 'Service Conception & Impression des Diplômes', badge: 'Concepteur / Imprimeur', color: '#1d70b8' },
  AGENT_TRANSMISSION: { title: 'Service d’Acheminement des Diplômes', badge: 'Agent de Transmission', color: '#6366f1' },
  PRESIDENCE: { title: 'Présidence de l\'Université', badge: 'Présidence', color: '#c0000c' },
};

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const notifRef = useRef(null);

  const fetchNotifications = () => {
    if (user) {
      notificationsAPI.getNotifications()
        .then(res => setNotifications(res.data))
        .catch(err => console.error("Erreur récupération notifications:", err));
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Fermer le menu des notifications lors d'un clic extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.marquerTousLus();
      setNotifications((prev) => prev.map((n) => ({ ...n, lu: true })));
    } catch (err) {
      console.error("Erreur marquer toutes les notifications comme lues:", err);
    }
  };

  const unreadCount = notifications.filter((n) => !n.lu).length;

  const roleInfo = ROLE_LABELS[user?.role] || { title: 'Espace de travail', badge: user?.role, color: '#070b19' };

  // Generate Navigation items based on staff role
  const getNavItems = () => {
    switch (user?.role) {
      case 'SCOLARITE_ETABLISSEMENT':
        return [
          { path: '/dashboard', label: 'Suivi des dossiers & Retraits', icon: CheckSquare },
          { path: '/nouvelle-demande', label: 'Enregistrer une demande', icon: FileCheck },
        ];
      case 'SCOLARITE_CENTRALE':
        return [
          { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
          { path: '/dashboard?tab=VALIDEES', label: 'Demandes validées', icon: CheckSquare },
          { path: '/dashboard?tab=REJETEES', label: 'Demandes rejetées', icon: FileCheck },
          { path: '/archives', label: 'Archives', icon: Archive },
        ];
      case 'CHEF_SERVICE':
        return [
          { path: '/dashboard', label: 'Supervision & Affectations', icon: LayoutDashboard },
        ];
      case 'IMPRIMEUR':
        return [
          { path: '/dashboard', label: 'File d\'impression', icon: Printer },
        ];
      case 'AGENT_TRANSMISSION':
        return [
          { path: '/dashboard', label: 'Bordereaux de transmission', icon: Truck },
        ];
      case 'PRESIDENCE':
        return [
          { path: '/dashboard', label: 'Tableau de bord & Signatures', icon: BarChart3 },
        ];
      default:
        return [
          { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
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
          
          {/* Notifications Dropdown (Facebook Style Red Badge Counter) */}
          <div ref={notifRef} style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowNotifs(!showNotifs)}
              title={unreadCount > 0 ? `${unreadCount} nouvelle(s) notification(s)` : "Notifications"}
              aria-label={`Notifications (${unreadCount} non lues)`}
              style={{
                position: 'relative',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: showNotifs ? 'rgba(10, 54, 65, 0.12)' : '#f1f5f9',
                color: '#0a3641',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: showNotifs ? '0 0 0 2px rgba(10, 54, 65, 0.18)' : 'none'
              }}
              onMouseEnter={e => {
                if (!showNotifs) e.currentTarget.style.backgroundColor = '#e2e8f0';
              }}
              onMouseLeave={e => {
                if (!showNotifs) e.currentTarget.style.backgroundColor = '#f1f5f9';
              }}
            >
              <Bell size={20} />
              
              {/* Badge rouge avec compteur chiffré style Facebook */}
              {unreadCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    minWidth: unreadCount > 9 ? '22px' : '18px',
                    height: '18px',
                    padding: unreadCount > 9 ? '0 5px' : '0',
                    borderRadius: '9999px',
                    backgroundColor: '#e41e3f',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 800,
                    lineHeight: '16px',
                    textAlign: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #ffffff',
                    boxShadow: '0 2px 6px rgba(228, 30, 63, 0.5)',
                    pointerEvents: 'none',
                    letterSpacing: '-0.02em',
                    fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
                    zIndex: 2
                  }}
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div 
                className="animate-fade-in" 
                style={{
                  position: 'absolute',
                  top: '50px',
                  right: 0,
                  width: '360px',
                  maxWidth: 'calc(100vw - 2rem)',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                  padding: '1.25rem',
                  zIndex: 50
                }}
              >
                {/* Header du panneau */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.65rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0a3641', margin: 0 }}>
                      Notifications
                    </h4>
                    {unreadCount > 0 && (
                      <span 
                        style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 800, 
                          backgroundColor: '#fee2e2', 
                          color: '#e41e3f', 
                          padding: '0.15rem 0.55rem', 
                          borderRadius: '9999px',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                      >
                        {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#0284c7',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <CheckCheck size={14} />
                      <span>Tout marquer comme lu</span>
                    </button>
                  )}
                </div>

                {/* Liste des notifications */}
                {notifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                    <Bell size={28} style={{ opacity: 0.35, marginBottom: '0.5rem' }} />
                    <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: 500 }}>
                      Aucune notification pour le moment.
                    </p>
                  </div>
                ) : (
                  <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {notifications.slice(0, 10).map((n) => {
                      const isUnread = !n.lu;
                      return (
                        <div 
                          key={n.id} 
                          onClick={() => handleNotificationClick(n)}
                          style={{ 
                            fontSize: '0.82rem', 
                            padding: '0.75rem 0.85rem', 
                            backgroundColor: isUnread ? '#f0fdf4' : '#f8fafc', 
                            borderRadius: '10px', 
                            borderLeft: isUnread ? '3px solid #10b981' : '3px solid #cbd5e1',
                            cursor: isUnread ? 'pointer' : 'default',
                            transition: 'all 0.15s ease',
                            position: 'relative'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.backgroundColor = isUnread ? '#e2f9eb' : '#f1f5f9';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.backgroundColor = isUnread ? '#f0fdf4' : '#f8fafc';
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: isUnread ? 800 : 600, color: '#0a3641' }}>
                              {n.titre}
                            </span>
                            {isUnread && (
                              <span 
                                style={{ 
                                  width: '7px', 
                                  height: '7px', 
                                  borderRadius: '50%', 
                                  backgroundColor: '#e41e3f',
                                  display: 'inline-block' 
                                }} 
                                title="Non lue"
                              />
                            )}
                          </div>
                          <p style={{ color: '#475569', fontSize: '0.77rem', margin: 0, lineHeight: 1.45 }}>
                            {n.message}
                          </p>
                          {n.date_creation && (
                            <span style={{ display: 'block', fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.35rem' }}>
                              {new Date(n.date_creation).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* User Role Badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderLeft: '1px solid #e2e8f0', paddingLeft: '1.25rem' }}>
            <div className="header-hide-mobile">
              <span style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#ffffff',
                backgroundColor: roleInfo.color,
                padding: '0.35rem 0.85rem',
                borderRadius: '9999px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
                letterSpacing: '0.01em'
              }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#ffffff', opacity: 0.9 }}></span>
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
                const [itemPath, itemSearch = ''] = item.path.split('?');
                const isActive = location.pathname === itemPath && location.search === (itemSearch ? "?" + itemSearch : '');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    state={item.path === '/nouvelle-demande' ? { from: `${location.pathname}${location.search}` } : undefined}
                    onClick={() => setMobileMenuOpen(false)}
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
            borderRadius: '12px',
            backgroundColor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
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

      {/* Floating Role-Scoped Chatbot Assistant */}
      <ChatbotWidget />

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
