import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../components/AuthContext';
import { demandesAPI } from '../services/api';
import { 
  ArrowLeft, 
  Send, 
  User, 
  GraduationCap, 
  CheckCircle2, 
  AlertCircle,
  FileCheck2,
  ShieldCheck,
  Calendar,
  CreditCard,
  Building2,
  BookOpen,
  FileText,
  Award,
  Check,
  Receipt,
  Sparkles
} from 'lucide-react';

export const FACULTES_ET_FILIERES = {
  'Domaine des Arts, Lettres et des Sciences Humaines': [
    'Langue, civilisations et lettres malgaches',
    'Études françaises et francophones',
    'Philosophie',
    'Histoire',
    'Géographie'
  ],
  'Domaine des Sciences et Technologie': [
    'Sciences de la Vie',
    'Sciences de la Terre',
    'Physique-Chimie Appliquée'
  ],
  'Domaine DEGS (Droit, Économie, Gestion et Sociologie)': [
    'Droit',
    'Économie',
    'Gestion',
    'Sociologie'
  ],
  'Domaine de la Médecine': [
    'Médecine Humaine',
    'Science Maïeutique',
    'Science Infirmière'
  ]
};

const FACULTES = Object.keys(FACULTES_ET_FILIERES);
const resolveDomaine = (etablissement) => {
  if (FACULTES_ET_FILIERES[etablissement]) return etablissement;

  const value = (etablissement || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/flsh|lettre|humain|philosophie|histoire|geographie/.test(value)) return FACULTES[0];
  if (/degs|droit|economie|gestion|sociologie/.test(value)) return FACULTES[2];
  if (/medecine|maieutique|infirm/.test(value)) return FACULTES[3];
  if (/science|physique|chimie|mathematique|informatique|ih\.sm/.test(value)) return FACULTES[1];
  return FACULTES[0];
};

const TYPES_DIPLOMES = [
  'Diplôme de Licence',
  'Diplôme de Master',
  'Diplôme d\'Ingénieur',
  'Diplôme d\'État de Docteur en Médecine',
  'Diplôme de Doctorat de Troisième Cycle'
];

const inputStyle = {
  width: '100%',
  padding: '0.8rem 1rem',
  borderRadius: '10px',
  border: '1.5px solid #cbd5e1',
  fontSize: '0.9rem',
  backgroundColor: '#ffffff',
  color: '#0f172a',
  transition: 'all 0.2s ease',
  outline: 'none',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)'
};

const labelStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '0.82rem',
  fontWeight: 700,
  color: '#1e293b',
  marginBottom: '0.45rem',
  letterSpacing: '0.01em'
};

const sectionCardStyle = {
  background: '#ffffff',
  borderRadius: '16px',
  border: '1px solid #e2e8f0',
  padding: '1.75rem',
  marginBottom: '1.75rem',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
  transition: 'box-shadow 0.25s ease'
};

