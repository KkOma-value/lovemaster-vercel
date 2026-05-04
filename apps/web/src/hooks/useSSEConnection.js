import { useRef, useCallback, useEffect } from 'react';
import { createLoveAppSSE, createCoachSSE } from '../services/chatApi';

/**
 * Strip template syntax (e.g. {{variable}}) and stray braces from user-facing content.
 */
const cleanContent = (text) => {
    if (!text) return text;
    // Remove {{...}} patterns
    let cleaned = text.replace(/\{\{[^}]*\}\}/g, '');
    // Remove leftover double-braces
    cleaned = cleaned.replace(/\{\{/g, '').replace(/\}\}/g, '');
    return cleaned.trim();
};

/**
 * Parse SSE message from backend
 * Format: {"type":"thinking|status|content|done|error|task_start|task_progress|terminal|file_created","content":"...","data":{...}}
 */
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

/**
 * Custom hook for managing SSE connections
 * Handles connection lifecycle, message parsing, and cleanup
 *
 * @param {string} chatType - 'loveapp' or 'coach'
 * @returns {Object} { eventSourceRef, currentResponseRef, connectSSE, cleanupSSE, parseSSEMessage }
 */
export const useSSEConnection = (chatType) => {
    const eventSourceRef = useRef(null);
    const currentResponseRef = useRef('');

    /**
     * Cleanup SSE connection with options
     */
    const cleanupSSE = useCallback((options = {}) => {
        const { resetResponse = true } = options;
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (resetResponse) {
            currentResponseRef.current = '';
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => cleanupSSE();
    }, [cleanupSSE]);

    /**
     * Connect to SSE endpoint with callbacks
     */
    const connectSSE = useCallback(async (message, chatId, imageUrl, callbacks = {}) => {
        // Cleanup existing connection first
        cleanupSSE({ resetResponse: true });
        currentResponseRef.current = '';

        const createSSE = chatType === 'coach' ? createCoachSSE : createLoveAppSSE;

        const sseCallbacks = {
            onData: (data) => {
                const parsed = parseSSEMessage(data);
                callbacks.onData?.(parsed);
            },
            onError: (error) => {
                console.error('SSE Error:', error);
                callbacks.onError?.(error);
                cleanupSSE({ resetResponse: false });
            },
            onComplete: () => {
                callbacks.onComplete?.();
                cleanupSSE({ resetResponse: false });
            }
        };

        try {
            eventSourceRef.current = await createSSE(message, chatId, imageUrl, sseCallbacks);
        } catch (error) {
            console.error('Failed to create SSE:', error);
            callbacks.onError?.(error);
        }
    }, [chatType, cleanupSSE]);

    return {
        eventSourceRef,
        currentResponseRef,
        connectSSE,
        cleanupSSE,
        parseSSEMessage
    };
};
