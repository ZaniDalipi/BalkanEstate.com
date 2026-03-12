import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import {
  Home,
  Search,
  Building2,
  Phone,
  Mail,
  MapPin,
  Heart,
  Users,
  Library,
  MessageCircle,
  Bell,
  UserCircle,
} from 'lucide-react';
import { LogoIcon, FacebookIcon, WhatsappIcon, InstagramIcon, TikTokIcon } from '@/constants';
import FooterCityscape from './FooterCityscape';
import { CONTACT_CONFIG } from '@/src/shared/config/contact';

// Z360 Virtual Tours Icon
const Z360Icon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
  </svg>
);

interface FooterProps {
  className?: string;
}

// Helper to get current language from URL
const getCurrentLang = () => {
  const pathLang = window.location.pathname.split('/')[1];
  const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
  return validLangs.includes(pathLang) ? pathLang : 'en';
};

const Footer: React.FC<FooterProps> = ({ className = '' }) => {
  const { t } = useTranslation(['footer', 'common']);
  const currentYear = new Date().getFullYear();
  const { dispatch } = useAppContext();
  const lang = getCurrentLang();

  const handleNavigation = (
    view:
      | 'search'
      | 'saved-searches'
      | 'saved-properties'
      | 'inbox'
      | 'account'
      | 'create-listing'
      | 'agents'
      | 'agencies'
  ) => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
    window.history.pushState({}, '', `/${view === 'search' ? '' : view}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const buyerLinks = [
    { icon: Search, labelKey: 'links.searchProperties', view: 'search' as const },
    { icon: Heart, labelKey: 'links.savedProperties', view: 'saved-properties' as const },
    { icon: Bell, labelKey: 'links.savedSearches', view: 'saved-searches' as const },
    { icon: Users, labelKey: 'links.findAgents', view: 'agents' as const },
    { icon: Library, labelKey: 'links.browseAgencies', view: 'agencies' as const },
  ];

  const sellerLinks = [
    { icon: Building2, labelKey: 'links.listProperty', view: 'create-listing' as const },
    { icon: MessageCircle, labelKey: 'links.messages', view: 'inbox' as const },
    { icon: UserCircle, labelKey: 'links.myAccount', view: 'account' as const },
  ];

  return (
    <footer
      className={`relative bg-gray-50 text-gray-900 border-t border-gray-200 mt-auto pb-4 overflow-hidden ${className}`}
    >
      {/* Subtle Background Pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {/* Main Footer Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2.5">
              <LogoIcon className="w-8 h-8" />
              <span className="text-xl font-semibold text-gray-900">
                {t('common:appName')}
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed max-w-md">
              {t('footer:tagline')}
            </p>

            {/* Social Media Links */}
            <div className="flex gap-2 pt-1.5">
              {[
                { icon: InstagramIcon, href: CONTACT_CONFIG.social.instagram, label: 'Instagram' },
                { icon: TikTokIcon, href: CONTACT_CONFIG.social.tiktok, label: 'TikTok' },
                { icon: FacebookIcon, href: 'https://facebook.com/balkanestateai', label: 'Facebook' },
                { icon: WhatsappIcon, href: `https://wa.me/${CONTACT_CONFIG.social.whatsappNumber}`, label: 'WhatsApp' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 bg-white hover:bg-gray-100 rounded-xl transition-all duration-300 group shadow-sm border border-gray-200 hover:shadow-md"
                  aria-label={label}
                >
                  <Icon className="w-4 h-4 text-gray-600 group-hover:text-gray-900 transition-colors" />
                </a>
              ))}
            </div>

            {/* Partner Section */}
            <div className="pt-4 border-t border-gray-200 mt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
                {t('footer:partner', 'Official Partner')}
              </p>
              <a
                href="https://z360-virtual-tour.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-white hover:bg-gray-50 rounded-xl transition-all duration-300 shadow-sm border border-gray-200 hover:shadow-md group"
              >
                <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-sm">
                  <Z360Icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                    Z360 Virtual Tours
                  </span>
                  <span className="text-xs text-gray-500">
                    {t('footer:partnerTagline', '360° Property Tours')}
                  </span>
                </div>
              </a>
            </div>
          </div>

          {/* For Buyers */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 mb-3 tracking-wide uppercase">
              {t('footer:sections.forBuyers')}
            </h3>
            <ul className="space-y-2">
              {buyerLinks.map(({ icon: Icon, labelKey, view }) => (
                <li key={labelKey}>
                  <button
                    onClick={() => handleNavigation(view)}
                    className="group flex items-center gap-3 hover:translate-x-1 transition-all duration-200 text-left w-full py-1"
                  >
                    <Icon className="w-4 h-4 text-blue-500 group-hover:text-blue-600 transition-colors" />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 font-medium">
                      {t(`footer:${labelKey}`)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* For Sellers */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 mb-3 tracking-wide uppercase">
              {t('footer:sections.forSellers')}
            </h3>
            <ul className="space-y-2">
              {sellerLinks.map(({ icon: Icon, labelKey, view }) => (
                <li key={labelKey}>
                  <button
                    onClick={() => handleNavigation(view)}
                    className="group flex items-center gap-3 hover:translate-x-1 transition-all duration-200 text-left w-full py-1"
                  >
                    <Icon className="w-4 h-4 text-green-500 group-hover:text-green-600 transition-colors" />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900 font-medium">
                      {t(`footer:${labelKey}`)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-xs font-semibold text-gray-900 mb-3 tracking-wide uppercase">
              {t('footer:sections.contact')}
            </h3>
            <ul className="space-y-2">
              <li>
                <a
                  href={`tel:${CONTACT_CONFIG.phone.primaryTel}`}
                  className="flex items-center gap-3 hover:translate-x-1 transition-all duration-200 group py-1"
                >
                  <Phone className="w-4 h-4 text-purple-500 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 font-medium">
                    {t('footer:contact.phone')}
                  </span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_CONFIG.email.info}`}
                  className="flex items-center gap-3 hover:translate-x-1 transition-all duration-200 group py-1"
                >
                  <Mail className="w-4 h-4 text-purple-500 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 font-medium">
                    {t('footer:contact.email')}
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="relative z-10 border-t border-gray-300 bg-white/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-sm">
            <p className="text-gray-600 text-center md:text-left">
              © {currentYear}{' '}
              <span className="font-semibold text-gray-900">{t('common:appName')}</span>.{' '}
              {t('footer:legal.allRightsReserved')}
            </p>
            <div className="flex flex-wrap gap-6 justify-center">
              <a
                href={`/${lang}/privacy`}
                onClick={(e) => {
                  e.preventDefault();
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'privacy' });
                  window.history.pushState({}, '', `/${lang}/privacy`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
              >
                {t('footer:legal.privacyPolicy')}
              </a>
              <a
                href={`/${lang}/terms`}
                onClick={(e) => {
                  e.preventDefault();
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'terms' });
                  window.history.pushState({}, '', `/${lang}/terms`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
              >
                {t('footer:legal.termsOfService')}
              </a>
              <a
                href={`/${lang}/cookies`}
                onClick={(e) => {
                  e.preventDefault();
                  dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'cookies' });
                  window.history.pushState({}, '', `/${lang}/cookies`);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-gray-600 hover:text-blue-600 transition-colors font-medium"
              >
                {t('footer:legal.cookiePolicy')}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Animated Cityscape */}
      <FooterCityscape />
    </footer>
  );
};

export default Footer;