const NouvelleDemande = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = location.state?.from || '/dashboard';

  const [matricule, setMatricule] = useState('');
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [cin, setCin] = useState('');
  const [dateNaissance, setDateNaissance] = useState('2000-01-01');
  const [faculte, setFaculte] = useState(resolveDomaine(user?.etablissement));
  const [filiere, setFiliere] = useState(FACULTES_ET_FILIERES[resolveDomaine(user?.etablissement)][0]);
  const [niveauEtude, setNiveauEtude] = useState('Master 2');
  const [typeDiplome, setTypeDiplome] = useState(TYPES_DIPLOMES[1]);
  const [anneeUniversitaire, setAnneeUniversitaire] = useState('');

  // Pièces justificatives obligatoires
  const [hasPvSoutenance, setHasPvSoutenance] = useState(true);
  const [hasReleveNotes, setHasReleveNotes] = useState(true);
  const [hasCertificatScolarite, setHasCertificatScolarite] = useState(true);
  const [hasRecuBancaire, setHasRecuBancaire] = useState(true);
  const [admissionEtudiant, setAdmissionEtudiant] = useState('');

  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user?.etablissement) {
      const domaine = resolveDomaine(user.etablissement);
      setFaculte(domaine);
      setFiliere(FACULTES_ET_FILIERES[domaine][0]);
    }
  }, [user]);

  const handleFaculteChange = (newFac) => {
    setFaculte(newFac);
    const filieres = FACULTES_ET_FILIERES[newFac] || [];
    if (filieres.length > 0) {
      setFiliere(filieres[0]);
    }
  };

  const handleFocus = (e) => {
    e.target.style.borderColor = '#0284c7';
    e.target.style.boxShadow = '0 0 0 4px rgba(2, 132, 199, 0.12)';
  };

  const handleBlur = (e) => {
    e.target.style.borderColor = '#cbd5e1';
    e.target.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.03)';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!matricule.trim() || !nom.trim() || !prenom.trim() || !anneeUniversitaire.trim()) {
      setError('Veuillez renseigner le matricule, le nom, le prénom et l\'année universitaire d\'obtention.');
      return;
    }

    if (!hasPvSoutenance || !hasReleveNotes || !hasCertificatScolarite || !hasRecuBancaire) {
      setError('Toutes les 4 pièces physiques obligatoires (PV, relevé, certificat, reçu bancaire) doivent être contrôlées.');
      return;
    }

    if (!admissionEtudiant) {
      setError('Veuillez indiquer si l\'étudiant est admis ou non admis.');
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
      formData.append('annee_universitaire', anneeUniversitaire.trim());
      
      formData.append('has_pv_soutenance', hasPvSoutenance);
      formData.append('has_releve_notes', hasReleveNotes);
      formData.append('has_certificat_scolarite', hasCertificatScolarite);
      formData.append('has_recu_bancaire', hasRecuBancaire);
      formData.append('admission_etudiant', admissionEtudiant === 'ADMIS' ? 'true' : 'false');

      if (observations.trim()) {
        formData.append('observations', observations.trim());
      }

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

  const piecesJustificatives = [
    {
      id: 'pv',
      label: 'PV de Soutenance certifié',
      description: 'Document officiel d’évaluation du jury avec mention et signatures.',
      checked: hasPvSoutenance,
      toggle: () => setHasPvSoutenance(!hasPvSoutenance),
      icon: Award
    },
    {
      id: 'releve',
      label: 'Relevé de notes officiel',
      description: 'Relevé récapitulatif des unités d’enseignement et crédits validés.',
      checked: hasReleveNotes,
      toggle: () => setHasReleveNotes(!hasReleveNotes),
      icon: FileText
    },
    {
      id: 'certificat',
      label: 'Certificat de scolarité',
      description: 'Attestation d’inscription pour l’année universitaire concernée.',
      checked: hasCertificatScolarite,
      toggle: () => setHasCertificatScolarite(!hasCertificatScolarite),
      icon: GraduationCap
    },
    {
      id: 'recu',
      label: 'Reçu / Bordereau bancaire',
      description: 'Quittance originale du règlement des droits d’édition du diplôme.',
      checked: hasRecuBancaire,
      toggle: () => setHasRecuBancaire(!hasRecuBancaire),
      icon: Receipt
    }
  ];

  return (
    <AppLayout>
      <div style={{ maxWidth: '980px', margin: '0 auto', paddingBottom: '3rem' }} className="animate-fade-in">
        {/* Navigation & Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <button 
            onClick={() => navigate(returnPath)} 
            className="btn btn-outline" 
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.6rem',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '0.6rem 1.15rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              color: '#334155',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
            }}
          >
            <ArrowLeft size={16} color="#0284c7" /> Retour au tableau de bord
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.45rem', 
              padding: '0.4rem 0.9rem', 
              borderRadius: '9999px', 
              backgroundColor: '#e0f2fe', 
              color: '#0369a1', 
              fontSize: '0.8rem', 
              fontWeight: 700 
            }}>
              <Building2 size={14} /> {user?.etablissement || 'Scolarité d\'Établissement'}
            </span>
            <span style={{ 
              padding: '0.4rem 0.85rem', 
              borderRadius: '9999px', 
              backgroundColor: '#f1f5f9', 
              color: '#475569', 
              fontSize: '0.8rem', 
              fontWeight: 600 
            }}>
              Guichet N° 1
            </span>
          </div>
        </div>

        {/* Main Form Container Card */}
        <div style={{ 
          borderRadius: '24px', 
          backgroundColor: '#ffffff', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
          overflow: 'hidden'
        }}>
          {/* Top Brand Accent Line */}
          <div style={{ height: '5px', background: 'linear-gradient(90deg, #0284c7 0%, #00b4d8 50%, #048b9a 100%)' }} />

          {/* Card Header */}
          <div style={{ padding: '2rem 2.25rem 1.75rem', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ 
                  background: 'linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)', 
                  width: '54px', 
                  height: '54px', 
                  borderRadius: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#0284c7',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)',
                  flexShrink: 0
                }}>
                  <FileCheck2 size={28} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: '#0a3641', letterSpacing: '-0.02em' }}>
                      Enregistrement & Dépôt de Demande
                    </h2>
                    <span style={{ backgroundColor: '#fef3c7', color: '#92400e', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                      Étape 1 & 2
                    </span>
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
                    Saisie administrative officielle du dossier physique par la Scolarité avant transmission à la Scolarité Centrale.
                  </p>
                </div>
              </div>

              {/* Steps progression badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '0.78rem', color: '#64748b' }}>
                <span style={{ fontWeight: 700, color: '#0284c7' }}>1. Dépôt</span>
                <span>→</span>
                <span>2. Contrôle</span>
                <span>→</span>
                <span>3. Scol. Centrale</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '2rem 2.25rem' }}>
            {error && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                background: '#fef2f2', 
                color: '#991b1b', 
                padding: '1rem 1.25rem', 
                borderRadius: '12px', 
                marginBottom: '1.75rem', 
                fontSize: '0.875rem',
                border: '1px solid #fecaca' 
              }}>
                <AlertCircle size={20} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 500 }}>{error}</span>
              </div>
            )}

            {success && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.75rem', 
                background: '#f0fdf4', 
                color: '#166534', 
                padding: '1rem 1.25rem', 
                borderRadius: '12px', 
                marginBottom: '1.75rem', 
                fontSize: '0.875rem',
                border: '1px solid #bbf7d0' 
              }}>
                <CheckCircle2 size={20} style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 600 }}>Demande enregistrée et transmise à la Scolarité Centrale avec succès ! Redirection en cours...</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* SECTION 1: Identité de l'Étudiant */}
              <div style={sectionCardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      backgroundColor: '#0284c7', 
                      color: '#ffffff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 800, 
                      fontSize: '0.85rem' 
                    }}>
                      1
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0a3641' }}>
                        Identité de l'Étudiant
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                        Conforme à la carte d’étudiant et à la pièce d’identité nationale (CIN).
                      </p>
                    </div>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                    * Champs obligatoires
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label style={labelStyle}>
                      <span>Numéro Matricule</span>
                      <span style={{ color: '#e11d48' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      value={matricule} 
                      onChange={(e) => setMatricule(e.target.value)} 
                      placeholder="Ex: TUL-2026-009"
                      required
                      style={inputStyle}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <span>Numéro CIN</span>
                      <span style={{ color: '#e11d48' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      value={cin} 
                      onChange={(e) => setCin(e.target.value)} 
                      placeholder="Ex: 501011234567"
                      style={inputStyle}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <span>Nom de Famille</span>
                      <span style={{ color: '#e11d48' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      value={nom} 
                      onChange={(e) => setNom(e.target.value)} 
                      placeholder="Ex: RAZAFINDRAKOTO"
                      required
                      style={inputStyle}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <span>Prénom(s)</span>
                      <span style={{ color: '#e11d48' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      value={prenom} 
                      onChange={(e) => setPrenom(e.target.value)} 
                      placeholder="Ex: Andry Nirina"
                      required
                      style={inputStyle}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <span>Date de Naissance</span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>AAAA-MM-JJ</span>
                    </label>
                    <input 
                      type="date" 
                      value={dateNaissance} 
                      onChange={(e) => setDateNaissance(e.target.value)} 
                      style={inputStyle}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Cursus Académique & Titre Visé */}
              <div style={sectionCardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      backgroundColor: '#048b9a', 
                      color: '#ffffff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 800, 
                      fontSize: '0.85rem' 
                    }}>
                      2
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0a3641' }}>
                        Cursus Académique & Titre Visé
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                        Filière, cycle d’études et grade du diplôme faisant l’objet de la demande.
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                  <div>
                    <label style={labelStyle}>
                      <span>Domaine / Faculté</span>
                    </label>
                    <select 
                      value={faculte} 
                      onChange={(e) => handleFaculteChange(e.target.value)}
                      style={inputStyle}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    >
                      {FACULTES.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <span>Filière / Mention</span>
                    </label>
                    <select 
                      value={filiere} 
                      onChange={(e) => setFiliere(e.target.value)}
                      style={inputStyle}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    >
                      {(FACULTES_ET_FILIERES[faculte] || []).map(fil => (
                        <option key={fil} value={fil}>{fil}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <span>Niveau d'Études</span>
                    </label>
                    <select 
                      value={niveauEtude} 
                      onChange={(e) => setNiveauEtude(e.target.value)}
                      style={inputStyle}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    >
                      <option value="Licence 3">Licence 3</option>
                      <option value="Master 2">Master 2</option>
                      <option value="Doctorat">Doctorat</option>
                      <option value="Diplôme d'Ingénieur">Diplôme d'Ingénieur</option>
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <span>Type de Diplôme demandé</span>
                    </label>
                    <select 
                      value={typeDiplome} 
                      onChange={(e) => setTypeDiplome(e.target.value)}
                      style={inputStyle}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    >
                      {TYPES_DIPLOMES.map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      <span>Année universitaire d'obtention du diplôme</span>
                      <span style={{ color: '#e11d48' }}>*</span>
                    </label>
                    <input 
                      type="text" 
                      value={anneeUniversitaire} 
                      onChange={(e) => setAnneeUniversitaire(e.target.value)} 
                      placeholder="Ex. : 2024-2025"
                      required
                      style={inputStyle}
                      onFocus={handleFocus}
                      onBlur={handleBlur}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: Contrôle des Pièces Obligatoires du Dossier */}
              <div style={{ ...sectionCardStyle, backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      backgroundColor: '#0ea5e9', 
                      color: '#ffffff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 800, 
                      fontSize: '0.85rem' 
                    }}>
                      3
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0a3641' }}>
                        Contrôle des 4 Pièces Physiques Obligatoires
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                        Certification physique de la présence effective de chaque pièce constitutive du dossier.
                      </p>
                    </div>
                  </div>
                  <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '6px' }}>
                    4 pièces requises
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
                  {piecesJustificatives.map(p => {
                    const IconComp = p.icon;
                    return (
                      <div 
                        key={p.id}
                        onClick={p.toggle}
                        style={{ 
                          backgroundColor: p.checked ? '#ffffff' : '#f1f5f9', 
                          padding: '1.1rem', 
                          borderRadius: '12px', 
                          border: p.checked ? '2px solid #10b981' : '1px solid #cbd5e1', 
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.85rem',
                          boxShadow: p.checked ? '0 4px 12px rgba(16, 185, 129, 0.08)' : 'none',
                          transition: 'all 0.2s ease',
                          transform: p.checked ? 'translateY(-1px)' : 'none'
                        }}
                      >
                        <div style={{ 
                          width: '24px', 
                          height: '24px', 
                          borderRadius: '6px', 
                          border: p.checked ? '2px solid #10b981' : '2px solid #94a3b8',
                          backgroundColor: p.checked ? '#10b981' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                          color: '#ffffff',
                          transition: 'all 0.2s ease'
                        }}>
                          {p.checked && <Check size={16} strokeWidth={3} />}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.88rem', color: p.checked ? '#0f172a' : '#475569' }}>
                              <IconComp size={16} color={p.checked ? '#10b981' : '#64748b'} />
                              <span>{p.label}</span>
                            </div>
                            <span style={{ 
                              fontSize: '0.7rem', 
                              fontWeight: 700, 
                              color: p.checked ? '#059669' : '#64748b',
                              backgroundColor: p.checked ? '#d1fae5' : '#e2e8f0',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '4px'
                            }}>
                              {p.checked ? 'Vérifié' : 'Manquant'}
                            </span>
                          </div>
                          <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.35 }}>
                            {p.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 4: Validation de l'admission de l'étudiant */}
              <div style={sectionCardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.85rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '8px', 
                      backgroundColor: '#6366f1', 
                      color: '#ffffff', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontWeight: 800, 
                      fontSize: '0.85rem' 
                    }}>
                      4
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0a3641' }}>
                        Contrôle de l'Admission Officielle
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                        Validation préalable sur le procès-verbal officiel de délibération d'admission.
                      </p>
                    </div>
                  </div>
                  <span style={{ color: '#e11d48', fontSize: '0.75rem', fontWeight: 600 }}>
                    * Décision obligatoire
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', maxWidth: '700px' }}>
                  <div 
                    onClick={() => setAdmissionEtudiant('ADMIS')}
                    style={{ 
                      padding: '1.25rem', 
                      borderRadius: '14px', 
                      border: admissionEtudiant === 'ADMIS' ? '2px solid #10b981' : '1.5px solid #cbd5e1',
                      backgroundColor: admissionEtudiant === 'ADMIS' ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      boxShadow: admissionEtudiant === 'ADMIS' ? '0 4px 14px rgba(16, 185, 129, 0.12)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ 
                      width: '38px', 
                      height: '38px', 
                      borderRadius: '10px', 
                      backgroundColor: admissionEtudiant === 'ADMIS' ? '#10b981' : '#f1f5f9',
                      color: admissionEtudiant === 'ADMIS' ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <CheckCircle2 size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: admissionEtudiant === 'ADMIS' ? '#065f46' : '#1e293b' }}>
                        Étudiant Admis
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Inscrit et validé sur la liste officielle d'admissibilité.
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => setAdmissionEtudiant('NON_ADMIS')}
                    style={{ 
                      padding: '1.25rem', 
                      borderRadius: '14px', 
                      border: admissionEtudiant === 'NON_ADMIS' ? '2px solid #ef4444' : '1.5px solid #cbd5e1',
                      backgroundColor: admissionEtudiant === 'NON_ADMIS' ? '#fef2f2' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      boxShadow: admissionEtudiant === 'NON_ADMIS' ? '0 4px 14px rgba(239, 68, 68, 0.12)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ 
                      width: '38px', 
                      height: '38px', 
                      borderRadius: '10px', 
                      backgroundColor: admissionEtudiant === 'NON_ADMIS' ? '#ef4444' : '#f1f5f9',
                      color: admissionEtudiant === 'NON_ADMIS' ? '#ffffff' : '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}>
                      <AlertCircle size={22} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: admissionEtudiant === 'NON_ADMIS' ? '#991b1b' : '#1e293b' }}>
                        Non Admis / Ajourné
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                        Non retrouvé ou non validé par la commission.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 5: Observations & Remarques */}
              <div style={sectionCardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div style={{ 
                    width: '32px', 
                    height: '32px', 
                    borderRadius: '8px', 
                    backgroundColor: '#64748b', 
                    color: '#ffffff', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontWeight: 800, 
                    fontSize: '0.85rem' 
                  }}>
                    5
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: '#0a3641' }}>
                      Observations & Remarques du Guichet (Optionnel)
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
                      Précisions pour la Scolarité Centrale (dossier prioritaire, mention manuscrite, etc.).
                    </p>
                  </div>
                </div>

                <textarea 
                  value={observations} 
                  onChange={(e) => setObservations(e.target.value)} 
                  rows={3} 
                  placeholder="Ex: Dossier régulier vérifié au guichet, pièces conformes, transmis pour contrôle d'admission."
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
              </div>

              {/* Actions Footer */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                gap: '1rem', 
                borderTop: '1px solid #f1f5f9', 
                paddingTop: '1.5rem',
                flexWrap: 'wrap'
              }}>
                <button 
                  type="button" 
                  onClick={() => navigate(returnPath)} 
                  className="btn btn-outline"
                  style={{ 
                    padding: '0.85rem 1.75rem', 
                    borderRadius: '12px',
                    borderColor: '#cbd5e1',
                    color: '#475569',
                    fontWeight: 600
                  }}
                >
                  Annuler & Retourner
                </button>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="btn btn-primary" 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.65rem', 
                    background: 'linear-gradient(135deg, #0284c7 0%, #00b4d8 100%)', 
                    border: 'none',
                    padding: '0.85rem 2.25rem',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    boxShadow: '0 4px 16px rgba(2, 132, 199, 0.3)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.25s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!loading) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(2, 132, 199, 0.4)';
                    }
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(2, 132, 199, 0.3)';
                  }}
                >
                  <Send size={18} /> {loading ? 'Enregistrement en cours...' : 'Transmettre à la Scolarité Centrale'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default NouvelleDemande;
