import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { BrandMark, Avatar } from '../ui/brand';

export function AuthShell({ children, heroEyebrow, heroTitle, heroBody }) {
  return (
    <div className="relative w-full h-screen overflow-hidden flex flex-col md:flex-row">
      {/* Full-page background image */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url(/bg-auth.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      {/* Dark overlay for readability */}
      <div
        className="absolute inset-0 z-0"
        style={{
          background: 'rgba(60, 40, 30, 0.35)',
        }}
      />

      {/* decorative floating blobs */}
      <div
        className="absolute -top-20 -left-20 float-slow pointer-events-none z-[1]"
        style={{
          width: 260,
          height: 260,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,164,164,0.35), transparent 70%)',
          filter: 'blur(20px)',
        }}
      />
      <div
        className="absolute -bottom-24 -right-10 float-med pointer-events-none z-[1]"
        style={{
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,196,168,0.4), transparent 70%)',
          filter: 'blur(30px)',
        }}
      />
      <div
        className="absolute top-40 right-40 float-slow pointer-events-none z-[1]"
        style={{
          animationDelay: '1s',
          width: 160,
          height: 160,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(143,176,159,0.25), transparent 70%)',
          filter: 'blur(20px)',
        }}
      />

      {/* Left hero panel — full height on desktop */}
      <div
        className="relative z-10 flex flex-col justify-center p-8 md:p-10 md:w-1/2 md:h-screen fade-up"
        style={{
          background: 'rgba(252,231,213,0.88)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div className="absolute top-6 left-6 md:top-10 md:left-10">
          <BrandMark size={40} />
        </div>
        <div className="relative z-10 mt-16 md:mt-0 max-w-[420px]">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase mb-5"
            style={{
              background: 'rgba(255,250,245,0.4)',
              color: '#A0624A',
              borderRadius: 999,
              letterSpacing: '0.14em',
            }}
          >
            <Sparkles size={11} /> {heroEyebrow}
          </div>
          <h1 className="display text-[32px] md:text-[40px] leading-tight" style={{ color: 'var(--text-ink)' }}>
            {heroTitle}
          </h1>
          <p
            className="mt-4 text-[14px] leading-relaxed"
            style={{ color: 'var(--text-body)' }}
          >
            {heroBody}
          </p>
          <div className="mt-8 flex items-center gap-3">
            <div className="flex -space-x-2">
              <Avatar name="棠" tone="rose" size={28} />
              <Avatar name="叶" tone="sage" size={28} />
              <Avatar name="月" tone="peach" size={28} />
            </div>
            <span className="text-[11px]" style={{ color: 'var(--text-body)' }}>
              已有 12,480+ 朋友在这里
            </span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div
        className="relative z-10 flex-1 flex flex-col justify-center p-6 md:p-10 md:h-screen overflow-hidden fade-up"
        style={{
          background: 'rgba(255, 253, 249, 0.82)',
          backdropFilter: 'blur(12px)',
          animationDelay: '0.1s',
        }}
      >
        <div className="w-full max-w-[400px] mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

export function Field({ icon, type = 'text', value, onChange, placeholder, label, right, disabled, autoComplete }) {
  const [focus, setFocus] = useState(false);
  return (
    <label className="block">
      <div className="text-[12px] mb-1.5" style={{ color: 'var(--text-body)', fontWeight: 500 }}>
        {label}
      </div>
      <div
        className="flex items-center gap-2 px-3 py-2.5 transition-all"
        style={{
          background: '#FFFDF9',
          border: `1.5px solid ${focus ? 'var(--primary)' : 'var(--border-soft)'}`,
          borderRadius: 14,
          boxShadow: focus ? '0 0 0 4px rgba(232,155,122,0.12)' : 'none',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ color: focus ? 'var(--primary-dark)' : 'var(--text-muted)' }}>{icon}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          className="flex-1 bg-transparent text-[14px] outline-none"
          style={{ color: 'var(--text-ink)', border: 'none' }}
        />
        {right}
      </div>
    </label>
  );
}

export function TabSwitch({ mode, onSwitch, options = [{ value: 'login', label: '登录' }, { value: 'register', label: '注册' }] }) {
  return (
    <div className="flex gap-1 p-1 mb-5" style={{ background: 'var(--bg-peach)', borderRadius: 999, width: 'fit-content' }}>
      {options.map((opt) => {
        const isActive = mode === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onSwitch(opt.value)}
            className="px-4 py-1 text-[13px] font-medium transition-all"
            style={{
              borderRadius: 999,
              background: isActive ? '#FFFDF9' : 'transparent',
              color: isActive ? 'var(--primary-dark)' : 'var(--text-muted)',
              boxShadow: isActive ? '0 1px 4px rgba(196,123,90,0.12)' : 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function AuthError({ message }) {
  if (!message) return null;
  return (
    <div
      className="mb-4 px-3 py-2 text-[12.5px]"
      style={{
        background: '#F8E0E0',
        color: '#A55F5F',
        border: '1px solid rgba(165,95,95,0.2)',
        borderRadius: 12,
      }}
    >
      {message}
    </div>
  );
}

export function AuthDivider({ text = '或者' }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div className="flex-1 dot-divider" />
      <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
        {text}
      </span>
      <div className="flex-1 dot-divider" />
    </div>
  );
}
