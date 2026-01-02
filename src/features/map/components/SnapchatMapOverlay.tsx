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

  // Generate random sparkles
  const generateSparkles = useMemo(() => {
    const newSparkles: Sparkle[] = [];
    const sparkleCount = 40; // Number of sparkles

    for (let i = 0; i < sparkleCount; i++) {
      newSparkles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 1, // 1-4px
        duration: Math.random() * 3 + 2, // 2-5s animation
        delay: Math.random() * 5, // 0-5s delay
      });
    }
    return newSparkles;
  }, []);

  useEffect(() => {
    if (enabled) {
      setSparkles(generateSparkles);
    } else {
      setSparkles([]);
    }
  }, [enabled, generateSparkles]);

  if (!enabled) return null;

  return (
    <>
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
            {/* Four-point star sparkle */}
            <svg
              viewBox="0 0 24 24"
              fill="white"
              className="w-full h-full"
              style={{
                filter: 'drop-shadow(0 0 2px rgba(255,255,255,0.8))',
              }}
            >
              <path d="M12 0L14 10L24 12L14 14L12 24L10 14L0 12L10 10L12 0Z" />
            </svg>
          </div>
        ))}
      </div>

      {/* Subtle vignette overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none z-[399]"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,20,0.3) 100%)',
        }}
      />

      {/* Inject CSS animations */}
      <style>{`
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1) rotate(180deg);
          }
        }

        .animate-sparkle {
          animation: sparkle ease-in-out infinite;
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

        /* Enhanced map styling for night mode */
        .leaflet-container.night-mode {
          background: #0a1628;
        }

        .leaflet-container.night-mode .leaflet-tile {
          filter: saturate(1.2) brightness(0.95);
        }

        /* 3D Buildings - Snapchat style with glowing edges */
        .night-mode .osmb-buildings {
          filter: drop-shadow(0 0 4px rgba(0, 150, 255, 0.4));
        }

        /* Building canvas styling */
        .night-mode canvas.osmb {
          filter: contrast(1.1) brightness(0.9);
        }

        /* Add subtle blue glow to building edges */
        @keyframes buildingGlow {
          0%, 100% {
            filter: drop-shadow(0 2px 4px rgba(0, 100, 150, 0.5));
          }
          50% {
            filter: drop-shadow(0 2px 8px rgba(0, 150, 200, 0.7));
          }
        }

        /* Glow effect for drawn rectangles in night mode */
        .night-mode .leaflet-interactive {
          filter: drop-shadow(0 0 8px rgba(0, 200, 255, 0.6));
        }

        /* Night mode rectangle glow */
        .night-mode-rectangle {
          filter: drop-shadow(0 0 10px rgba(0, 255, 255, 0.8)) drop-shadow(0 0 20px rgba(0, 200, 255, 0.5));
        }

        /* Night mode popup styling */
        .night-mode-popup .leaflet-popup-content-wrapper {
          background: rgba(15, 23, 42, 0.95);
          color: #e2e8f0;
          border: 1px solid rgba(0, 255, 255, 0.3);
          box-shadow: 0 0 20px rgba(0, 200, 255, 0.3);
        }

        .night-mode-popup .leaflet-popup-tip {
          background: rgba(15, 23, 42, 0.95);
          border: 1px solid rgba(0, 255, 255, 0.3);
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

        .night-mode-marker-pulse {
          animation: nightGlowPulse 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
};

export default SnapchatMapOverlay;
