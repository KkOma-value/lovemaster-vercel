import React from 'react';
import { Heart } from 'lucide-react';

export function BrandMark({ size = 32 }) {
  return (
    <div
      className="grid place-items-center breathe"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: '#E89B7A',
        boxShadow: '0 6px 16px rgba(232,155,122,0.38), inset 0 1px 0 rgba(255,255,255,0.55)',
        color: '#FFFAF5',
        flexShrink: 0,
      }}
    >
      <Heart size={size * 0.52} fill="#FFFAF5" stroke="#FFFAF5" strokeWidth={1.6} />
    </div>
  );
}

const CHIP_TONES = {
  peach: { bg: '#FCE7D5', fg: '#A0624A', bd: 'rgba(232,155,122,0.3)' },
  sage:  { bg: '#D5E3DA', fg: '#4C7566', bd: 'rgba(143,176,159,0.4)' },
  rose:  { bg: '#F5D8D8', fg: '#A55F5F', bd: 'rgba(232,164,164,0.4)' },
  cream: { bg: '#F5E4D1', fg: '#6B4A38', bd: 'rgba(107,74,56,0.2)' },
};

export function Chip({ children, tone = 'peach', icon }) {
  const t = CHIP_TONES[tone] || CHIP_TONES.peach;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium"
      style={{ background: t.bg, color: t.fg, borderRadius: 999, border: `1px solid ${t.bd}` }}
    >
      {icon}{children}
    </span>
  );
}

export function SectionTitle({ eyebrow, title, subtitle, align = 'left' }) {
  return (
    <div style={{ textAlign: align }}>
      {eyebrow && (
        <div
          className="text-xs tracking-widest uppercase mb-2"
          style={{ color: 'var(--primary-dark)', fontFamily: 'var(--font-en)', letterSpacing: '0.18em' }}
        >
          {eyebrow}
        </div>
      )}
      <h2 className="display text-[28px] md:text-[34px] font-normal" style={{ color: 'var(--text-ink)' }}>
        {title}
      </h2>
      {subtitle && <p className="mt-2 text-sm md:text-base" style={{ color: 'var(--text-body)' }}>{subtitle}</p>}
    </div>
  );
}

const STICKER_TONES = {
  peach: '#E89B7A',
  sage: '#8FB09F',
  rose: '#E8A4A4',
  cream: '#D8BF9F',
};

export function IconSticker({ children, tone = 'peach', size = 44 }) {
  return (
    <div
      className="sticker-shadow grid place-items-center"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.38,
        background: STICKER_TONES[tone] || STICKER_TONES.peach,
        color: '#FFFAF5',
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

const AVATAR_TONES = {
  peach: '#E89B7A',
  sage: '#8FB09F',
  rose: '#E8A4A4',
};

export function Avatar({ name = '她', tone = 'rose', size = 36, src = null, onClick = null, title = '' }) {
  const initial = typeof name === 'string' && name.length > 0 ? name[0] : '?';
  const style = {
    width: size,
    height: size,
    borderRadius: '50%',
    background: AVATAR_TONES[tone] || AVATAR_TONES.rose,
    color: '#FFFAF5',
    fontFamily: 'var(--font-display)',
    fontSize: size * 0.42,
    boxShadow: '0 3px 8px rgba(196,123,90,0.2), inset 0 1px 0 rgba(255,255,255,0.4)',
    flexShrink: 0,
    cursor: onClick ? 'pointer' : 'default',
    overflow: 'hidden',
  };

  if (src) {
    return (
      <img
        src={src}
        alt={title || initial}
        onClick={onClick}
        title={title}
        className="object-cover"
        style={style}
      />
    );
  }

  return (
    <div
      className="grid place-items-center font-medium"
      style={style}
      onClick={onClick}
      title={title}
    >
      {initial}
    </div>
  );
}

export function CoupleIllustration() {
  return (
    <svg viewBox="0 0 220 260" width="100%" height="100%" fill="none" aria-hidden="true">
      <ellipse cx="78" cy="260" rx="50" ry="16" fill="rgba(58,36,25,0.12)" />
      <circle cx="78" cy="80" r="26" fill="#F5D8D8" />
      <path d="M52 108 C52 108, 58 180, 78 180 C98 180, 104 108, 104 108 L104 220 L52 220 Z" fill="#FFFAF5" opacity="0.92" />
      <path d="M72 70 Q78 62 84 70" stroke="#3A2419" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="69" cy="78" r="1.3" fill="#3A2419" />
      <circle cx="86" cy="78" r="1.3" fill="#3A2419" />
      <path d="M54 76 C50 60, 64 48, 78 50 C92 48, 106 62, 102 78 C100 72, 92 66, 78 66 C64 66, 56 72, 54 76 Z" fill="#6B4A38" />
      <circle cx="140" cy="90" r="24" fill="#F5C4A8" />
      <path d="M116 116 C116 116, 122 188, 140 188 C158 188, 164 116, 164 116 L164 228 L116 228 Z" fill="#E89B7A" opacity="0.9" />
      <path d="M134 82 Q140 76 146 82" stroke="#3A2419" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="131" cy="88" r="1.3" fill="#3A2419" />
      <circle cx="148" cy="88" r="1.3" fill="#3A2419" />
      <path d="M118 86 C114 68, 130 58, 140 60 C150 58, 166 68, 162 86 C158 80, 152 74, 140 74 C128 74, 122 80, 118 86 Z" fill="#3A2419" />
      <g className="heart-beat" style={{ transformOrigin: '109px 108px' }}>
        <path d="M109 98 C112 92, 122 92, 122 102 C122 112, 109 118, 109 118 C109 118, 96 112, 96 102 C96 92, 106 92, 109 98 Z" fill="#E8A4A4" />
      </g>
      <path d="M38 200 Q28 180 42 170 Q46 188 38 200 Z" fill="#8FB09F" opacity="0.8" />
      <path d="M180 210 Q190 200 188 188 Q176 196 180 210 Z" fill="#B8CFC2" opacity="0.8" />
    </svg>
  );
}

export function AuthCoupleIllustration() {
  return (
    <svg viewBox="0 0 200 240" width="100%" height="100%" aria-hidden="true">
      <circle cx="100" cy="80" r="26" fill="#F5D8D8" />
      <path d="M74 110 C74 110, 80 190, 100 190 C120 190, 126 110, 126 110 L126 220 L74 220 Z" fill="#FFFAF5" opacity="0.8" />
      <path d="M94 72 Q100 66 106 72" stroke="#3A2419" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="91" cy="78" r="1.3" fill="#3A2419" />
      <circle cx="108" cy="78" r="1.3" fill="#3A2419" />
      <path d="M76 76 C72 60, 86 48, 100 50 C114 48, 128 62, 124 78 C122 72, 114 66, 100 66 C86 66, 78 72, 76 76 Z" fill="#6B4A38" />
      <g className="heart-beat" style={{ transformOrigin: '100px 110px' }}>
        <path d="M100 98 C103 92, 113 92, 113 102 C113 112, 100 118, 100 118 C100 118, 87 112, 87 102 C87 92, 97 92, 100 98 Z" fill="#E8A4A4" />
      </g>
    </svg>
  );
}
