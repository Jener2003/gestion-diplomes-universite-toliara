import React from 'react';

const TulearLogo = ({ size = 'medium', variant = 'light', showText = true }) => {
  const dimensions = {
    small: { logo: 36, text: 'text-sm font-bold' },
    medium: { logo: 48, text: 'text-base font-extrabold' },
    large: { logo: 64, text: 'text-xl font-black' },
    xlarge: { logo: 90, text: 'text-2xl font-black' },
  }[size] || { logo: 48, text: 'text-base font-extrabold' };

  const textColor = variant === 'dark' ? '#ffffff' : '#0a3641';
  const subTextColor = variant === 'dark' ? '#94a3b8' : '#1d70b8';

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
        {/* Outer Ring */}
        <circle cx="50" cy="50" r="46" fill="#0a3641" stroke="#d97706" strokeWidth="3" />
        <circle cx="50" cy="50" r="41" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="3 2" />

        {/* Torch & Flame Symbol */}
        <path d="M50 20 C45 30 42 35 45 42 C47 46 53 46 55 42 C58 35 55 30 50 20 Z" fill="#f59e0b" />
        <path d="M50 26 C47 32 46 35 48 39 C49 41 51 41 52 39 C54 35 53 32 50 26 Z" fill="#ef4444" />
        
        {/* Torch Handle */}
        <path d="M47 45 L53 45 L52 65 L48 65 Z" fill="#e2e8f0" stroke="#0a3641" strokeWidth="1" />
        <path d="M45 44 L55 44 L53 47 L47 47 Z" fill="#d97706" />

        {/* Open Book of Knowledge */}
        <path d="M30 65 Q40 60 50 67 Q60 60 70 65 L70 77 Q60 72 50 78 Q40 72 30 77 Z" fill="#ffffff" stroke="#1d70b8" strokeWidth="1.5" />
        <line x1="50" y1="67" x2="50" y2="78" stroke="#1d70b8" strokeWidth="1.5" />

        {/* Stars of Excellence */}
        <polygon points="25,45 27,51 33,51 28,55 30,61 25,57 20,61 22,55 17,51 23,51" fill="#f59e0b" />
        <polygon points="75,45 77,51 83,51 78,55 80,61 75,57 70,61 72,55 67,51 73,51" fill="#f59e0b" />

        {/* Motto Ribbon */}
        <path d="M 22 84 Q 50 92 78 84" stroke="#d97706" strokeWidth="2" fill="none" />
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span style={{ color: textColor, fontWeight: 800, fontSize: size === 'large' ? '1.25rem' : size === 'xlarge' ? '1.5rem' : '1rem', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Université de Tuléar
          </span>
          <span style={{ color: subTextColor, fontWeight: 600, fontSize: size === 'large' ? '0.85rem' : '0.725rem', letterSpacing: '0.05em' }}>
            GESTION DES DIPLÔMES • REPUBLIQUE DE MADAGASCAR
          </span>
        </div>
      )}
    </div>
  );
};

export default TulearLogo;
