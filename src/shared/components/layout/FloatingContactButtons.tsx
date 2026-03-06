import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { CONTACT_CONFIG } from '@/src/shared/config/contact';

/**
 * FloatingContactButtons
 *
 * Floating action button (bottom-right) that expands to show
 * WhatsApp and Viber quick-contact options using the company number.
 * Optimized for mobile/tablet with larger touch targets and safe area support.
 */
const FloatingContactButtons: React.FC = () => {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const whatsappUrl = `https://wa.me/${CONTACT_CONFIG.social.whatsappNumber}?text=${encodeURIComponent(
    t('floatingContact.whatsappMessage', 'Hi, I have a question about a property on BalkanEstate.')
  )}`;

  const viberNumber = CONTACT_CONFIG.social.whatsappNumber;

  const handleViberClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const deepLink = `viber://chat?number=${viberNumber}`;
    const fallback = 'https://www.viber.com/';
    window.location.href = deepLink;
    setTimeout(() => {
      if (!document.hidden) window.open(fallback, '_blank');
    }, 1500);
  };

  // Close on outside tap (important for mobile)
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end gap-3 pb-[env(safe-area-inset-bottom,0px)]"
    >
      {/* Expanded buttons */}
      {isOpen && (
        <div className="flex flex-col items-end gap-2.5 sm:gap-2 animate-fade-in-up">
          {/* WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 bg-[#25D366] text-white pl-5 pr-4 py-3.5 sm:pl-4 sm:pr-3 sm:py-2.5 rounded-full shadow-lg hover:bg-[#20BD5A] active:bg-[#1AAD4F] transition-all hover:scale-105 active:scale-95 min-h-[48px]"
          >
            <span className="text-sm sm:text-sm font-semibold whitespace-nowrap">WhatsApp</span>
            <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </a>

          {/* Viber */}
          <a
            href={`viber://chat?number=${viberNumber}`}
            onClick={handleViberClick}
            className="flex items-center gap-2.5 bg-[#7360F2] text-white pl-5 pr-4 py-3.5 sm:pl-4 sm:pr-3 sm:py-2.5 rounded-full shadow-lg hover:bg-[#6050E0] active:bg-[#5040D0] transition-all hover:scale-105 active:scale-95 min-h-[48px]"
          >
            <span className="text-sm sm:text-sm font-semibold whitespace-nowrap">Viber</span>
            <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 1C6.477 1 2 5.477 2 11c0 2.136.67 4.116 1.81 5.74L2 22l5.26-1.81A9.94 9.94 0 0012 21c5.523 0 10-4.477 10-10S17.523 1 12 1zm-1.5 4.5c.3 0 .55.12.7.4l.9 1.7c.15.3.08.6-.15.8l-.5.6c-.12.15-.08.35.08.52.35.45.75.87 1.2 1.25.5.42 1.05.78 1.65 1.05.2.1.4.06.55-.1l.45-.55c.18-.22.42-.25.68-.12l1.7.9c.28.15.38.4.3.7-.12.48-.38.9-.75 1.2-.33.27-.72.45-1.15.5-.35.04-.7.02-.95-.05-.82-.22-1.6-.6-2.35-1.12-1.2-.83-2.25-1.88-3.1-3.1-.55-.75-.95-1.55-1.15-2.4-.12-.5-.08-1 .12-1.45.18-.4.45-.72.78-1 .3-.25.62-.43.95-.43z" />
            </svg>
          </a>
        </div>
      )}

      {/* Main toggle FAB - larger on mobile for easy thumb reach */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 sm:w-14 sm:h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 ${
          isOpen
            ? 'bg-neutral-700 hover:bg-neutral-800 rotate-45'
            : 'bg-[#25D366] hover:bg-[#20BD5A]'
        }`}
        aria-label={t('floatingContact.toggleLabel', 'Contact us via messaging apps')}
      >
        {isOpen ? (
          <svg className="w-7 h-7 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ) : (
          <svg className="w-8 h-8 sm:w-7 sm:h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      <style>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default FloatingContactButtons;
