import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from './TranslationContext';
import { SUPPORTED_LANGUAGES, Language } from './config';

interface LanguageSelectorProps {
  className?: string;
  compact?: boolean;
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '', compact = false }) => {
  const { language, setLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLanguage = SUPPORTED_LANGUAGES.find(l => l.code === language);

  const handleSelectLanguage = (lang: Language) => {
    setLanguage(lang);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200
          bg-white hover:bg-neutral-50 transition-colors
          ${compact ? 'text-sm' : 'text-base'}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="text-lg">{currentLanguage?.flag}</span>
        {!compact && (
          <span className="font-medium text-neutral-700">{currentLanguage?.nativeName}</span>
        )}
        <svg
          className={`w-4 h-4 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-neutral-200 py-2 z-50 max-h-80 overflow-y-auto"
          role="listbox"
        >
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              type="button"
              role="option"
              aria-selected={language === lang.code}
              onClick={() => handleSelectLanguage(lang.code)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-left
                hover:bg-neutral-50 transition-colors
                ${language === lang.code ? 'bg-primary/5 text-primary' : 'text-neutral-700'}
              `}
            >
              <span className="text-xl">{lang.flag}</span>
              <div className="flex-1">
                <div className="font-medium">{lang.nativeName}</div>
                <div className="text-xs text-neutral-500">{lang.name}</div>
              </div>
              {language === lang.code && (
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
