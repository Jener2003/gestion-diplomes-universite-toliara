import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../components/AuthContext';
import { demandesAPI } from '../services/api';
import { 
  ArrowLeft, 
  Send, 
  FileText, 
  Paperclip, 
  User, 
  GraduationCap, 
  Building2, 
  CheckCircle2, 
  AlertCircle,
  FileCheck2,
  ShieldCheck
} from 'lucide-react';

export const FACULTES_ET_FILIERES = {
  'Faculté des Sciences': [
    'Mathématiques et Informatique',
    'Physique et Applications',
    'Chimie et Applications',
    'Sciences de la Vie et de l\'Environnement',
    'Sciences de la Terre'
  ],
  'Faculté de Droit, Économie, Gestion et Sociologie (FDEGS)': [
    'Droit',
    'Économie',
    'Gestion et Management',
    'Sociologie'
  ],
  'Faculté des Lettres et Sciences Humaines (FLSH)': [
    'Études Françaises et Francophones',
    'Études Malgaches',
    'Études Anglophones',
    'Histoire et Patrimoine',
    'Géographie et Aménagement du Territoire',
    'Philosophie'
  ],
  'Faculté de Médecine et Pharmacie': [
    'Médecine Générale',
    'Sciences Paramédicales & Maïeutique'
  ],
  'Institut Halieutique et des Sciences Marines (IH.SM)': [
    'Sciences Marines et Halieutiques (Océanographie)'
  ]
};

const FACULTES = Object.keys(FACULTES_ET_FILIERES);

const TYPES_DIPLOMES = [
  'Diplôme de Licence',
  'Diplôme de Master',
  'Diplôme d\'Ingénieur',
  'Diplôme d\'État de Docteur en Médecine',
  'Diplôme de Doctorat de Troisième Cycle'
];

