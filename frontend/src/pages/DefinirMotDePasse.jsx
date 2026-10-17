import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { KeyRound, CheckCircle2, AlertOctagon, Eye, EyeOff } from 'lucide-react';
import ToliaraLogo from '../components/ToliaraLogo';
import { authAPI } from '../services/api';
import '../components/admin/admin.css';

// Page ouverte depuis le lien personnel reçu par e-mail (création de compte ou réinitialisation).
// Le lien est à usage unique ; le mot de passe n'est jamais connu de l'administrateur.
const DefinirMotDePasse = () => {
  const { uid, token } = useParams();
  const [etat, setEtat] = useState('verification'); // verification | formulaire | invalide | termine
  const [username, setUsername] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [afficher, setAfficher] = useState(false);
  const [erreurs, setErreurs] = useState([]);
  const [message, setMessage] = useState('');
  const [envoi, setEnvoi] = useState(false);

  useEffect(() => {
    authAPI.definirMotDePasse({ uid, token })
      .then((res) => { setUsername(res.data.username); setEtat('formulaire'); })
      .catch((err) => { setMessage(err.response?.data?.detail || 'Ce lien est invalide ou a expiré.'); setEtat('invalide'); });
  }, [uid, token]);

  const soumettre = async (e) => {
    e.preventDefault();
    if (motDePasse !== confirmation) { setErreurs(['Les deux mots de passe ne correspondent pas.']); return; }
    setEnvoi(true);
    setErreurs([]);
    try {
      const res = await authAPI.definirMotDePasse({ uid, token, mot_de_passe: motDePasse, confirmation });
      setMotDePasse('');
      setConfirmation('');
      setMessage(res.data.detail);
      setEtat('termine');
    } catch (err) {
      const data = err.response?.data;
      if (data?.mot_de_passe) setErreurs([].concat(data.mot_de_passe));
      else { setMessage(data?.detail || 'Ce lien est invalide ou a expiré.'); setEtat('invalide'); }
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="adm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 1rem' }}>
      <div className="adm-carte" style={{ width: '100%', maxWidth: 440, padding: '2rem 1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}><ToliaraLogo size="medium" /></div>

        {etat === 'verification' && <div className="adm-chargement"><span className="adm-spinner" />Vérification du lien…</div>}

        {etat === 'invalide' && (
          <div style={{ textAlign: 'center' }}>
            <AlertOctagon size={40} color="#b91c1c" style={{ marginBottom: '0.75rem' }} />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Lien inutilisable</h1>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '1.25rem' }}>{message}</p>
            <Link to="/login" className="adm-btn adm-btn-contour">Retour à la connexion</Link>
          </div>
        )}

        {etat === 'termine' && (
          <div style={{ textAlign: 'center' }}>
            <CheckCircle2 size={40} color="#047857" style={{ marginBottom: '0.75rem' }} />
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Mot de passe enregistré</h1>
            <p style={{ color: '#475569', fontSize: '0.9rem', marginBottom: '1.25rem' }}>{message}</p>
            <Link to="/login" className="adm-btn adm-btn-primaire">Se connecter</Link>
          </div>
        )}

        {etat === 'formulaire' && (
          <form onSubmit={soumettre} noValidate>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <KeyRound size={20} color="#1d70b8" /> Choisir votre mot de passe
            </h1>
            <p style={{ color: '#475569', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
              Compte personnel : <strong>{username}</strong>. Ne communiquez ce mot de passe à personne, y compris à l'administrateur.
            </p>
            {erreurs.length > 0 && (
              <div className="adm-bandeau erreur" role="alert">
                <ul style={{ paddingLeft: '1rem' }}>{erreurs.map((m) => <li key={m}>{m}</li>)}</ul>
              </div>
            )}
            <div className="adm-form-ligne">
              <label htmlFor="mdp">Nouveau mot de passe</label>
              <div style={{ position: 'relative' }}>
                <input id="mdp" type={afficher ? 'text' : 'password'} className="adm-champ" style={{ width: '100%', paddingRight: '2.6rem' }}
                       value={motDePasse} onChange={(e) => setMotDePasse(e.target.value)} autoComplete="new-password" required />
                <button type="button" onClick={() => setAfficher(!afficher)} aria-label={afficher ? 'Masquer' : 'Afficher'}
                        style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                  {afficher ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <span className="adm-aide">Au moins 8 caractères, pas uniquement des chiffres, ni trop courant, ni proche de votre identité.</span>
            </div>
            <div className="adm-form-ligne">
              <label htmlFor="mdp2">Confirmation</label>
              <input id="mdp2" type={afficher ? 'text' : 'password'} className="adm-champ" value={confirmation}
                     onChange={(e) => setConfirmation(e.target.value)} autoComplete="new-password" required />
            </div>
            <button type="submit" className="adm-btn adm-btn-primaire" style={{ width: '100%', marginTop: '0.4rem' }}
                    disabled={envoi || !motDePasse || !confirmation}>
              {envoi ? 'Enregistrement…' : 'Enregistrer mon mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default DefinirMotDePasse;
