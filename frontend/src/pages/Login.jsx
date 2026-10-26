import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import ToliaraLogo from '../components/ToliaraLogo';
import { accueilParRole } from '../services/espaces';
import heroPhoto from '../assets/hero-presidence.jpg';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  UserPlus,
  ShieldCheck,
  RefreshCw,
  KeyRound,
  Shield
} from 'lucide-react';

// Sécurité : on empêche le navigateur de proposer « Enregistrer le mot de passe ».
// Les navigateurs détectent les champs type="password" et ignorent autocomplete="off" ;
// on utilise donc un champ texte masqué par CSS lorsque c'est supporté (Chrome, Edge, Safari),
// sinon un vrai champ mot de passe (jamais affiché en clair).
const MASQUAGE_CSS_SUPPORTE =
  typeof CSS !== 'undefined' && CSS.supports?.('-webkit-text-security', 'disc');

const Login = () => {
  // Step 1 state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 2 (OTP) state
  const [step, setStep] = useState(1); // 1 = credentials, 2 = OTP
  const [otpCode, setOtpCode] = useState('');
  const [emailHint, setEmailHint] = useState('');
  const [pendingUsername, setPendingUsername] = useState('');

  const { loginStep1, loginStep2 } = useAuth();
  const navigate = useNavigate();

  // ── Step 1: Submit credentials ──────────────────────────────────────────
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await loginStep1(username, password);
    setLoading(false);

    if (res.otpRequired) {
      setPendingUsername(res.username);
      setEmailHint(res.emailHint);
      if (res.devOtpCode) {
        setOtpCode(res.devOtpCode);
      }
      setStep(2);
    } else {
      setError(res.error);
    }
  };

  // ── Step 2: Submit OTP ──────────────────────────────────────────────────
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await loginStep2(pendingUsername, otpCode);
    setLoading(false);

    if (res.success) {
      setPassword('');
      setOtpCode('');
      // Redirection vers l'espace autorisé du rôle (contrôlé aussi côté serveur)
      navigate(accueilParRole(res.user?.role));
    } else {
      setError(res.error);
    }
  };

  // ── Resend OTP ──────────────────────────────────────────────────────────
  const handleResendOtp = async () => {
    setError('');
    setOtpCode('');
    setLoading(true);
    const res = await loginStep1(username, password);
    setLoading(false);
    if (res.otpRequired) {
      setEmailHint(res.emailHint);
    } else {
      setError(res.error);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#030712',
        color: '#f8fafc',
        fontFamily: 'Manrope, system-ui, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem 1.5rem',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Background Aurora / Mesh Gradients */}
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
          bottom: '-10%',
          left: '-10%',
          width: '500px',
          height: '500px',
          background: 'radial-gradient(circle, rgba(4, 139, 154, 0.18) 0%, rgba(3, 7, 18, 0) 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Main Split Container Card */}
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '1080px',
          borderRadius: '24px',
          backgroundColor: 'rgba(6, 13, 24, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(56, 189, 248, 0.22)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.85), 0 0 35px rgba(14, 165, 233, 0.15)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Left Side: Présidence Photography & Institutional Prestige */}
        <div
          style={{
            position: 'relative',
            backgroundImage: `url(${heroPhoto})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            minHeight: '440px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '2.5rem 2.25rem',
            overflow: 'hidden'
          }}
        >
          {/* Deep Petrol Dark Gradient Overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(145deg, rgba(3, 7, 18, 0.88) 0%, rgba(15, 76, 92, 0.82) 55%, rgba(6, 24, 38, 0.92) 100%)',
              pointerEvents: 'none',
              zIndex: 1
            }}
          />

          {/* Top Logo & Accreditation */}
          <div style={{ position: 'relative', zIndex: 2 }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.35rem 0.9rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(14, 165, 233, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                color: '#38bdf8',
                fontSize: '0.75rem',
                fontWeight: 700,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                backdropFilter: 'blur(8px)',
                marginBottom: '1.5rem'
              }}
            >
              <Shield size={14} />
              <span>Gouvernance & Administration</span>
            </div>

            <ToliaraLogo size="medium" variant="dark" />
          </div>

          {/* Bottom Photo Narrative & Badge */}
          <div style={{ position: 'relative', zIndex: 2, marginTop: '2rem' }}>
            <div
              style={{
                backgroundColor: 'rgba(3, 7, 18, 0.65)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '1.25rem 1.5rem',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)'
              }}
            >
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginBottom: '0.35rem' }}>
                Présidence de l'Université de Toliara
              </h4>
              <p style={{ fontSize: '0.8rem', color: '#cbd5e1', lineHeight: 1.55, margin: 0 }}>
                Hôtel Universitaire • Siège du grand sceau officiel, de la validation institutionnelle et de la délivrance des grades académiques.
              </p>
            </div>
            
            <span style={{ display: 'block', fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.75rem', textAlign: 'right' }}>
              Photo : Bâtiment Présidence — Université de Toliara
            </span>
          </div>
        </div>

        {/* Right Side: Authentication Form (Dark Petrol & White Aesthetic) */}
        <div
          style={{
            padding: '2.75rem 2.5rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundColor: 'rgba(4, 9, 18, 0.95)'
          }}
        >
          {/* Top Bar: Back Link & Portal Tag */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '2rem'
            }}
          >
            <Link
              to="/"
              style={{
                color: '#94a3b8',
                fontSize: '0.825rem',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontWeight: 600,
                transition: 'color 0.2s'
              }}
              onMouseOver={e => e.currentTarget.style.color = '#38bdf8'}
              onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
            >
              <ArrowLeft size={16} />
              <span>Retour à l'accueil</span>
            </Link>

            <span
              style={{
                fontSize: '0.725rem',
                fontWeight: 700,
                color: '#38bdf8',
                backgroundColor: 'rgba(14, 165, 233, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px'
              }}
            >
              Connexion du personnel
            </span>
          </div>

          {/* Form Title & Subtitle */}
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
              Connexion Agent
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginTop: '0.35rem', lineHeight: 1.5 }}>
              Espace réservé aux agents habilités du circuit administratif.
            </p>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div
              className="animate-fade-in"
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#fca5a5',
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

          {/* ── STEP 1: Credentials Form ───────────────────────── */}
          {step === 1 && (
            <>
              <form
                onSubmit={handleCredentialsSubmit}
                autoComplete="off"
                style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
              >
                {/* Username Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.45rem' }}>
                    Identifiant / Nom d'utilisateur
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={18}
                      style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                    />
                    <input
                      type="text"
                      name="ut-identifiant"
                      autoComplete="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      required
                      placeholder="Ex: chef1, scolarite1, presidence1..."
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.85rem 1rem 0.85rem 2.75rem',
                        fontSize: '0.925rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: 'rgba(2, 6, 14, 0.75)',
                        color: '#ffffff',
                        fontFamily: 'inherit',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = '#38bdf8';
                        e.target.style.boxShadow = '0 0 15px rgba(14, 165, 233, 0.25)';
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                  </div>
                </div>

                {/* Password Input with Show/Hide Eye Toggle */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.45rem' }}>
                    Mot de passe
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Lock
                      size={18}
                      style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                    />
                    <input
                      type={showPassword || MASQUAGE_CSS_SUPPORTE ? 'text' : 'password'}
                      name="ut-code-acces"
                      autoComplete="off"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      data-lpignore="true"
                      data-1p-ignore="true"
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      style={{
                        WebkitTextSecurity: showPassword ? 'none' : 'disc',
                        width: '100%',
                        padding: '0.85rem 2.75rem 0.85rem 2.75rem',
                        fontSize: '0.925rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        backgroundColor: 'rgba(2, 6, 14, 0.75)',
                        color: '#ffffff',
                        fontFamily: 'inherit',
                        outline: 'none',
                        transition: 'border-color 0.2s, box-shadow 0.2s'
                      }}
                      onFocus={e => {
                        e.target.style.borderColor = '#38bdf8';
                        e.target.style.boxShadow = '0 0 15px rgba(14, 165, 233, 0.25)';
                      }}
                      onBlur={e => {
                        e.target.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: showPassword ? '#38bdf8' : '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px',
                        transition: 'color 0.2s'
                      }}
                      onMouseOver={e => e.currentTarget.style.color = '#ffffff'}
                      onMouseOut={e => e.currentTarget.style.color = showPassword ? '#38bdf8' : '#64748b'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    borderRadius: '12px',
                    marginTop: '0.5rem',
                    backgroundColor: '#ffffff',
                    color: '#030712',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 0 25px rgba(255, 255, 255, 0.2), 0 4px 12px rgba(0, 0, 0, 0.5)',
                    transition: 'all 0.25s ease'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.backgroundColor = '#38bdf8';
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 0 30px rgba(56, 189, 248, 0.6)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.color = '#030712';
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(255, 255, 255, 0.2), 0 4px 12px rgba(0, 0, 0, 0.5)';
                    e.currentTarget.style.transform = 'none';
                  }}
                >
                  {loading ? (
                    <>
                      <div style={{ width: '16px', height: '16px', border: '2px solid #030712', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      <span>Vérification...</span>
                    </>
                  ) : (
                    <>
                      <span>Valider & Recevoir le code 2FA</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>

              {/* Inscription : l'agent crée lui-même son compte (validé ensuite par l'administrateur) */}
              <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
                <span style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                  Pas encore de compte ?
                </span>
                <Link
                  to="/inscription"
                  style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    width: '100%', padding: '0.8rem 1rem', borderRadius: '10px',
                    border: '1px solid rgba(56, 189, 248, 0.45)', color: '#e0f2fe',
                    fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none',
                    backgroundColor: 'rgba(56, 189, 248, 0.08)'
                  }}
                >
                  <UserPlus size={16} /> Créer mon compte
                </Link>
              </div>
            </>
          )}

          {/* ── STEP 2: OTP Verification Screen ───────────────── */}
          {step === 2 && (
            <div className="animate-fade-in">
              {/* Shield Icon + Info */}
              <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(14, 165, 233, 0.15)',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    marginBottom: '1rem',
                    boxShadow: '0 0 25px rgba(14, 165, 233, 0.25)'
                  }}
                >
                  <ShieldCheck size={30} />
                </div>

                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                  Vérification en deux étapes (2FA)
                </h3>
                <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.5rem', lineHeight: 1.55 }}>
                  Un code à 6 chiffres a été transmis à l'adresse<br />
                  <strong style={{ color: '#38bdf8' }}>{emailHint}</strong>
                </p>
              </div>

              <form
                onSubmit={handleOtpSubmit}
                autoComplete="off"
                style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
              >
                <div>
                  <label style={{ display: 'block', fontSize: '0.825rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '0.45rem' }}>
                    Code de sécurité à 6 chiffres
                  </label>
                  <div style={{ position: 'relative' }}>
                    <KeyRound
                      size={18}
                      style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}
                    />
                    <input
                      type="text"
                      required
                      maxLength={6}
                      placeholder="_ _ _ _ _ _"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '0.85rem 1rem 0.85rem 2.75rem',
                        fontSize: '1.35rem',
                        letterSpacing: '0.45rem',
                        fontWeight: 800,
                        textAlign: 'center',
                        borderRadius: '12px',
                        border: '1.5px solid rgba(56, 189, 248, 0.35)',
                        backgroundColor: 'rgba(4, 12, 24, 0.85)',
                        color: '#38bdf8',
                        outline: 'none',
                        fontFamily: 'monospace',
                        boxShadow: '0 0 20px rgba(14, 165, 233, 0.15)'
                      }}
                    />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.4rem' }}>
                    ⏱️ Code temporaire valable pendant 10 minutes.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length < 6}
                  style={{
                    width: '100%',
                    padding: '0.9rem',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    borderRadius: '12px',
                    backgroundColor: '#0ea5e9',
                    color: '#ffffff',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    boxShadow: '0 0 25px rgba(14, 165, 233, 0.45)',
                    opacity: (loading || otpCode.length < 6) ? 0.6 : 1,
                    transition: 'all 0.25s ease'
                  }}
                  onMouseOver={e => {
                    if (!loading && otpCode.length === 6) {
                      e.currentTarget.style.backgroundColor = '#38bdf8';
                      e.currentTarget.style.boxShadow = '0 0 35px rgba(56, 189, 248, 0.6)';
                    }
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.backgroundColor = '#0ea5e9';
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(14, 165, 233, 0.45)';
                  }}
                >
                  {loading ? 'Vérification en cours...' : 'Confirmer et ouvrir la session'}
                </button>
              </form>

              {/* Resend + Back Links */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(''); setOtpCode(''); }}
                  style={{
                    fontSize: '0.825rem',
                    color: '#94a3b8',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontWeight: 600
                  }}
                  onMouseOver={e => e.currentTarget.style.color = '#ffffff'}
                  onMouseOut={e => e.currentTarget.style.color = '#94a3b8'}
                >
                  <ArrowLeft size={14} /> Retour aux identifiants
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={loading}
                  style={{
                    fontSize: '0.825rem',
                    color: '#38bdf8',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontWeight: 600
                  }}
                  onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
                >
                  <RefreshCw size={14} /> Renvoyer un nouveau code
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
