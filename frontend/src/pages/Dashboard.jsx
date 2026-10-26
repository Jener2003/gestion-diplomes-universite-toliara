import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AppLayout, { ROLE_LABELS } from '../components/AppLayout';
import { useAuth } from '../components/AuthContext';
import StepperProgress from '../components/StepperProgress';
import StatCards from '../components/StatCards';
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
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
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
  EN_TRANSMISSION_PRESIDENT: { label: 'En transmission Présidence', bg: '#e0e7ff', text: '#4338ca', border: '#c7d2fe' },
  EN_ATTENTE_SIGNATURE_PRESIDENT: { label: 'À signer Président', bg: '#ffe4e6', text: '#be123c', border: '#fecdd3' },
  SIGNE_PRESIDENT: { label: 'Signé par le Président', bg: '#fef3c7', text: '#b45309', border: '#fde68a' },
  RETOUR_SCOLARITE: { label: 'En retour vers le Chef de service', bg: '#e0f7fa', text: '#006064', border: '#b2ebf2' },
};

// Nombre de dossiers par page du tableau de bord
const TAILLE_PAGE = 25;

const Dashboard = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [demandes, setDemandes] = useState([]);
  // Pagination côté serveur : une page de dossiers à la fois, compteurs des onglets fournis par l'API
  const [page, setPage] = useState(1);
  const [totalDemandes, setTotalDemandes] = useState(0);
  const [compteurs, setCompteurs] = useState({});
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

  useEffect(() => {
    if (isScolariteCentrale) {
      const requestedTab = new URLSearchParams(location.search).get('tab');
      setActiveTab(['VALIDEES', 'REJETEES'].includes(requestedTab) ? requestedTab : 'TABLEAU_DE_BORD');
    }
  }, [isScolariteCentrale, location.search]);

  useEffect(() => {
    if (activeTab === 'TABLEAU_DE_BORD') setSearchTerm('');
  }, [activeTab]);

  // Listes pour assignation
  const [imprimeursList, setImprimeursList] = useState([]);
  const [agentsTransList, setAgentsTransList] = useState([]);

  // Modal State
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [observationInput, setObservationInput] = useState('');
  const [mentionInput, setMentionInput] = useState('Bien');
  const [selectedImprimeurId, setSelectedImprimeurId] = useState('');
  const [selectedAgentTransId, setSelectedAgentTransId] = useState('');
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

  const fetchRequestId = React.useRef(0);

  // Filtres de la vue courante, communs à la liste paginée et aux exports
  const filtresCourants = () => ({
    search: searchTerm,
    statut: statutFilter,
    faculte: faculteFilter,
    date_debut: dateDebutFilter || undefined,
    date_fin: dateFinFilter || undefined,
    type_diplome: diplomeFilter || undefined,
    // L'accueil de la Scolarité centrale affiche les dossiers à vérifier
    onglet: activeTab === 'TABLEAU_DE_BORD' ? 'A_TRAITER' : activeTab,
  });

  const fetchDemandesData = async () => {
    const requestId = ++fetchRequestId.current;
    setLoading(true);
    try {
      const res = await demandesAPI.getDemandes({ ...filtresCourants(), page, page_size: TAILLE_PAGE });
      const statsRes = await demandesAPI.getStatsOverview();
      if (requestId !== fetchRequestId.current) return;
      setDemandes(res.data.results);
      setTotalDemandes(res.data.count);
      setCompteurs(res.data.compteurs || {});
      setStats(statsRes.data);

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
      if (requestId === fetchRequestId.current) setLoading(false);
    }
  };

  // Nouveau filtre ou nouvel onglet : retour à la première page AVANT de charger
  // (sinon une requête partirait avec l'ancien numéro de page, parfois inexistant)
  const cleFiltres = JSON.stringify([searchTerm, statutFilter, faculteFilter, dateDebutFilter, dateFinFilter, diplomeFilter, activeTab]);
  const derniereCleFiltres = React.useRef(cleFiltres);
  useEffect(() => {
    if (derniereCleFiltres.current !== cleFiltres) {
      derniereCleFiltres.current = cleFiltres;
      if (page !== 1) { setPage(1); return; }
    }
    fetchDemandesData();
  }, [cleFiltres, page, user]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && selectedDemande) {
        setSelectedDemande(null);
        setShowRejectModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDemande]);

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
    setActiveActionModal(null);
    setShowRejectModal(false);
    setRejectReason('');

    // Initialisation des 4 cases de pièces physiques et d'admission
    setCheckPv(demande.has_pv_soutenance !== false);
    setCheckReleve(demande.has_releve_notes !== false);
    setCheckCertificat(demande.has_certificat_scolarite !== false);
    setCheckRecu(demande.has_recu_bancaire !== false);
    setAdmissionChoice(demande.admission_etudiant === false ? 'NON_ADMIS' : 'ADMIS');
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
        has_pv_soutenance: checkPv,
        has_releve_notes: checkReleve,
        has_certificat_scolarite: checkCertificat,
        has_recu_bancaire: checkRecu,
        admission_etudiant: admissionChoice === 'ADMIS'
      };

      const res = await demandesAPI.passerEtape(selectedDemande.id, payload);
      showToast(
        actionType === 'VALIDER_SCOLARITE_CENTRALE' 
          ? "Demande validée. Transmettez-la au Chef de service lorsqu’elle est prête."
          : actionType === 'TRANSMETTRE_CHEF'
          ? "Demande transmise au Chef de service et ajoutée aux archives."
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

  // Export officiel en document PDF adapté au rôle et à l'espace actif
  const exportPDF = async () => {
    let filteredDemandes;
    try {
      const res = await demandesAPI.getDemandes({ ...filtresCourants(), sans_historique: 1 });
      filteredDemandes = res.data;
    } catch {
      showToast("Impossible de préparer l'export. Réessayez dans quelques instants.", "error");
      return;
    }
    if (!filteredDemandes || filteredDemandes.length === 0) {
      showToast("Aucun dossier à exporter dans cette vue.", "info");
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const todayStr = new Date().toISOString().slice(0, 10);
    const dateStr = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const role = user?.role;
    let serviceHeader = "Direction de la Scolarité Centrale • Rectorat";
    let documentTitle = "REGISTRE OFFICIEL DES DOSSIERS DE DIPLÔMES";
    let subTitle = "Suivi et traçabilité du circuit académique";
    let filePrefix = "Registre_Diplomes";
    let sigLeft = "Pour le Responsable de Service :";
    let sigRight = "Pour la Direction / Destinataire :";

    if (role === 'CHEF_SERVICE') {
      serviceHeader = "Direction de la Scolarité Centrale • Service des Diplômes";
      filePrefix = "Chef_Service_Bordereau";
      sigLeft = "Pour le Chef de Service des Diplômes :";
      sigRight = "Pour la Scolarité Centrale / Destinataire :";
      if (activeTab === 'A_AFFECTER') {
        documentTitle = "LISTE DES DIPLÔMES À ENVOYER À L'IMPRIMEUR";
        subTitle = "Dossiers validés par la Scolarité Centrale, en attente d'être confiés à un imprimeur";
      } else if (activeTab === 'A_IMPRIMER') {
        documentTitle = "BORDEREAU DES DOSSIERS EN COURS D'IMPRESSION";
        subTitle = "Dossiers affectés à l'imprimeur en cours de tirage sécurisé";
      } else if (activeTab === 'IMPRIMEES') {
        documentTitle = "BORDEREAU DES DIPLÔMES IMPRIMÉS À TRANSMETTRE";
        subTitle = "Diplômes imprimés en attente de remise à l'agent de transmission vers la Présidence";
      } else if (activeTab === 'NAVETTE_PRES') {
        documentTitle = "BORDEREAU D'ACHEMINEMENT VERS LA PRÉSIDENCE";
        subTitle = "Diplômes imprimés transmis au Cabinet du Recteur pour signature et sceau";
      } else if (activeTab === 'NAVETTE_RETOUR') {
        documentTitle = "BORDEREAU DE RÉCEPTION DES DIPLÔMES SIGNÉS";
        subTitle = "Diplômes signés par la Présidence en retour vers le Service des Diplômes";
      } else {
        documentTitle = "BORDEREAU GLOBAL DU SERVICE DES DIPLÔMES";
        subTitle = "État récapitulatif de l'ensemble des dossiers sous instruction";
      }
    } else if (role === 'IMPRIMEUR') {
      serviceHeader = "Service Technique d'Impression & Tirage Sécurisé";
      filePrefix = "Imprimeur_Bordereau_Tirage";
      documentTitle = "BORDEREAU OFFICIEL DE TIRAGE ET D'IMPRESSION DES DIPLÔMES";
      sigLeft = "Pour l'Imprimeur Habilité (Contrôle technique) :";
      sigRight = "Pour le Chef de Service (Contrôle et réception) :";
      if (activeTab === 'A_IMPRIMER') {
        subTitle = "Dossiers affectés en attente et en cours de réalisation";
      } else if (activeTab === 'IMPRIMEES') {
        subTitle = "Diplômes imprimés, en attente de remise au Chef de service";
      } else {
        subTitle = "Registre d'activité de l'atelier de reprographie sécurisée";
      }
    } else if (role === 'AGENT_TRANSMISSION') {
      serviceHeader = "Service Général du Courrier & Navette Administrative";
      filePrefix = "Agent_Transmission_Navette";
      documentTitle = "BORDEREAU DE TRANSMISSION ET DÉCHARGE ADMINISTRATIVE";
      sigLeft = "L'Agent de Transmission (Départ de la navette) :";
      sigRight = "Le Réceptionnaire (Cabinet Présidence / Scolarité) :";
      if (activeTab === 'NAVETTE_PRES') {
        subTitle = "Navette Aller : Acheminement vers la Présidence pour signature et grand sceau";
      } else if (activeTab === 'NAVETTE_RETOUR') {
        subTitle = "Navette Retour : Rapatriement des diplômes signés vers le Service des Diplômes";
      } else {
        subTitle = "Registre général des mouvements et acheminements de dossiers";
      }
    } else if (role === 'PRESIDENCE') {
      serviceHeader = "Présidence de l'Université de Toliara • Cabinet du Recteur";
      filePrefix = "Presidence_Registre_Signatures";
      documentTitle = "REGISTRE OFFICIEL DES DIPLÔMES SOUMIS AU VISA, SIGNATURE ET GRAND SCEAU";
      sigLeft = "Le Secrétaire Général de l'Université :";
      sigRight = "Le Président de l'Université de Toliara (Grand Sceau) :";
      if (activeTab === 'A_SIGNER_PRES') {
        subTitle = "Diplômes vérifiés déposés pour visa, signature rectorale et sceau officiel";
      } else if (activeTab === 'NAVETTE_RETOUR' || activeTab === 'SIGNEES') {
        subTitle = "Diplômes dûment signés, paraphés et prêts pour transmission finale";
      } else {
        subTitle = "Registre institutionnel des diplômes universitaires";
      }
    } else if (role === 'SCOLARITE_ETABLISSEMENT') {
      serviceHeader = `Scolarité de Faculté • ${user?.etablissement || 'Établissement Universitaire'}`;
      filePrefix = "Scolarite_Etablissement_Registre";
      documentTitle = "REGISTRE RÉCAPITULATIF DES DEMANDES DE DIPLÔMES";
      sigLeft = "Le Responsable de la Scolarité de l'Établissement :";
      sigRight = "Le Doyen / Directeur de l'Établissement :";
      subTitle = "État des demandes soumises au circuit de diplomation";
    }

    // En-tête officiel
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(10, 54, 65);
    doc.text("UNIVERSITÉ DE TOLIARA", 14, 15);

    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(serviceHeader, 14, 21);
    doc.text("Système Numérique Intégré de Gestion & Délivrance des Diplômes", 14, 26);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(4, 139, 154);
    doc.text(documentTitle, 14, 35);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(`Objet : ${subTitle}`, 14, 41);
    doc.text(`Date d'émission : ${dateStr}   •   Effectif : ${filteredDemandes.length} dossier(s)   •   Opérateur : ${user?.first_name ? `${user.first_name} ${user.last_name}` : (user?.username || 'Agent')} (${ROLE_LABELS[user?.role]?.title || user?.role})`, 14, 46);

    // Colonnes et données selon le rôle
    let tableColumn = [];
    let tableRows = [];

    if (role === 'IMPRIMEUR') {
      tableColumn = ["N°", "Réf.", "Matricule", "Nom & Prénoms de l'Étudiant", "Établissement / Faculté", "Diplôme Sollicité", "Mention", "Statut Impression", "Visa Imprimeur"];
      tableRows = filteredDemandes.map((d, index) => {
        const student = d.etudiant_details || {};
        const statutLabel = STATUT_CONFIG[d.statut]?.label || d.statut_display || d.statut;
        return [
          index + 1,
          `DEM-${String(d.id).padStart(3, '0')}`,
          student.matricule || '—',
          `${(student.nom || '').toUpperCase()} ${student.prenom || ''}`,
          d.etablissement_origine || student.faculte || '—',
          d.type_diplome || '—',
          d.mention || d.diplome?.mention || 'Passable',
          statutLabel,
          ""
        ];
      });
    } else if (role === 'AGENT_TRANSMISSION') {
      tableColumn = ["N°", "Réf.", "Matricule", "Nom & Prénoms de l'Impétrant", "Établissement", "Diplôme", "Date Départ", "Décharge / Émargement Réceptionnaire"];
      tableRows = filteredDemandes.map((d, index) => {
        const student = d.etudiant_details || {};
        const dateDepart = d.date_transmission_president || d.date_demande;
        const dateFmt = dateDepart ? new Date(dateDepart).toLocaleDateString('fr-FR') : '—';
        return [
          index + 1,
          `DEM-${String(d.id).padStart(3, '0')}`,
          student.matricule || '—',
          `${(student.nom || '').toUpperCase()} ${student.prenom || ''}`,
          d.etablissement_origine || student.faculte || '—',
          d.type_diplome || '—',
          dateFmt,
          ""
        ];
      });
    } else if (role === 'PRESIDENCE') {
      tableColumn = ["N°", "Réf.", "Matricule", "Nom & Prénoms de l'Impétrant", "Faculté / Établissement", "Diplôme & Mention", "Transmis le", "Visa & Grand Sceau"];
      tableRows = filteredDemandes.map((d, index) => {
        const student = d.etudiant_details || {};
        const dateRef = d.date_signature_president || d.date_transmission_president || d.date_demande;
        const dateFmt = dateRef ? new Date(dateRef).toLocaleDateString('fr-FR') : '—';
        return [
          index + 1,
          `DEM-${String(d.id).padStart(3, '0')}`,
          student.matricule || '—',
          `${(student.nom || '').toUpperCase()} ${student.prenom || ''}`,
          d.etablissement_origine || student.faculte || '—',
          `${d.type_diplome || '—'}${d.mention ? ` (${d.mention})` : ''}`,
          dateFmt,
          ""
        ];
      });
    } else {
      // CHEF_SERVICE, SCOLARITE_ETABLISSEMENT et autres
      tableColumn = ["N°", "Réf.", "Matricule", "Nom & Prénoms de l'Étudiant", "Établissement / Faculté", "Diplôme Sollicité", "Statut / Étape", "Date", "Visa / Émargement"];
      tableRows = filteredDemandes.map((d, index) => {
        const student = d.etudiant_details || {};
        const dateRef = d.date_transmission_chef || d.date_demande;
        const dateFmt = dateRef ? new Date(dateRef).toLocaleDateString('fr-FR') : '—';
        const statutLabel = STATUT_CONFIG[d.statut]?.label || d.statut_display || d.statut;
        return [
          index + 1,
          `DEM-${String(d.id).padStart(3, '0')}`,
          student.matricule || '—',
          `${(student.nom || '').toUpperCase()} ${student.prenom || ''}`,
          d.etablissement_origine || student.faculte || '—',
          d.type_diplome || '—',
          statutLabel,
          dateFmt,
          ""
        ];
      });
    }

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 51,
      theme: 'grid',
      headStyles: {
        fillColor: [10, 54, 65],
        textColor: [255, 255, 255],
        fontSize: 8.5,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [30, 41, 59],
        cellPadding: 2.8
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        1: { halign: 'center', cellWidth: 22, fontStyle: 'bold' },
        2: { halign: 'center', cellWidth: 24 }
      },
      didDrawPage: () => {
        const str = `Page ${doc.internal.getNumberOfPages()}`;
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(str, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
      }
    });

    // Blocs de signatures
    let finalY = (doc.lastAutoTable?.finalY || 100) + 10;
    if (finalY > 175) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 54, 65);
    doc.text(sigLeft, 20, finalY);
    doc.text(sigRight, 175, finalY);

    doc.setDrawColor(203, 213, 225);
    doc.rect(20, finalY + 4, 90, 22);
    doc.rect(175, finalY + 4, 90, 22);

    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(148, 163, 184);
    doc.text("Date, visa et sceau officiel", 24, finalY + 23);
    doc.text("Date, signature et cachet", 179, finalY + 23);

    doc.save(`${filePrefix}_${activeTab}_${todayStr}.pdf`);
  };

  // Export d'une fiche individuelle complète de dossier en PDF
  const exportFicheIndividuellePDF = (d) => {
    if (!d) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    const student = d.etudiant_details || {};
    const ref = `DEM-${String(d.id).padStart(3, '0')}`;
    const dateDemande = d.date_demande ? new Date(d.date_demande).toLocaleDateString('fr-FR') : '—';
    const statutLabel = STATUT_CONFIG[d.statut]?.label || d.statut_display || d.statut;

    // En-tête officiel
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(10, 54, 65);
    doc.text("UNIVERSITÉ DE TOLIARA", 14, 15);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text("Direction de la Scolarité Centrale • Service des Diplômes", 14, 20);
    doc.text("Dossier Académique Numérique d'Instruction", 14, 25);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(4, 139, 154);
    doc.text("FICHE INDIVIDUELLE D'INSTRUCTION ET DE TRAÇABILITÉ", 14, 35);

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    doc.text(`Dossier Réf. : ${ref}   •   Date dépôt : ${dateDemande}   •   État : ${statutLabel}`, 14, 42);

    // Tableau 1 : Informations de l'étudiant
    doc.autoTable({
      startY: 47,
      theme: 'grid',
      head: [['INFORMATIONS ÉTUDIANT', 'DONNÉES ACADÉMIQUES & DIPLÔME']],
      headStyles: { fillColor: [10, 54, 65], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      body: [
        [`Nom : ${(student.nom || '').toUpperCase()}`, `Diplôme : ${d.type_diplome || '—'}`],
        [`Prénoms : ${student.prenom || '—'}`, `Faculté : ${d.etablissement_origine || student.faculte || '—'}`],
        [`N° Matricule : ${student.matricule || '—'}`, `Filière : ${student.filiere || '—'}`],
        [`CIN : ${student.cin || '—'}`, `Année : ${d.annee_universitaire || '—'}`],
      ],
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2.5 }
    });

    // Tableau 2 : Pièces justificatives
    const yPieces = (doc.lastAutoTable?.finalY || 85) + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(10, 54, 65);
    doc.text("CONTRÔLE DES PIÈCES JUSTIFICATIVES & ADMISSION :", 14, yPieces);

    doc.autoTable({
      startY: yPieces + 3,
      theme: 'striped',
      head: [['Pièce / Critère', 'Statut de Vérification', 'Observation']],
      headStyles: { fillColor: [4, 139, 154], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      body: [
        ['1. Procès-Verbal (PV) de soutenance / délibération', d.has_pv_soutenance !== false ? 'Conforme et Validé' : 'Non conforme / Absent', 'Vérifié par la Scolarité'],
        ['2. Relevé de notes officiel', d.has_releve_notes !== false ? 'Conforme et Validé' : 'Non conforme / Absent', 'Vérifié par la Scolarité'],
        ['3. Certificat de scolarité', d.has_certificat_scolarite !== false ? 'Conforme et Validé' : 'Non conforme / Absent', 'Vérifié par la Scolarité'],
        ['4. Reçu / Bordereau bancaire officiel', d.has_recu_bancaire !== false ? 'Conforme et Validé' : 'Non conforme / Absent', 'Vérifié par la Scolarité'],
        ['5. Décision officielle d\'admission', d.admission_etudiant !== false ? 'Admis sur liste officielle' : 'Non admis / Refusé', d.admission_etudiant !== false ? 'Validé' : 'Bloquant'],
      ],
      bodyStyles: { fontSize: 7.8, textColor: [30, 41, 59], cellPadding: 2.2 }
    });

    // Tableau 3 : Historique des actions
    const yHist = (doc.lastAutoTable?.finalY || 140) + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(10, 54, 65);
    doc.text("HISTORIQUE & TRAÇABILITÉ DES INTERVENTIONS :", 14, yHist);

    const histRows = (d.historique && d.historique.length > 0)
      ? d.historique.map((h, i) => [
          i + 1,
          new Date(h.date_action).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }),
          h.action_realisee || 'Transition',
          h.utilisateur_details?.first_name ? `${h.utilisateur_details.first_name} ${h.utilisateur_details.last_name}` : (h.utilisateur_details?.username || 'Système'),
          h.role_utilisateur || h.utilisateur_details?.role || 'Admin',
          h.commentaire || '—'
        ])
      : [[1, dateDemande, 'Création de la demande', 'Étudiant / Scolarité', 'Demandeur', 'Dossier déposé initialement']];

    doc.autoTable({
      startY: yHist + 3,
      theme: 'grid',
      head: [['N°', 'Date', 'Action', 'Intervenant', 'Rôle', 'Observations']],
      headStyles: { fillColor: [10, 54, 65], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.8 },
      body: histRows,
      bodyStyles: { fontSize: 7.2, textColor: [30, 41, 59], cellPadding: 2 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 25 },
        2: { cellWidth: 35 },
        3: { cellWidth: 32 },
        4: { cellWidth: 25 }
      }
    });

    // Signatures
    let finalY = (doc.lastAutoTable?.finalY || 210) + 8;
    if (finalY > 245) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(10, 54, 65);
    doc.text("Pour la Scolarité Centrale (Visa) :", 18, finalY);
    doc.text("Pour le Chef de Service des Diplômes :", w - 85, finalY);

    doc.setDrawColor(203, 213, 225);
    doc.rect(18, finalY + 3, 65, 20);
    doc.rect(w - 85, finalY + 3, 65, 20);

    doc.setFontSize(7);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(148, 163, 184);
    doc.text("Visa et sceau de vérification", 22, finalY + 20);
    doc.text("Date, signature et cachet", w - 80, finalY + 20);

    doc.save(`Fiche_Dossier_${ref}_${student.matricule || 'Toliara'}.pdf`);
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

  // Dossiers de la page courante, déjà filtrés par onglet et par critères côté serveur
  const filteredDemandes = demandes;

  // Compteurs dynamiques issus des données réelles
  const countATraiter = compteurs.A_TRAITER ?? 0;
  const countValidees = compteurs.VALIDEES ?? 0;
  const countRejetees = compteurs.REJETEES ?? 0;
  const nombrePages = Math.max(1, Math.ceil(totalDemandes / TAILLE_PAGE));

  const renderRoleTabs = () => {
    const role = user?.role;
    let tabs = [];

    if (role === 'SCOLARITE_CENTRALE') {
      tabs = [
        { key: 'TABLEAU_DE_BORD', label: 'Accueil' },
        { key: 'A_TRAITER', label: `📥 Traiter une demande (${countATraiter})`, count: countATraiter },
        { key: 'VALIDEES', label: `✅ Demandes validées (${countValidees})`, count: countValidees },
        { key: 'REJETEES', label: `❌ Demandes rejetées (${countRejetees})`, count: countRejetees },
      ];
    } else if (role === 'SCOLARITE_ETABLISSEMENT') {
      tabs = [
        { key: 'ALL', label: 'Toutes les demandes' },
      ];
    } else if (role === 'CHEF_SERVICE') {
      tabs = [
        { key: 'ALL', label: 'Vue globale' },
        { key: 'A_AFFECTER', label: 'À envoyer à l\'imprimeur' },
        { key: 'A_IMPRIMER', label: 'En cours d\'impression' },
        { key: 'IMPRIMEES', label: 'Imprimés à transmettre' },
        { key: 'NAVETTE_PRES', label: 'Transmissions Présidence' },
        { key: 'NAVETTE_RETOUR', label: 'Retours au Chef de service' },
      ];
    } else if (role === 'IMPRIMEUR') {
      tabs = [
        { key: 'ALL', label: 'File complète' },
        { key: 'A_IMPRIMER', label: 'À imprimer / En cours' },
        { key: 'IMPRIMEES', label: 'Imprimés, à remettre au Chef' },
      ];
    } else if (role === 'AGENT_TRANSMISSION') {
      tabs = [
        { key: 'ALL', label: 'Tous les acheminements' },
        { key: 'NAVETTE_PRES', label: 'Acheminement vers la Présidence' },
        { key: 'A_SIGNER_PRES', label: 'Déposés Présidence' },
        { key: 'NAVETTE_RETOUR', label: 'Retour au Chef de service' },
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
            {!isScolariteCentrale && (
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#00b4d8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Espace Scolarité Centrale (Rectorat)
              </span>
            )}
            <h1 style={{ margin: '0.2rem 0 0 0', fontSize: '1.75rem', fontWeight: 800, color: '#0a3641' }}>
              {isScolariteCentrale 
                ? activeTab === 'TABLEAU_DE_BORD' ? 'Scolarité Centrale' : activeTab === 'VALIDEES' ? 'Demandes validées' : activeTab === 'REJETEES' ? 'Demandes rejetées' : 'Demandes à vérifier'
                : 'Tableau de Bord & Suivi des Demandes'}
            </h1>
            <p style={{ margin: '0.25rem 0 0 0', color: '#64748b', fontSize: '0.88rem' }}>
              {isScolariteCentrale
                ? activeTab === 'TABLEAU_DE_BORD' ? 'Demandes reçues et décisions à suivre.' : 'Vérifiez les informations, les quatre pièces et l’admission avant de prendre votre décision.'
                : 'Suivi et traitement du circuit de délivrance des diplômes'}
            </p>
          </div>

          {isScolariteCentrale && activeTab !== 'TABLEAU_DE_BORD' ? (
            <button
              type="button"
              onClick={() => {
                setSelectedDemande(null);
                setActiveTab('TABLEAU_DE_BORD');
                navigate('/dashboard', { replace: true });
              }}
              className="btn btn-outline"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <ArrowLeft size={16} /> Retour au tableau de bord
            </button>
          ) : !isScolariteCentrale && <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button 
              onClick={exportPDF} 
              className="btn btn-outline" 
              title="Exporter la liste active en document PDF officiel"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                padding: '0.6rem 1.1rem',
                borderRadius: '10px',
                backgroundColor: '#ffffff',
                border: '1.5px solid #048b9a',
                color: '#048b9a',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0fdfa'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
            >
              <Download size={16} /> Exporter en PDF ({totalDemandes})
            </button>
          </div>}
        </div>

        {/* KPI Cards Overview - Toujours visibles ou en synthèse */}
        {!isScolariteCentrale && <StatCards stats={stats} role={user?.role} presidenceKpi={presidenceKpi} />}

        {isScolariteCentrale && activeTab === 'TABLEAU_DE_BORD' && (
          <section className="card" style={{ margin: '0 0 1.5rem', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '1rem', color: '#0a3641', marginBottom: '0.2rem' }}>Actions rapides</h2>
              <p style={{ color: '#64748b', fontSize: '0.85rem' }}>Enregistrer une nouvelle demande de diplôme.</p>
            </div>
            <Link to="/nouvelle-demande" state={{ from: `${location.pathname}${location.search}` }} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#1d70b8' }}>
              <FileText size={17} /> + Nouvelle demande
            </Link>
          </section>
        )}

        {/* Navigation par Onglets Dédiés */}
        {(!isScolariteCentrale || activeTab === 'A_TRAITER') && renderRoleTabs()}

        {/* ========================================================================= */}
        {/* VUE 1 : TABLEAU DE BORD SCOLARITÉ CENTRALE (SYNTHÈSE COMPLÈTE)             */}
        {/* ========================================================================= */}
        {isScolariteCentrale && activeTab === 'TABLEAU_DE_BORD' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
              {[
                { label: 'Reçues', value: stats?.total ?? demandes.length, color: '#1d4ed8', background: '#eff6ff' },
                { label: 'À vérifier', value: countATraiter, color: '#b45309', background: '#fffbeb' },
                { label: 'Validées à transmettre', value: countValidees, color: '#0f766e', background: '#f0fdfa' },
                { label: 'Rejetées', value: countRejetees, color: '#b91c1c', background: '#fef2f2' },
              ].map(item => (
                <div key={item.label} style={{ padding: '1rem 1.25rem', background: item.background, border: '1px solid #e2e8f0', borderRadius: '12px' }}>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>{item.label}</div>
                  <div style={{ color: item.color, fontSize: '1.7rem', fontWeight: 800, marginTop: '0.25rem' }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Section : Dossiers récents en attente de vérification immédiate */}
            <div className="card" style={{ padding: '0', overflow: 'hidden', backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0a3641', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={18} color="#f59e0b" /> Dossiers récents en attente de vérification
                  </h3>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
                    Demandes reçues nécessitant la vérification des informations, des pièces et de l'admission
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

                {!isScolariteCentrale && <div>
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
                </div>}

                {!isScolariteCentrale && <div>
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
                </div>}

                {!isScolariteCentrale && <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
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
                </div>}
              </div>
            </div>

            {/* Barre de sélection et d'exportation pour la Scolarité Centrale (Demandes Validées) */}
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
                                {isScolariteCentrale && ['EN_ATTENTE_VERIFICATION', 'DOSSIER_INCOMPLET'].includes(d.statut) ? 'Traiter' : user?.role === 'PRESIDENCE' ? 'Consulter' : 'Voir'}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              {totalDemandes > TAILLE_PAGE && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', padding: '0.85rem 1.1rem', borderTop: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.85rem', color: '#475569' }}>
                  <span>
                    Dossiers {(page - 1) * TAILLE_PAGE + 1} à {Math.min(page * TAILLE_PAGE, totalDemandes)} sur {totalDemandes}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={() => setPage(page - 1)} disabled={page <= 1 || loading}>
                      <ChevronLeft size={14} /> Précédent
                    </button>
                    <span style={{ fontWeight: 700 }}>Page {page} / {nombrePages}</span>
                    <button type="button" className="btn btn-outline" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={() => setPage(page + 1)} disabled={page >= nombrePages || loading}>
                      Suivant <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* MODALE DE TRAITEMENT UNIQUE ET DÉTAILS D'UN DOSSIER                       */}
        {/* ========================================================================= */}
        {selectedDemande && typeof document !== 'undefined' && createPortal(
          (() => {
            const refFormatted = `DEM-${String(selectedDemande.id).padStart(3, '0')}`;
            const dateDemandeFormatted = selectedDemande.date_demande 
              ? new Date(selectedDemande.date_demande).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
              : '-';
            
            const eventRejet = (selectedDemande.historique || []).find(h => h.nouveau_statut === 'REFUSEE');
            const dateRejetFormatted = eventRejet?.date_action 
              ? new Date(eventRejet.date_action).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : dateDemandeFormatted;
            const motifRejet = eventRejet?.commentaire || selectedDemande.observations || 'Non conforme aux critères officiels de vérification académique';
            const agentRejet = eventRejet?.utilisateur_details?.first_name 
              ? `${eventRejet.utilisateur_details.first_name} ${eventRejet.utilisateur_details.last_name}` 
              : (eventRejet?.utilisateur_details?.username || 'Scolarité Centrale');

            const eventValidation = (selectedDemande.historique || []).find(h => h.nouveau_statut === 'VALIDEE');
            const dateValidationFormatted = eventValidation?.date_action 
              ? new Date(eventValidation.date_action).toLocaleString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : dateDemandeFormatted;
            const agentValidation = eventValidation?.utilisateur_details?.first_name 
              ? `${eventValidation.utilisateur_details.first_name} ${eventValidation.utilisateur_details.last_name}` 
              : (eventValidation?.utilisateur_details?.username || 'Scolarité Centrale');

            const isDossierRejete = selectedDemande.statut === 'REFUSEE';
            const isDossierValide = [
              'VALIDEE', 'EN_TRAITEMENT', 'EN_ATTENTE_IMPRESSION', 'EN_IMPRESSION',
              'IMPRIME', 'EN_TRANSMISSION_PRESIDENT', 'EN_ATTENTE_SIGNATURE_PRESIDENT',
              'SIGNE_PRESIDENT', 'RETOUR_SCOLARITE'
            ].includes(selectedDemande.statut);
            const isEnAttenteVerification = ['EN_ATTENTE_VERIFICATION', 'DOSSIER_INCOMPLET'].includes(selectedDemande.statut);

            // Si on est dans l'onglet des Demandes Validées ou Rejetées, ou si le dossier est déjà validé ou rejeté,
            // on active la VUE CONSULTATION ÉLÉGANTE (sans cases à cocher déroutantes)
            const isModeConsultation = activeTab === 'VALIDEES' || activeTab === 'REJETEES' || isDossierRejete || (isDossierValide && !isEnAttenteVerification);

            return (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  backgroundColor: 'rgba(10, 22, 38, 0.78)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 99999,
                  padding: '1.5rem',
                  boxSizing: 'border-box'
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setSelectedDemande(null);
                    setShowRejectModal(false);
                  }
                }}
              >
                <div
                  style={{
                    width: '100%',
                    maxWidth: '960px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    padding: 0,
                    margin: '0 auto',
                    boxShadow: '0 25px 60px -15px rgba(10, 34, 64, 0.55), 0 0 1px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                    boxSizing: 'border-box'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                {/* ========================================================================= */}
                {/* EN-TÊTE FIXE DE LA MODALE AVEC BOUTON FERMER PARFAITEMENT POSITIONNÉ À DROITE */}
                {/* ========================================================================= */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1.25rem 2rem',
                    backgroundColor: '#ffffff',
                    borderBottom: '1px solid #f1f5f9',
                    gap: '1rem',
                    flexShrink: 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        flexShrink: 0,
                        background: isDossierRejete ? '#fee2e2' : isDossierValide ? '#ccfbf1' : '#e0f7fa',
                        padding: '0.85rem',
                        borderRadius: '14px',
                        color: isDossierRejete ? '#dc2626' : isDossierValide ? '#0f766e' : '#00b4d8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {isDossierRejete ? <XCircle size={28} /> : isDossierValide ? <CheckCircle2 size={28} /> : <FileText size={28} />}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0a3641' }}>
                          Demande {refFormatted}
                        </h2>
                        {getStatusBadge(selectedDemande.statut)}
                      </div>
                      <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0 0 0', display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                        <strong style={{ color: '#1e293b' }}>
                          {selectedDemande.etudiant_details?.nom} {selectedDemande.etudiant_details?.prenom}
                        </strong>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span>Matricule : <strong style={{ color: '#0a3641' }}>{selectedDemande.etudiant_details?.matricule || '-'}</strong></span>
                        <span style={{ color: '#cbd5e1' }}>•</span>
                        <span>{selectedDemande.etablissement_origine || selectedDemande.etudiant_details?.faculte || '-'}</span>
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginLeft: 'auto' }}>
                    <button
                      type="button"
                      onClick={() => exportFicheIndividuellePDF(selectedDemande)}
                      className="btn btn-outline"
                      title="Exporter la fiche d'instruction complète en PDF"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        padding: '0.5rem 0.85rem',
                        borderRadius: '10px',
                        backgroundColor: '#ffffff',
                        border: '1.5px solid #048b9a',
                        color: '#048b9a',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f0fdfa'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#ffffff'; }}
                    >
                      <Download size={15} />
                      <span>Fiche PDF</span>
                    </button>

                    {/* BOUTON FERMER À SA PLACE EN HAUT À DROITE */}
                    <button
                      type="button"
                      onClick={() => { setSelectedDemande(null); setShowRejectModal(false); }}
                      aria-label="Fermer la fenêtre"
                      title="Fermer (Échap)"
                      style={{
                        width: '2.5rem',
                        height: '2.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#64748b',
                        backgroundColor: '#f1f5f9',
                        border: '1px solid #e2e8f0',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = '#fee2e2';
                        e.currentTarget.style.borderColor = '#fca5a5';
                        e.currentTarget.style.color = '#b91c1c';
                        e.currentTarget.style.transform = 'scale(1.05)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#f1f5f9';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.color = '#64748b';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <X size={20} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* CORPS DE LA MODALE DÉFILANT EN TOUTE FLUIDITÉ                             */}
                {/* ========================================================================= */}
                <div style={{ padding: '1.75rem 2rem', overflowY: 'auto', flex: 1 }}>
                  
                  {/* Stepper de Progression du circuit */}
                  <div style={{ marginBottom: '1.5rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Parcours & Progression de la Demande
                      </h4>
                      <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                        Dépôt initial : {dateDemandeFormatted}
                      </span>
                    </div>
                    <StepperProgress currentStatut={selectedDemande.statut} />
                  </div>

                  {/* ========================================================================= */}
                  {/* OPTION A : VUE CONSULTATION ÉLÉGANTE (DEMANDES VALIDÉES & REJETÉES)       */}
                  {/* ========================================================================= */}
                  {isModeConsultation ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                      {/* --- HERO STATUS CARD : REJETÉE --- */}
                      {isDossierRejete && (
                        <div style={{
                          background: 'linear-gradient(135deg, #fff1f2 0%, #fee2e2 100%)',
                          border: '1.5px solid #fca5a5',
                          borderRadius: '16px',
                          padding: '1.4rem 1.6rem',
                          boxShadow: '0 4px 14px rgba(239, 68, 68, 0.08)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ backgroundColor: '#fee2e2', borderRadius: '50%', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <XCircle size={28} color="#b91c1c" />
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#991b1b' }}>
                                  Demande Rejetée par la Scolarité Centrale
                                </h4>
                                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: '#7f1d1d' }}>
                                  Ce dossier a été exclu du circuit de délivrance officielle
                                </p>
                              </div>
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#ffffff', color: '#991b1b', border: '1px solid #fecaca', padding: '0.35rem 0.75rem', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Calendar size={13} /> Rejeté le {dateRejetFormatted}
                            </span>
                          </div>

                          {/* Encadré officiel du motif de rejet */}
                          <div style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            border: '1.5px solid #fecaca',
                            padding: '1rem 1.25rem',
                            boxShadow: '0 2px 6px rgba(185, 28, 28, 0.04)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 800, color: '#b91c1c', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.45rem' }}>
                              <AlertTriangle size={15} /> Motif officiel du rejet notifié :
                            </div>
                            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#7f1d1d', fontStyle: 'italic', lineHeight: 1.5 }}>
                              « {motifRejet} »
                            </p>
                            <div style={{ marginTop: '0.75rem', paddingTop: '0.65rem', borderTop: '1px dashed #fee2e2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.78rem', color: '#94a3b8' }}>
                              <span>Intervenant : <strong style={{ color: '#475569' }}>{agentRejet}</strong></span>
                              <span style={{ color: '#ef4444', fontWeight: 600 }}>Dossier arrêté et archivé</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* --- HERO STATUS CARD : VALIDÉE --- */}
                      {isDossierValide && (
                        <div style={{
                          background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
                          border: '1.5px solid #86efac',
                          borderRadius: '16px',
                          padding: '1.4rem 1.6rem',
                          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.08)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div style={{ backgroundColor: '#dcfce7', borderRadius: '50%', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CheckCircle2 size={28} color="#15803d" />
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#166534' }}>
                                  Demande Validée et Certifiée Conforme
                                </h4>
                                <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.82rem', color: '#15803d' }}>
                                  Contrôle physique validé par la Scolarité Centrale &bull; Dossier éligible à la délivrance
                                </p>
                              </div>
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, backgroundColor: '#ffffff', color: '#166534', border: '1px solid #bbf7d0', padding: '0.35rem 0.75rem', borderRadius: '9999px', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Calendar size={13} /> Validé le {dateValidationFormatted}
                            </span>
                          </div>

                          {/* Statut d'acheminement et action de transmission */}
                          <div style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            border: '1px solid #bbf7d0',
                            padding: '1rem 1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '1rem'
                          }}>
                            <div>
                              <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Étape actuelle dans le circuit :</div>
                              <div style={{ marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                {getStatusBadge(selectedDemande.statut)}
                                <span style={{ fontSize: '0.84rem', color: '#334155' }}>
                                  {selectedDemande.date_transmission_chef ? (
                                    <>Transmis au Chef de service le <strong>{new Date(selectedDemande.date_transmission_chef).toLocaleDateString('fr-FR')}</strong></>
                                  ) : (
                                    <strong style={{ color: '#0f766e' }}>En attente de transmission au Chef de service</strong>
                                  )}
                                </span>
                              </div>
                            </div>

                            {/* Bouton pour transmettre immédiatement si encore en attente */}
                            {isScolariteCentrale && selectedDemande.statut === 'VALIDEE' && !selectedDemande.date_transmission_chef && (
                              <button
                                type="button"
                                onClick={() => handleExecuteAction('TRANSMETTRE_CHEF')}
                                disabled={submittingAction}
                                className="btn btn-primary"
                                style={{
                                  backgroundColor: '#0f766e',
                                  borderColor: '#0f766e',
                                  padding: '0.65rem 1.35rem',
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  borderRadius: '10px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.5rem',
                                  boxShadow: '0 4px 12px rgba(15, 118, 110, 0.25)'
                                }}
                              >
                                <Send size={16} /> {submittingAction ? 'Transmission...' : 'Transmettre au Chef de service'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* --- GRILLE DES INFORMATIONS DU DOSSIER : 2 CARTES ÉQUILIBRÉES --- */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                        
                        {/* CARTE 1 : INFORMATIONS ÉTUDIANT */}
                        <div style={{ background: '#ffffff', padding: '1.35rem 1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.92rem', fontWeight: 800, color: '#0a3641', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <User size={18} color="#048b9a" /> Informations Étudiant
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.88rem' }}>
                            <div><span style={{ color: '#64748b', fontWeight: 600 }}>Nom :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.nom}</strong></div>
                            <div><span style={{ color: '#64748b', fontWeight: 600 }}>Prénom(s) :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.prenom}</strong></div>
                            <div><span style={{ color: '#64748b', fontWeight: 600 }}>Matricule :</span> <span style={{ backgroundColor: '#e0f2fe', color: '#0a3641', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.82rem' }}>{selectedDemande.etudiant_details?.matricule}</span></div>
                            <div><span style={{ color: '#64748b', fontWeight: 600 }}>CIN :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.cin || '-'}</strong></div>
                            <div><span style={{ color: '#64748b', fontWeight: 600 }}>Né(e) le :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.date_naissance || '-'}</strong></div>
                            <div><span style={{ color: '#64748b', fontWeight: 600 }}>Lieu de naissance :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.lieu_naissance || 'Toliara'}</strong></div>
                            <div><span style={{ color: '#64748b', fontWeight: 600 }}>Établissement :</span> <strong style={{ color: '#0a3641' }}>{selectedDemande.etablissement_origine || selectedDemande.etudiant_details?.faculte}</strong></div>
                            <div><span style={{ color: '#64748b', fontWeight: 600 }}>Filière :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.filiere}</strong></div>
                          </div>
                        </div>

                        {/* CARTE 2 : CURSUS ET DIPLÔME VISÉ */}
                        <div style={{ background: '#ffffff', padding: '1.35rem 1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
                          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.92rem', fontWeight: 800, color: '#0a3641', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <GraduationCap size={18} color="#048b9a" /> Cursus & Diplôme Demandé
                          </h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', fontSize: '0.88rem' }}>
                            <div><span style={{ color: '#64748b', fontWeight: 600 }}>Diplôme demandé :</span> <strong style={{ color: '#0284c7' }}>{selectedDemande.type_diplome}</strong></div>
                            <div><span style={{ color: '#64748b', fontWeight: 600 }}>Niveau d'étude :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.niveau_etude || 'Master 2'}</strong></div>
                            <div><span style={{ color: '#64748b', fontWeight: 600 }}>Année universitaire :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.etudiant_details?.annee_universitaire || '2024-2025'}</strong></div>
                            <div><span style={{ color: '#64748b', fontWeight: 600 }}>Mention :</span> <strong style={{ color: '#0f172a' }}>{selectedDemande.diplome?.mention || selectedDemande.mention || 'Non renseignée'}</strong></div>
                            <div><span style={{ color: '#64748b', fontWeight: 600 }}>Titre / grade :</span> <strong style={{ color: '#0a3641' }}>Grade de {selectedDemande.type_diplome}</strong></div>
                            {selectedDemande.diplome && (
                              <>
                                <div><span style={{ color: '#64748b', fontWeight: 600 }}>N° Officiel :</span> <strong style={{ color: '#166534' }}>{selectedDemande.diplome.numero_diplome}</strong></div>
                                <div><span style={{ color: '#64748b', fontWeight: 600 }}>Code sécurité :</span> <code style={{ backgroundColor: '#f1f5f9', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}>{selectedDemande.diplome.code_verification}</code></div>
                              </>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* --- CONTRÔLE DE CONFORMITÉ DES PIÈCES ET ADMISSION (LECTURE SEULE CLAIRE) --- */}
                      <div style={{ background: '#f8fafc', padding: '1.35rem 1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: '#0a3641', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <ShieldCheck size={18} color="#048b9a" /> Contrôle d'authenticité & Pièces physiques
                          </h4>
                          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, backgroundColor: '#ffffff', padding: '0.25rem 0.65rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                            Rapport d'instruction du dossier physique
                          </span>
                        </div>

                        {/* 4 Pièces sous forme de badges statut clairs */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '10px', border: `1.5px solid ${selectedDemande.has_pv_soutenance !== false ? '#86efac' : '#fca5a5'}` }}>
                            {selectedDemande.has_pv_soutenance !== false ? <CheckCircle2 size={18} color="#166534" /> : <XCircle size={18} color="#dc2626" />}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>PV de soutenance</div>
                              <span style={{ fontSize: '0.74rem', color: selectedDemande.has_pv_soutenance !== false ? '#166534' : '#b91c1c', fontWeight: 600 }}>
                                {selectedDemande.has_pv_soutenance !== false ? 'Conforme et certifié' : 'Pièce manquante'}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '10px', border: `1.5px solid ${selectedDemande.has_releve_notes !== false ? '#86efac' : '#fca5a5'}` }}>
                            {selectedDemande.has_releve_notes !== false ? <CheckCircle2 size={18} color="#166534" /> : <XCircle size={18} color="#dc2626" />}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Relevé de notes officiel</div>
                              <span style={{ fontSize: '0.74rem', color: selectedDemande.has_releve_notes !== false ? '#166534' : '#b91c1c', fontWeight: 600 }}>
                                {selectedDemande.has_releve_notes !== false ? 'Authentifié aux archives' : 'Pièce manquante'}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '10px', border: `1.5px solid ${selectedDemande.has_certificat_scolarite !== false ? '#86efac' : '#fca5a5'}` }}>
                            {selectedDemande.has_certificat_scolarite !== false ? <CheckCircle2 size={18} color="#166534" /> : <XCircle size={18} color="#dc2626" />}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Certificat de scolarité</div>
                              <span style={{ fontSize: '0.74rem', color: selectedDemande.has_certificat_scolarite !== false ? '#166534' : '#b91c1c', fontWeight: 600 }}>
                                {selectedDemande.has_certificat_scolarite !== false ? 'Pièce conforme' : 'Pièce manquante'}
                              </span>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', background: '#ffffff', padding: '0.75rem 1rem', borderRadius: '10px', border: `1.5px solid ${selectedDemande.has_recu_bancaire !== false ? '#86efac' : '#fca5a5'}` }}>
                            {selectedDemande.has_recu_bancaire !== false ? <CheckCircle2 size={18} color="#166534" /> : <XCircle size={18} color="#dc2626" />}
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Reçu bancaire / Quittance</div>
                              <span style={{ fontSize: '0.74rem', color: selectedDemande.has_recu_bancaire !== false ? '#166534' : '#b91c1c', fontWeight: 600 }}>
                                {selectedDemande.has_recu_bancaire !== false ? 'Règlement acquitté' : 'Quittance manquante'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Délibérations officielles */}
                        <div style={{
                          backgroundColor: selectedDemande.admission_etudiant !== false ? '#f0fdf4' : '#fef2f2',
                          border: `1px solid ${selectedDemande.admission_etudiant !== false ? '#bbf7d0' : '#fecaca'}`,
                          borderRadius: '10px',
                          padding: '0.85rem 1.1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem'
                        }}>
                          {selectedDemande.admission_etudiant !== false ? (
                            <>
                              <CheckCircle2 size={18} color="#15803d" />
                              <span style={{ fontSize: '0.86rem', color: '#166534', fontWeight: 700 }}>
                                Délibération officielle : Étudiant confirmé <strong>ADMIS</strong> sur les listes officielles de jury.
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle size={18} color="#b91c1c" />
                              <span style={{ fontSize: '0.86rem', color: '#991b1b', fontWeight: 700 }}>
                                Délibération officielle : Étudiant déclaré <strong>NON ADMIS</strong> sur les listes officielles de délibération.
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                    </div>
                  ) : isScolariteCentrale ? (
                    /* ========================================================================= */
                    /* OPTION B : FORMULAIRE DE TRAITEMENT ACTIF (A_TRAITER SEULEMENT)           */
                    /* ========================================================================= */
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
                      </div>

                    </div>
                  ) : null}

                  {/* ========================================================================= */}
                  {/* ACTIONS CONTEXTUELLES HABILITÉES POUR LES AUTRES RÔLES                     */}
                  {/* ========================================================================= */}
                  {!isScolariteCentrale && (
                    <div style={{ marginTop: '1.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                      <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0a3641', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShieldCheck size={18} /> Actions Habilitées pour {ROLE_LABELS[user?.role]?.title || user?.role}
                      </h4>

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
                          <span style={{ fontSize: '0.82rem', color: '#64748b', alignSelf: 'center' }}>
                            Prenez d'abord le dossier en charge : vous pourrez ensuite l'envoyer à un imprimeur.
                          </span>
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
                            onClick={() => setActiveActionModal('CONFIER_TRANSMISSION_PRESIDENT')}
                            disabled={submittingAction}
                            className="btn btn-primary"
                            style={{ backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' }}
                          >
                            <Truck size={16} /> Confier à l'agent pour transmission à la Présidence
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
                            <Truck size={16} /> Acheminer en retour vers le Chef de service
                          </button>
                        </div>
                      )}

                      {/* PRÉSIDENCE : confirmation de la signature une fois le diplôme signé */}
                      {user?.role === 'PRESIDENCE' && selectedDemande.statut === 'EN_ATTENTE_SIGNATURE_PRESIDENT' && (
                        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => setActiveActionModal('SIGNER_PRESIDENT')}
                            disabled={submittingAction}
                            className="btn btn-primary"
                            style={{ backgroundColor: '#c0000c', borderColor: '#c0000c' }}
                          >
                            <PenTool size={16} /> J'ai signé ce diplôme
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
                  )}

                  {/* ========================================================================= */}
                  {/* HISTORIQUE ET AUDIT TRAIL COMPLET DE LA DEMANDE (LECTURE SEULE)            */}
                  {/* ========================================================================= */}
                  <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                    <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 800, color: '#0a3641', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <History size={18} color="#048b9a" /> Historique & Traçabilité de la Demande (Lecture Seule)
                    </h4>
                    {(!selectedDemande.historique || selectedDemande.historique.length === 0) ? (
                      <p style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '8px', textAlign: 'center' }}>
                        Aucun événement consigné dans l'historique pour le moment.
                      </p>
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
            </div>
          );
        })(),
        document.body
      )}
      </div>
    </AppLayout>
  );
};

export default Dashboard;
