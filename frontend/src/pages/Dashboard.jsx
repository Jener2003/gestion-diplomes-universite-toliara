import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../components/AuthContext';
import StepperProgress from '../components/StepperProgress';
import StatCards from '../components/StatCards';
import DashboardCharts from '../components/DashboardCharts';
import { demandesAPI, authAPI } from '../services/api';
import {
  Printer,
  Award,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  Eye,
  Download,
  X,
  AlertTriangle,
  Send,
  Truck,
  Building2,
  PenTool,
  Check,
  UserCheck,
  ShieldCheck,
  Filter,
  CheckSquare,
  Square,
  GraduationCap,
  User,
  XCircle,
  History,
  Info,
  Calendar,
  Layers,
  LayoutDashboard,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const STATUT_CONFIG = {
  EN_ATTENTE_VERIFICATION: { label: 'En attente de vérification', bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
  DOSSIER_INCOMPLET: { label: 'Dossier incomplet', bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
  REFUSEE: { label: 'Refusée', bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
  VALIDEE: { label: 'Validée Scolarité', bg: '#ccfbf1', text: '#115e59', border: '#99f6e4' },
  EN_TRAITEMENT: { label: 'En traitement (Chef)', bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' },
  EN_ATTENTE_IMPRESSION: { label: 'Affectée Imprimeur', bg: '#e0f2fe', text: '#0284c7', border: '#7dd3fc' },
  EN_IMPRESSION: { label: 'En cours d\'impression', bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
  IMPRIME: { label: 'Imprimé', bg: '#ede9fe', text: '#6d28d9', border: '#ddd6fe' },
  EN_ATTENTE_SIGNATURE_ETABLISSEMENT: { label: 'À signer Doyen/Directeur', bg: '#fae8ff', text: '#86198f', border: '#f5d0fe' },
  SIGNE_ETABLISSEMENT: { label: 'Signé Établissement', bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' },
  EN_TRANSMISSION_PRESIDENT: { label: 'En transmission Présidence', bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' },
  EN_ATTENTE_SIGNATURE_PRESIDENT: { label: 'À signer Président', bg: '#ffe4e6', text: '#be123c', border: '#fecdd3' },
  SIGNE_PRESIDENT: { label: 'Signé par le Président', bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  RETOUR_SCOLARITE: { label: 'En retour vers Scolarité', bg: '#e0f7fa', text: '#006064', border: '#b2ebf2' },
  DISPONIBLE: { label: 'Disponible au guichet', bg: '#dcfce7', text: '#15803d', border: '#86efac' },
  RETIRE: { label: 'Diplôme retiré', bg: '#f1f5f9', text: '#334155', border: '#cbd5e1' },
};

const Dashboard = () => {
  const { user } = useAuth();
  const [demandes, setDemandes] = useState([]);
  const [historiquesList, setHistoriquesList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [faculteFilter, setFaculteFilter] = useState('');
  const [diplomeFilter, setDiplomeFilter] = useState('');
  const [dateDebutFilter, setDateDebutFilter] = useState('');
  const [dateFinFilter, setDateFinFilter] = useState('');
  const [stats, setStats] = useState(null);
  const [presidenceKpi, setPresidenceKpi] = useState(null);
  
  // Default tab per role
  const isScolariteCentrale = user?.role === 'SCOLARITE_CENTRALE';
  const [activeTab, setActiveTab] = useState(isScolariteCentrale ? 'TABLEAU_DE_BORD' : 'ALL');

  // Listes pour assignation
  const [imprimeursList, setImprimeursList] = useState([]);
  const [agentsTransList, setAgentsTransList] = useState([]);

  // Modal State
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [observationInput, setObservationInput] = useState('');
  const [mentionInput, setMentionInput] = useState('Bien');
  const [selectedImprimeurId, setSelectedImprimeurId] = useState('');
  const [selectedAgentTransId, setSelectedAgentTransId] = useState('');
  const [nomRetirantInput, setNomRetirantInput] = useState('');
  const [activeActionModal, setActiveActionModal] = useState(null);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Scolarité Centrale: cases à cocher de confirmation (4 pièces physiques)
  const [checkPv, setCheckPv] = useState(true);
  const [checkReleve, setCheckReleve] = useState(true);
  const [checkCertificat, setCheckCertificat] = useState(true);
  const [checkRecu, setCheckRecu] = useState(true);
  
  // Scolarité Centrale: vérification d'admission
  const [admissionChoice, setAdmissionChoice] = useState('ADMIS'); // 'ADMIS' ou 'NON_ADMIS'

  // Modal de motif de rejet explicite
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const fetchDemandesData = async () => {
    setLoading(true);
    try {
      const res = await demandesAPI.getDemandes({
        search: searchTerm,
        statut: statutFilter,
        faculte: faculteFilter,
        filiere: undefined,
        date_debut: dateDebutFilter || undefined,
        date_fin: dateFinFilter || undefined
      });
      setDemandes(res.data);

      const statsRes = await demandesAPI.getStatsOverview();
      setStats(statsRes.data);

      if (user?.role === 'SCOLARITE_CENTRALE') {
        try {
          const histRes = await demandesAPI.getHistoriques();
          setHistoriquesList(histRes.data);
        } catch (e) {
          console.error('Historique load error:', e);
        }
      }

      if (user?.role === 'PRESIDENCE' || user?.role === 'CHEF_SERVICE') {
        try {
          const kpiRes = await demandesAPI.getKpiPresidence();
          setPresidenceKpi(kpiRes.data);
        } catch (e) {
          console.error('KPI error', e);
        }
      }

      if (user?.role === 'CHEF_SERVICE') {
        authAPI.getImprimeurs().then(r => setImprimeursList(r.data)).catch(() => {});
        authAPI.getAgentsTransmission().then(r => setAgentsTransList(r.data)).catch(() => {});
      }
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemandesData();
  }, [searchTerm, statutFilter, faculteFilter, dateDebutFilter, dateFinFilter, user]);

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleOpenModal = (demande) => {
    setSelectedDemande(demande);
    setObservationInput(demande.observations || '');
    setMentionInput('Bien');
    setSelectedImprimeurId(demande.imprimeur_assigne || '');
    setSelectedAgentTransId(demande.agent_transmission || '');
    setNomRetirantInput(`${demande.etudiant_details?.nom} ${demande.etudiant_details?.prenom}`);
    setActiveActionModal(null);
    setShowRejectModal(false);
    setRejectReason('');

    // Initialisation des 4 cases de pièces physiques et d'admission
    setCheckPv(demande.has_pv_soutenance !== false);
    setCheckReleve(demande.has_releve_notes !== false);
    setCheckCertificat(demande.has_certificat_scolarite !== false);
    setCheckRecu(demande.has_recu_bancaire !== false);
    setAdmissionChoice('ADMIS');
  };

  const handleExecuteAction = async (actionType, customObservations = null) => {
    if (!selectedDemande) return;
    setSubmittingAction(true);
    try {
      const finalObs = customObservations !== null ? customObservations : observationInput;
      const payload = {
        action: actionType,
        observations: finalObs,
        mention: mentionInput,
        imprimeur_id: selectedImprimeurId || undefined,
        agent_transmission_id: selectedAgentTransId || undefined,
        nom_retirant: nomRetirantInput || undefined,
        has_pv_soutenance: checkPv,
        has_releve_notes: checkReleve,
        has_certificat_scolarite: checkCertificat,
        has_recu_bancaire: checkRecu
      };

      const res = await demandesAPI.passerEtape(selectedDemande.id, payload);
      showToast(
        actionType === 'VALIDER_SCOLARITE_CENTRALE' 
          ? "Demande validée avec succès et transmise au Chef de service des diplômes."
          : actionType === 'REFUSER'
          ? "Demande rejetée avec motif consigné."
          : "L'étape du dossier a été mise à jour avec succès !", 
        actionType === 'REFUSER' ? 'info' : 'success'
      );
      setSelectedDemande(res.data);
      setActiveActionModal(null);
      setShowRejectModal(false);
      await fetchDemandesData();
    } catch (error) {
      console.error('Erreur transition:', error);
      showToast(error.response?.data?.error || "Erreur lors de la mise à jour de l'étape.", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  // Traitement direct par la Scolarité Centrale
  const handleScolariteCentraleValider = () => {
    if (!checkPv || !checkReleve || !checkCertificat || !checkRecu) {
      showToast("Validation bloquée : les 4 pièces physiques doivent être toutes cochées.", "error");
      return;
    }
    if (admissionChoice !== 'ADMIS') {
      showToast("Validation bloquée : l'étudiant doit être confirmé 'Admis' sur la liste officielle.", "error");
      return;
    }
    const obs = observationInput.trim() || "Dossier physique vérifié, 4 pièces confirmées et admission certifiée.";
    handleExecuteAction('VALIDER_SCOLARITE_CENTRALE', obs);
  };

  const handleScolariteCentraleRejeter = () => {
    const finalReason = (rejectReason || observationInput).trim();
    if (!finalReason) {
      showToast("Veuillez indiquer le motif du rejet.", "error");
      return;
    }
    handleExecuteAction('REFUSER', finalReason);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Université de Toliara - Registre des Dossiers de Diplômes", 14, 15);
    const tableColumn = ["ID", "Matricule", "Étudiant", "Établissement", "Diplôme", "Statut"];
    const tableRows = filteredDemandes.map(d => [
      d.id,
      d.etudiant_details?.matricule,
      `${d.etudiant_details?.nom} ${d.etudiant_details?.prenom}`,
      d.etablissement_origine || d.etudiant_details?.faculte,
      d.type_diplome,
      d.statut_display || d.statut
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("Registre_Diplomes_Toliara.pdf");
  };

  const getStatusBadge = (statut) => {
    const conf = STATUT_CONFIG[statut] || { label: statut, bg: '#f1f5f9', text: '#334155', border: '#e2e8f0' };
    return (
      <span style={{
        backgroundColor: conf.bg,
        color: conf.text,
        border: `1px solid ${conf.border}`,
        padding: '0.3rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.78rem',
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        whiteSpace: 'nowrap'
      }}>
        {conf.label}
      </span>
    );
  };

  const getFilteredDemandes = () => {
    let list = [...demandes];

    if (user?.role === 'SCOLARITE_CENTRALE') {
      if (activeTab === 'A_TRAITER') {
        list = list.filter(d => ['EN_ATTENTE_VERIFICATION', 'DOSSIER_INCOMPLET'].includes(d.statut));
      } else if (activeTab === 'VALIDEES') {
        // Demandes validées par la scolarité centrale (qui continuent leur cycle aval)
        list = list.filter(d => [
          'VALIDEE', 'EN_TRAITEMENT', 'EN_ATTENTE_IMPRESSION', 'EN_IMPRESSION',
          'IMPRIME', 'EN_ATTENTE_SIGNATURE_ETABLISSEMENT', 'SIGNE_ETABLISSEMENT',
          'EN_TRANSMISSION_PRESIDENT', 'EN_ATTENTE_SIGNATURE_PRESIDENT',
          'SIGNE_PRESIDENT', 'RETOUR_SCOLARITE', 'DISPONIBLE', 'RETIRE'
        ].includes(d.statut));
      } else if (activeTab === 'REJETEES') {
        list = list.filter(d => d.statut === 'REFUSEE');
      }
    } else {
      // Autres rôles
      if (activeTab === 'INCOMPLET') {
        list = list.filter(d => d.statut === 'DOSSIER_INCOMPLET');
      } else if (activeTab === 'A_VERIFIER') {
        list = list.filter(d => d.statut === 'EN_ATTENTE_VERIFICATION');
      } else if (activeTab === 'VALIDEES') {
        list = list.filter(d => [
          'VALIDEE', 'EN_TRAITEMENT', 'EN_ATTENTE_IMPRESSION', 'EN_IMPRESSION',
          'IMPRIME', 'EN_ATTENTE_SIGNATURE_ETABLISSEMENT', 'SIGNE_ETABLISSEMENT',
          'EN_TRANSMISSION_PRESIDENT', 'EN_ATTENTE_SIGNATURE_PRESIDENT',
          'SIGNE_PRESIDENT', 'RETOUR_SCOLARITE', 'DISPONIBLE', 'RETIRE'
        ].includes(d.statut));
      } else if (activeTab === 'REFUSEES') {
        list = list.filter(d => d.statut === 'REFUSEE');
      } else if (activeTab === 'EN_TRAITEMENT') {
        list = list.filter(d => ['EN_TRAITEMENT', 'EN_ATTENTE_IMPRESSION'].includes(d.statut));
      } else if (activeTab === 'EN_IMPRESSION') {
        list = list.filter(d => ['EN_IMPRESSION', 'IMPRIME'].includes(d.statut));
      } else if (activeTab === 'ATTENTE_SIGNATURE') {
        list = list.filter(d => ['EN_ATTENTE_SIGNATURE_ETABLISSEMENT', 'EN_ATTENTE_SIGNATURE_PRESIDENT'].includes(d.statut));
      } else if (activeTab === 'SIGNEES') {
        list = list.filter(d => ['SIGNE_ETABLISSEMENT', 'SIGNE_PRESIDENT'].includes(d.statut));
      } else if (activeTab === 'A_AFFECTER') {
        list = list.filter(d => ['VALIDEE', 'EN_TRAITEMENT'].includes(d.statut));
      } else if (activeTab === 'A_IMPRIMER') {
        list = list.filter(d => ['EN_ATTENTE_IMPRESSION', 'EN_IMPRESSION'].includes(d.statut));
      } else if (activeTab === 'IMPRIMEES') {
        list = list.filter(d => d.statut === 'IMPRIME');
      } else if (activeTab === 'SIG_ETAB') {
        list = list.filter(d => ['EN_ATTENTE_SIGNATURE_ETABLISSEMENT', 'SIGNE_ETABLISSEMENT'].includes(d.statut));
      } else if (activeTab === 'NAVETTE_PRES') {
        list = list.filter(d => ['SIGNE_ETABLISSEMENT', 'EN_TRANSMISSION_PRESIDENT'].includes(d.statut));
      } else if (activeTab === 'A_SIGNER_PRES') {
        list = list.filter(d => d.statut === 'EN_ATTENTE_SIGNATURE_PRESIDENT');
      } else if (activeTab === 'NAVETTE_RETOUR') {
        list = list.filter(d => ['SIGNE_PRESIDENT', 'RETOUR_SCOLARITE'].includes(d.statut));
      } else if (activeTab === 'DISPONIBLES') {
        list = list.filter(d => d.statut === 'DISPONIBLE');
      } else if (activeTab === 'RETIREES') {
        list = list.filter(d => d.statut === 'RETIRE');
      }
    }

    if (diplomeFilter) {
      list = list.filter(d => d.type_diplome?.toLowerCase().includes(diplomeFilter.toLowerCase()));
    }

    return list;
  };

  const filteredDemandes = getFilteredDemandes();

  // Compteurs dynamiques issus des données réelles
  const countATraiter = demandes.filter(d => ['EN_ATTENTE_VERIFICATION', 'DOSSIER_INCOMPLET'].includes(d.statut)).length;
  const countValidees = demandes.filter(d => [
    'VALIDEE', 'EN_TRAITEMENT', 'EN_ATTENTE_IMPRESSION', 'EN_IMPRESSION',
    'IMPRIME', 'EN_ATTENTE_SIGNATURE_ETABLISSEMENT', 'SIGNE_ETABLISSEMENT',
    'EN_TRANSMISSION_PRESIDENT', 'EN_ATTENTE_SIGNATURE_PRESIDENT',
    'SIGNE_PRESIDENT', 'RETOUR_SCOLARITE', 'DISPONIBLE', 'RETIRE'
  ].includes(d.statut)).length;
  const countRejetees = demandes.filter(d => d.statut === 'REFUSEE').length;

  const renderRoleTabs = () => {
    const role = user?.role;
    let tabs = [];

    if (role === 'SCOLARITE_CENTRALE') {
      tabs = [
        { key: 'TABLEAU_DE_BORD', label: '📊 Tableau de bord', icon: LayoutDashboard },
        { key: 'A_TRAITER', label: `📥 Traiter une demande (${countATraiter})`, count: countATraiter },
        { key: 'VALIDEES', label: `✅ Demandes validées (${countValidees})`, count: countValidees },
        { key: 'REJETEES', label: `❌ Demandes rejetées (${countRejetees})`, count: countRejetees },
      ];
    } else if (role === 'SCOLARITE_ETABLISSEMENT') {
      tabs = [
        { key: 'ALL', label: 'Toutes les demandes' },
        { key: 'INCOMPLET', label: 'Dossiers incomplets' },
        { key: 'SIG_ETAB', label: 'À signer Doyen' },
        { key: 'DISPONIBLES', label: 'Prêts pour retrait' },
        { key: 'RETIREES', label: 'Diplômes retirés' },
      ];
    } else if (role === 'CHEF_SERVICE') {
      tabs = [
        { key: 'ALL', label: 'Vue globale' },
        { key: 'A_AFFECTER', label: 'À affecter pour tirage' },
        { key: 'A_IMPRIMER', label: 'En cours d\'impression' },
        { key: 'SIG_ETAB', label: 'Signatures Doyen' },
        { key: 'NAVETTE_PRES', label: 'Transmissions Présidence' },
      ];
    } else if (role === 'IMPRIMEUR') {
      tabs = [
        { key: 'ALL', label: 'File complète' },
        { key: 'A_IMPRIMER', label: 'À imprimer / En cours' },
        { key: 'IMPRIMEES', label: 'Imprimés achevés' },
      ];
    } else if (role === 'AGENT_TRANSMISSION') {
      tabs = [
        { key: 'ALL', label: 'Toutes les navettes' },
        { key: 'NAVETTE_PRES', label: 'Vers la Présidence' },
        { key: 'A_SIGNER_PRES', label: 'Déposés Présidence' },
        { key: 'NAVETTE_RETOUR', label: 'Retour Scolarité' },
      ];
    } else if (role === 'PRESIDENCE') {
      tabs = [
        { key: 'ALL', label: 'Tous les dossiers' },
        { key: 'A_SIGNER_PRES', label: 'En attente de signature' },
        { key: 'NAVETTE_RETOUR', label: 'Diplômes signés' },
      ];
    }

    return (
      <div style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>
        {tabs.map(t => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '12px',
                fontSize: '0.88rem',
                fontWeight: isActive ? 800 : 600,
                backgroundColor: isActive ? '#0a3641' : '#ffffff',
                color: isActive ? '#ffffff' : '#475569',
                border: `1.5px solid ${isActive ? '#0a3641' : '#e2e8f0'}`,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 4px 14px rgba(10, 54, 65, 0.25)' : 'none',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  // Règles de validation pour la Scolarité Centrale
  const canValiderScolariteCentrale = checkPv && checkReleve && checkCertificat && checkRecu && admissionChoice === 'ADMIS';
  const isAdmissionNonAdmis = admissionChoice === 'NON_ADMIS';
  const hasUncheckedPieces = !checkPv || !checkReleve || !checkCertificat || !checkRecu;

  // Demandes en attente pour la vue rapide du Tableau de bord
  const demandesEnAttenteRecentes = demandes
    .filter(d => ['EN_ATTENTE_VERIFICATION', 'DOSSIER_INCOMPLET'].includes(d.statut))
    .slice(0, 5);

  return (
    <AppLayout>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
        
        {/* Toast Alert */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: toastMessage.type === 'success' ? '#10b981' : toastMessage.type === 'info' ? '#0284c7' : '#ef4444',
            color: '#ffffff',
            padding: '1rem 1.75rem',
            borderRadius: '14px',
            boxShadow: '0 15px 35px rgba(5, 30, 36, 0.25)',
            zIndex: 110,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            animation: 'fadeIn 0.25s ease-out'
          }}>
            <CheckCircle2 size={20} />
            <span>{toastMessage.msg}</span>
          </div>
        )}

        {/* Top Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Espace Scolarité Centrale (Rectorat)
            </span>
            <h1 style={{ margin: '0.2rem 0 0 0', fontSize: '1.75rem', fontWeight: 800, color: '#0a3641' }}>
              {isScolariteCentrale 
                ? 'Scolarité Centrale — Tableau de Bord & Traitement des Demandes' 
                : 'Tableau de Bord & Suivi des Demandes'}
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
              {isScolariteCentrale
                ? 'Consulter → Vérifier les informations → Vérifier les pièces → Vérifier l’admission → Valider ou Rejeter'
                : 'Suivi et traitement du circuit de délivrance des diplômes'}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={exportPDF} 
              className="btn btn-outline" 
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            >
              <Download size={16} /> Exporter PDF
            </button>
          </div>
        </div>

        {/* KPI Cards Overview - Toujours visibles ou en synthèse */}
        <StatCards stats={stats} role={user?.role} presidenceKpi={presidenceKpi} />

        {/* Navigation par Onglets Dédiés */}
        {renderRoleTabs()}

        {/* ========================================================================= */}
        {/* VUE 1 : TABLEAU DE BORD SCOLARITÉ CENTRALE (SYNTHÈSE COMPLÈTE)             */}
        {/* ========================================================================= */}
        {isScolariteCentrale && activeTab === 'TABLEAU_DE_BORD' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            
            {/* Graphiques analytiques (Répartition par faculté et par statut) */}
            <DashboardCharts stats={stats} />

            {/* Section : Dossiers récents en attente de vérification immédiate */}
            <div className="card" style={{ padding: '0', overflow: 'hidden', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0a3641', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={18} color="#f59e0b" /> Dossiers récents en attente de vérification
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Demandes transmises par les établissements nécessitant votre contrôle de conformité
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('A_TRAITER')}
                  className="btn btn-outline"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
                >
                  Voir toute la file ({countATraiter}) <ArrowRight size={14} />
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.74rem', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '0.85rem 1.1rem' }}>Référence</th>
                      <th style={{ padding: '0.85rem 1.1rem' }}>Matricule</th>
                      <th style={{ padding: '0.85rem 1.1rem' }}>Étudiant</th>
                      <th style={{ padding: '0.85rem 1.1rem' }}>Établissement</th>
                      <th style={{ padding: '0.85rem 1.1rem' }}>Diplôme demandé</th>
                      <th style={{ padding: '0.85rem 1.1rem' }}>Date de réception</th>
                      <th style={{ padding: '0.85rem 1.1rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demandesEnAttenteRecentes.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#10b981', fontWeight: 600 }}>
                          🎉 Aucun dossier en attente. Toutes les demandes ont été traitées !
                        </td>
                      </tr>
                    ) : (
                      demandesEnAttenteRecentes.map(d => {
                        const refFormatted = `DEM-${String(d.id).padStart(3, '0')}`;
                        const dateFormatted = d.date_demande ? new Date(d.date_demande).toLocaleDateString('fr-FR') : '-';
                        return (
                          <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }} className="hover:bg-slate-50">
                            <td style={{ padding: '0.85rem 1.1rem' }}>
                              <span style={{ fontWeight: 800, color: '#0a3641', backgroundColor: '#e0f2fe', padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.78rem' }}>
                                {refFormatted}
                              </span>
                            </td>
                            <td style={{ padding: '0.85rem 1.1rem', fontWeight: 600, color: '#334155' }}>
                              {d.etudiant_details?.matricule || '-'}
                            </td>
                            <td style={{ padding: '0.85rem 1.1rem', fontWeight: 700, color: '#0f172a' }}>
                              {d.etudiant_details?.nom} {d.etudiant_details?.prenom}
                            </td>
                            <td style={{ padding: '0.85rem 1.1rem', color: '#334155' }}>
                              {d.etablissement_origine || d.etudiant_details?.faculte}
                            </td>
                            <td style={{ padding: '0.85rem 1.1rem', color: '#0f172a', fontWeight: 600 }}>
                              {d.type_diplome}
                            </td>
                            <td style={{ padding: '0.85rem 1.1rem', color: '#64748b', fontSize: '0.82rem' }}>
                              {dateFormatted}
                            </td>
                            <td style={{ padding: '0.85rem 1.1rem', textAlign: 'right' }}>
                              <button
                                onClick={() => handleOpenModal(d)}
                                className="btn btn-primary"
                                style={{
                                  padding: '0.4rem 0.85rem',
                                  fontSize: '0.78rem',
                                  backgroundColor: '#048b9a',
                                  borderColor: '#048b9a',
                                  borderRadius: '8px',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.35rem'
                                }}
                              >
                                <Eye size={13} /> Traiter
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VUE 2 : LISTES FILTRABLES (TRAITER UNE DEMANDE, VALIDÉES, REJETÉES)       */}
        {/* ========================================================================= */}
        {(!isScolariteCentrale || activeTab !== 'TABLEAU_DE_BORD') && (
          <>
            {/* Filtres de recherche */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', alignItems: 'center' }}>
                
                <div style={{ position: 'relative' }}>
                  <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Rechercher par matricule, nom..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 1rem 0.65rem 2.4rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>

                {!isScolariteCentrale && (
                  <div>
                    <select
                      value={statutFilter}
                      onChange={(e) => setStatutFilter(e.target.value)}
                      style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
                    >
                      <option value="">Tous les statuts</option>
                      {Object.keys(STATUT_CONFIG).map(k => (
                        <option key={k} value={k}>{STATUT_CONFIG[k].label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <select
                    value={faculteFilter}
                    onChange={(e) => setFaculteFilter(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
                  >
                    <option value="">Tous les établissements</option>
                    {(stats?.facultes || []).map(f => (
                      <option key={f.etudiant__faculte} value={f.etudiant__faculte}>{f.etudiant__faculte}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={diplomeFilter}
                    onChange={(e) => setDiplomeFilter(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', backgroundColor: '#ffffff' }}
                  >
                    <option value="">Tous les diplômes</option>
                    <option value="Licence">Licence</option>
                    <option value="Master">Master</option>
                    <option value="Doctorat">Doctorat</option>
                    <option value="Ingénieur">Diplôme d'Ingénieur</option>
                    <option value="DU">Diplôme Universitaire</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input 
                    type="date"
                    value={dateDebutFilter}
                    onChange={(e) => setDateDebutFilter(e.target.value)}
                    title="Date de début"
                    style={{ width: '100%', padding: '0.55rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                  <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>à</span>
                  <input 
                    type="date"
                    value={dateFinFilter}
                    onChange={(e) => setDateFinFilter(e.target.value)}
                    title="Date de fin"
                    style={{ width: '100%', padding: '0.55rem 0.65rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Tableau principal des demandes */}
            <div className="card" style={{ padding: '0', overflow: 'hidden', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: '0.74rem', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '1rem 1.1rem' }}>Référence</th>
                      <th style={{ padding: '1rem 1.1rem' }}>Matricule</th>
                      <th style={{ padding: '1rem 1.1rem' }}>Nom et Prénom(s)</th>
                      <th style={{ padding: '1rem 1.1rem' }}>Établissement</th>
                      <th style={{ padding: '1rem 1.1rem' }}>Diplôme demandé</th>
                      {isScolariteCentrale && activeTab === 'REJETEES' ? (
                        <>
                          <th style={{ padding: '1rem 1.1rem' }}>Date du rejet</th>
                          <th style={{ padding: '1rem 1.1rem' }}>Motif du rejet</th>
                        </>
                      ) : isScolariteCentrale && activeTab === 'VALIDEES' ? (
                        <>
                          <th style={{ padding: '1rem 1.1rem' }}>Date validation</th>
                          <th style={{ padding: '1rem 1.1rem' }}>État d'avancement actuel</th>
                        </>
                      ) : (
                        <>
                          <th style={{ padding: '1rem 1.1rem' }}>Date demande</th>
                          <th style={{ padding: '1rem 1.1rem' }}>Statut</th>
                        </>
                      )}
                      <th style={{ padding: '1rem 1.1rem', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                          Chargement des dossiers en cours...
                        </td>
                      </tr>
                    ) : filteredDemandes.length === 0 ? (
                      <tr>
                        <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                          {isScolariteCentrale && activeTab === 'A_TRAITER' && "🎉 Aucune demande en attente de traitement. Tous les dossiers sont à jour."}
                          {isScolariteCentrale && activeTab === 'VALIDEES' && "Aucune demande validée pour le moment."}
                          {isScolariteCentrale && activeTab === 'REJETEES' && "Aucune demande rejetée."}
                          {!isScolariteCentrale && "Aucun dossier ne correspond à vos critères de recherche."}
                        </td>
                      </tr>
                    ) : (
                      filteredDemandes.map(d => {
                        const refFormatted = `DEM-${String(d.id).padStart(3, '0')}`;
                        const dateDemandeFormatted = d.date_demande ? new Date(d.date_demande).toLocaleDateString('fr-FR') : '-';
                        
                        // Trouve le motif de rejet et la date du rejet si rejetée
                        const eventRejet = (d.historique || []).find(h => h.nouveau_statut === 'REFUSEE');
                        const dateRejetFormatted = eventRejet?.date_action 
                          ? new Date(eventRejet.date_action).toLocaleDateString('fr-FR') 
                          : dateDemandeFormatted;
                        const motifRejet = eventRejet?.commentaire || d.observations || 'Non conforme aux délibérations officielles';

                        // Trouve la date de validation par scolarité centrale
                        const eventValidation = (d.historique || []).find(h => h.nouveau_statut === 'VALIDEE');
                        const dateValidationFormatted = eventValidation?.date_action 
                          ? new Date(eventValidation.date_action).toLocaleDateString('fr-FR') 
                          : dateDemandeFormatted;

                        return (
                          <tr 
                            key={d.id} 
                            style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                            className="hover:bg-slate-50"
                          >
                            {/* Référence */}
                            <td style={{ padding: '0.9rem 1.1rem' }}>
                              <span style={{ 
                                fontWeight: 800, 
                                color: '#0a3641', 
                                backgroundColor: '#e0f2fe', 
                                padding: '0.25rem 0.6rem', 
                                borderRadius: '6px',
                                fontSize: '0.78rem'
                              }}>
                                {refFormatted}
                              </span>
                            </td>

                            {/* Matricule */}
                            <td style={{ padding: '0.9rem 1.1rem', fontWeight: 600, color: '#334155' }}>
                              {d.etudiant_details?.matricule || '-'}
                            </td>

                            {/* Nom et prénom */}
                            <td style={{ padding: '0.9rem 1.1rem' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>
                                {d.etudiant_details?.nom} {d.etudiant_details?.prenom}
                              </div>
                            </td>

                            {/* Établissement */}
                            <td style={{ padding: '0.9rem 1.1rem', color: '#334155', fontWeight: 500 }}>
                              {d.etablissement_origine || d.etudiant_details?.faculte || '-'}
                            </td>

                            {/* Diplôme demandé */}
                            <td style={{ padding: '0.9rem 1.1rem', color: '#0f172a', fontWeight: 600 }}>
                              {d.type_diplome}
                            </td>

                            {/* Colonnes spécifiques : Rejetées */}
                            {isScolariteCentrale && activeTab === 'REJETEES' ? (
                              <>
                                <td style={{ padding: '0.9rem 1.1rem', color: '#b91c1c', fontSize: '0.82rem', fontWeight: 600 }}>
                                  {dateRejetFormatted}
                                </td>
                                <td style={{ padding: '0.9rem 1.1rem', color: '#475569', fontSize: '0.82rem', maxWidth: '240px' }}>
                                  <span style={{ fontStyle: 'italic', backgroundColor: '#fee2e2', color: '#991b1b', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block' }}>
                                    {motifRejet}
                                  </span>
                                </td>
                              </>
                            ) : isScolariteCentrale && activeTab === 'VALIDEES' ? (
                              <>
                                <td style={{ padding: '0.9rem 1.1rem', color: '#0f766e', fontSize: '0.82rem', fontWeight: 600 }}>
                                  {dateValidationFormatted}
                                </td>
                                <td style={{ padding: '0.9rem 1.1rem' }}>
                                  {getStatusBadge(d.statut)}
                                </td>
                              </>
                            ) : (
                              <>
                                <td style={{ padding: '0.9rem 1.1rem', color: '#64748b', fontSize: '0.82rem' }}>
                                  {dateDemandeFormatted}
                                </td>
                                <td style={{ padding: '0.9rem 1.1rem' }}>
                                  {getStatusBadge(d.statut)}
                                </td>
                              </>
                            )}

                            {/* Action Button */}
                            <td style={{ padding: '0.9rem 1.1rem', textAlign: 'right' }}>
                              <button
                                onClick={() => handleOpenModal(d)}
                                className="btn btn-primary"
                                style={{
                                  padding: '0.45rem 1rem',
                                  fontSize: '0.8rem',
                                  backgroundColor: isScolariteCentrale && ['EN_ATTENTE_VERIFICATION', 'DOSSIER_INCOMPLET'].includes(d.statut) ? '#048b9a' : '#0a3641',
                                  borderColor: isScolariteCentrale && ['EN_ATTENTE_VERIFICATION', 'DOSSIER_INCOMPLET'].includes(d.statut) ? '#048b9a' : '#0a3641',
                                  borderRadius: '8px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                  fontWeight: 700
                                }}
                              >
                                <Eye size={14} /> 
                                {isScolariteCentrale && ['EN_ATTENTE_VERIFICATION', 'DOSSIER_INCOMPLET'].includes(d.statut) ? 'Traiter' : 'Voir'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* MODALE DE TRAITEMENT UNIQUE ET DÉTAILS D'UN DOSSIER                       */}
        {/* ========================================================================= */}
        {selectedDemande && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(10, 22, 38, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem'
          }}>
            <div className="card" style={{
              width: '100%',
              maxWidth: '960px',
              maxHeight: '92vh',
              overflowY: 'auto',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '2.25rem',
              position: 'relative',
              boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
            }}>
              {/* Close Button */}
              <button 
                onClick={() => { setSelectedDemande(null); setShowRejectModal(false); }}
                style={{ position: 'absolute', top: '20px', right: '20px', padding: '0.5rem', color: '#64748b' }}
                title="Fermer"
              >
                <X size={24} />
              </button>

              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem' }}>
                <div style={{ background: '#e0f7fa', padding: '0.85rem', borderRadius: '12px', color: '#00b4d8' }}>
                  <FileText size={28} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#0a3641' }}>
                      Demande DEM-{String(selectedDemande.id).padStart(3, '0')}
                    </h2>
                    {getStatusBadge(selectedDemande.statut)}
                  </div>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0 0' }}>
                    {selectedDemande.etudiant_details?.nom} {selectedDemande.etudiant_details?.prenom} — Matricule : <strong>{selectedDemande.etudiant_details?.matricule}</strong>
                  </p>
                </div>
              </div>

              {/* Parcours & Progression de la Demande */}
              <div style={{ marginBottom: '1.75rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.85rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Parcours & Progression de la Demande
                </h4>
                <StepperProgress currentStatut={selectedDemande.statut} />
              </div>

              {/* ========================================================================= */}
              {/* VUE SCOLARITÉ CENTRALE (LES 5 SECTIONS DU FORMULAIRE VERTICAL)             */}
              {/* ========================================================================= */}
              {isScolariteCentrale ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '1.75rem' }}>
                  
                  {/* SECTION 1 — INFORMATIONS DE L'ÉTUDIANT */}
                  <div style={{ background: '#f8fafc', padding: '1.35rem 1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0a3641', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <User size={18} color="#048b9a" /> Section 1 — INFORMATIONS DE L'ÉTUDIANT
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', fontSize: '0.88rem' }}>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Nom :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.nom}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Prénom(s) :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.prenom}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Matricule :</span> <strong style={{ color: '#0a3641' }}>{selectedDemande.etudiant_details?.matricule}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Date de naissance :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.date_naissance || 'Non renseignée'}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Lieu de naissance :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.lieu_naissance || 'Toliara'}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Établissement :</span> <strong style={{ color: '#0a3641' }}>{selectedDemande.etablissement_origine || selectedDemande.etudiant_details?.faculte}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Faculté / École :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.faculte}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Filière :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.filiere}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Niveau :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.niveau_etude || 'Master 2'}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Année universitaire :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.annee_universitaire || '2024-2025'}</strong></div>
                    </div>
                  </div>

                  {/* SECTION 2 — CURSUS ET DIPLÔME DEMANDÉ */}
                  <div style={{ background: '#f8fafc', padding: '1.35rem 1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0a3641', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <GraduationCap size={18} color="#048b9a" /> Section 2 — CURSUS ET DIPLÔME DEMANDÉ
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem', fontSize: '0.88rem' }}>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Filière / parcours :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.filiere}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Niveau d'étude :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.niveau_etude}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Année universitaire :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.annee_universitaire || '2024-2025'}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Diplôme demandé :</span> <strong style={{ color: '#0284c7' }}>{selectedDemande.type_diplome}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Mention :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.diplome?.mention || 'Attribuée après délibération'}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Spécialité :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.filiere}</strong></div>
                      <div><span style={{ color: '#64748b', fontWeight: 600 }}>Titre / grade visé :</span> <strong style={{ color: '#0a3641' }}>Grade de {selectedDemande.type_diplome}</strong></div>
                    </div>
                  </div>

                  {/* SECTION 3 — VÉRIFICATION DES PIÈCES (4 CASES À COCHER) */}
                  <div style={{ background: '#f0fdfa', padding: '1.35rem 1.5rem', borderRadius: '14px', border: '1px solid #99f6e4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f766e', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CheckSquare size={18} /> Section 3 — VÉRIFICATION DES PIÈCES PHYSIQUES
                      </h4>
                      <span style={{ fontSize: '0.78rem', color: '#0f766e', fontWeight: 600, background: '#ccfbf1', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                        Confirmation de présence dans le dossier physique
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: `1.5px solid ${checkPv ? '#10b981' : '#cbd5e1'}`, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: checkPv ? '#0f766e' : '#64748b' }}>
                        <input type="checkbox" checked={checkPv} onChange={(e) => setCheckPv(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#0f766e' }} />
                        <span>PV de soutenance</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: `1.5px solid ${checkReleve ? '#10b981' : '#cbd5e1'}`, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: checkReleve ? '#0f766e' : '#64748b' }}>
                        <input type="checkbox" checked={checkReleve} onChange={(e) => setCheckReleve(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#0f766e' }} />
                        <span>Relevé de notes</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: `1.5px solid ${checkCertificat ? '#10b981' : '#cbd5e1'}`, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: checkCertificat ? '#0f766e' : '#64748b' }}>
                        <input type="checkbox" checked={checkCertificat} onChange={(e) => setCheckCertificat(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#0f766e' }} />
                        <span>Certificat de scolarité</span>
                      </label>

                      <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '8px', border: `1.5px solid ${checkRecu ? '#10b981' : '#cbd5e1'}`, cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', color: checkRecu ? '#0f766e' : '#64748b' }}>
                        <input type="checkbox" checked={checkRecu} onChange={(e) => setCheckRecu(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: '#0f766e' }} />
                        <span>Reçu bancaire</span>
                      </label>
                    </div>
                  </div>

                  {/* SECTION 4 — VÉRIFICATION DE L'ADMISSION */}
                  <div style={{ background: '#f8fafc', padding: '1.35rem 1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0a3641', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck size={18} color="#048b9a" /> Section 4 — VÉRIFICATION DE L'ADMISSION
                    </h4>
                    <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem', color: '#64748b' }}>
                      Vérifier si l'étudiant figure dans la liste officielle des étudiants admis aux délibérations :
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <label 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          background: admissionChoice === 'ADMIS' ? '#dcfce7' : '#ffffff',
                          border: `2px solid ${admissionChoice === 'ADMIS' ? '#10b981' : '#e2e8f0'}`,
                          padding: '0.85rem 1.5rem',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: admissionChoice === 'ADMIS' ? '#15803d' : '#475569',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input 
                          type="radio" 
                          name="admission_centrale" 
                          value="ADMIS" 
                          checked={admissionChoice === 'ADMIS'} 
                          onChange={() => setAdmissionChoice('ADMIS')}
                          style={{ width: '18px', height: '18px', accentColor: '#10b981' }}
                        />
                        <span>Admis</span>
                      </label>

                      <label 
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          background: admissionChoice === 'NON_ADMIS' ? '#fee2e2' : '#ffffff',
                          border: `2px solid ${admissionChoice === 'NON_ADMIS' ? '#ef4444' : '#e2e8f0'}`,
                          padding: '0.85rem 1.5rem',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          color: admissionChoice === 'NON_ADMIS' ? '#b91c1c' : '#475569',
                          transition: 'all 0.2s'
                        }}
                      >
                        <input 
                          type="radio" 
                          name="admission_centrale" 
                          value="NON_ADMIS" 
                          checked={admissionChoice === 'NON_ADMIS'} 
                          onChange={() => setAdmissionChoice('NON_ADMIS')}
                          style={{ width: '18px', height: '18px', accentColor: '#ef4444' }}
                        />
                        <span>Non admis</span>
                      </label>
                    </div>
                  </div>

                  {/* SECTION 5 — DÉCISION & RÈGLES DE VALIDATION */}
                  <div style={{ background: '#ffffff', padding: '1.35rem 1.5rem', borderRadius: '14px', border: '1.5px solid #cbd5e1' }}>
                    <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0a3641', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Send size={18} color="#048b9a" /> Section 5 — DÉCISION
                    </h4>

                    {['EN_ATTENTE_VERIFICATION', 'DOSSIER_INCOMPLET'].includes(selectedDemande.statut) ? (
                      <>
                        {/* Messages d'aide conditionnels */}
                        {isAdmissionNonAdmis && (
                          <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fee2e2', borderRadius: '8px', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <AlertTriangle size={18} />
                            <span>L'étudiant est déclaré <strong>Non admis</strong>. La validation est bloquée. Veuillez utiliser l'action <strong>REJETER LA DEMANDE</strong>.</span>
                          </div>
                        )}

                        {hasUncheckedPieces && !isAdmissionNonAdmis && (
                          <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a', color: '#92400e', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Info size={18} />
                            <span>Les 4 pièces physiques doivent être confirmées et cochées pour activer la validation.</span>
                          </div>
                        )}

                        <div style={{ marginBottom: '1rem' }}>
                          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                            Observations / Remarques :
                          </label>
                          <textarea
                            value={observationInput}
                            onChange={(e) => setObservationInput(e.target.value)}
                            placeholder="Observations éventuelles sur le dossier physique ou l'admission..."
                            rows={2}
                            style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                          />
                        </div>

                        {/* Modal de motif de rejet interactif */}
                        {showRejectModal ? (
                          <div style={{ backgroundColor: '#fef2f2', padding: '1.25rem', borderRadius: '12px', border: '1.5px solid #fca5a5', marginBottom: '1rem' }}>
                            <h5 style={{ margin: '0 0 0.5rem 0', color: '#991b1b', fontWeight: 800, fontSize: '0.9rem' }}>
                              Confirmation du rejet du dossier DEM-{String(selectedDemande.id).padStart(3, '0')}
                            </h5>
                            <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem', color: '#7f1d1d' }}>
                              Veuillez préciser le motif du rejet qui sera notifié à l'établissement et consigné dans l'historique :
                            </p>
                            <textarea
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              placeholder="Ex : Étudiant non admis aux délibérations officielles / Pièces non authentiques..."
                              rows={2}
                              style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '0.875rem', marginBottom: '0.75rem' }}
                            />
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                              <button
                                type="button"
                                onClick={() => setShowRejectModal(false)}
                                className="btn btn-outline"
                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                              >
                                Annuler
                              </button>
                              <button
                                type="button"
                                onClick={handleScolariteCentraleRejeter}
                                disabled={submittingAction}
                                className="btn"
                                style={{ backgroundColor: '#b91c1c', color: '#ffffff', padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: 700, borderRadius: '8px' }}
                              >
                                {submittingAction ? 'Enregistrement...' : 'Confirmer le Rejet'}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
                            {/* BOUTON REJETER LA DEMANDE */}
                            <button
                              type="button"
                              onClick={() => {
                                setRejectReason(isAdmissionNonAdmis ? "Étudiant non admis sur les listes officielles de délibération." : observationInput);
                                setShowRejectModal(true);
                              }}
                              disabled={submittingAction}
                              className="btn"
                              style={{ 
                                backgroundColor: '#ef4444', 
                                color: '#ffffff', 
                                fontWeight: 700, 
                                padding: '0.7rem 1.35rem', 
                                borderRadius: '10px', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                boxShadow: isAdmissionNonAdmis ? '0 4px 12px rgba(239, 68, 68, 0.3)' : 'none'
                              }}
                            >
                              <XCircle size={18} /> REJETER LA DEMANDE
                            </button>

                            {/* BOUTON VALIDER LA DEMANDE */}
                            <button
                              type="button"
                              onClick={handleScolariteCentraleValider}
                              disabled={!canValiderScolariteCentrale || submittingAction}
                              className="btn"
                              style={{ 
                                backgroundColor: canValiderScolariteCentrale ? '#10b981' : '#94a3b8', 
                                color: '#ffffff', 
                                fontWeight: 800, 
                                padding: '0.7rem 1.6rem', 
                                borderRadius: '10px', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                gap: '0.5rem', 
                                cursor: canValiderScolariteCentrale ? 'pointer' : 'not-allowed',
                                boxShadow: canValiderScolariteCentrale ? '0 4px 14px rgba(16, 185, 129, 0.3)' : 'none',
                                opacity: canValiderScolariteCentrale ? 1 : 0.65
                              }}
                            >
                              <CheckCircle2 size={18} /> VALIDER LA DEMANDE
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      /* Dossier déjà traité (Validé ou Rejeté) */
                      <div>
                        {selectedDemande.statut === 'REFUSEE' ? (
                          <div style={{ padding: '1rem 1.25rem', backgroundColor: '#fef2f2', borderRadius: '10px', border: '1px solid #fca5a5', color: '#991b1b', fontSize: '0.88rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                              <XCircle size={18} /> Demande rejetée par la Scolarité centrale
                            </div>
                            <p style={{ margin: '0.2rem 0', color: '#7f1d1d' }}>
                              <strong>Motif consigné :</strong> {selectedDemande.observations || 'Non conforme aux délibérations officielles'}
                            </p>
                          </div>
                        ) : (
                          <div style={{ padding: '1rem 1.25rem', backgroundColor: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0', color: '#166534', fontSize: '0.88rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                              <CheckCircle2 size={18} /> Demande validée par la Scolarité centrale
                            </div>
                            <p style={{ margin: '0.2rem 0 0 0', color: '#15803d', fontSize: '0.84rem' }}>
                              Ce dossier a été validé et transmis au Chef de service des diplômes. Étape actuelle : <strong>{STATUT_CONFIG[selectedDemande.statut]?.label || selectedDemande.statut}</strong>.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              ) : (
                /* ========================================================================= */
                /* VUE CLASSIQUE POUR LES AUTRES RÔLES                                      */
                /* ========================================================================= */
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.75rem' }}>
                    <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Informations Étudiant</h4>
                      <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Nom :</strong> {selectedDemande.etudiant_details?.nom} {selectedDemande.etudiant_details?.prenom}</p>
                      <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>CIN :</strong> {selectedDemande.etudiant_details?.cin}</p>
                      <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Établissement :</strong> {selectedDemande.etablissement_origine || selectedDemande.etudiant_details?.faculte}</p>
                      <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Filière :</strong> {selectedDemande.etudiant_details?.filiere}</p>
                    </div>

                    <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Diplôme & Registre</h4>
                      <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Titre visé :</strong> {selectedDemande.type_diplome}</p>
                      {selectedDemande.diplome ? (
                        <>
                          <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>N° Officiel :</strong> <span style={{ color: '#0284c7', fontWeight: 800 }}>{selectedDemande.diplome.numero_diplome}</span></p>
                          <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Code Sécurité :</strong> <code>{selectedDemande.diplome.code_verification}</code></p>
                          <p style={{ margin: '0.2rem 0', fontSize: '0.9rem' }}><strong>Mention :</strong> {selectedDemande.diplome.mention || 'Non renseignée'}</p>
                        </>
                      ) : (
                        <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>Non encore imprimé</p>
                      )}
                    </div>

                    <div style={{ background: '#ffffff', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Contrôle des 4 Pièces</h4>
                      <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={16} color="#10b981" /> PV de Soutenance certifié
                      </p>
                      <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={16} color="#10b981" /> Relevé de notes officiel
                      </p>
                      <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={16} color="#10b981" /> Certificat de scolarité
                      </p>
                      <p style={{ margin: '0.2rem 0', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={16} color="#10b981" /> Reçu bancaire / Quittance
                      </p>
                    </div>
                  </div>

                  {/* Actions Contextuelles */}
                  <div style={{ marginBottom: '1.75rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0a3641', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldCheck size={18} /> Actions Habilitées pour {user?.get_role_display || user?.role}
                    </h4>

                    {/* SCOLARITÉ ÉTABLISSEMENT ACTIONS */}
                    {user?.role === 'SCOLARITE_ETABLISSEMENT' && selectedDemande.statut === 'DOSSIER_INCOMPLET' && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleExecuteAction('COMPLETER_DOSSIER')}
                          disabled={submittingAction}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#00b4d8', borderColor: '#00b4d8' }}
                        >
                          <Check size={16} /> Régulariser et renvoyer à la Scolarité Centrale
                        </button>
                      </div>
                    )}

                    {user?.role === 'SCOLARITE_ETABLISSEMENT' && selectedDemande.statut === 'EN_ATTENTE_SIGNATURE_ETABLISSEMENT' && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleExecuteAction('VALIDER_SIGNATURE_ETABLISSEMENT')}
                          disabled={submittingAction}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}
                        >
                          <PenTool size={16} /> Enregistrer la signature du Doyen/Directeur
                        </button>
                      </div>
                    )}

                    {user?.role === 'SCOLARITE_ETABLISSEMENT' && ['RETOUR_SCOLARITE', 'SIGNE_PRESIDENT'].includes(selectedDemande.statut) && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleExecuteAction('METTRE_A_DISPOSITION')}
                          disabled={submittingAction}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                        >
                          <CheckCircle2 size={16} /> Marquer disponible au guichet
                        </button>
                      </div>
                    )}

                    {user?.role === 'SCOLARITE_ETABLISSEMENT' && selectedDemande.statut === 'DISPONIBLE' && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setActiveActionModal('ENREGISTRER_RETRAIT')}
                          disabled={submittingAction}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#0a3641', borderColor: '#0a3641' }}
                        >
                          <UserCheck size={16} /> Enregistrer le retrait par l'étudiant
                        </button>
                      </div>
                    )}

                    {/* CHEF DE SERVICE ACTIONS */}
                    {user?.role === 'CHEF_SERVICE' && selectedDemande.statut === 'VALIDEE' && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleExecuteAction('PRENDRE_EN_CHARGE')}
                          disabled={submittingAction}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#0a3641', borderColor: '#0a3641' }}
                        >
                          <Layers size={16} /> Prendre en charge le dossier
                        </button>
                        <button
                          onClick={() => setActiveActionModal('AFFECTER_IMPRIMEUR')}
                          disabled={submittingAction}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                        >
                          <Printer size={16} /> Affecter à l'imprimeur
                        </button>
                      </div>
                    )}

                    {user?.role === 'CHEF_SERVICE' && selectedDemande.statut === 'EN_TRAITEMENT' && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setActiveActionModal('AFFECTER_IMPRIMEUR')}
                          disabled={submittingAction}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#0284c7', borderColor: '#0284c7' }}
                        >
                          <Printer size={16} /> Affecter à l'imprimeur
                        </button>
                      </div>
                    )}

                    {user?.role === 'CHEF_SERVICE' && selectedDemande.statut === 'IMPRIME' && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleExecuteAction('TRANSMETTRE_SIGNATURE_ETABLISSEMENT')}
                          disabled={submittingAction}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}
                        >
                          <PenTool size={16} /> Transmettre pour signature Doyen/Directeur
                        </button>
                      </div>
                    )}

                    {user?.role === 'CHEF_SERVICE' && selectedDemande.statut === 'SIGNE_ETABLISSEMENT' && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setActiveActionModal('CONFIER_TRANSMISSION_PRESIDENT')}
                          disabled={submittingAction}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#4338ca', borderColor: '#4338ca' }}
                        >
                          <Truck size={16} /> Confier à l'agent de transmission vers Présidence
                        </button>
                      </div>
                    )}

                    {/* IMPRIMEUR ACTIONS */}
                    {user?.role === 'IMPRIMEUR' && selectedDemande.statut === 'EN_ATTENTE_IMPRESSION' && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleExecuteAction('LANCER_IMPRESSION')}
                          disabled={submittingAction}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#1d70b8', borderColor: '#1d70b8' }}
                        >
                          <Clock size={16} /> Démarrer le tirage
                        </button>
                        <button
                          onClick={() => handleExecuteAction('TERMINER_IMPRESSION')}
                          disabled={submittingAction}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                        >
                          <Printer size={16} /> Déclarer impression terminée (Générer N° officiel)
                        </button>
                      </div>
                    )}

                    {user?.role === 'IMPRIMEUR' && selectedDemande.statut === 'EN_IMPRESSION' && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleExecuteAction('TERMINER_IMPRESSION')}
                          disabled={submittingAction}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                        >
                          <Printer size={16} /> Déclarer impression terminée (Générer N° officiel)
                        </button>
                      </div>
                    )}

                    {/* AGENT DE TRANSMISSION ACTIONS */}
                    {user?.role === 'AGENT_TRANSMISSION' && selectedDemande.statut === 'EN_TRANSMISSION_PRESIDENT' && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleExecuteAction('REMETTRE_PRESIDENCE')}
                          disabled={submittingAction}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#c0000c', borderColor: '#c0000c' }}
                        >
                          <Building2 size={16} /> Enregistrer la remise au secrétariat de la Présidence
                        </button>
                      </div>
                    )}

                    {user?.role === 'AGENT_TRANSMISSION' && selectedDemande.statut === 'SIGNE_PRESIDENT' && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleExecuteAction('ACHEMINER_RETOUR')}
                          disabled={submittingAction}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#0a3641', borderColor: '#0a3641' }}
                        >
                          <Truck size={16} /> Acheminer en retour vers la scolarité de l'établissement
                        </button>
                      </div>
                    )}

                    {/* PRÉSIDENCE ACTIONS */}
                    {user?.role === 'PRESIDENCE' && selectedDemande.statut === 'EN_ATTENTE_SIGNATURE_PRESIDENT' && (
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => setActiveActionModal('SIGNER_PRESIDENT')}
                          disabled={submittingAction}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#c0000c', borderColor: '#c0000c' }}
                        >
                          <Award size={16} /> Apposer la signature présidentielle & Attribuer la mention
                        </button>
                      </div>
                    )}

                    {/* Modale d'action secondaire pour les autres rôles */}
                    {activeActionModal && (
                      <div style={{ marginTop: '1.25rem', padding: '1.25rem', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1' }}>
                        <h5 style={{ margin: '0 0 0.75rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#0a3641' }}>
                          {activeActionModal === 'AFFECTER_IMPRIMEUR' && "Sélectionner le Concepteur / Imprimeur désigné :"}
                          {activeActionModal === 'CONFIER_TRANSMISSION_PRESIDENT' && "Sélectionner l'Agent de transmission désigné :"}
                          {activeActionModal === 'SIGNER_PRESIDENT' && "Confirmer la signature officielle et attribuer la mention :"}
                          {activeActionModal === 'ENREGISTRER_RETRAIT' && "Renseigner l'identité du retirant :"}
                        </h5>

                        {activeActionModal === 'AFFECTER_IMPRIMEUR' && (
                          <div style={{ marginBottom: '0.75rem' }}>
                            <select
                              value={selectedImprimeurId}
                              onChange={(e) => setSelectedImprimeurId(e.target.value)}
                              style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                            >
                              <option value="">Sélectionner un imprimeur...</option>
                              {imprimeursList.map(imp => (
                                <option key={imp.id} value={imp.id}>{imp.first_name} {imp.last_name} ({imp.username})</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {activeActionModal === 'CONFIER_TRANSMISSION_PRESIDENT' && (
                          <div style={{ marginBottom: '0.75rem' }}>
                            <select
                              value={selectedAgentTransId}
                              onChange={(e) => setSelectedAgentTransId(e.target.value)}
                              style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                            >
                              <option value="">Sélectionner un agent de transmission...</option>
                              {agentsTransList.map(ag => (
                                <option key={ag.id} value={ag.id}>{ag.first_name} {ag.last_name} ({ag.username})</option>
                              ))}
                            </select>
                          </div>
                        )}

                        {activeActionModal === 'SIGNER_PRESIDENT' && (
                          <div style={{ marginBottom: '0.75rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                              Mention Académique Attribuée
                            </label>
                            <select
                              value={mentionInput}
                              onChange={(e) => setMentionInput(e.target.value)}
                              style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                            >
                              <option value="Très Bien">Très Bien</option>
                              <option value="Bien">Bien</option>
                              <option value="Assez Bien">Assez Bien</option>
                              <option value="Passable">Passable</option>
                            </select>
                          </div>
                        )}

                        {activeActionModal === 'ENREGISTRER_RETRAIT' && (
                          <div style={{ marginBottom: '0.75rem' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '0.3rem' }}>
                              Nom du Retirant / Mandataire
                            </label>
                            <input
                              type="text"
                              value={nomRetirantInput}
                              onChange={(e) => setNomRetirantInput(e.target.value)}
                              style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                            />
                          </div>
                        )}

                        <div style={{ marginBottom: '0.75rem' }}>
                          <textarea
                            value={observationInput}
                            onChange={(e) => setObservationInput(e.target.value)}
                            placeholder="Commentaire ou motif..."
                            rows={2}
                            style={{ width: '100%', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                          />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          <button
                            onClick={() => setActiveActionModal(null)}
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => handleExecuteAction(activeActionModal)}
                            disabled={submittingAction}
                            className="btn btn-primary"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: '#0a3641' }}
                          >
                            {submittingAction ? 'Enregistrement...' : 'Confirmer l\'action'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Historique et Audit Log de ce dossier (Lecture Seule) */}
              <div style={{ marginTop: '1.25rem', borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0a3641', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <History size={18} color="#048b9a" /> Historique & Traçabilité de la Demande (Lecture Seule)
                </h4>
                {(!selectedDemande.historique || selectedDemande.historique.length === 0) ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>Aucun événement enregistré dans l'historique.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {selectedDemande.historique.map((h, i) => (
                      <div key={i} style={{ padding: '0.85rem 1.1rem', backgroundColor: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <span style={{ fontWeight: 800, color: '#0a3641' }}>
                              {h.action_realisee}
                            </span>
                            <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                              Intervenant : <strong>{h.utilisateur_details?.first_name ? `${h.utilisateur_details.first_name} ${h.utilisateur_details.last_name}` : (h.utilisateur_details?.username || 'Utilisateur')} ({h.role_utilisateur || h.utilisateur_details?.role || 'Admin'})</strong>
                            </div>
                          </div>
                          <span style={{ color: '#048b9a', fontSize: '0.76rem', fontWeight: 700, backgroundColor: '#e0f7fa', padding: '0.2rem 0.55rem', borderRadius: '6px' }}>
                            {new Date(h.date_action).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>

                        {(h.ancien_statut || h.nouveau_statut) && (
                          <div style={{ fontSize: '0.78rem', color: '#475569', marginBottom: '0.25rem' }}>
                            Transition : <span style={{ color: '#64748b' }}>{STATUT_CONFIG[h.ancien_statut]?.label || h.ancien_statut || 'Initial'}</span> → <strong style={{ color: '#0f766e' }}>{STATUT_CONFIG[h.nouveau_statut]?.label || h.nouveau_statut}</strong>
                          </div>
                        )}

                        {h.commentaire && (
                          <p style={{ margin: '0.25rem 0 0 0', color: '#334155', fontStyle: 'italic', fontSize: '0.82rem', backgroundColor: '#ffffff', padding: '0.4rem 0.65rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                            « {h.commentaire} »
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;