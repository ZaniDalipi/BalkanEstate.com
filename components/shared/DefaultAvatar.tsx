import React from 'react';

interface DefaultAvatarProps {
  gender?: 'male' | 'female' | 'other';
  className?: string;
}

/**
 * Default avatar SVG based on gender.
 * Defaults to male if no gender is specified.
 */
const DefaultAvatar: React.FC<DefaultAvatarProps> = ({ gender, className = 'w-full h-full' }) => {
  const isFemale = gender === 'female';

  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Background circle */}
      <circle cx="100" cy="100" r="100" fill={isFemale ? '#E8D5F5' : '#D5E5F5'} />

      {/* Body/shoulders */}
      <ellipse
        cx="100"
        cy="210"
        rx={isFemale ? 65 : 70}
        ry="60"
        fill={isFemale ? '#C084CF' : '#6B9FD6'}
      />

      {/* Neck */}
      <rect
        x={isFemale ? 85 : 83}
        y="128"
        width={isFemale ? 30 : 34}
        height="30"
        rx="12"
        fill={isFemale ? '#F5D0C5' : '#E8C4A8'}
      />

      {/* Head */}
      <ellipse
        cx="100"
        cy={isFemale ? 95 : 95}
        rx={isFemale ? 38 : 40}
        ry={isFemale ? 42 : 44}
        fill={isFemale ? '#F5D0C5' : '#E8C4A8'}
      />

      {isFemale ? (
        /* Female hair */
        <>
          <ellipse cx="100" cy="72" rx="42" ry="32" fill="#5C3D2E" />
          <ellipse cx="62" cy="90" rx="10" ry="25" fill="#5C3D2E" />
          <ellipse cx="138" cy="90" rx="10" ry="25" fill="#5C3D2E" />
          <ellipse cx="64" cy="110" rx="8" ry="18" fill="#5C3D2E" />
          <ellipse cx="136" cy="110" rx="8" ry="18" fill="#5C3D2E" />
        </>
      ) : (
        /* Male hair */
        <>
          <ellipse cx="100" cy="70" rx="42" ry="26" fill="#4A3728" />
          <rect x="60" y="60" width="80" height="20" rx="8" fill="#4A3728" />
        </>
      )}

      {/* Eyes */}
      <ellipse cx="85" cy="100" rx="4" ry="4.5" fill="#3D3D3D" />
      <ellipse cx="115" cy="100" rx="4" ry="4.5" fill="#3D3D3D" />

      {/* Eye highlights */}
      <circle cx="86.5" cy="98.5" r="1.5" fill="white" />
      <circle cx="116.5" cy="98.5" r="1.5" fill="white" />

      {/* Mouth - slight smile */}
      <path
        d="M90 115 Q100 122 110 115"
        stroke={isFemale ? '#D4736E' : '#C08070'}
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />

      {isFemale && (
        /* Blush */
        <>
          <ellipse cx="75" cy="110" rx="8" ry="5" fill="#F5B0A8" opacity="0.4" />
          <ellipse cx="125" cy="110" rx="8" ry="5" fill="#F5B0A8" opacity="0.4" />
        </>
      )}
    </svg>
  );
};

export default React.memo(DefaultAvatar);
