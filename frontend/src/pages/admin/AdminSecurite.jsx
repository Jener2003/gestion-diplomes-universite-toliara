import React, { useEffect, useState } from 'react';
import { Lock, KeyRound, Mail, Server, ShieldAlert } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { adminAPI } from '../../services/api';
import {
  Bandeau, Chargement, EnTetePage, ListeAlertes,
} from '../../components/admin/AdminUI';
import { messageErreur } from '../../components/admin/format';

const MODES_ENVOI = {
  console: 'Console du serveur (développement : aucun e-mail réellement envoyé)',
  smtp: 'Serveur SMTP',
  locmem: 'Mémoire (tests)',
  filebased: 'Fichiers sur le serveur',
  dummy: 'Désactivé',
};

// Consultation seule : ces paramètres se règlent dans la configuration du serveur (.env), jamais depuis le navigateur.
const AdminSecurite = () => {
  const [config, setConfig] = useState(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    adminAPI.getSecurite()
      .then((res) => setConfig(res.data))
      .catch((err) => setErreur(messageErreur(err, 'Impossible de charger les paramètres.')));
  }, []);

  return (
    <AdminLayout>
      <EnTetePage
        titre="Paramètres de sécurité"
        sousTitre="Configuration effectivement appliquée par le serveur. Consultation seule : les réglages se font dans le fichier .env du serveur."
      />
      {erreur && <Bandeau type="erreur">{erreur}</Bandeau>}
      {!config && !erreur && <Chargement />}
      {config && (
        <>
          <section className="adm-carte" style={{ marginBottom: '1rem' }}>
            <h2><ShieldAlert size={18} /> Alertes de configuration et de comptes</h2>
            <ListeAlertes alertes={config.environnement.alertes} />
          </section>
          <div className="adm-grille adm-grille-2">
            <section className="adm-carte">
              <h2><Lock size={18} /> Authentification</h2>
              <dl className="adm-liste-def">
                <dt>Double authentification</dt><dd>{config.authentification.double_authentification ? 'Obligatoire (mot de passe + code par e-mail)' : 'Désactivée'}</dd>
                <dt>Validité du code</dt><dd>{config.authentification.otp_validite_minutes} minutes</dd>
                <dt>Essais par code</dt><dd>{config.authentification.otp_tentatives_max} au maximum</dd>
                <dt>Jeton d'accès</dt><dd>{config.authentification.jwt_acces_minutes} minutes</dd>
                <dt>Jeton de renouvellement</dt><dd>{config.authentification.jwt_rafraichissement_heures} heures</dd>
              </dl>
            </section>
            <section className="adm-carte">
              <h2><KeyRound size={18} /> Mots de passe</h2>
              <p className="adm-aide" style={{ marginBottom: '0.5rem' }}>Règles vérifiées par le serveur :</p>
              <ul style={{ paddingLeft: '1.1rem', fontSize: '0.85rem', color: '#334155', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {config.mots_de_passe.validateurs.map((v) => <li key={v}>{v}</li>)}
              </ul>
              <p style={{ fontSize: '0.85rem', marginTop: '0.8rem' }}>
                Lien de définition du mot de passe : valable <strong>{config.mots_de_passe.lien_validite_heures} heures</strong>, utilisable une seule fois.
              </p>
            </section>
            <section className="adm-carte">
              <h2><Mail size={18} /> Messagerie</h2>
              <dl className="adm-liste-def">
                <dt>Mode d'envoi</dt><dd>{MODES_ENVOI[config.messagerie.mode_envoi] || config.messagerie.mode_envoi}</dd>
                <dt>Expéditeur</dt><dd>{config.messagerie.expediteur}</dd>
              </dl>
            </section>
            <section className="adm-carte">
              <h2><Server size={18} /> Environnement</h2>
              <dl className="adm-liste-def">
                <dt>Mode DEBUG</dt><dd>{config.environnement.debug ? 'Activé (développement)' : 'Désactivé (production)'}</dd>
              </dl>
            </section>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminSecurite;
