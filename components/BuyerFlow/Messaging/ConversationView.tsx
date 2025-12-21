import React, { useRef, useEffect, useState } from 'react';
import { Conversation, Message } from '../../../types';
import { useAppContext } from '../../../context/AppContext';
import MessageInput from './MessageInput';
import { formatPrice } from '../../../utils/currency';
import { CalendarIcon, UserCircleIcon, ChevronLeftIcon, BuildingOfficeIcon, ShieldExclamationIcon, TrashIcon } from '../../../constants';
import { getConversation, sendMessage as sendMessageAPI, uploadMessageImage, getSecurityWarning } from '../../../services/apiService';
import { socketService } from '../../../services/socketService';
import { notificationService } from '../../../services/notificationService';

interface ConversationViewProps {
    conversation: Conversation;
    onBack?: () => void; // Optional callback for mobile back button
}

const MessageImage: React.FC<{imageUrl: string}> = ({imageUrl}) => {
    const [error, setError] = useState(false);
    useEffect(() => { setError(false); }, [imageUrl]);

    if(error) {
        return <div className="p-4 bg-neutral-200 rounded-lg text-neutral-500 text-xs">Image failed to load.</div>
    }

    return <img src={imageUrl} alt="Annotated property" className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity" onError={() => setError(true)} onClick={() => window.open(imageUrl, '_blank')} />
}

