import React from 'react';
import { CheckCircle2, Clock, XCircle, FileText, Check, Printer, Award, FileCheck } from 'lucide-react';

const STAGES = [
  { key: 'RECUE', label: '1. Reçue', icon: FileText, role: 'Chef de Service' },
  { key: 'VERIFIEE_CHEF', label: '2. Validée Chef', icon: CheckCircle2, role: 'Chef de Service' },
  { key: 'SCOLARITE_PREPAREE', label: '3. Préparée', icon: FileCheck, role: 'Scolarité Centrale' },
  { key: 'IMPRIMEE', label: '4. Imprimée', icon: Printer, role: 'Imprimeur' },
  { key: 'DISPONIBLE', label: '5. Disponible', icon: Award, role: 'Présidence' },
];

const StepperProgress = ({ currentStatut }) => {
  if (currentStatut === 'REFUSEE') {
    return (
      <div style={{ padding: '0.75rem 1rem', background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#991b1b' }}>
        <XCircle size={20} />
        <div>
          <span style={{ fontWeight: 700 }}>Dossier Refusé</span>
          <p style={{ fontSize: '0.8rem', color: '#7f1d1d' }}>Ce dossier n'a pas été validé au cours du circuit administratif.</p>
        </div>
      </div>
    );
  }

  const getStageIndex = (statut) => {
    switch (statut) {
      case 'RECUE': return 0;
      case 'VERIFIEE_CHEF': return 1;
      case 'SCOLARITE_PREPAREE': return 2;
      case 'IMPRIMEE': return 3;
      case 'SIGNEE': return 3;
      case 'DISPONIBLE': return 4;
      default: return 0;
    }
  };

  const currentIndex = getStageIndex(currentStatut);

  return (
    <div style={{ width: '100%', padding: '0.5rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        {/* Background connector line */}
        <div style={{ position: 'absolute', top: '16px', left: '20px', right: '20px', height: '3px', background: '#e2e8f0', zIndex: 0 }} />
        
        {/* Active connector progress */}
        <div style={{ 
          position: 'absolute', 
          top: '16px', 
          left: '20px', 
          width: `${(currentIndex / (STAGES.length - 1)) * 92}%`, 
          height: '3px', 
          background: '#070b19', 
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
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isPassed ? '#10b981' : isCurrent ? '#070b19' : '#ffffff',
                color: isPassed || isCurrent ? '#ffffff' : '#94a3b8',
                border: isCurrent ? '3px solid #048b9a' : isPassed ? 'none' : '2px solid #cbd5e1',
                boxShadow: isCurrent ? '0 0 0 4px rgba(7, 11, 25, 0.15)' : 'none',
                transition: 'all 0.3s ease'
              }}>
                {isPassed ? <Check size={18} strokeWidth={3} /> : <Icon size={16} />}
              </div>
              <span style={{ 
                fontSize: '0.725rem', 
                fontWeight: isCurrent ? 700 : 500, 
                color: isCurrent ? '#070b19' : isPassed ? '#10b981' : '#64748b',
                marginTop: '0.375rem',
                textAlign: 'center'
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
