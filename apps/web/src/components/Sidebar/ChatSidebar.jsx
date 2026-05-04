import React, { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Plus,
  ChevronLeft,
  Menu,
  LogOut,
  Heart,
  BookOpen,
  Trash2,
} from 'lucide-react';
import { BrandMark, Avatar } from '../ui/brand';
import { useAuth } from '../../contexts/AuthContext';
import { useImageUpload } from '../../hooks/useImageUpload';

function ModeBtn({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium"
      style={{
        borderRadius: 999,
        background: active ? '#E89B7A' : 'transparent',
        color: active ? '#FFFAF5' : 'var(--text-body)',
        boxShadow: active ? '0 4px 10px rgba(232,155,122,0.3)' : 'none',
        transition: 'all .2s',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {icon} {children}
    </button>
  );
}

function SessionItem({ chat, isActive, onSelect, onDelete, runStatus }) {
  const [hover, setHover] = useState(false);
  const isRunning = runStatus?.status === 'generating';

  const handleDelete = (e) => {
    e.stopPropagation();
    if (window.confirm(`确定删除「${chat.title || '新的对话'}」吗？`)) {
      onDelete(chat.id);
    }
  };

  return (
    <button
      onClick={() => onSelect(chat.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="w-full text-left flex items-start gap-2.5 px-2.5 py-2.5 mb-0.5"
      style={{
        borderRadius: 14,
        background: isActive ? '#FFFDF9' : 'transparent',
        boxShadow: isActive ? '0 4px 12px rgba(196,123,90,0.08), inset 0 1px 0 rgba(255,255,255,0.8)' : 'none',
        transition: 'background .2s',
        border: 'none',
        cursor: 'pointer',
      }}
    >
      <div className="mt-0.5 flex-shrink-0">
        {isRunning ? (
          <span
            className="inline-block"
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              border: '2px solid rgba(232,155,122,0.3)',
              borderTopColor: '#E89B7A',
              animation: 'spin 1s linear infinite',
            }}
          />
        ) : (
          <span
            className="inline-block"
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isActive ? '#E89B7A' : '#D8BF9F',
              opacity: isActive ? 1 : 0.5,
              marginTop: 2,
              marginLeft: 1,
            }}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-[13px] leading-snug truncate"
          style={{
            color: isActive ? 'var(--text-ink)' : 'var(--text-body)',
            fontWeight: isActive ? 500 : 400,
          }}
        >
          {chat.title || '新的对话'}
        </div>
        <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {isRunning ? '正在生成回复…' : (chat.createdAt ? new Date(chat.createdAt).toLocaleDateString('zh-CN') : '最近')}
        </div>
      </div>
      <span
        onClick={handleDelete}
        role="button"
        tabIndex={-1}
        className="grid place-items-center transition-opacity"
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          color: 'var(--text-muted)',
          opacity: hover ? 0.6 : 0,
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.6)}
      >
        <Trash2 size={12} />
      </span>
    </button>
  );
}

