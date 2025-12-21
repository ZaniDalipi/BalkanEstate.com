import React from 'react';
import { useAppContext } from '../../context/AppContext';
import {
    LogoIcon,
    HomeIcon,
    SearchIcon,
    BuildingOfficeIcon,
    PhoneIcon,
    EnvelopeIcon,
    MapPinIcon,
    HeartIcon,
    UserGroupIcon,
    BuildingLibraryIcon,
    FacebookIcon,
    TwitterIcon,
    WhatsappIcon,
    InboxIcon,
    BellIcon,
    UserCircleIcon
} from '../../constants';
import FooterCityscape from './FooterCityscape';

interface FooterProps {
    className?: string;
}

const Footer: React.FC<FooterProps> = ({ className = '' }) => {
    const currentYear = new Date().getFullYear();
    const { dispatch, state } = useAppContext();

    const handleNavigation = (view: 'search' | 'saved-searches' | 'saved-properties' | 'inbox' | 'account' | 'create-listing' | 'agents' | 'agencies' | 'admin') => {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: view });
        window.history.pushState({}, '', `/${view === 'search' ? '' : view}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className={`relative bg-gray-50 text-gray-900 border-t border-gray-200 mt-auto pb-4 ${className}`}>
            {/* Subtle Background Pattern */}
            <div className="absolute inset-0 opacity-[0.02]" style={{
                backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
                backgroundSize: '32px 32px'
            }}></div>

            {/* Main Footer Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 lg:gap-8">
                    {/* Brand Section */}
                    <div className="lg:col-span-2 space-y-3">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-gradient-to-br from-gray-900 to-gray-700 rounded-xl shadow-sm">
                                <LogoIcon className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-xl font-semibold text-gray-900">Balkan Estate</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed max-w-md">
                            Finding perfect properties across the Balkans with premium service and modern technology.
                        </p>

                        {/* Social Media Links */}
                        <div className="flex gap-2 pt-1.5">
                            {[
                                { icon: FacebookIcon, href: 'https://facebook.com', label: 'Facebook' },
                                { icon: TwitterIcon, href: 'https://twitter.com', label: 'Twitter' },
                                { icon: WhatsappIcon, href: 'https://wa.me/383XXXXXXX', label: 'WhatsApp' }
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
                    </div>

                    {/* For Buyers */}
                    <div>
                        <h3 className="text-xs font-semibold text-gray-900 mb-3 tracking-wide uppercase">
                            For Buyers
                        </h3>
                        <ul className="space-y-2">
                            {[
                                { icon: SearchIcon, label: 'Search Properties', view: 'search' },
                                { icon: HeartIcon, label: 'Saved Properties', view: 'saved-properties' },
                                { icon: BellIcon, label: 'Saved Searches', view: 'saved-searches' },
                                { icon: UserGroupIcon, label: 'Find Agents', view: 'agents' },
                                { icon: BuildingLibraryIcon, label: 'Browse Agencies', view: 'agencies' }
                            ].map(({ icon: Icon, label, view }) => (
                                <li key={label}>
                                    <button
                                        onClick={() => handleNavigation(view as any)}
                                        className="group flex items-center gap-3 hover:translate-x-1 transition-all duration-200 text-left w-full py-1"
                                    >
                                        <Icon className="w-4 h-4 text-blue-500 group-hover:text-blue-600 transition-colors" />
                                        <span className="text-sm text-gray-600 group-hover:text-gray-900 font-medium">{label}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* For Sellers */}
                    <div>
                        <h3 className="text-xs font-semibold text-gray-900 mb-3 tracking-wide uppercase">
                            For Sellers
                        </h3>
                        <ul className="space-y-2">
                            {[
                                { icon: BuildingOfficeIcon, label: 'List Property', view: 'create-listing' },
                                { icon: InboxIcon, label: 'Messages', view: 'inbox' },
                                { icon: UserCircleIcon, label: 'My Account', view: 'account' }
                            ].map(({ icon: Icon, label, view }) => (
                                <li key={label}>
                                    <button
                                        onClick={() => handleNavigation(view as any)}
                                        className="group flex items-center gap-3 hover:translate-x-1 transition-all duration-200 text-left w-full py-1"
                                    >
                                        <Icon className="w-4 h-4 text-green-500 group-hover:text-green-600 transition-colors" />
                                        <span className="text-sm text-gray-600 group-hover:text-gray-900 font-medium">{label}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Contact */}
                    <div>
                        <h3 className="text-xs font-semibold text-gray-900 mb-3 tracking-wide uppercase">
                            Contact
                        </h3>
                        <ul className="space-y-2">
                            <li>
                                <a 
                                    href="tel:+383XXXXXXX" 
                                    className="flex items-center gap-3 hover:translate-x-1 transition-all duration-200 group py-1"
                                >
                                    <PhoneIcon className="w-4 h-4 text-purple-500 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                                    <span className="text-sm text-gray-600 group-hover:text-gray-900 font-medium">+383 XX XXX XXX</span>
                                </a>
                            </li>
                            <li>
                                <a 
                                    href="mailto:info@balkanestate.com" 
                                    className="flex items-center gap-3 hover:translate-x-1 transition-all duration-200 group py-1"
                                >
                                    <EnvelopeIcon className="w-4 h-4 text-purple-500 group-hover:text-purple-600 transition-colors flex-shrink-0" />
                                    <span className="text-sm text-gray-600 group-hover:text-gray-900 font-medium">info@balkanestate.com</span>
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar with Enhanced Visual Hierarchy */}
            <div className="relative z-10 border-t border-gray-300 bg-white/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-sm">
                        <p className="text-gray-600 text-center md:text-left">
                            © {currentYear} <span className="font-semibold text-gray-900">Balkan Estate</span>. All rights reserved.
                        </p>
                        <div className="flex flex-wrap gap-6 justify-center">
                            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Privacy Policy</a>
                            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Terms of Service</a>
                            <a href="#" className="text-gray-600 hover:text-blue-600 transition-colors font-medium">Cookie Policy</a>
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