import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import AppLayout from '../components/AppLayout';

const NotFound = () => {
  return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', textAlign: 'center' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: '#e2e8f0', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <FileQuestion size={40} />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#070b19', marginBottom: '1rem' }}>
          404 - Page Introuvable
        </h1>
        <p style={{ fontSize: '1rem', color: '#64748b', maxWidth: '400px', marginBottom: '2rem' }}>
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <Link to="/dashboard" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
          Retourner au Tableau de Bord
        </Link>
      </div>
    </AppLayout>
  );
};

export default NotFound;
