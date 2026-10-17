import React, { useEffect } from 'react';
import { AlertOctagon, AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';

export const EnTetePage = ({ titre, sousTitre, children }) => (
  <div className="adm-entete-page">
    <div>
      <h1>{titre}</h1>
      {sousTitre && <p>{sousTitre}</p>}
    </div>
    {children && <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>{children}</div>}
  </div>
);

export const Chargement = ({ texte = 'Chargement…' }) => (
  <div className="adm-chargement" role="status"><span className="adm-spinner" />{texte}</div>
);

export const Bandeau = ({ type = 'info', children, onFermer }) => (
  <div className={`adm-bandeau ${type}`} role={type === 'erreur' ? 'alert' : 'status'}>
    <span style={{ flex: 1 }}>{children}</span>
    {onFermer && (
      <button type="button" onClick={onFermer} aria-label="Fermer" style={{ color: 'inherit' }}><X size={16} /></button>
    )}
  </div>
);

const NIVEAUX = {
  critique: { icone: AlertOctagon, libelle: 'Critique' },
  attention: { icone: AlertTriangle, libelle: 'Attention' },
  info: { icone: Info, libelle: 'Information' },
  ok: { icone: CheckCircle2, libelle: 'Aucune alerte' },
};

export const Alerte = ({ niveau, message, nombre }) => {
  const { icone: Icone, libelle } = NIVEAUX[niveau] || NIVEAUX.info;
  return (
    <div className={`adm-alerte ${niveau}`}>
      <Icone size={18} aria-hidden="true" />
      <div>
        <span className="adm-alerte-niveau">{libelle}{nombre != null ? ` · ${nombre}` : ''}</span>
        {message}
      </div>
    </div>
  );
};

export const ListeAlertes = ({ alertes }) => (
  <div className="adm-alertes">
    {alertes.length === 0
      ? <Alerte niveau="ok" message="Aucune alerte de sécurité détectée sur les comptes, le journal et la configuration." />
      : alertes.map((a) => <Alerte key={a.code} {...a} />)}
  </div>
);

// « masquee » garde le contenu monté (saisie conservée) pendant qu'une confirmation s'affiche
export const Modale = ({ titre, onFermer, children, pied, largeur, masquee = false }) => {
  useEffect(() => {
    if (masquee) return undefined;
    const echap = (e) => { if (e.key === 'Escape') onFermer(); };
    document.addEventListener('keydown', echap);
    return () => document.removeEventListener('keydown', echap);
  }, [onFermer, masquee]);

  return (
    <div className="adm-voile" style={masquee ? { display: 'none' } : undefined}
         onMouseDown={(e) => { if (e.target === e.currentTarget) onFermer(); }}>
      <div className="adm-modale" role="dialog" aria-modal="true" aria-label={titre} style={largeur ? { maxWidth: largeur } : undefined}>
        <div className="adm-modale-entete">
          <h3>{titre}</h3>
          <button type="button" className="adm-bouton-icone" onClick={onFermer} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="adm-modale-corps">{children}</div>
        {pied && <div className="adm-modale-pied">{pied}</div>}
      </div>
    </div>
  );
};

// Confirmation obligatoire avant toute opération sensible
export const Confirmation = ({ titre, message, libelleConfirmer = 'Confirmer', danger = false, enCours, erreur, onConfirmer, onAnnuler }) => (
  <Modale
    titre={titre}
    onFermer={enCours ? () => {} : onAnnuler}
    pied={(
      <>
        <button type="button" className="adm-btn adm-btn-contour" onClick={onAnnuler} disabled={enCours}>Annuler</button>
        <button type="button" className={`adm-btn ${danger ? 'adm-btn-danger' : 'adm-btn-primaire'}`} onClick={onConfirmer} disabled={enCours}>
          {enCours ? 'Traitement…' : libelleConfirmer}
        </button>
      </>
    )}
  >
    {erreur && <Bandeau type="erreur">{erreur}</Bandeau>}
    {message}
  </Modale>
);
