import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import TulearLogo from '../components/TulearLogo';
import { LogIn, Lock, User, ShieldCheck, ArrowLeft, KeyRound } from 'lucide-react';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await login(username, password);
    setLoading(false);

    if (res.success) {
      navigate('/dashboard');
    } else {
      setError(res.error);
    }
  };

  const fillDemoAccount = (demoUsername) => {
    setUsername(demoUsername);
    setPassword('password123');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0a3641',
      backgroundImage: 'radial-gradient(circle at 50% 30%, #114b5f 0%, #0a3641 70%)',
      padding: '1.5rem',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      
      <div className="card animate-fade-in" style={{
        width: '100%',
        maxWidth: '460px',
        borderRadius: '20px',
        padding: '2.5rem 2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        backgroundColor: '#ffffff'
      }}>
        
        {/* Top Back Link */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link to="/" style={{ color: '#64748b', fontSize: '0.85rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 500 }}>
            <ArrowLeft size={16} />
            <span>Accueil</span>
          </Link>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d70b8', backgroundColor: '#e6f0f3', padding: '0.2rem 0.6rem', borderRadius: '9999px' }}>
            Portail Securisé
          </span>
        </div>

        {/* Header Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <TulearLogo size="large" showText={false} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0a3641', marginTop: '1rem' }}>
            Université de Tuléar
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>
            Authentification du Personnel Administratif
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            fontSize: '0.85rem',
            marginBottom: '1.25rem',
            fontWeight: 500
          }}>
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0a3641', marginBottom: '0.5rem' }}>
              Identifiant / Nom d'utilisateur
            </label>
            <div style={{ position: 'relative' }}>
              <User size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                required
                placeholder="Ex: chef1, scolarite1, imprimeur1..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  fontSize: '0.95rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#0a3641', marginBottom: '0.5rem' }}>
              Mot de passe
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  fontSize: '0.95rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              fontSize: '1rem',
              borderRadius: '10px',
              marginTop: '0.5rem'
            }}
          >
            {loading ? 'Connexion en cours...' : 'Se connecter au système'}
          </button>
        </form>

        {/* Demo Fast Account Switcher */}
        <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9' }}>
          <span style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', textAlign: 'center' }}>
            Comptes de Démonstration Rapides
          </span>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => fillDemoAccount('chef1')}
              style={{ padding: '0.5rem', fontSize: '0.75rem', background: '#e6f0f3', color: '#0a3641', borderRadius: '8px', fontWeight: 600, border: '1px solid #cbd5e1' }}
            >
              👨‍💼 Chef de Service
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('scolarite1')}
              style={{ padding: '0.5rem', fontSize: '0.75rem', background: '#dbeafe', color: '#1d70b8', borderRadius: '8px', fontWeight: 600, border: '1px solid #93c5fd' }}
            >
              🏛️ Scolarité
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('imprimeur1')}
              style={{ padding: '0.5rem', fontSize: '0.75rem', background: '#cffafe', color: '#0891b2', borderRadius: '8px', fontWeight: 600, border: '1px solid #a5f3fc' }}
            >
              🖨️ Imprimeur
            </button>
            <button
              type="button"
              onClick={() => fillDemoAccount('presidence1')}
              style={{ padding: '0.5rem', fontSize: '0.75rem', background: '#f3e8ff', color: '#7c3aed', borderRadius: '8px', fontWeight: 600, border: '1px solid #d8b4fe' }}
            >
              🏛️ Présidence
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Login;
