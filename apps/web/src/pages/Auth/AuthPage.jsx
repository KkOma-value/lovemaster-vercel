import { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User, Sparkles, Shield, FileText, X } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { BrandMark, Avatar } from '../../components/ui/brand';

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const mode = location.pathname === '/register' ? 'register' : 'login';

  const handleModeSwitch = (newMode) => {
    if (newMode === mode) return;
    navigate(newMode === 'register' ? '/register' : '/login', { replace: true });
  };

  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/chat/loveapp" replace />;

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-3 md:p-5 lg:p-6 relative"
      style={{
        backgroundImage: 'url(/2.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Soft overlay for warmth */}
      <div
        className="absolute inset-0 z-0"
        style={{ background: 'rgba(252, 231, 213, 0.15)' }}
      />
      <div className="flex w-full max-w-[1140px] gap-4 md:gap-5 h-auto lg:h-[calc(100vh-48px)] min-h-[640px] relative z-10">
        <LeftCard mode={mode} />
        <RightCard mode={mode} onModeSwitch={handleModeSwitch} />
      </div>
    </div>
  );
}

/* ================================================================
   Left Card — Hero panel
   ================================================================ */
function LeftCard({ mode }) {
  return (
    <div
      className="hidden lg:flex flex-1 flex-col justify-center relative overflow-hidden"
      style={{
        background: 'rgba(252,231,213,0.86)',
        backdropFilter: 'blur(12px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(12px) saturate(1.2)',
        borderRadius: 28,
        boxShadow: '0 8px 32px rgba(196, 123, 90, 0.12), 0 2px 8px rgba(196, 123, 90, 0.06), inset 0 1px 0 rgba(255,255,255,0.4)',
      }}
    >
      {/* Decorative orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(255,250,245,0.35) 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(232,164,164,0.18) 0%, transparent 65%)' }}
        />
        <div
          className="absolute top-1/3 right-10 w-[300px] h-[300px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(245,196,168,0.22) 0%, transparent 60%)' }}
        />
      </div>

      {/* Logo */}
      <div className="absolute top-8 left-8 z-10 pop-in">
        <BrandMark size={40} />
      </div>

      {/* Content */}
      <div className="relative z-10 px-12 xl:px-16 max-w-[480px] mx-auto fade-up" style={{ animationDelay: '0.15s' }}>
        <div
          className="inline-flex items-center gap-1.5 px-4 py-1.5 text-[12px] font-semibold mb-6"
          style={{
            background: 'rgba(255,250,245,0.55)',
            color: '#A0624A',
            borderRadius: 999,
            letterSpacing: '0.08em',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,250,245,0.3)',
          }}
        >
          <Sparkles size={12} />
          {mode === 'login' ? '欢迎回来' : '加入我们'}
        </div>

        <AnimatePresence mode="wait">
          <h1
            key={mode + '-title'}
            className="display text-[38px] xl:text-[44px] leading-[1.12] mb-5 fade-up"
            style={{ color: '#3A2419' }}
          >
            {mode === 'login' ? (
              <>
                爱不是一个人
                <br />
                读懂全世界
              </>
            ) : (
              <>
                你的秘密
                <br />
                由我来守护
              </>
            )}
          </h1>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <p
            key={mode + '-body'}
            className="text-[14px] leading-relaxed mb-10 fade-up"
            style={{ color: '#6B4A38', animationDelay: '0.05s' }}
          >
            {mode === 'login'
              ? '登录后，你的聊天记录会被安全加密保存，只有你自己能看见。'
              : '建立账号，让所有的情绪和对话都有一个温暖的归宿。'}
          </p>
        </AnimatePresence>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <Avatar name="棠" tone="rose" size={30} />
            <Avatar name="叶" tone="sage" size={30} />
            <Avatar name="月" tone="peach" size={30} />
          </div>
          <span className="text-[12px]" style={{ color: '#6B4A38' }}>
            已有 12,480+ 朋友在这里
          </span>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Right Card — Form panel
   ================================================================ */
function RightCard({ mode, onModeSwitch }) {
  return (
    <div
      className="flex-1 flex flex-col justify-center relative overflow-y-auto"
      style={{
        background: '#FFFFFF',
        borderRadius: 28,
        boxShadow: '0 8px 32px rgba(196, 123, 90, 0.12), 0 2px 8px rgba(196, 123, 90, 0.06)',
      }}
    >
      <div className="w-full max-w-[400px] mx-auto px-8 py-10 md:px-10 md:py-12 fade-up">
        {/* Mobile logo */}
        <div className="lg:hidden flex justify-center mb-6">
          <BrandMark size={48} />
        </div>

        {/* Tab switch */}
        <div
          className="flex gap-1 p-1 mb-6"
          style={{ background: '#FCE7D5', borderRadius: 999, width: 'fit-content' }}
        >
          <TabButton active={mode === 'login'} onClick={() => onModeSwitch('login')}>
            登录
          </TabButton>
          <TabButton active={mode === 'register'} onClick={() => onModeSwitch('register')}>
            注册
          </TabButton>
        </div>

        {/* Title */}
        <AnimatePresence mode="wait">
          <div
            key={mode + '-header'}
            className="fade-up"
          >
            <h2 className="display text-[24px] mb-1" style={{ color: '#3A2419' }}>
              {mode === 'login' ? '很高兴又见到你' : '创建一个新账号'}
            </h2>
            <p className="text-[13px] mb-6" style={{ color: '#A98872' }}>
              {mode === 'login' ? '你的小助手已经在这里等着了' : '欢迎来到 Love Master'}
            </p>
          </div>
        </AnimatePresence>

        {/* Key forces remount on mode change, clearing all form state */}
        <AuthForm key={mode} mode={mode} />
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-5 py-1.5 text-[13px] font-medium transition-all duration-200"
      style={{
        borderRadius: 999,
        background: active ? '#FFFFFF' : 'transparent',
        color: active ? '#C47B5A' : '#A98872',
        boxShadow: active ? '0 1px 4px rgba(196,123,90,0.12)' : 'none',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

/* ================================================================
   Auth Form
   ================================================================ */
function AuthForm({ mode }) {
  const navigate = useNavigate();
  const { login, register, googleLogin } = useAuth();

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [modal, setModal] = useState(null);

  const formProps = {
    onError: setError,
    onLoading: setIsLoading,
    isLoading,
    error,
    showPwd,
    setShowPwd,
    navigate,
    onShowTerms: () => setModal('terms'),
    onShowPrivacy: () => setModal('privacy'),
  };

  const formElement = mode === 'login'
    ? <LoginFormInner {...formProps} onLogin={login} onGoogleLogin={googleLogin} />
    : <RegisterFormInner {...formProps} onRegister={register} onGoogleLogin={googleLogin} />;

  return (
    <>
      {formElement}
      {modal && <PolicyModal type={modal} onClose={() => setModal(null)} />}
    </>
  );
}

function LoginFormInner({ onError, onLoading, isLoading, error, showPwd, setShowPwd, onLogin, onGoogleLogin, navigate, onShowTerms, onShowPrivacy }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      onError('请填写邮箱和密码');
      return;
    }
    onLoading(true);
    onError('');
    try {
      await onLogin({ email, password, remember });
      navigate('/chat/loveapp');
    } catch (err) {
      console.error(err);
      onError(err.message || '登录失败，请检查邮箱或密码');
    } finally {
      onLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <div
        key="login-form"
        className="fade-up"
      >
        {error && (
          <div
            className="mb-4 px-3 py-2.5 text-[12.5px]"
            style={{
              background: '#F8E0E0',
              color: '#A55F5F',
              border: '1px solid rgba(165,95,95,0.15)',
              borderRadius: 12,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <AuthField
            icon={<Mail size={16} />}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            label="邮箱"
            disabled={isLoading}
            autoComplete="email"
          />

          <AuthField
            icon={<Lock size={16} />}
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            placeholder="••••••••"
            label="密码"
            disabled={isLoading}
            autoComplete="current-password"
            right={
              <PwdToggle show={showPwd} onToggle={() => setShowPwd((v) => !v)} />
            }
          />

          <div className="flex items-center justify-between text-[12px]">
            <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: '#6B4A38' }}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                style={{ accentColor: '#E89B7A' }}
              />
              记住我
            </label>
            <button
              type="button"
              className="hover:underline"
              style={{
                color: '#C47B5A',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              忘记密码？
            </button>
          </div>

          <button type="submit" className="btn-primary mt-1" disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? '登录中…' : '登录'}
          </button>

          <AuthDivider />

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                onLoading(true);
                onError('');
                try {
                  const data = await onGoogleLogin(credentialResponse.credential);
                  navigate(data.needsPassword ? '/set-password' : '/chat/loveapp');
                } catch (err) {
                  console.error(err);
                  onError(err.response?.data?.error || 'Google 登录失败，请重试');
                } finally {
                  onLoading(false);
                }
              }}
              onError={() => onError('Google 登录失败，请重试')}
              theme="outline"
              size="large"
              shape="pill"
              width="320"
              text="signin_with"
            />
          </div>
        </form>

        <div className="mt-5 text-[11px] text-center" style={{ color: '#A98872' }}>
          继续即表示同意
          <button
            type="button"
            onClick={onShowTerms}
            className="mx-0.5 bg-transparent border-none cursor-pointer"
            style={{ color: '#C47B5A', padding: 0, fontSize: 'inherit' }}
          >
            服务条款
          </button>
          和
          <button
            type="button"
            onClick={onShowPrivacy}
            className="mx-0.5 bg-transparent border-none cursor-pointer"
            style={{ color: '#C47B5A', padding: 0, fontSize: 'inherit' }}
          >
            隐私政策
          </button>
        </div>
      </div>
    </AnimatePresence>
  );
}

function RegisterFormInner({ onError, onLoading, isLoading, error, showPwd, setShowPwd, onRegister, onGoogleLogin, navigate, onShowTerms, onShowPrivacy }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const getPasswordStrength = (pwd) => {
    if (!pwd) return 0;
    let s = 0;
    if (pwd.length >= 8) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    return s;
  };

  const strength = getPasswordStrength(password);
  const strengthColors = ['#DC2626', '#DC2626', '#E89B7A', '#3A8B7F', '#2A6B5F'];
  const strengthWidths = ['0%', '25%', '50%', '75%', '100%'];
  const strengthLabels = ['', '弱', '中等', '强', '非常强'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      onError('请填写所有必填字段');
      return;
    }
    if (password !== confirmPassword) {
      onError('两次输入的密码不一致');
      return;
    }
    if (password.length < 8) {
      onError('密码长度至少需要 8 个字符');
      return;
    }
    onLoading(true);
    onError('');
    try {
      await onRegister({ name, email, password });
      navigate('/chat/loveapp');
    } catch (err) {
      console.error(err);
      onError(err.message || '注册失败，请稍后重试');
    } finally {
      onLoading(false);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <div
        key="register-form"
        className="fade-up"
      >
        {error && (
          <div
            className="mb-4 px-3 py-2.5 text-[12.5px]"
            style={{
              background: '#F8E0E0',
              color: '#A55F5F',
              border: '1px solid rgba(165,95,95,0.15)',
              borderRadius: 12,
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          <AuthField
            icon={<User size={16} />}
            type="text"
            value={name}
            onChange={setName}
            placeholder="怎样称呼你？"
            label="昵称"
            disabled={isLoading}
            autoComplete="name"
          />

          <AuthField
            icon={<Mail size={16} />}
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            label="邮箱"
            disabled={isLoading}
            autoComplete="email"
          />

          <div className="flex flex-col gap-1">
            <AuthField
              icon={<Lock size={16} />}
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              placeholder="最少 8 个字符"
              label="密码"
              disabled={isLoading}
              autoComplete="new-password"
              right={<PwdToggle show={showPwd} onToggle={() => setShowPwd((v) => !v)} />}
            />
            {password && (
              <div className="flex items-center gap-2 px-1">
                <div
                  className="flex-1 h-1 rounded-full overflow-hidden"
                  style={{ background: 'rgba(232,155,122,0.15)' }}
                >
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: strengthWidths[strength],
                      background: strengthColors[strength],
                    }}
                  />
                </div>
                <span className="text-[10px]" style={{ color: strengthColors[strength] }}>
                  {strengthLabels[strength]}
                </span>
              </div>
            )}
          </div>

          <AuthField
            icon={<Lock size={16} />}
            type={showPwd ? 'text' : 'password'}
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="再次输入密码"
            label="确认密码"
            disabled={isLoading}
            autoComplete="new-password"
          />

          <button type="submit" className="btn-primary mt-1" disabled={isLoading} aria-busy={isLoading}>
            {isLoading ? '注册中…' : '创建账号'}
          </button>

          <AuthDivider />

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                onLoading(true);
                onError('');
                try {
                  const data = await onGoogleLogin(credentialResponse.credential);
                  if (data.needsPassword) {
                    navigate('/set-password');
                  } else {
                    navigate('/chat/loveapp');
                  }
                } catch (err) {
                  console.error(err);
                  onError(err.response?.data?.error || 'Google 注册失败，请重试。');
                } finally {
                  onLoading(false);
                }
              }}
              onError={() => onError('Google 注册失败，请重试。')}
              theme="outline"
              size="large"
              shape="pill"
              width="320"
              text="signup_with"
            />
          </div>
        </form>

        <div className="mt-5 text-[11px] text-center" style={{ color: '#A98872' }}>
          继续即表示同意
          <button
            type="button"
            onClick={onShowTerms}
            className="mx-0.5 bg-transparent border-none cursor-pointer"
            style={{ color: '#C47B5A', padding: 0, fontSize: 'inherit' }}
          >
            服务条款
          </button>
          和
          <button
            type="button"
            onClick={onShowPrivacy}
            className="mx-0.5 bg-transparent border-none cursor-pointer"
            style={{ color: '#C47B5A', padding: 0, fontSize: 'inherit' }}
          >
            隐私政策
          </button>
        </div>
      </div>
    </AnimatePresence>
  );
}

function AuthField({ icon, type = 'text', value, onChange, placeholder, label, right, disabled, autoComplete }) {
  const [focus, setFocus] = useState(false);
  return (
    <label className="block">
      <div className="text-[12px] mb-1.5" style={{ color: '#6B4A38', fontWeight: 500 }}>
        {label}
      </div>
      <div
        className="flex items-center gap-2 px-3 py-2.5 transition-all duration-200"
        style={{
          background: '#FFFDF9',
          border: `1.5px solid ${focus ? '#E89B7A' : 'rgba(232,155,122,0.18)'}`,
          borderRadius: 14,
          boxShadow: focus ? '0 0 0 4px rgba(232,155,122,0.12)' : 'none',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span style={{ color: focus ? '#C47B5A' : '#A98872' }}>{icon}</span>
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
          style={{ color: '#3A2419', border: 'none' }}
        />
        {right}
      </div>
    </label>
  );
}

function PwdToggle({ show, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="grid place-items-center"
      style={{
        width: 28,
        height: 28,
        color: '#A98872',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
      }}
      title={show ? '隐藏密码' : '显示密码'}
    >
      {show ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );
}

function AuthDivider({ text = '或者' }) {
  return (
    <div className="flex items-center gap-3 my-1">
      <div
        className="flex-1"
        style={{
          height: 1,
          backgroundColor: 'rgba(232,155,122,0.18)',
        }}
      />
      <span className="text-[11px]" style={{ color: '#A98872' }}>
        {text}
      </span>
      <div
        className="flex-1"
        style={{
          height: 1,
          backgroundColor: 'rgba(232,155,122,0.18)',
        }}
      />
    </div>
  );
}

/* ================================================================
   Policy Modal
   ================================================================ */
function PolicyModal({ type, onClose }) {
  const isTerms = type === 'terms';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(60, 40, 30, 0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[480px] max-h-[80vh] overflow-y-auto"
        style={{
          background: '#FFFDF9',
          borderRadius: 20,
          boxShadow: '0 8px 40px rgba(80, 40, 20, 0.25)',
          padding: '28px 30px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div
            className="grid place-items-center flex-shrink-0"
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'rgba(232,155,122,0.12)',
              color: '#C47B5A',
            }}
          >
            {isTerms ? <FileText size={18} /> : <Shield size={18} />}
          </div>
          <div>
            <div className="text-[16px] font-semibold" style={{ color: '#4A3020' }}>
              {isTerms ? '服务条款' : '隐私政策'}
            </div>
            <div className="text-[11px]" style={{ color: '#A98872' }}>Love Master</div>
          </div>
          <button
            onClick={onClose}
            className="ml-auto grid place-items-center bg-transparent border-none cursor-pointer"
            style={{ width: 28, height: 28, borderRadius: 8, color: 'var(--text-muted)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="text-[13px] leading-relaxed" style={{ color: '#6B5748' }}>
          {isTerms ? (
            <>
              <h3 className="text-[14px] font-semibold mb-2" style={{ color: '#4A3020' }}>1. 服务说明</h3>
              <p className="mb-3">
                Love Master 是一款 AI 情感陪伴与恋爱教练应用，通过人工智能技术为用户提供情感建议和关系分析服务。本服务仅供个人学习和参考使用，不构成专业心理咨询或医疗建议。
              </p>

              <h3 className="text-[14px] font-semibold mb-2" style={{ color: '#4A3020' }}>2. 使用规范</h3>
              <p className="mb-3">
                用户应遵守法律法规，不得利用本服务从事违法违规活动。请尊重他人隐私，不要在对话中分享他人的个人信息。
              </p>

              <h3 className="text-[14px] font-semibold mb-2" style={{ color: '#4A3020' }}>3. 免责声明</h3>
              <p className="mb-3">
                AI 生成的内容仅供参考，不构成任何形式的承诺或保证。我们会持续改进服务质量，但不对服务的连续性、及时性和准确性做绝对保证。
              </p>

              <h3 className="text-[14px] font-semibold mb-2" style={{ color: '#4A3020' }}>4. 服务变更</h3>
              <p>我们保留随时修改或中断服务的权利，重大变更将通过应用内通知告知用户。</p>
            </>
          ) : (
            <>
              <h3 className="text-[14px] font-semibold mb-2" style={{ color: '#4A3020' }}>1. 信息收集</h3>
              <p className="mb-3">
                我们仅收集提供服务所必需的信息，包括账号信息和您在应用内的对话内容。我们采用行业标准的安全措施保护您的数据。
              </p>

              <h3 className="text-[14px] font-semibold mb-2" style={{ color: '#4A3020' }}>2. 数据使用</h3>
              <p className="mb-3">
                您的对话数据可能经过匿名化处理后用于改善 AI 回复质量。所有数据处理遵循去标识化原则，无法追溯到具体个人身份。我们不会将您的个人数据出售或分享给第三方。
              </p>

              <h3 className="text-[14px] font-semibold mb-2" style={{ color: '#4A3020' }}>3. 数据安全</h3>
              <p className="mb-3">
                我们采用加密传输和存储技术保护您的数据安全。您有权随时请求删除账号及关联数据，删除请求将在 7 个工作日内处理。
              </p>

              <h3 className="text-[14px] font-semibold mb-2" style={{ color: '#4A3020' }}>4. 联系我们</h3>
              <p>
                如对隐私政策有任何疑问，请通过应用内反馈联系我们。本政策可能不时更新，重大变更将提前通知。
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full mt-5 py-2.5 text-[13px] font-medium border-none cursor-pointer"
          style={{
            background: '#E89B7A',
            color: '#FFFAF5',
            borderRadius: 12,
            boxShadow: '0 4px 12px rgba(232,155,122,0.25)',
          }}
        >
          我知道了
        </button>
      </div>
    </div>
  );
}
