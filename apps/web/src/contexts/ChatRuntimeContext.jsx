/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import {
    createCoachSSE,
    createFeedbackEvent,
    createLoveAppSSE,
    deleteChatSession,
    getActiveRuns,
    getChatImages,
    getChatMessages,
    getChatRun,
    getChatSessions
} from '../services/chatApi';

const ChatRuntimeContext = createContext(null);

const ACTIVE_STATUSES = new Set(['QUEUED', 'RUNNING']);
const RECOVERY_POLL_INTERVAL_MS = 3000;
const CHAT_TYPES = ['loveapp', 'coach'];
const CACHE_STORAGE_KEY = 'lovemaster.chat-cache.v1';
const CACHE_VERSION = 1;

// Implicit signal config (silent sedimentation v2.0)
const FOLLOW_UP_WINDOW_MS = 5 * 60 * 1000;       // 5 分钟内追问视为 follow_up
const QUOTE_MIN_OVERLAP = 8;                      // 复述/引用最小重合字符数
const QUOTE_MAX_LEN = 2000;                       // 防止过长字符串导致 LCS 性能问题
const RETURN_VISIT_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 跨日 24h
const VISIT_TIMESTAMPS_KEY = 'lovemaster.chat-visits.v1';

const reportSignal = (chatId, runId, eventType, eventScore = 1.0, meta = {}) => {
    if (!chatId || !eventType) return;
    try {
        createFeedbackEvent(null, chatId, runId || null, eventType, '', eventScore, meta).catch(() => {});
    } catch {
        // silent
    }
};

// 简易 LCS（最长公共子串），返回最长匹配长度。
// 仅用于隐式 quote 信号检测，输入截断到 QUOTE_MAX_LEN 控制成本。
const longestCommonSubstring = (a, b) => {
    if (!a || !b) return 0;
    const s1 = a.length > QUOTE_MAX_LEN ? a.slice(0, QUOTE_MAX_LEN) : a;
    const s2 = b.length > QUOTE_MAX_LEN ? b.slice(0, QUOTE_MAX_LEN) : b;
    const n = s1.length;
    const m = s2.length;
    let prev = new Array(m + 1).fill(0);
    let curr = new Array(m + 1).fill(0);
    let best = 0;
    for (let i = 1; i <= n; i++) {
        for (let j = 1; j <= m; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                curr[j] = prev[j - 1] + 1;
                if (curr[j] > best) best = curr[j];
            } else {
                curr[j] = 0;
            }
        }
        const tmp = prev;
        prev = curr;
        curr = tmp;
        curr.fill(0);
    }
    return best;
};

const readVisitTimestamps = () => {
    if (typeof window === 'undefined' || !window.localStorage) return {};
    try {
        const raw = window.localStorage.getItem(VISIT_TIMESTAMPS_KEY);
        return raw ? (JSON.parse(raw) || {}) : {};
    } catch {
        return {};
    }
};

const writeVisitTimestamp = (chatId, ts) => {
    if (typeof window === 'undefined' || !window.localStorage || !chatId) return;
    try {
        const map = readVisitTimestamps();
        map[chatId] = ts;
        window.localStorage.setItem(VISIT_TIMESTAMPS_KEY, JSON.stringify(map));
    } catch {
        // silent
    }
};

const buildChatKey = (chatType, chatId) => {
    if (!chatType || !chatId) {
        return null;
    }
    return `${chatType}:${chatId}`;
};

const createEmptySessionsState = () => ({
    loveapp: { list: [], currentId: null, loaded: false },
    coach: { list: [], currentId: null, loaded: false }
});

const readCachedSnapshot = () => {
    if (typeof window === 'undefined' || !window.sessionStorage) {
        return null;
    }
    try {
        const raw = window.sessionStorage.getItem(CACHE_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed?.version !== CACHE_VERSION) return null;
        return parsed;
    } catch {
        return null;
    }
};

const writeCachedSnapshot = (snapshot) => {
    if (typeof window === 'undefined' || !window.sessionStorage) {
        return;
    }
    try {
        window.sessionStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
        console.warn('Failed to persist chat cache:', error);
    }
};

const clearCachedSnapshot = () => {
    if (typeof window === 'undefined' || !window.sessionStorage) {
        return;
    }
    try {
        window.sessionStorage.removeItem(CACHE_STORAGE_KEY);
    } catch {
        // ignore
    }
};

let messageIdCounter = 0;
const generateMessageId = () => `msg_${Date.now().toString(36)}_${++messageIdCounter}`;

const ensureMessageIds = (messages) => {
    if (!Array.isArray(messages)) return messages;
    let mutated = false;
    const result = messages.map(msg => {
        if (!msg || typeof msg !== 'object' || msg.id) return msg;
        mutated = true;
        return { ...msg, id: generateMessageId() };
    });
    return mutated ? result : messages;
};

