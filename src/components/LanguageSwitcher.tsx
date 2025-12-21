/**
 * Language Switcher Component
 * Allows users to switch between supported languages
 */

import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { languages, changeLanguage, getCurrentLanguage, type LanguageCode } from '../i18n';

interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'compact' | 'full';
  className?: string;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'dropdown',
  className = ''
}) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find(l => l.code === getCurrentLanguage()) || languages[0];

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

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleLanguageChange = useCallback(async (code: LanguageCode) => {
    await changeLanguage(code);
    setIsOpen(false);
  }, []);

  // Compact variant - just flag button
  if (variant === 'compact') {
    return (
      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-neutral-100 transition-colors"
          aria-label="Change language"
          aria-expanded={isOpen}
        >
          <span className="text-xl">{currentLang.flag}</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code as LanguageCode)}
                className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-3 hover:bg-neutral-50 transition-colors ${
                  lang.code === currentLang.code ? 'bg-primary/5 text-primary font-medium' : 'text-neutral-700'
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span>{lang.nativeName}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full variant - shows all languages as buttons
  if (variant === 'full') {
    return (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code as LanguageCode)}
            className={`px-3 py-1.5 rounded-full text-sm flex items-center space-x-2 transition-colors ${
              lang.code === currentLang.code
                ? 'bg-primary text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.nativeName}</span>
          </button>
        ))}
      </div>
    );
  }

  // Default dropdown variant - opens upward for sidebar placement
  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full space-x-2 px-3 py-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 transition-colors border border-neutral-200"
        aria-label="Change language"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-2">
          <span className="text-lg">{currentLang.flag}</span>
          <span className="text-sm font-medium text-neutral-700">{currentLang.nativeName}</span>
        </div>
        <svg
          className={`w-4 h-4 text-neutral-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-lg shadow-xl border border-neutral-200 py-2 z-[100] max-h-[70vh] overflow-y-auto">
          <div className="px-3 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide border-b border-neutral-100 mb-1">
            Select Language
          </div>
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code as LanguageCode)}
              className={`w-full px-3 py-2 text-left text-sm flex items-center space-x-3 hover:bg-neutral-50 transition-colors ${
                lang.code === currentLang.code ? 'bg-primary/10 text-primary' : 'text-neutral-700'
              }`}
            >
              <span className="text-xl flex-shrink-0">{lang.flag}</span>
              <div className="flex flex-col flex-grow min-w-0">
                <span className="font-medium truncate">{lang.nativeName}</span>
                <span className="text-xs text-neutral-500">{lang.name}</span>
              </div>
              {lang.code === currentLang.code && (
                <svg className="w-5 h-5 flex-shrink-0 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default memo(LanguageSwitcher);
