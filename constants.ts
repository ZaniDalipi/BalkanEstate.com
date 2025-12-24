import React from 'react';



// FIX: Rewrote all icon components to use React.createElement instead of JSX to be compatible with a .ts file extension.
const Icon: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className }) => (
    React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        fill: "none",
        viewBox: "0 0 24 24",
        strokeWidth: 1.5,
        stroke: "currentColor",
        className: className
    }, children)
);

const SolidIcon: React.FC<{ children?: React.ReactNode; className?: string }> = ({ children, className }) => (
    React.createElement('svg', {
        xmlns: "http://www.w3.org/2000/svg",
        viewBox: "0 0 24 24",
        fill: "currentColor",
        className: className
    }, children)
);

export const FireIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" }),
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" })
    )
);

export const AcademicCapIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" })
    )
);

export const TrendingUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" })
    )
);

export const DocumentTextIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" })
    )
);

export const ChatBubbleLeftRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.422-2.87-3.275-2.87-1.854 0-3.275 1.249-3.275 2.87v6.204c0 1.621 1.421 2.87 3.275 2.87 1.844 0 3.275-1.253 3.275-2.87V8.511z" })
    )
);

export const ArrowTrendingUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" })
    )
);

export const ArrowTrendingDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 6L9 12.75l4.306-4.307a11.95 11.95 0 015.814 5.519l2.74 1.22m0 0l-5.94 2.28m5.94-2.28l-2.28-5.941" })
    )
);

export const HandThumbUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V2.75a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904m10.598-9.75H14.25M5.904 18.5c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.908c-.889 0-1.713-.518-1.972-1.368a12 12 0 01-.521-3.507c0-1.553.295-3.036.831-4.398C3.387 9.953 4.167 9.5 5 9.5h1.053c.472 0 .745.556.5.96a8.958 8.958 0 00-1.302 4.665c0 1.194.232 2.333.654 3.375z" })
    )
);







export const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" }),
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" })
    )
);

export const Bars3Icon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" })
    )
);

export const UserCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(SolidIcon, { className: className },
        React.createElement('path', { fillRule: "evenodd", d: "M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z", clipRule: "evenodd" })
    )
);

export const XMarkIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" })
    )
);

export const ArrowTopRightOnSquareIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" })
    )
);

export const LogoIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement('svg', { className: className, viewBox: "0 0 24 24", xmlns: "http://www.w3.org/2000/svg" },
        React.createElement('g', { fillRule: "evenodd" },
            React.createElement('path', { fill: "#003A96", d: "M12 21V5L10 7V23L12 21Z M4 21V10L2 12V23L4 21Z" }),
            React.createElement('path', { fill: "#0252CD", d: "M12 5H20V21H12V5Z M4 10H10V21H4V10Z" })
        )
    )
);

// FIX: Add missing MapIcon component.
export const MapIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.37-1.716-.998l-5.108 2.554a2.25 2.25 0 01-1.422 0l-5.108-2.554c-.836-.418-1.716.162-1.716.998v10.36c0 .426.24.815.622 1.006l4.875 2.437a2.25 2.25 0 001.422 0z" })
    )
);

export const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" }),
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" })
    )
);

export const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" })
    )
);

export const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(SolidIcon, { className: className },
        React.createElement('path', { fillRule: "evenodd", d: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.5 21.75l-.398-1.178a3.375 3.375 0 00-2.31-2.31L12 18l1.178-.398a3.375 3.375 0 002.31-2.31L16.5 14.25l.398 1.178a3.375 3.375 0 002.31 2.31L20.25 18l-1.178.398a3.375 3.375 0 00-2.31 2.31z", clipRule: "evenodd" })
    )
);

export const KeyIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.967-.561 1.563-.43A6.002 6.002 0 0118.75 8.25z" })
    )
);

export const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" })
    )
);

export const BuildingLibraryIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" })
    )
);

