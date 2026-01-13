import React from 'react';

// Soft pastel color palette inspired by modern 3D illustrations
const PASTEL_COLORS = {
  blue: {
    light: '#a5c4e8',
    medium: '#7ba3d6',
    dark: '#5b82b8',
  },
  pink: {
    light: '#f0d4e8',
    medium: '#e8b4d4',
    dark: '#d494bc',
  },
  purple: {
    light: '#d4c4f0',
    medium: '#b4a4e0',
    dark: '#9484c8',
  },
  peach: {
    light: '#f8e4d8',
    medium: '#f0c8b4',
    dark: '#e8ac94',
  },
};

interface DecorativeProps {
  className?: string;
  variant?: 'default' | 'minimal' | 'hero';
}

// Abstract blob shape
export const Blob3D: React.FC<{ color?: 'blue' | 'pink' | 'purple' | 'peach'; size?: number; className?: string }> = ({
  color = 'blue',
  size = 120,
  className = '',
}) => {
  const colors = PASTEL_COLORS[color];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }}
    >
      <defs>
        <linearGradient id={`blob-gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.light} />
          <stop offset="50%" stopColor={colors.medium} />
          <stop offset="100%" stopColor={colors.dark} />
        </linearGradient>
      </defs>
      <path
        d="M45.3,-62.4C57.7,-52.5,66.1,-37.8,71.3,-21.7C76.5,-5.6,78.5,11.9,73.2,27.3C67.9,42.7,55.3,56,40.5,64.5C25.7,73,8.7,76.7,-8.4,76.1C-25.5,75.5,-42.7,70.6,-55.8,60.1C-68.9,49.6,-77.8,33.5,-80.7,16.4C-83.6,-0.7,-80.5,-18.8,-72,-33.9C-63.5,-49,-49.6,-61.1,-34.8,-69.8C-20,-78.5,-4.3,-83.8,9.4,-80.1C23.1,-76.4,32.8,-72.2,45.3,-62.4Z"
        transform="translate(100 100)"
        fill={`url(#blob-gradient-${color})`}
      />
    </svg>
  );
};

// Sphere with 3D gradient
export const Sphere3D: React.FC<{ color?: 'blue' | 'pink' | 'purple' | 'peach'; size?: number; className?: string }> = ({
  color = 'purple',
  size = 80,
  className = '',
}) => {
  const colors = PASTEL_COLORS[color];
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(circle at 30% 30%, ${colors.light}, ${colors.medium} 50%, ${colors.dark})`,
        boxShadow: `
          0 ${size / 4}px ${size / 2}px rgba(0,0,0,0.15),
          inset 0 -${size / 8}px ${size / 4}px rgba(0,0,0,0.1),
          inset 0 ${size / 8}px ${size / 4}px rgba(255,255,255,0.3)
        `,
      }}
    />
  );
};

// Pill/Cylinder shape
export const Pill3D: React.FC<{ color?: 'blue' | 'pink' | 'purple' | 'peach'; width?: number; height?: number; className?: string }> = ({
  color = 'pink',
  width = 40,
  height = 100,
  className = '',
}) => {
  const colors = PASTEL_COLORS[color];
  return (
    <div
      className={className}
      style={{
        width,
        height,
        borderRadius: width / 2,
        background: `linear-gradient(90deg, ${colors.dark} 0%, ${colors.medium} 30%, ${colors.light} 60%, ${colors.medium} 100%)`,
        boxShadow: `0 10px 30px rgba(0,0,0,0.15)`,
      }}
    />
  );
};

// Cone shape
export const Cone3D: React.FC<{ color?: 'blue' | 'pink' | 'purple' | 'peach'; size?: number; className?: string }> = ({
  color = 'peach',
  size = 80,
  className = '',
}) => {
  const colors = PASTEL_COLORS[color];
  return (
    <div
      className={className}
      style={{
        width: 0,
        height: 0,
        borderLeft: `${size / 2}px solid transparent`,
        borderRight: `${size / 2}px solid transparent`,
        borderBottom: `${size}px solid ${colors.medium}`,
        filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.15))',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: size,
          left: -size / 2,
          width: size,
          height: size / 4,
          borderRadius: '50%',
          background: `linear-gradient(90deg, ${colors.dark}, ${colors.medium})`,
        }}
      />
    </div>
  );
};

// Torus/Ring shape
export const Ring3D: React.FC<{ color?: 'blue' | 'pink' | 'purple' | 'peach'; size?: number; className?: string }> = ({
  color = 'blue',
  size = 100,
  className = '',
}) => {
  const colors = PASTEL_COLORS[color];
  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `${size / 5}px solid ${colors.medium}`,
        background: 'transparent',
        boxShadow: `
          0 ${size / 8}px ${size / 4}px rgba(0,0,0,0.15),
          inset 0 ${size / 10}px ${size / 5}px rgba(255,255,255,0.3),
          inset 0 -${size / 10}px ${size / 5}px rgba(0,0,0,0.1)
        `,
        backgroundImage: `linear-gradient(135deg, ${colors.light} 0%, ${colors.dark} 100%)`,
        WebkitBackgroundClip: 'padding-box',
        backgroundClip: 'padding-box',
      }}
    />
  );
};

// Wave shape
export const Wave3D: React.FC<{ color?: 'blue' | 'pink' | 'purple' | 'peach'; width?: number; className?: string }> = ({
  color = 'purple',
  width = 200,
  className = '',
}) => {
  const colors = PASTEL_COLORS[color];
  return (
    <svg
      width={width}
      height={width * 0.5}
      viewBox="0 0 200 100"
      className={className}
      style={{ filter: 'drop-shadow(0 5px 15px rgba(0,0,0,0.1))' }}
    >
      <defs>
        <linearGradient id={`wave-gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors.light} stopOpacity="0.8" />
          <stop offset="100%" stopColor={colors.dark} stopOpacity="0.6" />
        </linearGradient>
      </defs>
      <path
        d="M0,50 Q25,20 50,50 T100,50 T150,50 T200,50 V100 H0 Z"
        fill={`url(#wave-gradient-${color})`}
      />
      <path
        d="M0,60 Q25,30 50,60 T100,60 T150,60 T200,60 V100 H0 Z"
        fill={colors.medium}
        opacity="0.5"
      />
    </svg>
  );
};

