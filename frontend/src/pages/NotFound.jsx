import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import AdminLayout from '../components/AdminLayout';
import { useAuth } from '../components/AuthContext';
import { accueilParRole, ROLE_ADMIN } from '../services/espaces';

const NotFound = () => {
  const { user } = useAuth();
  const Layout = user?.role === ROLE_ADMIN ? AdminLayout : AppLayout;
  return (
    <Layout>
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
            backgroundColor: '#f1f5f9',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '2rem',
            boxShadow: '0 8px 16px rgba(100, 116, 139, 0.1)'
          }}
        >
          <FileQuestion size={44} />
        </div>

        <h1
          style={{
            fontSize: '2rem',
            fontWeight: 800,
            color: '#070b19',
            marginBottom: '1rem'
          }}
        >
          404 - Page Introuvable
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
          La ressource demandée n'existe pas ou a été déplacée
          définitivement par les administrateurs du système.
        </p>

        <Link
          to={accueilParRole(user?.role)}
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
    </Layout>
  );
};

export default NotFound;