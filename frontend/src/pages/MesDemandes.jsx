import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import QRCode from 'qrcode';
import AppLayout from '../components/AppLayout';
import StepperProgress from '../components/StepperProgress';
import { demandesAPI, etudiantsAPI } from '../services/api';
import { FileText, Plus, Download, User, Camera } from 'lucide-react';

const STATUT_LABELS = {
  EN_ATTENTE_VERIFICATION: { label: 'En attente de vérification', color: '#b45309', bg: '#fef3c7' },
  DOSSIER_INCOMPLET: { label: 'Dossier incomplet', color: '#c2410c', bg: '#ffedd5' },
  VALIDEE: { label: 'Validée par la Scolarité Centrale', color: '#0f766e', bg: '#ccfbf1' },
  EN_TRAITEMENT: { label: 'En traitement (Chef de Service)', color: '#1d4ed8', bg: '#dbeafe' },
  EN_ATTENTE_IMPRESSION: { label: 'Affectée à l\'imprimeur', color: '#0369a1', bg: '#e0f2fe' },
  EN_IMPRESSION: { label: 'En cours d\'impression', color: '#0891b2', bg: '#cffafe' },
  IMPRIME: { label: 'Diplôme imprimé', color: '#0d9488', bg: '#ccfbf1' },
  EN_TRANSMISSION_PRESIDENT: { label: 'En transmission Présidence', color: '#4338ca', bg: '#e0e7ff' },
  EN_ATTENTE_SIGNATURE_PRESIDENT: { label: 'En attente signature Présidence', color: '#6d28d9', bg: '#ede9fe' },
  SIGNE_PRESIDENT: { label: 'Signé par le Président', color: '#059669', bg: '#d1fae5' },
  RETOUR_SCOLARITE: { label: 'En retour vers la scolarité', color: '#0284c7', bg: '#e0f2fe' },
  DISPONIBLE: { label: 'Disponible au retrait', color: '#10b981', bg: '#d1fae5' },
  RETIRE: { label: 'Diplôme retiré', color: '#475569', bg: '#f1f5f9' },
  REFUSEE: { label: 'Demande refusée', color: '#b91c1c', bg: '#fee2e2' },
  RECUE: { label: 'Reçue / En examen', color: '#f59e0b', bg: '#fef3c7' }
};

