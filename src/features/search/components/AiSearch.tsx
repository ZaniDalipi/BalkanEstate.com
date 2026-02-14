import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { ChatMessage, AiSearchQuery, Property } from '@/types';
import { getAiChatResponse } from '@/services/geminiService';
import { PaperAirplaneIcon, MicrophoneIcon, StopCircleIcon, SparklesIcon, MapPinIcon, SpeakerWaveIcon, SpeakerXMarkIcon, HeartIcon, XMarkIcon } from '@/constants';
import { formatPrice } from '@/utils/currency';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { useAppContext } from '@/context/AppContext';

// --- Web Speech API types ---
interface SpeechRecognitionEvent extends Event { results: SpeechRecognitionResultList; resultIndex: number; }
interface SpeechRecognitionErrorEvent extends Event { error: string; }
interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean; interimResults: boolean; lang: string;
    start(): void; stop(): void; abort(): void;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null; onstart: (() => void) | null;
}
declare global { interface Window { SpeechRecognition: new () => SpeechRecognitionInstance; webkitSpeechRecognition: new () => SpeechRecognitionInstance; } }

// --- Balkan language map for speech recognition ---
const BALKAN_SPEECH_LANGS: Record<string, string> = {
    en: 'en-US', sq: 'sq-AL', sr: 'sr-RS', hr: 'hr-HR', bs: 'bs-BA',
    mk: 'mk-MK', bg: 'bg-BG', ro: 'ro-RO', el: 'el-GR', me: 'sr-ME',
};

function getSpeechLang(): string {
    const i18nLang = document.documentElement.lang?.split('-')[0] || 'en';
    return BALKAN_SPEECH_LANGS[i18nLang] || BALKAN_SPEECH_LANGS.en;
}

// --- Props ---
interface AiSearchProps {
    properties: Property[];
    onApplyFilters: (query: AiSearchQuery) => void;
    isMobile: boolean;
    history: ChatMessage[];
    onHistoryChange: (history: ChatMessage[]) => void;
}

// ============================================================================
// ANIMATION STYLES
// ============================================================================
const AssistantStyles = () => (
    <style>{`
        @keyframes voiceWave { 0%,100%{transform:scaleY(.25)} 50%{transform:scaleY(1)} }
        .anim-voice-wave { animation:voiceWave .55s ease-in-out infinite }
        @keyframes speakBar { 0%,100%{transform:scaleY(.3)} 50%{transform:scaleY(1)} }
        .anim-speak-bar { animation:speakBar .45s ease-in-out infinite }
        @keyframes orbFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .anim-orb-float { animation:orbFloat 3s ease-in-out infinite }
        @keyframes orbGlow { 0%,100%{box-shadow:0 0 20px rgba(59,130,246,.3),0 0 60px rgba(139,92,246,.15)} 50%{box-shadow:0 0 30px rgba(59,130,246,.5),0 0 80px rgba(139,92,246,.25)} }
        .anim-orb-glow { animation:orbGlow 2.5s ease-in-out infinite }
        @keyframes orbListening { 0%,100%{transform:scale(1);box-shadow:0 0 20px rgba(239,68,68,.4)} 50%{transform:scale(1.08);box-shadow:0 0 40px rgba(239,68,68,.6),0 0 80px rgba(239,68,68,.2)} }
        .anim-orb-listening { animation:orbListening 1.2s ease-in-out infinite }
        @keyframes orbSpeaking { 0%,100%{transform:scale(1);box-shadow:0 0 20px rgba(59,130,246,.4)} 33%{transform:scale(1.05);box-shadow:0 0 35px rgba(139,92,246,.5)} 66%{transform:scale(.97);box-shadow:0 0 25px rgba(59,130,246,.5)} }
        .anim-orb-speaking { animation:orbSpeaking 1.5s ease-in-out infinite }
        @keyframes orbThinking { 0%{transform:scale(1) rotate(0)} 25%{transform:scale(1.03) rotate(2deg)} 50%{transform:scale(.97) rotate(-2deg)} 75%{transform:scale(1.02) rotate(1deg)} 100%{transform:scale(1) rotate(0)} }
        .anim-orb-thinking { animation:orbThinking 2s ease-in-out infinite }
        @keyframes gradShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        .anim-gradient-bg { background-size:200% 200%; animation:gradShift 6s ease infinite }
        @keyframes msgIn { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        .anim-msg-in { animation:msgIn .35s cubic-bezier(.16,1,.3,1) forwards }
        @keyframes dotBounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        .anim-dot-bounce { animation:dotBounce 1.2s ease-in-out infinite }
        @keyframes ringPulse { 0%{transform:scale(.8);opacity:.8} 100%{transform:scale(1.6);opacity:0} }
        .anim-ring-pulse { animation:ringPulse 1.5s ease-out infinite }
        @keyframes chipIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .anim-chip-in { animation:chipIn .4s cubic-bezier(.16,1,.3,1) forwards }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .anim-shimmer { background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.08) 50%,transparent 100%); background-size:200% 100%; animation:shimmer 2s linear infinite }
    `}</style>
);

