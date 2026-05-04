import { useCallback, useEffect } from 'react';
import { useChatRuntime } from '../contexts/ChatRuntimeContext';

/**
 * Thin adapter over ChatRuntimeContext for per-mode session list + current id.
 * Sessions and messages are cached inside the context so switching modes is instant.
 *
 * @param {string} chatType - 'loveapp' or 'coach'
 * @returns {Object}
 */
export const useChatSessions = (chatType) => {
    const {
        getSessionsState,
        loadSessionsForType,
        selectChat,
        createDraftChat,
        renameChat,
        removeChat
    } = useChatRuntime();

    const { list: chatList, currentId: currentChatId, loaded } = getSessionsState(chatType);

    useEffect(() => {
        if (!loaded) {
            loadSessionsForType(chatType);
        }
    }, [chatType, loaded, loadSessionsForType]);

    const setCurrentChatId = useCallback((chatId) => {
        selectChat(chatType, chatId);
    }, [chatType, selectChat]);

    const createNewChat = useCallback(() => createDraftChat(chatType, '新的对话'), [chatType, createDraftChat]);

    const autoCreateChat = useCallback((messageText) => {
        const title = messageText && messageText.length > 20
            ? messageText.substring(0, 20) + '...'
            : (messageText || '新的对话');
        return createDraftChat(chatType, title);
    }, [chatType, createDraftChat]);

    const deleteChat = useCallback((chatId) => removeChat(chatType, chatId), [chatType, removeChat]);

    const updateChatTitle = useCallback((chatId, title) => {
        renameChat(chatType, chatId, title);
    }, [chatType, renameChat]);

    return {
        chatList,
        currentChatId,
        setCurrentChatId,
        createNewChat,
        autoCreateChat,
        deleteChat,
        updateChatTitle
    };
};