const sanitizeMessagesForCache = (messages) => {
    if (!Array.isArray(messages)) return [];
    return messages
        .filter(msg => !msg?.isStreaming)
        .map(msg => {
            const { isStreaming: _isStreaming, statusSteps: _statusSteps, ...rest } = msg;
            return rest;
        });
};

const createEmptyRuntime = (chatType = 'loveapp', chatId = null) => ({
    chatType,
    chatId,
    messages: [],
    isLoading: false,
    streamingStatus: null,
    runId: null,
    runStatus: 'IDLE',
    lastEventType: null,
    latestStatusText: '',
    partialResponse: '',
    errorMessage: null,
    hasLocalConnection: false
});

const cleanContent = (text) => {
    if (!text) {
        return text;
    }
    let cleaned = text.replace(/\{\{[^}]*\}\}/g, '');
    cleaned = cleaned.replace(/\{\{/g, '').replace(/\}\}/g, '');
    return cleaned.trim();
};

const parseSSEMessage = (rawData) => {
    if (rawData === '[DONE]') {
        return { type: 'done', content: '', data: null };
    }

    try {
        const parsed = JSON.parse(rawData);
        if (parsed === null || typeof parsed !== 'object') {
            return { type: 'content', content: cleanContent(String(parsed)), data: null };
        }
        return {
            type: parsed.type || 'content',
            content: cleanContent(parsed.content || ''),
            data: parsed.data || null
        };
    } catch {
        return { type: 'content', content: cleanContent(rawData), data: null };
    }
};

const createStatusStep = (type, content) => ({
    type,
    content,
    timestamp: Date.now()
});

const appendUserMessage = (messages, content, imageUrl = null) => [
    ...messages,
    { role: 'user', content, ...(imageUrl && { imageUrl }) }
];

const upsertStatusStep = (messages, type, content) => {
    const step = createStatusStep(type, content);
    const lastMessage = messages[messages.length - 1];

    if (lastMessage?.role === 'assistant' && lastMessage.isStreaming) {
        const steps = lastMessage.statusSteps || [];
        const nextSteps = steps.length > 0 && steps[steps.length - 1].type === type
            ? [...steps.slice(0, -1), step]
            : [...steps, step];
        return [
            ...messages.slice(0, -1),
            { ...lastMessage, statusSteps: nextSteps }
        ];
    }

    return [
        ...messages,
        { role: 'assistant', content: '', isStreaming: true, statusSteps: [step] }
    ];
};

const appendStreamingContent = (messages, chunk) => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.isStreaming) {
        return [
            ...messages.slice(0, -1),
            { ...lastMessage, content: `${lastMessage.content || ''}${chunk}` }
        ];
    }

    return [
        ...messages,
        { role: 'assistant', content: chunk, isStreaming: true }
    ];
};

const attachProbabilityToLatestAssistant = (messages, probability) => {
    if (!probability || typeof probability !== 'object') {
        return messages;
    }
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant') {
        return [
            ...messages.slice(0, -1),
            { ...lastMessage, probability }
        ];
    }
    return [
        ...messages,
        { role: 'assistant', content: '', isStreaming: true, probability }
    ];
};

const appendImageToStreamingMessage = (messages, imageData) => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant') {
        const existingImages = lastMessage.images || [];
        const isDuplicate = existingImages.some(img =>
            img.url === imageData.url || (img.name === imageData.name && img.url === imageData.url)
        );
        if (isDuplicate) return messages;
        return [
            ...messages.slice(0, -1),
            { ...lastMessage, images: [...existingImages, imageData] }
        ];
    }
    return messages;
};

const replaceLastAssistantContent = (messages, newContent) => {
    const lastIdx = messages.length - 1;
    if (lastIdx >= 0 && messages[lastIdx]?.role === 'assistant') {
        return [
            ...messages.slice(0, lastIdx),
            { ...messages[lastIdx], content: newContent }
        ];
    }
    return messages;
};

const finalizeStreamingMessage = (messages) => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.isStreaming) {
        return [
            ...messages.slice(0, -1),
            { ...lastMessage, isStreaming: false }
        ];
    }
    return messages;
};

const appendErrorMessage = (messages, message) => [
    ...messages,
    { role: 'assistant', content: message, isError: true }
];

const restoreStreamingMessage = (messages, lastEventType, latestStatusText, partialResponse) => {
    const lastMessage = messages[messages.length - 1];
    const statusStep = latestStatusText
        ? [createStatusStep(lastEventType || 'status', latestStatusText)]
        : [];

    if (lastMessage?.role === 'assistant' && lastMessage.isStreaming) {
        return [
            ...messages.slice(0, -1),
            {
                ...lastMessage,
                content: partialResponse || lastMessage.content || '',
                statusSteps: statusStep.length > 0 ? statusStep : (lastMessage.statusSteps || [])
            }
        ];
    }

    return [
        ...messages,
        {
            role: 'assistant',
            content: partialResponse || '',
            isStreaming: true,
            ...(statusStep.length > 0 ? { statusSteps: statusStep } : {})
        }
    ];
};

