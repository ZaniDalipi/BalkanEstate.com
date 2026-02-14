import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatMessage, AiSearchQuery, Property } from '@/types';
import { getAiChatResponse } from '@/services/geminiService';
import { PaperAirplaneIcon, ChatBubbleLeftRightIcon, MicrophoneIcon, StopCircleIcon, SparklesIcon, MapPinIcon } from '@/constants';
import { formatPrice } from '@/utils/currency';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { useAppContext } from '@/context/AppContext';

// --- Web Speech API types ---
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    onstart: (() => void) | null;
}

declare global {
    interface Window {
        SpeechRecognition: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition: new () => SpeechRecognitionInstance;
    }
}

// --- Props ---
interface AiSearchProps {
    properties: Property[];
    onApplyFilters: (query: AiSearchQuery) => void;
    isMobile: boolean;
    history: ChatMessage[];
    onHistoryChange: (history: ChatMessage[]) => void;
}

// --- Filter pill ---
const FilterPill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="bg-primary-light text-primary-dark text-xs font-semibold px-2.5 py-1.5 rounded-full flex items-center justify-center text-center">
        {children}
    </div>
);

// --- Mini Property Card for inline results ---
const MiniPropertyCard: React.FC<{ property: Property }> = ({ property }) => {
    const { dispatch } = useAppContext();

    const handleClick = () => {
        dispatch({ type: 'SET_SELECTED_PROPERTY_OBJECT', payload: property });
        window.history.pushState({ propertyId: property.id }, '', `/property/${property.id}`);
    };

    return (
        <button
            onClick={handleClick}
            className="flex-shrink-0 w-52 bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left cursor-pointer group"
        >
            <div className="relative h-28 w-full overflow-hidden bg-neutral-200">
                <img
                    src={optimizeCloudinaryUrl(property.imageUrl, { width: 320, quality: 'auto' })}
                    alt={property.title || `${property.propertyType} in ${property.city}`}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                    <span className="text-white font-bold text-sm drop-shadow-md">
                        {formatPrice(property.price, property.country)}
                    </span>
                </div>
            </div>
            <div className="p-2.5">
                {property.title && (
                    <p className="text-xs font-semibold text-neutral-900 line-clamp-1 mb-1">{property.title}</p>
                )}
                <div className="flex items-center gap-1 text-neutral-500 mb-1.5">
                    <MapPinIcon className="w-3 h-3 flex-shrink-0" />
                    <span className="text-[11px] truncate">{property.city}, {property.country}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-600">
                    {property.beds > 0 && <span>{property.beds} bed</span>}
                    {property.baths > 0 && <span>{property.baths} bath</span>}
                    {property.sqft > 0 && <span>{property.sqft}m²</span>}
                </div>
            </div>
        </button>
    );
};

