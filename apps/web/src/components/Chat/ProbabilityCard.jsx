import React, { useEffect } from 'react';
import {
    m,
    useMotionValue,
    useTransform,
    useSpring,
    animate
} from 'framer-motion';
import {
    TrendingUp,
    ShieldAlert,
    Copy,
    ArrowRight,
    BookmarkCheck
} from 'lucide-react';

const TIER_COLORS = {
    极低: '#B8482E',
    偏低: '#D88B4A',
    一般: '#C47B5A',
    较高: '#8FA776',
    很高: '#6E8A5A'
};

const CONFIDENCE_LABELS = {
    low: '置信度较低',
    medium: '中等置信度',
    high: '高置信度'
};

const RING_RADIUS = 52;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const clampProbability = (value) => {
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return 0;
    return Math.max(0, Math.min(100, Math.round(num)));
};

const tierColor = (tier) => TIER_COLORS[tier] || TIER_COLORS.一般;

const AnimatedNumber = ({ value }) => {
    const motionValue = useMotionValue(0);
    const spring = useSpring(motionValue, { damping: 20, stiffness: 80 });
    const display = useTransform(spring, (latest) => Math.round(latest));

    useEffect(() => {
        const controls = animate(motionValue, value, {
            duration: 1.2,
            ease: [0.34, 1.56, 0.64, 1]
        });
        return () => controls.stop();
    }, [motionValue, value]);

    return <m.span>{display}</m.span>;
};

