import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import { createFeedbackEvent } from '../../services/chatApi';
import { useChatRuntime } from '../../contexts/ChatRuntimeContext';

const ActionBar = ({
    chatType,
    chatId,
    messageId,
    runId,
    answer,
    thumbsStatus = null,
    onCopyAction
}) => {
    const { updateMessage } = useChatRuntime();
    const [copied, setCopied] = useState(false);

    const persistMessage = (patch) => {
        if (messageId) {
            updateMessage(chatType, chatId, messageId, patch);
        }
    };

    const reportSignal = (eventType, eventScore = 1.0, meta = {}) => {
        if (!chatId) return;
        try {
            createFeedbackEvent(null, chatId, runId, eventType, '', eventScore, meta).catch(() => {});
        } catch {
            // silent
        }
    };

    const handleCopy = () => {
        if (onCopyAction) onCopyAction(answer);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        reportSignal('copy', 1.0, messageId ? { messageId } : {});
    };

    const handleThumbsUp = async () => {
        if (!chatId || thumbsStatus === 'up') return;
        const previous = thumbsStatus;
        persistMessage({ thumbs: 'up' });
        try {
            await createFeedbackEvent(null, chatId, runId, 'thumbs_up', '', 1.0, messageId ? { messageId } : {});
        } catch {
            persistMessage({ thumbs: previous });
        }
    };

    const handleThumbsDown = async () => {
        if (!chatId || thumbsStatus === 'down') return;
        const previous = thumbsStatus;
        persistMessage({ thumbs: 'down' });
        try {
            await createFeedbackEvent(null, chatId, runId, 'thumbs_down', '', -1.0, messageId ? { messageId } : {});
        } catch {
            persistMessage({ thumbs: previous });
        }
    };

    return (
        <div className="flex items-center gap-1.5 mt-2 pt-2">
            <button
                type="button"
                className="flex items-center justify-center min-w-[32px] h-[32px] rounded-md transition-colors text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed border-none bg-transparent cursor-pointer"
                onClick={handleCopy}
                aria-label="复制回复到输入框"
            >
                {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button
                type="button"
                className={`flex items-center justify-center min-w-[32px] h-[32px] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer ${
                    thumbsStatus === 'up'
                        ? 'text-[var(--primary-dark)] bg-[#FCE7D5]'
                        : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
                onClick={handleThumbsUp}
                aria-label="点赞"
                disabled={!chatId}
            >
                <ThumbsUp size={16} />
            </button>
            <button
                type="button"
                className={`flex items-center justify-center min-w-[32px] h-[32px] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer ${
                    thumbsStatus === 'down'
                        ? 'text-[#A55F5F] bg-[#F8E0E0]'
                        : 'bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                }`}
                onClick={handleThumbsDown}
                aria-label="点踩"
                disabled={!chatId}
            >
                <ThumbsDown size={16} />
            </button>
        </div>
    );
};

export default ActionBar;
