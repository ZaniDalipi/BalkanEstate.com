import React, { useRef, useCallback, useState } from 'react';

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
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [glareStyle, setGlareStyle] = useState<React.CSSProperties>({ opacity: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -tiltMax;
    const rotateY = ((x - centerX) / centerX) * tiltMax;

    setStyle({
      transform: `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: 'transform 0.1s ease-out',
    });

    // Spotlight glare follows cursor
    const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI) + 180;
    setGlareStyle({
      opacity: glareOpacity,
      background: `linear-gradient(${angle}deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 60%)`,
      transition: 'opacity 0.15s ease-out',
    });
  }, [tiltMax, glareOpacity]);

  const handleMouseLeave = useCallback(() => {
    setStyle({
      transform: 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.4s ease-out',
    });
    setGlareStyle({ opacity: 0, transition: 'opacity 0.4s ease-out' });
  }, []);

  return (
    <div
      ref={cardRef}
      className={`relative ${className}`}
      style={{ ...style, transformStyle: 'preserve-3d' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {/* Spotlight glare overlay */}
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl sm:rounded-3xl z-20"
        style={glareStyle}
      />
    </div>
  );
};

export default MagneticTiltCard;