// --- Voice button with recording animation ---
const VoiceButton: React.FC<{
    isListening: boolean;
    onStart: () => void;
    onStop: () => void;
    disabled: boolean;
}> = ({ isListening, onStart, onStop, disabled }) => {
    if (isListening) {
        return (
            <button
                type="button"
                onClick={onStop}
                className="relative bg-red-500 text-white rounded-full p-3.5 hover:bg-red-600 transition-colors flex-shrink-0"
                aria-label="Stop recording"
            >
                {/* Pulsing ring animation */}
                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
                <span className="absolute inset-[-4px] rounded-full border-2 border-red-300 animate-pulse" />
                <StopCircleIcon className="w-5 h-5 relative z-10" />
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={onStart}
            disabled={disabled}
            className="bg-neutral-100 text-neutral-600 rounded-full p-3.5 hover:bg-primary hover:text-white disabled:bg-neutral-200 disabled:text-neutral-400 transition-all flex-shrink-0 border border-neutral-200 hover:border-primary"
            aria-label="Start voice search"
        >
            <MicrophoneIcon className="w-5 h-5" />
        </button>
    );
};

// --- Voice waveform visualization ---
const VoiceWaveform: React.FC = () => (
    <div className="flex items-center justify-center gap-[3px] h-6">
        {[...Array(5)].map((_, i) => (
            <div
                key={i}
                className="w-[3px] bg-red-400 rounded-full animate-voice-wave"
                style={{
                    animationDelay: `${i * 0.1}s`,
                    height: '100%',
                }}
            />
        ))}
    </div>
);

// --- Suggestion chips for empty state ---
const SuggestionChips: React.FC<{ onSelect: (text: string) => void }> = ({ onSelect }) => {
    const { t } = useTranslation(['search']);
    const suggestions = [
        t('ai.suggestion1', 'Apartment in Tirana under 80k'),
        t('ai.suggestion2', '3-bed house in Belgrade'),
        t('ai.suggestion3', 'Villa with sea view in Croatia'),
        t('ai.suggestion4', 'Modern flat in Sofia'),
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center mb-4">
                <SparklesIcon className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-neutral-800 mb-1">{t('ai.title')}</h3>
            <p className="text-xs text-neutral-500 mb-4 max-w-[280px]">{t('ai.voiceHint', 'Type or tap the mic to describe your dream property')}</p>
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                {suggestions.map((text, i) => (
                    <button
                        key={i}
                        onClick={() => onSelect(text)}
                        className="px-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 text-neutral-700 rounded-full hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-colors"
                    >
                        {text}
                    </button>
                ))}
            </div>
        </div>
    );
};

// --- Helper to filter properties by AiSearchQuery ---
function filterPropertiesByQuery(properties: Property[], query: AiSearchQuery): Property[] {
    return properties.filter(p => {
        if (query.country && !p.country.toLowerCase().includes(query.country.toLowerCase())) return false;
        if (query.location && !p.city.toLowerCase().includes(query.location.toLowerCase()) && !p.address.toLowerCase().includes(query.location.toLowerCase())) return false;
        if (query.minPrice && p.price < query.minPrice) return false;
        if (query.maxPrice && p.price > query.maxPrice) return false;
        if (query.beds && p.beds < query.beds) return false;
        if (query.baths && p.baths < query.baths) return false;
        if (query.livingRooms && p.livingRooms < query.livingRooms) return false;
        if (query.minSqft && p.sqft < query.minSqft) return false;
        if (query.maxSqft && p.sqft > query.maxSqft) return false;
        if (query.propertyType && query.propertyType !== 'commercial' && p.propertyType !== query.propertyType) return false;
        if (query.sellerType && p.seller?.type !== query.sellerType) return false;
        return true;
    });
}

// --- CSS for voice waveform animation ---
const VoiceWaveStyles = () => (
    <style>{`
        @keyframes voiceWave {
            0%, 100% { transform: scaleY(0.3); }
            50% { transform: scaleY(1); }
        }
        .animate-voice-wave {
            animation: voiceWave 0.6s ease-in-out infinite;
        }
    `}</style>
);

// --- Main Component ---
const AiSearch: React.FC<AiSearchProps> = ({ properties, onApplyFilters, isMobile, history, onHistoryChange }) => {
    const { t } = useTranslation(['search']);
    const [input, setInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [finalQuery, setFinalQuery] = useState<AiSearchQuery | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [voiceSupported, setVoiceSupported] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const chatEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Check speech recognition support
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        setVoiceSupported(!!SpeechRecognition);
    }, []);

    // Filter matching properties when finalQuery changes
    const matchedProperties = useMemo(() => {
        if (!finalQuery) return [];
        return filterPropertiesByQuery(properties, finalQuery).slice(0, 10);
    }, [finalQuery, properties]);

    const scrollToBottom = () => {
        if (history.length > 0 && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    };

    useEffect(scrollToBottom, [history, isSearching, finalQuery, matchedProperties]);

    // Send message handler
    const handleSendMessage = useCallback(async (overrideText?: string) => {
        const text = overrideText || input.trim();
        if (!text) return;

        const userMessage: ChatMessage = { sender: 'user', text };
        const newHistory = [...history, userMessage];
        onHistoryChange(newHistory);
        setInput('');
        setInterimTranscript('');
        setIsSearching(true);
        setFinalQuery(null);

        try {
            const result = await getAiChatResponse(newHistory, properties);
            const aiMessage: ChatMessage = { sender: 'ai', text: result.responseMessage };
            onHistoryChange([...newHistory, aiMessage]);
            if (result.isFinalQuery && result.searchQuery) {
                setFinalQuery(result.searchQuery);
            }
        } catch {
            const errorMessage: ChatMessage = { sender: 'ai', text: t('ai.connectionError') };
            onHistoryChange([...newHistory, errorMessage]);
        } finally {
            setIsSearching(false);
        }
    }, [input, history, properties, onHistoryChange, t]);

    // Voice recognition handlers
    const startListening = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = document.documentElement.lang || 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setInterimTranscript('');
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    final += transcript;
                } else {
                    interim += transcript;
                }
            }

            if (final) {
                setInput(final);
                setInterimTranscript('');
            } else {
                setInterimTranscript(interim);
            }
        };

        recognition.onerror = () => {
            setIsListening(false);
            setInterimTranscript('');
        };

        recognition.onend = () => {
            setIsListening(false);
            // Auto-send if we got a final transcript
            setInput(prev => {
                if (prev.trim()) {
                    // Small delay to let state update
                    setTimeout(() => {
                        handleSendMessage(prev.trim());
                    }, 100);
                }
                return prev;
            });
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [handleSendMessage]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
        };
    }, []);

    const handleApplyClick = () => {
        if (finalQuery) {
            onApplyFilters(finalQuery);
        }
    };

    const handleSuggestionSelect = (text: string) => {
        setInput(text);
        // Focus input and auto-send
        setTimeout(() => handleSendMessage(text), 50);
    };

    const renderFilters = (query: AiSearchQuery) => {
        const formatCurrency = (val: number) => `€${new Intl.NumberFormat('de-DE').format(val)}`;
        const pills = [];

        if (query.location) pills.push(<FilterPill key="loc">📍 {query.location}</FilterPill>);
        if (query.country) pills.push(<FilterPill key="country">🌍 {query.country}</FilterPill>);

        if (query.propertyType) {
            const typeIcons: Record<string, string> = { house: '🏠', apartment: '🏢', villa: '🏛️', land: '🏞️', commercial: '🏪' };
            pills.push(<FilterPill key="type">{typeIcons[query.propertyType] || '🏠'} {query.propertyType}</FilterPill>);
        }

        if (query.minPrice && query.maxPrice) pills.push(<FilterPill key="price">{formatCurrency(query.minPrice)} - {formatCurrency(query.maxPrice)}</FilterPill>);
        else if (query.minPrice) pills.push(<FilterPill key="price">≥ {formatCurrency(query.minPrice)}</FilterPill>);
        else if (query.maxPrice) pills.push(<FilterPill key="price">≤ {formatCurrency(query.maxPrice)}</FilterPill>);

        if (query.beds) pills.push(<FilterPill key="beds">🛏️ {query.beds}+ {t('ai.beds')}</FilterPill>);
        if (query.baths) pills.push(<FilterPill key="baths">🛁 {query.baths}+ {t('ai.baths')}</FilterPill>);
        if (query.livingRooms) pills.push(<FilterPill key="lr">🛋️ {query.livingRooms}+ {t('ai.living')}</FilterPill>);

        if (query.minSqft && query.maxSqft) pills.push(<FilterPill key="sqft">{query.minSqft}-{query.maxSqft} m²</FilterPill>);
        else if (query.minSqft) pills.push(<FilterPill key="sqft">≥ {query.minSqft} m²</FilterPill>);
        else if (query.maxSqft) pills.push(<FilterPill key="sqft">≤ {query.maxSqft} m²</FilterPill>);

        if (query.sellerType) {
            const sellerLabel = query.sellerType === 'agent' ? '👔 Agent' : '👤 Private';
            pills.push(<FilterPill key="seller">{sellerLabel}</FilterPill>);
        }

        if (query.features && query.features.length > 0) {
            query.features.forEach(f => pills.push(<FilterPill key={f}>{f}</FilterPill>));
        }

        return pills;
    };

    const showEmptyState = history.length === 0 && !isSearching;

    return (
        <div className="flex flex-col h-full bg-white border border-neutral-200 rounded-lg overflow-hidden">
            <VoiceWaveStyles />

            {/* Chat area */}
            <div ref={scrollContainerRef} className="flex-grow min-h-0 p-4 space-y-4 overflow-y-auto">
                {showEmptyState ? (
                    <SuggestionChips onSelect={handleSuggestionSelect} />
                ) : (
                    <>
                        {history.map((msg, index) => (
                            <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.sender === 'ai' && (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <SparklesIcon className="w-4 h-4 text-white" />
                                    </div>
                                )}
                                <div className={`max-w-xs md:max-w-md p-3 rounded-2xl shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white rounded-br-none' : 'bg-neutral-100 text-neutral-800 rounded-bl-none'}`}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                </div>
                            </div>
                        ))}

                        {/* Typing indicator */}
                        {isSearching && (
                            <div className="flex items-end gap-2 justify-start">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <SparklesIcon className="w-4 h-4 text-white" />
                                </div>
                                <div className="p-3 rounded-2xl bg-white border shadow-sm rounded-bl-none">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-pulse [animation-delay:-0.3s]" />
                                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-pulse [animation-delay:-0.15s]" />
                                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Inline property results when AI has a final query */}
                        {finalQuery && matchedProperties.length > 0 && (
                            <div className="animate-fade-in">
                                <div className="flex items-end gap-2 justify-start">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                        <SparklesIcon className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="max-w-full min-w-0 flex-1">
                                        <p className="text-xs font-medium text-neutral-500 mb-2 ml-1">
                                            {t('ai.foundProperties', '{{count}} properties found', { count: matchedProperties.length })}
                                        </p>
                                        {/* Horizontal scrollable property cards */}
                                        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-transparent">
                                            {matchedProperties.map(property => (
                                                <MiniPropertyCard key={property.id} property={property} />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* No results message */}
                        {finalQuery && matchedProperties.length === 0 && (
                            <div className="flex items-end gap-2 justify-start animate-fade-in">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <SparklesIcon className="w-4 h-4 text-white" />
                                </div>
                                <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 rounded-bl-none">
                                    <p className="text-sm">{t('ai.noResults')}</p>
                                    <p className="text-xs mt-1 text-amber-600">{t('ai.tryDifferent')}</p>
                                </div>
                            </div>
                        )}
                    </>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Voice listening banner */}
            {isListening && (
                <div className="flex-shrink-0 bg-gradient-to-r from-red-50 to-red-100 border-t border-red-200 px-4 py-2.5 flex items-center gap-3">
                    <div className="relative flex-shrink-0">
                        <div className="w-3 h-3 bg-red-500 rounded-full" />
                        <div className="absolute inset-0 w-3 h-3 bg-red-400 rounded-full animate-ping" />
                    </div>
                    <VoiceWaveform />
                    <p className="text-sm text-red-700 font-medium flex-grow truncate">
                        {interimTranscript || t('ai.listening', 'Listening...')}
                    </p>
                </div>
            )}

            {/* Input area */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!finalQuery && !isListening) handleSendMessage();
                }}
                className="flex-shrink-0 p-3 bg-white border-t space-y-2"
            >
                {/* Filter pills + proceed button */}
                {finalQuery && (
                    <div className="animate-fade-in pb-2 border-b border-neutral-100">
                        <div className="flex flex-wrap items-center gap-1.5 mb-2">
                            {renderFilters(finalQuery)}
                        </div>
                        <button
                            type="button"
                            onClick={handleApplyClick}
                            className="w-full py-2.5 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-primary-dark active:scale-[0.98] transition-all text-sm"
                        >
                            {t('ai.proceed')} ({matchedProperties.length})
                        </button>
                    </div>
                )}

                {/* Input row */}
                <div className="flex items-end gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={isListening ? interimTranscript : input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isListening ? t('ai.listening', 'Listening...') : t('ai.placeholder')}
                        className="flex-grow px-4 py-3 text-sm text-neutral-900 bg-neutral-50 border-neutral-200 border rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-60 transition-all"
                        disabled={isSearching || isListening}
                    />

                    {/* Voice button */}
                    {voiceSupported && (
                        <VoiceButton
                            isListening={isListening}
                            onStart={startListening}
                            onStop={stopListening}
                            disabled={isSearching}
                        />
                    )}

                    {/* Send button - only show when not listening */}
                    {!isListening && (
                        <button
                            type="submit"
                            disabled={isSearching || !input.trim() || !!finalQuery}
                            className="bg-primary text-white rounded-full p-3.5 hover:bg-primary-dark disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors flex-shrink-0"
                        >
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default AiSearch;