// ============================================================================
// AI ORB
// ============================================================================
const AiOrb: React.FC<{ state: 'idle' | 'listening' | 'thinking' | 'speaking'; size?: 'sm' | 'md' | 'lg' }> = ({ state, size = 'md' }) => {
    const sz = { sm: 'w-9 h-9', md: 'w-14 h-14', lg: 'w-20 h-20' }[size];
    const ic = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-9 h-9' }[size];
    const ring = { sm: '-inset-1', md: '-inset-1.5', lg: '-inset-2' }[size];
    const anim = state === 'listening' ? 'anim-orb-listening' : state === 'speaking' ? 'anim-orb-speaking' : state === 'thinking' ? 'anim-orb-thinking' : 'anim-orb-glow';
    const grad = state === 'listening' ? 'from-red-500 via-rose-500 to-orange-500' : 'from-blue-500 via-primary to-violet-500';

    return (
        <div className="relative flex-shrink-0">
            {(state === 'listening' || state === 'speaking') && (
                <div className={`absolute ${ring} rounded-full ${state === 'listening' ? 'bg-red-400/30' : 'bg-primary/20'} anim-ring-pulse`} />
            )}
            <div className={`${sz} rounded-full bg-gradient-to-br ${grad} anim-gradient-bg flex items-center justify-center ${anim} relative`}>
                {state === 'listening' ? <MicrophoneIcon className={`${ic} text-white`} />
                    : state === 'speaking' ? (
                        <div className="flex items-center gap-[2px]" style={{ height: size === 'lg' ? 20 : size === 'md' ? 14 : 10 }}>
                            {[...Array(4)].map((_, i) => <div key={i} className="w-[2.5px] bg-white/90 rounded-full anim-speak-bar" style={{ animationDelay: `${i * 0.1}s`, height: '100%' }} />)}
                        </div>
                    ) : <SparklesIcon className={`${ic} text-white`} />}
                <div className="absolute inset-0 rounded-full anim-shimmer pointer-events-none" />
            </div>
        </div>
    );
};

// ============================================================================
// TINDER SWIPE CARD STACK
// ============================================================================
const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY = 500;

