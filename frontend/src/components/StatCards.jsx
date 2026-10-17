import React from 'react';
import {
  FileText,
  Clock,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Truck,
  Award,
  PenTool,
  Send,
  Building2
} from 'lucide-react';

const StatCard = ({ title, value, icon, color }) => (
  <div
    className="card"
    style={{
      padding: '1.25rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1.1rem',
      borderLeft: `4px solid ${color}`,
      backgroundColor: '#ffffff',
      borderRadius: '14px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
      border: '1px solid #e2e8f0'
    }}
  >
    <div style={{ backgroundColor: `${color}15`, color: color, padding: '0.85rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {icon}
    </div>
    <div>
      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {title}
      </span>
      <h3 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0a3641', margin: '0.2rem 0 0 0', lineHeight: 1 }}>
        {value}
      </h3>
    </div>
  </div>
);

const StatCards = ({ stats, role, presidenceKpi }) => {
  if (!stats) return null;

  if (role === 'SCOLARITE_ETABLISSEMENT') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard
          title="Total Déposées"
          value={stats.total || 0}
          icon={<FileText size={22} />}
          color="#00b4d8"
        />
        <StatCard
          title="En attente de vérification"
          value={stats.en_attente_verif || 0}
          icon={<CheckCircle2 size={22} />}
          color="#10b981"
        />
      </div>
    );
  }

  if (role === 'SCOLARITE_CENTRALE') {
    const demandesRecues = stats.total || 0;
    const enAttente = stats.en_attente_total ?? ((stats.en_attente_verif || 0) + (stats.dossier_incomplet || 0));
    const validees = stats.validees_total ?? Math.max(0, demandesRecues - enAttente - (stats.refusees || 0));
    const refusees = stats.refusees || 0;

    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard
          title="Demandes reçues"
          value={demandesRecues}
          icon={<FileText size={22} />}
          color="#0a3641"
        />
        <StatCard
          title="En attente"
          value={enAttente}
          icon={<Clock size={22} />}
          color="#f59e0b"
        />
        <StatCard
          title="Validées"
          value={validees}
          icon={<CheckCircle2 size={22} />}
          color="#10b981"
        />
        <StatCard
          title="Refusées"
          value={refusees}
          icon={<AlertTriangle size={22} />}
          color="#ef4444"
        />
      </div>
    );
  }

  if (role === 'CHEF_SERVICE') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard
          title="À Affecter Imprimeur"
          value={(stats.validees + stats.en_traitement) || 0}
          icon={<Printer size={22} />}
          color="#00b4d8"
        />
        <StatCard
          title="En Impression"
          value={(stats.en_attente_imp + stats.en_impression) || 0}
          icon={<Clock size={22} />}
          color="#3b82f6"
        />
        <StatCard
          title="Diplômes imprimés à transmettre"
          value={stats.imprimees || 0}
          icon={<Send size={22} />}
          color="#10b981"
        />
        <StatCard
          title="Retours au Chef de service"
          value={(stats.signees_pres || 0) + (stats.retour_scol || 0)}
          icon={<CheckCircle2 size={22} />}
          color="#8b5cf6"
        />
      </div>
    );
  }

  if (role === 'IMPRIMEUR') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard
          title="À Imprimer"
          value={stats.en_attente_imp || 0}
          icon={<Printer size={22} />}
          color="#f59e0b"
        />
        <StatCard
          title="En Cours de Tirage"
          value={stats.en_impression || 0}
          icon={<Clock size={22} />}
          color="#00b4d8"
        />
        <StatCard
          title="Total Imprimés"
          value={stats.imprimees || 0}
          icon={<CheckCircle2 size={22} />}
          color="#10b981"
        />
      </div>
    );
  }

  if (role === 'AGENT_TRANSMISSION') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard
          title="Acheminement vers la Présidence"
          value={stats.en_trans_pres || 0}
          icon={<Truck size={22} />}
          color="#6366f1"
        />
        <StatCard
          title="Déposés Présidence"
          value={stats.attente_sig_pres || 0}
          icon={<Building2 size={22} />}
          color="#f59e0b"
        />
        <StatCard
          title="Diplômes signés / retour au Chef"
          value={(stats.signees_pres + stats.retour_scol) || 0}
          icon={<Truck size={22} />}
          color="#10b981"
        />
      </div>
    );
  }

  if (role === 'PRESIDENCE') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <StatCard
          title="En Attente de Signature"
          value={stats.attente_sig_pres || 0}
          icon={<PenTool size={22} />}
          color="#c0000c"
        />
        <StatCard
          title="Signés par la Présidence"
          value={presidenceKpi?.signes_president || stats.signees_pres || 0}
          icon={<Award size={22} />}
          color="#10b981"
        />
        <StatCard
          title="Délai moyen jusqu'à signature"
          value={`${presidenceKpi?.delai_moyen_signature_jours || 0} j`}
          icon={<Clock size={22} />}
          color="#00b4d8"
        />
        <StatCard
          title="Total diplômes signés"
          value={presidenceKpi?.total_diplomes_signes || (stats.signees_pres + stats.retour_scol) || 0}
          icon={<CheckCircle2 size={22} />}
          color="#0a3641"
        />
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
      <StatCard
        title="Total Demandes"
        value={stats.total || 0}
        icon={<FileText size={22} />}
        color="#0a3641"
      />
      <StatCard
        title="En cours dans le circuit"
        value={Math.max(0, (stats.total || 0) - (stats.refusees || 0) - (stats.retour_scol || 0))}
        icon={<Clock size={22} />}
        color="#00b4d8"
      />
      <StatCard
        title="Imprimés"
        value={stats.imprimees || 0}
        icon={<Printer size={22} />}
        color="#1d70b8"
      />
      <StatCard
        title="Retours au Chef de service"
        value={stats.retour_scol || 0}
        icon={<CheckCircle2 size={22} />}
        color="#10b981"
      />
    </div>
  );
};

export default StatCards;