// Floating dots decoration
export const FloatingDots: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <Sphere3D color="blue" size={20} className="absolute top-[10%] left-[15%] opacity-60" />
      <Sphere3D color="pink" size={12} className="absolute top-[25%] right-[20%] opacity-50" />
      <Sphere3D color="purple" size={16} className="absolute bottom-[30%] left-[10%] opacity-40" />
      <Sphere3D color="peach" size={14} className="absolute bottom-[15%] right-[15%] opacity-50" />
      <Sphere3D color="blue" size={10} className="absolute top-[50%] left-[80%] opacity-30" />
      <Sphere3D color="pink" size={8} className="absolute top-[70%] left-[40%] opacity-40" />
    </div>
  );
};

// Composition for empty states
export const EmptyStateDecoration: React.FC<DecorativeProps> = ({ className = '', variant = 'default' }) => {
  if (variant === 'minimal') {
    return (
      <div className={`relative ${className}`}>
        <Sphere3D color="blue" size={60} className="absolute -top-8 -right-4 opacity-70" />
        <Sphere3D color="pink" size={30} className="absolute -bottom-4 -left-6 opacity-60" />
      </div>
    );
  }

  return (
    <div className={`relative w-48 h-48 mx-auto ${className}`}>
      {/* Main blob */}
      <Blob3D color="blue" size={160} className="absolute top-0 left-0 opacity-80" />
      {/* Sphere */}
      <Sphere3D color="pink" size={50} className="absolute bottom-4 right-0" />
      {/* Small sphere */}
      <Sphere3D color="purple" size={25} className="absolute top-4 right-8 opacity-70" />
      {/* Pill */}
      <Pill3D color="peach" width={20} height={50} className="absolute bottom-8 left-4 transform rotate-[-20deg] opacity-60" />
    </div>
  );
};

// Hero section decoration
export const HeroDecoration: React.FC<DecorativeProps> = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Large blob top right */}
      <div className="absolute -top-20 -right-20 opacity-20">
        <Blob3D color="pink" size={300} />
      </div>
      {/* Spheres scattered */}
      <Sphere3D color="blue" size={80} className="absolute top-[20%] left-[5%] opacity-30" />
      <Sphere3D color="purple" size={40} className="absolute bottom-[30%] right-[10%] opacity-25" />
      <Sphere3D color="peach" size={60} className="absolute bottom-[10%] left-[20%] opacity-20" />
      {/* Pills */}
      <Pill3D color="blue" width={30} height={80} className="absolute top-[40%] right-[5%] transform rotate-[30deg] opacity-20" />
      <Pill3D color="pink" width={25} height={60} className="absolute bottom-[20%] left-[8%] transform rotate-[-15deg] opacity-15" />
      {/* Wave at bottom */}
      <div className="absolute bottom-0 left-0 w-full opacity-10">
        <Wave3D color="purple" width={400} />
      </div>
    </div>
  );
};

// Background decoration for pages
export const PageBackgroundDecoration: React.FC<{ position?: 'left' | 'right' | 'both'; className?: string }> = ({
  position = 'both',
  className = '',
}) => {
  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden -z-10 ${className}`}>
      {(position === 'left' || position === 'both') && (
        <>
          <div className="absolute -top-40 -left-40 opacity-10">
            <Blob3D color="blue" size={400} />
          </div>
          <Sphere3D color="pink" size={100} className="absolute top-1/4 -left-10 opacity-10" />
          <Sphere3D color="purple" size={60} className="absolute bottom-1/3 left-20 opacity-8" />
        </>
      )}
      {(position === 'right' || position === 'both') && (
        <>
          <div className="absolute -bottom-40 -right-40 opacity-10">
            <Blob3D color="purple" size={400} />
          </div>
          <Sphere3D color="peach" size={80} className="absolute top-1/3 -right-10 opacity-10" />
          <Sphere3D color="blue" size={50} className="absolute bottom-1/4 right-20 opacity-8" />
        </>
      )}
    </div>
  );
};

// Small decorative element for cards
export const CardDecoration: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`absolute -top-3 -right-3 ${className}`}>
      <Sphere3D color="blue" size={24} className="opacity-60" />
      <Sphere3D color="pink" size={12} className="absolute -bottom-2 -left-4 opacity-50" />
    </div>
  );
};

export default {
  Blob3D,
  Sphere3D,
  Pill3D,
  Cone3D,
  Ring3D,
  Wave3D,
  FloatingDots,
  EmptyStateDecoration,
  HeroDecoration,
  PageBackgroundDecoration,
  CardDecoration,
};
