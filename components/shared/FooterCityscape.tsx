import React from 'react';

const FooterCityscape: React.FC = () => {
    return (
        <div className="relative w-full min-h-[100px] overflow-visible bg-gradient-to-b from-transparent to-primary-dark/50 pb-0">
            {/* Sky background with better contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/90 to-indigo-600/60"></div>

            {/* Stars in the background */}
            <div className="absolute inset-0">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={`star-${i}`}
                        className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 50}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            opacity: Math.random() * 0.7 + 0.3
                        }}
                    ></div>
                ))}
            </div>

            {/* Buildings Container */}
            <div className="relative bottom-0 left-0 right-0 flex items-end justify-around pb-2" style={{ height: '70px' }}>
                {/* Building 1 - Tall Apartment */}
                <div className="relative" style={{ height: '48px', width: '35px' }}>
                    <div className="absolute bottom-0 w-full h-full bg-gradient-to-b from-orange-400 to-orange-600 rounded-t-lg shadow-2xl">
                        {/* Windows */}
                        {[...Array(5)].map((_, floor) => (
                            <div key={`b1-floor-${floor}`} className="flex justify-around px-2 py-1.5">
                                {[...Array(2)].map((_, window) => (
                                    <div
                                        key={`b1-window-${floor}-${window}`}
                                        className="w-3 h-3 bg-yellow-200 animate-window-light"
                                        style={{
                                            animationDelay: `${Math.random() * 5}s`,
                                            opacity: Math.random() > 0.3 ? 1 : 0.3
                                        }}
                                    ></div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-2 bg-red-500 rounded-t"></div>
                </div>

                {/* Building 2 - Medium House */}
                <div className="relative" style={{ height: '32px', width: '32px' }}>
                    <div className="absolute bottom-0 w-full h-full bg-gradient-to-b from-blue-400 to-blue-600 rounded-t-lg shadow-2xl">
                        {/* Roof */}
                        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[35px] border-r-[35px] border-b-[25px] border-l-transparent border-r-transparent border-b-red-600"></div>
                        {/* Windows */}
                        {[...Array(3)].map((_, floor) => (
                            <div key={`b2-floor-${floor}`} className="flex justify-around px-2 py-1.5">
                                {[...Array(2)].map((_, window) => (
                                    <div
                                        key={`b2-window-${floor}-${window}`}
                                        className="w-3 h-3 bg-yellow-200 animate-window-light"
                                        style={{
                                            animationDelay: `${Math.random() * 5}s`,
                                            opacity: Math.random() > 0.3 ? 1 : 0.3
                                        }}
                                    ></div>
                                ))}
                            </div>
                        ))}
                        {/* Door */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-4 h-6 bg-amber-800 rounded-t-sm"></div>
                    </div>
                </div>

                {/* Building 3 - Tall Modern Apartment */}
                <div className="relative" style={{ height: '52px', width: '42px' }}>
                    <div className="absolute bottom-0 w-full h-full bg-gradient-to-b from-teal-400 to-teal-700 rounded-t-lg shadow-2xl">
                        {/* Windows grid */}
                        {[...Array(6)].map((_, floor) => (
                            <div key={`b3-floor-${floor}`} className="flex justify-around px-2 py-1">
                                {[...Array(3)].map((_, window) => (
                                    <div
                                        key={`b3-window-${floor}-${window}`}
                                        className="w-2.5 h-3 bg-yellow-200 animate-window-light"
                                        style={{
                                            animationDelay: `${Math.random() * 5}s`,
                                            opacity: Math.random() > 0.3 ? 1 : 0.3
                                        }}
                                    ></div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="absolute -top-1 left-0 right-0 h-1 bg-gray-700"></div>
                </div>

                {/* Building 4 - Small House */}
                <div className="relative" style={{ height: '28px', width: '30px' }}>
                    <div className="absolute bottom-0 w-full h-full bg-gradient-to-b from-purple-400 to-purple-600 rounded-t-lg shadow-2xl">
                        {/* Roof */}
                        <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[30px] border-r-[30px] border-b-[22px] border-l-transparent border-r-transparent border-b-orange-700"></div>
                        {/* Windows */}
                        <div className="flex justify-around px-2 py-2">
                            {[...Array(2)].map((_, window) => (
                                <div
                                    key={`b4-window-${window}`}
                                    className="w-3 h-3 bg-yellow-200 animate-window-light"
                                    style={{
                                        animationDelay: `${Math.random() * 5}s`,
                                        opacity: Math.random() > 0.3 ? 1 : 0.3
                                    }}
                                ></div>
                            ))}
                        </div>
                        {/* Door */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3 h-5 bg-amber-900 rounded-t-sm"></div>
                    </div>
                </div>

                {/* Building 5 - Medium Apartment */}
                <div className="relative" style={{ height: '39px', width: '38px' }}>
                    <div className="absolute bottom-0 w-full h-full bg-gradient-to-b from-pink-400 to-pink-600 rounded-t-lg shadow-2xl">
                        {/* Windows */}
                        {[...Array(4)].map((_, floor) => (
                            <div key={`b5-floor-${floor}`} className="flex justify-around px-2 py-1.5">
                                {[...Array(2)].map((_, window) => (
                                    <div
                                        key={`b5-window-${floor}-${window}`}
                                        className="w-3 h-3 bg-yellow-200 animate-window-light"
                                        style={{
                                            animationDelay: `${Math.random() * 5}s`,
                                            opacity: Math.random() > 0.3 ? 1 : 0.3
                                        }}
                                    ></div>
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-2 bg-gray-700 rounded-t"></div>
                </div>

                {/* Building 6 - Short House */}
                <div className="relative" style={{ height: '25px', width: '28px' }}>
                    <div className="absolute bottom-0 w-full h-full bg-gradient-to-b from-green-400 to-green-600 rounded-t-lg shadow-2xl">
                        {/* Roof */}
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-[28px] border-r-[28px] border-b-[20px] border-l-transparent border-r-transparent border-b-slate-700"></div>
                        {/* Window */}
                        <div className="flex justify-center pt-2">
                            <div className="w-3 h-3 bg-yellow-200 animate-window-light" style={{ opacity: 0.9 }}></div>
                        </div>
                        {/* Door */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3 h-4 bg-amber-900 rounded-t-sm"></div>
                    </div>
                </div>
            </div>

            {/* Walking People - Fixed to prevent jumping */}
            <div className="absolute bottom-0 left-0 w-full pointer-events-none pb-2" style={{ height: '70px', zIndex: 10 }}>
                {/* Person 1 - Walking right */}
                <div className="person-walking person-walk-right absolute" style={{ bottom: '2px' }}>
                    <svg width="18" height="24" viewBox="0 0 30 40" className="person-svg">
                        <circle cx="15" cy="8" r="4" fill="#FFF" stroke="#000" strokeWidth="1" />
                        <line x1="15" y1="12" x2="15" y2="24" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />
                        <g className="person-legs">
                            <line x1="15" y1="24" x2="10" y2="36" stroke="#FFF" strokeWidth="3" strokeLinecap="round" className="leg-left" />
                            <line x1="15" y1="24" x2="20" y2="36" stroke="#FFF" strokeWidth="3" strokeLinecap="round" className="leg-right" />
                        </g>
                        <g className="person-arms">
                            <line x1="15" y1="16" x2="10" y2="22" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" className="arm-left" />
                            <line x1="15" y1="16" x2="20" y2="22" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" className="arm-right" />
                        </g>
                    </svg>
                </div>

                {/* Person 2 - Walking left */}
                <div className="person-walking person-walk-left absolute" style={{ bottom: '2px' }}>
                    <svg width="18" height="24" viewBox="0 0 30 40" className="person-svg">
                        <circle cx="15" cy="8" r="4" fill="#FFD700" stroke="#000" strokeWidth="1" />
                        <line x1="15" y1="12" x2="15" y2="24" stroke="#FFD700" strokeWidth="3" strokeLinecap="round" />
                        <g className="person-legs">
                            <line x1="15" y1="24" x2="10" y2="36" stroke="#FFD700" strokeWidth="3" strokeLinecap="round" className="leg-left" />
                            <line x1="15" y1="24" x2="20" y2="36" stroke="#FFD700" strokeWidth="3" strokeLinecap="round" className="leg-right" />
                        </g>
                        <g className="person-arms">
                            <line x1="15" y1="16" x2="10" y2="22" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" className="arm-left" />
                            <line x1="15" y1="16" x2="20" y2="22" stroke="#FFD700" strokeWidth="2.5" strokeLinecap="round" className="arm-right" />
                        </g>
                    </svg>
                </div>

                {/* Person 3 - Walking right (slower) */}
                <div className="person-walking person-walk-right-slow absolute" style={{ bottom: '2px' }}>
                    <svg width="18" height="24" viewBox="0 0 30 40" className="person-svg">
                        <circle cx="15" cy="8" r="4" fill="#FF6B6B" stroke="#000" strokeWidth="1" />
                        <line x1="15" y1="12" x2="15" y2="24" stroke="#FF6B6B" strokeWidth="3" strokeLinecap="round" />
                        <g className="person-legs">
                            <line x1="15" y1="24" x2="10" y2="36" stroke="#FF6B6B" strokeWidth="3" strokeLinecap="round" className="leg-left" />
                            <line x1="15" y1="24" x2="20" y2="36" stroke="#FF6B6B" strokeWidth="3" strokeLinecap="round" className="leg-right" />
                        </g>
                        <g className="person-arms">
                            <line x1="15" y1="16" x2="10" y2="22" stroke="#FF6B6B" strokeWidth="2.5" strokeLinecap="round" className="arm-left" />
                            <line x1="15" y1="16" x2="20" y2="22" stroke="#FF6B6B" strokeWidth="2.5" strokeLinecap="round" className="arm-right" />
                        </g>
                    </svg>
                </div>
            </div>

            {/* Ground/Street */}
            <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-gray-600 via-gray-700 to-gray-600">
                {/* Street lines */}
                <div className="absolute top-1/2 left-0 right-0 h-px bg-yellow-300 opacity-50"></div>
            </div>

            {/* Inline Styles for Animations */}
            <style jsx>{`
                @keyframes twinkle {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }

                @keyframes windowLight {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 1; }
                }

                @keyframes walkRight {
                    0% { transform: translate3d(-50px, 0, 0); }
                    100% { transform: translate3d(calc(100vw + 50px), 0, 0); }
                }

                @keyframes walkLeft {
                    0% { transform: translate3d(calc(100vw + 50px), 0, 0); }
                    100% { transform: translate3d(-50px, 0, 0); }
                }

                @keyframes walkRightSlow {
                    0% { transform: translate3d(-50px, 0, 0); }
                    100% { transform: translate3d(calc(100vw + 50px), 0, 0); }
                }

                @keyframes legWalkLeft {
                    0%, 100% {
                        transform: rotate(0deg);
                    }
                    25% {
                        transform: rotate(-25deg);
                    }
                    75% {
                        transform: rotate(25deg);
                    }
                }

                @keyframes legWalkRight {
                    0%, 100% {
                        transform: rotate(0deg);
                    }
                    25% {
                        transform: rotate(25deg);
                    }
                    75% {
                        transform: rotate(-25deg);
                    }
                }

                @keyframes armSwingLeft {
                    0%, 100% {
                        transform: rotate(0deg);
                    }
                    50% {
                        transform: rotate(-20deg);
                    }
                }

                @keyframes armSwingRight {
                    0%, 100% {
                        transform: rotate(0deg);
                    }
                    50% {
                        transform: rotate(20deg);
                    }
                }

                .animate-twinkle {
                    animation: twinkle 3s ease-in-out infinite;
                }

                .animate-window-light {
                    animation: windowLight 4s ease-in-out infinite;
                }

                .person-walking {
                    will-change: transform;
                }

                .person-walk-right {
                    animation: walkRight 25s linear infinite;
                }

                .person-walk-left {
                    animation: walkLeft 30s linear infinite;
                }

                .person-walk-right-slow {
                    animation: walkRightSlow 40s linear infinite;
                }

                .person-svg {
                    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
                }

                .leg-left {
                    animation: legWalkLeft 1s ease-in-out infinite;
                    transform-origin: 15px 24px;
                }

                .leg-right {
                    animation: legWalkRight 1s ease-in-out infinite;
                    transform-origin: 15px 24px;
                }

                .arm-left {
                    animation: armSwingLeft 1s ease-in-out infinite;
                    transform-origin: 15px 16px;
                }

                .arm-right {
                    animation: armSwingRight 1s ease-in-out infinite;
                    transform-origin: 15px 16px;
                }
            `}</style>
        </div>
    );
};

export default FooterCityscape;
