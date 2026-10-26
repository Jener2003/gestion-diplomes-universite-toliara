import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, MailCheck, CheckCircle2, AlertOctagon, Eye, EyeOff } from 'lucide-react';
import ToliaraLogo from '../components/ToliaraLogo';
import { authAPI } from '../services/api';
import '../components/admin/admin.css';

const VIDE = { username: '', first_name: '', last_name: '', role: '', password: '', confirmation: '' };

// Inscription par l'agent lui-même :
// 1. identifiant, mot de passe et espace ; 2. code envoyé à l'adresse commune de l'espace
// (seul un membre de l'équipe peut le lire) ; 3. validation par l'administrateur.
const Inscription = () => {
  const [etape, setEtape] = useState('chargement'); // chargement | formulaire | code | termine | ferme
  const [espaces, setEspaces] = useState([]);
  const [valeurs, setValeurs] = useState(VIDE);
  const [erreurs, setErreurs] = useState({});
  const [afficher, setAfficher] = useState(false);
  const [code, setCode] = useState('');
  const [indice, setIndice] = useState('');
  const [codeDev, setCodeDev] = useState('');
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    authAPI.espacesInscription()
      .then((res) => { setEspaces(res.data); setEtape(res.data.length ? 'formulaire' : 'ferme'); })
      .catch(() => { setMessage('Serveur inaccessible : réessayez dans quelques instants.'); setEtape('ferme'); });
  }, []);

  const changer = (champ) => (e) => setValeurs({ ...valeurs, [champ]: e.target.value });

  const valider = () => {
    const err = {};
    if (!/^[\w.@+-]+$/.test(valeurs.username.trim())) err.username = 'Lettres, chiffres et . @ + - _ uniquement, sans espace.';
    if (!valeurs.first_name.trim()) err.first_name = 'Prénom obligatoire.';
    if (!valeurs.last_name.trim()) err.last_name = 'Nom obligatoire.';
    if (!valeurs.role) err.role = 'Choisissez votre espace.';
    if (valeurs.password.length < 8) err.password = 'Au moins 8 caractères.';
    if (valeurs.password !== valeurs.confirmation) err.confirmation = 'Les deux mots de passe ne correspondent pas.';
    setErreurs(err);
    return Object.keys(err).length === 0;
  };

  const inscrire = async (e) => {
    e.preventDefault();
    if (!valider()) return;
    setEnvoi(true);
    try {
      const res = await authAPI.inscrire({ ...valeurs, username: valeurs.username.trim() });
      setIndice(res.data.email_hint);
      setCodeDev(res.data.dev_otp_code || '');
      setCode('');
      setMessage('');
      setEtape('code');
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 400 && data && typeof data === 'object' && !data.detail) setErreurs(data);
      else setErreurs({ non_field_errors: data?.detail || 'Serveur inaccessible : réessayez dans quelques instants.' });
    } finally {
      setEnvoi(false);
    }
  };

  const confirmer = async (e) => {
    e.preventDefault();
    setEnvoi(true);
    setMessage('');
    try {
      const res = await authAPI.confirmerInscription(valeurs.username.trim(), code.trim());
      setValeurs(VIDE);
      setMessage(res.data.detail);
      setEtape('termine');
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Serveur inaccessible : réessayez dans quelques instants.');
    } finally {
      setEnvoi(false);
    }
  };

  const libelleEspace = espaces.find((e) => e.code === valeurs.role)?.libelle;
  const Erreur = ({ champ }) => (erreurs[champ] ? <span className="adm-erreur-champ">{[].concat(erreurs[champ])[0]}</span> : null);
  const titre = { fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' };
  const texte = { color: '#475569', fontSize: '0.88rem', marginBottom: '1.25rem' };

  return (
    <div className="adm insc-fond">
      <div className="adm-carte insc-carte">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}><ToliaraLogo size="medium" /></div>

        {etape === 'chargement' && <div className="adm-chargement"><span className="adm-spinner" />Chargement…</div>}

        {etape === 'ferme' && (
          <div style={{ textAlign: 'center' }}>
            <AlertOctagon size={40} color="#b45309" style={{ marginBottom: '0.75rem' }} />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Inscription indisponible</h1>
            <p style={texte}>{message || "Aucun espace n'est encore ouvert à l'inscription. Contactez l'administrateur de la plateforme."}</p>
            <Link to="/login" className="adm-btn adm-btn-contour">Retour à la connexion</Link>
          </div>
        )}

        {etape === 'formulaire' && (
          <form onSubmit={inscrire} noValidate>
            <h1 style={titre}><UserPlus size={20} color="#1d70b8" /> Créer mon compte</h1>
            <p style={texte}>
              Un compte personnel par agent. Un code sera envoyé à l'adresse commune de votre espace,
              puis l'administrateur validera votre compte.
            </p>
            {erreurs.non_field_errors && <div className="adm-bandeau erreur" role="alert">{[].concat(erreurs.non_field_errors)[0]}</div>}
            <div className="adm-form-ligne">
              <label htmlFor="i-espace">Mon espace</label>
              <select id="i-espace" className="adm-champ" value={valeurs.role} onChange={changer('role')}>
                <option value="">— Choisir mon espace —</option>
                {espaces.map((e) => <option key={e.code} value={e.code}>{e.libelle}</option>)}
              </select>
              <Erreur champ="role" />
            </div>
            <div className="adm-form-grille">
              <div className="adm-form-ligne">
                <label htmlFor="i-prenom">Prénom</label>
                <input id="i-prenom" className="adm-champ" value={valeurs.first_name} onChange={changer('first_name')} autoComplete="given-name" />
                <Erreur champ="first_name" />
              </div>
              <div className="adm-form-ligne">
                <label htmlFor="i-nom">Nom</label>
                <input id="i-nom" className="adm-champ" value={valeurs.last_name} onChange={changer('last_name')} autoComplete="family-name" />
                <Erreur champ="last_name" />
              </div>
            </div>
            <div className="adm-form-ligne">
              <label htmlFor="i-username">Identifiant de connexion</label>
              <input id="i-username" className="adm-champ" value={valeurs.username} onChange={changer('username')} autoComplete="username" />
              <span className="adm-aide">Choisi par vous, unique, sans espace (ex. hery.rabe).</span>
              <Erreur champ="username" />
            </div>
            <div className="adm-form-ligne">
              <label htmlFor="i-mdp">Mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input id="i-mdp" type={afficher ? 'text' : 'password'} className="adm-champ" style={{ width: '100%', paddingRight: '2.6rem' }}
                       value={valeurs.password} onChange={changer('password')} autoComplete="new-password" />
                <button type="button" onClick={() => setAfficher(!afficher)} aria-label={afficher ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                        style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                  {afficher ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="adm-aide">Au moins 8 caractères, pas uniquement des chiffres, ni trop courant, ni proche de votre nom.</span>
              <Erreur champ="password" />
            </div>
            <div className="adm-form-ligne">
              <label htmlFor="i-mdp2">Confirmation du mot de passe</label>
              <input id="i-mdp2" type={afficher ? 'text' : 'password'} className="adm-champ" value={valeurs.confirmation}
                     onChange={changer('confirmation')} autoComplete="new-password" />
              <Erreur champ="confirmation" />
            </div>
            <button type="submit" className="adm-btn adm-btn-primaire" style={{ width: '100%', marginTop: '0.4rem' }} disabled={envoi}>
              {envoi ? 'Envoi…' : 'Recevoir le code de mon espace'}
            </button>
            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
              <Link to="/login" style={{ color: '#1d70b8', fontWeight: 600 }}>J'ai déjà un compte</Link>
            </p>
          </form>
        )}

        {etape === 'code' && (
          <form onSubmit={confirmer} noValidate>
            <h1 style={titre}><MailCheck size={20} color="#1d70b8" /> Code de votre espace</h1>
            <p style={texte}>
              Un code à 6 chiffres a été envoyé à l'adresse commune de l'espace <strong>{libelleEspace}</strong> ({indice}).
              Demandez-le à un membre de votre équipe qui a accès à cette boîte.
            </p>
            {codeDev && <div className="adm-bandeau info">Mode développement : code <strong>{codeDev}</strong></div>}
            {message && <div className="adm-bandeau erreur" role="alert">{message}</div>}
            <div className="adm-form-ligne">
              <label htmlFor="i-code">Code reçu</label>
              <input id="i-code" className="adm-champ" inputMode="numeric" maxLength={6} autoComplete="one-time-code"
                     value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                     style={{ letterSpacing: '0.4em', fontSize: '1.2rem', textAlign: 'center' }} />
              <span className="adm-aide">Valable 10 minutes.</span>
            </div>
            <button type="submit" className="adm-btn adm-btn-primaire" style={{ width: '100%' }} disabled={envoi || code.length !== 6}>
              {envoi ? 'Vérification…' : 'Confirmer mon inscription'}
            </button>
            <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
              <button type="button" onClick={() => { setEtape('formulaire'); setMessage(''); }} style={{ color: '#1d70b8', fontWeight: 600 }}>
                Modifier mes informations ou recevoir un nouveau code
              </button>
            </p>
          </form>
        )}

        {etape === 'termine' && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle2 size={40} color="#047857" style={{ marginBottom: '0.75rem' }} />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Inscription envoyée</h1>
            <p style={texte}>{message}</p>
            <Link to="/login" className="adm-btn adm-btn-primaire">Retour à la connexion</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inscription;
