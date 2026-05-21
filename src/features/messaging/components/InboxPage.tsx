import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import ConversationList from './ConversationList';
import ConversationView from './ConversationView';
import { EnvelopeIcon } from '@/constants';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import { SEO } from '@/src/components/seo';

const InboxPage: React.FC = () => {
    const { t } = useTranslation(['messages', 'nav']);
    const { state, dispatch, fetchProperties } = useAppContext();
    const { conversations, properties, isAuthenticated, activeConversationId, isLoadingProperties } = state;

    // Responsive breakpoint detection
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);

    useEffect(() => {
        const checkScreenSize = () => {
            const width = window.innerWidth;
            setIsMobile(width < 768);
            setIsTablet(width >= 768 && width < 1024);
        };
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    // Load featured properties for the empty inbox state if not already loaded
    useEffect(() => {
        if (isAuthenticated && conversations.length === 0 && properties.length === 0 && !isLoadingProperties) {
            fetchProperties();
        }
    }, [isAuthenticated, conversations.length, properties.length, isLoadingProperties, fetchProperties]);

    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

    // Use activeConversationId from global state if available (highest priority)
    useEffect(() => {
        if (activeConversationId) {
            const conversation = conversations.find(c => c.id === activeConversationId);
            if (conversation) {
                setSelectedConversationId(activeConversationId);
                setTimeout(() => {
                    dispatch({ type: 'SET_ACTIVE_CONVERSATION', payload: null });
                }, 100);
            }
        }
    }, [activeConversationId, conversations, dispatch]);

    // Auto-select first conversation on desktop when no conversation is selected
    useEffect(() => {
        if (!isMobile && !selectedConversationId && conversations.length > 0 && !activeConversationId) {
            setSelectedConversationId(conversations[0].id);
        }
    }, [isMobile, selectedConversationId, conversations, activeConversationId]);

    const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;
    const featuredProperties = properties.slice(0, 3);

    if (!isAuthenticated) {
        return (
            <div className="min-h-[calc(100vh-64px)] w-full flex flex-col items-center justify-center p-4 sm:p-8 text-center">
                <EnvelopeIcon className="w-12 h-12 sm:w-16 sm:h-16 text-neutral-300 mb-4" />
                <h2 className="text-xl sm:text-2xl font-bold text-neutral-800">{t('messages:inbox.loginToView')}</h2>
                <p className="text-sm sm:text-base text-neutral-600 mt-2 max-w-md">
                    {t('messages:inbox.communicateWithSellers')}
                </p>
                <button
                    onClick={() => dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } })}
                    className="mt-6 sm:mt-8 px-5 sm:px-6 py-2.5 sm:py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark transition-colors text-sm sm:text-base"
                >
                    {t('nav:loginRegister')}
                </button>
            </div>
        );
    }

    if (conversations.length === 0 && !activeConversationId) {
        return (
            <div className="h-[calc(100vh-64px)] w-full overflow-y-auto">
                <div className="flex flex-col items-center px-4 sm:px-8 pt-12 pb-10 text-center">
                    <EnvelopeIcon className="w-12 h-12 sm:w-16 sm:h-16 text-neutral-300 mb-4" />
                    <h2 className="text-xl sm:text-2xl font-bold text-neutral-800">{t('messages:inbox.emptyInbox')}</h2>
                    <p className="text-sm sm:text-base text-neutral-600 mt-2 max-w-md">
                        {t('messages:inbox.inquireToStart')}
                    </p>
                    <div className="mt-8 w-full max-w-4xl text-left">
                        <h3 className="text-base sm:text-lg font-semibold text-neutral-700 mb-4 text-center">
                            {t('messages:inbox.featuredProperties')}
                        </h3>
                        {isLoadingProperties ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="rounded-xl bg-neutral-100 animate-pulse h-64" />
                                ))}
                            </div>
                        ) : featuredProperties.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                                {featuredProperties.map(prop => (
                                    <PropertyCard key={prop.id} property={prop} />
                                ))}
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        );
    }

    // Loading state when waiting for conversation to be created
    if (conversations.length === 0 && activeConversationId) {
        return (
            <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary"></div>
                    <p className="text-sm sm:text-base text-neutral-600">{t('messages:inbox.creatingConversation')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-64px)] md:h-[calc(100vh-64px)] w-full flex flex-col bg-neutral-50">
            {/* SEO - noindex for private page */}
            <SEO
                title={t('messages:inbox.inboxTitle')}
                description={t('messages:inbox.communicateWithSellers')}
                noindex={true}
            />

            <main className="flex-1 flex flex-row overflow-hidden min-h-0">
                {/* Conversation List - Sidebar */}
                <div className={`
                    ${isMobile && selectedConversationId ? 'hidden' : 'flex'}
                    flex-col w-full md:w-80 lg:w-96 h-full flex-shrink-0 bg-white border-r border-neutral-200
                `}>
                    <ConversationList
                        conversations={conversations}
                        selectedConversationId={selectedConversationId}
                        onSelectConversation={setSelectedConversationId}
                    />
                </div>

                {/* Conversation View - Main Content */}
                <div className={`
                    ${isMobile && !selectedConversationId ? 'hidden' : 'flex'}
                    flex-col flex-1 h-full min-w-0
                `}>
                    {selectedConversation ? (
                        <ConversationView
                            conversation={selectedConversation}
                            onBack={() => isMobile && setSelectedConversationId(null)}
                        />
                    ) : activeConversationId ? (
                        <div className="h-full flex items-center justify-center text-center p-4">
                            <div className="flex flex-col items-center gap-4">
                                <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary"></div>
                                <p className="text-sm sm:text-base text-neutral-600">{t('messages:inbox.loadingConversation')}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full hidden md:flex items-center justify-center text-center text-neutral-500 p-4">
                            <p className="text-sm sm:text-base">{t('messages:inbox.selectConversation')}</p>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default InboxPage;
