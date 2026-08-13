import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, GraduationCap } from 'lucide-react';
import { AuthContext } from './AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav style={{ background: 'var(--bg-card)', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ background: 'var(--secondary-color)', padding: '0.5rem', borderRadius: '8px' }}>
          <GraduationCap size={24} color="var(--primary-color)" />
        </div>
        <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Portail Diplômes</h2>
      </div>
      
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <User size={18} />
            <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{user.first_name || user.username} {user.last_name}</span>
            <span style={{ fontSize: '0.75rem', background: 'var(--secondary-color)', padding: '0.25rem 0.5rem', borderRadius: '999px', marginLeft: '0.5rem', fontWeight: 600 }}>
              {user.role}
            </span>
          </div>
          
          <button onClick={handleLogout} className="btn" style={{ background: '#fee2e2', color: 'var(--danger-color)' }}>
            <LogOut size={16} /> Déconnexion
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
