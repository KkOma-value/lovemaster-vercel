import React, { useEffect, useRef } from 'react';
import { Send, Image as ImageIcon } from 'lucide-react';
import ImageUpload from './ImageUpload';
import OptimizeButton from './OptimizeButton';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useOptimizePrompt } from '../../hooks/useOptimizePrompt';
import { toast } from '../../hooks/useToast';

const MAX_CHARS = 2000;

const ChatInput = ({ inputValue, setInputValue, onSend, isLoading, chatType = 'loveapp' }) => {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const uploadedUrlRef = useRef(null);
  const {
    compressImage,
    uploadImage,
    reset,
    isCompressing,
    isUploading,
    progress,
    preview,
    compressedFile,
    originalFile,
  } = useImageUpload();
  const { optimize, isOptimizing } = useOptimizePrompt();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  const handleReset = () => {
    uploadedUrlRef.current = null;
    reset();
  };

  const ensureImageUploaded = async () => {
    if (!compressedFile) return null;
    if (uploadedUrlRef.current) return uploadedUrlRef.current;
    const result = await uploadImage();
    const url = result.url || result.fileName;
    uploadedUrlRef.current = url;
    return url;
  };

  const handleSend = async () => {
    if (!inputValue.trim() && !compressedFile) return;
    let uploadedImageUrl = null;
    if (compressedFile) {
      try {
        uploadedImageUrl = await ensureImageUploaded();
      } catch (err) {
        console.error('Failed to upload', err);
        toast.error('图片上传失败，请重试');
        return;
      }
    }
    onSend(inputValue, uploadedImageUrl);
    handleReset();
  };

  const handleOptimize = async () => {
    if (!inputValue.trim() && !compressedFile) return;
    let imageUrl = null;
    if (compressedFile) {
      try {
        imageUrl = await ensureImageUploaded();
      } catch {
        toast.error('图片上传失败，将发送原文');
        return;
      }
    }
    const mode = chatType === 'coach' ? 'coach' : 'love';
    try {
      const optimizedText = await optimize({
        userMessage: inputValue,
        imageUrl,
        mode,
      });
      setInputValue(optimizedText.slice(0, MAX_CHARS));
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          el.focus();
          const end = el.value.length;
          el.setSelectionRange(end, end);
        }
      });
    } catch (err) {
      if (err.code === 'RATE_LIMITED') {
        toast.error('优化太频繁，请稍后再试');
      } else if (err.code === 'TIMEOUT') {
        toast.error('优化超时，将发送原文');
      } else {
        toast.error('优化失败，将发送原文');
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const hasContent = !!inputValue.trim() || !!compressedFile;
  const canSend = hasContent && !isLoading && !isUploading && !isOptimizing;
  const canOptimize =
    hasContent && !isLoading && !isUploading && !isOptimizing && !isCompressing;
  const charCount = inputValue.length;

  return (
    <div
      className="soft-card relative"
      style={{
        padding: '14px 16px 12px',
        boxShadow: '0 10px 32px rgba(196,123,90,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
      }}
    >
      {preview && (
        <div style={{ marginBottom: 10 }}>
          <ImageUpload
            previewUrl={preview}
            isCompressing={isCompressing}
            isUploading={isUploading}
            progress={progress}
            fileName={originalFile?.name}
            originalSize={originalFile?.size}
            compressedSize={compressedFile?.size}
            onClear={handleReset}
          />
        </div>
      )}

      <textarea
        ref={textareaRef}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value.slice(0, MAX_CHARS))}
        onKeyDown={handleKeyDown}
        placeholder="把今天的心情，慢慢说给我听…"
        className="w-full resize-none body-font text-[15px] leading-relaxed bg-transparent"
        style={{
          color: 'var(--text-ink)',
          minHeight: 60,
          border: 'none',
          outline: 'none',
          fontFamily: 'var(--font-body)',
        }}
        rows={2}
        disabled={isLoading || isUploading}
      />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="上传截图"
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompressing || isUploading}
            className="grid place-items-center"
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              color: 'var(--text-body)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'all .2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg-peach)';
              e.currentTarget.style.color = 'var(--primary-dark)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--text-body)';
            }}
          >
            <ImageIcon size={16} />
          </button>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                uploadedUrlRef.current = null;
                compressImage(file);
              }
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
          />
          <OptimizeButton
            disabled={!canOptimize}
            isOptimizing={isOptimizing}
            onClick={handleOptimize}
          />
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {charCount}/{MAX_CHARS}
          </span>
          <button
            onClick={handleSend}
            disabled={!canSend}
            className="grid place-items-center"
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              background: canSend ? '#E89B7A' : '#EDE4D8',
              color: canSend ? '#FFFAF5' : '#B09080',
              boxShadow: canSend ? '0 8px 20px rgba(232,155,122,0.4)' : 'none',
              transition: 'all .2s',
              border: 'none',
              cursor: canSend ? 'pointer' : 'not-allowed',
            }}
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
