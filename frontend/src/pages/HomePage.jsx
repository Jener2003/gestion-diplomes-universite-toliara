import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ToliaraLogo from '../components/ToliaraLogo';
import heroPhoto from '../assets/hero-presidence.jpg';
import { demandesAPI } from '../services/api';
import { 
  Search, 
  LogIn, 
  Award, 
  CheckCircle, 
  Building2, 
  Clock, 
  ShieldCheck, 
  FileText,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const HomePage = () => {
  const [stats, setStats] = useState({ total: 5, disponibles: 1, recues: 1, verifiees: 1 });

  useEffect(() => {
    demandesAPI.getStatsOverview()
      .then(res => setStats(res.data))
      .catch(err => console.error("Stats fetch error:", err));
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'Manrope, system-ui, sans-serif' }}>

      {/* Top Bar Navigation */}
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        zIndex: 50,
        padding: '0.85rem 2rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.03)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div className="header-brand" style={{ minWidth: 0 }}>
            <ToliaraLogo size="medium" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <Link to="/verification" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={18} color="#c0000c" />
              <span>Vérifier mon diplôme</span>
            </Link>

            <Link to="/login" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <LogIn size={18} />
              <span>Espace Agent Administratif</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        backgroundImage: `url(${heroPhoto})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: '#ffffff',
        padding: '5rem 2rem',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Superposition unie (pas de dégradé) pour la lisibilité du texte */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(7, 11, 25, 0.72)',
          pointerEvents: 'none'
        }} />

        <div style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255,255,255,0.12)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255,255,255,0.2)',
            fontSize: '0.85rem',
            fontWeight: 600,
            color: '#048b9a',
            marginBottom: '1.5rem'
          }}>
            <Sparkles size={16} />
            <span>Plateforme Numérique de Suivi Administratif</span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.85rem, 4vw + 1rem, 2.75rem)', fontWeight: 800, lineHeight: 1.2, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
            Gestion & Suivi du Circuit des Diplômes Universitaires
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#cbd5e1', maxWidth: '780px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
            Numérisation intégrale du workflow d'instruction, de validation académique, d'impression sécurisée et de signature à la Présidence de l'Université de Toliara.
          </p>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <Link to="/verification" className="btn" style={{
              backgroundColor: '#c0000c',
              color: '#ffffff',
              padding: '0.85rem 2rem',
              fontSize: '1rem',
              borderRadius: '12px',
              boxShadow: '0 4px 14px rgba(192, 0, 12, 0.4)'
            }}>
              <Search size={20} />
              <span>Vérifier la disponibilité de mon diplôme</span>
              <ArrowRight size={18} />
            </Link>

            <Link to="/login" className="btn btn-outline" style={{
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderColor: 'rgba(255,255,255,0.3)',
              color: '#ffffff',
              padding: '0.85rem 1.75rem',
              fontSize: '1rem',
              borderRadius: '12px',
              backdropFilter: 'blur(4px)'
            }}>
              <LogIn size={20} />
              <span>Accès Personnel Administratif</span>
            </Link>
          </div>
        </div>

        <span style={{
          position: 'relative', zIndex: 1, display: 'block', textAlign: 'center',
          marginTop: '2.5rem', fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)'
        }}>
          Photo : Présidence de l'Université de Toliara — Wikimedia Commons (CC BY-SA 4.0)
        </span>
      </section>

      {/* Key Features & Roles Overview */}
      <section style={{ padding: '4.5rem 2rem', backgroundColor: '#f8fafc' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#070b19' }}>
              Le Circuit Administratif à l'Université de Toliara
            </h2>
            <p style={{ color: '#64748b', fontSize: '1rem', marginTop: '0.5rem' }}>
              Une coordination fluide et transparente entre tous les services universitaires
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            
            {/* Step 1 */}
            <div className="card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fff0ee', color: '#070b19', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <CheckCircle size={26} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#070b19', marginBottom: '0.5rem' }}>
                1. Chef de Service
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
                Vérification initiale des pièces du dossier transmis, validation ou demande de compléments.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0f5f4', color: '#048b9a', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <Building2 size={26} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#070b19', marginBottom: '0.5rem' }}>
                2. Scolarité Centrale
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
                Contrôle des procès-verbaux d'examen et préparation du dossier académique final.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#cffafe', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <FileText size={26} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#070b19', marginBottom: '0.5rem' }}>
                3. Service Impression
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
                Impression sur papier sécurisé certifié et contrôle de conformité des titres.
              </p>
            </div>

            {/* Step 4 */}
            <div className="card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fde8e8', color: '#c0000c', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <Award size={26} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#070b19', marginBottom: '0.5rem' }}>
                4. Présidence & Retrait
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>
                Apposition du sceau et signature officielle, puis publication automatique du diplôme disponible au guichet.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Live General Statistics Banner */}
      <section style={{ padding: '4rem 2rem', backgroundColor: '#070b19', color: '#ffffff' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Chiffres Clés du Service des Diplômes</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem' }}>Statistiques en temps réel du système administratif</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem', textAlign: 'center' }}>
            
            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#048b9a', display: 'block' }}>{stats.total || 5}</span>
              <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>Dossiers Traités</span>
            </div>

            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#10b981', display: 'block' }}>{stats.disponibles || 1}</span>
              <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>Prêts au Retrait</span>
            </div>

            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f59e0b', display: 'block' }}>{(stats.total - stats.disponibles) || 4}</span>
              <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>En Cours de Traitement</span>
            </div>

            <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff', display: 'block' }}>4</span>
              <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>Facultés Rattachées</span>
            </div>

          </div>

        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#04060f', color: '#94a3b8', padding: '2.5rem 2rem', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', fontSize: '0.875rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <ToliaraLogo size="small" variant="dark" />
          <p>© {new Date().getFullYear()} Université de Toliara - République de Madagascar. Tous droits réservés.</p>
          <p style={{ fontSize: '0.775rem', color: '#64748b' }}>Plateforme interne de numérisation du circuit des diplômes universitaires.</p>
        </div>
      </footer>

    </div>
  );
};

export default HomePage;