const ChatSidebar = ({
  isOpen,
  onToggle,
  onNewChat,
  currentChatId,
  chatList = [],
  onSelectChat,
  onDeleteChat,
  backgroundRuns = {},
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateAvatarUrl } = useAuth();
  const { compressImage, uploadImage } = useImageUpload();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const mode = location.pathname.includes('/chat/coach') ? 'coach' : 'companion';

  const handleModeSwitch = (next) => {
    if (next === mode) return;
    navigate(next === 'coach' ? '/chat/coach' : '/chat/loveapp');
  };

  const handleAvatarClick = () => {
    if (!isUploadingAvatar && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        setIsUploadingAvatar(true);
        await compressImage(file, { maxSizeMB: 0.5, maxWidthOrHeight: 400 });
        const result = await uploadImage('avatar');
        const url = result.url || result.fileName;
        updateAvatarUrl(url);
      } catch (err) {
        console.error('Avatar upload failed:', err);
      } finally {
        setIsUploadingAvatar(false);
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-20 grid place-items-center soft-card"
        style={{ width: 40, height: 40, borderRadius: 12, border: 'none', cursor: 'pointer', color: 'var(--text-body)' }}
        title="展开侧边栏"
      >
        <Menu size={18} />
      </button>
    );
  }

  return (
    <aside
      className="relative flex flex-col fade-up h-full"
      style={{
        width: 276,
        flexShrink: 0,
        background: 'rgba(247, 235, 221, 0.72)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        padding: '16px 14px',
        transition: 'width .25s ease',
        borderRight: '1px solid var(--border-soft)',
      }}
    >
      {/* Brand + collapse */}
      <div className="flex items-center gap-2 mb-4" style={{ padding: '4px' }}>
        <button
          onClick={() => navigate('/')}
          title="回到首页"
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
        >
          <BrandMark size={34} />
        </button>
        <div className="flex-1">
          <div className="display text-[16px] leading-none" style={{ color: 'var(--text-ink)' }}>
            Love Master
          </div>
          <div
            className="text-[10px] mt-1"
            style={{ color: 'var(--text-muted)', letterSpacing: '0.12em', fontFamily: 'var(--font-en)' }}
          >
            {mode === 'coach' ? 'COACH' : 'COMPANION'}
          </div>
        </div>
        <button
          onClick={onToggle}
          className="grid place-items-center"
          style={{ width: 32, height: 32, borderRadius: 10, color: 'var(--text-body)', border: 'none', background: 'transparent', cursor: 'pointer' }}
          title="收起侧边栏"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Mode switcher */}
      <div
        className="mb-4 p-1 flex gap-1"
        style={{
          background: 'rgba(255,253,249,0.6)',
          borderRadius: 999,
          border: '1px solid var(--border-soft)',
        }}
      >
        <ModeBtn
          active={mode === 'companion'}
          onClick={() => handleModeSwitch('companion')}
          icon={<Heart size={13} />}
        >
          陪伴
        </ModeBtn>
        <ModeBtn
          active={mode === 'coach'}
          onClick={() => handleModeSwitch('coach')}
          icon={<BookOpen size={13} />}
        >
          教练
        </ModeBtn>
      </div>

      {/* New chat */}
      <button
        onClick={onNewChat}
        className="flex items-center gap-2 mb-3 w-full"
        style={{
          padding: '10px 14px',
          background: '#E89B7A',
          color: '#FFFAF5',
          borderRadius: 14,
          boxShadow: '0 6px 16px rgba(232,155,122,0.32), inset 0 1px 0 rgba(255,255,255,0.4)',
          justifyContent: 'flex-start',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <Plus size={16} />
        <span className="text-sm font-medium">开启一段新对话</span>
      </button>

      <div
        className="text-[10px] uppercase tracking-widest mb-2 px-2"
        style={{ color: 'var(--text-muted)', letterSpacing: '0.16em' }}
      >
        最近
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto nice-scroll">
        {chatList.length === 0 ? (
          <div className="text-[12px] px-2 py-4" style={{ color: 'var(--text-faint)' }}>
            还没有对话 · 点上方「开启」开始吧
          </div>
        ) : (
          chatList.map((chat, idx) => (
            <div key={chat.id} className="fade-up" style={{ animationDelay: `${idx * 0.05}s` }}>
              <SessionItem
                chat={chat}
                isActive={currentChatId === chat.id}
                onSelect={onSelectChat}
                onDelete={onDeleteChat}
                runStatus={backgroundRuns[chat.id] || null}
              />
            </div>
          ))
        )}
      </div>

      {/* User footer */}
      {user ? (
        <div
          className="mt-2 pt-3 flex items-center gap-2.5"
          style={{ borderTop: '1px dashed var(--border-soft)' }}
        >
          <div
            style={{ position: 'relative', cursor: 'pointer', display: 'flex' }}
            onClick={handleAvatarClick}
            title="更换头像"
          >
            <Avatar
              name={user.name || user.email || '我'}
              tone="peach"
              size={34}
              src={user.avatarUrl || null}
            />
            {isUploadingAvatar && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255,250,245,0.7)',
                  borderRadius: '50%',
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: '2px solid #C47B5A',
                    borderTopColor: 'transparent',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              ref={fileInputRef}
              onChange={handleAvatarChange}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] truncate" style={{ color: 'var(--text-ink)' }}>
              {user.name || '你好'}
            </div>
            <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
              {user.email}
            </div>
          </div>
          <button
            className="grid place-items-center"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              color: 'var(--text-muted)',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
            }}
            onClick={logout}
            title="退出登录"
          >
            <LogOut size={15} />
          </button>
        </div>
      ) : (
        <div
          className="mt-2 pt-3 flex items-center gap-2 justify-center"
          style={{ borderTop: '1px dashed var(--border-soft)' }}
        >
          <Heart size={14} color="var(--primary-dark)" />
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--primary-dark)' }}>
            Love Master
          </span>
        </div>
      )}
    </aside>
  );
};

export default ChatSidebar;