export const BedIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" })
    )
);

export const BathIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
      React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M8.25 7.5V6a2.25 2.25 0 012.25-2.25h3a2.25 2.25 0 012.25 2.25v1.5m-9.75 3V21a2.25 2.25 0 002.25 2.25h9.75a2.25 2.25 0 002.25-2.25v-9.75M8.25 7.5h9.75M12 13.5v2.25" })
    )
);


export const SqftIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0L15 15" })
    )
);

export const CalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" })
    )
);

export const ParkingIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(SolidIcon, { className: className },
      React.createElement('path', { d: "M6.75 3.375c0-1.036.84-1.875 1.875-1.875h.375a3.75 3.75 0 013.75 3.75v1.875m0 0H10.5M12 9.75v5.625M15 9.75a.75.75 0 01.75-.75h.375a3.75 3.75 0 013.75 3.75v1.875m0 0H19.5" }),
      React.createElement('path', { d: "M1.5 6.75c0-1.036.84-1.875 1.875-1.875h17.25c1.035 0 1.875.84 1.875 1.875v10.5c0 1.035-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 17.25v-10.5z" })
    )
);

export const PhoneIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 6.75z" })
    )
);

export const GlobeAltIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" })
    )
);

export const StarIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" })
    )
);

export const StarIconSolid: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(SolidIcon, { className: className },
        React.createElement('path', { fillRule: "evenodd", d: "M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354l-4.757 2.847c-.996.598-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z", clipRule: "evenodd" })
    )
);

export const CubeIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" })
    )
);

export const VideoCameraIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" })
    )
);

export const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.75 19.5L8.25 12l7.5-7.5" })
    )
);

export const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M8.25 4.5l7.5 7.5-7.5 7.5" })
    )
);

export const MagnifyingGlassPlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" })
    )
);

export const MagnifyingGlassMinusIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" })
    )
);

export const PencilIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" })
    )
);

export const ShareIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.863a2.25 2.25 0 103.935-2.186 2.25 2.25 0 00-3.935 2.186z" })
    )
);

export const ArrowDownTrayIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" })
    )
);

export const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" })
    )
);

export const ArrowUturnLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" })
    )
);

export const BuildingOfficeIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
      React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h6M9 11.25h6M9 15.75h6M9 20.25h6" })
    )
);


export const CubeTransparentIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M21 7.5l-2.25-1.313M21 7.5v2.25m0-2.25l-2.25 1.313M3 7.5l2.25-1.313M3 7.5v2.25m0-2.25l2.25 1.313M16.5 20.25l2.25-1.313M16.5 20.25v-2.25m0 2.25l2.25 1.313M12 18l2.25-1.313M12 18v-2.25m0 2.25l2.25 1.313M12 18l-2.25-1.313M12 18v-2.25m0 2.25l-2.25 1.313M12 6l2.25-1.313M12 6v2.25m0-2.25l2.25 1.313M12 6l-2.25-1.313M12 6v2.25m0-2.25l-2.25 1.313M3 12l2.25-1.313M3 12v2.25m0-2.25l2.25 1.313M7.5 20.25l2.25-1.313M7.5 20.25v-2.25m0 2.25l2.25 1.313M12 12l2.25-1.313M12 12v2.25m0-2.25l2.25 1.313M12 12l-2.25-1.313M12 12v2.25m0-2.25l-2.25 1.313M21 12l-2.25-1.313M21 12v2.25m0-2.25l-2.25 1.313" })
    )
);

export const ChevronUpIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M4.5 15.75l7.5-7.5 7.5 7.5" })
    )
);

export const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 8.25l-7.5 7.5-7.5-7.5" })
    )
);

export const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(SolidIcon, { className: className },
        React.createElement('path', { fillRule: "evenodd", d: "M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z", clipRule: "evenodd" })
    )
);

