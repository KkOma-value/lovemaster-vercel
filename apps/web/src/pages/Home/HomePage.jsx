import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, m } from 'framer-motion';
import {
  Heart,
  Sparkles,
  Shield,
  Zap,
  MessageCircle,
  BookOpen,
  ChevronRight,
  Star,
  Lock,
  Cloud,
  Leaf,
  Mail,
  CloudRain,
  Frown,
} from 'lucide-react';
import {
  BrandMark,
  Chip,
  SectionTitle,
  IconSticker,
  Avatar,
} from '../../components/ui/brand';
import { useAuth } from '../../contexts/AuthContext';
import { useChatRuntime } from '../../contexts/ChatRuntimeContext';

const FEATURES = [
  { icon: <Heart size={22} />, title: '情感分析', desc: '读懂 TA 字里行间的小心思', tone: 'rose' },
  { icon: <Sparkles size={22} />, title: '话术建议', desc: '贴心回复，不失温度的恰到好处', tone: 'peach' },
  { icon: <Shield size={22} />, title: '隐私保护', desc: '你的秘密，永远只属于你', tone: 'sage' },
  { icon: <Zap size={22} />, title: '即时响应', desc: '关键时刻不让你等待', tone: 'cream' },
];

function FeatureCard({ onClick, span, delay, tone, icon, badge, title, subtitle, footnote }) {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onClick?.()}
      className={`col-span-12 ${span} relative cursor-pointer fade-up soft-card group`}
      style={{
        padding: '24px 24px 22px',
        animationDelay: delay,
        transition: 'transform .22s cubic-bezier(0.34,1.56,0.64,1), box-shadow .22s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = 'var(--shadow-lift)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div className="flex items-start gap-3 mb-4">
        <IconSticker tone={tone}>{icon}</IconSticker>
        <div className="flex-1">
          <div
            className="text-[10px] uppercase tracking-widest mb-1"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.16em' }}
          >
            {badge}
          </div>
          <div className="display text-[22px] leading-tight" style={{ color: 'var(--text-ink)' }}>
            {title}
          </div>
        </div>
        <div
          className="grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-peach)', color: 'var(--primary-dark)' }}
        >
          <ChevronRight size={14} />
        </div>
      </div>
      <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--text-body)' }}>
        {subtitle}
      </p>
      <div className="dot-divider mb-3" />
      <div className="text-[12px] italic" style={{ color: 'var(--text-muted)' }}>
        {footnote}
      </div>
    </div>
  );
}

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { activeRuns } = useChatRuntime();
  const activeRunCount = activeRuns.length;

  const goChat = (mode = 'loveapp') => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    navigate(`/chat/${mode}`);
  };

  return (
    <div className="grain relative w-full flex-1 min-h-0 overflow-y-auto nice-scroll">
      {/* Full-page background image */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: 'url(/Gemini_Generated_Image_sofa8lsofa8lsofa.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(6px) brightness(0.6)',
          transform: 'scale(1.05)',
        }}
      />
      {/* Warm overlay */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: 'rgba(251,244,236,0.62)' }}
      />
      {/* Warm gradient overlay */}
      <div className="warm-bg fixed inset-0 z-0 pointer-events-none" />
      <AnimatePresence>
        {activeRunCount > 0 && (
          <m.button
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full cursor-pointer transition-all duration-200 hover:bg-[rgba(232,122,93,0.2)] hover:border-[rgba(232,122,93,0.35)]"
            onClick={() => {
              const run = activeRuns[0];
              navigate(`/chat/${run?.chatType === 'coach' ? 'coach' : 'loveapp'}`);
            }}
            initial={{ opacity: 0, scale: 0.8, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -4 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            style={{ 
              position: 'fixed', top: '16px', right: '16px', zIndex: 100,
              background: 'rgba(232,122,93,0.12)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(232,122,93,0.2)', whiteSpace: 'nowrap'
            }}
            aria-live="polite"
            aria-label={`${activeRunCount} 个回复正在后台生成`}
          >
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#E87A5D', animation: 'pillPulse 1.5s ease-in-out infinite' }} />
            <span className="text-[12px] md:text-[11px] font-medium leading-none" style={{ color: '#7A5C47' }}>正在后台生成 {activeRunCount} 个回复</span>
          </m.button>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-[1080px] mx-auto px-6 md:px-10 py-8 md:py-12 fade-up" style={{ animationDelay: '0s' }}
      >
        {/* Brand header */}
        <header className="flex items-center justify-between mb-8 fade-up" style={{ animationDelay: '0s' }}>
          <div className="flex items-center gap-2.5">
            <BrandMark size={36} />
            <div>
              <div className="display text-[19px] leading-none" style={{ color: 'var(--text-ink)' }}>
                Love Master
              </div>
              <div
                className="text-[11px]"
                style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-en)', letterSpacing: '0.12em' }}
              >
                YOUR LITTLE LOVE COMPANION
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span
                  className="hidden md:inline text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {user?.nickname || user?.email || '你好'}
                </span>
                <button onClick={logout} className="btn-ghost text-sm">
                  退出
                </button>
                <button onClick={() => goChat('loveapp')} className="btn-primary text-sm">
                  继续聊天
                </button>
              </>
            ) : (
              <>
                <button onClick={() => navigate('/login')} className="btn-ghost text-sm">
                  登录
                </button>
                <button onClick={() => navigate('/register')} className="btn-primary text-sm">
                  开始聊天
                </button>
              </>
            )}
          </div>
        </header>

        {/* Bento */}
        <div className="grid grid-cols-12 gap-4 md:gap-5 mb-6">
          {/* Hero */}
          <div
            className="col-span-12 md:col-span-7 row-span-2 relative overflow-hidden cursor-pointer fade-up"
            onClick={() => goChat('loveapp')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && goChat('loveapp')}
            style={{
              backgroundImage: 'url(/3.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: 'var(--r-xl)',
              minHeight: 380,
              padding: '36px 36px 32px',
              boxShadow: '0 20px 44px rgba(232,155,122,0.28), inset 0 1px 0 rgba(255,255,255,0.35)',
              animationDelay: '0.05s',
            }}
          >
            {/* Overlay for text readability */}
            <div
              className="absolute inset-0"
              style={{ background: 'rgba(40,35,30,0.34)', borderRadius: 'var(--r-xl)' }}
            />
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase"
                  style={{
                    background: 'rgba(255,250,245,0.28)',
                    color: '#FFFAF5',
                    borderRadius: 999,
                    letterSpacing: '0.14em',
                    backdropFilter: 'blur(6px)',
                    border: '1px solid rgba(255,250,245,0.3)',
                  }}
                >
                  <span className="heart-beat inline-flex">
                    <Heart size={11} fill="#FFFAF5" stroke="#FFFAF5" />
                  </span>
                  LOVE MASTER · 2026
                </div>
              </div>

              <div>
                <h1
                  className="display"
                  style={{
                    color: '#FFFAF5',
                    fontSize: 'clamp(36px, 5vw, 54px)',
                    lineHeight: 1.1,
                    textShadow: '0 2px 16px rgba(160,98,74,0.2)',
                  }}
                >
                  你的恋爱小助手
                  <br />
                  一直都在
                </h1>
                <p
                  className="mt-3 max-w-[380px] text-[15px]"
                  style={{ color: 'rgba(255,250,245,0.92)', lineHeight: 1.7 }}
                >
                  聊天卡壳了？心情不好？想要一点温柔的建议？
                  <br />
                  轻轻点一下，我就来陪你。
                </p>
                <div className="mt-6 flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      goChat('loveapp');
                    }}
                    className="inline-flex items-center gap-2 px-5 py-2.5 font-semibold text-sm"
                    style={{
                      background: '#FFFDF9',
                      color: 'var(--primary-dark)',
                      borderRadius: 999,
                      boxShadow: '0 8px 20px rgba(160,98,74,0.22), inset 0 1px 0 rgba(255,255,255,0.8)',
                    }}
                  >
                    <MessageCircle size={15} /> 现在开始聊聊
                  </button>
                  <span
                    className="inline-flex items-center gap-1.5 text-[12px] ml-1"
                    style={{ color: 'rgba(255,250,245,0.82)' }}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ background: '#8FB09F', boxShadow: '0 0 0 3px rgba(143,176,159,0.3)' }}
                    />
                    1,248 人正在聊
                  </span>
                </div>
              </div>
            </div>
          </div>

          <FeatureCard
            onClick={() => goChat('loveapp')}
            span="md:col-span-5"
            delay="0.12s"
            tone="rose"
            icon={<Heart size={22} />}
            badge="陪伴模式"
            title="恋爱陪伴"
            subtitle="温柔地陪你聊天，不评判、不催促，只倾听"
            footnote="「今天想说说什么呢？」"
          />

          <FeatureCard
            onClick={() => goChat('coach')}
            span="md:col-span-5"
            delay="0.18s"
            tone="sage"
            icon={<BookOpen size={22} />}
            badge="教练模式"
            title="恋爱教练"
            subtitle="分析聊天记录，给你最懂人心的专业建议"
            footnote="「我帮你看看，再慢慢想。」"
          />
        </div>

        {/* Mood ticker */}
        <div
          className="soft-card fade-up mb-6 relative overflow-hidden"
          style={{ padding: '18px 24px', animationDelay: '0.24s' }}
        >
          <div className="flex items-center gap-4 flex-wrap">
            <span
              className="text-xs"
              style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}
            >
              此刻最近的心情 →
            </span>
            <Chip tone="rose" icon={<Heart size={12} />}>有点想他</Chip>
            <Chip tone="peach" icon={<Cloud size={12} />}>聊着聊着冷了</Chip>
            <Chip tone="sage" icon={<Leaf size={12} />}>想约第二次</Chip>
            <Chip tone="cream" icon={<Mail size={12} />}>不会回消息</Chip>
            <Chip tone="rose" icon={<Frown size={12} />}>刚被已读</Chip>
            <Chip tone="peach" icon={<CloudRain size={12} />}>需要一点勇气</Chip>
          </div>
        </div>

        {/* Features grid */}
        <section
          className="soft-card fade-up heart-pattern relative"
          style={{ padding: '36px 28px', animationDelay: '0.3s' }}
        >
          <div className="flex items-end justify-between flex-wrap gap-4 mb-7">
            <SectionTitle
              eyebrow="WHY LOVEMASTER"
              title="这次，不只是陪你聊天"
              subtitle="我们希望做一个懂分寸、有温度、也靠得住的小伙伴。"
            />
            <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
              No. 01 — 04
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className="relative p-5 pop-in"
                style={{
                  background: 'rgba(255,253,249,0.7)',
                  borderRadius: 'var(--r-md)',
                  border: '1px solid var(--border-soft)',
                  animationDelay: `${0.36 + i * 0.08}s`,
                }}
              >
                <IconSticker tone={f.tone} size={48}>
                  {f.icon}
                </IconSticker>
                <div className="mt-4 text-[15px] font-medium" style={{ color: 'var(--text-ink)' }}>
                  {f.title}
                </div>
                <div className="mt-1 text-[13px] leading-relaxed" style={{ color: 'var(--text-body)' }}>
                  {f.desc}
                </div>
                <div
                  className="absolute top-4 right-5 text-[10px]"
                  style={{ color: 'var(--text-faint)', fontFamily: 'var(--font-en)' }}
                >
                  0{i + 1}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonial strip */}
        <section className="grid grid-cols-12 gap-4 md:gap-5 mt-5 mb-8">
          <div
            className="col-span-12 md:col-span-8 soft-card fade-up"
            style={{ padding: '28px 28px', animationDelay: '0.42s', position: 'relative', overflow: 'hidden' }}
          >
            <div
              className="absolute top-4 left-5 display"
              style={{ fontSize: 72, color: 'var(--bg-peach)', lineHeight: 0.8, fontFamily: 'Georgia, serif' }}
            >
              &ldquo;
            </div>
            <div className="relative z-10 pl-10">
              <p className="text-[15px] leading-[1.85]" style={{ color: 'var(--text-body)' }}>
                那天我因为一条没回的消息崩溃，Lovemaster 只是很轻地说：
                <br />
                <span className="display text-[18px]" style={{ color: 'var(--text-ink)' }}>
                  「先喝口水，我们慢慢来。」
                </span>
                <br />
                就这样一句话，我没忍住哭了出来。
              </p>
              <div className="flex items-center gap-2.5 mt-5">
                <Avatar name="小棠" tone="rose" size={32} />
                <div>
                  <div className="text-sm" style={{ color: 'var(--text-ink)' }}>
                    小棠 · 24岁
                  </div>
                  <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    2026 年 3 月
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div
            className="col-span-12 md:col-span-4 fade-up"
            style={{ animationDelay: '0.48s', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div
              className="soft-card relative overflow-hidden"
              style={{ padding: 18, background: '#FCE7D5', flex: 1 }}
            >
              <div className="display text-[32px] leading-none" style={{ color: 'var(--primary-dark)' }}>
                4.9
              </div>
              <div className="flex gap-0.5 mt-2" style={{ color: '#E89B7A' }}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} size={14} stroke="none" fill="#E89B7A" />
                ))}
              </div>
              <div className="text-xs mt-1" style={{ color: 'var(--primary-dark)' }}>
                App Store · 12,480 评分
              </div>
            </div>
            <div className="soft-card flex items-center gap-3" style={{ padding: 16 }}>
              <IconSticker tone="sage" size={40}>
                <Lock size={18} />
              </IconSticker>
              <div>
                <div className="text-[13px] font-medium" style={{ color: 'var(--text-ink)' }}>
                  端到端加密
                </div>
                <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  聊天不留档 · 不卖数据
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-6 text-center text-xs" style={{ color: 'var(--text-faint)' }}>
          Love Master AI · 2026 · 愿每一段感情都被温柔以待
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
