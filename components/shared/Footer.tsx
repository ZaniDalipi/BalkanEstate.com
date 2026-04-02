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
    ChatBubbleLeftRightIcon,
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
// `name` is the full name used for filtering; `label` is the short display name
const balkanCountries = [
    { code: 'AL', name: 'Albania', label: 'Albania', flag: '🇦🇱' },
    { code: 'BA', name: 'Bosnia and Herzegovina', label: 'Bosnia', flag: '🇧🇦' },
    { code: 'BG', name: 'Bulgaria', label: 'Bulgaria', flag: '🇧🇬' },
    { code: 'HR', name: 'Croatia', label: 'Croatia', flag: '🇭🇷' },
    { code: 'GR', name: 'Greece', label: 'Greece', flag: '🇬🇷' },
    { code: 'XK', name: 'Kosovo', label: 'Kosovo', flag: '🇽🇰' },
    { code: 'ME', name: 'Montenegro', label: 'Montenegro', flag: '🇲🇪' },
    { code: 'MK', name: 'North Macedonia', label: 'N. Macedonia', flag: '🇲🇰' },
    { code: 'RO', name: 'Romania', label: 'Romania', flag: '🇷🇴' },
    { code: 'RS', name: 'Serbia', label: 'Serbia', flag: '🇷🇸' },
];

const Footer: React.FC<FooterProps> = ({ className = '', contained = false }) => {
    const { t } = useTranslation(['footer', 'common']);
    const currentYear = new Date().getFullYear();
    const { dispatch } = useAppContext();
    const { getLocalizedPath } = useLocalizedNavigation();

    const handleNavigation = (view: 'search' | 'saved-searches' | 'saved-properties' | 'inbox' | 'account' | 'create-listing' | 'agents' | 'agencies' | 'admin' | 'how-it-works' | 'explore-cities' | 'privacy' | 'terms' | 'cookies' | 'refund' | 'contact' | 'blog') => {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
        const route = view === 'search' ? '/' : `/${view}`;
        window.history.pushState({}, '', getLocalizedPath(route));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCountrySearch = (countryName: string) => {
        window.history.pushState({}, '', getLocalizedPath(`/explore-cities?country=${encodeURIComponent(countryName)}`));
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'explore-cities' });
        // Notify already-mounted components about the country filter change
        window.dispatchEvent(new CustomEvent('country-filter-change', { detail: countryName }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const buyerLinks = [
        { icon: SearchIcon, labelKey: 'links.searchProperties', view: 'search' },
        { icon: SparklesIcon, labelKey: 'links.exploreCities', view: 'explore-cities' },
        { icon: HeartIcon, labelKey: 'links.savedProperties', view: 'saved-properties' },
        { icon: BellIcon, labelKey: 'links.savedSearches', view: 'saved-searches' },
        { icon: UserGroupIcon, labelKey: 'links.findAgents', view: 'agents' },
        { icon: ChartBarIcon, labelKey: 'links.valuation', view: 'valuation' },
        { icon: BuildingLibraryIcon, labelKey: 'links.browseAgencies', view: 'agencies' },
        { icon: SparklesIcon, labelKey: 'links.blog', view: 'blog' },
    ];

    const sellerLinks = [
        { icon: BuildingOfficeIcon, labelKey: 'links.listProperty', view: 'create-listing' },
        { icon: ChartBarIcon, labelKey: 'links.analytics', view: 'account' },
        { icon: ChatBubbleLeftRightIcon, labelKey: 'links.messages', view: 'inbox' },
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-8 xl:gap-10">

                    {/* Brand Section */}
                    <div className="sm:col-span-2 lg:col-span-3 space-y-4 sm:space-y-5">
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

                        {/* Product Hunt Badge */}
                        <a
                            href="https://www.producthunt.com/@balkanestateai"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 hover:from-orange-500/30 hover:to-red-500/30 transition-all duration-300 group"
                        >
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400 group-hover:text-orange-300 transition-colors" viewBox="0 0 40 40" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 0C8.954 0 0 8.954 0 20s8.954 20 20 20 20-8.954 20-20S31.046 0 20 0zm0 36.8C10.728 36.8 3.2 29.272 3.2 20S10.728 3.2 20 3.2 36.8 10.728 36.8 20 29.272 36.8 20 36.8zm3.2-22.4h-8v11.2h4.8v-3.2h3.2c2.648 0 4.8-2.152 4.8-4.8s-2.152-4.8-4.8-4.8zm0 6.4H20v-3.2h3.2c.884 0 1.6.716 1.6 1.6s-.716 1.6-1.6 1.6z"/>
                            </svg>
                            <span className="text-xs sm:text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Find us on Product Hunt</span>
                        </a>

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
                        <ul className="space-y-2 sm:space-y-2.5">
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
                        <ul className="space-y-2 sm:space-y-2.5">
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

                    {/* Get In Touch */}
                    <div className="lg:col-span-2 min-w-0">
                        <h3 className="text-sm font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                            <span className="w-8 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                            {t('footer:sections.contact', 'Get In Touch')}
                        </h3>
                        <ul className="space-y-2 sm:space-y-3">
                            <li>
                                <a
                                    href={`mailto:${CONTACT_CONFIG.email.contact}`}
                                    className="flex items-center gap-2 sm:gap-2.5 text-slate-400 hover:text-white transition-all duration-200 group"
                                >
                                    <EnvelopeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500/70 group-hover:text-purple-500 transition-colors flex-shrink-0" />
                                    <span className="text-xs sm:text-sm break-all">{CONTACT_CONFIG.email.contact}</span>
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
                            <li>
                                <a
                                    href={`https://wa.me/${CONTACT_CONFIG.social.whatsappNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 sm:gap-2.5 text-slate-400 hover:text-white transition-all duration-200 group"
                                >
                                    <WhatsappIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-500/70 group-hover:text-green-500 transition-colors flex-shrink-0" />
                                    <span className="text-xs sm:text-sm">WhatsApp</span>
                                </a>
                            </li>
                        </ul>
                    </div>

                    {/* Countries We Serve */}
                    <div className="sm:col-span-2 lg:col-span-3">
                        <h3 className="text-sm font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                            <span className="w-8 h-0.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full" />
                            <GlobeAltIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            {t('footer:sections.countriesWeServe', 'Countries We Serve')}
                        </h3>
                        <div className="grid grid-cols-2 gap-1.5">
                            {balkanCountries.map((country) => (
                                <button
                                    key={country.code}
                                    onClick={() => handleCountrySearch(country.name)}
                                    className="inline-flex items-center gap-1.5 bg-slate-700/30 hover:bg-slate-700/60 px-2.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-all duration-200 cursor-pointer text-left group"
                                    title={`Explore cities in ${country.label}`}
                                    aria-label={`Explore cities in ${country.label}`}
                                >
                                    <span className="text-sm leading-none flex-shrink-0">{country.flag}</span>
                                    <span className="group-hover:translate-x-0.5 transition-transform duration-200">{country.label}</span>
                                </button>
                            ))}
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
                            <div className="w-24 h-8 sm:w-28 sm:h-10 md:w-32 md:h-12 flex items-center justify-center overflow-hidden">
                                <img
                                    src="/images/partners/z360-logo.png"
                                    alt="Z360 Virtual Tours - 360° Property Tours"
                                    className="max-w-full max-h-full object-contain"
                                />
                            </div>
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