export const TrophyIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.5 18.75h-9a9.75 9.75 0 001.036 3.863 1.5 1.5 0 002.632 0 9.75 9.75 0 001.036-3.863zM16.5 18.75H21m-4.5 0H12m0 0h-4.5m4.5 0V7.5m0 11.25V7.5m0 0H7.5M12 7.5h4.5M12 7.5v-3.75a3 3 0 00-3-3H9a3 3 0 00-3 3v3.75m6 0v11.25" })
    )
);

export const HeartIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" })
    )
);

export const EnvelopeIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" })
    )
);

export const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.66c.11-.341.122-.69.122-1.037v-.032c0-.42-.02-.83-.06-1.228M9 4.19v.003c-.621.328-1.203.72-1.74 1.185a6.375 6.375 0 00-3.18 5.426c0 .42.02.83.06 1.228v.032c0 .347.012.696.122 1.037.19.596.42 1.156.694 1.684a6.375 6.375 0 01-3.18-5.426C2.012 5.922 4.654 3.5 8.25 3.5c.383 0 .761.025 1.132.072v.003z" })
    )
);

export const FilterIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" })
    )
);
export const HomeIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" })
    )
);

export const AdjustmentsHorizontalIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" })
    )
);

export const Squares2x2Icon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(SolidIcon, { className: className },
        React.createElement('path', { fillRule: "evenodd", d: "M3.75 4.5a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-4.5zM3.75 13.5a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-4.5zM13.5 4.5a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-4.5zM13.5 13.5a.75.75 0 01.75-.75h4.5a.75.75 0 01.75.75v4.5a.75.75 0 01-.75.75h-4.5a.75.75 0 01-.75-.75v-4.5z", clipRule: "evenodd" })
    )
);

export const ScaleIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-1.844.434m-7.443-12.443c0-1.258.968-2.285 2.18-2.285h.384a2.285 2.285 0 012.18 2.285v1.286M5.25 4.97A48.416 48.416 0 0112 4.5c2.291 0 4.545.16 6.75.47m-13.5 0c-1.01.143-2.01.317-3 .52m3-.52l-2.62 10.726c-.122.499.106 1.028.589 1.202a5.989 5.989 0 001.844.434m7.443-12.443c0-1.258-.968-2.285-2.18-2.285h-.384a2.285 2.285 0 00-2.18 2.285v1.286" })
    )
);

export const LivingRoomIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M20 9H4a1 1 0 00-1 1v4a1 1 0 001 1h16a1 1 0 001-1v-4a1 1 0 00-1-1z" }),
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M5 15h14v2H5v-2z" }),
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M7 17v2h2v-2H7z" }),
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 17v2h2v-2h-2z" })
    )
);

export const AtSymbolIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.5 12a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM19.5 12c0-5.63-3.86-10.4-9-11.55a.75.75 0 00-.9 1.18 10.46 10.46 0 01-.4 2.11 8.98 8.98 0 00-2.83 5.76c0 5.25 4.5 9.5 10 9.5 2.1 0 4.05-.6 5.6-1.62.9-.6 1.5-1.5 1.5-2.58 0-2.05-1.7-3.72-3.8-3.72z" })
    )
);

export const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(SolidIcon, { className: className },
        React.createElement('path', { fillRule: "evenodd", d: "M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z", clipRule: "evenodd" })
    )
);

export const CurrencyDollarIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" })
    )
);

export const ChartBarIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" })
    )
);

export const BoltIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" })
    )
);

