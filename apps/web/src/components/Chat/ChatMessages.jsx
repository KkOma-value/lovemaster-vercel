import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { BrandMark, Avatar } from '../ui/brand';
import MarkdownRenderer from './MarkdownRenderer';
import ImageWithLightbox from './ImageWithLightbox';
import StatusSteps from './StatusSteps';
import StreamingStatus from './StreamingStatus';
import ProbabilityCard from './ProbabilityCard';
import ActionBar from './ActionBar';
import { createFeedbackEvent } from '../../services/chatApi';

const BUBBLE_RADIUS = 20;
const DWELL_THRESHOLD_MS = 3000;

const USER_BUBBLE_STYLE = {
  background: '#E89B7A',
  color: '#FFFAF5',
  padding: '12px 16px',
  borderRadius: `${BUBBLE_RADIUS}px ${BUBBLE_RADIUS}px 6px ${BUBBLE_RADIUS}px`,
  boxShadow: '0 6px 16px rgba(232,155,122,0.2)',
  fontSize: 15,
  lineHeight: 1.65,
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};

const AI_BUBBLE_STYLE = {
  background: '#FFFDF9',
  border: '1px solid var(--border-soft)',
  padding: '14px 18px',
  borderRadius: `6px ${BUBBLE_RADIUS}px ${BUBBLE_RADIUS}px ${BUBBLE_RADIUS}px`,
  boxShadow: '0 4px 14px rgba(196,123,90,0.06)',
  fontSize: 15,
  lineHeight: 1.75,
  color: 'var(--text-ink)',
  wordBreak: 'break-word',
};

// 助手消息可见时长 ≥ 阈值，静默上报 dwell 信号；同消息会话内仅一次。
const AssistantBubble = ({ children, chatId, runId, messageId }) => {
  const ref = useRef(null);
  const reportedRef = useRef(false);
  const timerRef = useRef(null);
  const dwellStartRef = useRef(0);

  useEffect(() => {
    if (!chatId || !messageId || !ref.current || reportedRef.current) return;
    const node = ref.current;

    const clearTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const tryReport = () => {
      if (reportedRef.current) return;
      reportedRef.current = true;
      const dwellSeconds = Math.max(0, Math.round((Date.now() - dwellStartRef.current) / 1000));
      try {
        createFeedbackEvent(null, chatId, runId || null, 'dwell', '', dwellSeconds, { messageId }).catch(() => {});
      } catch {
        // silent
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        clearTimer();
      }
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && document.visibilityState === 'visible') {
          if (!timerRef.current && !reportedRef.current) {
            dwellStartRef.current = Date.now();
            timerRef.current = window.setTimeout(tryReport, DWELL_THRESHOLD_MS);
          }
        } else {
          clearTimer();
        }
      });
    }, { threshold: 0.5 });

    observer.observe(node);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimer();
    };
  }, [chatId, runId, messageId]);

  return (
    <div ref={ref} style={AI_BUBBLE_STYLE}>
      {children}
    </div>
  );
};

