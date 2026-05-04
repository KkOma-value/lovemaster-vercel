import { Sparkles, Loader2 } from 'lucide-react';

export default function OptimizeButton({ disabled, isOptimizing, onClick }) {
  const inactive = disabled && !isOptimizing;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="优化提问"
      aria-busy={isOptimizing}
      aria-disabled={disabled}
      title="优化提问"
      className="grid place-items-center"
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        color: inactive ? 'var(--text-faint)' : 'var(--text-body)',
        background: 'transparent',
        border: 'none',
        cursor: disabled ? (isOptimizing ? 'progress' : 'not-allowed') : 'pointer',
        opacity: inactive ? 0.55 : 1,
        transition: 'all .2s',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = 'var(--bg-peach)';
        e.currentTarget.style.color = 'var(--primary-dark)';
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--text-body)';
      }}
    >
      {isOptimizing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
    </button>
  );
}
