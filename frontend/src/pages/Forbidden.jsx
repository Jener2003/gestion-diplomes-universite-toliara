import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import AppLayout from '../components/AppLayout';

const Forbidden = () => {
  return (
    <AppLayout>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '65vh',
          textAlign: 'center',
          padding: '2rem'
        }}
        className="animate-fade-in"
      >
        <div
          style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            backgroundColor: '#fee2e2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '2rem',
            boxShadow: '0 8px 16px rgba(239, 68, 68, 0.15)'
          }}
        >
          <ShieldAlert size={44} />
        </div>

        <h1
          style={{
            fontSize: '2.25rem',
            fontWeight: 800,
            color: '#070b19',
            marginBottom: '0.75rem',
            letterSpacing: '-0.02em'
          }}
        >
          403 - Accès Refusé
        </h1>

        <p
          style={{
            fontSize: '1.05rem',
            color: '#475569',
            maxWidth: '460px',
            marginBottom: '2.5rem',
            lineHeight: 1.6,
            fontWeight: 500
          }}
        >
          Désolé, vous n'avez pas les autorisations requises pour
          consulter cet espace avec votre profil utilisateur actuel.
        </p>

        <Link
          to="/dashboard"
          className="btn btn-primary"
          style={{
            padding: '0.85rem 1.75rem',
            borderRadius: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <ArrowLeft size={18} />
          <span>Retourner au Tableau de Bord</span>
        </Link>
      </div>
    </AppLayout>
  );
};

export default Forbidden;