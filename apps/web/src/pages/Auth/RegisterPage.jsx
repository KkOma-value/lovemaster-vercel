import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import {
  AuthShell,
  Field,
  TabSwitch,
  AuthError,
  AuthDivider,
} from '../../components/Auth/AuthShell';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { register, googleLogin, isAuthenticated } = useAuth();

  // If already logged in, redirect to chat
  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }

  const getPasswordStrength = (pwd) => {
    if (!pwd) return 0;
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength; // 0 to 4
  };

  const strength = getPasswordStrength(password);
  const strengthColors = ['#DC2626', '#DC2626', '#E89B7A', '#3A8B7F', '#2A6B5F'];
  const strengthWidths = ['0%', '25%', '50%', '75%', '100%'];
  const strengthLabels = ['', '弱', '中等', '强', '非常强'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !confirmPassword) {
      setError('请填写所有必填字段');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 8) {
      setError('密码长度至少需要 8 个字符');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await register({ name, email, password });
      navigate('/chat/loveapp');
    } catch (err) {
      console.error(err);
      setError(err.message || '注册失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      heroEyebrow="加入我们"
      heroTitle={<>你的秘密<br />由我来守护</>}
      heroBody="建立账号，让所有的情绪和对话都有一个温暖的归宿。"
    >
      <TabSwitch mode="register" onSwitch={(m) => m === 'login' && navigate('/login')} />

      <h2 className="display text-[26px] mb-1" style={{ color: 'var(--text-ink)' }}>
        创建一个新账号
      </h2>
      <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
        欢迎来到 Love Master
      </p>

      <AuthError message={error} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field
          icon={<User size={16} />}
          type="text"
          value={name}
          onChange={setName}
          placeholder="怎样称呼你？"
          label="昵称"
          disabled={isLoading}
          autoComplete="name"
        />

        <Field
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
          <Field
            icon={<Lock size={16} />}
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            placeholder="最少 8 个字符"
            label="密码"
            disabled={isLoading}
            autoComplete="new-password"
            right={
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="grid place-items-center"
                style={{
                  width: 28,
                  height: 28,
                  color: 'var(--text-muted)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
                title={showPwd ? '隐藏密码' : '显示密码'}
              >
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />
          {password && (
            <div className="flex items-center gap-2 px-1">
              <div className="flex-1 h-1 bg-[var(--border-soft)] rounded-full overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: strengthWidths[strength],
                    background: strengthColors[strength]
                  }}
                />
              </div>
              <span className="text-[10px]" style={{ color: strengthColors[strength] }}>
                {strengthLabels[strength]}
              </span>
            </div>
          )}
        </div>

        <Field
          icon={<Lock size={16} />}
          type={showPwd ? 'text' : 'password'}
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="再次输入密码"
          label="确认密码"
          disabled={isLoading}
          autoComplete="new-password"
        />

        <button type="submit" className="btn-primary mt-2" disabled={isLoading} aria-busy={isLoading}>
          {isLoading ? '注册中…' : '创建账号'}
        </button>

        <AuthDivider />

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              setIsLoading(true);
              setError('');
              try {
                const data = await googleLogin(credentialResponse.credential);
                if (data.needsPassword) {
                  navigate('/set-password');
                } else {
                  navigate('/chat/loveapp');
                }
              } catch (err) {
                console.error(err);
                setError(err.response?.data?.error || 'Google 注册失败，请重试。');
              } finally {
                setIsLoading(false);
              }
            }}
            onError={() => {
              setError('Google 注册失败，请重试。');
            }}
            theme="outline"
            size="large"
            shape="pill"
            width="320"
            text="signup_with"
          />
        </div>
      </form>

      <div
        className="mt-4 text-[12px] text-center"
        style={{ color: 'var(--text-muted)' }}
      >
        已有账号？
        <Link
          to="/login"
          className="ml-1 hover:underline"
          style={{ color: 'var(--primary-dark)', fontWeight: 500 }}
        >
          立即登录
        </Link>
      </div>
    </AuthShell>
  );
}
