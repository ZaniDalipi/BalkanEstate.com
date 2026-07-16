import React from 'react';
import { usePauseWhenOffscreen } from '../../src/shared/hooks/usePauseWhenOffscreen';

// Balkan country flags for the animation
const balkanFlags = [
    { code: 'AL', flag: '🇦🇱', name: 'Albania' },
    { code: 'BA', flag: '🇧🇦', name: 'Bosnia' },
    { code: 'BG', flag: '🇧🇬', name: 'Bulgaria' },
    { code: 'HR', flag: '🇭🇷', name: 'Croatia' },
    { code: 'GR', flag: '🇬🇷', name: 'Greece' },
    { code: 'XK', flag: '🇽🇰', name: 'Kosovo' },
    { code: 'ME', flag: '🇲🇪', name: 'Montenegro' },
    { code: 'MK', flag: '🇲🇰', name: 'N. Macedonia' },
    { code: 'RO', flag: '🇷🇴', name: 'Romania' },
    { code: 'RS', flag: '🇷🇸', name: 'Serbia' },
];

const FooterCityscape: React.FC = () => {
    const { ref, offscreen } = usePauseWhenOffscreen<HTMLDivElement>();
    return (
        <div
            ref={ref}
            className={`relative w-full h-[100px] sm:h-[120px] md:h-[140px] overflow-hidden${offscreen ? ' decorative-offscreen' : ''}`}>
            {/* Gradient sky */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-indigo-950 to-transparent" />

            {/* Animated stars */}
            <div className="absolute inset-0">
                {[...Array(30)].map((_, i) => (
                    <div
                        key={`star-${i}`}
                        className="absolute rounded-full animate-twinkle"
                        style={{
                            width: `${Math.random() * 2 + 1}px`,
                            height: `${Math.random() * 2 + 1}px`,
                            backgroundColor: i % 3 === 0 ? '#60A5FA' : '#FFFFFF',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 60}%`,
                            animationDelay: `${Math.random() * 4}s`,
                            animationDuration: `${2 + Math.random() * 3}s`,
                        }}
                    />
                ))}
            </div>

            {/* Floating flags carousel */}
            <div className="absolute top-2 left-0 right-0 overflow-hidden h-10">
                <div className="flags-scroll flex gap-8 items-center">
                    {[...balkanFlags, ...balkanFlags, ...balkanFlags].map((country, i) => (
                        <div
                            key={`flag-${i}`}
                            className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm px-3 py-1 rounded-full border border-white/20 hover:bg-white/20 transition-colors flex-shrink-0"
                        >
                            <span className="text-lg">{country.flag}</span>
                            <span className="text-[10px] font-medium text-white/80 hidden sm:inline">{country.code}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Sparkles floating */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={`sparkle-${i}`}
                        className="absolute animate-float-sparkle"
                        style={{
                            left: `${10 + i * 12}%`,
                            top: `${20 + (i % 3) * 15}%`,
                            animationDelay: `${i * 0.5}s`,
                            animationDuration: `${4 + i * 0.5}s`,
                        }}
                    >
                        <svg className="w-3 h-3 text-primary/60" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
                        </svg>
                    </div>
                ))}
            </div>

            {/* Landmark Buildings - Balkan inspired */}
            <div className="absolute bottom-0 left-0 right-0 flex items-end justify-around px-2" style={{ height: '90px' }}>
                {/* Albanian Tower (inspired by Tirana) */}
                <div className="relative building-hover" style={{ height: '55px', width: '30px' }}>
                    <div className="absolute bottom-0 w-full h-full bg-gradient-to-b from-red-500 to-red-700 rounded-t-sm shadow-lg">
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px]">🇦🇱</div>
                        {[...Array(4)].map((_, floor) => (
                            <div key={floor} className="flex justify-around px-1 py-1">
                                {[...Array(2)].map((_, w) => (
                                    <div key={w} className="w-2.5 h-2 bg-yellow-200/80 rounded-sm animate-window" style={{ animationDelay: `${Math.random() * 3}s` }} />
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-3 bg-red-800 rounded-t-full" />
                </div>

                {/* Serbian Building (inspired by Belgrade) */}
                <div className="relative building-hover" style={{ height: '65px', width: '35px' }}>
                    <div className="absolute bottom-0 w-full h-full bg-gradient-to-b from-blue-500 to-blue-700 rounded-t shadow-lg">
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px]">🇷🇸</div>
                        {[...Array(5)].map((_, floor) => (
                            <div key={floor} className="flex justify-around px-1.5 py-1">
                                {[...Array(2)].map((_, w) => (
                                    <div key={w} className="w-3 h-2 bg-yellow-200/80 rounded-sm animate-window" style={{ animationDelay: `${Math.random() * 3}s` }} />
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="absolute -top-2 left-0 right-0 h-2 bg-white/30 rounded-t" />
                </div>

                {/* Greek Temple Style */}
                <div className="relative building-hover" style={{ height: '45px', width: '45px' }}>
                    <div className="absolute bottom-0 w-full h-[35px] bg-gradient-to-b from-sky-100 to-sky-200 shadow-lg">
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px]">🇬🇷</div>
                        {/* Columns */}
                        <div className="flex justify-around h-full pt-4 px-1">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="w-2 h-full bg-gradient-to-b from-white to-sky-300 rounded-t" />
                            ))}
                        </div>
                    </div>
                    {/* Temple roof */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[25px] border-r-[25px] border-b-[12px] border-l-transparent border-r-transparent border-b-sky-300" />
                </div>

                {/* Croatian Coastal House */}
                <div className="relative building-hover" style={{ height: '40px', width: '32px' }}>
                    <div className="absolute bottom-0 w-full h-full bg-gradient-to-b from-orange-300 to-orange-500 rounded-t shadow-lg">
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px]">🇭🇷</div>
                        <div className="flex justify-around px-1.5 py-2 pt-4">
                            {[...Array(2)].map((_, w) => (
                                <div key={w} className="w-3 h-4 bg-blue-400/80 rounded-t-full animate-window" style={{ animationDelay: `${Math.random() * 3}s` }} />
                            ))}
                        </div>
                    </div>
                    {/* Red tile roof */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[20px] border-r-[20px] border-b-[16px] border-l-transparent border-r-transparent border-b-red-600" />
                </div>

                {/* Bulgarian Church Style */}
                <div className="relative building-hover" style={{ height: '60px', width: '28px' }}>
                    <div className="absolute bottom-0 w-full h-[45px] bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-t shadow-lg">
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px]">🇧🇬</div>
                        {[...Array(3)].map((_, floor) => (
                            <div key={floor} className="flex justify-center px-1 py-1.5 pt-3">
                                <div className="w-3 h-2.5 bg-yellow-200/80 rounded-t-full animate-window" style={{ animationDelay: `${Math.random() * 3}s` }} />
                            </div>
                        ))}
                    </div>
                    {/* Onion dome */}
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                        <div className="w-4 h-5 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full" />
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-2 bg-amber-300" />
                    </div>
                </div>

                {/* Bosnian Ottoman Style */}
                <div className="relative building-hover" style={{ height: '50px', width: '35px' }}>
                    <div className="absolute bottom-0 w-full h-[40px] bg-gradient-to-b from-amber-100 to-amber-300 shadow-lg">
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px]">🇧🇦</div>
                        <div className="flex justify-around px-1 py-2 pt-4">
                            {[...Array(2)].map((_, w) => (
                                <div key={w} className="w-3 h-5 bg-amber-800/60 rounded-t-full animate-window" style={{ animationDelay: `${Math.random() * 3}s` }} />
                            ))}
                        </div>
                    </div>
                    {/* Minaret-inspired top */}
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-3 h-4 bg-gradient-to-b from-teal-400 to-teal-600 rounded-t-full" />
                </div>

                {/* Montenegrin Coastal */}
                <div className="relative building-hover" style={{ height: '35px', width: '30px' }}>
                    <div className="absolute bottom-0 w-full h-full bg-gradient-to-b from-stone-300 to-stone-500 rounded-t shadow-lg">
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px]">🇲🇪</div>
                        <div className="flex justify-around px-1.5 pt-4">
                            {[...Array(2)].map((_, w) => (
                                <div key={w} className="w-2.5 h-3 bg-sky-300/80 rounded-sm animate-window" style={{ animationDelay: `${Math.random() * 3}s` }} />
                            ))}
                        </div>
                    </div>
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[18px] border-r-[18px] border-b-[12px] border-l-transparent border-r-transparent border-b-orange-700" />
                </div>

                {/* Romanian Castle Style */}
                <div className="relative building-hover hidden sm:block" style={{ height: '70px', width: '40px' }}>
                    <div className="absolute bottom-0 w-full h-[50px] bg-gradient-to-b from-purple-400 to-purple-700 shadow-lg">
                        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px]">🇷🇴</div>
                        {[...Array(4)].map((_, floor) => (
                            <div key={floor} className="flex justify-around px-1.5 py-1 pt-3">
                                {[...Array(2)].map((_, w) => (
                                    <div key={w} className="w-2.5 h-2 bg-yellow-200/80 rounded-sm animate-window" style={{ animationDelay: `${Math.random() * 3}s` }} />
                                ))}
                            </div>
                        ))}
                    </div>
                    {/* Castle towers */}
                    <div className="absolute -top-5 left-0 w-3 h-6 bg-purple-800 rounded-t">
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[5px] border-l-transparent border-r-transparent border-b-purple-900" />
                    </div>
                    <div className="absolute -top-5 right-0 w-3 h-6 bg-purple-800 rounded-t">
                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[5px] border-l-transparent border-r-transparent border-b-purple-900" />
                    </div>
                </div>
            </div>

            {/* Walking People with flags */}
            <div className="absolute bottom-2 left-0 w-full pointer-events-none" style={{ zIndex: 20 }}>
                {/* Person 1 */}
                <div className="person-walking person-walk-right absolute" style={{ bottom: '0' }}>
                    <div className="relative">
                        <svg width="16" height="22" viewBox="0 0 30 40" className="person-svg">
                            <circle cx="15" cy="8" r="4" fill="#FFF" />
                            <line x1="15" y1="12" x2="15" y2="24" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
                            <g className="person-legs">
                                <line x1="15" y1="24" x2="10" y2="36" stroke="#FFF" strokeWidth="3" strokeLinecap="round" className="leg-left" />
                                <line x1="15" y1="24" x2="20" y2="36" stroke="#FFF" strokeWidth="3" strokeLinecap="round" className="leg-right" />
                            </g>
                        </svg>
                        <span className="absolute -top-1 -right-2 text-[10px] animate-bounce" style={{ animationDuration: '2s' }}>🇦🇱</span>
                    </div>
                </div>

                {/* Person 2 */}
                <div className="person-walking person-walk-left absolute" style={{ bottom: '0' }}>
                    <div className="relative">
                        <svg width="16" height="22" viewBox="0 0 30 40" className="person-svg">
                            <circle cx="15" cy="8" r="4" fill="#FFD700" />
                            <line x1="15" y1="12" x2="15" y2="24" stroke="#FFD700" strokeWidth="3" strokeLinecap="round" />
                            <g className="person-legs">
                                <line x1="15" y1="24" x2="10" y2="36" stroke="#FFD700" strokeWidth="3" strokeLinecap="round" className="leg-left" />
                                <line x1="15" y1="24" x2="20" y2="36" stroke="#FFD700" strokeWidth="3" strokeLinecap="round" className="leg-right" />
                            </g>
                        </svg>
                        <span className="absolute -top-1 -right-2 text-[10px] animate-bounce" style={{ animationDuration: '2.2s' }}>🇷🇸</span>
                    </div>
                </div>

                {/* Person 3 */}
                <div className="person-walking person-walk-right-slow absolute" style={{ bottom: '0' }}>
                    <div className="relative">
                        <svg width="16" height="22" viewBox="0 0 30 40" className="person-svg">
                            <circle cx="15" cy="8" r="4" fill="#60A5FA" />
                            <line x1="15" y1="12" x2="15" y2="24" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" />
                            <g className="person-legs">
                                <line x1="15" y1="24" x2="10" y2="36" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" className="leg-left" />
                                <line x1="15" y1="24" x2="20" y2="36" stroke="#60A5FA" strokeWidth="3" strokeLinecap="round" className="leg-right" />
                            </g>
                        </svg>
                        <span className="absolute -top-1 -right-2 text-[10px] animate-bounce" style={{ animationDuration: '1.8s' }}>🇬🇷</span>
                    </div>
                </div>
            </div>

            {/* Ground with gradient */}
            <div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800">
                <div className="absolute top-1/2 left-0 right-0 h-px bg-yellow-400/30" />
            </div>

            {/* Styles */}
            <style>{`
                @keyframes twinkle {
                    0%, 100% { opacity: 0.3; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.2); }
                }

                @keyframes float-sparkle {
                    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.4; }
                    50% { transform: translateY(-10px) rotate(180deg); opacity: 0.8; }
                }

                @keyframes window-flicker {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }

                @keyframes scroll-flags {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-33.333%); }
                }

                @keyframes walkRight {
                    0% { transform: translateX(-50px); }
                    100% { transform: translateX(calc(100vw + 50px)); }
                }

                @keyframes walkLeft {
                    0% { transform: translateX(calc(100vw + 50px)); }
                    100% { transform: translateX(-50px); }
                }

                @keyframes walkRightSlow {
                    0% { transform: translateX(-100px); }
                    100% { transform: translateX(calc(100vw + 100px)); }
                }

                @keyframes legWalk {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-20deg); }
                    75% { transform: rotate(20deg); }
                }

                .animate-twinkle {
                    animation: twinkle 3s ease-in-out infinite;
                }

                .animate-float-sparkle {
                    animation: float-sparkle 4s ease-in-out infinite;
                }

                .animate-window {
                    animation: window-flicker 4s ease-in-out infinite;
                }

                .flags-scroll {
                    animation: scroll-flags 30s linear infinite;
                    width: fit-content;
                }

                .flags-scroll:hover {
                    animation-play-state: paused;
                }

                .person-walking {
                    will-change: transform;
                }

                .person-walk-right {
                    animation: walkRight 20s linear infinite;
                }

                .person-walk-left {
                    animation: walkLeft 25s linear infinite;
                }

                .person-walk-right-slow {
                    animation: walkRightSlow 35s linear infinite;
                }

                .person-svg {
                    filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.4));
                }

                .leg-left, .leg-right {
                    animation: legWalk 0.8s ease-in-out infinite;
                    transform-origin: 15px 24px;
                }

                .leg-right {
                    animation-delay: 0.4s;
                }

                .building-hover {
                    transition: transform 0.3s ease;
                }

                .building-hover:hover {
                    transform: translateY(-3px);
                }
            `}</style>
        </div>
    );
};

export default FooterCityscape;
