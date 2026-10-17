import React, { useEffect, useMemo, useState } from 'react';
import { Search, UserPlus, Pencil, UserX, UserCheck, KeyRound } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { useAuth } from '../../components/AuthContext';
import { adminAPI } from '../../services/api';
import {
  Bandeau, Chargement, Confirmation, EnTetePage, Modale,
} from '../../components/admin/AdminUI';
import { formatDate, messageErreur } from '../../components/admin/format';

const VIDE = { username: '', first_name: '', last_name: '', email: '', role: '' };

const FormulaireCompte = ({ compte, roles, onAnnuler, onValider, masque }) => {
  const edition = Boolean(compte);
  const [valeurs, setValeurs] = useState(edition
    ? { username: compte.username, first_name: compte.first_name, last_name: compte.last_name, email: compte.email, role: compte.role }
    : VIDE);
  const [erreurs, setErreurs] = useState({});

  const attribuables = roles.filter((r) => r.attribuable);
  const roleActuelNonAttribuable = edition && !attribuables.some((r) => r.code === compte.role);

  const changer = (champ) => (e) => setValeurs({ ...valeurs, [champ]: e.target.value });

  const valider = (e) => {
    e.preventDefault();
    const err = {};
    if (!edition && !/^[\w.@+-]+$/.test(valeurs.username.trim())) err.username = 'Lettres, chiffres et . @ + - _ uniquement, sans espace.';
    if (!valeurs.first_name.trim()) err.first_name = 'Prénom obligatoire.';
    if (!valeurs.last_name.trim()) err.last_name = 'Nom obligatoire.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valeurs.email.trim())) err.email = 'Adresse e-mail invalide.';
    if (!valeurs.role) err.role = 'Choisissez un rôle.';
    setErreurs(err);
    if (Object.keys(err).length === 0) onValider(valeurs, setErreurs);
  };

  const Erreur = ({ champ }) => (erreurs[champ] ? <span className="adm-erreur-champ">{[].concat(erreurs[champ])[0]}</span> : null);

  return (
    <Modale
      titre={edition ? `Modifier le compte « ${compte.username} »` : 'Créer un compte utilisateur'}
      onFermer={onAnnuler}
      masquee={masque}
      pied={(
        <>
          <button type="button" className="adm-btn adm-btn-contour" onClick={onAnnuler}>Annuler</button>
          <button type="submit" form="form-compte" className="adm-btn adm-btn-primaire">{edition ? 'Enregistrer' : 'Créer le compte'}</button>
        </>
      )}
    >
      <form id="form-compte" onSubmit={valider} noValidate>
        {erreurs.non_field_errors && <Bandeau type="erreur">{[].concat(erreurs.non_field_errors)[0]}</Bandeau>}
        <div className="adm-form-ligne">
          <label htmlFor="f-username">Identifiant personnel</label>
          <input id="f-username" className="adm-champ" value={valeurs.username} onChange={changer('username')}
                 disabled={edition} autoComplete="off" />
          {edition
            ? <span className="adm-aide">L'identifiant ne change pas après la création (traçabilité de l'historique).</span>
            : <span className="adm-aide">Un identifiant unique par personne : pas de compte partagé.</span>}
          <Erreur champ="username" />
        </div>
        <div className="adm-form-grille">
          <div className="adm-form-ligne">
            <label htmlFor="f-prenom">Prénom</label>
            <input id="f-prenom" className="adm-champ" value={valeurs.first_name} onChange={changer('first_name')} />
            <Erreur champ="first_name" />
          </div>
          <div className="adm-form-ligne">
            <label htmlFor="f-nom">Nom</label>
            <input id="f-nom" className="adm-champ" value={valeurs.last_name} onChange={changer('last_name')} />
            <Erreur champ="last_name" />
          </div>
        </div>
        <div className="adm-form-ligne">
          <label htmlFor="f-email">Adresse e-mail personnelle</label>
          <input id="f-email" type="email" className="adm-champ" value={valeurs.email} onChange={changer('email')} />
          <span className="adm-aide">Reçoit le code de connexion et le lien de mot de passe. Pas d'adresse d'équipe.</span>
          <Erreur champ="email" />
        </div>
        <div className="adm-form-ligne">
          <label htmlFor="f-role">Rôle</label>
          <select id="f-role" className="adm-champ" value={valeurs.role} onChange={changer('role')}>
            <option value="">— Choisir un rôle —</option>
            {roleActuelNonAttribuable && <option value={compte.role}>{compte.role_display} (actuel)</option>}
            {attribuables.map((r) => <option key={r.code} value={r.code}>{r.libelle}</option>)}
          </select>
          <Erreur champ="role" />
        </div>
        {!edition && (
          <Bandeau type="info">
            Aucun mot de passe n'est saisi ici : l'utilisateur recevra par e-mail un lien personnel pour choisir le sien.
          </Bandeau>
        )}
      </form>
    </Modale>
  );
};

