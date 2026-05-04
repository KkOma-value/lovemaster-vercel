import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import ChatSidebar from '../../components/Sidebar/ChatSidebar';
import ChatArea from '../../components/Chat/ChatArea';
import { useChatSessions } from '../../hooks/useChatSessions';
import { useChatRuntime } from '../../contexts/ChatRuntimeContext';
import { useBackgroundRuns } from '../../hooks/useBackgroundRuns';

const ChatPage = () => {
    const { type } = useParams();
    const chatType = type || 'loveapp';
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [inputValue, setInputValue] = useState('');

    const {
        runs,
        activeRunCount,
        registerRun,
        completeRun,
        failRun,
        clearRun
    } = useBackgroundRuns();

    const {
        getChatState,
        ensureMessagesLoaded,
        sendMessage,
        runtimeEntries
    } = useChatRuntime();

    const {
        chatList,
        currentChatId,
        setCurrentChatId,
        createNewChat,
        autoCreateChat,
        deleteChat,
        updateChatTitle
    } = useChatSessions(chatType);

    const runtime = getChatState(chatType, currentChatId);
    const messages = runtime.messages;
    const isLoading = runtime.isLoading;
    const streamingStatus = runtime.streamingStatus;
    const recoveryStatus = (() => {
        if (!currentChatId) {
            return null;
        }

        const runStatus = runs[currentChatId]?.status;
        if (runStatus === 'completed') {
            return 'completed';
        }
        if (runStatus === 'failed') {
            return 'failed';
        }
        if (runStatus === 'generating' && !runtime.hasLocalConnection) {
            return 'generating';
        }
        return null;
    })();

    useEffect(() => {
        if (!currentChatId) return;
        ensureMessagesLoaded(chatType, currentChatId);
    }, [currentChatId, chatType, ensureMessagesLoaded]);

    // Send message handler
    const handleSendMessage = useCallback(async (msgText = inputValue, imageUrl = null) => {
        const textToUse = msgText || inputValue;
        if ((!textToUse.trim() && !imageUrl) || isLoading) return;

        // Auto-create chat if no current chat exists
        let activeChatId = currentChatId;
        if (!activeChatId) {
            const newChat = autoCreateChat(textToUse.trim());
            activeChatId = newChat.id;
        }

        const userMessage = textToUse.trim();
        setInputValue('');

        // Update chat title if this is the first user message
        const currentChat = chatList.find(chat => chat.id === activeChatId);
        if (currentChat?.title === '新的对话') {
            const title = userMessage.length > 20
                ? `${userMessage.substring(0, 20)}...`
                : userMessage;
            updateChatTitle(activeChatId, title);
        }

        await sendMessage({
            chatType,
            chatId: activeChatId,
            message: userMessage,
            imageUrl
        });
    }, [
        inputValue,
        isLoading,
        currentChatId,
        autoCreateChat,
        chatList,
        updateChatTitle,
        sendMessage,
        chatType
    ]);

    // New chat handler
    const handleNewChat = useCallback(() => {
        createNewChat();
        setInputValue('');
    }, [createNewChat]);

    const handleDeleteChat = useCallback(async (chatId) => {
        await deleteChat(chatId);
    }, [deleteChat]);

    const handleToggleSidebar = useCallback(() => {
        setIsSidebarOpen(prev => !prev);
    }, []);

    // Sync background badges from the runtime store so terminal states clear correctly.
    useEffect(() => {
        const relevantRuntimes = new Map(
            runtimeEntries
                .filter(runtimeEntry => runtimeEntry.chatType === chatType && runtimeEntry.chatId)
                .map(runtimeEntry => [runtimeEntry.chatId, runtimeEntry])
        );

        relevantRuntimes.forEach((runtimeEntry, runChatId) => {
            const isCurrentChat = runChatId === currentChatId;
            const currentStatus = runs[runChatId]?.status;

            if (runtimeEntry.runStatus === 'QUEUED' || runtimeEntry.runStatus === 'RUNNING') {
                if (!isCurrentChat && !currentStatus) {
                    registerRun(runChatId, null);
                }
                return;
            }

            if (runtimeEntry.runStatus === 'COMPLETED') {
                if (isCurrentChat) {
                    if (currentStatus) {
                        clearRun(runChatId);
                    }
                } else if (currentStatus !== 'completed') {
                    completeRun(runChatId);
                }
                return;
            }

            if (runtimeEntry.runStatus === 'FAILED') {
                if (isCurrentChat) {
                    if (currentStatus) {
                        clearRun(runChatId);
                    }
                } else if (currentStatus !== 'failed') {
                    failRun(runChatId, runtimeEntry.errorMessage);
                }
                return;
            }

            if (currentStatus) {
                clearRun(runChatId);
            }
        });

        Object.keys(runs).forEach(runChatId => {
            if (!relevantRuntimes.has(runChatId)) {
                clearRun(runChatId);
            }
        });
    }, [runtimeEntries, chatType, currentChatId, runs, registerRun, completeRun, failRun, clearRun]);

    // Navigate to first active background run when pill is clicked
    const handleNavigateToRun = useCallback(() => {
        const generatingRun = Object.entries(runs).find(([, run]) => run.status === 'generating');
        if (generatingRun) {
            const [runChatId] = generatingRun;
            setCurrentChatId(runChatId);
        }
    }, [runs, setCurrentChatId]);

    // Clear recovery status
    const handleRecoveryDismiss = useCallback(() => {
        if (currentChatId) {
            clearRun(currentChatId);
        }
    }, [currentChatId, clearRun]);

    return (
        <div className="w-screen h-screen flex relative overflow-hidden text-[var(--text-ink)] isolate z-[1] fade-up">
            {/* Warm blurred background image layer */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/1.png"
                    alt=""
                    className="w-full h-full object-cover"
                    style={{
                        filter: 'blur(16px) brightness(0.88) sepia(0.2) saturate(1.1)',
                        transform: 'scale(1.08)',
                    }}
                />
                {/* Warm tint overlay — matches design system peach/cream tones */}
                <div
                    className="absolute inset-0"
                    style={{
                        background: `
                            radial-gradient(ellipse at 20% 20%, rgba(252,231,213,0.45) 0%, transparent 55%),
                            radial-gradient(ellipse at 80% 80%, rgba(245,228,209,0.4) 0%, transparent 50%),
                            radial-gradient(ellipse at 50% 50%, rgba(251,244,236,0.35) 0%, rgba(251,244,236,0.15) 100%)
                        `,
                    }}
                />
            </div>

            <div
                className={`relative z-40 transition-all duration-250 ease-in-out shrink-0 ${!isSidebarOpen || window.innerWidth <= 768 ? 'w-0' : 'w-[276px]'}`}
            >
                <ChatSidebar
                    isOpen={isSidebarOpen}
                    onToggle={handleToggleSidebar}
                    chatList={chatList}
                    currentChatId={currentChatId}
                    onSelectChat={setCurrentChatId}
                    onNewChat={handleNewChat}
                    onDeleteChat={handleDeleteChat}
                    backgroundRuns={runs}
                />
            </div>

            <main className="flex-1 min-w-0 flex relative z-10">
                <div className="flex-1 min-w-0 h-screen flex flex-col relative">
                    <ChatArea
                        messages={messages}
                        inputValue={inputValue}
                        setInputValue={setInputValue}
                        onSendMessage={handleSendMessage}
                        isLoading={isLoading}
                        streamingStatus={streamingStatus}
                        chatType={chatType}
                        chatId={currentChatId}
                        activeRunCount={activeRunCount}
                        onNavigateToRun={handleNavigateToRun}
                        recoveryStatus={recoveryStatus}
                        onRecoveryDismiss={handleRecoveryDismiss}
                    />
                </div>
            </main>
        </div>
    );
};

export default ChatPage;
