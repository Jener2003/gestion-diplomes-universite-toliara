import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TulearLogo from '../components/TulearLogo';
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
    <div style={{ minHeight: '100vh', backgroundColor: '#ffffff', color: '#0f172a', fontFamily: 'Inter, system-ui, sans-serif' }}>
      
      {/* Top Bar Navigation */}
      <header style={{
        position: 'sticky',
        top: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        zIndex: 50,
        padding: '0.85rem 2rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <TulearLogo size="medium" />

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/verification" className="btn btn-outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', padding: '0.6rem 1.25rem' }}>
              <Search size={18} color="#1d70b8" />
              <span className="btn-text-verif">Vérifier mon diplôme</span>
            </Link>

            <Link to="/login" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '10px', padding: '0.6rem 1.25rem' }}>
              <LogIn size={18} />
              <span>Espace Agent Administratif</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        background: 'radial-gradient(circle at 10% 20%, #0a3641 0%, #07252d 44%, #04161a 100%)',
        color: '#ffffff',
        padding: '6rem 2rem 7rem',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center'
      }}>
        {/* Animated Background Mesh Shapes */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 180, 216, 0.15) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-20%',
          left: '-10%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(29, 112, 184, 0.12) 0%, rgba(0,0,0,0) 75%)',
          pointerEvents: 'none'
        }} />

        <div className="animate-fade-in" style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.4rem 1.25rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(0, 180, 216, 0.08)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(0, 180, 216, 0.25)',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#00b4d8',
            marginBottom: '2rem'
          }}>
            <Sparkles size={16} />
            <span>Plateforme Numérique de Suivi Administratif</span>
          </div>

          <h1 style={{ fontSize: '3.25rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.5rem', letterSpacing: '-0.03em' }}>
            Gestion & Suivi du Circuit des Diplômes Universitaires
          </h1>
          <p style={{ fontSize: '1.2rem', color: '#94a3b8', maxWidth: '780px', margin: '0 auto 3rem', lineHeight: 1.65 }}>
            Numérisation intégrale du workflow d'instruction, de validation académique, d'impression sécurisée et de signature à la Présidence de l'Université de Tuléar.
          </p>

          {/* Action CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <Link to="/verification" className="btn" style={{
              backgroundColor: '#1d70b8',
              color: '#ffffff',
              padding: '1rem 2.25rem',
              fontSize: '1rem',
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(29, 112, 184, 0.35)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Search size={20} />
              <span>Vérifier la disponibilité de mon diplôme</span>
              <ArrowRight size={18} />
            </Link>

            <Link to="/login" className="btn" style={{
              backgroundColor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#ffffff',
              padding: '1rem 2rem',
              fontSize: '1rem',
              borderRadius: '12px',
              backdropFilter: 'blur(4px)'
            }}>
              <LogIn size={20} />
              <span>Accès Administration</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Key Features & Roles Overview */}
      <section style={{ padding: '6rem 2rem', backgroundColor: '#f8fafc' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <h2 style={{ fontSize: '2.25rem', fontWeight: 800, color: '#0a3641', letterSpacing: '-0.02em' }}>
              Le Circuit Administratif à l'Université de Tuléar
            </h2>
            <p style={{ color: '#64748b', fontSize: '1.1rem', marginTop: '0.5rem' }}>
              Une coordination fluide et transparente entre tous les services universitaires
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem' }}>
            
            {/* Step 1 */}
            <div className="card" style={{ padding: '2rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: 'rgba(10, 54, 65, 0.06)', color: '#0a3641', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <CheckCircle size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0a3641', marginBottom: '0.75rem' }}>
                1. Chef de Service
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.7, flexGrow: 1 }}>
                Vérification initiale des pièces du dossier transmis, validation ou demande de compléments.
              </p>
            </div>

            {/* Step 2 */}
            <div className="card" style={{ padding: '2rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: 'rgba(29, 112, 184, 0.08)', color: '#1d70b8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Building2 size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0a3641', marginBottom: '0.75rem' }}>
                2. Scolarité Centrale
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.7, flexGrow: 1 }}>
                Contrôle des procès-verbaux d'examen et préparation du dossier académique final.
              </p>
            </div>

            {/* Step 3 */}
            <div className="card" style={{ padding: '2rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: 'rgba(0, 180, 216, 0.08)', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <FileText size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0a3641', marginBottom: '0.75rem' }}>
                3. Service Impression
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.7, flexGrow: 1 }}>
                Impression sur papier sécurisé certifié et contrôle de conformité des titres.
              </p>
            </div>

            {/* Step 4 */}
            <div className="card" style={{ padding: '2rem', borderRadius: '18px', display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ width: '54px', height: '54px', borderRadius: '14px', background: 'rgba(124, 58, 237, 0.08)', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
                <Award size={28} />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0a3641', marginBottom: '0.75rem' }}>
                4. Présidence & Retrait
              </h3>
              <p style={{ fontSize: '0.9rem', color: '#475569', lineHeight: 1.7, flexGrow: 1 }}>
                Apposition du sceau et signature officielle, puis publication automatique du diplôme disponible au guichet.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* Live General Statistics Banner */}
      <section style={{ 
        padding: '5rem 2rem', 
        background: 'linear-gradient(135deg, #0a3641 0%, #06232b 100%)', 
        color: '#ffffff' 
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Chiffres Clés du Service des Diplômes</h2>
            <p style={{ color: '#94a3b8', fontSize: '1rem', marginTop: '0.5rem' }}>Statistiques en temps réel du système administratif</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem', textAlign: 'center' }}>
            
            <div style={{ padding: '2rem 1.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)' }}>
              <span style={{ fontSize: '3rem', fontWeight: 800, color: '#00b4d8', display: 'block', lineHeight: 1 }}>{stats.total || 5}</span>
              <span style={{ fontSize: '0.95rem', color: '#94a3b8', display: 'block', marginTop: '0.5rem', fontWeight: 500 }}>Dossiers Traités</span>
            </div>

            <div style={{ padding: '2rem 1.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)' }}>
              <span style={{ fontSize: '3rem', fontWeight: 800, color: '#10b981', display: 'block', lineHeight: 1 }}>{stats.disponibles || 1}</span>
              <span style={{ fontSize: '0.95rem', color: '#94a3b8', display: 'block', marginTop: '0.5rem', fontWeight: 500 }}>Prêts au Retrait</span>
            </div>

            <div style={{ padding: '2rem 1.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)' }}>
              <span style={{ fontSize: '3rem', fontWeight: 800, color: '#f59e0b', display: 'block', lineHeight: 1 }}>{(stats.total - stats.disponibles) || 4}</span>
              <span style={{ fontSize: '0.95rem', color: '#94a3b8', display: 'block', marginTop: '0.5rem', fontWeight: 500 }}>En Cours de Traitement</span>
            </div>

            <div style={{ padding: '2rem 1.5rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)' }}>
              <span style={{ fontSize: '3rem', fontWeight: 800, color: '#ffffff', display: 'block', lineHeight: 1 }}>4</span>
              <span style={{ fontSize: '0.95rem', color: '#94a3b8', display: 'block', marginTop: '0.5rem', fontWeight: 500 }}>Facultés Rattachées</span>
            </div>

          </div>

        </div>
      </section>

      {/* Footer */}
      <footer style={{ backgroundColor: '#051e24', color: '#94a3b8', padding: '3.5rem 2rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', textAlign: 'center', fontSize: '0.875rem' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          <TulearLogo size="small" variant="dark" />
          <p>© {new Date().getFullYear()} Université de Tuléar - République de Madagascar. Tous droits réservés.</p>
          <p style={{ fontSize: '0.775rem', color: '#475569' }}>Plateforme interne de numérisation du circuit des diplômes universitaires.</p>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) {
          .btn-text-verif { display: none !important; }
        }
      `}</style>

    </div>
  );
};

export default HomePage;
