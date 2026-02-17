import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '../../context/AppContext';
import {
    LogoIcon,
    SearchIcon,
    BuildingOfficeIcon,
    PhoneIcon,
    EnvelopeIcon,
    HeartIcon,
    UserGroupIcon,
    BuildingLibraryIcon,
    FacebookIcon,
    TwitterIcon,
    WhatsappIcon,
    InstagramIcon,
    TikTokIcon,
    InboxIcon,
    BellIcon,
    UserCircleIcon,
    SparklesIcon,
    GlobeAltIcon,
    ChartBarIcon
} from '../../constants';
import FooterCityscape from './FooterCityscape';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import { CONTACT_CONFIG } from '@/src/shared/config/contact';

interface FooterProps {
    className?: string;
    contained?: boolean;
}

// Balkan countries with flags
const balkanCountries = [
    { code: 'AL', name: 'Albania', flag: '🇦🇱' },
    { code: 'BA', name: 'Bosnia', flag: '🇧🇦' },
    { code: 'BG', name: 'Bulgaria', flag: '🇧🇬' },
    { code: 'HR', name: 'Croatia', flag: '🇭🇷' },
    { code: 'GR', name: 'Greece', flag: '🇬🇷' },
    { code: 'XK', name: 'Kosovo', flag: '🇽🇰' },
    { code: 'ME', name: 'Montenegro', flag: '🇲🇪' },
    { code: 'MK', name: 'N. Macedonia', flag: '🇲🇰' },
    { code: 'RO', name: 'Romania', flag: '🇷🇴' },
    { code: 'RS', name: 'Serbia', flag: '🇷🇸' },
];