const ChatMessages = ({ messages, streamingStatus, chatType, chatId, onRetry, onCopyAction }) => {
  const scrollContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const isUserScrollingRef = useRef(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
    isUserScrollingRef.current = !atBottom;
    setShowScrollBtn(!atBottom);
  }, []);

  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'instant',
      block: 'end',
    });
  }, []);

  useEffect(() => {
    if (!isUserScrollingRef.current) scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!isUserScrollingRef.current && streamingStatus) scrollToBottom();
  }, [streamingStatus, scrollToBottom]);

  const handleScrollToBottom = () => {
    isUserScrollingRef.current = false;
    setShowScrollBtn(false);
    scrollToBottom();
  };

  if (messages.length === 0 && !streamingStatus) return null;

  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto hide-scroll relative"
      onScroll={handleScroll}
    >
      <div className="px-6 py-6">
        <div className="max-w-[760px] mx-auto flex flex-col gap-4">
          {messages.map((message, index) => {
            const isUser = message.role === 'user';
            const messageKey = message.id || `idx_${index}`;

            if (isUser) {
              return (
                <div key={messageKey} className="flex justify-end gap-2 bubble-in">
                  <div
                    className="flex flex-col items-end gap-1"
                    style={{ maxWidth: '78%' }}
                  >
                    {message.imageUrl && (
                      <img
                        src={message.imageUrl}
                        alt="Uploaded"
                        style={{
                          maxWidth: 280,
                          maxHeight: 280,
                          borderRadius: 16,
                          objectFit: 'cover',
                          boxShadow: '0 6px 16px rgba(196,123,90,0.14)',
                        }}
                      />
                    )}
                    {message.content && (
                      <div style={USER_BUBBLE_STYLE}>{message.content}</div>
                    )}
                  </div>
                  <Avatar name="我" tone="peach" size={32} />
                </div>
              );
            }

            // Assistant message
            const fallbackImages = (message.images || []).filter(
              (img) => !message.content || !img.url || !message.content.includes(img.url)
            );
            const enableDwell = !message.isStreaming && !!message.content && !message.isError;

            return (
              <div key={messageKey} className="flex gap-2 bubble-in">
                <div style={{ flexShrink: 0 }}>
                  <BrandMark size={32} />
                </div>
                <div
                  className="flex flex-col gap-1.5"
                  style={{ maxWidth: '80%', minWidth: 0, flex: 1 }}
                >
                  <AssistantBubble
                    chatId={enableDwell ? chatId : null}
                    runId={message.runId || null}
                    messageId={enableDwell ? message.id : null}
                  >
                    {message.statusSteps?.length > 0 && (
                      <StatusSteps
                        steps={message.statusSteps}
                        isStreaming={message.isStreaming}
                        hasContent={!!message.content}
                      />
                    )}
                    {message.probability && (
                      <ProbabilityCard
                        {...message.probability}
                        onCopyAction={onCopyAction}
                      />
                    )}
                    {message.content && (
                      <MarkdownRenderer
                        content={message.content}
                        isStreaming={message.isStreaming}
                      />
                    )}
                    {message.isStreaming && message.content && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: 2,
                          height: '1em',
                          background: 'var(--primary)',
                          marginLeft: 2,
                          verticalAlign: 'middle',
                          animation: 'pulse 1s ease-in-out infinite',
                        }}
                      />
                    )}
                    {message.isStreaming &&
                      !message.content &&
                      !message.statusSteps?.length &&
                      streamingStatus && (
                        <StreamingStatus
                          type={streamingStatus.type}
                          content={streamingStatus.content}
                          isVisible={true}
                          onRetry={onRetry}
                        />
                      )}
                    {fallbackImages.length > 0 && (
                      <div
                        style={{
                          marginTop: 12,
                          paddingTop: 12,
                          borderTop: '1px dashed var(--border-soft)',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                          gap: 8,
                        }}
                      >
                        {fallbackImages.map((img, i) => (
                          <ImageWithLightbox
                            key={img.url || i}
                            src={img.url}
                            alt={img.name || '图片'}
                          />
                        ))}
                      </div>
                    )}
                    {message.isError && (
                      <div
                        style={{
                          marginTop: 8,
                          color: '#A55F5F',
                          fontSize: 13,
                        }}
                      >
                        {message.content}
                      </div>
                    )}
                  </AssistantBubble>
                  {!message.isStreaming && message.content && !message.isError && (
                    <ActionBar
                      chatType={chatType}
                      chatId={chatId}
                      messageId={message.id}
                      runId={message.runId || null}
                      answer={message.content}
                      thumbsStatus={message.thumbs || null}
                      onCopyAction={onCopyAction}
                    />
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {showScrollBtn && (
        <button
          onClick={handleScrollToBottom}
          aria-label="滚动到底部"
          className="grid place-items-center"
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#FFFDF9',
            border: '1px solid var(--border-soft)',
            color: 'var(--primary-dark)',
            boxShadow: '0 6px 18px rgba(196,123,90,0.2)',
            cursor: 'pointer',
          }}
        >
          <ChevronDown size={18} />
        </button>
      )}
    </div>
  );
};

export default ChatMessages;
