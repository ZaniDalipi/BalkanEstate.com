import React from 'react';
import { useTranslation } from 'react-i18next';
import { Conversation } from '@/types';
import ConversationListItem from './ConversationListItem';

interface ConversationListProps {
    conversations: Conversation[];
    selectedConversationId: string | null;
    onSelectConversation: (id: string) => void;
}

const ConversationList: React.FC<ConversationListProps> = ({ conversations, selectedConversationId, onSelectConversation }) => {
    const { t } = useTranslation(['messages']);

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-neutral-200 flex-shrink-0">
                <h2 className="text-xl font-bold text-neutral-800">{t('messages:inbox.allConversations')}</h2>
            </div>
            <div className="flex-grow overflow-y-auto">
                {conversations.map(conversation => (
                    <ConversationListItem 
                        key={conversation.id}
                        conversation={conversation}
                        isSelected={conversation.id === selectedConversationId}
                        onSelect={() => onSelectConversation(conversation.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default ConversationList;
