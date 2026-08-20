import React, { useState, useEffect } from 'react';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../components/AuthContext';
import StepperProgress from '../components/StepperProgress';
import { demandesAPI } from '../services/api';
import {
  Printer,
  Award,
  Search,
  FileText,
  CheckCircle2,
  Clock,
  Eye,
  Download,
  X
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
  const [observationInput, setObservationInput] = useState('');
  const [mentionInput, setMentionInput] = useState('');
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
          const kpiRes = await demandesAPI.getKpiPresidence();
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

  const handleOpenModal = (demande) => {
    // L'historique complet est déjà inclus dans la demande (voir DemandeDiplomeSerializer).
    setSelectedDemande(demande);
  };

  const handlePasserEtape = async (demandeId, actionType) => {
    setSubmittingAction(true);
    try {
      await demandesAPI.passerEtape(demandeId, actionType, observationInput, mentionInput);
      showToast("L'étape du dossier a été mise à jour avec succès !", "success");
      setSelectedDemande(null);
      setObservationInput('');
      setMentionInput('');
      await fetchDemandesData();
    } catch (error) {
      console.error('Erreur lors du changement d\'étape:', error);
      showToast(error.response?.data?.error || "Erreur lors de la mise à jour du dossier.", "error");
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
      case 'DISPONIBLE': return <span className="badge badge-disponible">Disponible au Retrait</span>;
      case 'REFUSEE': return <span className="badge badge-refusee">Refusée</span>;
      default: return <span className="badge">{statut}</span>;
    }
  };

  const historiqueDemande = selectedDemande
    ? [...(selectedDemande.historique || [])].sort((a, b) => new Date(b.date_action) - new Date(a.date_action))
    : [];

  return (
    <AppLayout>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        
        {/* Toast Alert */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: toastMessage.type === 'success' ? '#10b981' : '#ef4444',
            color: '#ffffff',
            padding: '0.85rem 1.5rem',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 100,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <CheckCircle2 size={20} />
            <span>{toastMessage.msg}</span>
          </div>
        )}

        {/* Top Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c0000c', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Espace de Travail Administratif
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#070b19', marginTop: '0.2rem' }}>
              {user?.role === 'CHEF_SERVICE' && 'Vérification & Validation par le Chef de Service'}
              {user?.role === 'SCOLARITE_CENTRALE' && 'Préparation des Dossiers Académiques'}
              {user?.role === 'IMPRIMEUR' && 'File d\'Impression des Diplômes'}
              {user?.role === 'PRESIDENCE' && 'Tableau de Bord Stratégique & Signatures'}
            </h1>
          </div>

          {/* Search & Filter Inputs */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '260px' }}>
              <Search size={18} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Rechercher par matricule ou nom..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.85rem 0.6rem 2.35rem',
                  fontSize: '0.875rem',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>

            <select
              value={faculteFilter}
              onChange={(e) => setFaculteFilter(e.target.value)}
              style={{
                padding: '0.6rem 1rem',
                fontSize: '0.875rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#070b19',
                fontWeight: 500
              }}
            >
              <option value="">Toutes les facultés</option>
              <option value="Sciences et Technologies">Sciences et Technologies</option>
              <option value="Droit, Économie et Gestion">Droit, Économie et Gestion</option>
              <option value="Lettres et Sciences Humaines">Lettres et Sciences Humaines</option>
              <option value="Médecine et Pharmacie">Médecine et Pharmacie</option>
            </select>

            <select
              value={statutFilter}
              onChange={(e) => setStatutFilter(e.target.value)}
              style={{
                padding: '0.6rem 1rem',
                fontSize: '0.875rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#070b19',
                fontWeight: 500
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
          <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '2rem', backgroundColor: '#fff0ee', border: '1px solid #cbd5e1' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#070b19', color: '#fff', padding: '1rem', borderRadius: '12px' }}>
                <Clock size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Délai Moyen de Délivrance</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#070b19' }}>{presidenceKpi.delai_moyen_jours} Jours</h3>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#10b981', color: '#fff', padding: '1rem', borderRadius: '12px' }}>
                <Award size={24} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Diplômes Totalement Délivrés</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981' }}>{presidenceKpi.total_diplomes_delivres}</h3>
              </div>
            </div>
          </div>
        )}



        {/* DEMANDES TABLE / LIST */}
        <div className="card" style={{ borderRadius: '16px', overflow: 'hidden' }}>
          
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#070b19', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} color="#070b19" />
              <span>Liste des Dossiers de Diplômes</span>
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{demandes.length} résultat(s)</span>
              <button onClick={exportPDF} className="btn btn-outline" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', color: '#ef4444', borderColor: '#ef4444' }}>
                <Download size={16} /> PDF
              </button>
              <button onClick={exportExcel} className="btn btn-outline" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', color: '#10b981', borderColor: '#10b981' }}>
                <Download size={16} /> Excel
              </button>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              Chargement des dossiers en cours...
            </div>
          ) : demandes.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              Aucun dossier ne correspond à vos critères de recherche.
            </div>
          ) : (
            <>
            <p className="scroll-hint-mobile" style={{ display: 'none', fontSize: '0.75rem', color: '#94a3b8', padding: '0.75rem 1.25rem 0' }}>
              ← Faites glisser le tableau pour voir toutes les colonnes →
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Dossier</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Étudiant</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Faculté & Filière</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Type Diplôme</th>
                    <th style={{ padding: '0.85rem 1.25rem' }}>Étape / Statut</th>
                    <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {demandes.map((item) => {
                    const etu = item.etudiant_details || {};
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #e2e8f0', transition: 'background 0.15s' }} className="table-row-hover">
                        
                        <td style={{ padding: '1rem 1.25rem', fontWeight: 700, color: '#070b19' }}>
                          #{item.id}
                        </td>

                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{ fontWeight: 700, color: '#070b19', display: 'block' }}>{etu.nom} {etu.prenom}</span>
                          <span style={{ fontSize: '0.775rem', color: '#c0000c', fontWeight: 600 }}>{etu.matricule}</span>
                        </td>

                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{ display: 'block', fontWeight: 600, color: '#070b19' }}>{etu.faculte}</span>
                          <span style={{ fontSize: '0.775rem', color: '#64748b' }}>{etu.filiere}</span>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', fontWeight: 600, color: '#c0000c' }}>
                          {item.type_diplome}
                        </td>

                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                            {getStatusBadge(item.statut)}
                            <div style={{ width: '180px' }}>
                              <StepperProgress currentStatut={item.statut} />
                            </div>
                          </div>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <button
                            onClick={() => handleOpenModal(item)}
                            className="btn btn-outline"
                            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
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
            </>
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
            backgroundColor: 'rgba(7, 11, 25, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 80,
            padding: '1.5rem'
          }}>
            <div className="card animate-fade-in" style={{
              width: '100%',
              maxWidth: '650px',
              maxHeight: '90vh',
              overflowY: 'auto',
              borderRadius: '20px',
              padding: '2rem',
              backgroundColor: '#ffffff',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
            }}>
              
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c0000c', textTransform: 'uppercase' }}>
                    Fiche du Dossier #{selectedDemande.id}
                  </span>
                  <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#070b19' }}>
                    {selectedDemande.etudiant_details?.nom} {selectedDemande.etudiant_details?.prenom}
                  </h3>
                </div>
                <button
                  onClick={() => { setSelectedDemande(null); setObservationInput(''); setMentionInput(''); }}
                  style={{ padding: '0.5rem', borderRadius: '50%', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Circuit Stepper */}
              <div style={{ marginBottom: '1.5rem', backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#070b19', display: 'block', marginBottom: '0.5rem' }}>
                  Étape Actuelle dans le Circuit :
                </span>
                <StepperProgress currentStatut={selectedDemande.statut} />
              </div>

              {/* Student Details Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b', display: 'block' }}>Matricule</span>
                  <strong style={{ color: '#070b19' }}>{selectedDemande.etudiant_details?.matricule}</strong>
                </div>
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b', display: 'block' }}>CIN</span>
                  <strong style={{ color: '#070b19' }}>{selectedDemande.etudiant_details?.cin}</strong>
                </div>
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b', display: 'block' }}>Faculté</span>
                  <strong style={{ color: '#070b19' }}>{selectedDemande.etudiant_details?.faculte}</strong>
                </div>
                <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px' }}>
                  <span style={{ color: '#64748b', display: 'block' }}>Filière</span>
                  <strong style={{ color: '#070b19' }}>{selectedDemande.etudiant_details?.filiere}</strong>
                </div>
              </div>

              {/* Historique Timeline */}
              {historiqueDemande.length > 0 && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#070b19', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={18} />
                    <span>Historique du Dossier</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: '9px', width: '2px', backgroundColor: '#e2e8f0' }} />
                    {historiqueDemande.map((h, i) => (
                      <div key={h.id} style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: i === 0 ? '#10b981' : '#cbd5e1', border: '3px solid #f8fafc', flexShrink: 0 }} />
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '2rem' }}>
                            <span style={{ fontWeight: 600, color: '#070b19', fontSize: '0.85rem' }}>{h.action_realisee}</span>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{new Date(h.date_action).toLocaleString()}</span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '0.2rem' }}>Par: {h.utilisateur_details?.username} ({h.utilisateur_details?.role})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Observations / Comments */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#070b19', marginBottom: '0.5rem' }}>
                  Ajouter des Observations / Remarques de service :
                </label>
                <textarea
                  rows={3}
                  placeholder="Saisissez des précisions ou motifs d'avis de service..."
                  value={observationInput}
                  onChange={(e) => setObservationInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    fontSize: '0.875rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Diplôme déjà réservé (numéro/code assignés dès l'impression) */}
              {selectedDemande.diplome && (
                <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fff0ee', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <span style={{ fontSize: '0.775rem', fontWeight: 700, color: '#070b19', display: 'block', marginBottom: '0.35rem' }}>
                    Registre du diplôme
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#070b19' }}>
                    N° {selectedDemande.diplome.numero_diplome} — Code de vérification : {selectedDemande.diplome.code_verification}
                    {selectedDemande.diplome.mention && ` — Mention : ${selectedDemande.diplome.mention}`}
                  </span>
                </div>
              )}

              {/* Mention (Présidence, à la signature) */}
              {user?.role === 'PRESIDENCE' && selectedDemande.statut === 'IMPRIMEE' && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#070b19', marginBottom: '0.5rem' }}>
                    Mention (optionnel) :
                  </label>
                  <select
                    className="input-field"
                    value={mentionInput}
                    onChange={(e) => setMentionInput(e.target.value)}
                    style={{ width: '100%', padding: '0.65rem', fontSize: '0.875rem', borderRadius: '8px', border: '1.5px solid #cbd5e1' }}
                  >
                    <option value="">Aucune</option>
                    <option value="Passable">Passable</option>
                    <option value="Assez Bien">Assez Bien</option>
                    <option value="Bien">Bien</option>
                    <option value="Très Bien">Très Bien</option>
                    <option value="Excellent">Excellent</option>
                  </select>
                </div>
              )}

              {/* Role Specific Action Buttons */}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem', flexWrap: 'wrap' }}>

                {['RECUE', 'VERIFIEE_CHEF', 'SCOLARITE_PREPAREE', 'IMPRIMEE'].includes(selectedDemande.statut) && (
                  <button
                    type="button"
                    onClick={() => handlePasserEtape(selectedDemande.id, 'REFUSER')}
                    disabled={submittingAction}
                    className="btn btn-danger"
                  >
                    Refuser le Dossier
                  </button>
                )}

                {/* CHEF DE SERVICE ACTIONS */}
                {user?.role === 'CHEF_SERVICE' && selectedDemande.statut === 'RECUE' && (
                  <button
                    type="button"
                    onClick={() => handlePasserEtape(selectedDemande.id, 'VALIDER_CHEF')}
                    disabled={submittingAction}
                    className="btn btn-primary"
                  >
                    Valider & Transmettre à la Scolarité
                  </button>
                )}

                {/* SCOLARITE ACTIONS */}
                {user?.role === 'SCOLARITE_CENTRALE' && selectedDemande.statut === 'VERIFIEE_CHEF' && (
                  <button
                    type="button"
                    onClick={() => handlePasserEtape(selectedDemande.id, 'PREPARER_SCOLARITE')}
                    disabled={submittingAction}
                    className="btn btn-secondary"
                  >
                    Préparer & Transmettre à l'Imprimeur
                  </button>
                )}

                {/* IMPRIMEUR ACTIONS */}
                {user?.role === 'IMPRIMEUR' && selectedDemande.statut === 'SCOLARITE_PREPAREE' && (
                  <button
                    type="button"
                    onClick={() => handlePasserEtape(selectedDemande.id, 'IMPRIMER')}
                    disabled={submittingAction}
                    className="btn btn-primary"
                    style={{ backgroundColor: '#06b6d4' }}
                  >
                    <Printer size={18} />
                    <span>Confirmer l'Impression</span>
                  </button>
                )}

                {/* PRESIDENCE ACTIONS */}
                {user?.role === 'PRESIDENCE' && selectedDemande.statut === 'IMPRIMEE' && (
                  <button
                    type="button"
                    onClick={() => handlePasserEtape(selectedDemande.id, 'SIGNER')}
                    disabled={submittingAction}
                    className="btn btn-outline"
                  >
                    Signer le Diplôme
                  </button>
                )}
                {user?.role === 'PRESIDENCE' && selectedDemande.statut === 'SIGNEE' && (
                  <button
                    type="button"
                    onClick={() => handlePasserEtape(selectedDemande.id, 'DISPONIBLE')}
                    disabled={submittingAction}
                    className="btn btn-primary"
                    style={{ backgroundColor: '#10b981' }}
                  >
                    <Award size={18} />
                    <span>Marquer Disponible au Retrait (Public)</span>
                  </button>
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
