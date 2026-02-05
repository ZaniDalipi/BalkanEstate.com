// Minimal Footer Component for Legal Pages
// Optimized for bundle size - only essential links and info

import React from 'react';
import { useTranslation } from 'react-i18next';
import { CONTACT_CONFIG } from '@/src/shared/config/contact';

interface LegalFooterProps {
  onNavigate: (view: string) => void;
}

const LegalFooter: React.FC<LegalFooterProps> = ({ onNavigate }) => {
  const { t } = useTranslation(['footer']);

  const legalLinks = [
    { label: t('footer:legal.privacy'), path: 'privacy-policy' },
    { label: t('footer:legal.terms'), path: 'terms-of-service' },
    { label: t('footer:legal.cookies'), path: 'cookie-policy' },
    { label: t('footer:legal.refund'), path: 'refund-policy' },
  ];

  return (
    <footer className="bg-gray-900 text-white py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo/Brand */}
          <div className="flex items-center gap-2">
            <svg className="w-8 h-8 text-blue-500" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <g fillRule="evenodd">
                <path fill="#003A96" d="M12 21V5L10 7V23L12 21Z M4 21V10L2 12V23L4 21Z" />
                <path fill="#0252CD" d="M12 5H20V21H12V5Z M4 10H10V21H4V10Z" />
              </g>
            </svg>
            <span className="text-lg font-semibold">{CONTACT_CONFIG.company.name}</span>
          </div>

          {/* Legal Links */}
          <nav className="flex flex-wrap gap-4 text-sm text-gray-400">
            {legalLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => onNavigate(link.path)}
                className="hover:text-white transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Contact */}
          <div className="text-sm text-gray-400">
            <a
              href={`mailto:${CONTACT_CONFIG.email.contact}`}
              className="hover:text-white transition-colors"
            >
              {CONTACT_CONFIG.email.contact}
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-4 border-t border-gray-800 text-center text-sm text-gray-500">
          © {new Date().getFullYear()} {CONTACT_CONFIG.company.name}. {t('footer:copyright.allRights')}
        </div>
      </div>
    </footer>
  );
};

export default LegalFooter;
