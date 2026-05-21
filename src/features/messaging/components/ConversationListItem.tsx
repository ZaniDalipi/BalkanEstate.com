import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Conversation } from '@/types';
import { useAppContext } from '@/context/AppContext';
import { BuildingOfficeIcon, UserCircleIcon } from '@/constants';
import { markConversationAsRead } from '@/services/apiService';

interface ConversationListItemProps {
    conversation: Conversation;
    isSelected: boolean;
    onSelect: () => void;
}

function formatRelativeTime(ts: number | string | undefined): string {
    if (!ts) return '';
    const date = new Date(ts);
    if (isNaN(date.getTime())) return '';
    const now = Date.now();
    const diff = now - date.getTime();
    const mins = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// WhatsApp-style read receipt ticks
const SingleTick = () => (
    <svg viewBox="0 0 16 11" className="w-4 h-3 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1.5,5.5 5.5,9.5 14.5,1.5" />
    </svg>
);

const DoubleTick = ({ read }: { read: boolean }) => (
    <svg viewBox="0 0 20 11" className={`w-5 h-3 fill-none stroke-current ${read ? 'text-blue-500' : 'text-neutral-400'}`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="1.5,5.5 5.5,9.5 14.5,1.5" />
        <polyline points="6,5.5 10,9.5 19,1.5" />
    </svg>
);

const ConversationListItem: React.FC<ConversationListItemProps> = ({ conversation, isSelected, onSelect }) => {
    const { t } = useTranslation(['messages']);
    const { state, dispatch } = useAppContext();
    const property = conversation.property || state.properties.find(p => p.id === conversation.propertyId);
    const resolvedImageUrl = property?.imageUrl || property?.images?.[0]?.url;
    const [imageError, setImageError] = useState(!resolvedImageUrl);
    const currentUserId = state.currentUser?.id;

    // Use lastMessage from conversation if messages array is empty
    const lastMessage = (conversation.messages && conversation.messages.length > 0)
        ? conversation.messages[conversation.messages.length - 1]
        : conversation.lastMessage || null;

    // Determine if current user is buyer or seller
    const isBuyer = String(conversation.buyerId) === String(currentUserId);

    // MY unread count (messages sent to me that I haven't read)
    const unreadCount = isBuyer ? conversation.buyerUnreadCount : conversation.sellerUnreadCount;

    // THEIR unread count (messages I sent that they haven't read — for read receipts)
    const theirUnreadCount = isBuyer ? conversation.sellerUnreadCount : conversation.buyerUnreadCount;

    // Resolve last message sender ID (handles populated objects)
    const lastMsgSenderId = lastMessage
        ? (typeof lastMessage.senderId === 'object' && lastMessage.senderId !== null
            ? (lastMessage.senderId as any)._id || (lastMessage.senderId as any).id
            : lastMessage.senderId)
        : null;
    const lastMessageByMe = lastMessage ? String(lastMsgSenderId) === String(currentUserId) : false;

    // Show receipt only when I sent the last message
    const showReceipt = lastMessageByMe;
    // theirUnreadCount === 0 means they've read my last message
    const messageRead = theirUnreadCount === 0;

    // Timestamp: prefer lastMessageAt, fall back to lastMessage.timestamp, then conversation.createdAt
    const timestamp = conversation.lastMessageAt || lastMessage?.timestamp || conversation.createdAt;
    const timeLabel = formatRelativeTime(timestamp);

    const otherPersonName = isBuyer
        ? (conversation.seller?.name || property?.seller?.name || t('messages:inbox.seller', 'Seller'))
        : (conversation.buyer?.name || t('messages:inbox.buyer', 'Buyer'));

    const handleClick = () => {
        onSelect();
        if (unreadCount > 0) {
            dispatch({ type: 'MARK_CONVERSATION_AS_READ', payload: conversation.id });
            markConversationAsRead(conversation.id).catch(() => {});
        }
    };

    const displayTitle = property
        ? (property.title || property.address)
        : otherPersonName;
    const displaySubtitle = property
        ? `${property.address ? `${property.address}, ` : ''}${property.city}, ${property.country}`
        : (conversation.seller?.role === 'agent'
            ? t('messages:inbox.directAgentConversation', 'Direct Agent Conversation')
            : t('messages:inbox.directConversation', 'Direct Conversation'));

    const hasUnread = unreadCount > 0;

    return (
        <button
            onClick={handleClick}
            className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-all duration-150 border-b border-neutral-100 ${
                isSelected
                    ? 'bg-primary/8 border-l-2 border-l-primary'
                    : hasUnread
                        ? 'bg-blue-50/50 hover:bg-blue-50'
                        : 'hover:bg-neutral-50'
            }`}
        >
            {/* Avatar / thumbnail */}
            <div className="relative flex-shrink-0">
                {!property ? (
                    <div className="w-14 h-14 bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center rounded-full">
                        <UserCircleIcon className="w-7 h-7 text-primary/60" />
                    </div>
                ) : imageError ? (
                    <div className="w-14 h-14 bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center rounded-xl">
                        <BuildingOfficeIcon className="w-7 h-7 text-neutral-400" />
                    </div>
                ) : (
                    <img
                        src={resolvedImageUrl}
                        alt={property.address}
                        loading="lazy"
                        decoding="async"
                        className="w-14 h-14 object-cover rounded-xl"
                        onError={() => setImageError(true)}
                    />
                )}

                {/* Unread dot — positioned outside thumbnail */}
                {hasUnread && (
                    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow ring-2 ring-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* Row 1: title + time */}
                <div className="flex items-center justify-between gap-2 mb-0.5">
                    <p className={`text-sm truncate ${
                        hasUnread ? 'font-bold text-neutral-900' : isSelected ? 'font-semibold text-primary-dark' : 'font-semibold text-neutral-800'
                    }`}>
                        {displayTitle}
                    </p>
                    <span className={`text-[11px] flex-shrink-0 ${hasUnread ? 'text-primary font-semibold' : 'text-neutral-400'}`}>
                        {timeLabel}
                    </span>
                </div>

                {/* Row 2: subtitle */}
                <p className="text-xs text-neutral-500 truncate mb-0.5">{displaySubtitle}</p>

                {/* Row 3: message preview + read receipt / unread badge */}
                {lastMessage && (
                    <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs truncate flex-1 ${hasUnread ? 'font-semibold text-neutral-800' : 'text-neutral-500'}`}>
                            <span className={`${lastMessageByMe ? 'text-neutral-400' : ''}`}>
                                {lastMessageByMe
                                    ? `${t('messages:inbox.you', 'You')}: `
                                    : `${otherPersonName}: `}
                            </span>
                            {lastMessage.text || t('messages:inbox.image', '📷 Image')}
                        </p>

                        {/* Read receipt for my sent messages */}
                        {showReceipt && !hasUnread && (
                            <span className="flex-shrink-0">
                                <DoubleTick read={messageRead} />
                            </span>
                        )}
                    </div>
                )}
            </div>
        </button>
    );
};

export default ConversationListItem;