export const AppleIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement('svg', { viewBox: "0 0 24 24", fill: "currentColor", className: className },
        React.createElement('path', { d: "M17.25,18.46a3,3,0,0,0,1.3-2.4c0-1.74-1.74-2.39-2.08-2.5a.15.15,0,0,0-.13.06,10.6,10.6,0,0,0-1.89,3.12,9.39,9.39,0,0,0,.19,3.8,3.38,3.38,0,0,0,2.61-2.08Zm-3-12.21a4.23,4.23,0,0,1,2-3.41,4,4,0,0,0-3.35-1.79,4.2,4.2,0,0,0-4.14,4.32,3.92,3.92,0,0,0,3.58,4.1,4.36,4.36,0,0,1,1.91-3.22Zm-2.88,15.6a11.1,11.1,0,0,1-3.66-1.16c-2.33-1.45-4.15-4.2-4.15-7.39a8.08,8.08,0,0,1,4.64-7.2,10.27,10.27,0,0,1,6.5-1.55,1.25,1.25,0,0,0,.21,0,10.66,10.66,0,0,1,5.2,5.1,1.29,1.29,0,0,1-1.16,2c-1.3,0-2.19.78-3.32.78-1.3,0-2.39-.84-3.79-.84a11.55,11.55,0,0,0-6,3.13c-1.55,1.6-2.28,3.7-2.28,5.82a5.4,5.4,0,0,0,3.38,5.12c1.45.6,3.16.63,4.6.63a12.18,12.18,0,0,0,5-1,1.29,1.29,0,0,1,1-2.18,1.33,1.33,0,0,1,1.35.79,10.59,10.59,0,0,1-6.26,2.15Z" })
    )
);

export const DevicePhoneMobileIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75A2.25 2.25 0 0015.75 1.5h-5.25zM12 18a.75.75 0 100-1.5.75.75 0 000 1.5z" })
    )
);

export const FacebookIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement('svg', { viewBox: "0 0 24 24", fill: "currentColor", className: className },
        React.createElement('path', { d: "M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3l-.5 3h-2.5v6.8c4.56-.93 8-4.96 8-9.8z" })
    )
);

export const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement('svg', { viewBox: "0 0 24 24", className: className },
        React.createElement('path', { d: "M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z", fill: "#4285F4" }),
        React.createElement('path', { d: "M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z", fill: "#34A853" }),
        React.createElement('path', { d: "M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z", fill: "#FBBC05" }),
        React.createElement('path', { d: "M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z", fill: "#EA4335" })
    )
);

export const PaperAirplaneIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" })
    )
);

export const ArrowLeftOnRectangleIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l-3-3m0 0l-3 3m3-3V9" })
    )
);

export const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.432 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" }),
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M15 12a3 3 0 11-6 0 3 3 0 016 0z" })
    )
);

export const InboxIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.012-1.244h3.86m-19.5 0a2.25 2.25 0 012.25-2.25h15a2.25 2.25 0 012.25 2.25m-19.5 0v.243a2.25 2.25 0 00.743 1.623l.161.218a2.25 2.25 0 001.622.743h14.53a2.25 2.25 0 001.622-.743l.161-.218a2.25 2.25 0 00.743-1.623V9z" })
    )
);

export const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" })
    )
);

export const ArrowPathIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.023 9.348h4.992v-.001a.75.75 0 01.684.921l-1.91 7.126a.75.75 0 01-1.391.107l-2.09-6.273-6.273 2.09a.75.75 0 01-.107 1.391l-7.126 1.91a.75.75 0 01-.921-.684v-.001H3.003a.75.75 0 01.684-1.6l4.385-1.462a.75.75 0 01.996.347l1.459 4.377 4.377-1.459a.75.75 0 01.347.996l-1.462 4.385a.75.75 0 01-1.6.684H9.348a.75.75 0 01-.684-.921l1.91-7.126a.75.75 0 011.391-.107l2.09 6.273 6.273-2.09a.75.75 0 01.107-1.391l7.126-1.91a.75.75 0 01.921.684v.001h.001z" })
    )
);

export const ChatBubbleBottomCenterTextIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12a9 9 0 11-18 0 9 9 0 0118 0z" })
    )
);

