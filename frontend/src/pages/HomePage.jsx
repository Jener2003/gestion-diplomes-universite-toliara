import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ToliaraLogo from '../components/ToliaraLogo';
import { demandesAPI } from '../services/api';
import {
  LogIn,
  Award,
  CheckCircle2,
  Building2,
  FileText,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Lock,
  ChevronRight,
  Fingerprint,
  Layers,
  Shield,
  UserCheck
} from 'lucide-react';

const HomePage = () => {
  const [stats, setStats] = useState({
    total: 5,
    disponibles: 1,
    recues: 1,
    verifiees: 1
  });

  useEffect(() => {
    demandesAPI.getStatsOverview()
      .then(res => setStats(res.data))
      .catch(err => console.error("Stats fetch error:", err));
  }, []);

  const administrativeRoles = [
    {
      title: 'Chef de Service',
      badge: 'Guichet & Dépôt',
      desc: 'Enregistrement physique des dossiers déposés au guichet, contrôle initial de conformité et validation de recevabilité.',
      color: '#38bdf8',
      icon: CheckCircle2
    },
    {
      title: 'Scolarité Centrale',
      badge: 'Contrôle Académique',
      desc: 'Confrontation rigoureuse avec les procès-verbaux de délibération des jurys et validation de l\'aptitude au grade.',
      color: '#0ea5e9',
      icon: Building2
    },
    {
      title: 'Service Impression',
      badge: 'Édition Fiduciaire',
      desc: 'Tirage sur papier sécurisé certifié, incrustation du filigrane et apposition des éléments graphiques infalsifiables.',
      color: '#06b6d4',
      icon: FileText
    },
    {
      title: 'Présidence',
      badge: 'Signature & Sceau',
      desc: 'Signature solennelle, scellement officiel par le grand sceau de l\'Université et publication du registre des diplômes prêts.',
      color: '#10b981',
      icon: Award
    }
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#030712',
        color: '#f8fafc',
        fontFamily: 'Manrope, system-ui, -apple-system, sans-serif',
        position: 'relative',
        overflowX: 'hidden'
      }}
    >
      {/* Background Aurora / Mesh Gradients (Zeabur Style) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: '1440px',
          height: '800px',
          background: 'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(14, 165, 233, 0.28) 0%, rgba(15, 76, 92, 0.22) 40%, rgba(3, 7, 18, 0) 80%)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '280px',
          left: '-10%',
          width: '520px',
          height: '520px',
          background: 'radial-gradient(circle, rgba(4, 139, 154, 0.16) 0%, rgba(3, 7, 18, 0) 70%)',
          filter: 'blur(75px)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '650px',
          right: '-10%',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(14, 165, 233, 0.12) 0%, rgba(3, 7, 18, 0) 70%)',
          filter: 'blur(85px)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Sticky Translucent Dark Navbar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          backgroundColor: 'rgba(3, 7, 18, 0.78)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 50,
          padding: '0.85rem 2rem',
          transition: 'all 0.2s ease'
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <ToliaraLogo size="medium" variant="dark" />
          </Link>

          {/* Center Navigation Links */}
          <nav
            className="header-hide-mobile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '2rem',
              fontSize: '0.9rem',
              fontWeight: 500,
              color: '#94a3b8'
            }}
          >
            <a href="#circuit" style={{ transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ffffff'} onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}>
              Circuit Administratif
            </a>
            <a href="#roles" style={{ transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ffffff'} onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}>
              Services & Habilitations
            </a>
            <a href="#securite" style={{ transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = '#ffffff'} onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}>
              Sécurité & Traçabilité
            </a>
          </nav>

          {/* Right CTA Button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '0.55rem 1.25rem',
                borderRadius: '9999px',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(8px)'
              }}
              onMouseOver={e => {
                e.currentTarget.style.backgroundColor = '#ffffff';
                e.currentTarget.style.color = '#030712';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 255, 255, 0.35)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <LogIn size={16} />
              <span>Connexion Intranet</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <section
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '5.5rem 1.5rem 4rem',
          maxWidth: '1100px',
          margin: '0 auto',
          textAlign: 'center'
        }}
      >
        {/* Top Floating Pill Badge */}
        <div
          className="animate-fade-in"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.4rem 1.2rem',
            borderRadius: '9999px',
            backgroundColor: 'rgba(14, 165, 233, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#38bdf8',
            fontSize: '0.825rem',
            fontWeight: 600,
            marginBottom: '2rem',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 0 25px rgba(14, 165, 233, 0.15)'
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#00d2df',
              boxShadow: '0 0 8px #00d2df'
            }}
          />
          <span>Portail Officiel • Personnel Administratif & Gouvernance</span>
          <ChevronRight size={14} style={{ opacity: 0.8 }} />
        </div>

        {/* Hero Title */}
        <h1
          className="animate-fade-in"
          style={{
            fontSize: 'clamp(2.2rem, 5.5vw, 4rem)',
            fontWeight: 800,
            lineHeight: 1.12,
            letterSpacing: '-0.03em',
            marginBottom: '1.5rem',
            maxWidth: '980px',
            margin: '0 auto 1.5rem'
          }}
        >
          <span className="text-gradient-white">Gestion, Traçabilité & Délivrance</span>
          <br />
          <span className="text-gradient-petrol">des Diplômes Universitaires.</span>
        </h1>

        {/* Hero Subtitle */}
        <p
          className="animate-fade-in"
          style={{
            fontSize: 'clamp(1rem, 2vw, 1.2rem)',
            color: '#94a3b8',
            maxWidth: '780px',
            margin: '0 auto 2.75rem',
            lineHeight: 1.65,
            fontWeight: 400
          }}
        >
          Plateforme intranet réservée au personnel administratif de l'Université de Toliara :
          instruction des dossiers de guichet, validation académique des procès-verbaux,
          tirage fiduciaire et signature officielle à la Présidence.
        </p>

        {/* Hero Action Buttons */}
        <div
          className="animate-fade-in"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '4.5rem'
          }}
        >
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: '#ffffff',
              color: '#030712',
              padding: '0.95rem 2.25rem',
              borderRadius: '9999px',
              fontSize: '1rem',
              fontWeight: 700,
              boxShadow: '0 0 30px rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.5)',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 0 45px rgba(56, 189, 248, 0.5)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(255, 255, 255, 0.25), 0 4px 12px rgba(0, 0, 0, 0.5)';
            }}
          >
            <LogIn size={18} />
            <span>Accéder à l'Intranet Administratif</span>
            <ArrowRight size={16} />
          </Link>

          <a
            href="#roles"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.6rem',
              backgroundColor: 'rgba(10, 25, 45, 0.65)',
              color: '#e2e8f0',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              padding: '0.95rem 2rem',
              borderRadius: '9999px',
              fontSize: '0.975rem',
              fontWeight: 600,
              backdropFilter: 'blur(12px)',
              transition: 'all 0.25s ease'
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = '#38bdf8';
              e.currentTarget.style.backgroundColor = 'rgba(14, 165, 233, 0.15)';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.3)';
              e.currentTarget.style.backgroundColor = 'rgba(10, 25, 45, 0.65)';
              e.currentTarget.style.color = '#e2e8f0';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <Layers size={18} style={{ color: '#38bdf8' }} />
            <span>Consulter les Rôles & Habilitations</span>
          </a>
        </div>

        {/* Intranet Staff Operation Showcase (Hero Centerpiece) */}
        <div
          id="roles"
          className="dark-glass-card animate-fade-in"
          style={{
            maxWidth: '920px',
            margin: '0 auto 4rem',
            padding: '2.25rem 2.5rem',
            textAlign: 'left',
            position: 'relative',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            boxShadow: '0 20px 50px -15px rgba(0, 0, 0, 0.8), 0 0 35px rgba(14, 165, 233, 0.15)'
          }}
        >
          {/* Header of the Showcase */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981', boxShadow: '0 0 10px #10b981' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Écosystème du Personnel Administratif
              </span>
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#38bdf8', backgroundColor: 'rgba(14, 165, 233, 0.1)', padding: '0.25rem 0.75rem', borderRadius: '9999px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <Lock size={12} />
              <span>Authentification Forte 2FA Requise</span>
            </div>
          </div>

          {/* 4 Staff Roles Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.25rem',
              marginBottom: '1.75rem'
            }}
          >
            {administrativeRoles.map((role, idx) => {
              const Icon = role.icon;
              return (
                <div
                  key={idx}
                  style={{
                    backgroundColor: 'rgba(4, 10, 20, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '14px',
                    padding: '1.25rem 1rem',
                    transition: 'all 0.25s ease'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.borderColor = role.color;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.backgroundColor = 'rgba(10, 25, 45, 0.8)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.backgroundColor = 'rgba(4, 10, 20, 0.7)';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: `${role.color}20`,
                        color: role.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <Icon size={18} />
                    </div>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        color: role.color,
                        backgroundColor: `${role.color}15`,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px'
                      }}
                    >
                      {role.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.35rem' }}>
                    {role.title}
                  </h3>
                  <p style={{ fontSize: '0.785rem', color: '#94a3b8', lineHeight: 1.55 }}>
                    {role.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Bottom Intranet Action Bar */}
          <div
            style={{
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem'
            }}
          >
            <span style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
              Chaque agent accède à son espace dédié en fonction de son rôle attribué.
            </span>

            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#0ea5e9',
                color: '#ffffff',
                padding: '0.6rem 1.25rem',
                borderRadius: '10px',
                fontSize: '0.85rem',
                fontWeight: 700,
                boxShadow: '0 0 18px rgba(14, 165, 233, 0.4)'
              }}
            >
              <LogIn size={15} />
              <span>Ouvrir ma Session Agent</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 4-Step Administrative Workflow Section */}
      <section
        id="circuit"
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '6rem 1.5rem',
          backgroundColor: '#040914',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                color: '#38bdf8',
                fontSize: '0.85rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '0.75rem'
              }}
            >
              <Sparkles size={16} />
              <span>Workflow Sécurisé</span>
            </div>
            <h2 style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.5rem)', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Le Circuit Officiel d'Instruction des Diplômes
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem', maxWidth: '650px', margin: '0.75rem auto 0' }}>
              Chaque titre universitaire franchit 4 étapes rigoureuses et inviolables
              garantissant sa conformité et son authenticité.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.75rem'
            }}
          >
            {/* Step 1 */}
            <div className="dark-glass-card" style={{ padding: '2rem 1.5rem', position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#38bdf8',
                  backgroundColor: 'rgba(14, 165, 233, 0.12)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px'
                }}
              >
                ÉTAPE 01
              </div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                <CheckCircle2 size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                1. Chef de Service
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.65 }}>
                Enregistrement physique du dossier déposé au guichet, contrôle rigoureux des pièces justificatives et validation de recevabilité.
              </p>
            </div>

            {/* Step 2 */}
            <div className="dark-glass-card" style={{ padding: '2rem 1.5rem', position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#38bdf8',
                  backgroundColor: 'rgba(14, 165, 233, 0.12)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px'
                }}
              >
                ÉTAPE 02
              </div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(14, 165, 233, 0.15)',
                  color: '#0ea5e9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                <Building2 size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                2. Scolarité Centrale
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.65 }}>
                Confrontation avec les procès-verbaux de délibération des jurys et constitution du registre officiel d'aptitude.
              </p>
            </div>

            {/* Step 3 */}
            <div className="dark-glass-card" style={{ padding: '2rem 1.5rem', position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#38bdf8',
                  backgroundColor: 'rgba(14, 165, 233, 0.12)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px'
                }}
              >
                ÉTAPE 03
              </div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                  color: '#06b6d4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                <FileText size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                3. Service Impression
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.65 }}>
                Édition sécurisée sur papier fiduciaire filigrané et incrustation du code cryptographique unique anti-copie.
              </p>
            </div>

            {/* Step 4 */}
            <div className="dark-glass-card" style={{ padding: '2rem 1.5rem', position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: '#10b981',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px'
                }}
              >
                ÉTAPE 04
              </div>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '1.25rem'
                }}
              >
                <Award size={24} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                4. Présidence & Délivrance
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#94a3b8', lineHeight: 1.65 }}>
                Signature solennelle, apposition du grand sceau de l'Université et mise à disposition immédiate au guichet.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live General Statistics Banner */}
      <section
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '5rem 1.5rem',
          maxWidth: '1100px',
          margin: '0 auto'
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
            Indicateurs & Chiffres Clés de Gestion
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '0.4rem' }}>
            Suivi consolidé de l'ensemble des titres instruits et délivrés par l'Université de Toliara
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            textAlign: 'center'
          }}
        >
          <div className="dark-glass-card" style={{ padding: '2rem 1rem' }}>
            <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#38bdf8', display: 'block', lineHeight: 1 }}>
              {stats.total || 5}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.5rem', display: 'block', fontWeight: 600 }}>
              Dossiers Enregistrés
            </span>
          </div>

          <div className="dark-glass-card" style={{ padding: '2rem 1rem' }}>
            <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#10b981', display: 'block', lineHeight: 1 }}>
              {stats.disponibles || 1}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.5rem', display: 'block', fontWeight: 600 }}>
              Diplômes Prêts au Retrait
            </span>
          </div>

          <div className="dark-glass-card" style={{ padding: '2rem 1rem' }}>
            <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#f59e0b', display: 'block', lineHeight: 1 }}>
              {(stats.total - stats.disponibles) || 4}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.5rem', display: 'block', fontWeight: 600 }}>
              En Cours d'Instruction
            </span>
          </div>

          <div className="dark-glass-card" style={{ padding: '2rem 1rem' }}>
            <span style={{ fontSize: '2.75rem', fontWeight: 800, color: '#ffffff', display: 'block', lineHeight: 1 }}>
              4
            </span>
            <span style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '0.5rem', display: 'block', fontWeight: 600 }}>
              Services Habilités Connectés
            </span>
          </div>
        </div>
      </section>

      {/* Security Pillars Section */}
      <section
        id="securite"
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '5rem 1.5rem',
          backgroundColor: '#040813',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em' }}>
              Sécurité, Authentification & Traçabilité
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginTop: '0.4rem' }}>
              Une architecture fermée et sécurisée pour garantir la probité du circuit administratif
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '2rem'
            }}
          >
            <div className="dark-glass-card" style={{ padding: '2rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <Lock size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                Double Authentification 2FA
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                Chaque connexion administrative est protégée par un code OTP éphémère envoyé sur le courrier électronique de l'agent.
              </p>
            </div>

            <div className="dark-glass-card" style={{ padding: '2rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <Fingerprint size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                Contrôle d'Accès par Rôle (RBAC)
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                Les opérations (dépôt, validation PV, tirage, signature) sont cloisonnées selon les habilitations strictes du rôle.
              </p>
            </div>

            <div className="dark-glass-card" style={{ padding: '2rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <ShieldCheck size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#ffffff', marginBottom: '0.5rem' }}>
                Journal d'Audit Immuable
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.6 }}>
                Chaque validation et transition d'état est horodatée avec l'identifiant nominatif de l'agent responsable.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Institutional Dark Footer */}
      <footer
        style={{
          position: 'relative',
          zIndex: 1,
          backgroundColor: '#02040a',
          color: '#64748b',
          padding: '3.5rem 1.5rem 2.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          textAlign: 'center',
          fontSize: '0.85rem'
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.25rem'
          }}
        >
          <ToliaraLogo size="medium" variant="dark" />

          <p style={{ maxWidth: '600px', color: '#94a3b8', lineHeight: 1.6 }}>
            © {new Date().getFullYear()} Université de Toliara • République de Madagascar.
            <br />
            Système Intranet de Gestion & Délivrance des Diplômes Universitaires.
          </p>

          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#64748b' }}>
            <Link to="/login" style={{ color: '#38bdf8' }}>Accès Intranet Personnel</Link>
            <span>•</span>
            <a href="#circuit" style={{ color: '#38bdf8' }}>Circuit Administratif</a>
            <span>•</span>
            <span>Support Scolarité Centrale</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;