import React, { useRef, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Conversation, Message } from '@/types';
import { useAppContext } from '@/context/AppContext';
import MessageInput from './MessageInput';
import { formatPrice } from '@/utils/currency';
import { CalendarIcon, UserCircleIcon, ChevronLeftIcon, BuildingOfficeIcon, ShieldExclamationIcon, TrashIcon } from '@/constants';
import { getConversation, sendMessage as sendMessageAPI, uploadMessageImage, getSecurityWarning } from '@/services/apiService';
import { buildLocalizedPath } from '@/src/utils/languageRouting';
import { generatePropertySlug } from '@/utils/slug';
import { socketService } from '@/services/socketService';
import { notificationService } from '@/services/notificationService';
import { useConfirmation } from '@/src/shared/hooks/useConfirmation';
import { useNotification } from '@/src/shared/hooks/useNotification';
import { shouldOpenInNewTab } from '@/shared/utils/pwa';

interface ConversationViewProps {
    conversation: Conversation;
    onBack?: () => void;
}

const MessageImage: React.FC<{imageUrl: string; t: (key: string) => string}> = ({imageUrl, t}) => {
    const [error, setError] = useState(false);
    useEffect(() => { setError(false); }, [imageUrl]);

    if(error) {
        return <div className="p-3 bg-neutral-200 rounded-lg text-neutral-500 text-xs">{t('inbox.imageFailedToLoad')}</div>
    }

    return (
        <img
            src={imageUrl}
            alt="Annotated property"
            loading="lazy"
            decoding="async"
            className="max-w-full max-h-48 sm:max-h-64 h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            onError={() => setError(true)}
            onClick={() => window.open(imageUrl, '_blank')}
        />
    );
}

