import { useState, useCallback, useRef } from 'react';

const AUTO_CLEAR_MS = 5000;

export const useBackgroundRuns = () => {
    // Map<chatId, { status: 'generating'|'completed'|'failed', error?: string }>
    const [runs, setRuns] = useState({});
    // Map<chatId, EventSource> — kept in ref so state updates don't close connections
    const sourcesRef = useRef({});
    // Timers for auto-clearing completed/failed indicators
    const clearTimersRef = useRef({});

    const clearTimer = useCallback((chatId) => {
        const timer = clearTimersRef.current[chatId];
        if (timer) {
            clearTimeout(timer);
            delete clearTimersRef.current[chatId];
        }
    }, []);

    const registerRun = useCallback((chatId, eventSource) => {
        sourcesRef.current[chatId] = eventSource;
        clearTimer(chatId);
        setRuns(prev => ({ ...prev, [chatId]: { status: 'generating' } }));
    }, [clearTimer]);

    const completeRun = useCallback((chatId) => {
        const es = sourcesRef.current[chatId];
        if (es) {
            es.close();
            delete sourcesRef.current[chatId];
        }
        setRuns(prev => {
            if (!prev[chatId]) return prev;
            return { ...prev, [chatId]: { status: 'completed' } };
        });
        // Auto-clear completed indicator after timeout
        clearTimer(chatId);
        clearTimersRef.current[chatId] = setTimeout(() => {
            setRuns(prev => {
                if (!prev[chatId] || prev[chatId].status !== 'completed') return prev;
                const next = { ...prev };
                delete next[chatId];
                return next;
            });
            delete clearTimersRef.current[chatId];
        }, AUTO_CLEAR_MS);
    }, [clearTimer]);

    const failRun = useCallback((chatId, error) => {
        const es = sourcesRef.current[chatId];
        if (es) {
            es.close();
            delete sourcesRef.current[chatId];
        }
        setRuns(prev => {
            if (!prev[chatId]) return prev;
            return { ...prev, [chatId]: { status: 'failed', error } };
        });
        // Auto-clear failed indicator after timeout
        clearTimer(chatId);
        clearTimersRef.current[chatId] = setTimeout(() => {
            setRuns(prev => {
                if (!prev[chatId] || prev[chatId].status !== 'failed') return prev;
                const next = { ...prev };
                delete next[chatId];
                return next;
            });
            delete clearTimersRef.current[chatId];
        }, AUTO_CLEAR_MS);
    }, [clearTimer]);

    const clearRun = useCallback((chatId) => {
        const es = sourcesRef.current[chatId];
        if (es) {
            es.close();
            delete sourcesRef.current[chatId];
        }
        clearTimer(chatId);
        setRuns(prev => {
            const next = { ...prev };
            delete next[chatId];
            return next;
        });
    }, [clearTimer]);

    const getRunStatus = useCallback((chatId) => {
        return runs[chatId] || null;
    }, [runs]);

    const activeRunCount = Object.values(runs).filter(r => r.status === 'generating').length;

    return {
        runs,
        activeRunCount,
        registerRun,
        completeRun,
        failRun,
        clearRun,
        getRunStatus
    };
};
