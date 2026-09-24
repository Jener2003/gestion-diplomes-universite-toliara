import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Check, 
  Printer, 
  Award, 
  FileCheck, 
  PenTool, 
  Truck,
  Building2,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

const STAGES = [
  { key: 'DEPOT', label: '1. Saisie Étab.', icon: FileText },
  { key: 'SCOL_CENTRALE', label: '2. Scol. Centrale', icon: FileCheck },
  { key: 'AFFECTATION', label: '3. Traitement', icon: CheckCircle2 },
  { key: 'IMPRESSION', label: '4. Impression', icon: Printer },
  { key: 'SIG_DOYEN', label: '5. Sig. Doyen', icon: PenTool },
  { key: 'TRANSMISSION', label: '6. Navette Prés.', icon: Truck },
  { key: 'SIG_PRESIDENT', label: '7. Sig. Président', icon: Building2 },
  { key: 'DISPONIBLE', label: '8. Disponible', icon: Award },
  { key: 'RETIRE', label: '9. Retiré', icon: UserCheck },
];

const StepperProgress = ({ currentStatut }) => {
  if (currentStatut === 'REFUSEE') {
    return (
      <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#991b1b' }}>
        <XCircle size={20} />
        <div>
          <span style={{ fontWeight: 700 }}>Demande Refusée</span>
          <p style={{ fontSize: '0.8rem', color: '#7f1d1d', margin: 0 }}>Ce dossier a été rejeté lors du contrôle de conformité académique.</p>
        </div>
      </div>
    );
  }

  if (currentStatut === 'DOSSIER_INCOMPLET') {
    return (
      <div style={{ padding: '0.75rem 1rem', background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#92400e' }}>
        <AlertTriangle size={20} />
        <div>
          <span style={{ fontWeight: 700 }}>Dossier Incomplet</span>
          <p style={{ fontSize: '0.8rem', color: '#b45309', margin: 0 }}>Pièces justificatives manquantes à régulariser par la scolarité de l'établissement.</p>
        </div>
      </div>
    );
  }

  const getStageIndex = (statut) => {
    switch (statut) {
      case 'EN_ATTENTE_VERIFICATION':
      case 'DOSSIER_INCOMPLET':
        return 0;
      case 'VALIDEE':
        return 1;
      case 'EN_TRAITEMENT':
      case 'EN_ATTENTE_IMPRESSION':
        return 2;
      case 'EN_IMPRESSION':
      case 'IMPRIME':
        return 3;
      case 'EN_ATTENTE_SIGNATURE_ETABLISSEMENT':
      case 'SIGNE_ETABLISSEMENT':
        return 4;
      case 'EN_TRANSMISSION_PRESIDENT':
      case 'EN_ATTENTE_SIGNATURE_PRESIDENT':
        return 5;
      case 'SIGNE_PRESIDENT':
        return 6;
      case 'RETOUR_SCOLARITE':
      case 'DISPONIBLE':
        return 7;
      case 'RETIRE':
        return 8;
      default:
        return 0;
    }
  };

  const currentIndex = getStageIndex(currentStatut);

  return (
    <div style={{ width: '100%', padding: '0.75rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        {/* Ligne de connexion arrière-plan */}
        <div style={{ position: 'absolute', top: '15px', left: '16px', right: '16px', height: '3px', background: '#e2e8f0', zIndex: 0 }} />
        
        {/* Ligne de progression active */}
        <div style={{ 
          position: 'absolute', 
          top: '15px', 
          left: '16px', 
          width: `${(currentIndex / (STAGES.length - 1)) * 95}%`, 
          height: '3px', 
          background: 'linear-gradient(90deg, #00b4d8, #0a3641)', 
          transition: 'width 0.4s ease',
          zIndex: 0 
        }} />

        {STAGES.map((stage, idx) => {
          const isPassed = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = stage.icon;

          return (
            <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isPassed ? '#10b981' : isCurrent ? '#0a3641' : '#ffffff',
                color: isPassed || isCurrent ? '#ffffff' : '#94a3b8',
                border: isCurrent ? '3px solid #00b4d8' : isPassed ? 'none' : '2px solid #cbd5e1',
                boxShadow: isCurrent ? '0 0 0 4px rgba(0, 180, 216, 0.2)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                {isPassed ? <Check size={16} strokeWidth={3} /> : <Icon size={14} />}
              </div>
              <span style={{ 
                fontSize: '0.68rem', 
                fontWeight: isCurrent ? 800 : isPassed ? 600 : 500, 
                color: isCurrent ? '#0a3641' : isPassed ? '#10b981' : '#64748b',
                marginTop: '0.35rem',
                textAlign: 'center',
                whiteSpace: 'nowrap'
              }}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StepperProgress;