const finalizeRecoveredMessages = (messages, partialResponse) => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.isStreaming) {
        return [
            ...messages.slice(0, -1),
            {
                ...lastMessage,
                content: partialResponse || lastMessage.content || '',
                isStreaming: false
            }
        ];
    }
    if (messages.length === 0 && partialResponse) {
        return [{ role: 'assistant', content: partialResponse }];
    }
    return messages;
};

export function useChatRuntime() {
    return useContext(ChatRuntimeContext);
}

export function ChatRuntimeProvider({ children }) {
    const { isAuthenticated } = useAuth();

    const [runtimes, setRuntimes] = useState(() => {
        const cached = readCachedSnapshot();
        if (!cached?.runtimes) return {};
        const hydrated = {};
        Object.entries(cached.runtimes).forEach(([key, entry]) => {
            const [chatType, chatId] = key.split(':');
            if (!chatType || !chatId) return;
            hydrated[key] = {
                ...createEmptyRuntime(chatType, chatId),
                messages: Array.isArray(entry?.messages) ? entry.messages : []
            };
        });
        return hydrated;
    });

    const [sessionsByType, setSessionsByType] = useState(() => {
        const cached = readCachedSnapshot();
        if (!cached?.sessionsByType) return createEmptySessionsState();
        const next = createEmptySessionsState();
        CHAT_TYPES.forEach(ct => {
            const entry = cached.sessionsByType[ct];
            if (entry && Array.isArray(entry.list)) {
                next[ct] = {
                    list: entry.list,
                    currentId: entry.currentId || (entry.list[0]?.id || null),
                    loaded: false // cache is stale, will revalidate
                };
            }
        });
        return next;
    });

    const runtimesRef = useRef(runtimes);
    const sessionsRef = useRef(sessionsByType);
    const connectionsRef = useRef(new Map());
    const listenersRef = useRef(new Map());
    const recoveryPollRunIdsRef = useRef(new Set());
    const messagesLoadPromiseRef = useRef(new Map());
    const sessionsLoadPromiseRef = useRef(new Map());
    // 最近一次助手消息完成时间，键为 chatKey；用于 follow_up 时间窗判定
    const lastAssistantFinishedAtRef = useRef(new Map());
    // 当前活跃会话进入时间，用于 session_retention 时长上报
    const activeChatRef = useRef(null); // { chatType, chatId, enteredAt }

    useEffect(() => {
        runtimesRef.current = runtimes;
    }, [runtimes]);

    useEffect(() => {
        sessionsRef.current = sessionsByType;
    }, [sessionsByType]);

    const closeConnectionByKey = useCallback((chatKey) => {
        const existing = connectionsRef.current.get(chatKey);
        if (existing) {
            existing.close();
            connectionsRef.current.delete(chatKey);
        }
    }, []);

    const updateRuntime = useCallback((chatType, chatId, updater) => {
        const chatKey = buildChatKey(chatType, chatId);
        if (!chatKey) {
            return;
        }

        setRuntimes(prev => {
            const current = prev[chatKey] || createEmptyRuntime(chatType, chatId);
            const next = typeof updater === 'function' ? updater(current) : updater;
            const normalizedMessages = ensureMessageIds(next.messages);
            return {
                ...prev,
                [chatKey]: {
                    ...createEmptyRuntime(chatType, chatId),
                    ...next,
                    messages: normalizedMessages,
                    chatType,
                    chatId
                }
            };
        });
    }, []);

    const updateMessage = useCallback((chatType, chatId, messageId, patch) => {
        if (!messageId) return;
        setRuntimes(prev => {
            const chatKey = buildChatKey(chatType, chatId);
            if (!chatKey) return prev;
            const current = prev[chatKey];
            if (!current) return prev;
            const nextMessages = current.messages.map(msg =>
                msg.id === messageId
                    ? { ...msg, ...(typeof patch === 'function' ? patch(msg) : patch) }
                    : msg
            );
            return {
                ...prev,
                [chatKey]: { ...current, messages: nextMessages }
            };
        });
    }, []);

    const refreshChatMessages = useCallback(async (chatType, chatId) => {
        if (!chatId) {
            return;
        }
        try {
            const messages = await getChatMessages(chatId, chatType);
            let nextMessages = Array.isArray(messages) ? messages : [];

            // Coach 模式：加载会话图片并附加到最后一条 assistant 消息
            if (chatType === 'coach' && nextMessages.length > 0) {
                try {
                    const images = await getChatImages(chatId, chatType);
                    if (Array.isArray(images) && images.length > 0) {
                        const lastAssistantIdx = nextMessages.findLastIndex(m => m.role === 'assistant');
                        if (lastAssistantIdx >= 0) {
                            nextMessages = [...nextMessages];
                            nextMessages[lastAssistantIdx] = {
                                ...nextMessages[lastAssistantIdx],
                                images
                            };
                        }
                    }
                } catch (error) {
                    console.error('Failed to load images during refresh:', error);
                }
            }

            updateRuntime(chatType, chatId, current => {
                // 如果有本地连接且正在流式传输，保留当前状态
                if (current.hasLocalConnection && current.messages.some(message => message.isStreaming)) {
                    return current;
                }

                return {
                    ...current,
                    messages: nextMessages
                };
            });
        } catch (error) {
            console.error('Failed to refresh chat messages:', error);
        }
    }, [updateRuntime]);

    const applyRunSnapshot = useCallback((run) => {
        if (!run?.chatId || !run?.chatType) {
            return;
        }

        updateRuntime(run.chatType, run.chatId, current => {
            const isActive = ACTIVE_STATUSES.has(run.status);
            let nextMessages = current.messages;

            if (!current.hasLocalConnection) {
                if (isActive) {
                    nextMessages = restoreStreamingMessage(
                        current.messages,
                        run.lastEventType,
                        run.latestStatusText,
                        run.partialResponse
                    );
                } else {
                    nextMessages = finalizeRecoveredMessages(current.messages, run.partialResponse);
                    if (run.status === 'FAILED' && run.errorMessage) {
                        const lastMessage = nextMessages[nextMessages.length - 1];
                        if (!lastMessage?.isError || lastMessage.content !== run.errorMessage) {
                            nextMessages = appendErrorMessage(nextMessages, run.errorMessage);
                        }
                    }
                }
            }

            return {
                ...current,
                runId: run.runId,
                runStatus: run.status,
                lastEventType: run.lastEventType,
                latestStatusText: run.latestStatusText || '',
                partialResponse: run.partialResponse || current.partialResponse,
                errorMessage: run.errorMessage,
                isLoading: isActive,
                streamingStatus: isActive && run.latestStatusText
                    ? { type: run.lastEventType || 'status', content: run.latestStatusText }
                    : null,
                messages: nextMessages
            };
        });
    }, [updateRuntime]);

    const hydrateMessages = useCallback((chatType, chatId, messages) => {
        updateRuntime(chatType, chatId, current => {
            // 如果有本地连接且正在流式传输，保留当前状态
            if (current.hasLocalConnection && current.messages.some(message => message.isStreaming)) {
                return current;
            }

            // 如果当前处于活跃状态（QUEUED/RUNNING），不要覆盖现有消息
            if (ACTIVE_STATUSES.has(current.runStatus) && current.messages.length > 0) {
                return current;
            }

            let nextMessages = Array.isArray(messages) ? messages : [];
            return {
                ...current,
                messages: nextMessages
            };
        });
    }, [updateRuntime]);

    const clearChatRuntime = useCallback((chatType, chatId) => {
        const chatKey = buildChatKey(chatType, chatId);
        if (!chatKey) {
            return;
        }
        closeConnectionByKey(chatKey);
        listenersRef.current.delete(chatKey);
        setRuntimes(prev => {
            const next = { ...prev };
            delete next[chatKey];
            return next;
        });
    }, [closeConnectionByKey]);

    const registerParsedMessageListener = useCallback((chatType, chatId, listener) => {
        const chatKey = buildChatKey(chatType, chatId);
        if (!chatKey || typeof listener !== 'function') {
            return () => {};
        }

        listenersRef.current.set(chatKey, listener);
        return () => {
            const currentListener = listenersRef.current.get(chatKey);
            if (currentListener === listener) {
                listenersRef.current.delete(chatKey);
            }
        };
    }, []);

    const handleParsedMessage = useCallback((chatType, chatId, parsed) => {
        updateRuntime(chatType, chatId, current => {
            switch (parsed.type) {
                case 'run_started':
                    return {
                        ...current,
                        runId: parsed.data?.runId || current.runId,
                        runStatus: parsed.data?.status || 'QUEUED',
                        hasLocalConnection: true
                    };

                case 'thinking':
                case 'status':
                case 'intake_status':
                case 'ocr_result':
                case 'rewrite_result':
                case 'rag_status':
                case 'probability_status':
                case 'tool_call':
                    return {
                        ...current,
                        messages: upsertStatusStep(current.messages, parsed.type, parsed.content),
                        isLoading: true,
                        runStatus: 'RUNNING',
                        lastEventType: parsed.type,
                        latestStatusText: parsed.content,
                        streamingStatus: { type: parsed.type, content: parsed.content }
                    };

                case 'probability_result': {
                    const prob = parsed.data?.probability;
                    if (!prob) return current;
                    return {
                        ...current,
                        messages: attachProbabilityToLatestAssistant(current.messages, prob),
                        isLoading: true,
                        runStatus: 'RUNNING',
                        lastEventType: 'probability_result'
                    };
                }

                case 'content':
                    return {
                        ...current,
                        messages: appendStreamingContent(current.messages, parsed.content),
                        isLoading: true,
                        runStatus: 'RUNNING',
                        lastEventType: 'content',
                        partialResponse: `${current.partialResponse || ''}${parsed.content || ''}`,
                        streamingStatus: null
                    };

                case 'done': {
                    const chatKeyForDone = buildChatKey(chatType, chatId);
                    if (chatKeyForDone) {
                        lastAssistantFinishedAtRef.current.set(chatKeyForDone, Date.now());
                    }
                    return {
                        ...current,
                        messages: finalizeStreamingMessage(current.messages),
                        isLoading: false,
                        runId: parsed.data?.runId || current.runId,
                        runStatus: parsed.data?.status || 'COMPLETED',
                        lastEventType: 'done',
                        latestStatusText: '',
                        streamingStatus: null,
                        hasLocalConnection: false
                    };
                }

                case 'error':
                    return {
                        ...current,
                        messages: appendErrorMessage(finalizeStreamingMessage(current.messages), parsed.content || '抱歉，AI 服务暂时不可用。'),
                        isLoading: false,
                        runStatus: 'FAILED',
                        lastEventType: 'error',
                        latestStatusText: parsed.content || '',
                        errorMessage: parsed.content || '',
                        streamingStatus: null,
                        hasLocalConnection: false
                    };

                case 'content_replace':
                    if (parsed.content) {
                        return {
                            ...current,
                            messages: replaceLastAssistantContent(current.messages, parsed.content)
                        };
                    }
                    return current;

                case 'file_created':
                    if (parsed.data?.type === 'image' && parsed.data?.url) {
                        return {
                            ...current,
                            messages: appendImageToStreamingMessage(current.messages, {
                                type: parsed.data.type,
                                name: parsed.data.name || '',
                                url: parsed.data.url
                            })
                        };
                    }
                    return current;

                default:
                    if (!parsed.content) {
                        return current;
                    }
                    return {
                        ...current,
                        messages: appendStreamingContent(current.messages, parsed.content),
                        isLoading: true,
                        runStatus: 'RUNNING',
                        lastEventType: 'content',
                        partialResponse: `${current.partialResponse || ''}${parsed.content || ''}`,
                        streamingStatus: null
                    };
            }
        });
    }, [updateRuntime]);

    const sendMessage = useCallback(async ({
        chatType,
        chatId,
        message,
        imageUrl = null
    }) => {
        if (!chatId) {
            throw new Error('chatId is required to send a message');
        }

        const userMessage = (message || '').trim();
        if (!userMessage && !imageUrl) {
            return;
        }

        const chatKey = buildChatKey(chatType, chatId);

        // 隐式信号：follow_up + quote（基于上一条助手消息）
        if (chatKey && userMessage) {
            const currentRuntime = runtimesRef.current[chatKey];
            const msgs = currentRuntime?.messages || [];
            const lastAssistantIdx = msgs.findLastIndex(m => m?.role === 'assistant' && !m.isStreaming && m.content);
            if (lastAssistantIdx >= 0) {
                const lastAssistant = msgs[lastAssistantIdx];
                const finishedAt = lastAssistantFinishedAtRef.current.get(chatKey);
                if (finishedAt && Date.now() - finishedAt <= FOLLOW_UP_WINDOW_MS) {
                    reportSignal(chatId, lastAssistant.runId || null, 'follow_up', 1.0,
                        lastAssistant.id ? { messageId: lastAssistant.id } : {});
                }
                const overlap = longestCommonSubstring(userMessage, lastAssistant.content || '');
                if (overlap >= QUOTE_MIN_OVERLAP) {
                    const denom = Math.max(1, (lastAssistant.content || '').length);
                    const score = Math.min(1.0, overlap / denom);
                    reportSignal(chatId, lastAssistant.runId || null, 'quote', score, {
                        overlapChars: overlap,
                        ...(lastAssistant.id ? { messageId: lastAssistant.id } : {})
                    });
                }
            }
        }

        const createSSE = chatType === 'coach' ? createCoachSSE : createLoveAppSSE;
        const initialType = imageUrl ? 'intake_status' : 'thinking';
        const initialContent = imageUrl
            ? (chatType === 'coach'
                ? '正在读取聊天截图，并判断这件事要不要进入任务执行...'
                : '正在识别聊天截图，准备给你回复建议...')
            : (chatType === 'coach'
                ? '正在整理问题，并判断是否需要继续执行任务...'
                : '正在分析对话语气，准备回复建议...');

        closeConnectionByKey(chatKey);

        updateRuntime(chatType, chatId, current => ({
            ...current,
            messages: upsertStatusStep(
                appendUserMessage(current.messages, userMessage, imageUrl),
                initialType,
                initialContent
            ),
            isLoading: true,
            runStatus: 'QUEUED',
            lastEventType: initialType,
            latestStatusText: initialContent,
            partialResponse: '',
            errorMessage: null,
            streamingStatus: { type: initialType, content: initialContent },
            hasLocalConnection: true
        }));

        try {
            const eventSource = await createSSE(userMessage, chatId, imageUrl, {
                onData: (rawData) => {
                    const parsed = parseSSEMessage(rawData);
                    handleParsedMessage(chatType, chatId, parsed);
                    listenersRef.current.get(chatKey)?.(parsed);

                    if (parsed.type === 'done' || parsed.type === 'error') {
                        connectionsRef.current.delete(chatKey);
                        refreshChatMessages(chatType, chatId);
                    }
                },
                onError: async (error) => {
                    console.error('SSE Error:', error);
                    const errorMessage = error?.name === 'AuthExpiredError'
                        ? error.message
                        : '抱歉，连接出现问题，请稍后重试。';

                    updateRuntime(chatType, chatId, current => ({
                        ...current,
                        messages: appendErrorMessage(finalizeStreamingMessage(current.messages), errorMessage),
                        isLoading: false,
                        runStatus: current.runStatus === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
                        latestStatusText: '',
                        errorMessage,
                        streamingStatus: null,
                        hasLocalConnection: false
                    }));
                    connectionsRef.current.delete(chatKey);
                    await refreshChatMessages(chatType, chatId);
                },
                onComplete: async () => {
                    connectionsRef.current.delete(chatKey);
                    updateRuntime(chatType, chatId, current => ({
                        ...current,
                        hasLocalConnection: false
                    }));
                    await refreshChatMessages(chatType, chatId);
                }
            });

            connectionsRef.current.set(chatKey, eventSource);
        } catch (error) {
            console.error('Failed to create SSE:', error);
            const errorMessage = error?.message || '抱歉，连接出现问题，请稍后重试。';
            updateRuntime(chatType, chatId, current => ({
                ...current,
                messages: appendErrorMessage(finalizeStreamingMessage(current.messages), errorMessage),
                isLoading: false,
                runStatus: 'FAILED',
                latestStatusText: '',
                errorMessage,
                streamingStatus: null,
                hasLocalConnection: false
            }));
        }
    }, [closeConnectionByKey, handleParsedMessage, refreshChatMessages, updateRuntime]);

    const updateSessionsForType = useCallback((chatType, updater) => {
        if (!CHAT_TYPES.includes(chatType)) return;
        setSessionsByType(prev => {
            const current = prev[chatType] || { list: [], currentId: null, loaded: false };
            const next = typeof updater === 'function' ? updater(current) : updater;
            return { ...prev, [chatType]: { ...current, ...next } };
        });
    }, []);

    const loadSessionsForType = useCallback((chatType, { force = false } = {}) => {
        if (!CHAT_TYPES.includes(chatType)) return Promise.resolve([]);

        const inFlight = sessionsLoadPromiseRef.current.get(chatType);
        if (inFlight) return inFlight;

        const existing = sessionsRef.current[chatType];
        if (!force && existing?.loaded) return Promise.resolve(existing.list);

        const promise = (async () => {
            try {
                const sessions = await getChatSessions(chatType);
                const list = Array.isArray(sessions) ? sessions : [];
                updateSessionsForType(chatType, current => {
                    const hadCurrent = current.currentId && list.some(item => item.id === current.currentId);
                    return {
                        list,
                        currentId: hadCurrent ? current.currentId : (list[0]?.id || null),
                        loaded: true
                    };
                });
                return list;
            } catch (error) {
                console.error(`Failed to load sessions for ${chatType}:`, error);
                updateSessionsForType(chatType, { loaded: true });
                return [];
            } finally {
                sessionsLoadPromiseRef.current.delete(chatType);
            }
        })();
        sessionsLoadPromiseRef.current.set(chatType, promise);
        return promise;
    }, [updateSessionsForType]);

    const selectChat = useCallback((chatType, chatId) => {
        const now = Date.now();
        const previous = activeChatRef.current;

        // 离开旧会话 → 上报 session_retention（停留分钟数）
        if (previous && previous.chatId && (previous.chatId !== chatId || previous.chatType !== chatType)) {
            const minutes = Math.max(0, Math.round((now - previous.enteredAt) / 60000));
            if (minutes > 0) {
                reportSignal(previous.chatId, null, 'session_retention', minutes, { chatType: previous.chatType });
            }
        }

        // 进入新会话：若是历史会话且距上次访问 ≥ 24h → return_visit
        if (chatId) {
            const visits = readVisitTimestamps();
            const lastVisit = visits[chatId];
            if (lastVisit && now - lastVisit >= RETURN_VISIT_THRESHOLD_MS) {
                const days = Math.round((now - lastVisit) / (24 * 60 * 60 * 1000));
                reportSignal(chatId, null, 'return_visit', Math.max(1, days), { chatType });
            }
            writeVisitTimestamp(chatId, now);
            activeChatRef.current = { chatType, chatId, enteredAt: now };
        } else {
            activeChatRef.current = null;
        }

        updateSessionsForType(chatType, { currentId: chatId });
    }, [updateSessionsForType]);

    const createDraftChat = useCallback((chatType, title = '新的对话') => {
        const newId = `chat_${Date.now()}`;
        const draft = { id: newId, title };
        updateSessionsForType(chatType, current => ({
            list: [draft, ...current.list],
            currentId: newId
        }));
        return draft;
    }, [updateSessionsForType]);

    const renameChat = useCallback((chatType, chatId, title) => {
        updateSessionsForType(chatType, current => ({
            list: current.list.map(item => item.id === chatId ? { ...item, title } : item)
        }));
    }, [updateSessionsForType]);

    const ensureMessagesLoaded = useCallback((chatType, chatId, { force = false } = {}) => {
        if (!chatType || !chatId) return Promise.resolve();
        const chatKey = buildChatKey(chatType, chatId);
        if (!chatKey) return Promise.resolve();

        const inFlight = messagesLoadPromiseRef.current.get(chatKey);
        if (inFlight) return inFlight;

        const existing = runtimesRef.current[chatKey];
        if (!force && existing?.messages?.length > 0) return Promise.resolve();

        const promise = (async () => {
            try {
                let msgs = await getChatMessages(chatId, chatType);
                if (!Array.isArray(msgs)) msgs = [];

                if (chatType === 'coach' && msgs.length > 0) {
                    try {
                        const images = await getChatImages(chatId, chatType);
                        if (Array.isArray(images) && images.length > 0) {
                            const lastAssistantIdx = msgs.findLastIndex(m => m.role === 'assistant');
                            if (lastAssistantIdx >= 0) {
                                msgs = [...msgs];
                                msgs[lastAssistantIdx] = { ...msgs[lastAssistantIdx], images };
                            }
                        }
                    } catch (error) {
                        console.error('Failed to load chat images:', error);
                    }
                }

                hydrateMessages(chatType, chatId, msgs);
            } catch (error) {
                console.error('Failed to load chat messages:', error);
                hydrateMessages(chatType, chatId, []);
            } finally {
                messagesLoadPromiseRef.current.delete(chatKey);
            }
        })();
        messagesLoadPromiseRef.current.set(chatKey, promise);
        return promise;
    }, [hydrateMessages]);

    const removeChat = useCallback(async (chatType, chatId) => {
        if (!chatType || !chatId) return;
        try {
            await deleteChatSession(chatId, chatType);
        } catch (error) {
            console.error('Failed to delete chat:', error);
            return;
        }
        clearChatRuntime(chatType, chatId);
        updateSessionsForType(chatType, current => {
            const remaining = current.list.filter(item => item.id !== chatId);
            const nextCurrentId = current.currentId === chatId
                ? (remaining[0]?.id || null)
                : current.currentId;
            return { list: remaining, currentId: nextCurrentId };
        });
    }, [clearChatRuntime, updateSessionsForType]);

    useEffect(() => {
        if (!isAuthenticated) {
            const stale = activeChatRef.current;
            if (stale && stale.chatId) {
                const minutes = Math.max(0, Math.round((Date.now() - stale.enteredAt) / 60000));
                if (minutes > 0) {
                    reportSignal(stale.chatId, null, 'session_retention', minutes, { chatType: stale.chatType });
                }
                activeChatRef.current = null;
            }
            connectionsRef.current.forEach(connection => connection.close());
            connectionsRef.current.clear();
            listenersRef.current.clear();
            messagesLoadPromiseRef.current.clear();
            sessionsLoadPromiseRef.current.clear();
            lastAssistantFinishedAtRef.current.clear();
            clearCachedSnapshot();
            Promise.resolve().then(() => {
                setRuntimes({});
                setSessionsByType(createEmptySessionsState());
            });
            return;
        }

        let cancelled = false;
        const recoveryPollRunIds = recoveryPollRunIdsRef.current;

        const prefetchAll = async () => {
            const lists = await Promise.all(
                CHAT_TYPES.map(ct => loadSessionsForType(ct).catch(() => []))
            );
            if (cancelled) return;
            await Promise.all(
                lists.map((list, idx) => {
                    const ct = CHAT_TYPES[idx];
                    const cachedCurrentId = sessionsRef.current[ct]?.currentId;
                    const firstId = (cachedCurrentId && list.some(item => item.id === cachedCurrentId))
                        ? cachedCurrentId
                        : list[0]?.id;
                    if (!firstId) return Promise.resolve();
                    return ensureMessagesLoaded(ct, firstId).catch(() => {});
                })
            );
        };

        const restoreActiveRuns = async () => {
            try {
                const activeRuns = await getActiveRuns();
                if (cancelled) {
                    return;
                }
                activeRuns.forEach(applyRunSnapshot);
            } catch (error) {
                console.error('Failed to restore active chat runs:', error);
            }
        };

        prefetchAll();
        restoreActiveRuns();

        let timeoutId = null;

        const pollActiveRuns = async () => {
            const runtimeEntries = Object.values(runtimesRef.current);
            const runsToPoll = runtimeEntries.filter(runtime =>
                runtime.runId
                && ACTIVE_STATUSES.has(runtime.runStatus)
                && !runtime.hasLocalConnection
                && !recoveryPollRunIds.has(runtime.runId)
            );

            try {
                await Promise.all(runsToPoll.map(async (runtime) => {
                    recoveryPollRunIds.add(runtime.runId);
                    try {
                        const run = await getChatRun(runtime.runId);
                        if (cancelled) {
                            return;
                        }
                        applyRunSnapshot(run);
                        if (!ACTIVE_STATUSES.has(run.status)) {
                            await refreshChatMessages(run.chatType, run.chatId);
                        }
                    } catch (error) {
                        if (error?.status === 404) {
                            updateRuntime(runtime.chatType, runtime.chatId, current => ({
                                ...current,
                                runId: null,
                                runStatus: 'IDLE',
                                isLoading: false,
                                lastEventType: null,
                                latestStatusText: '',
                                streamingStatus: null,
                                errorMessage: null,
                                hasLocalConnection: false
                            }));
                            return;
                        }
                        console.error('Failed to poll chat run status:', error);
                    } finally {
                        recoveryPollRunIds.delete(runtime.runId);
                    }
                }));
            } finally {
                if (!cancelled) {
                    timeoutId = window.setTimeout(pollActiveRuns, RECOVERY_POLL_INTERVAL_MS);
                }
            }
        };

        timeoutId = window.setTimeout(pollActiveRuns, RECOVERY_POLL_INTERVAL_MS);

        const handlePageHide = () => {
            const active = activeChatRef.current;
            if (!active || !active.chatId) return;
            const minutes = Math.max(0, Math.round((Date.now() - active.enteredAt) / 60000));
            if (minutes <= 0) return;
            reportSignal(active.chatId, null, 'session_retention', minutes, { chatType: active.chatType });
        };
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            cancelled = true;
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
            recoveryPollRunIds.clear();
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [applyRunSnapshot, ensureMessagesLoaded, isAuthenticated, loadSessionsForType, refreshChatMessages, updateRuntime]);

    useEffect(() => {
        if (!isAuthenticated) return;

        const handle = window.setTimeout(() => {
            const sessionsSnapshot = {};
            CHAT_TYPES.forEach(ct => {
                const entry = sessionsByType[ct];
                if (!entry) return;
                sessionsSnapshot[ct] = {
                    list: entry.list,
                    currentId: entry.currentId
                };
            });

            const runtimesSnapshot = {};
            CHAT_TYPES.forEach(ct => {
                const currentId = sessionsByType[ct]?.currentId;
                if (!currentId) return;
                const key = buildChatKey(ct, currentId);
                const messages = sanitizeMessagesForCache(runtimes[key]?.messages);
                if (messages.length > 0) {
                    runtimesSnapshot[key] = { messages };
                }
            });

            writeCachedSnapshot({
                version: CACHE_VERSION,
                savedAt: Date.now(),
                sessionsByType: sessionsSnapshot,
                runtimes: runtimesSnapshot
            });
        }, 400);

        return () => window.clearTimeout(handle);
    }, [isAuthenticated, runtimes, sessionsByType]);

    const runtimeEntries = Object.values(runtimes);

    const value = {
        getChatState: (chatType, chatId) => {
            const chatKey = buildChatKey(chatType, chatId);
            return chatKey ? (runtimes[chatKey] || createEmptyRuntime(chatType, chatId)) : createEmptyRuntime(chatType, chatId);
        },
        getSessionsState: (chatType) => sessionsByType[chatType] || { list: [], currentId: null, loaded: false },
        sessionsByType,
        loadSessionsForType,
        ensureMessagesLoaded,
        selectChat,
        createDraftChat,
        renameChat,
        removeChat,
        hydrateMessages,
        refreshChatMessages,
        updateMessage,
        clearChatRuntime,
        registerParsedMessageListener,
        sendMessage,
        runtimeEntries,
        activeRuns: runtimeEntries.filter(runtime => ACTIVE_STATUSES.has(runtime.runStatus))
    };

    return (
        <ChatRuntimeContext.Provider value={value}>
            {children}
        </ChatRuntimeContext.Provider>
    );
}