const ConversationView: React.FC<ConversationViewProps> = ({ conversation, onBack }) => {
    const { t } = useTranslation(['messages']);
    const { state, dispatch, deleteConversation } = useAppContext();
    const { confirm } = useConfirmation();
    const { error } = useNotification();
    // Resolve property FIRST — must be declared before any hooks that depend on it
    const property = conversation.property || state.properties.find(p => p.id === conversation.propertyId);
    const resolvedImageUrl = property?.imageUrl || property?.images?.[0]?.url;
    const [imageError, setImageError] = useState(!resolvedImageUrl);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [securityWarning, setSecurityWarning] = useState<string | null>(null);
    const [showSecurityAlert, setShowSecurityAlert] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const currentUserId = state.currentUser?.id;
    // For direct agent conversations (no property), derive display info from participants
    const isDirectConversation = !property;
    const isBuyer = String(conversation.buyerId) === String(currentUserId);
    const otherParticipant = isBuyer ? conversation.seller : conversation.buyer;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        const loadMessages = async () => {
            try {
                const data = await getConversation(conversation.id);
                setMessages(data.messages);
            } catch (err) {
                // Error removed
            } finally {
                setIsLoading(false);
            }
        };

        loadMessages();
        getSecurityWarning().then(setSecurityWarning).catch(() => {});
        socketService.joinConversation(conversation.id);

        const unsubscribeMessage = socketService.onMessage(conversation.id, (message: Message) => {
            // Properly extract sender ID from message (handle both string and populated object)
            const messageSenderId = typeof message.senderId === 'object' && message.senderId !== null
                ? (message.senderId as any)._id || (message.senderId as any).id
                : message.senderId;

            // Skip messages from self - sender already gets message from API response
            // This prevents duplicates when backend broadcasts to all users in room
            if (String(messageSenderId) === String(currentUserId)) {
                return;
            }

            setMessages(prev => {
                if (prev.some(m => m.id === message.id)) return prev;

                playNotificationSound();
                // Determine who the "other person" is based on current user's role
                const isCurrentUserBuyer = String(conversation.buyer?.id || conversation.buyerId) === String(currentUserId);
                const otherPerson = isCurrentUserBuyer
                    ? (conversation.seller || property?.seller)
                    : (conversation.buyer || { name: 'User' });

                if (otherPerson && property) {
                    notificationService.showNewMessageNotification(
                        otherPerson.name || 'User',
                        message.text || '[Image]',
                        `${property.address}, ${property.city}`
                    );
                }

                dispatch({ type: 'ADD_MESSAGE', payload: { conversationId: conversation.id, message } });
                return [...prev, message];
            });
        });

        const unsubscribeTyping = socketService.onTyping(conversation.id, (data) => {
            if (data.userId !== currentUserId) {
                setIsTyping(data.isTyping);
                if (data.isTyping) {
                    const timeout = setTimeout(() => setIsTyping(false), 3000);
                    setTypingTimeout(timeout);
                } else if (typingTimeout) {
                    clearTimeout(typingTimeout);
                    setTypingTimeout(null);
                }
            }
        });

        return () => {
            socketService.leaveConversation(conversation.id);
            unsubscribeMessage();
            unsubscribeTyping();
            if (typingTimeout) clearTimeout(typingTimeout);
        };
    }, [conversation.id, currentUserId]);

    const playNotificationSound = () => {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVanl8LBhGgU7k9n0zoAwBSh+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURE=');
            audio.volume = 0.3;
            audio.play().catch(() => {});
        } catch {
            // Silently ignore audio errors
        }
    };

    const handleSendMessage = async (text: string, imageFile?: File) => {
        let imageUrl: string | undefined;

        if (imageFile) {
            try {
                imageUrl = await uploadMessageImage(conversation.id, imageFile);
            } catch (err) {
                // Error removed
                await error(t('inbox.errorTitle', 'Error'), t('inbox.failedToUploadImage'));
                throw err;
            }
        }

        const messageData: Message = {
            id: `temp-${Date.now()}`,
            senderId: currentUserId || 'user',
            text: text || '',
            imageUrl,
            timestamp: Date.now(),
            isRead: false,
        };

        try {
            const result = await sendMessageAPI(conversation.id, messageData);

            setMessages(prev => {
                if (prev.some(m => m.id === result.message.id)) return prev;
                return [...prev, result.message];
            });

            dispatch({ type: 'ADD_MESSAGE', payload: { conversationId: conversation.id, message: result.message } });

            if (result.securityWarnings && result.securityWarnings.length > 0) {
                setShowSecurityAlert(true);
                setTimeout(() => setShowSecurityAlert(false), 5000);
            }
        } catch (err) {
            // Error removed
            await error(t('inbox.errorTitle', 'Error'), t('inbox.failedToSendMessage'));
            throw err;
        }
    };

    const handleDelete = async () => {
        const confirmed = await confirm({
            title: t('inbox.deleteTitle', 'Delete Conversation'),
            message: t('inbox.deleteConfirm'),
            confirmLabel: t('inbox.deleteButton', 'Delete'),
            cancelLabel: t('inbox.cancelButton', 'Cancel'),
            type: 'danger',
        });

        if (confirmed) {
            try {
                await deleteConversation(conversation.id);
                if (onBack) onBack();
            } catch (err) {
                // Error removed
                await error(t('inbox.errorTitle', 'Error'), t('inbox.failedToDeleteConversation'));
            }
        }
    };

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header - Compact on mobile */}
            <div className="px-2 py-2 sm:p-3 border-b border-neutral-200 flex-shrink-0 flex items-center gap-2 sm:gap-3">
                {onBack && (
                    <button onClick={onBack} className="p-1.5 sm:p-2 text-neutral-600 hover:bg-neutral-100 rounded-full md:hidden">
                        <ChevronLeftIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                )}
                {isDirectConversation ? (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center rounded-lg flex-shrink-0">
                        {otherParticipant?.avatarUrl ? (
                            <img
                                src={otherParticipant.avatarUrl}
                                alt={otherParticipant.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover rounded-lg"
                            />
                        ) : (
                            <UserCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-primary/60" />
                        )}
                    </div>
                ) : imageError ? (
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center rounded-lg flex-shrink-0">
                        <BuildingOfficeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-400" />
                    </div>
                ) : (
                    <img
                        src={resolvedImageUrl}
                        alt={property!.address}
                        loading="lazy"
                        decoding="async"
                        className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded-lg flex-shrink-0"
                        onError={() => setImageError(true)}
                    />
                )}
                <div className="flex-1 min-w-0">
                    {isDirectConversation ? (
                        <>
                            <p className="font-bold text-sm sm:text-base text-neutral-800 truncate">
                                {otherParticipant?.name || t('inbox.directConversation', 'Direct Conversation')}
                            </p>
                            <p className="text-xs sm:text-sm text-neutral-500">
                                {conversation.seller?.role === 'agent'
                                    ? t('inbox.directAgentConversation', 'Agent Conversation')
                                    : t('inbox.directConversation', 'Direct Conversation')}
                            </p>
                        </>
                    ) : (
                        <>
                            <p className="font-bold text-sm sm:text-base text-neutral-800 truncate">{property!.address}, {property!.city}</p>
                            <p className="text-xs sm:text-sm font-semibold text-primary">{formatPrice(property!.price, property!.country)}</p>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                    {!isDirectConversation && (
                        <button
                            onClick={() => {
                                const url = buildLocalizedPath(`/property/${generatePropertySlug(property!)}`);
                                if (shouldOpenInNewTab()) {
                                    window.open(url, '_blank', 'noopener,noreferrer');
                                } else {
                                    dispatch({ type: 'SET_SELECTED_PROPERTY', payload: property!.id });
                                    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'property-details' });
                                    window.history.pushState({}, '', url);
                                    window.dispatchEvent(new PopStateEvent('popstate'));
                                }
                            }}
                            className="hidden sm:block px-3 py-1.5 text-xs sm:text-sm font-semibold bg-primary-light text-primary-dark rounded-full hover:bg-primary/20 transition-colors"
                        >
                            {t('inbox.viewProperty')}
                        </button>
                    )}
                    <button
                        onClick={handleDelete}
                        className="p-1.5 sm:p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title={t('inbox.deleteConversation')}
                    >
                        <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </div>
            </div>

            {/* Security Alert */}
            {showSecurityAlert && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 sm:p-3 flex items-start gap-2 animate-fade-in flex-shrink-0">
                    <ShieldExclamationIcon className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-xs sm:text-sm text-yellow-800">
                        <p className="font-semibold">{t('security.sensitiveInfoDetected')}</p>
                        <p className="text-[10px] sm:text-xs mt-0.5">{t('security.sensitiveInfoMessage')}</p>
                    </div>
                </div>
            )}

            {/* Security Warning Banner */}
            {securityWarning && (
                <div className="bg-blue-50 border-b border-blue-200 p-2 flex-shrink-0">
                    <details className="cursor-pointer">
                        <summary className="text-[10px] sm:text-xs text-blue-800 font-semibold flex items-center gap-1.5">
                            <ShieldExclamationIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            {t('security.noticeTitle')}
                        </summary>
                        <div className="mt-2 text-[10px] sm:text-xs text-blue-700 whitespace-pre-line">
                            {securityWarning}
                        </div>
                    </details>
                </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 min-h-0">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                        <p className="text-xs sm:text-sm text-center px-4">{t('inbox.noMessages')} {t('inbox.noMessagesHint')}</p>
                    </div>
                ) : (
                    <>
                        {messages.map(msg => {
                            // Determine if message is from current user by comparing sender ID
                            // Handle both string IDs and populated sender objects
                            const senderId = typeof msg.senderId === 'object' && msg.senderId !== null
                                ? (msg.senderId as any)._id || (msg.senderId as any).id
                                : msg.senderId;
                            const isCurrentUserMessage = String(senderId) === String(currentUserId);

                            // Get the other person in the conversation based on current user's role
                            const isCurrentUserBuyer = String(conversation.buyer?.id || conversation.buyerId) === String(currentUserId);
                            const otherPerson = isCurrentUserMessage
                                ? null // Don't need avatar for own messages
                                : (isCurrentUserBuyer
                                    ? (conversation.seller || property?.seller)
                                    : (conversation.buyer || { name: 'Buyer', avatarUrl: null }));

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex items-end gap-1.5 sm:gap-2 ${isCurrentUserMessage ? 'justify-end' : 'justify-start'}`}
                                >
                                    {!isCurrentUserMessage && otherPerson && (
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex-shrink-0 bg-neutral-100 ring-2 ring-white/60 shadow-sm">
                                            {otherPerson.avatarUrl ? (
                                                <img src={otherPerson.avatarUrl} alt={otherPerson.name} loading="lazy" decoding="async" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                                <UserCircleIcon className="w-full h-full text-neutral-400" />
                                            )}
                                        </div>
                                    )}
                                    <div className={`max-w-[75%] sm:max-w-md p-2.5 sm:p-3 rounded-2xl shadow-sm ${isCurrentUserMessage
                                        ? 'bg-primary text-white rounded-br-lg'
                                        : 'bg-neutral-100 text-neutral-800 rounded-bl-lg'
                                    }`}>
                                        {msg.text && <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{msg.text}</p>}
                                        {msg.imageUrl && (
                                            <div className={msg.text ? 'mt-2' : ''}>
                                                <MessageImage imageUrl={msg.imageUrl} t={t} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="flex items-end gap-1.5 sm:gap-2 justify-start animate-pulse">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden flex-shrink-0 bg-neutral-100 ring-2 ring-primary ring-opacity-50">
                                    {(conversation.seller?.avatarUrl || property?.seller?.avatarUrl) ? (
                                        <img
                                            src={conversation.seller?.avatarUrl || property?.seller?.avatarUrl}
                                            alt="Seller"
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <UserCircleIcon className="w-full h-full text-neutral-400" />
                                    )}
                                </div>
                                <div className="bg-neutral-100 p-2.5 sm:p-3 rounded-2xl rounded-bl-lg shadow-sm">
                                    <div className="flex gap-1">
                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies - Horizontal scroll on mobile */}
            <div className="px-2 py-1.5 sm:p-2 border-t border-neutral-200 flex-shrink-0 overflow-x-auto">
                <div className="flex items-center gap-1.5 sm:gap-2 sm:justify-center min-w-max sm:min-w-0 sm:flex-wrap">
                    <button
                        onClick={() => handleSendMessage(t('quickReplies.scheduleTourMessage'))}
                        className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-primary-dark bg-primary-light rounded-full hover:bg-primary/20 transition-colors whitespace-nowrap"
                    >
                        <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4"/> {t('quickReplies.scheduleTour')}
                    </button>
                    <button
                        onClick={() => handleSendMessage(t('quickReplies.requestInfoMessage'))}
                        className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-primary-dark bg-primary-light rounded-full hover:bg-primary/20 transition-colors whitespace-nowrap"
                    >
                        {t('quickReplies.requestInfo')}
                    </button>
                    <button
                        onClick={() => handleSendMessage(t('quickReplies.makeOfferMessage'))}
                        className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-primary-dark bg-primary-light rounded-full hover:bg-primary/20 transition-colors whitespace-nowrap"
                    >
                        {t('quickReplies.makeOffer')}
                    </button>
                </div>
            </div>

            {/* Message Input */}
            <div className="p-2 sm:p-3 border-t border-neutral-200 flex-shrink-0 bg-neutral-50">
                <MessageInput
                    onSendMessage={handleSendMessage}
                    onTyping={(typing) => socketService.sendTyping(conversation.id, typing)}
                    disabled={isLoading}
                />
            </div>
        </div>
    );
};

export default ConversationView;