export const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement('svg', {
        className: `animate-spin ${className}`,
        xmlns: "http://www.w3.org/2000/svg",
        fill: "none",
        viewBox: "0 0 24 24"
    },
        React.createElement('circle', {
            className: "opacity-25",
            cx: "12",
            cy: "12",
            r: "10",
            stroke: "currentColor",
            strokeWidth: "4"
        }),
        React.createElement('path', {
            className: "opacity-75",
            fill: "currentColor",
            d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        })
    )
);

export const CameraIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" }),
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" })
    )
);

export const TwitterIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement('svg', { viewBox: "0 0 24 24", fill: "currentColor", className: className },
        React.createElement('path', { d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" })
    )
);

export const WhatsappIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement('svg', { viewBox: "0 0 24 24", fill: "currentColor", className: className },
        React.createElement('path', { d: "M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.38 1.25 4.81L2 22l5.3-1.38c1.37.71 2.93 1.12 4.56 1.12h.13c5.46 0 9.91-4.45 9.91-9.91S17.63 2 12.04 2zm.01 16.89c-1.5 0-2.93-.4-4.2-1.12l-.3-.18-3.12.81.83-3.04-.2-.32c-.8-1.35-1.28-2.88-1.28-4.55 0-4.33 3.53-7.86 7.86-7.86 2.1 0 4.08.82 5.56 2.3 1.48 1.48 2.3 3.46 2.3 5.56-.02 4.33-3.55 7.86-7.85 7.86zm3.8-5.32c-.22-.11-1.3-.65-1.5-.72s-.35-.11-.5.11c-.15.22-.57.72-.7.86s-.26.17-.48.06c-.22-.11-1.3-.48-2.48-1.53s-1.85-2.22-2.07-2.58-.17-.3-.06-.41c.11-.11.24-.28.35-.41.11-.13.17-.22.26-.37.08-.15.04-.28-.02-.39-.06-.11-.5-1.2-.68-1.64s-.37-.37-.5-.37h-.5c-.17 0-.44.06-.68.33s-.92.9-.92 2.2c0 1.3.94 2.55 1.07 2.72s1.85 2.83 4.5 3.97c.62.26 1.1.42 1.48.53.59.18 1.13.15 1.55.09.47-.06 1.3-.53 1.48-.92.18-.39.18-.72.13-.79s-.17-.11-.37-.22z" })
    )
);

export const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 4.5v15m7.5-7.5h-15" })
    )
);

export const CrosshairsIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M19.5 10.5a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" }),
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 3v2.25m0 13.5V21m-9-9h2.25m13.5 0H21" })
    )
);

export const StreetViewIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 21V10.5a3.75 3.75 0 117.5 0V21" }),
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12.75 6a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" }),
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M3.75 19.5h16.5" })
    )
);

export const CreditCardIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" })
    )
);

export const BanknotesIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00.75-.75v-.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" })
    )
);

export const LockClosedIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" })
    )
);

export const PhotoIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" })
    )
);

export const ShieldExclamationIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M12 9v3.75m0-10.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286zm0 13.036h.008v.008H12v-.008z" })
    )
);

export const ShieldCheckIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.75c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.249-8.25-3.286z" })
    )
);

export const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" })
    )
);

export const TicketIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" })
    )
);

export const MagnifyingGlassIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" })
    )
);

export const UserGroupIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" })
    )
);

export const CheckBadgeIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(SolidIcon, { className: className },
        React.createElement('path', { fillRule: "evenodd", d: "M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z", clipRule: "evenodd" })
    )
);

export const HomeModernIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-4.5m0 0l4.5 4.5M6.75 7.5V21" })
    )
);

export const HomePinIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" })
    )
);

export const ArrowRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        React.createElement('path', { strokeLinecap: "round", strokeLinejoin: "round", d: "M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" })
    )
);

