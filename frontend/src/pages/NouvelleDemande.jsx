import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { demandesAPI } from '../services/api';
import { ArrowLeft, Send, FileText, Paperclip } from 'lucide-react';

const NouvelleDemande = () => {
  const [typeDiplome, setTypeDiplome] = useState('Licence');
  const [bordereauFile, setBordereauFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('type_diplome', typeDiplome);
      if (bordereauFile) {
        formData.append('bordereau_paiement', bordereauFile);
      }
      await demandesAPI.creerDemande(formData);
      navigate('/mes-demandes');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Erreur lors de la soumission de la demande. Vérifiez que votre profil étudiant existe.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <button onClick={() => navigate(-1)} className="btn" style={{ background: 'transparent', padding: 0, marginBottom: '1rem', color: 'var(--text-muted)' }}>
          <ArrowLeft size={18} /> Retour
        </button>

        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#fff0ee', padding: '0.75rem', borderRadius: '8px' }}>
              <FileText size={24} color="#070b19" />
            </div>
            <div>
              <h2 style={{ margin: 0, color: '#070b19' }}>Nouvelle demande de diplôme</h2>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Remplissez les informations ci-dessous</p>
            </div>
          </div>

          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
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
                <option value="Licence">Licence</option>
                <option value="Master">Master</option>
                <option value="Doctorat">Doctorat</option>
                <option value="DUT / DEUG">DUT / DEUG</option>
              </select>
            </div>

            <div className="input-group">
              <label className="input-label">Bordereau de paiement (justificatif)</label>
              <label
                htmlFor="bordereau-input"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
                  padding: '0.75rem 1rem', borderRadius: '8px', border: '1.5px dashed #cbd5e1',
                  color: '#64748b', fontSize: '0.875rem'
                }}
              >
                <Paperclip size={16} />
                {bordereauFile ? bordereauFile.name : 'Choisir un fichier (PDF, image)...'}
              </label>
              <input
                id="bordereau-input"
                type="file"
                accept=".pdf,image/*"
                onChange={(e) => setBordereauFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={loading}>
              <Send size={16} /> {loading ? 'Envoi en cours...' : 'Soumettre la demande'}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};

export default NouvelleDemande;
