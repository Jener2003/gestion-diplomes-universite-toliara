import React, { useEffect, useMemo, useState } from 'react';
import { Archive, Search, Eye, X, History, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable, { applyPlugin } from 'jspdf-autotable';

try {
  applyPlugin(jsPDF);
} catch (e) {
  // autoTable fallback
}
import AppLayout from '../components/AppLayout';
import { demandesAPI } from '../services/api';

const PAGE_SIZE = 10;
const STATUS_LABELS = {
  VALIDEE: 'Validée, en attente de prise en charge',
  EN_TRAITEMENT: 'En traitement',
  EN_ATTENTE_IMPRESSION: 'En attente d’impression',
  EN_IMPRESSION: 'En impression',
  IMPRIME: 'Imprimé',
  EN_TRANSMISSION_PRESIDENT: 'Transmission Présidence',
  EN_ATTENTE_SIGNATURE_PRESIDENT: 'En attente de signature',
  SIGNE_PRESIDENT: 'Signé par la Présidence',
  RETOUR_SCOLARITE: 'En retour vers le Chef de service',
  REFUSEE: 'Refusée',
};

const Archives = () => {
  const [demandes, setDemandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    let active = true;
    const refresh = () => demandesAPI.getArchives()
      .then(({ data }) => {
        if (!active) return;
        const rows = Array.isArray(data) ? data : data.results || [];
        setDemandes(rows);
        setSelected((current) => current ? rows.find((row) => row.id === current.id) || current : null);
        setError('');
      })
      .catch(() => { if (active) setError('Impossible de charger les archives. Réessayez dans quelques instants.'); })
      .finally(() => { if (active) setLoading(false); });
    const refreshWhenVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    refresh();
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refreshWhenVisible);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, []);

  const filtered = useMemo(() => demandes.filter((d) => {
    const student = d.etudiant_details || {};
    const needle = search.trim().toLowerCase();
    const ref = `dem-${String(d.id).padStart(3, '0')}`;
    const refNeedle = needle.replace(/^dem-?0*/, '');
    const matchesSearch = !needle || ref.includes(needle) || String(d.id) === refNeedle || [student.matricule, student.nom, student.prenom,
      d.etablissement_origine, student.faculte, d.type_diplome]
      .some((value) => String(value || '').toLowerCase().includes(needle));
    return matchesSearch && (!statusFilter || d.statut === statusFilter);
  }), [demandes, search, statusFilter]);

  const selectedVisible = filtered.filter((d) => selectedIds.includes(d.id));

  useEffect(() => setPage(1), [search, statusFilter]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Gestion des cases à cocher pour sélection personnalisée
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const allFilteredIds = filtered.map((d) => d.id);
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(allFilteredIds);
    }
  };

  // Export officiel en PDF avec téléchargement immédiat
  const exportPDF = (customList = null) => {
    const targetDemandes = customList || (selectedVisible.length > 0 ? selectedVisible : filtered);

    if (targetDemandes.length === 0) {
      alert("Aucun dossier archivé sélectionné à exporter.");
      return;
    }

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const isSingle = targetDemandes.length === 1;

      // En-tête officiel de l'Université
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(10, 54, 65);
      doc.text("UNIVERSITÉ DE TOLIARA", 14, 15);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Direction de la Scolarité Centrale • Rectorat", 14, 21);
      doc.text("Système Numérique de Gestion & Délivrance des Diplômes", 14, 26);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12.5);
      doc.setTextColor(4, 139, 154);
      doc.text(
        isSingle
          ? "REGISTRE DES ARCHIVES — BORDEREAU DE TRANSMISSION DU DOSSIER"
          : "REGISTRE DES ARCHIVES — DOSSIERS TRANSMIS AU CHEF DE SERVICE",
        14,
        35
      );

      // Métadonnées
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);
      const dateStr = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      doc.text(`Date d'émission : ${dateStr}`, 14, 42);
      doc.text(
        `Nombre de dossiers : ${targetDemandes.length}${!customList && selectedVisible.length > 0 ? ' (sélection personnalisée par cases cochées)' : ''}`,
        14,
        47
      );
      doc.text(`Destinataire : Chef de Service des Diplômes (Suivi, tirage et traçabilité)`, 14, 52);

      const tableColumn = [
        "N°",
        "Réf. Dossier",
        "Matricule",
        "Nom & Prénoms de l'Étudiant",
        "Établissement / Faculté",
        "Diplôme Demandé",
        "Transmis le",
        "État Actuel",
        "Émargement"
      ];

      const tableRows = targetDemandes.map((d, index) => {
        const student = d.etudiant_details || {};
        const dateTransmis = d.date_transmission_chef
          ? new Date(d.date_transmission_chef).toLocaleDateString('fr-FR')
          : (d.date_demande ? new Date(d.date_demande).toLocaleDateString('fr-FR') : '—');
        const statutLabel = STATUS_LABELS[d.statut] || d.statut_display || d.statut;

        return [
          index + 1,
          `DEM-${String(d.id).padStart(3, '0')}`,
          student.matricule || '—',
          `${(student.nom || '').toUpperCase()} ${student.prenom || ''}`,
          d.etablissement_origine || student.faculte || '—',
          d.type_diplome || '—',
          dateTransmis,
          statutLabel,
          ""
        ];
      });

      const tableOptions = {
        head: [tableColumn],
        body: tableRows,
        startY: 57,
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
          1: { halign: 'center', cellWidth: 24, fontStyle: 'bold' },
          2: { halign: 'center', cellWidth: 22 },
          3: { cellWidth: 50 },
          4: { cellWidth: 44 },
          5: { cellWidth: 35 },
          6: { halign: 'center', cellWidth: 25 },
          7: { halign: 'center', cellWidth: 32 },
          8: { cellWidth: 26 }
        },
        didDrawPage: () => {
          const str = `Page ${doc.internal.getNumberOfPages()}`;
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          doc.text(str, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
        }
      };

      if (typeof doc.autoTable === 'function') {
        doc.autoTable(tableOptions);
      } else if (typeof autoTable === 'function') {
        autoTable(doc, tableOptions);
      }

      // Blocs de signatures officiels
      let finalY = (doc.lastAutoTable?.finalY || 100) + 10;
      if (finalY > 175) {
        doc.addPage();
        finalY = 20;
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(10, 54, 65);
      doc.text("Pour la Scolarité Centrale (Visa) :", 20, finalY);
      doc.text("Pour le Chef de Service des Diplômes :", 175, finalY);

      doc.setDrawColor(203, 213, 225);
      doc.rect(20, finalY + 4, 90, 22);
      doc.rect(175, finalY + 4, 90, 22);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text("Date, visa et sceau officiel", 24, finalY + 23);
      doc.text("Date, signature et cachet", 179, finalY + 23);

      const todayStr = new Date().toISOString().slice(0, 10);
      const filename = isSingle
        ? `Archive_DEM-${String(targetDemandes[0].id).padStart(3, '0')}_${targetDemandes[0].etudiant_details?.matricule || 'Toliara'}.pdf`
        : `Archives_Transmises_ChefService_${todayStr}.pdf`;

      // Déclenchement garanti du téléchargement immédiat
      try {
        doc.save(filename);
      } catch (saveErr) {
        console.warn("doc.save fallback blob:", saveErr);
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 150);
      }
    } catch (err) {
      console.error("Erreur génération PDF:", err);
      alert("Une erreur est survenue lors de l'export PDF : " + (err.message || ''));
    }
  };

  const cell = { padding: '0.9rem 1rem', borderBottom: '1px solid #edf2f7', color: '#334155', whiteSpace: 'nowrap' };
  const badge = (status) => <span style={{ padding: '0.3rem 0.65rem', borderRadius: 99, background: '#e0f7fa', color: '#0a5964', fontSize: '0.76rem', fontWeight: 700 }}>{STATUS_LABELS[status] || status}</span>;

  return (
    <AppLayout>
      <div style={{ maxWidth: 1440, margin: '0 auto' }}>
        
        {/* Titre et Bouton Exporter PDF */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', color: '#0a3641' }}>
              <Archive size={24} color="#1d70b8" />
              <h1 style={{ margin: 0, fontSize: '1.65rem' }}>Archives des demandes transmises</h1>
            </div>
            <p style={{ color: '#64748b', margin: '0.55rem 0 0' }}>
              Dossiers validés par la Scolarité Centrale et transmis au Chef de service des diplômes.
            </p>
          </div>

          <button
            onClick={() => exportPDF()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.55rem',
              backgroundColor: '#048b9a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '0.7rem 1.25rem',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(4, 139, 154, 0.25)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#036976'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#048b9a'; e.currentTarget.style.transform = 'none'; }}
          >
            <Download size={18} />
            <span>
              Exporter en PDF {selectedVisible.length > 0 ? `(${selectedVisible.length} sélectionné${selectedVisible.length > 1 ? 's' : ''})` : `(${filtered.length})`}
            </span>
          </button>
        </div>

        <section style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,.03)' }}>
          {/* Barre supérieure avec compteurs et filtres */}
          <div style={{ padding: '1rem 1.15rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <strong style={{ color: '#0a3641' }}>
                {filtered.length} dossier{filtered.length === 1 ? '' : 's'} archivé{filtered.length === 1 ? '' : 's'}
              </strong>
              {selectedVisible.length > 0 && (
                <span style={{ fontSize: '0.78rem', color: '#048b9a', fontWeight: 700, backgroundColor: '#ccfbf1', padding: '0.2rem 0.65rem', borderRadius: 99, border: '1px solid #99f6e4' }}>
                  {selectedVisible.length} coché{selectedVisible.length > 1 ? 's' : ''} pour l'export
                </span>
              )}
              {selectedVisible.length > 0 && (
                <button
                  onClick={() => setSelectedIds([])}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Effacer la sélection
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', flex: '1 1 420px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <label style={{ position: 'relative', flex: '1 1 260px', maxWidth: 420 }}>
                <Search size={17} style={{ position: 'absolute', left: 11, top: 11, color: '#94a3b8' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Référence, matricule, étudiant..."
                  style={{ width: '100%', padding: '0.65rem 0.8rem 0.65rem 2.2rem', border: '1px solid #cbd5e1', borderRadius: 9 }}
                />
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filtrer par état"
                style={{ padding: '0.65rem 0.8rem', border: '1px solid #cbd5e1', borderRadius: 9, color: '#334155', background: '#fff' }}
              >
                <option value="">Tous les états</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p role="alert" style={{ padding: '1rem', color: '#b91c1c' }}>{error}</p>}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.84rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                  {/* Petit cadre de sélection globale (case à cocher dans l'en-tête) */}
                  <th style={{ padding: '0.85rem 0.75rem', width: 44, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every((d) => selectedIds.includes(d.id))}
                      onChange={handleSelectAll}
                      title={filtered.every((d) => selectedIds.includes(d.id)) ? "Tout désélectionner" : "Tout sélectionner"}
                      style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#048b9a' }}
                    />
                  </th>
                  {['Référence', 'Matricule', 'Étudiant', 'Établissement', 'Diplôme', 'Transmis le', 'État actuel', ''].map((label) => (
                    <th key={label} style={{ padding: '0.85rem 1rem' }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} style={{ ...cell, textAlign: 'center', padding: '2rem' }}>
                      Chargement des archives…
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...cell, textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                      {error ? '' : 'Aucun dossier transmis ne correspond à votre recherche.'}
                    </td>
                  </tr>
                ) : (
                  visible.map((d) => {
                    const isChecked = selectedIds.includes(d.id);
                    return (
                      <tr
                        key={d.id}
                        style={{
                          backgroundColor: isChecked ? '#f0fdfa' : 'transparent',
                          transition: 'background 0.15s'
                        }}
                      >
                        {/* Petit cadre de sélection (case à cocher pour chaque dossier) */}
                        <td style={{ ...cell, width: 44, textAlign: 'center', padding: '0.9rem 0.75rem' }}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSelect(d.id)}
                            title="Cocher pour inclure dans l'exportation PDF"
                            style={{ width: 17, height: 17, cursor: 'pointer', accentColor: '#048b9a' }}
                          />
                        </td>
                        <td style={{ ...cell, color: '#0a3641', fontWeight: 800 }}>DEM-{String(d.id).padStart(3, '0')}</td>
                        <td style={cell}>{d.etudiant_details?.matricule || '—'}</td>
                        <td style={{ ...cell, fontWeight: 600 }}>{d.etudiant_details?.nom} {d.etudiant_details?.prenom}</td>
                        <td style={cell}>{d.etablissement_origine || d.etudiant_details?.faculte || '—'}</td>
                        <td style={cell}>{d.type_diplome}</td>
                        <td style={cell}>{d.date_transmission_chef ? new Date(d.date_transmission_chef).toLocaleDateString('fr-FR') : '—'}</td>
                        <td style={cell}>{badge(d.statut)}</td>
                        <td style={cell}>
                          <button
                            onClick={() => setSelected(d)}
                            style={{
                              border: 0,
                              borderRadius: 8,
                              background: '#eaf4fb',
                              color: '#1d70b8',
                              padding: '0.5rem 0.7rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6
                            }}
                          >
                            <Eye size={15} /> Consulter
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!loading && filtered.length > PAGE_SIZE && (
            <div style={{ padding: '0.85rem 1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '0.82rem' }}>
                Affichage de {Math.min(filtered.length, (page - 1) * PAGE_SIZE + 1)} à {Math.min(filtered.length, page * PAGE_SIZE)} sur {filtered.length} dossiers
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.82rem' }}>Page {page} sur {pageCount}</span>
                <button
                  aria-label="Page précédente"
                  disabled={page <= 1}
                  onClick={() => setPage((n) => n - 1)}
                  style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 7, padding: 6, opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  aria-label="Page suivante"
                  disabled={page >= pageCount}
                  onClick={() => setPage((n) => n + 1)}
                  style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: 7, padding: 6, opacity: page >= pageCount ? 0.4 : 1, cursor: page >= pageCount ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Modale de consultation détaillée */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          role="presentation"
          style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(15,23,42,.52)', display: 'grid', placeItems: 'center', padding: '1rem' }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="archive-details-title"
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, width: 'min(780px, 100%)', maxHeight: '90vh', overflowY: 'auto', padding: '1.4rem', boxShadow: '0 24px 70px rgba(0,0,0,.2)' }}
          >
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: '0.9rem' }}>
              <div>
                <h2 id="archive-details-title" style={{ margin: 0, color: '#0a3641' }}>
                  Dossier DEM-{String(selected.id).padStart(3, '0')}
                </h2>
                <p style={{ margin: '0.35rem 0 0', color: '#64748b' }}>Détails et historique du traitement</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => exportPDF([selected])}
                  style={{
                    border: '1px solid #cbd5e1',
                    borderRadius: 8,
                    background: '#ffffff',
                    color: '#048b9a',
                    padding: '0.45rem 0.8rem',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0fdfa'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  <Download size={14} /> Exporter cette fiche
                </button>
                <button
                  onClick={() => setSelected(null)}
                  aria-label="Fermer"
                  style={{ border: 0, background: '#f1f5f9', borderRadius: 8, padding: 8, cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem', margin: '1rem 0' }}>
              {[
                ['Matricule', selected.etudiant_details?.matricule],
                ['Étudiant', `${selected.etudiant_details?.nom || ''} ${selected.etudiant_details?.prenom || ''}`],
                ['Établissement', selected.etablissement_origine || selected.etudiant_details?.faculte],
                ['Diplôme demandé', selected.type_diplome],
                ['Transmis le', selected.date_transmission_chef ? new Date(selected.date_transmission_chef).toLocaleString('fr-FR') : '—'],
                ['État actuel', STATUS_LABELS[selected.statut] || selected.statut_display || selected.statut]
              ].map(([label, value]) => (
                <div key={label} style={{ background: '#f8fafc', borderRadius: 10, padding: '0.8rem' }}>
                  <div style={{ color: '#64748b', fontSize: '0.75rem', marginBottom: 4 }}>{label}</div>
                  <strong style={{ color: '#0a3641' }}>{value || '—'}</strong>
                </div>
              ))}
            </div>

            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0a3641', fontSize: '1rem' }}>
              <History size={18} /> Historique du dossier
            </h3>
            {selected.historique?.length ? (
              <div style={{ display: 'grid', gap: '0.65rem' }}>
                {selected.historique.map((event) => (
                  <article key={event.id} style={{ borderLeft: '3px solid #00b4d8', background: '#f8fafc', padding: '0.75rem 0.9rem', borderRadius: '0 9px 9px 0' }}>
                    <strong style={{ color: '#0a3641' }}>{event.action_realisee}</strong>
                    <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 4 }}>
                      {new Date(event.date_action).toLocaleString('fr-FR')} · {event.role_utilisateur || event.utilisateur_details?.role || 'Utilisateur'}
                    </div>
                    {event.commentaire && <p style={{ margin: '0.4rem 0 0', color: '#475569' }}>{event.commentaire}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <p style={{ color: '#64748b' }}>Aucun événement enregistré.</p>
            )}
          </section>
        </div>
      )}
    </AppLayout>
  );
};

export default Archives;
