import React from 'react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon, color, delay }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
    className="card" 
    style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: `4px solid ${color}` }}
  >
    <div style={{ backgroundColor: `${color}15`, color: color, padding: '1rem', borderRadius: '12px' }}>
      {icon}
    </div>
    <div>
      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{title}</span>
      <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#070b19', margin: 0, lineHeight: 1 }}>{value}</h3>
    </div>
  </motion.div>
);

const StatCards = ({ stats }) => {
  if (!stats) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
      <StatCard 
        title="Dossiers Reçus" 
        value={stats.total || 0} 
        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>}
        color="#f59e0b"
        delay={0.1}
      />
      <StatCard 
        title="En cours" 
        value={(stats.total - stats.disponibles) || 0} 
        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>}
        color="#3b82f6"
        delay={0.2}
      />
      <StatCard 
        title="Imprimés" 
        value={stats.imprimees || 0} 
        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>}
        color="#06b6d4"
        delay={0.3}
      />
      <StatCard 
        title="Disponibles" 
        value={stats.disponibles || 0} 
        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>}
        color="#10b981"
        delay={0.4}
      />
    </div>
  );
};

export default StatCards;
