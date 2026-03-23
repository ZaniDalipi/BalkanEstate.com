import React, { useRef, useCallback } from 'react';

interface MagneticTiltCardProps {
  children: React.ReactNode;
  className?: string;
  tiltMax?: number;
  glareOpacity?: number;
}

const MagneticTiltCard: React.FC<MagneticTiltCardProps> = ({
  children,
  className = '',
  tiltMax = 8,
  glareOpacity = 0.15,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    const glare = glareRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -tiltMax;
    const rotateY = ((x - centerX) / centerX) * tiltMax;

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    card.style.transition = 'transform 0.1s ease-out';

    if (glare) {
      const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI) + 180;
      glare.style.opacity = String(glareOpacity);
      glare.style.background = `linear-gradient(${angle}deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 60%)`;
    }
  }, [tiltMax, glareOpacity]);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    const glare = glareRef.current;
    if (card) {
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      card.style.transition = 'transform 0.4s ease-out';
    }
    if (glare) {
      glare.style.opacity = '0';
      glare.style.transition = 'opacity 0.4s ease-out';
    }
  }, []);

  return (
    <div
      ref={cardRef}
      className={`relative ${className}`}
      style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {/* Spotlight glare overlay */}
      <div
        ref={glareRef}
        className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl z-20"
        style={{ opacity: 0, transition: 'opacity 0.15s ease-out' }}
      />
    </div>
  );
};

export default MagneticTiltCard;
