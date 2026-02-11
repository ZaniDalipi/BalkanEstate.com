import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AppleHelloEnglishEffect } from './apple-hello-effect';

/* ------------------------------------------------------------------ */
/*  Logo (matches the app LogoIcon)                                    */
/* ------------------------------------------------------------------ */
const SplashLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <g fillRule="evenodd">
      <path fill="#003A96" d="M12 21V5L10 7V23L12 21Z M4 21V10L2 12V23L4 21Z" />
      <path fill="#0252CD" d="M12 5H20V21H12V5Z M4 10H10V21H4V10Z" />
    </g>
  </svg>
);

/* ------------------------------------------------------------------ */
/*  SplashScreen                                                       */
/* ------------------------------------------------------------------ */
interface SplashScreenProps {
  onComplete: () => void;
  /** Minimum ms the splash stays visible (default 2800) */
  minimumDuration?: number;
}

const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  minimumDuration = 2800,
}) => {
  const [phase, setPhase] = useState<'hello' | 'brand' | 'done'>('hello');
  const [minTimeReached, setMinTimeReached] = useState(false);

  // Minimum display timer — ensures enough time for resources to load behind
  useEffect(() => {
    const timer = setTimeout(() => setMinTimeReached(true), minimumDuration);
    return () => clearTimeout(timer);
  }, [minimumDuration]);

  // When the "hello" animation finishes, move to brand reveal
  const handleHelloComplete = useCallback(() => {
    setPhase('brand');
  }, []);

  // After brand reveal is shown and min time reached, exit
  useEffect(() => {
    if (phase === 'brand' && minTimeReached) {
      const exitTimer = setTimeout(() => setPhase('done'), 800);
      return () => clearTimeout(exitTimer);
    }
  }, [phase, minTimeReached]);

  // Notify parent when fully done
  useEffect(() => {
    if (phase === 'done') {
      const fadeTimer = setTimeout(onComplete, 600);
      return () => clearTimeout(fadeTimer);
    }
  }, [phase, onComplete]);

  // Respect reduced-motion preference
  const [prefersReduced, setPrefersReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReduced(mq.matches);
    if (mq.matches) {
      // Skip animation entirely for users who prefer reduced motion
      const t = setTimeout(onComplete, 400);
      return () => clearTimeout(t);
    }
  }, [onComplete]);

  if (prefersReduced) {
    return null;
  }

  return (
    <AnimatePresence>
      {phase !== 'done' ? (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden"
          style={{
            background:
              'linear-gradient(145deg, #0a0f1e 0%, #0d1528 35%, #101b32 65%, #0a0f1e 100%)',
          }}
        >
          {/* Ambient glow effects */}
          <div
            className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] sm:w-[700px] sm:h-[700px] rounded-full opacity-20 blur-3xl pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(2,82,205,0.3) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] sm:w-[400px] sm:h-[400px] rounded-full opacity-15 blur-3xl pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
            }}
          />

          {/* Content container — responsive sizing */}
          <div className="relative z-10 flex flex-col items-center justify-center px-6 w-full max-w-lg sm:max-w-xl md:max-w-2xl">
            {/* Phase 1: Hello animation */}
            <AnimatePresence mode="wait">
              {phase === 'hello' && (
                <motion.div
                  key="hello-phase"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="flex flex-col items-center"
                >
                  <AppleHelloEnglishEffect
                    className="h-14 sm:h-20 md:h-24 text-white w-auto"
                    speed={1.1}
                    onAnimationComplete={handleHelloComplete}
                  />
                </motion.div>
              )}

              {/* Phase 2: Brand reveal */}
              {phase === 'brand' && (
                <motion.div
                  key="brand-phase"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center gap-5 sm:gap-6"
                >
                  {/* Logo */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      duration: 0.5,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.1,
                    }}
                    className="p-4 sm:p-5 rounded-3xl border border-white/10"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
                      boxShadow:
                        '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.1)',
                    }}
                  >
                    <SplashLogo className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20" />
                  </motion.div>

                  {/* App Name */}
                  <motion.h1
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
                    className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-center"
                  >
                    <span className="text-white">Balkan</span>
                    <span className="text-blue-400">Estate</span>
                    <span className="text-white/30 font-medium">.AI</span>
                  </motion.h1>

                  {/* Tagline */}
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.35, ease: 'easeOut' }}
                    className="text-sm sm:text-base md:text-lg text-white/40 font-light text-center max-w-xs sm:max-w-sm"
                  >
                    AI-powered property search across the Balkans
                  </motion.p>

                  {/* Subtle loading indicator */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                    className="mt-4 sm:mt-6"
                  >
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((i) => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-white/30"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1.2,
                            repeat: Infinity,
                            delay: i * 0.2,
                            ease: 'easeInOut',
                          }}
                        />
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom text */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="absolute bottom-6 sm:bottom-8 text-[10px] sm:text-xs text-white/20 tracking-widest uppercase"
          >
            11 countries &bull; 50+ cities
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default SplashScreen;
