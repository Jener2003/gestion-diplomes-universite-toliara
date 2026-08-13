import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import AppLayout from '../components/AppLayout';

const Forbidden = () => {
  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <ShieldAlert size={40} />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#0a3641', marginBottom: '1rem' }}>
          403 - Accès Refusé
        </h1>
        <p style={{ fontSize: '1rem', color: '#64748b', maxWidth: '400px', marginBottom: '2rem' }}>
          Vous n'avez pas les permissions nécessaires pour accéder à cette page avec votre rôle actuel.
        </p>
        <Link to="/dashboard" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
          Retourner au Tableau de Bord
        </Link>
      </div>
    </AppLayout>
  );
};

export default Forbidden;
