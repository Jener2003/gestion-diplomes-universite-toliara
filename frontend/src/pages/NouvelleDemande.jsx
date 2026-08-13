import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Send, FileText } from 'lucide-react';

const NouvelleDemande = () => {
  const [typeDiplome, setTypeDiplome] = useState('LICENCE');
  const [bordereauPaiement, setBordereauPaiement] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('demandes/', {
        type_diplome: typeDiplome,
        bordereau_paiement: bordereauPaiement,
        statut: 'EN_ATTENTE'
      });
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError("Erreur lors de la soumission de la demande. Vérifiez que votre profil étudiant existe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ paddingTop: '2rem', maxWidth: '600px' }}>
      <button onClick={() => navigate(-1)} className="btn" style={{ background: 'transparent', padding: 0, marginBottom: '1rem', color: 'var(--text-muted)' }}>
        <ArrowLeft size={18} /> Retour
      </button>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--secondary-color)', padding: '0.75rem', borderRadius: '8px' }}>
            <FileText size={24} color="var(--primary-color)" />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>Nouvelle demande de diplôme</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Remplissez les informations ci-dessous</p>
          </div>
        </div>

        {error && (
          <div style={{ background: '#fee2e2', color: 'var(--danger-color)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label">Type de diplôme</label>
            <select 
              className="input-field" 
              value={typeDiplome} 
              onChange={(e) => setTypeDiplome(e.target.value)}
            >
              <option value="LICENCE">Licence</option>
              <option value="MASTER">Master</option>
              <option value="DOCTORAT">Doctorat</option>
              <option value="DUT">DUT / DEUG</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Numéro de bordereau de paiement</label>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Ex: BORD-2026-98765"
              value={bordereauPaiement}
              onChange={(e) => setBordereauPaiement(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
            <Send size={16} /> {loading ? 'Envoi en cours...' : 'Soumettre la demande'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NouvelleDemande;
