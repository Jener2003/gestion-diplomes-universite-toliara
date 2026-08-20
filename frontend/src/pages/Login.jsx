import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import ToliaraLogo from '../components/ToliaraLogo';
import {
  Lock,
  User,
  ArrowLeft,
  GraduationCap,
  UserCheck,
  Building2,
  Printer,
  Landmark
} from 'lucide-react';

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
      navigate(
        res.user?.role === 'ETUDIANT'
          ? '/mes-demandes'
          : '/dashboard'
      );
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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#070b19',
        padding: '1.5rem',
        fontFamily: 'Manrope, system-ui, sans-serif'
      }}
    >
      <div
        className="card animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '460px',
          borderRadius: '20px',
          padding: '2.75rem 2.25rem',
          boxShadow: '0 25px 50px -12px rgba(5, 6, 15, 0.45)',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}
      >
        {/* Top Back Link */}
        <div
          style={{
            marginBottom: '1.75rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <Link
            to="/"
            style={{
              color: '#475569',
              fontSize: '0.85rem',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontWeight: 600
            }}
          >
            <ArrowLeft size={16} />
            <span>Accueil</span>
          </Link>

          <span
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#c0000c',
              backgroundColor: '#fff0ee',
              padding: '0.2rem 0.6rem',
              borderRadius: '9999px'
            }}
          >
            Portail Sécurisé
          </span>
        </div>

        {/* Header Logo */}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '2rem'
          }}
        >
          <ToliaraLogo
            size="large"
            showText={false}
          />

          <h2
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: '#070b19',
              marginTop: '1rem'
            }}
          >
            Université de Toliara
          </h2>

          <p
            style={{
              fontSize: '0.875rem',
              color: '#64748b',
              marginTop: '0.25rem'
            }}
          >
            Authentification Étudiants & Personnel Administratif
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            className="animate-fade-in"
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#991b1b',
              padding: '0.85rem 1rem',
              borderRadius: '12px',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
              fontWeight: 600
            }}
          >
            {error}
          </div>
        )}

        {/* Login Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}
        >
          {/* Username */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#070b19',
                marginBottom: '0.5rem'
              }}
            >
              Identifiant / Nom d'utilisateur
            </label>

            <div style={{ position: 'relative' }}>
              <User
                size={18}
                color="#94a3b8"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              />

              <input
                type="text"
                required
                placeholder="Ex: chef1, scolarite1..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 2.75rem',
                  fontSize: '0.95rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#070b19',
                marginBottom: '0.5rem'
              }}
            >
              Mot de passe
            </label>

            <div style={{ position: 'relative' }}>
              <Lock
                size={18}
                color="#94a3b8"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              />

              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 2.75rem',
                  fontSize: '0.95rem',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Submit */}
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
            {loading
              ? 'Connexion en cours...'
              : 'Se connecter au système'}
          </button>
        </form>

        {/* Demo Accounts */}
        <div
          style={{
            marginTop: '2.25rem',
            paddingTop: '1.75rem',
            borderTop: '1px solid #e2e8f0'
          }}
        >
          <span
            style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: 700,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '1rem',
              textAlign: 'center'
            }}
          >
            Comptes de Démonstration Rapides
          </span>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.6rem'
            }}
          >
            {/* Étudiant */}
            <button
              type="button"
              onClick={() => fillDemoAccount('etu_2026_01')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.5rem',
                fontSize: '0.75rem',
                background: '#fef3c7',
                color: '#92400e',
                borderRadius: '8px',
                fontWeight: 600,
                border: '1px solid #fde68a'
              }}
            >
              <GraduationCap size={15} />
              Étudiant
            </button>

            {/* Chef de service */}
            <button
              type="button"
              onClick={() => fillDemoAccount('chef1')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.5rem',
                fontSize: '0.75rem',
                background: '#fff0ee',
                color: '#070b19',
                borderRadius: '8px',
                fontWeight: 600,
                border: '1px solid #cbd5e1'
              }}
            >
              <UserCheck size={15} />
              Chef de Service
            </button>

            {/* Scolarité */}
            <button
              type="button"
              onClick={() => fillDemoAccount('scolarite1')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.5rem',
                fontSize: '0.75rem',
                background: '#e0f5f4',
                color: '#048b9a',
                borderRadius: '8px',
                fontWeight: 600,
                border: '1px solid #a8ded9'
              }}
            >
              <Building2 size={15} />
              Scolarité
            </button>

            {/* Imprimeur */}
            <button
              type="button"
              onClick={() => fillDemoAccount('imprimeur1')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.5rem',
                fontSize: '0.75rem',
                background: '#cffafe',
                color: '#0891b2',
                borderRadius: '8px',
                fontWeight: 600,
                border: '1px solid #a5f3fc'
              }}
            >
              <Printer size={15} />
              Imprimeur
            </button>

            {/* Présidence */}
            <button
              type="button"
              onClick={() => fillDemoAccount('presidence1')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.5rem',
                fontSize: '0.75rem',
                background: '#fde8e8',
                color: '#c0000c',
                borderRadius: '8px',
                fontWeight: 600,
                border: '1px solid #f3b8b8'
              }}
            >
              <Landmark size={15} />
              Présidence
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;