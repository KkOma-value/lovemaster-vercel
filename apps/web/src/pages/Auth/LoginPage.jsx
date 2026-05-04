import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../contexts/AuthContext';
import {
  AuthShell,
  Field,
  TabSwitch,
  AuthError,
  AuthDivider,
} from '../../components/Auth/AuthShell';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { login, googleLogin, isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to="/chat/loveapp" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('请填写邮箱和密码');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await login({ email, password, remember });
      navigate('/chat/loveapp');
    } catch (err) {
      console.error(err);
      setError(err.message || '登录失败，请检查邮箱或密码');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      heroEyebrow="欢迎回来"
      heroTitle={<>爱不是一个人<br />读懂全世界</>}
      heroBody="登录后，你的聊天记录会被安全加密保存，只有你自己能看见。"
    >
      <TabSwitch mode="login" onSwitch={(m) => m === 'register' && navigate('/register')} />

      <h2 className="display text-[26px] mb-1" style={{ color: 'var(--text-ink)' }}>
        很高兴又见到你
      </h2>
      <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
        你的小助手已经在这里等着了
      </p>

      <AuthError message={error} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
        <Field
          icon={<Lock size={16} />}
          type={showPwd ? 'text' : 'password'}
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
          label="密码"
          disabled={isLoading}
          autoComplete="current-password"
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

        <div className="flex items-center justify-between text-[12px]">
          <label
            className="flex items-center gap-1.5 cursor-pointer"
            style={{ color: 'var(--text-body)' }}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ accentColor: 'var(--primary)' }}
            />
            记住我
          </label>
          <button
            type="button"
            className="hover:underline"
            style={{
              color: 'var(--primary-dark)',
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
              setIsLoading(true);
              setError('');
              try {
                const data = await googleLogin(credentialResponse.credential);
                navigate(data.needsPassword ? '/set-password' : '/chat/loveapp');
              } catch (err) {
                console.error(err);
                setError(err.response?.data?.error || 'Google 登录失败，请重试');
              } finally {
                setIsLoading(false);
              }
            }}
            onError={() => setError('Google 登录失败，请重试')}
            theme="outline"
            size="large"
            shape="pill"
            width="320"
            text="signin_with"
          />
        </div>
      </form>

      <div
        className="mt-4 text-[12px] text-center"
        style={{ color: 'var(--text-muted)' }}
      >
        还没有账号？
        <Link
          to="/register"
          className="ml-1 hover:underline"
          style={{ color: 'var(--primary-dark)', fontWeight: 500 }}
        >
          立即注册
        </Link>
      </div>
    </AuthShell>
  );
}
