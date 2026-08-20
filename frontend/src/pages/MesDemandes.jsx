import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import AppLayout from '../components/AppLayout';
import StepperProgress from '../components/StepperProgress';
import { demandesAPI, etudiantsAPI } from '../services/api';
import { FileText, Plus, Download, User, Camera } from 'lucide-react';

const STATUT_LABELS = {
  RECUE: { label: 'Reçue / En examen', color: '#f59e0b', bg: '#fef3c7' },
  VERIFIEE_CHEF: { label: 'Validée par le Chef de Service', color: '#3b82f6', bg: '#dbeafe' },
  SCOLARITE_PREPAREE: { label: 'Préparée par la Scolarité', color: '#8b5cf6', bg: '#ede9fe' },
  IMPRIMEE: { label: 'Imprimée', color: '#06b6d4', bg: '#cffafe' },
  SIGNEE: { label: 'Signée par la Présidence', color: '#6366f1', bg: '#e0e7ff' },
  DISPONIBLE: { label: 'Disponible au retrait', color: '#10b981', bg: '#d1fae5' },
  REFUSEE: { label: 'Refusée', color: '#ef4444', bg: '#fee2e2' },
};

const genererCertificatPDF = async (demande) => {
  const diplome = demande.diplome;
  const etu = demande.etudiant_details;
  const verifUrl = `${window.location.origin}/verification?code=${diplome.code_verification}`;
  const qrDataUrl = await QRCode.toDataURL(verifUrl, { margin: 1, width: 220 });

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  doc.setDrawColor(10, 54, 65);
  doc.setLineWidth(2);
  doc.rect(8, 8, w - 16, h - 16);
  doc.setLineWidth(0.4);
  doc.rect(12, 12, w - 24, h - 24);

  doc.setTextColor(10, 54, 65);
  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text('UNIVERSITÉ DE TULÉAR', w / 2, 30, { align: 'center' });
  doc.setFont('times', 'normal');
  doc.setFontSize(13);
  doc.text('République de Madagascar', w / 2, 38, { align: 'center' });

  doc.setFont('times', 'bolditalic');
  doc.setFontSize(26);
  doc.text(demande.type_diplome, w / 2, 60, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(13);
  doc.text('décerné à', w / 2, 74, { align: 'center' });

  doc.setFont('times', 'bold');
  doc.setFontSize(22);
  doc.text(`${etu.nom} ${etu.prenom}`, w / 2, 86, { align: 'center' });

  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  doc.text(`Matricule : ${etu.matricule}   —   Filière : ${etu.filiere}`, w / 2, 95, { align: 'center' });
  if (diplome.mention) {
    doc.text(`Mention : ${diplome.mention}`, w / 2, 103, { align: 'center' });
  }

  doc.setFontSize(11);
  const dateDelivrance = diplome.date_delivrance
    ? new Date(diplome.date_delivrance).toLocaleDateString('fr-FR')
    : '—';
  doc.text(`Délivré le ${dateDelivrance}`, w / 2, 116, { align: 'center' });
  doc.text(`Numéro de diplôme : ${diplome.numero_diplome}`, w / 2, 123, { align: 'center' });

  doc.addImage(qrDataUrl, 'PNG', w - 48, h - 58, 32, 32);
  doc.setFontSize(8);
  doc.text('Scanner pour vérifier', w - 32, h - 23, { align: 'center' });
  doc.text(`Code : ${diplome.code_verification}`, w - 32, h - 19, { align: 'center' });

  doc.save(`Diplome_${etu.matricule}.pdf`);
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
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#070b19', margin: 0 }}>{d.type_diplome}</h3>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        Soumise le {new Date(d.date_demande).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <span style={{
                      padding: '0.3rem 0.85rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700,
                      color: conf.color, background: conf.bg
                    }}>
                      {conf.label}
                    </span>
                  </div>

                  <StepperProgress currentStatut={d.statut} />

                  {d.statut === 'REFUSEE' && d.observations && (
                    <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#991b1b', background: '#fee2e2', padding: '0.75rem', borderRadius: '8px' }}>
                      Motif : {d.observations}
                    </p>
                  )}

                  {d.statut === 'DISPONIBLE' && d.diplome && (
                    <div style={{
                      marginTop: '1.25rem', padding: '1rem', background: '#ecfdf5', border: '1px solid #a7f3d0',
                      borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
                    }}>
                      <div>
                        <strong style={{ color: '#065f46', display: 'block' }}>Votre diplôme est prêt !</strong>
                        <span style={{ fontSize: '0.8rem', color: '#065f46' }}>
                          N° {d.diplome.numero_diplome} — Code de vérification : {d.diplome.code_verification}
                        </span>
                      </div>
                      <button onClick={() => genererCertificatPDF(d)} className="btn btn-primary" style={{ backgroundColor: '#10b981' }}>
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
