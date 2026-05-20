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

    // Determine if current user is buyer or seller, and use appropriate unread count
    const isBuyer = String(conversation.buyerId) === String(currentUserId);
    const unreadCount = isBuyer ? conversation.buyerUnreadCount : conversation.sellerUnreadCount;

    // Get the other person's name for displaying in message preview
    const otherPersonName = isBuyer
        ? (conversation.seller?.name || property?.seller?.name || t('messages:inbox.seller', 'Seller'))
        : (conversation.buyer?.name || t('messages:inbox.buyer', 'Buyer'));

    const handleClick = () => {
        onSelect();
        if (unreadCount > 0) {
            dispatch({ type: 'MARK_CONVERSATION_AS_READ', payload: conversation.id });
            // Sync with backend (fire-and-forget — don't block UI)
            markConversationAsRead(conversation.id).catch(() => {});
        }
    };

    // Display label: property address or agent/seller name for direct conversations
    const displayTitle = property
        ? (property.title || property.address)
        : otherPersonName;
    const displaySubtitle = property
        ? `${property.address ? `${property.address}, ` : ''}${property.city}, ${property.country}`
        : (conversation.seller?.role === 'agent'
            ? t('messages:inbox.directAgentConversation', 'Direct Agent Conversation')
            : t('messages:inbox.directConversation', 'Direct Conversation'));

    return (
        <button
            onClick={handleClick}
            className={`w-full text-left p-4 flex items-start gap-3 transition-all duration-200 border-b border-neutral-100 ${
                isSelected
                    ? 'bg-gradient-to-r from-primary-light to-primary-light/70 shadow-sm'
                    : 'hover:bg-neutral-50 hover:shadow-sm'
            }`}
        >
            <div className="relative flex-shrink-0">
                {!property ? (
                    <div className="w-16 h-16 bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center rounded-md">
                        <UserCircleIcon className="w-8 h-8 text-primary/60" />
                    </div>
                ) : imageError ? (
                    <div className="w-16 h-16 bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center rounded-md">
                        <BuildingOfficeIcon className="w-8 h-8 text-neutral-400" />
                    </div>
                ) : (
                    <img
                        src={resolvedImageUrl}
                        alt={property.address}
                        loading="lazy"
                        decoding="async"
                        className="w-16 h-16 object-cover rounded-md"
                        onError={() => setImageError(true)}
                    />
                )}
                {unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-white shadow-md"></div>
                )}
            </div>
            <div className="flex-grow overflow-hidden">
                <div className="flex justify-between items-center">
                    <p className={`font-bold text-sm truncate ${isSelected ? 'text-primary-dark' : 'text-neutral-800'}`}>
                        {displayTitle}
                    </p>
                    {unreadCount > 0 && (
                         <span className="bg-primary text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 ml-2">
                            {unreadCount}
                        </span>
                    )}
                </div>
                <p className="text-xs text-neutral-500 truncate">{displaySubtitle}</p>
                {lastMessage && (
                    <p className={`text-xs mt-1 truncate ${unreadCount > 0 ? 'font-bold text-neutral-800' : 'text-neutral-600'}`}>
                        {(() => {
                            // Handle both string IDs and populated sender objects
                            const senderId = typeof lastMessage.senderId === 'object' && lastMessage.senderId !== null
                                ? (lastMessage.senderId as any)._id || (lastMessage.senderId as any).id
                                : lastMessage.senderId;
                            const isFromCurrentUser = String(senderId) === String(currentUserId);
                            return isFromCurrentUser ? `${t('messages:inbox.you', 'You')}: ` : `${otherPersonName}: `;
                        })()}
                        {lastMessage.text || t('messages:inbox.image', 'Image')}
                    </p>
                )}
            </div>
        </button>
    );
};

export default ConversationListItem;
