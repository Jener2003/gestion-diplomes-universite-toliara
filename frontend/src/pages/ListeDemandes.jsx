import React, { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../components/AuthContext';
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Printer, FileCheck } from 'lucide-react';

const STATUT_CONFIG = {
  EN_ATTENTE: { label: 'En attente', color: '#f59e0b', bg: '#fef3c7', icon: Clock },
  EN_VERIFICATION: { label: 'En vérification', color: '#3b82f6', bg: '#dbeafe', icon: Clock },
  VALIDEE: { label: 'Validée', color: '#10b981', bg: '#d1fae5', icon: CheckCircle2 },
  EN_IMPRESSION: { label: 'En impression', color: '#8b5cf6', bg: '#ede9fe', icon: Printer },
  SIGNEE: { label: 'Signée', color: '#6366f1', bg: '#e0e7ff', icon: FileCheck },
  DISPONIBLE: { label: 'Disponible', color: '#059669', bg: '#d1fae5', icon: CheckCircle2 },
  REFUSEE: { label: 'Refusée', color: '#ef4444', bg: '#fee2e2', icon: AlertCircle },
};

const ListeDemandes = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const fetchDemandes = async () => {
    try {
      const res = await api.get('demandes/');
      setDemandes(res.data);
    } catch (err) {
      console.error("Erreur chargement demandes", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemandes();
  }, []);

  const handleUpdateStatus = async (id, newStatus) => {
    try {
      await api.patch(`demandes/${id}/`, { statut: newStatus });
      fetchDemandes();
    } catch (err) {
      alert("Erreur lors de la mise à jour du statut.");
    }
  };

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <button onClick={() => navigate(-1)} className="btn" style={{ background: 'transparent', padding: 0, marginBottom: '1rem', color: 'var(--text-muted)' }}>
        <ArrowLeft size={18} /> Retour au tableau de bord
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>Suivi des demandes de diplômes</h2>
        {user?.role === 'ETUDIANT' && (
          <button onClick={() => navigate('/nouvelle-demande')} className="btn btn-primary">
            + Nouvelle demande
          </button>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</div>
      ) : demandes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Aucune demande enregistrée pour le moment.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'var(--secondary-color)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem' }}>ID</th>
                <th style={{ padding: '1rem' }}>Type</th>
                <th style={{ padding: '1rem' }}>Bordereau</th>
                <th style={{ padding: '1rem' }}>Date</th>
                <th style={{ padding: '1rem' }}>Statut</th>
                {user?.role !== 'ETUDIANT' && <th style={{ padding: '1rem' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {demandes.map((d) => {
                const conf = STATUT_CONFIG[d.statut] || STATUT_CONFIG.EN_ATTENTE;
                const Icon = conf.icon;

                return (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>#{d.id}</td>
                    <td style={{ padding: '1rem' }}>{d.type_diplome}</td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{d.bordereau_paiement}</td>
                    <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                      {new Date(d.date_demande).toLocaleDateString('fr-FR')}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.35rem', 
                        padding: '0.25rem 0.65rem', 
                        borderRadius: '999px', 
                        fontSize: '0.75rem', 
                        fontWeight: 600,
                        color: conf.color, 
                        background: conf.bg 
                      }}>
                        <Icon size={14} /> {conf.label}
                      </span>
                    </td>
                    {user?.role !== 'ETUDIANT' && (
                      <td style={{ padding: '1rem' }}>
                        {user?.role === 'CHEF_SERVICE' && d.statut === 'EN_ATTENTE' && (
                          <button onClick={() => handleUpdateStatus(d.id, 'VALIDEE')} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'var(--success-color)' }}>
                            Valider
                          </button>
                        )}
                        {user?.role === 'IMPRIMEUR' && d.statut === 'VALIDEE' && (
                          <button onClick={() => handleUpdateStatus(d.id, 'EN_IMPRESSION')} className="btn btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                            Imprimer
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ListeDemandes;