// Génération du diplôme officiel certifié avec QR Code de vérification
const genererCertificatPDF = async (demande) => {
  try {
    const diplome = demande.diplome || {};
    const etu = demande.etudiant_details || {};
    const codeVerif = diplome.code_verification || `DEM-${demande.id}-${etu.matricule || 'TOL'}`;
    const verifUrl = `${window.location.origin}/verification?code=${codeVerif}`;
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(verifUrl, { margin: 1, width: 220 });
    } catch (e) {
      console.warn("QR code error:", e);
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    // Bordure décorative institutionnelle
    doc.setDrawColor(10, 54, 65);
    doc.setLineWidth(2);
    doc.rect(8, 8, w - 16, h - 16);
    doc.setLineWidth(0.4);
    doc.rect(12, 12, w - 24, h - 24);

    doc.setTextColor(10, 54, 65);
    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.text('UNIVERSITÉ DE TOLIARA', w / 2, 28, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.text('REPOBLIKAN\'I MADAGASIKARA • Tanindrazana - Fahafahana - Fandrosoana', w / 2, 35, { align: 'center' });
    doc.setFontSize(10.5);
    doc.text('Ministère de l\'Enseignement Supérieur et de la Recherche Scientifique', w / 2, 41, { align: 'center' });

    doc.setFont('times', 'bolditalic');
    doc.setFontSize(24);
    doc.setTextColor(4, 139, 154);
    doc.text(demande.type_diplome || 'DIPLÔME UNIVERSITAIRE', w / 2, 60, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(10, 54, 65);
    doc.text('Vu les procès-verbaux des délibérations, le présent diplôme est conféré à :', w / 2, 73, { align: 'center' });

    doc.setFont('times', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(10, 54, 65);
    doc.text(`${(etu.nom || '').toUpperCase()} ${etu.prenom || ''}`, w / 2, 86, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    const dateNaiss = etu.date_naissance ? new Date(etu.date_naissance).toLocaleDateString('fr-FR') : '—';
    doc.text(`Né(e) le : ${dateNaiss}   •   Matricule : ${etu.matricule || '—'}   •   CIN : ${etu.cin || '—'}`, w / 2, 95, { align: 'center' });
    doc.text(`Établissement / Faculté : ${demande.etablissement_origine || etu.faculte || '—'}   •   Filière : ${etu.filiere || '—'}`, w / 2, 103, { align: 'center' });

    if (diplome.mention || demande.mention) {
      doc.setFont('times', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(4, 139, 154);
      doc.text(`Mention : ${diplome.mention || demande.mention}`, w / 2, 112, { align: 'center' });
    }

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(51, 65, 85);
    const dateDelivrance = diplome.date_delivrance
      ? new Date(diplome.date_delivrance).toLocaleDateString('fr-FR')
      : new Date().toLocaleDateString('fr-FR');
    doc.text(`Fait à Toliara, le ${dateDelivrance}`, w / 2, 124, { align: 'center' });
    doc.text(`Numéro officiel du diplôme : ${diplome.numero_diplome || `UTOL-${new Date().getFullYear()}-${String(demande.id).padStart(4, '0')}`}`, w / 2, 131, { align: 'center' });

    // Sceau et signatures
    doc.setFontSize(9.5);
    doc.setFont('times', 'bold');
    doc.setTextColor(10, 54, 65);
    doc.text('Le Doyen / Directeur d\'Établissement', 35, 152);
    doc.text('Le Président de l\'Université', w - 85, 152);

    doc.setDrawColor(203, 213, 225);
    doc.rect(25, 156, 65, 26);
    doc.rect(w - 95, 156, 65, 26);

    doc.setFontSize(7.5);
    doc.setFont('times', 'italic');
    doc.setTextColor(148, 163, 184);
    doc.text('Signature & sceau de la faculté', 32, 180);
    doc.text('Grand sceau de l\'Université & signature', w - 90, 180);

    // QR Code
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', w / 2 - 14, 145, 28, 28);
      doc.setFontSize(8);
      doc.setFont('times', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('Vérification numérique en ligne', w / 2, 177, { align: 'center' });
      doc.text(`Code : ${codeVerif}`, w / 2, 181, { align: 'center' });
    }

    doc.save(`Diplome_${etu.matricule || demande.id}_${demande.type_diplome || 'Officiel'}.pdf`);
  } catch (err) {
    console.error("Erreur génération diplôme PDF:", err);
    alert("Une erreur est survenue lors de la création du diplôme en PDF.");
  }
};

// Génération du récépissé officiel de dépôt de demande (Attestation de dépôt)
const genererRecepissePDF = async (demande) => {
  try {
    const etu = demande.etudiant_details || {};
    const ref = `DEM-${String(demande.id).padStart(3, '0')}`;
    const codeVerif = demande.diplome?.code_verification || `DEM-${demande.id}-${etu.matricule || 'TOL'}`;
    const verifUrl = `${window.location.origin}/verification?code=${codeVerif}`;
    let qrDataUrl = '';
    try {
      qrDataUrl = await QRCode.toDataURL(verifUrl, { margin: 1, width: 200 });
    } catch (e) {
      console.warn("QR code error:", e);
    }

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const w = doc.internal.pageSize.getWidth();

    // En-tête
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(10, 54, 65);
    doc.text("UNIVERSITÉ DE TOLIARA", 14, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text("Direction de la Scolarité Centrale • Bureau des Diplômes", 14, 22);
    doc.text("Guichet Numérique des Requêtes Académiques", 14, 27);

    // Titre
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12.5);
    doc.setTextColor(4, 139, 154);
    doc.text("RÉCÉPISSÉ OFFICIEL DE DÉPÔT DE DEMANDE DE DIPLÔME", 14, 38);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    const dateDemande = demande.date_demande ? new Date(demande.date_demande).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR');
    doc.text(`Référence dossier : ${ref}   •   Date de soumission : ${dateDemande}`, 14, 46);
    doc.text(`Statut actuel du dossier : ${STATUT_LABELS[demande.statut]?.label || demande.statut_display || demande.statut}`, 14, 51);

    // Bloc demandeur
    doc.autoTable({
      startY: 57,
      theme: 'grid',
      head: [['INFORMATIONS DU DEMANDEUR', 'DÉTAILS ACADÉMIQUES & DIPLÔME']],
      headStyles: { fillColor: [10, 54, 65], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
      body: [
        [`Nom : ${(etu.nom || '').toUpperCase()}`, `Diplôme : ${demande.type_diplome || '—'}`],
        [`Prénoms : ${etu.prenom || '—'}`, `Faculté : ${demande.etablissement_origine || etu.faculte || '—'}`],
        [`N° Matricule : ${etu.matricule || '—'}`, `Filière : ${etu.filiere || '—'}`],
        [`CIN : ${etu.cin || '—'}`, `Année d'obtention : ${demande.annee_universitaire || '—'}`],
      ],
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2.8 }
    });

    // Pièces justificatives
    const tablePiecesY = (doc.lastAutoTable?.finalY || 100) + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(10, 54, 65);
    doc.text("CONTRÔLE DES PIÈCES JUSTIFICATIVES DÉPOSÉES :", 14, tablePiecesY);

    doc.autoTable({
      startY: tablePiecesY + 3,
      theme: 'striped',
      head: [['Pièce requise', 'État de conformité']],
      headStyles: { fillColor: [4, 139, 154], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      body: [
        ['1. Procès-Verbal (PV) de soutenance / délibération', demande.has_pv_soutenance !== false ? 'Dossier complet' : 'À compléter'],
        ['2. Relevé officiel de notes', demande.has_releve_notes !== false ? 'Dossier complet' : 'À compléter'],
        ['3. Certificat de scolarité', demande.has_certificat_scolarite !== false ? 'Dossier complet' : 'À compléter'],
        ['4. Reçu / Bordereau de versement bancaire', demande.has_recu_bancaire !== false ? 'Dossier complet' : 'À compléter'],
      ],
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2.5 }
    });

    // QR code et Visa
    const bottomY = (doc.lastAutoTable?.finalY || 160) + 8;
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, 'PNG', 14, bottomY, 26, 26);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 116, 139);
      doc.text("Scannez ce QR Code pour suivre", 43, bottomY + 10);
      doc.text("en direct l'avancement de votre dossier.", 43, bottomY + 15);
      doc.text(`Code : ${codeVerif}`, 43, bottomY + 20);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(10, 54, 65);
    doc.text("Pour la Scolarité Centrale (Visa & Cachet) :", w - 85, bottomY + 4);
    doc.setDrawColor(203, 213, 225);
    doc.rect(w - 85, bottomY + 7, 70, 24);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("Date et émargement de réception", w - 80, bottomY + 28);

    doc.save(`Recepisse_Demande_${ref}_${etu.matricule || 'Toliara'}.pdf`);
  } catch (err) {
    console.error("Erreur génération récépissé PDF:", err);
    alert("Une erreur est survenue lors de la création du récépissé en PDF.");
  }
};

const MesDemandes = () => {
  const [demandes, setDemandes] = useState([]);
  const [etudiant, setEtudiant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const navigate = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [demandesRes, etudiantRes] = await Promise.all([
        demandesAPI.getDemandes(),
        etudiantsAPI.getMine(),
      ]);
      setDemandes(demandesRes.data);
      setEtudiant(etudiantRes.data[0] || null);
    } catch (err) {
      console.error('Erreur de chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !etudiant) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await etudiantsAPI.updateMine(etudiant.id, formData);
      setEtudiant(res.data);
    } catch (err) {
      console.error('Erreur upload photo:', err);
      alert("Erreur lors de l'envoi de la photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  return (
    <AppLayout>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#070b19' }}>Mes demandes de diplôme</h1>
          <button onClick={() => navigate('/nouvelle-demande')} className="btn btn-primary">
            <Plus size={18} /> Nouvelle demande
          </button>
        </div>

        {etudiant && (
          <div className="card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden',
              background: '#fff0ee', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              {etudiant.photo ? (
                <img src={etudiant.photo} alt="Photo de profil" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <User size={28} color="#070b19" />
              )}
            </div>
            <div style={{ flex: '1 1 200px', minWidth: 0 }}>
              <strong style={{ color: '#070b19', display: 'block' }}>{etudiant.nom} {etudiant.prenom}</strong>
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                {etudiant.matricule} — {etudiant.faculte} / {etudiant.filiere}
              </span>
            </div>
            <label className="btn btn-outline" style={{ cursor: 'pointer', fontSize: '0.8rem', flexShrink: 0 }}>
              <Camera size={16} /> {uploadingPhoto ? 'Envoi...' : 'Changer la photo'}
              <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} style={{ display: 'none' }} />
            </label>
          </div>
        )}

        {loading ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Chargement...</div>
        ) : demandes.length === 0 ? (
          <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
            <FileText size={32} style={{ marginBottom: '0.75rem' }} />
            <p>Vous n'avez pas encore soumis de demande de diplôme.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {demandes.map((d) => {
              const conf = STATUT_LABELS[d.statut] || STATUT_LABELS.RECUE;
              return (
                <div key={d.id} className="card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#048b9a', backgroundColor: '#e0f7fa', padding: '0.15rem 0.55rem', borderRadius: '6px' }}>
                          DEM-{String(d.id).padStart(3, '0')}
                        </span>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#070b19', margin: 0 }}>{d.type_diplome}</h3>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Soumise le {new Date(d.date_demande).toLocaleDateString('fr-FR')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => genererRecepissePDF(d)}
                        className="btn btn-outline"
                        title="Télécharger le récépissé officiel de dépôt en PDF"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          padding: '0.4rem 0.75rem',
                          borderRadius: '8px',
                          color: '#0a3641',
                          borderColor: '#cbd5e1',
                          backgroundColor: '#ffffff',
                          cursor: 'pointer'
                        }}
                      >
                        <Download size={14} color="#048b9a" /> Récépissé PDF
                      </button>

                      <span style={{
                        padding: '0.3rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700,
                        color: conf.color, background: conf.bg
                      }}>
                        {conf.label}
                      </span>
                    </div>
                  </div>

                  <StepperProgress currentStatut={d.statut} />

                  {d.statut === 'REFUSEE' && d.observations && (
                    <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#991b1b', background: '#fee2e2', padding: '0.75rem', borderRadius: '8px' }}>
                      Motif : {d.observations}
                    </p>
                  )}

                  {(d.diplome || ['DISPONIBLE', 'SIGNE_PRESIDENT', 'RETOUR_SCOLARITE', 'RETIRE'].includes(d.statut)) && (
                    <div style={{
                      marginTop: '1.25rem', padding: '1.1rem 1.25rem', background: '#ecfdf5', border: '1.5px solid #a7f3d0',
                      borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
                      boxShadow: '0 2px 10px rgba(16, 185, 129, 0.08)'
                    }}>
                      <div>
                        <strong style={{ color: '#065f46', fontSize: '0.95rem', display: 'block' }}>Votre diplôme officiel est certifié et disponible !</strong>
                        <span style={{ fontSize: '0.82rem', color: '#047857' }}>
                          {d.diplome?.numero_diplome ? `N° ${d.diplome.numero_diplome} — Code de vérification : ${d.diplome.code_verification}` : 'Document académique officiel validé avec signature et grand sceau'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => genererCertificatPDF(d)}
                        className="btn btn-primary"
                        style={{
                          backgroundColor: '#10b981',
                          border: 'none',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.65rem 1.15rem',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <Download size={16} /> Télécharger mon diplôme (PDF)
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default MesDemandes;
