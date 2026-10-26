import React, { useEffect, useState } from 'react';
import { Mail, Send, Save } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { adminAPI } from '../../services/api';
import {
  Bandeau, Chargement, Confirmation, EnTetePage,
} from '../../components/admin/AdminUI';
import { formatDate, messageErreur } from '../../components/admin/format';

const CarteEquipe = ({ equipe, onEnregistree, onMessage }) => {
  const [email, setEmail] = useState(equipe.email);
  const [actif, setActif] = useState(equipe.configuree ? equipe.actif : true);
  const [erreur, setErreur] = useState('');
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreurConfirmation, setErreurConfirmation] = useState('');

  const modifie = email.trim().toLowerCase() !== equipe.email || (equipe.configuree && actif !== equipe.actif) || !equipe.configuree;

  const demanderEnregistrement = (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErreur('Adresse e-mail invalide.'); return; }
    setErreur('');
    setErreurConfirmation('');
    setConfirmer(true);
  };

  const enregistrer = async () => {
    setEnCours(true);
    try {
      const res = await adminAPI.definirEquipe(equipe.role, { email: email.trim(), actif });
      setConfirmer(false);
      onEnregistree(res.data);
      onMessage('succes', `Adresse de l'équipe ${equipe.libelle} enregistrée.`);
    } catch (err) {
      const msg = messageErreur(err);
      if (err.response?.status === 400) { setConfirmer(false); setErreur(msg); } else { setErreurConfirmation(msg); }
    } finally {
      setEnCours(false);
    }
  };

  const tester = async () => {
    try {
      const res = await adminAPI.testerEquipe(equipe.role);
      onMessage('succes', res.data.detail);
    } catch (err) {
      onMessage('erreur', messageErreur(err, "L'envoi du message de test a échoué."));
    }
  };

  return (
    <section className="adm-carte">
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', alignItems: 'flex-start' }}>
        <h2 style={{ marginBottom: '0.3rem' }}><Mail size={18} /> {equipe.libelle}</h2>
        {equipe.configuree
          ? <span className={`adm-pastille ${equipe.actif ? 'actif' : 'inactif'}`}>{equipe.actif ? 'Envoi activé' : 'Envoi suspendu'}</span>
          : <span className="adm-pastille attente">Non configurée</span>}
      </div>
      <p className="adm-aide" style={{ marginBottom: '0.8rem' }}>
        {equipe.membres_actifs} agent(s) actif(s) dans cette équipe
        {equipe.configuree && ` · modifiée le ${formatDate(equipe.date_modification)}${equipe.modifie_par ? ` par ${equipe.modifie_par}` : ''}`}
      </p>
      <form onSubmit={demanderEnregistrement} noValidate>
        <div className="adm-form-ligne">
          <label htmlFor={`eq-${equipe.role}`}>Adresse fonctionnelle de l'équipe</label>
          <input id={`eq-${equipe.role}`} type="email" className="adm-champ" value={email}
                 placeholder="ex. service.diplomes@univ-toliara.mg" onChange={(e) => setEmail(e.target.value)} />
          {erreur && <span className="adm-erreur-champ">{erreur}</span>}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', marginBottom: '0.9rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} />
          Envoyer les notifications de l'équipe à cette adresse
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="submit" className="adm-btn adm-btn-primaire adm-btn-petit" disabled={!modifie || !email.trim()}>
            <Save size={14} /> Enregistrer
          </button>
          {equipe.configuree && (
            <button type="button" className="adm-btn adm-btn-contour adm-btn-petit" onClick={tester}>
              <Send size={14} /> Envoyer un test
            </button>
          )}
        </div>
      </form>
      {confirmer && (
        <Confirmation
          titre="Confirmer l'adresse de notification"
          message={(
            <p>Les notifications adressées à toute l'équipe <strong>{equipe.libelle}</strong> seront
              {actif ? <> copiées à <strong>{email.trim()}</strong>.</> : ' suspendues pour cette adresse.'}</p>
          )}
          libelleConfirmer="Enregistrer"
          enCours={enCours}
          erreur={erreurConfirmation}
          onConfirmer={enregistrer}
          onAnnuler={() => setConfirmer(false)}
        />
      )}
    </section>
  );
};

const AdminEquipes = () => {
  const [equipes, setEquipes] = useState(null);
  const [erreur, setErreur] = useState('');
  const [message, setMessage] = useState(null);

  useEffect(() => {
    adminAPI.getEquipes()
      .then((res) => setEquipes(res.data))
      .catch((err) => setErreur(messageErreur(err, 'Impossible de charger les équipes.')));
  }, []);

  const remplacer = (equipe) => setEquipes((prev) => prev.map((e) => (e.role === equipe.role ? equipe : e)));

  return (
    <AdminLayout>
      <EnTetePage
        titre="Adresses communes des espaces"
        sousTitre="Boîte partagée de chaque équipe. Elle reçoit les codes de connexion et d'inscription des agents de l'espace, et une copie des notifications adressées à toute l'équipe."
      />
      <Bandeau type="info">
        Un espace n'est ouvert à l'inscription qu'une fois son adresse configurée. Chaque agent garde son propre identifiant
        et son mot de passe ; la case ci-dessous ne concerne que la copie des notifications, pas les codes.
      </Bandeau>
      {message && <Bandeau type={message.type} onFermer={() => setMessage(null)}>{message.texte}</Bandeau>}
      {erreur && <Bandeau type="erreur">{erreur}</Bandeau>}
      {!equipes && !erreur && <Chargement />}
      {equipes && (
        <div className="adm-grille adm-grille-2">
          {equipes.map((e) => (
            <CarteEquipe key={`${e.role}-${e.date_modification || ''}`} equipe={e} onEnregistree={remplacer}
                         onMessage={(type, texte) => setMessage({ type, texte })} />
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminEquipes;