const Footer: React.FC<FooterProps> = ({ className = '', contained = false }) => {
    const { t } = useTranslation(['footer', 'common']);
    const currentYear = new Date().getFullYear();
    const { dispatch } = useAppContext();
    const { getLocalizedPath } = useLocalizedNavigation();

    const handleNavigation = (view: 'search' | 'saved-searches' | 'saved-properties' | 'inbox' | 'account' | 'create-listing' | 'agents' | 'agencies' | 'admin' | 'how-it-works' | 'explore-cities' | 'privacy' | 'terms' | 'cookies' | 'refund' | 'contact') => {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
        const route = view === 'search' ? '/' : `/${view}`;
        window.history.pushState({}, '', getLocalizedPath(route));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCountrySearch = (countryName: string) => {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
        dispatch({ type: 'UPDATE_SEARCH_PAGE_STATE', payload: { filters: { country: countryName } } });
        window.history.pushState({}, '', getLocalizedPath(`/search?country=${encodeURIComponent(countryName)}`));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const buyerLinks = [
        { icon: SearchIcon, labelKey: 'links.searchProperties', view: 'search' },
        { icon: SparklesIcon, labelKey: 'links.exploreCities', view: 'explore-cities' },
        { icon: HeartIcon, labelKey: 'links.savedProperties', view: 'saved-properties' },
        { icon: BellIcon, labelKey: 'links.savedSearches', view: 'saved-searches' },
        { icon: UserGroupIcon, labelKey: 'links.findAgents', view: 'agents' },
    ];

    const toolsLinks = [
        { icon: ChartBarIcon, labelKey: 'links.valuation', view: 'valuation' },
        { icon: BuildingLibraryIcon, labelKey: 'links.browseAgencies', view: 'agencies' },
    ];

    const sellerLinks = [
        { icon: BuildingOfficeIcon, labelKey: 'links.listProperty', view: 'create-listing' },
        { icon: ChartBarIcon, labelKey: 'links.analytics', view: 'account' },
        { icon: InboxIcon, labelKey: 'links.messages', view: 'inbox' },
        { icon: UserCircleIcon, labelKey: 'links.myAccount', view: 'account' }
    ];

    const fullWidthStyle = contained ? {} : {
        width: '100vw',
        position: 'relative' as const,
        left: '50%',
        right: '50%',
        marginLeft: '-50vw',
        marginRight: '-50vw',
    };

    return (
        <footer
            className={`relative bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white mt-auto overflow-hidden ${contained ? 'w-full rounded-t-2xl' : ''} ${className}`}
            style={fullWidthStyle}
        >
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-600/10" />

            {/* Subtle grid pattern */}
            <div className="absolute inset-0 opacity-[0.03]" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                backgroundSize: '40px 40px'
            }} />

            {/* Main Footer Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 lg:pt-12" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 xl:gap-12">

                    {/* Brand Section */}
                    <div className="sm:col-span-2 lg:col-span-4 space-y-4 sm:space-y-5">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-gradient-to-br from-primary to-blue-600 rounded-xl shadow-lg shadow-primary/20">
                                <LogoIcon className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold">
                                Balkan<span className="text-primary">Estate</span><sup className="text-primary text-sm font-bold ml-0.5">AI</sup>
                            </h2>
                        </div>

                        <p className="text-slate-400 leading-relaxed text-xs sm:text-sm">
                            {t('footer:tagline', 'Your AI-powered real estate platform for the Balkans. Find your dream property across 10 countries with intelligent search and personalized recommendations.')}
                        </p>

                        {/* AI Badge */}
                        <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-primary/20 to-purple-500/20 border border-primary/30 rounded-full px-3 sm:px-4 py-1.5 sm:py-2">
                            <SparklesIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary animate-pulse" />
                            <span className="text-xs sm:text-sm font-medium text-slate-300">{t('footer:ai.poweredBy', 'Powered by AI')}</span>
                        </div>

                        {/* Social Media Links */}
                        <div className="flex gap-2 sm:gap-3 pt-1 sm:pt-2">
                            {[
                                { icon: InstagramIcon, href: CONTACT_CONFIG.social.instagram, label: 'Instagram', color: 'hover:bg-pink-600' },
                                { icon: TikTokIcon, href: CONTACT_CONFIG.social.tiktok, label: 'TikTok', color: 'hover:bg-slate-600' },
                                { icon: FacebookIcon, href: 'https://facebook.com/balkanestateai', label: 'Facebook', color: 'hover:bg-blue-600' },
                                { icon: WhatsappIcon, href: `https://wa.me/${CONTACT_CONFIG.social.whatsappNumber}`, label: 'WhatsApp', color: 'hover:bg-green-500' }
                            ].map(({ icon: Icon, href, label, color }) => (
                                <a
                                    key={label}
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`p-2 sm:p-2.5 bg-slate-700/50 ${color} rounded-lg sm:rounded-xl transition-all duration-300 group hover:scale-110 hover:shadow-lg`}
                                    aria-label={label}
                                >
                                    <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300 group-hover:text-white transition-colors" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* For Buyers */}
                    <div className="lg:col-span-2">
                        <h3 className="text-sm font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                            <span className="w-8 h-0.5 bg-gradient-to-r from-primary to-blue-500 rounded-full" />
                            {t('footer:sections.forBuyers', 'For Buyers')}
                        </h3>
                        <ul className="space-y-2 sm:space-y-3">
                            {buyerLinks.map(({ icon: Icon, labelKey, view }) => (
                                <li key={labelKey}>
                                    <button
                                        onClick={() => handleNavigation(view as any)}
                                        className="group flex items-center gap-2 sm:gap-2.5 text-slate-400 hover:text-white transition-all duration-200 text-left w-full"
                                    >
                                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary/70 group-hover:text-primary transition-colors flex-shrink-0" />
                                        <span className="text-xs sm:text-sm group-hover:translate-x-1 transition-transform duration-200">{t(`footer:${labelKey}`, labelKey.split('.')[1])}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* For Sellers */}
                    <div className="lg:col-span-2">
                        <h3 className="text-sm font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                            <span className="w-8 h-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full" />
                            {t('footer:sections.forSellers', 'For Sellers')}
                        </h3>
                        <ul className="space-y-2 sm:space-y-3">
                            {sellerLinks.map(({ icon: Icon, labelKey, view }) => (
                                <li key={labelKey}>
                                    <button
                                        onClick={() => handleNavigation(view as any)}
                                        className="group flex items-center gap-2 sm:gap-2.5 text-slate-400 hover:text-white transition-all duration-200 text-left w-full"
                                    >
                                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500/70 group-hover:text-green-500 transition-colors flex-shrink-0" />
                                        <span className="text-xs sm:text-sm group-hover:translate-x-1 transition-transform duration-200">{t(`footer:${labelKey}`, labelKey.split('.')[1])}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Tools & Resources - crawlable internal links for SEO */}
                    <div className="lg:col-span-2">
                        <h3 className="text-sm font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                            <span className="w-8 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                            {t('footer:sections.tools', 'Tools')}
                        </h3>
                        <ul className="space-y-2 sm:space-y-3">
                            {toolsLinks.map(({ icon: Icon, labelKey, view }) => (
                                <li key={labelKey}>
                                    <button
                                        onClick={() => handleNavigation(view as any)}
                                        className="group flex items-center gap-2 sm:gap-2.5 text-slate-400 hover:text-white transition-all duration-200 text-left w-full"
                                    >
                                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500/70 group-hover:text-amber-500 transition-colors flex-shrink-0" />
                                        <span className="text-xs sm:text-sm group-hover:translate-x-1 transition-transform duration-200">{t(`footer:${labelKey}`, labelKey.split('.')[1])}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact & Countries */}
                    <div className="sm:col-span-2 lg:col-span-2">
                        <h3 className="text-sm font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                            <span className="w-8 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                            {t('footer:sections.contact', 'Get In Touch')}
                        </h3>
                        <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                            <li>
                                <a
                                    href={`mailto:${CONTACT_CONFIG.email.contact}`}
                                    className="flex items-center gap-2 sm:gap-2.5 text-slate-400 hover:text-white transition-all duration-200 group"
                                >
                                    <EnvelopeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500/70 group-hover:text-purple-500 transition-colors flex-shrink-0" />
                                    <span className="text-xs sm:text-sm break-all sm:break-normal">{CONTACT_CONFIG.email.contact}</span>
                                </a>
                            </li>
                            <li>
                                <a
                                    href={`tel:${CONTACT_CONFIG.phone.primaryTel}`}
                                    className="flex items-center gap-2 sm:gap-2.5 text-slate-400 hover:text-white transition-all duration-200 group"
                                >
                                    <PhoneIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500/70 group-hover:text-purple-500 transition-colors flex-shrink-0" />
                                    <span className="text-xs sm:text-sm">{CONTACT_CONFIG.phone.primary}</span>
                                </a>
                            </li>
                        </ul>

                        {/* Countries We Serve */}
                        <div>
                            <h4 className="text-[10px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider mb-2 sm:mb-3 flex items-center gap-2">
                                <GlobeAltIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                {t('footer:sections.countriesWeServe', 'Countries We Serve')}
                            </h4>
                            <div className="grid grid-cols-5 sm:flex sm:flex-wrap gap-1.5 sm:gap-2">
                                {balkanCountries.map((country) => (
                                    <button
                                        key={country.code}
                                        onClick={() => handleCountrySearch(country.name)}
                                        className="inline-flex items-center justify-center sm:justify-start gap-1 bg-slate-700/50 hover:bg-slate-700 px-1.5 sm:px-2 py-1 rounded-md text-[10px] sm:text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                                        title={`Property for sale in ${country.name}`}
                                        aria-label={`Browse properties in ${country.name}`}
                                    >
                                        <span className="text-sm sm:text-base">{country.flag}</span>
                                        <span className="hidden sm:inline">{country.code}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="my-6 sm:my-8 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

                {/* Partners Section */}
                <div className="mb-6 sm:mb-8">
                    <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 sm:mb-4 text-center">
                        {t('footer:partners.title', 'Our Partners')}
                    </h4>
                    <div className="flex flex-wrap gap-4 sm:gap-6 justify-center items-center">
                        {/* Z360 Virtual Tours Partner */}
                        <a
                            href="https://z360-virtual-tour.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group block overflow-hidden rounded-xl transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-primary/20"
                            title="Z360 Virtual Tours - Professional 360° Property Tours"
                        >
                            <img
                                src="/images/partners/z360-logo.svg"
                                alt="Z360 Virtual Tours - 360° Property Tours"
                                className="h-12 sm:h-16 w-auto"
                            />
                        </a>
                    </div>
                </div>

                {/* Divider */}
                <div className="mb-6 sm:mb-8 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

                {/* Bottom Bar */}
                <div className="flex flex-col lg:flex-row justify-between items-center gap-4 sm:gap-6">
                    <p className="text-slate-500 text-xs sm:text-sm text-center lg:text-left">
                        © {currentYear} <span className="font-semibold text-slate-400">BalkanEstate<sup className="text-xs">AI</sup></span>. {t('footer:legal.allRightsReserved', 'All rights reserved.')}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-2 sm:gap-x-4 md:gap-x-6 justify-center text-xs sm:text-sm">
                        <button
                            onClick={() => handleNavigation('how-it-works')}
                            className="text-slate-500 hover:text-primary transition-colors whitespace-nowrap"
                        >
                            {t('footer:links.howItWorks', 'How It Works')}
                        </button>
                        <button
                            onClick={() => handleNavigation('privacy')}
                            className="text-slate-500 hover:text-primary transition-colors whitespace-nowrap"
                        >
                            {t('footer:legal.privacyPolicy', 'Privacy Policy')}
                        </button>
                        <button
                            onClick={() => handleNavigation('terms')}
                            className="text-slate-500 hover:text-primary transition-colors whitespace-nowrap"
                        >
                            {t('footer:legal.termsOfService', 'Terms of Service')}
                        </button>
                        <button
                            onClick={() => handleNavigation('cookies')}
                            className="text-slate-500 hover:text-primary transition-colors whitespace-nowrap"
                        >
                            {t('footer:legal.cookiePolicy', 'Cookie Policy')}
                        </button>
                        <button
                            onClick={() => handleNavigation('refund')}
                            className="text-slate-500 hover:text-primary transition-colors whitespace-nowrap"
                        >
                            {t('footer:legal.refundPolicy', 'Refund Policy')}
                        </button>
                        <button
                            onClick={() => handleNavigation('contact')}
                            className="text-slate-500 hover:text-primary transition-colors whitespace-nowrap"
                        >
                            {t('footer:links.contactUs', 'Contact Us')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Animated Cityscape - only show when not contained to prevent overflow */}
            {!contained ? (
                <FooterCityscape />
            ) : (
                /* Simple gradient bottom for contained footer */
                <div className="h-8 bg-gradient-to-t from-slate-950 to-transparent" />
            )}
        </footer>
    );
};

export default Footer;
