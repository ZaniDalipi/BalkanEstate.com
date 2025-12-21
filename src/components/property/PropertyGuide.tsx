// PropertyGuide Component
// A friendly mascot guide inspired by Duolingo that helps users navigate the property details

import React, { useState, useEffect, useCallback } from 'react';
import { Property } from '../../../types';

interface PropertyGuideProps {
  property: Property;
  onDismiss?: () => void;
}

interface GuideMessage {
  text: string;
  emoji?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

type MascotMood = 'happy' | 'excited' | 'thinking' | 'waving';

/**
 * PropertyGuide Component
 *
 * A cute animated house mascot that provides contextual tips and guidance
 * similar to Duolingo's owl. Features:
 * - Multiple mood animations
 * - Contextual property tips with actions
 * - Interactive speech bubble
 * - Hover reactions
 * - Quick action buttons
 *
 * Usage:
 * ```tsx
 * <PropertyGuide property={property} onDismiss={() => setShowGuide(false)} />
 * ```
 */
export const PropertyGuide: React.FC<PropertyGuideProps> = ({ property, onDismiss }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [mood, setMood] = useState<MascotMood>('waving');
  const [isVisible, setIsVisible] = useState(false);
  const [showBubble, setShowBubble] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Generate contextual messages based on property
  const getMessages = useCallback((): GuideMessage[] => {
    const messages: GuideMessage[] = [
      { text: "Hey there! I'm Homey, your property guide. Let me show you around!", emoji: "👋" },
    ];

    // Price insight
    if (property.price) {
      messages.push({
        text: "Wondering about monthly payments? The mortgage calculator can help!",
        emoji: "💰",
        action: {
          label: "Calculate",
          onClick: () => {
            document.querySelector('[class*="MortgageCalculator"]')?.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    }

    // Tour available
    if (property.tourUrl) {
      messages.push({
        text: "Psst! This place has a 3D tour. It's like being there without leaving your couch!",
        emoji: "🎥",
        action: {
          label: "Take Tour",
          onClick: () => window.open(property.tourUrl, '_blank')
        }
      });
    }

    // Good condition
    if (property.condition === 'new' || property.condition === 'excellent') {
      messages.push({
        text: `Ooh, this one's in ${property.condition} condition! That's pretty rare around here.`,
        emoji: "✨"
      });
    }

    // Has pool
    if (property.hasPool) {
      messages.push({
        text: "Did someone say pool party? This property has one! 🎉",
        emoji: "🏊"
      });
    }

    // Near beach
    if (property.distanceToSea && property.distanceToSea < 5) {
      messages.push({
        text: `Beach lovers alert! Only ${property.distanceToSea.toFixed(1)}km to sand and waves.`,
        emoji: "🏖️"
      });
    }

    // Multiple images
    if (property.images && property.images.length > 5) {
      messages.push({
        text: `${property.images.length} photos to explore! Click the gallery for the full tour.`,
        emoji: "📸"
      });
    }

    // Floor plan available
    if (property.floorplanUrl) {
      messages.push({
        text: "There's a floor plan! Perfect for planning where your couch goes.",
        emoji: "📐"
      });
    }

    // General tips
    messages.push({
      text: "Love it? Tap the heart to save it for later!",
      emoji: "❤️"
    });

    messages.push({
      text: "Got questions? The seller is just a message away!",
      emoji: "💬"
    });

    return messages;
  }, [property]);

  const messages = getMessages();

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      setMood('waving');
      setTimeout(() => setMood('happy'), 2000);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Mood cycle based on interactions
  useEffect(() => {
    if (isHovered) {
      setMood('excited');
    } else if (!showBubble) {
      setMood('thinking');
    }
  }, [isHovered, showBubble]);

  // Cycle through messages
  useEffect(() => {
    if (!showBubble) return;

    const messageInterval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
      setMood('happy');
    }, 8000);

    return () => clearInterval(messageInterval);
  }, [messages.length, showBubble]);

  const handleDismiss = () => {
    setMood('thinking');
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  const handleMascotClick = () => {
    setClickCount((prev) => prev + 1);

    // Easter egg: multiple clicks make mascot excited
    if (clickCount >= 4) {
      setMood('excited');
      setClickCount(0);
      setTimeout(() => setMood('happy'), 1500);
    } else {
      setShowBubble(!showBubble);
      setMood(showBubble ? 'thinking' : 'waving');
      setTimeout(() => setMood('happy'), 1000);
    }
  };

  const handleNextMessage = () => {
    setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    setMood('excited');
    setTimeout(() => setMood('happy'), 500);
  };

  const handlePrevMessage = () => {
    setCurrentMessageIndex((prev) => (prev - 1 + messages.length) % messages.length);
    setMood('excited');
    setTimeout(() => setMood('happy'), 500);
  };

  if (!isVisible) {
    return null;
  }

  const currentMessage = messages[currentMessageIndex];

  // SVG paths for different moods
  const getEyeStyle = () => {
    switch (mood) {
      case 'excited':
        return { scaleY: 1.2, pupilSize: 3 };
      case 'thinking':
        return { scaleY: 0.5, pupilSize: 2 };
      case 'waving':
        return { scaleY: 1, pupilSize: 2.5 };
      default:
        return { scaleY: 1, pupilSize: 2 };
    }
  };

  const eyeStyle = getEyeStyle();

  return (
    <div
      className={`fixed bottom-6 right-6 z-40 transition-all duration-500 ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-10 opacity-0'
      }`}
    >
      {/* Speech Bubble - Now on the left side */}
      {showBubble && (
        <div className="absolute bottom-full right-0 mb-3 animate-fade-in">
          <div className="relative bg-white rounded-2xl shadow-xl border border-neutral-200 p-4 max-w-[300px] sm:max-w-sm">
            {/* Close bubble button */}
            <button
              onClick={handleDismiss}
              className="absolute -top-2 -left-2 w-7 h-7 bg-neutral-100 hover:bg-red-100 hover:text-red-600 rounded-full flex items-center justify-center text-neutral-500 transition-all shadow-md hover:scale-110"
              aria-label="Close guide"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Message content */}
            <div className="flex items-start gap-3">
              {currentMessage.emoji && (
                <span className="text-3xl flex-shrink-0 animate-bounce-subtle">{currentMessage.emoji}</span>
              )}
              <div className="flex-1">
                <p className="text-sm text-neutral-700 leading-relaxed">
                  {currentMessage.text}
                </p>
                {currentMessage.action && (
                  <button
                    onClick={currentMessage.action.onClick}
                    className="mt-2 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-full hover:bg-primary-dark transition-colors"
                  >
                    {currentMessage.action.label}
                  </button>
                )}
              </div>
            </div>

            {/* Navigation controls */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-100">
              <button
                onClick={handlePrevMessage}
                className="p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
                aria-label="Previous tip"
              >
                <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Message dots indicator */}
              <div className="flex gap-1.5">
                {messages.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentMessageIndex(index);
                      setMood('excited');
                      setTimeout(() => setMood('happy'), 300);
                    }}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentMessageIndex
                        ? 'bg-primary w-6'
                        : 'bg-neutral-300 hover:bg-neutral-400 w-2'
                    }`}
                    aria-label={`Go to tip ${index + 1}`}
                  />
                ))}
              </div>

              <button
                onClick={handleNextMessage}
                className="p-1.5 rounded-full hover:bg-neutral-100 transition-colors"
                aria-label="Next tip"
              >
                <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            {/* Speech bubble pointer - now on right side */}
            <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white border-r border-b border-neutral-200 transform rotate-45"></div>
          </div>
        </div>
      )}

      {/* Quick Actions Menu */}
      {showQuickActions && (
        <div className="absolute bottom-full right-16 mb-2 animate-fade-in">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => document.querySelector('.heart-button, [aria-label*="favorite"]')?.dispatchEvent(new Event('click', { bubbles: true }))}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-neutral-200 hover:bg-red-50 hover:border-red-200 transition-all text-sm font-medium"
            >
              <span>❤️</span> Save
            </button>
            <button
              onClick={() => document.querySelector('[href^="tel:"]')?.dispatchEvent(new Event('click', { bubbles: true }))}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-neutral-200 hover:bg-green-50 hover:border-green-200 transition-all text-sm font-medium"
            >
              <span>📞</span> Call
            </button>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-neutral-200 hover:bg-blue-50 hover:border-blue-200 transition-all text-sm font-medium"
            >
              <span>⬆️</span> Top
            </button>
          </div>
        </div>
      )}

      {/* Mascot Character - Cute House */}
      <div className="relative">
        <button
          onClick={handleMascotClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowQuickActions(!showQuickActions);
          }}
          className={`relative group cursor-pointer transition-all duration-300 ${
            isHovered ? 'scale-110' : 'scale-100'
          } ${mood === 'waving' ? 'animate-wiggle' : ''} ${mood === 'excited' ? 'animate-bounce' : ''}`}
          aria-label="Property guide mascot - Click for tips, right-click for quick actions"
        >
          {/* Glow effect on hover */}
          <div className={`absolute inset-0 rounded-full bg-primary/20 blur-xl transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

          {/* Character body - House shape */}
          <div className="relative">
            <svg
              width="72"
              height="72"
              viewBox="0 0 64 64"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="drop-shadow-xl"
            >
              {/* House base */}
              <rect x="12" y="28" width="40" height="32" rx="4" fill="#3B82F6" className="transition-colors duration-300" />

              {/* Roof */}
              <path d="M6 32L32 8L58 32" stroke="#2563EB" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="#3B82F6"/>
              <path d="M10 30L32 10L54 30" fill="#2563EB"/>

              {/* Door */}
              <rect x="26" y="40" width="12" height="20" rx="2" fill="#FCD34D"/>
              <circle cx="35" cy="50" r="1.5" fill="#B45309"/>

              {/* Windows - Eyes */}
              <g style={{ transform: `scaleY(${eyeStyle.scaleY})`, transformOrigin: '32px 38px' }}>
                <rect x="16" y="34" width="8" height="8" rx="2" fill="white"/>
                <rect x="40" y="34" width="8" height="8" rx="2" fill="white"/>
                {/* Pupils - follow mouse direction slightly */}
                <circle cx="20" cy="38" r={eyeStyle.pupilSize} fill="#1E3A8A">
                  <animate attributeName="cx" values="20;21;20;19;20" dur="3s" repeatCount="indefinite"/>
                </circle>
                <circle cx="44" cy="38" r={eyeStyle.pupilSize} fill="#1E3A8A">
                  <animate attributeName="cx" values="44;45;44;43;44" dur="3s" repeatCount="indefinite"/>
                </circle>
                {/* Sparkle in eyes when excited */}
                {mood === 'excited' && (
                  <>
                    <circle cx="18" cy="36" r="1" fill="white" opacity="0.8"/>
                    <circle cx="42" cy="36" r="1" fill="white" opacity="0.8"/>
                  </>
                )}
              </g>

              {/* Eyebrows based on mood */}
              {mood === 'thinking' && (
                <>
                  <line x1="16" y1="32" x2="24" y2="33" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="40" y1="33" x2="48" y2="32" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round"/>
                </>
              )}
              {mood === 'excited' && (
                <>
                  <line x1="16" y1="33" x2="24" y2="31" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="40" y1="31" x2="48" y2="33" stroke="#1E3A8A" strokeWidth="2" strokeLinecap="round"/>
                </>
              )}

              {/* Mouth - changes with mood */}
              {mood === 'excited' ? (
                <ellipse cx="32" cy="50" rx="4" ry="3" fill="#FCD34D"/>
              ) : mood === 'thinking' ? (
                <line x1="29" y1="50" x2="35" y2="50" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round"/>
              ) : (
                <path d="M26 48C26 48 29 52 32 52C35 52 38 48 38 48" stroke="#FCD34D" strokeWidth="2" strokeLinecap="round" fill="none"/>
              )}

              {/* Blush when happy/excited */}
              {(mood === 'happy' || mood === 'excited') && (
                <>
                  <ellipse cx="14" cy="44" rx="3" ry="2" fill="#F87171" opacity="0.4"/>
                  <ellipse cx="50" cy="44" rx="3" ry="2" fill="#F87171" opacity="0.4"/>
                </>
              )}

              {/* Chimney */}
              <rect x="44" y="12" width="8" height="14" rx="1" fill="#EF4444"/>

              {/* Chimney smoke - animated */}
              <g>
                <circle cx="48" cy="6" r="3" fill="#E5E7EB" opacity="0.8">
                  <animate attributeName="cy" values="6;2;6" dur="2s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.8;0.4;0.8" dur="2s" repeatCount="indefinite"/>
                </circle>
                <circle cx="52" cy="4" r="2" fill="#E5E7EB" opacity="0.6">
                  <animate attributeName="cy" values="4;0;4" dur="2.5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2.5s" repeatCount="indefinite"/>
                </circle>
              </g>

              {/* Waving hand/flag when waving */}
              {mood === 'waving' && (
                <g>
                  <rect x="52" y="20" width="3" height="12" fill="#8B5CF6" rx="1">
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      values="0 52 32;-20 52 32;20 52 32;0 52 32"
                      dur="0.6s"
                      repeatCount="3"
                    />
                  </rect>
                  <rect x="48" y="16" width="10" height="6" fill="#8B5CF6" rx="1">
                    <animateTransform
                      attributeName="transform"
                      type="rotate"
                      values="0 52 32;-20 52 32;20 52 32;0 52 32"
                      dur="0.6s"
                      repeatCount="3"
                    />
                  </rect>
                </g>
              )}
            </svg>

            {/* Notification badge when bubble is hidden */}
            {!showBubble && (
              <div className="absolute -top-1 -left-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
                <span className="text-white text-xs font-bold">{messages.length}</span>
              </div>
            )}

            {/* Interactive hint ring */}
            <div className={`absolute inset-0 rounded-full border-2 border-primary/50 animate-ping ${isHovered ? 'opacity-100' : 'opacity-0'}`} style={{ animationDuration: '1.5s' }} />
          </div>

          {/* Hover tooltip */}
          <div className={`absolute bottom-full right-1/2 translate-x-1/2 mb-2 transition-all duration-200 pointer-events-none ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            <div className="bg-neutral-800 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
              {showBubble ? 'Click to minimize' : 'Click for tips!'}
              <div className="text-neutral-400 text-[10px]">Right-click for actions</div>
            </div>
          </div>
        </button>
      </div>

      {/* Inline styles for custom animations */}
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        .animate-wiggle {
          animation: wiggle 0.5s ease-in-out 3;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 1s ease-in-out infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PropertyGuide;