const NouvelleDemande = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [matricule, setMatricule] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [cin, setCin] = useState('');
  const [dateNaissance, setDateNaissance] = useState('2000-01-01');
  const [faculte, setFaculte] = useState(user?.etablissement || FACULTES[0]);
  const [filiere, setFiliere] = useState(FACULTES_ET_FILIERES[user?.etablissement || FACULTES[0]]?.[0] || 'Générale');
  const [niveauEtude, setNiveauEtude] = useState('Master 2');
  const [typeDiplome, setTypeDiplome] = useState(TYPES_DIPLOMES[1]);

  // Pièces justificatives obligatoires
  const [hasPvSoutenance, setHasPvSoutenance] = useState(true);
  const [hasReleveNotes, setHasReleveNotes] = useState(true);
  const [hasCertificatScolarite, setHasCertificatScolarite] = useState(true);
  const [hasRecuBancaire, setHasRecuBancaire] = useState(true);

  // Fichiers numériques optionnels
  const [pvFile, setPvFile] = useState(null);
  const [releveFile, setReleveFile] = useState(null);
  const [certificatFile, setCertificatFile] = useState(null);
  const [recuFile, setRecuFile] = useState(null);

  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user?.etablissement && FACULTES_ET_FILIERES[user.etablissement]) {
      setFaculte(user.etablissement);
      setFiliere(FACULTES_ET_FILIERES[user.etablissement][0]);
    }
  }, [user]);

  const handleFaculteChange = (newFac) => {
    setFaculte(newFac);
    const filieres = FACULTES_ET_FILIERES[newFac] || [];
    if (filieres.length > 0) {
      setFiliere(filieres[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!matricule.trim() || !nom.trim() || !prenom.trim()) {
      setError('Veuillez renseigner le matricule, le nom et le prénom de l\'étudiant.');
      return;
    }

    if (!hasPvSoutenance || !hasReleveNotes || !hasCertificatScolarite || !hasRecuBancaire) {
      setError('Toutes les 4 pièces physiques obligatoires (PV, relevé, certificat, reçu bancaire) doivent être contrôlées.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('matricule', matricule.trim().toUpperCase());
      formData.append('nom', nom.trim().toUpperCase());
      formData.append('prenom', prenom.trim());
      formData.append('cin', cin.trim() || matricule.trim());
      formData.append('date_naissance', dateNaissance);
      formData.append('faculte', faculte);
      formData.append('filiere', filiere.trim() || 'Générale');
      formData.append('niveau_etude', niveauEtude);
      formData.append('type_diplome', typeDiplome);
      
      formData.append('has_pv_soutenance', hasPvSoutenance);
      formData.append('has_releve_notes', hasReleveNotes);
      formData.append('has_certificat_scolarite', hasCertificatScolarite);
      formData.append('has_recu_bancaire', hasRecuBancaire);

      if (observations.trim()) {
        formData.append('observations', observations.trim());
      }
      if (recuFile) formData.append('recu_bancaire', recuFile);
      if (pvFile) formData.append('pv_soutenance_file', pvFile);
      if (releveFile) formData.append('releve_notes_file', releveFile);
      if (certificatFile) formData.append('certificat_scolarite_file', certificatFile);

      await demandesAPI.creerDemande(formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.detail || 'Erreur lors de l\'enregistrement de la demande.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: '900px', margin: '0 auto' }} className="animate-fade-in">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="btn btn-outline" 
          style={{ marginBottom: '1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <ArrowLeft size={16} /> Retour au tableau de bord
        </button>

        <div className="card" style={{ padding: '2.25rem', borderRadius: '18px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.75rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem' }}>
            <div style={{ background: '#e0f7fa', padding: '0.85rem', borderRadius: '12px', color: '#00b4d8' }}>
              <FileCheck2 size={28} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0a3641' }}>
                Saisie & Dépôt d'une Demande de Diplôme
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0.2rem 0 0 0' }}>
                Étape 1 & 2 : Enregistrement administratif initial par la Scolarité de l'Établissement
              </p>
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#fee2e2', color: '#991b1b', padding: '0.9rem 1.2rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#dcfce7', color: '#15803d', padding: '0.9rem 1.2rem', borderRadius: '10px', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              <CheckCircle2 size={18} />
              <span>Demande enregistrée et transmise à la Scolarité Centrale avec succès !</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Section 1: Identité de l'Étudiant */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0a3641', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User size={16} /> 1. Identité de l'Étudiant (Dossier Physique)
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Numéro Matricule *
                  </label>
                  <input 
                    type="text" 
                    value={matricule} 
                    onChange={(e) => setMatricule(e.target.value)} 
                    placeholder="Ex: TUL-2026-009"
                    required
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Numéro CIN *
                  </label>
                  <input 
                    type="text" 
                    value={cin} 
                    onChange={(e) => setCin(e.target.value)} 
                    placeholder="Ex: 501011234567"
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Nom de Famille *
                  </label>
                  <input 
                    type="text" 
                    value={nom} 
                    onChange={(e) => setNom(e.target.value)} 
                    placeholder="Ex: RAZAFINDRAKOTO"
                    required
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Prénom(s) *
                  </label>
                  <input 
                    type="text" 
                    value={prenom} 
                    onChange={(e) => setPrenom(e.target.value)} 
                    placeholder="Ex: Andry Nirina"
                    required
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Date de Naissance
                  </label>
                  <input 
                    type="date" 
                    value={dateNaissance} 
                    onChange={(e) => setDateNaissance(e.target.value)} 
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Cursus & Diplôme */}
            <div style={{ marginBottom: '1.75rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0a3641', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <GraduationCap size={16} /> 2. Cursus Académique & Titre Visé
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Faculté / Établissement
                  </label>
                  <select 
                    value={faculte} 
                    onChange={(e) => handleFaculteChange(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#ffffff' }}
                  >
                    {FACULTES.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Filière / Mention
                  </label>
                  <select 
                    value={filiere} 
                    onChange={(e) => setFiliere(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#ffffff' }}
                  >
                    {(FACULTES_ET_FILIERES[faculte] || []).map(fil => (
                      <option key={fil} value={fil}>{fil}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Niveau d'Études
                  </label>
                  <select 
                    value={niveauEtude} 
                    onChange={(e) => setNiveauEtude(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#ffffff' }}
                  >
                    <option value="Licence 3">Licence 3</option>
                    <option value="Master 2">Master 2</option>
                    <option value="Doctorat">Doctorat</option>
                    <option value="Diplôme d'Ingénieur">Diplôme d'Ingénieur</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                    Type de Diplôme demandé
                  </label>
                  <select 
                    value={typeDiplome} 
                    onChange={(e) => setTypeDiplome(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#ffffff' }}
                  >
                    {TYPES_DIPLOMES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Contrôle des Pièces Obligatoires du Dossier */}
            <div style={{ marginBottom: '1.75rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0a3641', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck size={16} /> 3. Vérification des 4 Pièces Physiques Obligatoires
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '1rem' }}>
                La scolarité doit vérifier la présence physique de l'ensemble des pièces avant transmission à la Scolarité Centrale.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', cursor: 'pointer' }}>
                    <input type="checkbox" checked={hasPvSoutenance} onChange={(e) => setHasPvSoutenance(e.target.checked)} />
                    PV de Soutenance certifié
                  </label>
                  <input type="file" onChange={(e) => setPvFile(e.target.files[0])} style={{ marginTop: '0.5rem', fontSize: '0.8rem', width: '100%' }} />
                </div>

                <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', cursor: 'pointer' }}>
                    <input type="checkbox" checked={hasReleveNotes} onChange={(e) => setHasReleveNotes(e.target.checked)} />
                    Relevé de notes officiel
                  </label>
                  <input type="file" onChange={(e) => setReleveFile(e.target.files[0])} style={{ marginTop: '0.5rem', fontSize: '0.8rem', width: '100%' }} />
                </div>

                <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', cursor: 'pointer' }}>
                    <input type="checkbox" checked={hasCertificatScolarite} onChange={(e) => setHasCertificatScolarite(e.target.checked)} />
                    Certificat de scolarité
                  </label>
                  <input type="file" onChange={(e) => setCertificatFile(e.target.files[0])} style={{ marginTop: '0.5rem', fontSize: '0.8rem', width: '100%' }} />
                </div>

                <div style={{ background: '#ffffff', padding: '0.85rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem', color: '#0f172a', cursor: 'pointer' }}>
                    <input type="checkbox" checked={hasRecuBancaire} onChange={(e) => setHasRecuBancaire(e.target.checked)} />
                    Reçu / Bordereau bancaire (droits de diplôme)
                  </label>
                  <input type="file" onChange={(e) => setRecuFile(e.target.files[0])} style={{ marginTop: '0.5rem', fontSize: '0.8rem', width: '100%' }} />
                </div>
              </div>
            </div>

            {/* Observations */}
            <div style={{ marginBottom: '1.75rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.4rem' }}>
                Observations / Remarques de la Scolarité
              </label>
              <textarea 
                value={observations} 
                onChange={(e) => setObservations(e.target.value)} 
                rows={3} 
                placeholder="Ex: Dossier régulier vérifié au guichet, transmis pour contrôle d'admission."
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
              <button type="button" onClick={() => navigate('/dashboard')} className="btn btn-outline">
                Annuler
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="btn btn-primary" 
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#00b4d8', borderColor: '#00b4d8' }}
              >
                <Send size={16} /> {loading ? 'Enregistrement...' : 'Transmettre à la Scolarité Centrale'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
};

export default NouvelleDemande;
