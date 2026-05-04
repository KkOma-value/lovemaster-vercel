import { useState, useCallback, useRef } from 'react';

/**
 * Custom hook for managing chat messages and streaming state
 */
export const useChatMessages = () => {
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [streamingStatus, setStreamingStatus] = useState(null);
    const currentResponseRef = useRef('');

    const addStatusStep = useCallback((type, content) => {
        const step = { type, content, timestamp: Date.now() };
        setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.role === 'assistant' && lastMsg.isStreaming) {
                const steps = lastMsg.statusSteps || [];
                // Deduplicate: skip if last step has the same type
                if (steps.length > 0 && steps[steps.length - 1].type === type) {
                    return [
                        ...prev.slice(0, -1),
                        { ...lastMsg, statusSteps: [...steps.slice(0, -1), step] }
                    ];
                }
                return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, statusSteps: [...steps, step] }
                ];
            }
            // Create new assistant message with status step
            return [
                ...prev,
                { role: 'assistant', content: '', isStreaming: true, statusSteps: [step] }
            ];
        });
    }, []);

    const addStreamingContent = useCallback((newChunk) => {
        currentResponseRef.current += newChunk;
        setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.role === 'assistant' && lastMsg.isStreaming) {
                const updatedContent = lastMsg.content + newChunk;
                currentResponseRef.current = updatedContent;
                return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, content: updatedContent }
                ];
            }
            currentResponseRef.current = newChunk;
            return [
                ...prev,
                { role: 'assistant', content: newChunk, isStreaming: true }
            ];
        });
    }, []);

    const finalizeStreaming = useCallback(() => {
        setStreamingStatus(null);
        setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.isStreaming) {
                return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, isStreaming: false }
                ];
            }
            return prev;
        });
        setIsLoading(false);
    }, []);

    const addUserMessage = useCallback((content, imageUrl = null) => {
        currentResponseRef.current = '';
        setMessages(prev => [...prev, { role: 'user', content, ...(imageUrl && { imageUrl }) }]);
    }, []);

    const addErrorMessage = useCallback((message) => {
        setMessages(prev => [...prev, { role: 'assistant', content: message }]);
    }, []);

    const resetStreaming = useCallback(() => {
        currentResponseRef.current = '';
        setStreamingStatus(null);
        setIsLoading(false);
    }, []);

    const setMessagesDirect = useCallback((msgs) => {
        setMessages(msgs);
    }, []);

    const clearMessages = useCallback(() => {
        setMessages([]);
    }, []);

    return {
        messages,
        inputValue,
        isLoading,
        streamingStatus,
        currentResponseRef,
        setInputValue,
        setStreamingStatus,
        setIsLoading,
        addStatusStep,
        addStreamingContent,
        finalizeStreaming,
        addUserMessage,
        addErrorMessage,
        resetStreaming,
        setMessagesDirect,
        clearMessages
    };
};