const ProbabilityCard = ({
    probability,
    tier,
    confidence,
    summary,
    greenFlags = [],
    redFlags = [],
    nextActions = [],
    onCopyAction
}) => {
    const clamped = clampProbability(probability);
    const color = tierColor(tier);
    const confidenceLabel = CONFIDENCE_LABELS[confidence] || CONFIDENCE_LABELS.medium;
    const dashOffset = RING_CIRCUMFERENCE * (1 - clamped / 100);

    const handleCopy = (actionText) => {
        if (typeof onCopyAction === 'function') {
            onCopyAction(actionText);
        }
    };

    return (
        <section
            className="soft-card my-3 fade-up"
            style={{ padding: '20px 22px' }}
            aria-label={`成功概率 ${clamped}%，${tier || ''}，${confidenceLabel}`}
        >
            <div className="flex flex-col md:flex-row items-center md:items-center text-center md:text-left gap-3.5 md:gap-5.5 pb-3.5">
                <div className="relative shrink-0 w-[92px] h-[92px] md:w-[108px] md:h-[108px] drop-shadow-[0_4px_10px_rgba(196,123,90,0.12)]">
                    <svg viewBox="0 0 120 120" role="img" aria-hidden="true" className="w-full h-full -rotate-90 overflow-visible">
                        <circle
                            className="fill-none stroke-[rgba(196,123,90,0.12)] stroke-[5px]"
                            cx="60" cy="60" r={RING_RADIUS}
                        />
                        <m.circle
                            className="fill-none stroke-[5px] transition-colors duration-300 ease-in-out"
                            style={{ stroke: color, strokeLinecap: 'round' }}
                            cx="60" cy="60" r={RING_RADIUS}
                            strokeDasharray={RING_CIRCUMFERENCE}
                            initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
                            animate={{ strokeDashoffset: dashOffset }}
                            transition={{ duration: 1.2, ease: [0.34, 1.56, 0.64, 1] }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div style={{ color, display: 'flex', alignItems: 'baseline' }}>
                            <span className="display text-[28px] md:text-[34px] font-semibold tracking-tight tabular-nums leading-none">
                                <AnimatedNumber value={clamped} />
                            </span>
                            <span className="text-[13px] md:text-[14px] font-medium ml-1 opacity-85">%</span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 min-w-0 w-full">
                    <div className="text-[12px] font-medium tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>
                        成功概率（在一起的可能性）
                    </div>
                    <div className="display text-[17px] font-semibold mt-1 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        <span style={{ color }}>{tier || '一般'}</span>
                        <span className="mx-2 font-normal opacity-50" style={{ color: 'var(--text-muted)' }}>·</span>
                        <span className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'inherit' }}>{confidenceLabel}</span>
                    </div>
                    {summary && (
                        <p className="text-[13.5px] leading-relaxed mt-2" style={{ color: 'var(--text-secondary)' }}>{summary}</p>
                    )}
                </div>
            </div>

            {greenFlags.length > 0 && (
                <>
                    <div className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-wider mt-4 mb-2.5" style={{ color: 'var(--text-secondary)' }}>
                        <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(196,123,90,0.18)' }} />
                        <span>正面信号<span className="ml-[6px] font-medium" style={{ color: 'var(--text-muted)' }}>{greenFlags.length}</span></span>
                        <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(196,123,90,0.18)' }} />
                    </div>
                    <div className="flex flex-col gap-2">
                        {greenFlags.map((flag, idx) => (
                            <div key={`g-${idx}`} className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl border border-[rgba(16,185,129,0.18)] bg-[rgba(236,253,245,0.55)]">
                                <TrendingUp size={18} className="shrink-0 mt-[2px]" style={{ color: 'var(--sage)' }} aria-hidden="true" />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-[13.5px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{flag.title}</span>
                                        {flag.weight === 'high' && (
                                            <span className="hidden sm:inline-block px-2 py-[2px] text-[10px] font-semibold tracking-wider rounded-full bg-[rgba(220,38,38,0.14)] text-[#991B1B]">高</span>
                                        )}
                                        {flag.weight === 'medium' && (
                                            <span className="hidden sm:inline-block px-2 py-[2px] text-[10px] font-semibold tracking-wider rounded-full bg-[rgba(245,158,11,0.14)] text-[#92400E]">中</span>
                                        )}
                                    </div>
                                    {flag.evidence && (
                                        <div className="text-[12px] leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}>证据：{flag.evidence}</div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {redFlags.length > 0 && (
                <>
                    <div className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-wider mt-4 mb-2.5" style={{ color: 'var(--text-secondary)' }}>
                        <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(196,123,90,0.18)' }} />
                        <span>风险信号<span className="ml-[6px] font-medium" style={{ color: 'var(--text-muted)' }}>{redFlags.length}</span></span>
                        <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(196,123,90,0.18)' }} />
                    </div>
                    <div className="flex flex-col gap-2">
                        {redFlags.map((flag, idx) => {
                            const isHigh = flag.weight === 'high';
                            return (
                                <div
                                    key={`r-${idx}`}
                                    className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border ${isHigh ? 'border-[rgba(220,38,38,0.25)] bg-[rgba(254,242,242,0.6)]' : 'border-[rgba(245,158,11,0.22)] bg-[rgba(255,250,235,0.6)]'}`}
                                >
                                    <ShieldAlert size={18} className={`shrink-0 mt-[2px] ${isHigh ? 'text-[#DC2626]' : 'text-[#D97706]'}`} aria-hidden="true" />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-[13.5px] font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>{flag.title}</span>
                                            {isHigh && (
                                                <span className="hidden sm:inline-block px-2 py-[2px] text-[10px] font-semibold tracking-wider rounded-full bg-[rgba(220,38,38,0.14)] text-[#991B1B]">高</span>
                                            )}
                                            {flag.weight === 'medium' && (
                                                <span className="hidden sm:inline-block px-2 py-[2px] text-[10px] font-semibold tracking-wider rounded-full bg-[rgba(245,158,11,0.14)] text-[#92400E]">中</span>
                                            )}
                                        </div>
                                        {flag.evidence && (
                                            <div className="text-[12px] leading-relaxed mt-1" style={{ color: 'var(--text-secondary)' }}>证据：{flag.evidence}</div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {nextActions.length > 0 && (
                <>
                    <div className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-wider mt-4 mb-2.5" style={{ color: 'var(--text-secondary)' }}>
                        <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(196,123,90,0.18)' }} />
                        <span>下一步怎么做</span>
                        <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(196,123,90,0.18)' }} />
                    </div>
                    <div className="flex flex-col gap-2">
                        {nextActions.map((action, idx) => {
                            let toneColor = '', toneBg = '';
                            switch(action.tone) {
                                case '主动': toneBg = 'rgba(196,123,90,0.16)'; toneColor = 'var(--primary-dark)'; break;
                                case '温和': toneBg = 'rgba(143,176,159,0.18)'; toneColor = 'var(--sage)'; break;
                                case '稳健': toneBg = 'rgba(122,92,71,0.14)'; toneColor = 'var(--text-secondary)'; break;
                                case '克制': toneBg = 'rgba(220,38,38,0.12)'; toneColor = '#991B1B'; break;
                                case '有趣': toneBg = 'rgba(232,122,93,0.16)'; toneColor = '#B8482E'; break;
                                default: break;
                            }
                            return (
                                <button
                                    key={`a-${idx}`}
                                    type="button"
                                    className="flex items-center gap-2.5 px-3.5 py-3 w-full text-left rounded-xl border border-[rgba(196,123,90,0.14)] bg-[rgba(255,253,249,0.7)] hover:border-[var(--primary)] hover:bg-[rgba(255,248,244,0.95)] hover:shadow-[0_4px_14px_rgba(196,123,90,0.12)] transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] group"
                                    onClick={() => handleCopy(action.action)}
                                    aria-label={`复制话术到输入框：${action.action}`}
                                >
                                    <span className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-semibold bg-[rgba(196,123,90,0.14)] text-[var(--primary-dark)] display">
                                        {idx + 1}
                                    </span>
                                    <span className="flex-1 min-w-0 text-[13.5px] leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                                        {action.action}
                                    </span>
                                    {action.tone && (
                                        <span className="shrink-0 text-[10px] sm:px-2 sm:py-[2px] px-1.5 py-0.5 rounded-full font-semibold tracking-wider" style={{ background: toneBg, color: toneColor }}>
                                            {action.tone}
                                        </span>
                                    )}
                                    {typeof onCopyAction === 'function' ? (
                                        <Copy size={14} className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors duration-200" aria-hidden="true" />
                                    ) : (
                                        <ArrowRight size={14} className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--primary)] transition-colors duration-200" aria-hidden="true" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}
            
            {clamped >= 82 && (
                <div className="flex items-center gap-1.5 mt-3 px-3 py-2 rounded-lg text-[12px] font-medium" style={{ background: 'rgba(143,176,159,0.16)', color: 'var(--sage)' }}>
                    <BookmarkCheck size={14} />
                    <span>该条回复已自动进入高质量知识蒸馏队列</span>
                </div>
            )}
        </section>
    );
};

export default ProbabilityCard;