export const BuildingStorefrontIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement(Icon, { className: className },
        // Main building structure
        React.createElement('path', { 
            strokeLinecap: "round", 
            strokeLinejoin: "round", 
            d: "M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" 
        }),
        // Additional decorative elements
        React.createElement('path', { 
            strokeLinecap: "round", 
            strokeLinejoin: "round", 
            d: "M3 18h18M9 15h6" 
        }),
        // Magical sparkle accents
        React.createElement('path', { 
            className: "opacity-50",
            strokeLinecap: "round", 
            strokeLinejoin: "round", 
            d: "M12 9V6m0 0l2.25 2.25M12 6l-2.25 2.25" 
        }),
        // Door opening (optional magical element)
        React.createElement('path', { 
            className: "opacity-70",
            strokeLinecap: "round", 
            strokeLinejoin: "round", 
            d: "M9 12.75h.008v.008H9v-.008zm6 0h.008v.008H15v-.008z" 
        })
    )
);


export const SearchPlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement('svg', { 
        xmlns: "http://www.w3.org/2000/svg", 
        fill: "none", 
        viewBox: "0 0 24 24", 
        strokeWidth: 1.5, 
        stroke: "currentColor", 
        className: className 
    },
        React.createElement('path', { 
            strokeLinecap: "round", 
            strokeLinejoin: "round", 
            d: "M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" 
        })
    )
);


export const MapLegendIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement('svg', { 
        xmlns: "http://www.w3.org/2000/svg", 
        fill: "none", 
        viewBox: "0 0 24 24", 
        strokeWidth: 1.5, 
        stroke: "currentColor", 
        className: className 
    },
        React.createElement('path', { 
            strokeLinecap: "round", 
            strokeLinejoin: "round", 
            d: "M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0l-4.994 2.497c-.619.31-.619 1.258 0 1.567l4.994 2.497a1.125 1.125 0 001.006 0l4.994-2.497c.619-.31.619-1.258 0-1.567l-4.994-2.497a1.125 1.125 0 00-1.006 0L3.622 6.22c-.619.31-.619 1.258 0 1.567l4.994 2.497a1.125 1.125 0 001.006 0l1.378-.689V21" 
        })
    )
);
export const AgentsIcon: React.FC<{ className?: string }> = ({ className }) => (
    React.createElement('svg', { 
        xmlns: "http://www.w3.org/2000/svg", 
        fill: "none", 
        viewBox: "0 0 24 24", 
        strokeWidth: 1.5, 
        stroke: "currentColor", 
        className: className 
    },
        // House/Property - can animate (grow, highlight)
        React.createElement('g', { id: "property" },
            React.createElement('path', { 
                d: "M8 14V18M16 14V18M12 10V18M5 20V10L12 5L19 10V20H5Z",
                strokeLinecap: "round",
                strokeLinejoin: "round"
            }),
            React.createElement('path', { 
                id: "roof",
                d: "M5 10L12 5L19 10",
                strokeLinecap: "round",
                strokeLinejoin: "round"
            })
        ),
        // Agent person - can animate (pulse, move)
        React.createElement('g', { id: "agent" },
            React.createElement('circle', {
                cx: "12",
                cy: "9",
                r: "1.5"
            }),
            React.createElement('path', {
                d: "M12 10.5V12M12 12C12 13 11 14 10 14"
            })
        ),
        // Key - can animate (rotate, shine)
        React.createElement('g', { id: "key" },
            React.createElement('circle', {
                cx: "17",
                cy: "15",
                r: "1",
                strokeLinecap: "round"
            }),
            React.createElement('path', {
                d: "M17 16V19M19 17H15",
                strokeLinecap: "round"
            })
        ),
        // Contract/document - can animate (wave, highlight)
        React.createElement('g', { id: "contract" },
            React.createElement('rect', {
                x: "5",
                y: "14",
                width: "3",
                height: "2",
                rx: "0.5"
            }),
            React.createElement('line', {
                x1: "5.5",
                y1: "15",
                x2: "7.5",
                y2: "15"
            })
        )
    )
);