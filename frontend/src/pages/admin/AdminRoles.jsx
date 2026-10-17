import React, { useEffect, useState } from 'react';
import { CheckCircle2, Lock, Eye } from 'lucide-react';
import AdminLayout from '../../components/AdminLayout';
import { adminAPI } from '../../services/api';
import {
  Bandeau, Chargement, EnTetePage,
} from '../../components/admin/AdminUI';
import { messageErreur } from '../../components/admin/format';

// Référentiel en lecture seule : les règles affichées sont celles que le serveur applique réellement.
const AdminRoles = () => {
  const [roles, setRoles] = useState(null);
  const [erreur, setErreur] = useState('');

  useEffect(() => {
    adminAPI.getRoles()
      .then((res) => setRoles(res.data))
      .catch((err) => setErreur(messageErreur(err, 'Impossible de charger les rôles.')));
  }, []);

  return (
    <AdminLayout>
      <EnTetePage
        titre="Rôles et permissions"
        sousTitre="Périmètre et actions de chaque rôle, tels que contrôlés par le serveur. Le rôle d'un compte se modifie depuis la page Utilisateurs."
      />
      {erreur && <Bandeau type="erreur">{erreur}</Bandeau>}
      {!roles && !erreur && <Chargement />}
      {roles && (
        <div className="adm-grille adm-grille-2">
          {roles.map((r) => (
            <section key={r.code} className="adm-carte">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                <div>
                  <h2 style={{ marginBottom: '0.15rem' }}>{r.libelle}</h2>
                  <code style={{ fontSize: '0.72rem', color: '#64748b' }}>{r.code}</code>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="adm-kpi-valeur" style={{ fontSize: '1.4rem' }}>{r.actifs}</div>
                  <div className="adm-aide">actif(s) / {r.total} compte(s)</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
                {r.attribuable
                  ? <span className="adm-pastille actif">Attribuable</span>
                  : <span className="adm-pastille inactif"><Lock size={12} /> Non attribuable</span>}
                {r.acces_demandes
                  ? <span className="adm-pastille role">Accès aux demandes</span>
                  : <span className="adm-pastille obsolete">Aucun accès aux demandes</span>}
              </div>
              <p style={{ fontSize: '0.85rem', marginBottom: '0.7rem', display: 'flex', gap: '0.45rem' }}>
                <Eye size={16} style={{ flexShrink: 0, marginTop: 2, color: '#1d70b8' }} aria-hidden="true" />
                <span><strong>Visibilité :</strong> {r.perimetre}</span>
              </p>
              {r.actions.length > 0 ? (
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {r.actions.map((a) => (
                    <li key={a} style={{ display: 'flex', gap: '0.45rem', fontSize: '0.84rem', color: '#334155' }}>
                      <CheckCircle2 size={15} style={{ flexShrink: 0, marginTop: 3, color: '#047857' }} aria-hidden="true" />{a}
                    </li>
                  ))}
                </ul>
              ) : <p className="adm-aide">Consultation uniquement.</p>}
            </section>
          ))}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminRoles;
