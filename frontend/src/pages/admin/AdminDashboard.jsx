import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, UserX, LogIn, ShieldAlert, KeyRound, Mail, ScrollText, ArrowRight, RefreshCw } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { adminAPI } from '../../services/api';
import {
  Bandeau, Chargement, EnTetePage, ListeAlertes,
} from '../../components/admin/AdminUI';
import { formatDate, messageErreur } from '../../components/admin/format';

const Kpi = ({ icone: Icone, libelle, valeur, note }) => (
  <div className="adm-carte adm-kpi">
    <span className="adm-kpi-libelle"><Icone size={15} aria-hidden="true" />{libelle}</span>
    <span className="adm-kpi-valeur">{valeur}</span>
    {note && <span className="adm-kpi-note">{note}</span>}
  </div>
);

// Une seule série (nombre de comptes par rôle) : barres d'une seule teinte, valeur écrite à côté
const RepartitionRoles = ({ lignes }) => {
  const max = Math.max(1, ...lignes.map((l) => l.total));
  return (
    <div className="adm-barres">
      {lignes.map((l) => (
        <div
          className="adm-barre-ligne"
          key={l.role}
          title={`${l.libelle} : ${l.total} compte(s), dont ${l.actifs} actif(s)`}
        >
          <span className="adm-barre-libelle">{l.libelle}</span>
          <div className="adm-barre-piste" aria-hidden="true">
            <div className={`adm-barre${l.obsolete ? ' obsolete' : ''}`} style={{ width: `${(l.total / max) * 100}%` }} />
          </div>
          <span className="adm-barre-valeur">{l.total} <small>({l.actifs} act.)</small></span>
        </div>
      ))}
    </div>
  );
};

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [erreur, setErreur] = useState('');
  const [chargement, setChargement] = useState(true);

  const charger = () => {
    setChargement(true);
    adminAPI.getStats()
      .then((res) => { setStats(res.data); setErreur(''); })
      .catch((err) => setErreur(messageErreur(err, 'Impossible de charger les indicateurs.')))
      .finally(() => setChargement(false));
  };

  useEffect(charger, []);

  return (
    <AdminLayout>
      <EnTetePage titre="Tableau de bord" sousTitre="Indicateurs calculés en temps réel sur les comptes et le journal de la plateforme.">
        <button type="button" className="adm-btn adm-btn-contour" onClick={charger} disabled={chargement}>
          <RefreshCw size={16} /> Actualiser
        </button>
      </EnTetePage>

      {erreur && <Bandeau type="erreur">{erreur}</Bandeau>}
      {chargement && !stats && <Chargement />}

      {stats && (
        <>
          <div className="adm-grille adm-grille-kpi">
            <Kpi icone={Users} libelle="Comptes" valeur={stats.total} note="tous rôles confondus" />
            <Kpi icone={UserCheck} libelle="Actifs" valeur={stats.actifs} note="peuvent se connecter" />
            <Kpi icone={UserX} libelle="Inactifs" valeur={stats.inactifs} note="désactivés" />
            <Kpi icone={LogIn} libelle="Connexions 24 h" valeur={stats.connexions_24h} note="authentifications réussies" />
            <Kpi icone={ShieldAlert} libelle="Échecs 24 h" valeur={stats.echecs_connexion_24h} note="mot de passe ou code refusé" />
          </div>

          <div className="adm-grille adm-grille-2" style={{ marginBottom: '1rem' }}>
            <section className="adm-carte">
              <h2><Users size={18} /> Répartition des comptes par rôle</h2>
              {stats.par_role.length === 0
                ? <p className="adm-vide">Aucun compte.</p>
                : <RepartitionRoles lignes={stats.par_role} />}
              {stats.par_role.some((l) => l.obsolete) && (
                <p className="adm-aide" style={{ marginTop: '0.75rem' }}>Barres hachurées : rôles obsolètes, sans accès à l'application.</p>
              )}
            </section>

            <section className="adm-carte">
              <h2><ShieldAlert size={18} /> Alertes de sécurité</h2>
              <ListeAlertes alertes={stats.alertes} />
            </section>
          </div>

          <div className="adm-grille adm-grille-2">
            <section className="adm-carte">
              <h2><ScrollText size={18} /> Actions de gestion récentes</h2>
              {stats.actions_recentes.length === 0 ? (
                <p className="adm-vide">Aucune action d'administration enregistrée pour le moment.</p>
              ) : (
                <ul className="adm-flux">
                  {stats.actions_recentes.map((a) => (
                    <li key={a.id}>
                      <div>
                        <strong>{a.operation_display}</strong>
                        <span>
                          par {a.auteur_username || '—'}
                          {(a.cible_username || a.details?.equipe) && <> · {a.cible_username || a.details.equipe}</>}
                        </span>
                      </div>
                      <time dateTime={a.date}>{formatDate(a.date)}</time>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ marginTop: '0.75rem' }}>
                <Link to="/administration/journal" className="adm-lien">Voir tout le journal <ArrowRight size={14} /></Link>
              </div>
            </section>

            <section className="adm-carte">
              <h2>Accès rapides</h2>
              <div className="adm-raccourcis">
                <Link to="/administration/utilisateurs" className="adm-raccourci"><span className="icone"><Users size={18} /></span>Gérer les utilisateurs</Link>
                <Link to="/administration/roles" className="adm-raccourci"><span className="icone"><KeyRound size={18} /></span>Rôles et permissions</Link>
                <Link to="/administration/equipes" className="adm-raccourci"><span className="icone"><Mail size={18} /></span>Adresses des équipes</Link>
                <Link to="/administration/securite" className="adm-raccourci"><span className="icone"><ShieldAlert size={18} /></span>Paramètres de sécurité</Link>
              </div>
            </section>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
