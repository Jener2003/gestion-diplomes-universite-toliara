import React from 'react';

// Rayons du blason, générés autour de l'anneau (inspirés de l'emblème de
// l'Université de Toliara : anneau rouge à rayons, pirogue traditionnelle, vague).
const RAY_COUNT = 22;
const rays = Array.from({ length: RAY_COUNT }, (_, i) => {
  const angle = (i / RAY_COUNT) * Math.PI * 2;
  const next = ((i + 0.5) / RAY_COUNT) * Math.PI * 2;
  const cx = 50, cy = 50, rInner = 37, rOuter = 47;
  const bx1 = cx + rInner * Math.cos(angle), by1 = cy + rInner * Math.sin(angle);
  const bx2 = cx + rInner * Math.cos(angle + (Math.PI * 2) / RAY_COUNT), by2 = cy + rInner * Math.sin(angle + (Math.PI * 2) / RAY_COUNT);
  const tx = cx + rOuter * Math.cos(next), ty = cy + rOuter * Math.sin(next);
  return `${bx1},${by1} ${tx},${ty} ${bx2},${by2}`;
});

const ToliaraLogo = ({ size = 'medium', variant = 'light', showText = true }) => {
  const dimensions = {
    small: { logo: 36, text: 'text-sm font-bold' },
    medium: { logo: 48, text: 'text-base font-extrabold' },
    large: { logo: 64, text: 'text-xl font-black' },
    xlarge: { logo: 90, text: 'text-2xl font-black' },
  }[size] || { logo: 48, text: 'text-base font-extrabold' };

  const textColor = variant === 'dark' ? '#ffffff' : '#070b19';
  const subTextColor = variant === 'dark' ? '#94a3b8' : '#c0000c';

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', userSelect: 'none' }}>
      <svg
        width={dimensions.logo}
        height={dimensions.logo}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
      >
        {/* Disque de fond */}
        <circle cx="50" cy="50" r="48" fill="#ffffff" />

        {/* Rayons rouges (soleil) */}
        {rays.map((points, i) => (
          <polygon key={i} points={points} fill="#c0000c" />
        ))}

        {/* Anneau rouge */}
        <circle cx="50" cy="50" r="37" fill="#ffffff" stroke="#c0000c" strokeWidth="3" />

        {/* Vague */}
        <path d="M18 63 Q28 57 38 63 T58 63 T78 63" stroke="#048b9a" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M22 70 Q31 66 40 70 T58 70 T76 70" stroke="#048b9a" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />

        {/* Pirogue traditionnelle (Vezo) */}
        <path d="M28 58 Q50 68 72 58 L66 62 Q50 70 34 62 Z" fill="#070b19" />
        <path d="M33 58 Q50 50 67 58 Q50 60 33 58 Z" fill="#ea580c" />
        {/* Voile */}
        <path d="M50 30 L50 58 L36 58 Z" fill="#ea580c" />
        <line x1="50" y1="26" x2="50" y2="58" stroke="#070b19" strokeWidth="1.5" />

        {/* Libellé */}
        <path id="ringTop" d="M 14 50 A 36 36 0 0 1 86 50" fill="none" />
        <text fontSize="8" fontWeight="700" fill="#c0000c" letterSpacing="1.5">
          <textPath href="#ringTop" startOffset="50%" textAnchor="middle">
            UNIVERSITE
          </textPath>
        </text>
        <path id="ringBottom" d="M 18 78 A 36 36 0 0 0 82 78" fill="none" />
        <text fontSize="8" fontWeight="700" fill="#c0000c" letterSpacing="1.5">
          <textPath href="#ringBottom" startOffset="50%" textAnchor="middle">
            TOLIARA
          </textPath>
        </text>
      </svg>

      {showText && (
        <div className="toliara-logo-text" style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15, minWidth: 0 }}>
          <span className="toliara-logo-title" style={{ color: textColor, fontWeight: 800, fontSize: size === 'large' ? '1.25rem' : size === 'xlarge' ? '1.5rem' : '1rem', letterSpacing: '0.02em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            Université de Toliara
          </span>
          <span className="toliara-logo-subtitle" style={{ color: subTextColor, fontWeight: 600, fontSize: size === 'large' ? '0.85rem' : '0.725rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
            GESTION DES DIPLÔMES • REPUBLIQUE DE MADAGASCAR
          </span>
        </div>
      )}
    </div>
  );
};

export default ToliaraLogo;
