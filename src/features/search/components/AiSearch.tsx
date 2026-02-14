import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatMessage, AiSearchQuery, Property } from '@/types';
import { getAiChatResponse } from '@/services/geminiService';
import { PaperAirplaneIcon, MicrophoneIcon, StopCircleIcon, SparklesIcon, MapPinIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@/constants';
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

// --- Suggestion chips for empty state ---
const SuggestionChips: React.FC<{ onSelect: (text: string) => void; onMicClick: () => void; voiceSupported: boolean }> = ({ onSelect, onMicClick, voiceSupported }) => {
    const { t } = useTranslation(['search']);
    const suggestions = [
        t('ai.suggestion1', 'Apartment in Tirana under 80k'),
        t('ai.suggestion2', '3-bed house in Belgrade'),
        t('ai.suggestion3', 'Villa with sea view in Croatia'),
        t('ai.suggestion4', 'Modern flat in Sofia'),
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            {/* Voice assistant orb */}
            <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-blue-500 to-violet-500 flex items-center justify-center shadow-lg shadow-primary/25">
                    <SparklesIcon className="w-9 h-9 text-white" />
                </div>
                <div className="absolute -inset-1 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 animate-pulse -z-10" />
            </div>
            <h3 className="text-lg font-bold text-neutral-800 mb-1">{t('ai.assistantTitle', 'Property Assistant')}</h3>
            <p className="text-sm text-neutral-500 mb-5 max-w-[300px]">
                {t('ai.assistantHint', 'Ask me anything about properties — type or use your voice')}
            </p>

            {/* Big mic button for voice-first experience */}
            {voiceSupported && (
                <button
                    onClick={onMicClick}
                    className="group mb-6 relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                    <MicrophoneIcon className="w-7 h-7" />
                    <span className="absolute -bottom-6 text-xs text-neutral-500 font-medium whitespace-nowrap">{t('ai.tapToSpeak', 'Tap to speak')}</span>
                </button>
            )}

            <div className="flex flex-wrap justify-center gap-2 max-w-sm mt-2">
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

// --- CSS for animations ---
const VoiceAssistantStyles = () => (
    <style>{`
        @keyframes voiceWave {
            0%, 100% { transform: scaleY(0.3); }
            50% { transform: scaleY(1); }
        }
        .animate-voice-wave {
            animation: voiceWave 0.6s ease-in-out infinite;
        }
        @keyframes orbPulse {
            0%, 100% { transform: scale(1); opacity: 0.6; }
            50% { transform: scale(1.15); opacity: 0.3; }
        }
        .animate-orb-pulse {
            animation: orbPulse 2s ease-in-out infinite;
        }
        @keyframes speakingBounce {
            0%, 100% { transform: scaleY(0.4); }
            50% { transform: scaleY(1.0); }
        }
        .animate-speaking-bar {
            animation: speakingBounce 0.5s ease-in-out infinite;
        }
    `}</style>
);

// --- Speaking indicator bars ---
const SpeakingIndicator: React.FC = () => (
    <div className="flex items-center gap-[2px] h-4">
        {[...Array(4)].map((_, i) => (
            <div
                key={i}
                className="w-[3px] bg-primary rounded-full animate-speaking-bar"
                style={{ animationDelay: `${i * 0.12}s`, height: '100%' }}
            />
        ))}
    </div>
);

// --- Voice waveform ---
const VoiceWaveform: React.FC = () => (
    <div className="flex items-center justify-center gap-[3px] h-6">
        {[...Array(5)].map((_, i) => (
            <div
                key={i}
                className="w-[3px] bg-red-400 rounded-full animate-voice-wave"
                style={{ animationDelay: `${i * 0.1}s`, height: '100%' }}
            />
        ))}
    </div>
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
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [autoListenAfterSpeak, setAutoListenAfterSpeak] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const isVoiceSessionRef = useRef(false);

    // Check speech support
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

    // --- Text-to-Speech ---
    const speak = useCallback((text: string) => {
        if (!ttsEnabled || !window.speechSynthesis) return;

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        // Clean text for speech - remove emojis and special chars
        const cleanText = text
            .replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '')
            .replace(/\s+/g, ' ')
            .trim();

        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Try to pick a good voice
        const voices = window.speechSynthesis.getVoices();
        const lang = document.documentElement.lang || 'en';
        const preferred = voices.find(v => v.lang.startsWith(lang) && v.name.includes('Google'))
            || voices.find(v => v.lang.startsWith(lang))
            || voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
            || voices[0];
        if (preferred) utterance.voice = preferred;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            // Auto-listen after AI finishes speaking (voice conversation mode)
            if (isVoiceSessionRef.current && autoListenAfterSpeak) {
                setTimeout(() => {
                    startListeningInternal();
                }, 400);
            }
        };
        utterance.onerror = () => setIsSpeaking(false);

        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, [ttsEnabled, autoListenAfterSpeak]);

    const stopSpeaking = useCallback(() => {
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
    }, []);

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

            // Voice assistant speaks the response
            speak(result.responseMessage);
        } catch {
            const errorMessage: ChatMessage = { sender: 'ai', text: t('ai.connectionError') };
            onHistoryChange([...newHistory, errorMessage]);
        } finally {
            setIsSearching(false);
        }
    }, [input, history, properties, onHistoryChange, t, speak]);

    // Voice recognition - internal start (used by auto-listen)
    const startListeningInternal = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) return;

        // Stop any ongoing speech
        stopSpeaking();

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
            let finalText = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalText += transcript;
                } else {
                    interim += transcript;
                }
            }

            if (finalText) {
                setInput(finalText);
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
                    setTimeout(() => {
                        handleSendMessage(prev.trim());
                    }, 100);
                }
                return prev;
            });
        };

        recognitionRef.current = recognition;
        recognition.start();
    }, [handleSendMessage, stopSpeaking]);

    // Voice recognition - user triggered (starts a voice session)
    const startListening = useCallback(() => {
        isVoiceSessionRef.current = true;
        setAutoListenAfterSpeak(true);
        startListeningInternal();
    }, [startListeningInternal]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        isVoiceSessionRef.current = false;
        setAutoListenAfterSpeak(false);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort();
            }
            window.speechSynthesis?.cancel();
        };
    }, []);

    // Ensure voices are loaded
    useEffect(() => {
        if (window.speechSynthesis) {
            window.speechSynthesis.getVoices();
            window.speechSynthesis.onvoiceschanged = () => {
                window.speechSynthesis.getVoices();
            };
        }
    }, []);

    const handleApplyClick = () => {
        if (finalQuery) {
            onApplyFilters(finalQuery);
        }
    };

    const handleSuggestionSelect = (text: string) => {
        setInput(text);
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
            <VoiceAssistantStyles />

            {/* Header with TTS toggle */}
            {history.length > 0 && (
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-gradient-to-r from-primary/5 to-violet-500/5 border-b border-neutral-100">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                            <SparklesIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="text-xs font-semibold text-neutral-700">{t('ai.assistantTitle', 'Property Assistant')}</span>
                        {isSpeaking && <SpeakingIndicator />}
                    </div>
                    <div className="flex items-center gap-1">
                        {/* TTS toggle */}
                        <button
                            onClick={() => {
                                if (isSpeaking) stopSpeaking();
                                setTtsEnabled(prev => !prev);
                            }}
                            className={`p-1.5 rounded-full transition-colors ${ttsEnabled ? 'text-primary hover:bg-primary/10' : 'text-neutral-400 hover:bg-neutral-100'}`}
                            title={ttsEnabled ? t('ai.muteAssistant', 'Mute voice') : t('ai.unmuteAssistant', 'Unmute voice')}
                        >
                            {ttsEnabled ? <SpeakerWaveIcon className="w-4 h-4" /> : <SpeakerXMarkIcon className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            )}

            {/* Chat area */}
            <div ref={scrollContainerRef} className="flex-grow min-h-0 p-4 space-y-4 overflow-y-auto">
                {showEmptyState ? (
                    <SuggestionChips
                        onSelect={handleSuggestionSelect}
                        onMicClick={startListening}
                        voiceSupported={voiceSupported}
                    />
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
                                    {/* Replay button on AI messages */}
                                    {msg.sender === 'ai' && ttsEnabled && (
                                        <button
                                            onClick={() => speak(msg.text)}
                                            className="mt-1.5 flex items-center gap-1 text-[10px] text-neutral-400 hover:text-primary transition-colors"
                                        >
                                            <SpeakerWaveIcon className="w-3 h-3" />
                                            <span>{t('ai.replay', 'Replay')}</span>
                                        </button>
                                    )}
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

            {/* Voice listening overlay */}
            {isListening && (
                <div className="flex-shrink-0 bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border-t border-red-200 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center">
                                <MicrophoneIcon className="w-5 h-5 text-white" />
                            </div>
                            <div className="absolute inset-0 w-10 h-10 bg-red-400 rounded-full animate-ping opacity-30" />
                        </div>
                        <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <VoiceWaveform />
                                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">{t('ai.listening', 'Listening')}</span>
                            </div>
                            <p className="text-sm text-red-700 truncate">
                                {interimTranscript || t('ai.speakNow', 'Speak now...')}
                            </p>
                        </div>
                        <button
                            onClick={stopListening}
                            className="flex-shrink-0 px-3 py-1.5 bg-red-100 text-red-600 text-xs font-semibold rounded-full hover:bg-red-200 transition-colors"
                        >
                            {t('ai.stop', 'Stop')}
                        </button>
                    </div>
                </div>
            )}

            {/* AI speaking indicator */}
            {isSpeaking && !isListening && (
                <div className="flex-shrink-0 bg-gradient-to-r from-primary/5 via-blue-50 to-violet-50 border-t border-primary/10 px-4 py-2.5">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                            <SpeakerWaveIcon className="w-4 h-4 text-white" />
                        </div>
                        <SpeakingIndicator />
                        <span className="text-xs font-medium text-primary">{t('ai.speaking', 'Speaking...')}</span>
                        <button
                            onClick={stopSpeaking}
                            className="ml-auto flex-shrink-0 px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-full hover:bg-primary/20 transition-colors"
                        >
                            {t('ai.stopSpeaking', 'Stop')}
                        </button>
                    </div>
                </div>
            )}

            {/* Input area */}
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (!finalQuery && !isListening && !isSpeaking) handleSendMessage();
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
                        isListening ? (
                            <button
                                type="button"
                                onClick={stopListening}
                                className="relative bg-red-500 text-white rounded-full p-3.5 hover:bg-red-600 transition-colors flex-shrink-0"
                                aria-label="Stop recording"
                            >
                                <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-30" />
                                <span className="absolute inset-[-4px] rounded-full border-2 border-red-300 animate-pulse" />
                                <StopCircleIcon className="w-5 h-5 relative z-10" />
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={startListening}
                                disabled={isSearching}
                                className="bg-gradient-to-br from-primary to-blue-600 text-white rounded-full p-3.5 hover:shadow-lg hover:scale-105 disabled:from-neutral-200 disabled:to-neutral-300 disabled:text-neutral-400 transition-all flex-shrink-0 shadow-md"
                                aria-label="Start voice assistant"
                            >
                                <MicrophoneIcon className="w-5 h-5" />
                            </button>
                        )
                    )}

                    {/* Send button - only show when not listening */}
                    {!isListening && (
                        <button
                            type="submit"
                            disabled={isSearching || !input.trim() || !!finalQuery}
                            className="bg-neutral-800 text-white rounded-full p-3.5 hover:bg-neutral-900 disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors flex-shrink-0"
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
