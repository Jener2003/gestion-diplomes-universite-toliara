import React, { useEffect, useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { adminAPI } from '../../services/api';
import {
  Bandeau, Chargement, EnTetePage,
} from '../../components/admin/AdminUI';
import { formatDate, messageErreur } from '../../components/admin/format';

const CATEGORIES = [
  { code: '', libelle: 'Toutes les catégories' },
  { code: 'ADMINISTRATION', libelle: 'Administration' },
  { code: 'SECURITE', libelle: 'Sécurité' },
  { code: 'TECHNIQUE', libelle: 'Technique' },
];

const LIBELLES_DETAILS = {
  role: 'Rôle', ancien_role: 'Ancien rôle', nouveau_role: 'Nouveau rôle', champs: 'Champs modifiés',
  compte_existant: 'Compte existant', etape: 'Étape', motif: 'Motif', tentatives: 'Tentatives',
  lien_envoye: 'Lien envoyé', equipe: 'Équipe', ancienne_adresse: 'Ancienne adresse',
  nouvelle_adresse: 'Nouvelle adresse', envoi_active: 'Envoi activé', objet: 'Objet', erreur: 'Erreur',
};

const valeurLisible = (v) => {
  if (v === true) return 'oui';
  if (v === false) return 'non';
  if (v == null || v === '') return '—';
  return Array.isArray(v) ? v.join(', ') : String(v);
};

const Details = ({ details }) => {
  const entrees = Object.entries(details || {});
  if (entrees.length === 0) return <span className="adm-aide">—</span>;
  return (
    <span style={{ fontSize: '0.78rem' }}>
      {entrees.map(([cle, v]) => (
        <span key={cle} style={{ display: 'block' }}>
          <span style={{ color: '#64748b' }}>{LIBELLES_DETAILS[cle] || cle} :</span> {valeurLisible(v)}
        </span>
      ))}
    </span>
  );
};

const AdminJournal = () => {
  const [filtres, setFiltres] = useState({ categorie: '', utilisateur: '', date_debut: '', date_fin: '' });
  const [page, setPage] = useState(1);
  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    const minuterie = setTimeout(() => {
      setChargement(true);
      const params = { page };
      Object.entries(filtres).forEach(([k, v]) => { if (v) params[k] = v; });
      adminAPI.getJournal(params)
        .then((res) => { setDonnees(res.data); setErreur(''); })
        .catch((err) => setErreur(messageErreur(err, 'Impossible de charger le journal.')))
        .finally(() => setChargement(false));
    }, 250);
    return () => clearTimeout(minuterie);
  }, [filtres, page]);

  const changer = (champ) => (e) => { setPage(1); setFiltres({ ...filtres, [champ]: e.target.value }); };
  const totalPages = donnees ? Math.max(1, Math.ceil(donnees.count / 50)) : 1;

  return (
    <AdminLayout>
      <EnTetePage
        titre="Journaux d'activité"
        sousTitre="Opérations d'administration, événements de sécurité et incidents techniques. Entrées non modifiables, sans aucun mot de passe ni code."
      />
      <div className="adm-filtres">
        <select className="adm-champ" value={filtres.categorie} onChange={changer('categorie')} aria-label="Catégorie">
          {CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.libelle}</option>)}
        </select>
        <div className="adm-recherche">
          <Search size={16} aria-hidden="true" />
          <input className="adm-champ" type="search" placeholder="Identifiant de l'auteur ou du compte concerné…"
                 value={filtres.utilisateur} onChange={changer('utilisateur')} aria-label="Utilisateur" />
        </div>
        <label className="adm-aide" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          Du <input type="date" className="adm-champ" value={filtres.date_debut} onChange={changer('date_debut')} />
        </label>
        <label className="adm-aide" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          au <input type="date" className="adm-champ" value={filtres.date_fin} onChange={changer('date_fin')} />
        </label>
      </div>

      {erreur && <Bandeau type="erreur">{erreur}</Bandeau>}
      {chargement && !donnees ? <Chargement /> : donnees && (
        <>
          <div className="adm-table-conteneur">
            <table className="adm-table">
              <thead>
                <tr><th>Date</th><th>Catégorie</th><th>Opération</th><th>Auteur</th><th>Compte concerné</th><th>Détails</th><th>Adresse IP</th></tr>
              </thead>
              <tbody>
                {donnees.results.length === 0 && <tr><td colSpan={7} className="adm-vide">Aucune entrée pour ces critères.</td></tr>}
                {donnees.results.map((e) => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(e.date)}</td>
                    <td><span className={`adm-pastille cat-${e.categorie}`}>{e.categorie_display}</span></td>
                    <td className="principal">{e.operation_display}</td>
                    <td>{e.auteur_username || <span className="adm-aide">—</span>}</td>
                    <td>{e.cible_username || <span className="adm-aide">{e.details?.compte_existant === false ? 'identifiant inconnu' : '—'}</span>}</td>
                    <td><Details details={e.details} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{e.adresse_ip || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="adm-pagination">
            <span>{donnees.count} entrée(s){chargement ? ' · actualisation…' : ''}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button type="button" className="adm-btn adm-btn-contour adm-btn-petit" disabled={!donnees.previous} onClick={() => setPage(page - 1)}>
                <ChevronLeft size={14} /> Précédent
              </button>
              <span>Page {page} / {totalPages}</span>
              <button type="button" className="adm-btn adm-btn-contour adm-btn-petit" disabled={!donnees.next} onClick={() => setPage(page + 1)}>
                Suivant <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
};

export default AdminJournal;