const ConversationView: React.FC<ConversationViewProps> = ({ conversation, onBack }) => {
    const { state, dispatch, deleteConversation } = useAppContext();
    const [imageError, setImageError] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [securityWarning, setSecurityWarning] = useState<string | null>(null);
    const [showSecurityAlert, setShowSecurityAlert] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
    const property = conversation.property || state.properties.find(p => p.id === conversation.propertyId);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const currentUserId = state.currentUser?.id;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }

    useEffect(scrollToBottom, [messages]);

    // Load messages when conversation opens
    useEffect(() => {
        const loadMessages = async () => {
            try {
                const data = await getConversation(conversation.id);
                setMessages(data.messages);
            } catch (error) {
                console.error('Failed to load messages:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadMessages();

        // Load security warning
        getSecurityWarning().then(setSecurityWarning).catch(console.error);

        // Join conversation room for real-time updates
        socketService.joinConversation(conversation.id);

        // Listen for new messages via WebSocket
        const unsubscribeMessage = socketService.onMessage(conversation.id, (message: Message) => {
            console.log('📨 Real-time message received:', message);
            setMessages(prev => {
                // Avoid duplicates
                if (prev.some(m => m.id === message.id)) {
                    return prev;
                }

                // Play notification sound and show browser notification for messages from other person
                if (message.senderId !== currentUserId) {
                    playNotificationSound();

                    // Show browser notification
                    const otherPerson = conversation.seller || property?.seller;
                    if (otherPerson && property) {
                        notificationService.showNewMessageNotification(
                            otherPerson.name || 'Seller',
                            message.text || '[Image]',
                            `${property.address}, ${property.city}`
                        );
                    }
                }

                // Update conversation in AppContext so the list updates
                dispatch({ type: 'ADD_MESSAGE', payload: { conversationId: conversation.id, message } });

                return [...prev, message];
            });
        });

        // Listen for typing indicators
        const unsubscribeTyping = socketService.onTyping(conversation.id, (data) => {
            if (data.userId !== currentUserId) {
                setIsTyping(data.isTyping);

                // Auto-hide typing indicator after 3 seconds
                if (data.isTyping) {
                    const timeout = setTimeout(() => setIsTyping(false), 3000);
                    setTypingTimeout(timeout);
                } else if (typingTimeout) {
                    clearTimeout(typingTimeout);
                    setTypingTimeout(null);
                }
            }
        });

        // Cleanup
        return () => {
            socketService.leaveConversation(conversation.id);
            unsubscribeMessage();
            unsubscribeTyping();
            if (typingTimeout) clearTimeout(typingTimeout);
        };
    }, [conversation.id, currentUserId]);

    // Play notification sound
    const playNotificationSound = () => {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVanl8LBhGgU7k9n0zoAwBSh+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURELTKXh8bllHAU2jdXzzn0vBSl6yvHajjwIHGm97OilURE=');
            audio.volume = 0.3;
            audio.play().catch(err => console.log('Could not play notification sound:', err));
        } catch (err) {
            console.log('Notification sound not available');
        }
    };

    if (!property) {
        return (
            <div className="h-full flex items-center justify-center text-center text-neutral-500 p-4">
                <p>Property data not found. It may have been removed.</p>
            </div>
        );
    }

    const handleSendMessage = async (text: string, imageFile?: File) => {
        let imageUrl: string | undefined;

        // Upload image if provided
        if (imageFile) {
            try {
                imageUrl = await uploadMessageImage(conversation.id, imageFile);
            } catch (error) {
                console.error('Failed to upload image:', error);
                alert('Failed to upload image. Please try again.');
                throw error;
            }
        }

        // Send message
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

            // Add the sent message to the list with duplicate check
            // (WebSocket message may have already arrived due to race condition)
            setMessages(prev => {
                if (prev.some(m => m.id === result.message.id)) {
                    return prev;
                }
                return [...prev, result.message];
            });

            // Update conversation in AppContext so the list updates
            // (WebSocket handler may have already dispatched this, but duplicate check in reducer would be ideal)
            dispatch({ type: 'ADD_MESSAGE', payload: { conversationId: conversation.id, message: result.message } });

            // Note: Backend will emit WebSocket event to conversation room for real-time delivery

            // Show security warnings if any
            if (result.securityWarnings && result.securityWarnings.length > 0) {
                setShowSecurityAlert(true);
                setTimeout(() => setShowSecurityAlert(false), 5000);
            }
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message. Please try again.');
            throw error;
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
            try {
                await deleteConversation(conversation.id);
                // Go back if on mobile, otherwise conversation list will update
                if (onBack) {
                    onBack();
                }
            } catch (error) {
                console.error('Failed to delete conversation:', error);
                alert('Failed to delete conversation. Please try again.');
            }
        }
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-3 border-b border-neutral-200 flex-shrink-0 flex items-center gap-3">
                {onBack && (
                    <button onClick={onBack} className="md:hidden p-2 text-neutral-600 hover:bg-neutral-100 rounded-full">
                        <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                )}
                {imageError ? (
                    <div className="w-12 h-12 bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center rounded-lg flex-shrink-0">
                        <BuildingOfficeIcon className="w-6 h-6 text-neutral-400" />
                    </div>
                ) : (
                    <img src={property.imageUrl} alt={property.address} className="w-12 h-12 object-cover rounded-lg" onError={() => setImageError(true)} />
                )}
                <div className="flex-grow">
                    <p className="font-bold text-neutral-800 truncate">{property.address}, {property.city}</p>
                    <p className="text-sm font-semibold text-primary">{formatPrice(property.price, property.country)}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => dispatch({ type: 'SET_SELECTED_PROPERTY', payload: property.id })}
                        className="hidden sm:block px-4 py-2 text-sm font-semibold bg-primary-light text-primary-dark rounded-full hover:bg-primary/20 transition-colors"
                    >
                        View Property
                    </button>
                    <button
                        onClick={handleDelete}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Delete conversation"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Security Alert */}
            {showSecurityAlert && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 flex items-start gap-2 animate-fade-in">
                    <ShieldExclamationIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                        <p className="font-semibold">Sensitive information detected</p>
                        <p className="text-xs mt-1">Credit card or financial information has been automatically redacted for your security.</p>
                    </div>
                </div>
            )}

            {/* Security Warning Banner */}
            {securityWarning && (
                <div className="bg-blue-50 border-b border-blue-200 p-2">
                    <details className="cursor-pointer">
                        <summary className="text-xs text-blue-800 font-semibold flex items-center gap-2">
                            <ShieldExclamationIcon className="w-4 h-4" />
                            Security Notice - Click to read
                        </summary>
                        <div className="mt-2 text-xs text-blue-700 whitespace-pre-line">
                            {securityWarning}
                        </div>
                    </details>
                </div>
            )}

            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-neutral-400">
                        <p className="text-sm">No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    <>
                    {messages.map(msg => {
                        const isUser = msg.senderId === currentUserId || msg.senderId === 'user';
                        const otherPerson = isUser ? (conversation.seller || property.seller) : (conversation.buyer || { name: 'Buyer', avatarUrl: null });

                        return (
                            <div
                                key={msg.id}
                                className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                            >
                                {!isUser && (
                                    <div className="flex-shrink-0">
                                        {otherPerson.avatarUrl ? (
                                            <img src={otherPerson.avatarUrl} alt={otherPerson.name} className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <UserCircleIcon className="w-8 h-8 text-neutral-400" />
                                        )}
                                    </div>
                                )}
                                <div className={`max-w-md p-3 rounded-2xl shadow-sm ${isUser
                                    ? 'bg-primary text-white rounded-br-lg'
                                    : 'bg-neutral-100 text-neutral-800 rounded-bl-lg'
                                }`}>
                                    {msg.text && <p className="text-sm whitespace-pre-wrap">{msg.text}</p>}
                                    {msg.imageUrl && (
                                        <div className={msg.text ? 'mt-2' : ''}>
                                            <MessageImage imageUrl={msg.imageUrl} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <div className="flex items-end gap-2 justify-start animate-pulse">
                            <div className="flex-shrink-0">
                                {(conversation.seller?.avatarUrl || property?.seller?.avatarUrl) ? (
                                    <img
                                        src={conversation.seller?.avatarUrl || property?.seller?.avatarUrl}
                                        alt="Seller"
                                        className="w-8 h-8 rounded-full object-cover ring-2 ring-primary ring-opacity-50"
                                    />
                                ) : (
                                    <UserCircleIcon className="w-8 h-8 text-neutral-400" />
                                )}
                            </div>
                            <div className="bg-neutral-100 p-3 rounded-2xl rounded-bl-lg shadow-sm">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-2 border-t border-neutral-200 flex-shrink-0">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button
                        onClick={() => handleSendMessage("Hi! I'm interested in scheduling a tour of this property. When would be a good time?")}
                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-primary-dark bg-primary-light rounded-full hover:bg-primary/20 transition-colors"
                    >
                       <CalendarIcon className="w-4 h-4"/> Schedule a Tour
                   </button>
                    <button
                        onClick={() => handleSendMessage("I'd like to request more information about this property. Could you provide additional details?")}
                        className="px-3 py-1.5 text-xs font-semibold text-primary-dark bg-primary-light rounded-full hover:bg-primary/20 transition-colors"
                    >
                        Request More Info
                    </button>
                    <button
                        onClick={() => handleSendMessage("I'm interested in making an offer on this property. What's the process?")}
                        className="px-3 py-1.5 text-xs font-semibold text-primary-dark bg-primary-light rounded-full hover:bg-primary/20 transition-colors"
                    >
                        Make an Offer
                    </button>
                </div>
            </div>

            <div className="p-4 border-t border-neutral-200 flex-shrink-0 bg-neutral-50">
                <MessageInput
                    onSendMessage={handleSendMessage}
                    onTyping={(isTyping) => socketService.sendTyping(conversation.id, isTyping)}
                    disabled={isLoading}
                />
            </div>
        </div>
    );
};

export default ConversationView;