const AdminUtilisateurs = () => {
  const { user } = useAuth();
  const [comptes, setComptes] = useState([]);
  const [roles, setRoles] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');
  const [succes, setSucces] = useState('');
  const [recherche, setRecherche] = useState('');
  const [filtreRole, setFiltreRole] = useState('');
  const [filtreEtat, setFiltreEtat] = useState('');
  const [formulaire, setFormulaire] = useState(null);   // { compte } ou { compte: null }
  const [confirmation, setConfirmation] = useState(null);
  const [enCours, setEnCours] = useState(false);
  const [erreurConfirmation, setErreurConfirmation] = useState('');

  const libelleRole = useMemo(() => Object.fromEntries(roles.map((r) => [r.code, r.libelle])), [roles]);

  const charger = () => {
    setChargement(true);
    const params = {};
    if (recherche.trim()) params.recherche = recherche.trim();
    if (filtreRole) params.role = filtreRole;
    if (filtreEtat) params.actif = filtreEtat;
    adminAPI.getUtilisateurs(params)
      .then((res) => { setComptes(res.data); setErreur(''); })
      .catch((err) => setErreur(messageErreur(err, 'Impossible de charger les comptes.')))
      .finally(() => setChargement(false));
  };

  useEffect(() => {
    adminAPI.getRoles().then((res) => setRoles(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const minuterie = setTimeout(charger, 300);
    return () => clearTimeout(minuterie);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recherche, filtreRole, filtreEtat]);

  const demander = (config) => { setErreurConfirmation(''); setConfirmation(config); };

  const executer = async () => {
    setEnCours(true);
    setErreurConfirmation('');
    try {
      const message = await confirmation.action();
      setConfirmation(null);
      setFormulaire(null);
      setSucces(message);
      charger();
    } catch (err) {
      const data = err.response?.status === 400 ? err.response.data : null;
      if (data && confirmation.surErreurChamps && typeof data === 'object' && !data.detail) {
        // Erreurs de validation du serveur : retour au formulaire
        confirmation.surErreurChamps(data);
        setConfirmation(null);
      } else {
        setErreurConfirmation(messageErreur(err));
      }
    } finally {
      setEnCours(false);
    }
  };

  const validerFormulaire = (valeurs, setErreurs) => {
    const compte = formulaire.compte;
    if (!compte) {
      demander({
        titre: 'Confirmer la création du compte',
        libelle: 'Créer le compte',
        message: (
          <p>Créer le compte <strong>{valeurs.username}</strong> ({valeurs.first_name} {valeurs.last_name}) avec le rôle
            <strong> {libelleRole[valeurs.role]}</strong> ? Un lien de définition du mot de passe sera envoyé à <strong>{valeurs.email}</strong>.</p>
        ),
        surErreurChamps: setErreurs,
        action: async () => {
          const res = await adminAPI.creerUtilisateur(valeurs);
          return res.data.lien_envoye
            ? `Compte « ${res.data.username} » créé. Le lien de définition du mot de passe a été envoyé à ${res.data.email}.`
            : `Compte « ${res.data.username} » créé, mais l'e-mail n'a pas pu être envoyé : utilisez « Réinitialiser l'accès » une fois la messagerie vérifiée.`;
        },
      });
      return;
    }
    const modifs = {};
    ['first_name', 'last_name', 'email', 'role'].forEach((c) => { if (valeurs[c].trim() !== (compte[c] || '')) modifs[c] = valeurs[c].trim(); });
    if (Object.keys(modifs).length === 0) { setFormulaire(null); return; }
    const changementRole = 'role' in modifs;
    demander({
      titre: changementRole ? 'Confirmer le changement de rôle' : 'Confirmer la modification',
      libelle: 'Enregistrer',
      message: changementRole ? (
        <p>Le compte <strong>{compte.username}</strong> passera de <strong>{compte.role_display}</strong> à
          <strong> {libelleRole[modifs.role]}</strong>. Ses accès changeront dès sa prochaine requête : il verra les dossiers et
          les actions du nouveau rôle, et perdra ceux de l'ancien.</p>
      ) : (
        <p>Enregistrer les modifications du compte <strong>{compte.username}</strong> ?</p>
      ),
      surErreurChamps: (data) => { setErreurs(data); },
      action: async () => {
        await adminAPI.modifierUtilisateur(compte.id, modifs);
        return `Compte « ${compte.username} » mis à jour.`;
      },
    });
  };

  const basculerActivation = (compte) => {
    const desactiver = compte.is_active;
    demander({
      titre: desactiver ? 'Désactiver le compte' : 'Réactiver le compte',
      libelle: desactiver ? 'Désactiver' : 'Réactiver',
      danger: desactiver,
      message: desactiver ? (
        <p>Le compte <strong>{compte.username}</strong> ne pourra plus se connecter et sa session en cours sera refusée.
          Son historique d'actions est conservé. L'opération est réversible.</p>
      ) : (
        <p>Le compte <strong>{compte.username}</strong> pourra de nouveau se connecter avec son mot de passe.</p>
      ),
      action: async () => {
        await (desactiver ? adminAPI.desactiverUtilisateur(compte.id) : adminAPI.activerUtilisateur(compte.id));
        return `Compte « ${compte.username} » ${desactiver ? 'désactivé' : 'réactivé'}.`;
      },
    });
  };

  const reinitialiser = (compte) => {
    demander({
      titre: "Réinitialiser l'accès",
      libelle: 'Réinitialiser',
      danger: true,
      message: (
        <p>Le mot de passe actuel de <strong>{compte.username}</strong> cessera immédiatement de fonctionner. Un lien personnel,
          valable une seule fois, sera envoyé à <strong>{compte.email}</strong> pour en choisir un nouveau.
          Vous ne verrez jamais ce mot de passe.</p>
      ),
      action: async () => {
        const res = await adminAPI.reinitialiserAcces(compte.id);
        return res.data.lien_envoye
          ? `Accès de « ${compte.username} » réinitialisé : lien envoyé à ${compte.email}.`
          : `Accès de « ${compte.username} » réinitialisé, mais l'e-mail n'a pas pu être envoyé. Vérifiez la messagerie puis recommencez.`;
      },
    });
  };

  return (
    <AdminLayout>
      <EnTetePage titre="Utilisateurs" sousTitre="Un compte personnel par agent ; les agents d'une même équipe partagent le même espace.">
        <button type="button" className="adm-btn adm-btn-primaire" onClick={() => setFormulaire({ compte: null })}>
          <UserPlus size={16} /> Nouveau compte
        </button>
      </EnTetePage>

      {succes && <Bandeau type="succes" onFermer={() => setSucces('')}>{succes}</Bandeau>}
      {erreur && <Bandeau type="erreur">{erreur}</Bandeau>}

      <div className="adm-filtres">
        <div className="adm-recherche">
          <Search size={16} aria-hidden="true" />
          <input className="adm-champ" type="search" placeholder="Rechercher par nom, identifiant ou e-mail…"
                 value={recherche} onChange={(e) => setRecherche(e.target.value)} aria-label="Rechercher un utilisateur" />
        </div>
        <select className="adm-champ" value={filtreRole} onChange={(e) => setFiltreRole(e.target.value)} aria-label="Filtrer par rôle">
          <option value="">Tous les rôles</option>
          {roles.map((r) => <option key={r.code} value={r.code}>{r.libelle}</option>)}
        </select>
        <select className="adm-champ" value={filtreEtat} onChange={(e) => setFiltreEtat(e.target.value)} aria-label="Filtrer par état">
          <option value="">Actifs et inactifs</option>
          <option value="true">Actifs</option>
          <option value="false">Inactifs</option>
        </select>
      </div>

      {chargement && comptes.length === 0 ? <Chargement /> : (
        <div className="adm-table-conteneur">
          <table className="adm-table">
            <thead>
              <tr><th>Utilisateur</th><th>Identifiant</th><th>Rôle</th><th>État</th><th>Dernière connexion</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {comptes.length === 0 && (
                <tr><td colSpan={6} className="adm-vide">Aucun compte ne correspond à la recherche.</td></tr>
              )}
              {comptes.map((c) => {
                const soiMeme = c.id === user?.id;
                return (
                  <tr key={c.id}>
                    <td>
                      <span className="principal">{[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}</span>
                      <span className="secondaire">{c.email || 'aucune adresse e-mail'}</span>
                    </td>
                    <td>{c.username}{soiMeme && <span className="secondaire">(vous)</span>}</td>
                    <td><span className={`adm-pastille ${c.role_obsolete ? 'obsolete' : 'role'}`}>{c.role_display}</span></td>
                    <td>
                      <span className={`adm-pastille ${c.is_active ? 'actif' : 'inactif'}`}>{c.is_active ? 'Actif' : 'Inactif'}</span>
                      {c.is_active && !c.mot_de_passe_defini && <span className="secondaire">Mot de passe à définir</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(c.last_login)}</td>
                    <td>
                      <div className="adm-actions">
                        <button type="button" className="adm-btn adm-btn-contour adm-btn-icone" onClick={() => setFormulaire({ compte: c })}
                                title="Modifier" aria-label={`Modifier ${c.username}`}>
                          <Pencil size={15} />
                        </button>
                        {!soiMeme && (
                          <>
                            <button type="button" className="adm-btn adm-btn-contour adm-btn-icone" onClick={() => basculerActivation(c)}
                                    title={c.is_active ? 'Désactiver' : 'Activer'}
                                    aria-label={`${c.is_active ? 'Désactiver' : 'Activer'} ${c.username}`}>
                              {c.is_active ? <UserX size={15} /> : <UserCheck size={15} />}
                            </button>
                            {c.is_active && (
                              <button type="button" className="adm-btn adm-btn-contour adm-btn-icone" onClick={() => reinitialiser(c)} disabled={!c.email}
                                      title={c.email ? "Réinitialiser l'accès (envoie un lien de nouveau mot de passe)" : "Renseignez d'abord une adresse e-mail"}
                                      aria-label={`Réinitialiser l'accès de ${c.username}`}>
                                <KeyRound size={15} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {formulaire && (
        <FormulaireCompte compte={formulaire.compte} roles={roles} masque={Boolean(confirmation)}
                          onAnnuler={() => setFormulaire(null)} onValider={validerFormulaire} />
      )}
      {confirmation && (
        <Confirmation
          titre={confirmation.titre}
          message={confirmation.message}
          libelleConfirmer={confirmation.libelle}
          danger={confirmation.danger}
          enCours={enCours}
          erreur={erreurConfirmation}
          onConfirmer={executer}
          onAnnuler={() => setConfirmation(null)}
        />
      )}
    </AdminLayout>
  );
};

export default AdminUtilisateurs;
