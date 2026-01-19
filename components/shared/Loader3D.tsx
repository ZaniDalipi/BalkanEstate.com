import React from 'react';

// Lightweight 3D loader component - extracted for smaller initial bundle
export const Loader3D: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}> = ({ size = 'md', text }) => {
  const sizeMap = {
    sm: { container: 'w-16 h-16', orb: 'w-3 h-3' },
    md: { container: 'w-24 h-24', orb: 'w-4 h-4' },
    lg: { container: 'w-32 h-32', orb: 'w-5 h-5' },
  };

  const { container, orb } = sizeMap[size];

  return (
    <div className="flex flex-col items-center justify-center">
      <div className={`${container} relative`}>
        {/* Central glowing sphere */}
        <div
          className="absolute inset-0 m-auto w-1/2 h-1/2 rounded-full bg-gradient-to-br from-blue-300 via-purple-300 to-pink-300"
          style={{
            boxShadow: `
              0 0 20px rgba(147, 197, 253, 0.5),
              0 0 40px rgba(196, 181, 253, 0.3),
              inset -3px -3px 10px rgba(255, 255, 255, 0.6)
            `,
            animation: 'pulse-glow-center 2s ease-in-out infinite',
          }}
        />

        {/* Orbiting spheres */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute inset-0"
            style={{
              animation: `orbit-3d 2s linear infinite`,
              animationDelay: `${i * 0.67}s`,
            }}
          >
            <div
              className={`${orb} rounded-full absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2`}
              style={{
                background: i === 0
                  ? 'linear-gradient(135deg, #93c5fd, #3b82f6)'
                  : i === 1
                  ? 'linear-gradient(135deg, #c4b5fd, #8b5cf6)'
                  : 'linear-gradient(135deg, #fda4af, #ec4899)',
                boxShadow: `
                  0 2px 8px rgba(0, 0, 0, 0.2),
                  inset -1px -1px 3px rgba(255, 255, 255, 0.4)
                `,
              }}
            />
          </div>
        ))}
      </div>

      {text && (
        <p className="mt-4 text-gray-500 text-sm font-medium animate-pulse">{text}</p>
      )}

      <style>{`
        @keyframes orbit-3d {
          0% {
            transform: rotateX(60deg) rotateZ(0deg);
          }
          100% {
            transform: rotateX(60deg) rotateZ(360deg);
          }
        }

        @keyframes pulse-glow-center {
          0%, 100% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default Loader3D;
