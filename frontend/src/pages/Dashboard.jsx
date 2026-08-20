import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../components/AuthContext';
import StepperProgress from '../components/StepperProgress';
import { demandesAPI } from '../services/api';
import { 
  CheckSquare, 
  XSquare, 
  Printer, 
  Award, 
  Search, 
  Filter, 
  FileText, 
  UserCheck, 
  BarChart2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  Eye, 
  MessageSquare,
  Sparkles,
  Send,
  Users,
  Download
} from 'lucide-react';
import StatCards from '../components/StatCards';
import DashboardCharts from '../components/DashboardCharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Dashboard = () => {
  const { user } = useAuth();
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState('');
  const [faculteFilter, setFaculteFilter] = useState('');
  const [stats, setStats] = useState(null);
  const [presidenceKpi, setPresidenceKpi] = useState(null);
  
  // Modal state
  const [selectedDemande, setSelectedDemande] = useState(null);
  const [historiqueDemande, setHistoriqueDemande] = useState([]);
  const [observationInput, setObservationInput] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchDemandesData = async () => {
    setLoading(true);
    try {
      const res = await demandesAPI.getDemandes({
        search: searchTerm,
        statut: statutFilter,
        faculte: faculteFilter
      });
      setDemandes(res.data);

      const statsRes = await demandesAPI.getStatsOverview();
      setStats(statsRes.data);

      if (user?.role === 'PRESIDENCE') {
        try {
          const kpiRes = await demandesAPI.get('demandes/kpi_presidence/');
          setPresidenceKpi(kpiRes.data);
        } catch (e) {
          console.error('KPI error', e);
        }
      }
    } catch (error) {
      console.error('Erreur de chargement des demandes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDemandesData();
  }, [searchTerm, statutFilter, faculteFilter, user]);

  const exportExcel = () => {
    const dataToExport = demandes.map(d => ({
      ID: d.id,
      Matricule: d.etudiant_details?.matricule,
      Nom: d.etudiant_details?.nom,
      Prénom: d.etudiant_details?.prenom,
      Faculté: d.etudiant_details?.faculte,
      Filière: d.etudiant_details?.filiere,
      Statut: d.statut
    }));
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dossiers");
    XLSX.writeFile(wb, "Dossiers_Diplomes.xlsx");
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Rapport des Dossiers de Diplômes", 14, 15);
    const tableColumn = ["ID", "Matricule", "Étudiant", "Faculté", "Filière", "Statut"];
    const tableRows = demandes.map(d => [
      d.id,
      d.etudiant_details?.matricule,
      `${d.etudiant_details?.nom} ${d.etudiant_details?.prenom}`,
      d.etudiant_details?.faculte,
      d.etudiant_details?.filiere,
      d.statut
    ]);
    doc.autoTable({ head: [tableColumn], body: tableRows, startY: 20 });
    doc.save("Dossiers_Diplomes.pdf");
  };

  const showToast = (msg, type = 'success') => {
    setToastMessage({ msg, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchHistorique = async (demandeId) => {
    try {
      const res = await demandesAPI.get(`historique/?demande=${demandeId}`);
      setHistoriqueDemande(res.data || []);
    } catch (e) {
      console.error('Erreur historique', e);
    }
  };

  const handleOpenModal = (demande) => {
    setSelectedDemande(demande);
    setHistoriqueDemande([]);
    fetchHistorique(demande.id);
  };

  const handlePasserEtape = async (demandeId, actionType) => {
    setSubmittingAction(true);
    try {
      await demandesAPI.passerEtape(demandeId, actionType, observationInput);
      showToast("L'étape du dossier a été mise à jour avec succès !", "success");
      setSelectedDemande(null);
      setObservationInput('');
      await fetchDemandesData();
    } catch (error) {
      console.error('Erreur lors du changement d\'étape:', error);
      showToast("Erreur lors de la mise à jour du dossier.", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  const getStatusBadge = (statut) => {
    switch (statut) {
      case 'RECUE': return <span className="badge badge-recue">Reçue (Chef)</span>;
      case 'VERIFIEE_CHEF': return <span className="badge badge-verifiee">Validée Chef</span>;
      case 'SCOLARITE_PREPAREE': return <span className="badge badge-preparee">Préparée Scolarité</span>;
      case 'IMPRIMEE': return <span className="badge badge-imprimee">Imprimée</span>;
      case 'SIGNEE': return <span className="badge badge-verifiee">Signée Présidence</span>;
      case 'DISPONIBLE': return <span className="badge badge-disponibile">Disponible au Retrait</span>;
      case 'REFUSEE': return <span className="badge badge-refusee">Refusée</span>;
      default: return <span className="badge">{statut}</span>;
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }} className="animate-fade-in">
        
        {/* Toast Alert */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            padding: '1rem 1.75rem',
            borderRadius: '14px',
            boxShadow: '0 15px 35px rgba(5, 30, 36, 0.25)',
            zIndex: 100,
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1d70b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Espace de Travail Administratif
            </span>
            <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#0a3641', marginTop: '0.2rem', letterSpacing: '-0.02em' }}>
              {user?.role === 'CHEF_SERVICE' && 'Vérification & Validation par le Chef de Service'}
              {user?.role === 'SCOLARITE_CENTRALE' && 'Préparation des Dossiers Académiques'}
              {user?.role === 'IMPRIMEE' || user?.role === 'IMPRIMEUR' ? 'File d\'Impression des Diplômes' : ''}
              {user?.role === 'PRESIDENCE' && 'Tableau de Bord Stratégique & Signatures'}
            </h1>
          </div>

          {/* Search & Filter Inputs */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Rechercher par matricule ou nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.85rem 0.65rem 2.5rem',
                  fontSize: '0.875rem',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  transition: 'all 0.2s ease'
                }}
              />
            </div>

            <select
              value={faculteFilter}
              onChange={(e) => setFaculteFilter(e.target.value)}
              style={{
                padding: '0.65rem 1rem',
                fontSize: '0.875rem',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#0a3641',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <option value="">Toutes les facultés</option>
              <option value="Sciences et Technologies">Sciences & Tech</option>
              <option value="Droit, Économie et Gestion">Droit, Éco & Gestion</option>
              <option value="Lettres et Sciences Humaines">Lettres & SH</option>
              <option value="Médecine et Pharmacie">Médecine & Pharmacie</option>
            </select>

            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value)}
              style={{
                padding: '0.65rem 1rem',
                fontSize: '0.875rem',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                backgroundColor: '#ffffff',
                color: '#0a3641',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <option value="">Tous les statuts</option>
              <option value="RECUE">Reçues (Chef)</option>
              <option value="VERIFIEE_CHEF">Validées Chef</option>
              <option value="SCOLARITE_PREPAREE">Préparées Scolarité</option>
              <option value="IMPRIMEE">Imprimées</option>
              <option value="SIGNEE">Signées</option>
              <option value="DISPONIBLE">Disponibles au retrait</option>
              <option value="REFUSEE">Refusées</option>
            </select>
          </div>
        </div>

        {/* Global Dashboard Stats & Charts */}
        <StatCards stats={stats} />
        
        {/* Afficher les graphiques uniquement pour la Présidence ou les Chefs */}
        {(user?.role === 'PRESIDENCE' || user?.role === 'CHEF_SERVICE') && (
          <DashboardCharts stats={stats} />
        )}

        {/* PRESIDENCE EXECUTIVE KPI */}
        {user?.role === 'PRESIDENCE' && presidenceKpi && (
          <div className="card animate-fade-in" style={{ padding: '1.75rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2.5rem', backgroundColor: 'var(--primary-petrol-subtle)', border: '1px solid rgba(10, 54, 65, 0.12)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ background: '#0a3641', color: '#fff', padding: '1.1rem', borderRadius: '14px', boxShadow: '0 4px 12px rgba(10,54,65,0.2)' }}>
                <Clock size={26} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Délai Moyen de Délivrance</span>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0a3641', marginTop: '0.1rem' }}>{presidenceKpi.delai_moyen_jours} Jours</h3>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ background: '#10b981', color: '#fff', padding: '1.1rem', borderRadius: '14px', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
                <Award size={26} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Diplômes Totalement Délivrés</span>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.1rem' }}>{presidenceKpi.total_diplomes_delivres}</h3>
              </div>
            </div>
          </div>
        )}

        {/* DEMANDES TABLE / LIST */}
        <div className="card" style={{ borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: 'var(--shadow-md)', marginBottom: '3rem' }}>
          
          <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0a3641', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FileText size={22} color="#0a3641" />
              <span>Liste des Dossiers de Diplômes</span>
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 700 }}>{demandes.length} résultat(s)</span>
              <button onClick={exportPDF} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#ef4444', borderColor: '#fee2e2', backgroundColor: '#fff5f5' }}>
                <Download size={16} /> PDF
              </button>
              <button onClick={exportExcel} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', color: '#10b981', borderColor: '#d1fae5', backgroundColor: '#f0fdf4' }}>
                <Download size={16} /> Excel
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b', fontWeight: 500 }}>
              <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#0a3641', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 1.25rem' }} />
              <span>Chargement des dossiers en cours...</span>
            </div>
          ) : demandes.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center', color: '#94a3b8', fontWeight: 500 }}>
              Aucun dossier ne correspond à vos critères de recherche.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    <th style={{ padding: '1.1rem 1.5rem' }}>Dossier</th>
                    <th style={{ padding: '1.1rem 1.5rem' }}>Étudiant</th>
                    <th style={{ padding: '1.1rem 1.5rem' }}>Faculté & Filière</th>
                    <th style={{ padding: '1.1rem 1.5rem' }}>Type Diplôme</th>
                    <th style={{ padding: '1.1rem 1.5rem' }}>Étape / Statut</th>
                    <th style={{ padding: '1.1rem 1.5rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {demandes.map((item) => {
                    const etu = item.etudiant_details || {};
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.2s' }} className="table-row-hover">
                        
                        <td style={{ padding: '1.25rem 1.5rem', fontWeight: 800, color: '#0a3641' }}>
                          #{item.id}
                        </td>

                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <span style={{ fontWeight: 800, color: '#0a3641', display: 'block', fontSize: '0.925rem' }}>{etu.nom} {etu.prenom}</span>
                          <span style={{ fontSize: '0.775rem', color: '#1d70b8', fontWeight: 700, letterSpacing: '0.02em' }}>{etu.matricule}</span>
                        </td>

                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <span style={{ display: 'block', fontWeight: 700, color: '#0a3641' }}>{etu.faculte}</span>
                          <span style={{ fontSize: '0.775rem', color: '#64748b', fontWeight: 500 }}>{etu.filiere}</span>
                        </td>

                        <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: '#1d70b8' }}>
                          {item.type_diplome}
                        </td>

                        <td style={{ padding: '1.25rem 1.5rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                            <div>{getStatusBadge(item.statut)}</div>
                            <div style={{ width: '190px' }}>
                              <StepperProgress currentStatut={item.statut} />
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '1.25rem 1.5rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="btn btn-outline"
                            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '10px' }}
                          >
                            <Eye size={16} />
                            <span>Traiter</span>
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* MODAL DETAILED FOLDER WORKFLOW PROCESSOR */}
        {selectedDemande && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(5, 30, 36, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80,
            padding: '1.5rem',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div className="card" style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '24px',
              padding: '2.25rem',
              backgroundColor: '#ffffff',
              boxShadow: 'var(--shadow-xl)',
              border: '1px solid rgba(255,255,255,0.8)'
            }}>
              
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#1d70b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Fiche du Dossier #{selectedDemande.id}
                  </span>
                  <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0a3641', marginTop: '0.1rem', letterSpacing: '-0.02em' }}>
                    {selectedDemande.etudiant_details?.nom} {selectedDemande.etudiant_details?.prenom}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedDemande(null)}
                  style={{ padding: '0.5rem', borderRadius: '50%', color: '#64748b', fontSize: '1.35rem', fontWeight: 800, cursor: 'pointer', transition: 'var(--transition-smooth)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  ✕
                </button>
              </div>

              {/* Circuit Stepper */}
              <div style={{ marginBottom: '1.75rem', backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0a3641', display: 'block', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Étape Actuelle dans le Circuit :
                </span>
                <StepperProgress currentStatut={selectedDemande.statut} />
              </div>

              {/* Student Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem', marginBottom: '1.75rem' }}>
                <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Matricule</span>
                  <strong style={{ color: '#0a3641', fontSize: '0.95rem' }}>{selectedDemande.etudiant_details?.matricule}</strong>
                </div>
                <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>CIN</span>
                  <strong style={{ color: '#0a3641', fontSize: '0.95rem' }}>{selectedDemande.etudiant_details?.cin}</strong>
                </div>
                <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Faculté</span>
                  <strong style={{ color: '#0a3641', fontSize: '0.95rem' }}>{selectedDemande.etudiant_details?.faculte}</strong>
                </div>
                <div style={{ padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em' }}>Filière</span>
                  <strong style={{ color: '#0a3641', fontSize: '0.95rem' }}>{selectedDemande.etudiant_details?.filiere}</strong>
                </div>
              </div>

              {/* Historique Timeline */}
              {historiqueDemande.length > 0 && (
                <div style={{ marginBottom: '1.75rem', padding: '1.25rem', background: '#f8fafc', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0a3641', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={18} />
                    <span>Historique du Dossier</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: '9px', width: '2px', backgroundColor: '#e2e8f0' }} />
                    {historiqueDemande.map((h, i) => (
                      <div key={h.id} style={{ display: 'flex', gap: '1.25rem', position: 'relative', zIndex: 1 }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: i === 0 ? '#10b981' : '#cbd5e1', border: '4px solid #f8fafc', flexShrink: 0, boxShadow: '0 0 0 2px rgba(226, 232, 240, 0.5)' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: 700, color: '#0a3641', fontSize: '0.875rem' }}>{h.action}</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>{new Date(h.date_action).toLocaleString()}</span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.1rem', fontWeight: 500 }}>Par: {h.utilisateur_details?.username} ({h.utilisateur_details?.role})</span>
                          {h.observation && (
                            <p style={{ fontSize: '0.8rem', color: '#475569', marginTop: '0.5rem', padding: '0.6rem 0.85rem', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', fontStyle: 'italic' }}>
                              "{h.observation}"
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observations / Comments */}
              <div style={{ marginBottom: '1.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#0a3641', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.02em' }}>
                  Ajouter des Observations / Remarques :
                </label>
                <textarea
                  rows={3}
                  placeholder="Saisissez des précisions ou motifs d'avis de service..."
                  value={observationInput}
                  onChange={(e) => setObservationInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    fontSize: '0.875rem',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    transition: 'all 0.2s ease'
                  }}
                />
              </div>

              {/* Role Specific Action Buttons */}
              <div style={{ display: 'flex', gap: '0.85rem', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', flexWrap: 'wrap' }}>
                
                <button
                  type="button"
                  onClick={() => handlePasserEtape(selectedDemande.id, 'REFUSER')}
                  disabled={submittingAction}
                  className="btn btn-danger"
                  style={{ borderRadius: '10px' }}
                >
                  Refuser le Dossier
                </button>

                {/* CHEF DE SERVICE ACTIONS */}
                {user?.role === 'CHEF_SERVICE' && selectedDemande.statut === 'RECUE' && (
                  <button
                    type="button"
                    onClick={() => handlePasserEtape(selectedDemande.id, 'VALIDER_CHEF')}
                    disabled={submittingAction}
                    className="btn btn-primary"
                    style={{ borderRadius: '10px' }}
                  >
                    Valider & Transmettre à la Scolarité
                  </button>
                )}

                {/* SCOLARITE ACTIONS */}
                {user?.role === 'SCOLARITE_CENTRALE' && (selectedDemande.statut === 'VERIFIEE_CHEF' || selectedDemande.statut === 'RECUE') && (
                  <button
                    type="button"
                    onClick={() => handlePasserEtape(selectedDemande.id, 'PREPARER_SCOLARITE')}
                    disabled={submittingAction}
                    className="btn btn-secondary"
                    style={{ borderRadius: '10px' }}
                  >
                    Préparer & Transmettre à l'Imprimeur
                  </button>
                )}

                {/* IMPRIMEUR ACTIONS */}
                {(user?.role === 'IMPRIMEUR' || user?.role === 'IMPRIMEE') && (
                  <button
                    type="button"
                    onClick={() => handlePasserEtape(selectedDemande.id, 'IMPRIMER')}
                    disabled={submittingAction}
                    className="btn btn-primary"
                    style={{ backgroundColor: '#06b6d4', borderRadius: '10px' }}
                  >
                    <Printer size={18} />
                    <span>Confirmer l'Impression</span>
                  </button>
                )}

                {/* PRESIDENCE ACTIONS */}
                {user?.role === 'PRESIDENCE' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePasserEtape(selectedDemande.id, 'SIGNER')}
                      disabled={submittingAction}
                      className="btn btn-outline"
                      style={{ borderRadius: '10px' }}
                    >
                      Signer le Diplôme
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePasserEtape(selectedDemande.id, 'DISPONIBLE')}
                      disabled={submittingAction}
                      className="btn btn-primary"
                      style={{ backgroundColor: '#10b981', borderRadius: '10px' }}
                    >
                      <Award size={18} />
                      <span>Marquer Disponible au Retrait (Public)</span>
                    </button>
                  </>
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
