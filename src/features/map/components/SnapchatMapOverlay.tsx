// SnapchatMapOverlay Component
// Adds Snapchat-style visual effects to the map in Night Mode

import React, { useEffect, useState, useMemo } from 'react';

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
  type: 'star' | 'circle' | 'diamond';
}

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface SnapchatMapOverlayProps {
  enabled: boolean;
}

/**
 * SnapchatMapOverlay Component
 *
 * Adds Snapchat Snap Map-style visual effects:
 * - Animated sparkle/star effects scattered across the map
 * - Subtle glow overlay
 * - Creates the magical nighttime atmosphere
 */
const SnapchatMapOverlay: React.FC<SnapchatMapOverlayProps> = ({ enabled }) => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [particles, setParticles] = useState<FloatingParticle[]>([]);

  // Sparkle colors for variety
  const sparkleColors = [
    'rgba(255, 255, 255, 0.9)',      // White
    'rgba(0, 220, 255, 0.85)',        // Cyan
    'rgba(120, 200, 255, 0.8)',       // Light blue
    'rgba(180, 220, 255, 0.85)',      // Ice blue
    'rgba(255, 200, 100, 0.7)',       // Warm gold (rare)
  ];

  const sparkleTypes: ('star' | 'circle' | 'diamond')[] = ['star', 'star', 'star', 'circle', 'diamond'];

  // Generate random sparkles with colors and types
  const generateSparkles = useMemo(() => {
    const newSparkles: Sparkle[] = [];
    const sparkleCount = 35; // Slightly fewer but more varied sparkles

    for (let i = 0; i < sparkleCount; i++) {
      newSparkles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2, // 2-6px
        duration: Math.random() * 4 + 3, // 3-7s animation
        delay: Math.random() * 8, // 0-8s delay
        color: sparkleColors[Math.floor(Math.random() * sparkleColors.length)],
        type: sparkleTypes[Math.floor(Math.random() * sparkleTypes.length)],
      });
    }
    return newSparkles;
  }, []);

  // Generate floating ambient particles
  const generateParticles = useMemo(() => {
    const newParticles: FloatingParticle[] = [];
    const particleCount = 20;

    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1, // 1-4px
        duration: Math.random() * 15 + 10, // 10-25s slow drift
        delay: Math.random() * 10,
        opacity: Math.random() * 0.3 + 0.1, // 0.1-0.4 opacity
      });
    }
    return newParticles;
  }, []);

  useEffect(() => {
    if (enabled) {
      setSparkles(generateSparkles);
      setParticles(generateParticles);
    } else {
      setSparkles([]);
      setParticles([]);
    }
  }, [enabled, generateSparkles, generateParticles]);

  if (!enabled) return null;

  // Render sparkle based on type
  const renderSparkle = (sparkle: Sparkle) => {
    const shadowColor = sparkle.color.replace(/[\d.]+\)$/, '0.6)');

    switch (sparkle.type) {
      case 'circle':
        return (
          <div
            className="w-full h-full rounded-full"
            style={{
              background: sparkle.color,
              boxShadow: `0 0 ${sparkle.size}px ${shadowColor}`,
            }}
          />
        );
      case 'diamond':
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full" style={{ filter: `drop-shadow(0 0 3px ${shadowColor})` }}>
            <path d="M12 2L22 12L12 22L2 12L12 2Z" fill={sparkle.color} />
          </svg>
        );
      default: // star
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full" style={{ filter: `drop-shadow(0 0 3px ${shadowColor})` }}>
            <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" fill={sparkle.color} />
          </svg>
        );
    }
  };

  return (
    <>
      {/* Floating ambient particles */}
      <div className="absolute inset-0 pointer-events-none z-[398] overflow-hidden">
        {particles.map((particle) => (
          <div
            key={`particle-${particle.id}`}
            className="absolute animate-float rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: `rgba(100, 180, 255, ${particle.opacity})`,
              boxShadow: `0 0 ${particle.size * 2}px rgba(100, 180, 255, ${particle.opacity * 0.5})`,
              animationDuration: `${particle.duration}s`,
              animationDelay: `${particle.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Sparkle Container */}
      <div className="absolute inset-0 pointer-events-none z-[400] overflow-hidden">
        {sparkles.map((sparkle) => (
          <div
            key={sparkle.id}
            className="absolute animate-sparkle"
            style={{
              left: `${sparkle.x}%`,
              top: `${sparkle.y}%`,
              width: `${sparkle.size}px`,
              height: `${sparkle.size}px`,
              animationDuration: `${sparkle.duration}s`,
              animationDelay: `${sparkle.delay}s`,
            }}
          >
            {renderSparkle(sparkle)}
          </div>
        ))}
      </div>

      {/* Atmospheric gradient overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none z-[399]"
        style={{
          background: `
            radial-gradient(ellipse at center, transparent 30%, rgba(0, 10, 30, 0.25) 100%),
            linear-gradient(to bottom, rgba(0, 20, 50, 0.1) 0%, transparent 30%, transparent 70%, rgba(0, 10, 30, 0.15) 100%)
          `,
        }}
      />

      {/* Inject CSS animations */}
      <style>{`
        /* Sparkle animation - twinkling stars */
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          25% {
            opacity: 0.5;
            transform: scale(0.5) rotate(90deg);
          }
          50% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
          75% {
            opacity: 0.5;
            transform: scale(0.5) rotate(270deg);
          }
        }

        .animate-sparkle {
          animation: sparkle ease-in-out infinite;
        }

        /* Floating particle animation - ambient drift */
        @keyframes float {
          0% {
            transform: translate(0, 0) scale(1);
            opacity: var(--particle-opacity, 0.2);
          }
          25% {
            transform: translate(10px, -15px) scale(1.1);
            opacity: calc(var(--particle-opacity, 0.2) * 1.2);
          }
          50% {
            transform: translate(20px, -5px) scale(1);
            opacity: var(--particle-opacity, 0.2);
          }
          75% {
            transform: translate(10px, 10px) scale(0.9);
            opacity: calc(var(--particle-opacity, 0.2) * 0.8);
          }
          100% {
            transform: translate(0, 0) scale(1);
            opacity: var(--particle-opacity, 0.2);
          }
        }

        .animate-float {
          animation: float linear infinite;
        }

        /* Snapchat-style neon glow for night mode markers */
        .night-mode-marker {
          filter: drop-shadow(0 0 8px rgba(0, 200, 255, 0.8)) drop-shadow(0 0 20px rgba(0, 150, 255, 0.4));
        }

        /* Pulsing glow animation for markers */
        @keyframes neonPulse {
          0%, 100% {
            filter: drop-shadow(0 0 6px rgba(0, 200, 255, 0.6)) drop-shadow(0 0 12px rgba(0, 150, 255, 0.3));
          }
          50% {
            filter: drop-shadow(0 0 12px rgba(0, 220, 255, 0.9)) drop-shadow(0 0 25px rgba(0, 180, 255, 0.5));
          }
        }

        .night-mode-marker-pulse {
          animation: neonPulse 2s ease-in-out infinite;
        }

        /* Smooth day/night transition */
        .leaflet-container {
          transition: background-color 0.5s ease-in-out;
        }

        .leaflet-container .leaflet-tile-pane {
          transition: filter 0.5s ease-in-out;
        }

        /* Enhanced map styling for night mode */
        .leaflet-container.night-mode {
          background: #0a1628;
        }

        .leaflet-container.night-mode .leaflet-tile {
          filter: saturate(1.2) brightness(0.95);
        }

        /* 3D Buildings - cleaner look without heavy glow */
        .night-mode .osmb-buildings {
          filter: none;
        }

        /* Building canvas styling - brighter for better visibility */
        .night-mode canvas.osmb {
          filter: contrast(1.15) brightness(1.1) saturate(1.1);
          transition: filter 0.3s ease;
        }

        /* Subtle edge enhancement for buildings */
        @keyframes buildingGlow {
          0%, 100% {
            filter: drop-shadow(0 1px 2px rgba(0, 100, 150, 0.3));
          }
          50% {
            filter: drop-shadow(0 1px 3px rgba(0, 120, 160, 0.4));
          }
        }

        /* Road glow effect for night mode */
        .night-mode .leaflet-overlay-pane svg path {
          filter: drop-shadow(0 0 3px rgba(80, 150, 200, 0.4));
        }

        /* Glow effect for drawn rectangles in night mode */
        .night-mode .leaflet-interactive {
          filter: drop-shadow(0 0 8px rgba(0, 200, 255, 0.6));
          transition: filter 0.3s ease;
        }

        /* Night mode rectangle glow */
        .night-mode-rectangle {
          filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.8)) drop-shadow(0 0 20px rgba(0, 200, 255, 0.5));
        }

        /* Night mode popup styling with glassmorphism */
        .night-mode-popup .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.92);
          backdrop-filter: blur(8px);
          color: #e2e8f0;
          border: 1px solid rgba(0, 255, 255, 0.25);
          box-shadow:
            0 0 20px rgba(0, 200, 255, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.05);
          border-radius: 12px;
        }

        .night-mode-popup .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.92);
          border: 1px solid rgba(0, 255, 255, 0.25);
        }

        /* Pulsing glow animation for night mode markers */
        @keyframes nightGlowPulse {
          0%, 100% {
            filter: drop-shadow(0 0 6px rgba(0, 255, 255, 0.6)) drop-shadow(0 0 12px rgba(0, 200, 255, 0.3));
          }
          50% {
            filter: drop-shadow(0 0 12px rgba(0, 255, 255, 0.9)) drop-shadow(0 0 25px rgba(0, 200, 255, 0.6));
          }
        }

        /* Property type marker color variations in night mode */
        .night-marker-house {
          filter: drop-shadow(0 0 8px rgba(0, 200, 255, 0.8)) drop-shadow(0 0 16px rgba(0, 150, 255, 0.4));
        }

        .night-marker-apartment {
          filter: drop-shadow(0 0 8px rgba(150, 100, 255, 0.8)) drop-shadow(0 0 16px rgba(120, 80, 255, 0.4));
        }

        .night-marker-villa {
          filter: drop-shadow(0 0 8px rgba(255, 180, 50, 0.8)) drop-shadow(0 0 16px rgba(255, 150, 30, 0.4));
        }

        .night-marker-land {
          filter: drop-shadow(0 0 8px rgba(50, 255, 150, 0.8)) drop-shadow(0 0 16px rgba(30, 200, 120, 0.4));
        }

        /* Legend styling for night mode */
        .night-mode-legend {
          background: rgba(15, 23, 42, 0.9);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(0, 200, 255, 0.2);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        /* Control buttons night mode styling */
        .night-mode .leaflet-control-zoom a,
        .night-mode .leaflet-control a {
          background: rgba(15, 23, 42, 0.9) !important;
          color: #e2e8f0 !important;
          border-color: rgba(0, 200, 255, 0.3) !important;
        }

        .night-mode .leaflet-control-zoom a:hover,
        .night-mode .leaflet-control a:hover {
          background: rgba(25, 35, 55, 0.95) !important;
          box-shadow: 0 0 10px rgba(0, 200, 255, 0.3);
        }

        .night-mode-marker-pulse {
          animation: nightGlowPulse 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default SnapchatMapOverlay;
