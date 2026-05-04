import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  AuthShell,
  Field,
  AuthError,
} from '../../components/Auth/AuthShell';

export default function SetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const { setPassword: setPasswordFn, needsPassword, isAuthenticated } = useAuth();

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If password already set, redirect to chat
  if (!needsPassword) {
    return <Navigate to="/chat/loveapp" replace />;
  }

  const getPasswordStrength = (pwd) => {
    if (!pwd) return 0;
    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (/[A-Z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[^A-Za-z0-9]/.test(pwd)) strength++;
    return strength;
  };

  const strength = getPasswordStrength(password);
  const strengthColors = ['#DC2626', '#DC2626', '#E89B7A', '#3A8B7F', '#2A6B5F'];
  const strengthWidths = ['0%', '25%', '50%', '75%', '100%'];
  const strengthLabels = ['', '弱', '中等', '强', '非常强'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('请填写所有必填字段');
      return;
    }
    if (password.length < 8) {
      setError('密码长度至少需要 8 个字符');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await setPasswordFn(password);
      navigate('/chat/loveapp');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || '设置密码失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      heroEyebrow="安全保护"
      heroTitle={<>为你的账号<br />添一把锁</>}
      heroBody="设置一个本地密码，让你的数据更加安全。"
    >
      <h2 className="display text-[26px] mb-1" style={{ color: 'var(--text-ink)' }}>
        设置密码
      </h2>
      <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
        因为你是通过 Google 选择注册，请为 Love Master 单独设置一个登录密码。
      </p>

      <AuthError message={error} />

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Field
            icon={<Lock size={16} />}
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={setPassword}
            placeholder="最少 8 个字符"
            label="设置密码"
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
            <div className="flex items-center gap-2 px-1 mt-1">
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

        <button type="submit" className="btn-primary mt-4" disabled={isLoading} aria-busy={isLoading}>
          {isLoading ? '设置中…' : '完成设置'}
        </button>
      </form>
    </AuthShell>
  );
}
