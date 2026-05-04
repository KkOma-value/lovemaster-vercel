import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { Home, Heart, BookOpen } from 'lucide-react';
import { BrandMark } from '../ui/brand';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import BackgroundRunsPill from './BackgroundRunsPill';
import RecoveryBanner from './RecoveryBanner';

const SUGGESTIONS = {
  loveapp: ['他今天没回我消息', '我们刚吵了架', '想约 TA 出去不知道怎么说', '心情有点乱'],
  coach: ['帮我看看这段对话', '他说这句话是什么意思', '我该怎么回复', '分析一下对方的态度'],
};

const ChatArea = ({
  messages = [],
  onSendMessage,
  inputValue,
  setInputValue,
  isLoading,
  streamingStatus,
  chatType = 'loveapp',
  chatId,
  activeRunCount = 0,
  onNavigateToRun,
  recoveryStatus = null,
  onRecoveryDismiss,
}) => {
  const navigate = useNavigate();
  const isWelcomeState = messages.length === 0;
  const isCoach = chatType === 'coach';
  const suggestions = SUGGESTIONS[isCoach ? 'coach' : 'loveapp'];

  const handleCopyAction = (text) => {
    if (!text) return;
    setInputValue(text);
  };

  return (
    <div
      className="grain relative w-full h-full flex flex-col overflow-hidden"
      style={{ minWidth: 0, background: 'rgba(251, 244, 236, 0.55)' }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-3.5 flex-shrink-0"
        style={{
          borderBottom: '1px solid var(--border-soft)',
          background: 'rgba(255,253,249,0.6)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate('/')}
            className="btn-ghost flex items-center gap-1.5 text-xs"
            title="回到首页"
          >
            <Home size={14} /> 回家
          </button>
          <div className="h-5 w-px" style={{ background: 'var(--border-soft)' }} />
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 flex-shrink-0"
              style={{
                background: isCoach ? 'var(--sage-soft)' : 'var(--bg-peach)',
                color: isCoach ? '#4C7566' : 'var(--primary-dark)',
                borderRadius: 999,
                fontWeight: 500,
              }}
            >
              {isCoach ? <BookOpen size={11} /> : <Heart size={11} />}
              {isCoach ? '教练模式' : '陪伴模式'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <BackgroundRunsPill activeCount={activeRunCount} onNavigate={onNavigateToRun} />
          <span className="text-[11px] flex items-center" style={{ color: 'var(--text-muted)' }}>
            <span
              className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
              style={{ background: '#8FB09F', boxShadow: '0 0 0 2px rgba(143,176,159,0.3)' }}
            />
            在线
          </span>
        </div>
      </header>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {isWelcomeState ? (
            <div
              key="welcome"
              className="h-full flex flex-col items-center justify-center px-6 pb-8 gap-6 fade-up"
            >
              <div className="breathe">
                <BrandMark size={64} />
              </div>
              <div className="text-center">
                <h2
                  className="display text-[28px] mb-2"
                  style={{ color: 'var(--text-ink)' }}
                >
                  {isCoach ? '把聊天记录发给我看看' : '今天，想聊点什么？'}
                </h2>
                <p
                  className="text-[15px] max-w-[440px] leading-relaxed mx-auto"
                  style={{ color: 'var(--text-body)' }}
                >
                  {isCoach
                    ? '我帮你分析对话里的细节，给出最懂人心的建议。'
                    : '不管是高兴还是难受，都可以说给我听。没有评判，只有陪伴。'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-[520px]">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInputValue(s)}
                    className="text-[13px] px-4 py-2"
                    style={{
                      background: 'rgba(255,253,249,0.7)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: 999,
                      color: 'var(--text-body)',
                      transition: 'all .2s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FFFDF9';
                      e.currentTarget.style.color = 'var(--primary-dark)';
                      e.currentTarget.style.borderColor = 'var(--primary-soft)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255,253,249,0.7)';
                      e.currentTarget.style.color = 'var(--text-body)';
                      e.currentTarget.style.borderColor = 'var(--border-soft)';
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                Lovemaster 会犯错，重要的决定请由你来做
              </p>
            </div>
          ) : (
            <div
              key="messages"
              className="h-full flex flex-col fade-up"
            >
              <RecoveryBanner status={recoveryStatus} onDismiss={onRecoveryDismiss} />
              <ChatMessages
                messages={messages}
                streamingStatus={streamingStatus}
                onCopyAction={handleCopyAction}
                chatType={chatType}
                chatId={chatId}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Input dock */}
      <div className="px-6 pb-6 pt-2 flex-shrink-0">
        <div className="max-w-[760px] mx-auto">
          <ChatInput
            inputValue={inputValue}
            setInputValue={setInputValue}
            onSend={onSendMessage}
            isLoading={isLoading}
            chatType={chatType}
          />
          <div
            className="text-center mt-2 text-[10.5px]"
            style={{ color: 'var(--text-faint)' }}
          >
            Lovemaster 会犯错，重要的决定请由你来做 · Enter 发送，Shift+Enter 换行
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