const SwipeCard: React.FC<{
    property: Property;
    onSwipe: (dir: 'left' | 'right') => void;
    isTop: boolean;
}> = ({ property, onSwipe, isTop }) => {
    const [dragDir, setDragDir] = useState<'left' | 'right' | null>(null);

    const handleDrag = (_: unknown, info: PanInfo) => {
        if (info.offset.x > 40) setDragDir('right');
        else if (info.offset.x < -40) setDragDir('left');
        else setDragDir(null);
    };

    const handleDragEnd = (_: unknown, info: PanInfo) => {
        setDragDir(null);
        if (info.offset.x > SWIPE_THRESHOLD || info.velocity.x > SWIPE_VELOCITY) {
            onSwipe('right');
        } else if (info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -SWIPE_VELOCITY) {
            onSwipe('left');
        }
    };

    return (
        <motion.div
            className="absolute inset-0 rounded-2xl overflow-hidden shadow-lg border border-neutral-200/50 bg-white cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            drag={isTop ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDrag={isTop ? handleDrag : undefined}
            onDragEnd={isTop ? handleDragEnd : undefined}
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.7, y: isTop ? 0 : 8 }}
            exit={{ x: dragDir === 'right' ? 300 : -300, opacity: 0, rotate: dragDir === 'right' ? 15 : -15, transition: { duration: 0.35 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
            {/* Property image */}
            <div className="relative h-[55%] w-full overflow-hidden bg-neutral-100">
                <img
                    src={optimizeCloudinaryUrl(property.imageUrl, { width: 600, quality: 'auto' })}
                    alt={property.title || `${property.propertyType} in ${property.city}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                    <span className="text-white font-bold text-lg drop-shadow-lg">
                        {formatPrice(property.price, property.country)}
                    </span>
                </div>
            </div>

            {/* Property info */}
            <div className="p-3.5">
                {property.title && <p className="text-sm font-bold text-neutral-800 line-clamp-1 mb-1">{property.title}</p>}
                <div className="flex items-center gap-1 text-neutral-500 mb-2">
                    <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs">{property.city}, {property.country}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-600 font-medium">
                    {property.beds > 0 && <span>{property.beds} bed</span>}
                    {property.baths > 0 && <span>{property.baths} bath</span>}
                    {property.sqft > 0 && <span>{property.sqft}m²</span>}
                    {property.yearBuilt > 0 && <span>Built {property.yearBuilt}</span>}
                </div>
            </div>

            {/* Swipe overlays */}
            {isTop && (
                <>
                    <AnimatePresence>
                        {dragDir === 'right' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-green-500/20 border-4 border-green-400 rounded-2xl flex items-center justify-center"
                            >
                                <div className="bg-green-500 text-white font-bold text-lg px-5 py-2 rounded-full shadow-lg rotate-[-12deg]">
                                    SAVE
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    <AnimatePresence>
                        {dragDir === 'left' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-red-500/20 border-4 border-red-400 rounded-2xl flex items-center justify-center"
                            >
                                <div className="bg-red-500 text-white font-bold text-lg px-5 py-2 rounded-full shadow-lg rotate-[12deg]">
                                    SKIP
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </motion.div>
    );
};

const PropertySwipeStack: React.FC<{
    properties: Property[];
    onComplete: (saved: Property[]) => void;
    t: (key: string, fallback?: string) => string;
}> = ({ properties, onComplete, t }) => {
    const { toggleSavedHome, state } = useAppContext();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [savedProps, setSavedProps] = useState<Property[]>([]);
    const [exitDir, setExitDir] = useState<'left' | 'right'>('left');
    const done = currentIndex >= properties.length;

    const handleSwipe = useCallback((dir: 'left' | 'right') => {
        const property = properties[currentIndex];
        if (!property) return;

        setExitDir(dir);

        if (dir === 'right') {
            setSavedProps(prev => [...prev, property]);
            // Actually save to favorites via API
            const alreadySaved = state.savedHomes.some(p => p.id === property.id);
            if (!alreadySaved) {
                toggleSavedHome(property);
            }
        }

        setCurrentIndex(prev => prev + 1);
    }, [currentIndex, properties, toggleSavedHome, state.savedHomes]);

    if (done) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full text-center px-4"
            >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-4 shadow-lg">
                    <HeartIcon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-base font-bold text-neutral-800 mb-1">
                    {savedProps.length > 0
                        ? t('ai.swipeDone', `${savedProps.length} properties saved!`)
                        : t('ai.swipeNoneSaved', 'No properties saved')}
                </h3>
                <p className="text-xs text-neutral-500 mb-4">
                    {savedProps.length > 0
                        ? t('ai.swipeCheckFavorites', 'Check your favorites to compare them')
                        : t('ai.swipeTryAgain', 'Try a different search to find your dream property')}
                </p>
                {savedProps.length > 0 && (
                    <button
                        onClick={() => onComplete(savedProps)}
                        className="px-5 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-xl shadow-md shadow-primary/20 hover:shadow-lg active:scale-[0.97] transition-all text-sm"
                    >
                        {t('ai.goToFavorites', 'Go to Favorites')}
                    </button>
                )}
            </motion.div>
        );
    }

    const topProperty = properties[currentIndex];
    const nextProperty = properties[currentIndex + 1];

    return (
        <div className="flex flex-col items-center h-full">
            {/* Counter */}
            <div className="flex-shrink-0 flex items-center justify-between w-full px-1 mb-2">
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                    {currentIndex + 1} / {properties.length}
                </span>
                <span className="text-[10px] font-semibold text-green-500">
                    {savedProps.length} {t('ai.saved', 'saved')}
                </span>
            </div>

            {/* Card stack */}
            <div className="relative flex-grow w-full max-w-[280px] mx-auto" style={{ minHeight: 280 }}>
                <AnimatePresence mode="popLayout" custom={exitDir}>
                    {nextProperty && (
                        <SwipeCard key={nextProperty.id} property={nextProperty} onSwipe={() => {}} isTop={false} />
                    )}
                    {topProperty && (
                        <SwipeCard key={topProperty.id} property={topProperty} onSwipe={handleSwipe} isTop={true} />
                    )}
                </AnimatePresence>
            </div>

            {/* Action buttons */}
            <div className="flex-shrink-0 flex items-center justify-center gap-6 mt-3">
                <button
                    onClick={() => handleSwipe('left')}
                    className="w-12 h-12 rounded-full bg-red-50 border-2 border-red-200 text-red-500 flex items-center justify-center hover:bg-red-100 hover:scale-110 active:scale-90 transition-all shadow-sm"
                >
                    <XMarkIcon className="w-6 h-6" />
                </button>
                <button
                    onClick={() => handleSwipe('right')}
                    className="w-12 h-12 rounded-full bg-green-50 border-2 border-green-200 text-green-500 flex items-center justify-center hover:bg-green-100 hover:scale-110 active:scale-90 transition-all shadow-sm"
                >
                    <HeartIcon className="w-6 h-6" />
                </button>
            </div>
            <p className="text-[10px] text-neutral-400 mt-1.5 text-center">
                {t('ai.swipeHint', 'Swipe right to save, left to skip')}
            </p>
        </div>
    );
};

// ============================================================================
// FILTER PILL
// ============================================================================
const FilterPill: React.FC<{ children: React.ReactNode; delay?: number }> = ({ children, delay = 0 }) => (
    <div className="anim-chip-in bg-white/80 backdrop-blur-sm text-neutral-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-neutral-200/60 shadow-sm" style={{ animationDelay: `${delay}ms` }}>
        {children}
    </div>
);

// ============================================================================
// EMPTY STATE
// ============================================================================
const EmptyState: React.FC<{ onSelect: (text: string) => void; onMicClick: () => void; voiceSupported: boolean }> = ({ onSelect, onMicClick, voiceSupported }) => {
    const { t } = useTranslation(['search']);
    const suggestions = [
        t('ai.suggestion1', 'Apartment in Tirana under 80k'),
        t('ai.suggestion2', '3-bed house in Belgrade'),
        t('ai.suggestion3', 'Villa with sea view in Croatia'),
        t('ai.suggestion4', 'Modern flat in Sofia'),
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full px-4 text-center">
            <div className="anim-orb-float mb-5"><AiOrb state="idle" size="lg" /></div>
            <h3 className="text-lg font-bold text-neutral-800 mb-1 anim-chip-in" style={{ animationDelay: '100ms' }}>
                {t('ai.assistantTitle', 'Property Assistant')}
            </h3>
            <p className="text-[13px] text-neutral-500 mb-5 max-w-[280px] anim-chip-in" style={{ animationDelay: '200ms' }}>
                {t('ai.assistantHint', 'Ask me anything about properties — type or use your voice')}
            </p>
            {voiceSupported && (
                <div className="anim-chip-in mb-6" style={{ animationDelay: '300ms' }}>
                    <button onClick={onMicClick} className="group relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-110 active:scale-95 transition-all duration-300">
                        <MicrophoneIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </button>
                    <p className="text-[11px] text-neutral-400 mt-2 font-medium">{t('ai.tapToSpeak', 'Tap to speak')}</p>
                </div>
            )}
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                {suggestions.map((text, i) => (
                    <button key={i} onClick={() => onSelect(text)} className="anim-chip-in px-3.5 py-2 text-xs bg-white border border-neutral-200/70 text-neutral-600 rounded-2xl hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all duration-200 shadow-sm hover:shadow-md" style={{ animationDelay: `${400 + i * 80}ms` }}>
                        {text}
                    </button>
                ))}
            </div>
        </div>
    );
};

// ============================================================================
// HELPERS
// ============================================================================
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const AiSearch: React.FC<AiSearchProps> = ({ properties, onApplyFilters, isMobile, history, onHistoryChange }) => {
    const { t } = useTranslation(['search']);
    const { dispatch } = useAppContext();
    const [input, setInput] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [finalQuery, setFinalQuery] = useState<AiSearchQuery | null>(null);
    const [isListening, setIsListening] = useState(false);
    const [voiceSupported, setVoiceSupported] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const [autoListenAfterSpeak, setAutoListenAfterSpeak] = useState(false);
    const [showSwipeCards, setShowSwipeCards] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const isVoiceSessionRef = useRef(false);

    useEffect(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        setVoiceSupported(!!SR);
    }, []);

    const matchedProperties = useMemo(() => {
        if (!finalQuery) return [];
        return filterPropertiesByQuery(properties, finalQuery).slice(0, 15);
    }, [finalQuery, properties]);

    // Auto-show swipe cards when properties are found
    useEffect(() => {
        if (matchedProperties.length > 0 && finalQuery) setShowSwipeCards(true);
    }, [matchedProperties, finalQuery]);

    const scrollToBottom = () => {
        if (history.length > 0 && scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    };
    useEffect(scrollToBottom, [history, isSearching, finalQuery, matchedProperties, showSwipeCards]);

    const orbState: 'idle' | 'listening' | 'thinking' | 'speaking' =
        isListening ? 'listening' : isSpeaking ? 'speaking' : isSearching ? 'thinking' : 'idle';

    // --- TTS ---
    const speak = useCallback((text: string) => {
        if (!ttsEnabled || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const clean = text.replace(/[^\p{L}\p{N}\p{P}\p{Z}]/gu, '').replace(/\s+/g, ' ').trim();
        if (!clean) return;
        const u = new SpeechSynthesisUtterance(clean);
        u.rate = 1.05; u.pitch = 1.0; u.volume = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const lang = getSpeechLang().split('-')[0];
        const pref = voices.find(v => v.lang.startsWith(lang) && v.name.includes('Google'))
            || voices.find(v => v.lang.startsWith(lang))
            || voices.find(v => v.lang.startsWith('en') && v.name.includes('Google'))
            || voices[0];
        if (pref) u.voice = pref;
        u.onstart = () => setIsSpeaking(true);
        u.onend = () => { setIsSpeaking(false); if (isVoiceSessionRef.current && autoListenAfterSpeak) setTimeout(() => startListeningInternal(), 400); };
        u.onerror = () => setIsSpeaking(false);
        utteranceRef.current = u;
        window.speechSynthesis.speak(u);
    }, [ttsEnabled, autoListenAfterSpeak]);

    const stopSpeaking = useCallback(() => { window.speechSynthesis?.cancel(); setIsSpeaking(false); }, []);

    // --- Send message (conversation never stops) ---
    const handleSendMessage = useCallback(async (overrideText?: string) => {
        const text = overrideText || input.trim();
        if (!text) return;
        const userMessage: ChatMessage = { sender: 'user', text };
        const newHistory = [...history, userMessage];
        onHistoryChange(newHistory);
        setInput('');
        setInterimTranscript('');
        setIsSearching(true);
        // Allow new searches - reset previous results
        setFinalQuery(null);
        setShowSwipeCards(false);
        try {
            const result = await getAiChatResponse(newHistory, properties);
            const aiMessage: ChatMessage = { sender: 'ai', text: result.responseMessage };
            onHistoryChange([...newHistory, aiMessage]);
            if (result.isFinalQuery && result.searchQuery) setFinalQuery(result.searchQuery);
            speak(result.responseMessage);
        } catch {
            const err: ChatMessage = { sender: 'ai', text: t('ai.connectionError') };
            onHistoryChange([...newHistory, err]);
        } finally {
            setIsSearching(false);
        }
    }, [input, history, properties, onHistoryChange, t, speak]);

    // --- Voice recognition (Balkan language aware) ---
    const startListeningInternal = useCallback(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        stopSpeaking();
        const rec = new SR();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = getSpeechLang();
        rec.onstart = () => { setIsListening(true); setInterimTranscript(''); };
        rec.onresult = (event: SpeechRecognitionEvent) => {
            let interim = '', fin = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                const t = event.results[i][0].transcript;
                if (event.results[i].isFinal) fin += t; else interim += t;
            }
            if (fin) { setInput(fin); setInterimTranscript(''); } else setInterimTranscript(interim);
        };
        rec.onerror = () => { setIsListening(false); setInterimTranscript(''); };
        rec.onend = () => {
            setIsListening(false);
            setInput(prev => { if (prev.trim()) setTimeout(() => handleSendMessage(prev.trim()), 100); return prev; });
        };
        recognitionRef.current = rec;
        rec.start();
    }, [handleSendMessage, stopSpeaking]);

    const startListening = useCallback(() => { isVoiceSessionRef.current = true; setAutoListenAfterSpeak(true); startListeningInternal(); }, [startListeningInternal]);
    const stopListening = useCallback(() => { recognitionRef.current?.stop(); isVoiceSessionRef.current = false; setAutoListenAfterSpeak(false); }, []);

    useEffect(() => { return () => { recognitionRef.current?.abort(); window.speechSynthesis?.cancel(); }; }, []);
    useEffect(() => { if (window.speechSynthesis) { window.speechSynthesis.getVoices(); window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices(); } }, []);

    const handleApplyClick = () => { if (finalQuery) onApplyFilters(finalQuery); };
    const handleSuggestionSelect = (text: string) => { setInput(text); setTimeout(() => handleSendMessage(text), 50); };

    const handleSwipeComplete = useCallback(() => {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'saved-properties' });
        window.history.pushState({}, '', '/saved-properties');
    }, [dispatch]);

    const renderFilters = (query: AiSearchQuery) => {
        const fmt = (v: number) => `€${new Intl.NumberFormat('de-DE').format(v)}`;
        const p: React.ReactNode[] = []; let d = 0;
        if (query.location) p.push(<FilterPill key="loc" delay={d += 50}>📍 {query.location}</FilterPill>);
        if (query.country) p.push(<FilterPill key="co" delay={d += 50}>🌍 {query.country}</FilterPill>);
        if (query.propertyType) { const ic: Record<string, string> = { house: '🏠', apartment: '🏢', villa: '🏛️', land: '🏞️', commercial: '🏪' }; p.push(<FilterPill key="ty" delay={d += 50}>{ic[query.propertyType] || '🏠'} {query.propertyType}</FilterPill>); }
        if (query.minPrice && query.maxPrice) p.push(<FilterPill key="pr" delay={d += 50}>{fmt(query.minPrice)} - {fmt(query.maxPrice)}</FilterPill>);
        else if (query.minPrice) p.push(<FilterPill key="pr" delay={d += 50}>≥ {fmt(query.minPrice)}</FilterPill>);
        else if (query.maxPrice) p.push(<FilterPill key="pr" delay={d += 50}>≤ {fmt(query.maxPrice)}</FilterPill>);
        if (query.beds) p.push(<FilterPill key="bd" delay={d += 50}>🛏️ {query.beds}+ {t('ai.beds')}</FilterPill>);
        if (query.baths) p.push(<FilterPill key="ba" delay={d += 50}>🛁 {query.baths}+ {t('ai.baths')}</FilterPill>);
        if (query.livingRooms) p.push(<FilterPill key="lr" delay={d += 50}>🛋️ {query.livingRooms}+ {t('ai.living')}</FilterPill>);
        if (query.sellerType) p.push(<FilterPill key="se" delay={d += 50}>{query.sellerType === 'agent' ? '👔 Agent' : '👤 Private'}</FilterPill>);
        return p;
    };

    const showEmptyState = history.length === 0 && !isSearching;

    // ========================================================================
    return (
        <div className="flex flex-col h-full bg-gradient-to-b from-neutral-50 to-white rounded-xl overflow-hidden border border-neutral-200/50 shadow-sm">
            <AssistantStyles />

            {/* Header */}
            {history.length > 0 && (
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 bg-white/80 backdrop-blur-md border-b border-neutral-100/80">
                    <div className="flex items-center gap-2.5">
                        <AiOrb state={orbState} size="sm" />
                        <div>
                            <span className="text-xs font-bold text-neutral-800">{t('ai.assistantTitle', 'Property Assistant')}</span>
                            <p className="text-[10px] text-neutral-400 font-medium">
                                {isListening ? t('ai.listening', 'Listening') + '...'
                                    : isSpeaking ? t('ai.speaking', 'Speaking') + '...'
                                    : isSearching ? t('ai.searching') + '...'
                                    : t('ai.ready', 'Ready to help')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { if (isSpeaking) stopSpeaking(); setTtsEnabled(prev => !prev); }}
                        className={`p-2 rounded-xl transition-all duration-200 ${ttsEnabled ? 'text-primary bg-primary/10 hover:bg-primary/15' : 'text-neutral-400 bg-neutral-100 hover:bg-neutral-200'}`}
                    >
                        {ttsEnabled ? <SpeakerWaveIcon className="w-4 h-4" /> : <SpeakerXMarkIcon className="w-4 h-4" />}
                    </button>
                </div>
            )}

            {/* Chat area */}
            <div ref={scrollContainerRef} className="flex-grow min-h-0 p-4 space-y-3 overflow-y-auto">
                {showEmptyState ? (
                    <EmptyState onSelect={handleSuggestionSelect} onMicClick={startListening} voiceSupported={voiceSupported} />
                ) : (
                    <>
                        {history.map((msg, index) => (
                            <div key={index} className={`flex items-end gap-2.5 anim-msg-in ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`} style={{ animationDelay: `${Math.min(index * 50, 300)}ms` }}>
                                {msg.sender === 'ai' && <AiOrb state={isSpeaking && index === history.length - 1 ? 'speaking' : 'idle'} size="sm" />}
                                <div className={`max-w-[75%] ${msg.sender === 'user'
                                    ? 'bg-gradient-to-br from-primary to-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-md shadow-primary/15'
                                    : 'bg-white text-neutral-800 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-neutral-100/80'
                                }`}>
                                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                    {msg.sender === 'ai' && ttsEnabled && (
                                        <button onClick={() => speak(msg.text)} className="mt-2 flex items-center gap-1 text-[10px] text-neutral-400 hover:text-primary transition-colors group">
                                            <SpeakerWaveIcon className="w-3 h-3 group-hover:scale-110 transition-transform" />
                                            <span>{t('ai.replay', 'Replay')}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Thinking dots */}
                        {isSearching && (
                            <div className="flex items-end gap-2.5 justify-start anim-msg-in">
                                <AiOrb state="thinking" size="sm" />
                                <div className="bg-white border border-neutral-100/80 px-5 py-3.5 rounded-2xl rounded-bl-md shadow-sm">
                                    <div className="flex items-center gap-1.5">
                                        {[0, 1, 2].map(i => <div key={i} className="w-2 h-2 bg-primary/50 rounded-full anim-dot-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Swipe cards when results found */}
                        {showSwipeCards && matchedProperties.length > 0 && (
                            <div className="anim-msg-in">
                                <div className="flex items-start gap-2.5 justify-start">
                                    <AiOrb state="idle" size="sm" />
                                    <div className="min-w-0 flex-1" style={{ height: isMobile ? 400 : 420 }}>
                                        <PropertySwipeStack
                                            properties={matchedProperties}
                                            onComplete={handleSwipeComplete}
                                            t={(k, fb) => t(k, fb || '')}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* No results */}
                        {finalQuery && matchedProperties.length === 0 && !isSearching && (
                            <div className="flex items-end gap-2.5 justify-start anim-msg-in">
                                <AiOrb state="idle" size="sm" />
                                <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-amber-50 border border-amber-200/60 shadow-sm">
                                    <p className="text-[13px] text-amber-800">{t('ai.noResults')}</p>
                                    <p className="text-[11px] mt-1 text-amber-600/80">{t('ai.tryDifferent')}</p>
                                </div>
                            </div>
                        )}
                    </>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Listening overlay */}
            {isListening && (
                <div className="flex-shrink-0 bg-gradient-to-r from-red-50 via-rose-50 to-orange-50 border-t border-red-100 px-4 py-3">
                    <div className="flex items-center gap-3">
                        <AiOrb state="listening" size="sm" />
                        <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                                <div className="flex items-center gap-[3px] h-5">
                                    {[...Array(5)].map((_, i) => <div key={i} className="w-[3px] bg-red-400 rounded-full anim-voice-wave" style={{ animationDelay: `${i * 0.08}s`, height: '100%' }} />)}
                                </div>
                                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">{t('ai.listening', 'Listening')}</span>
                            </div>
                            <p className="text-[13px] text-red-700/80 truncate font-medium">{interimTranscript || t('ai.speakNow', 'Speak now...')}</p>
                        </div>
                        <button onClick={stopListening} className="flex-shrink-0 px-3.5 py-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full hover:bg-red-600 transition-all active:scale-95 shadow-sm">
                            {t('ai.stop', 'Stop')}
                        </button>
                    </div>
                </div>
            )}

            {/* Speaking bar */}
            {isSpeaking && !isListening && (
                <div className="flex-shrink-0 bg-gradient-to-r from-blue-50 via-violet-50 to-blue-50 border-t border-primary/10 px-4 py-2.5">
                    <div className="flex items-center gap-3">
                        <AiOrb state="speaking" size="sm" />
                        <span className="text-[11px] font-semibold text-primary/70">{t('ai.speaking', 'Speaking...')}</span>
                        <button onClick={stopSpeaking} className="ml-auto px-3.5 py-1.5 bg-primary/10 text-primary text-[11px] font-bold rounded-full hover:bg-primary/20 transition-all active:scale-95">
                            {t('ai.stopSpeaking', 'Stop')}
                        </button>
                    </div>
                </div>
            )}

            {/* Input area — conversation NEVER stops */}
            <form
                onSubmit={(e) => { e.preventDefault(); if (!isListening && !isSpeaking) handleSendMessage(); }}
                className="flex-shrink-0 p-3 bg-white/90 backdrop-blur-sm border-t border-neutral-100/80 space-y-2"
            >
                {/* Proceed with filters (alternative to swiping) */}
                {finalQuery && !showSwipeCards && (
                    <div className="pb-2.5 border-b border-neutral-100/60">
                        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">{renderFilters(finalQuery)}</div>
                        <button type="button" onClick={handleApplyClick} className="w-full py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-xl shadow-md shadow-primary/20 hover:shadow-lg active:scale-[0.98] transition-all text-sm">
                            {t('ai.proceed')} ({matchedProperties.length})
                        </button>
                    </div>
                )}

                <div className="flex items-end gap-2">
                    <input
                        type="text"
                        value={isListening ? interimTranscript : input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={isListening ? t('ai.listening', 'Listening...') : t('ai.placeholder')}
                        className="flex-grow px-4 py-3 text-[13px] text-neutral-800 bg-neutral-50/80 border border-neutral-200/60 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-white disabled:opacity-50 transition-all placeholder:text-neutral-400"
                        disabled={isSearching || isListening}
                    />
                    {voiceSupported && (
                        isListening ? (
                            <button type="button" onClick={stopListening} className="relative bg-red-500 text-white rounded-2xl p-3 hover:bg-red-600 transition-all active:scale-90 flex-shrink-0 shadow-md shadow-red-500/25" aria-label="Stop recording">
                                <span className="absolute inset-0 rounded-2xl bg-red-400 anim-ring-pulse opacity-30" />
                                <StopCircleIcon className="w-5 h-5 relative z-10" />
                            </button>
                        ) : (
                            <button type="button" onClick={startListening} disabled={isSearching} className="bg-gradient-to-br from-primary to-blue-600 text-white rounded-2xl p-3 hover:shadow-lg hover:shadow-primary/30 hover:scale-105 disabled:from-neutral-200 disabled:to-neutral-200 disabled:text-neutral-400 disabled:shadow-none transition-all duration-200 active:scale-90 flex-shrink-0 shadow-md shadow-primary/20" aria-label="Start voice assistant">
                                <MicrophoneIcon className="w-5 h-5" />
                            </button>
                        )
                    )}
                    {!isListening && (
                        <button type="submit" disabled={isSearching || !input.trim()} className="bg-neutral-800 text-white rounded-2xl p-3 hover:bg-neutral-900 hover:scale-105 disabled:bg-neutral-200 disabled:text-neutral-400 transition-all duration-200 active:scale-90 flex-shrink-0 shadow-sm">
                            <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default AiSearch;
