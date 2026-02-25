import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ListingProgressModalProps {
  isOpen: boolean;
  isCompressing: boolean;
  isUploading: boolean;
  isSubmitting: boolean;
  uploadProgress: number;
}

// Animated house SVG that "builds up" as progress advances
const AnimatedHouse: React.FC<{ phase: number }> = ({ phase }) => (
  <svg viewBox="0 0 120 120" className="w-full h-full" fill="none">
    {/* Foundation - always visible */}
    <rect x="20" y="95" width="80" height="8" rx="2" fill="#94a3b8"
      className="animate-[fadeIn_0.3s_ease-out]" />
    {/* Walls - phase 1+ */}
    {phase >= 1 && (
      <rect x="25" y="45" width="70" height="50" rx="3" fill="#e2e8f0"
        stroke="#cbd5e1" strokeWidth="1.5"
        style={{ animation: 'slideInUp 0.5s ease-out' }} />
    )}
    {/* Door - phase 2+ */}
    {phase >= 2 && (
      <g style={{ animation: 'scaleIn 0.4s ease-out' }}>
        <rect x="50" y="68" width="20" height="27" rx="2" fill="#3b82f6" />
        <circle cx="66" cy="82" r="1.5" fill="#fbbf24" />
      </g>
    )}
    {/* Windows - phase 2+ */}
    {phase >= 2 && (
      <g style={{ animation: 'scaleIn 0.4s ease-out 0.15s both' }}>
        <rect x="32" y="55" width="14" height="14" rx="2" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1" />
        <line x1="39" y1="55" x2="39" y2="69" stroke="#93c5fd" strokeWidth="0.8" />
        <line x1="32" y1="62" x2="46" y2="62" stroke="#93c5fd" strokeWidth="0.8" />
        <rect x="74" y="55" width="14" height="14" rx="2" fill="#bfdbfe" stroke="#93c5fd" strokeWidth="1" />
        <line x1="81" y1="55" x2="81" y2="69" stroke="#93c5fd" strokeWidth="0.8" />
        <line x1="74" y1="62" x2="88" y2="62" stroke="#93c5fd" strokeWidth="0.8" />
      </g>
    )}
    {/* Roof - phase 3+ */}
    {phase >= 3 && (
      <polygon points="60,15 15,48 105,48" fill="#f97316" stroke="#ea580c" strokeWidth="1.5"
        style={{ animation: 'slideInDown 0.5s ease-out' }} />
    )}
    {/* Chimney + smoke - phase 4 */}
    {phase >= 4 && (
      <g style={{ animation: 'fadeIn 0.4s ease-out' }}>
        <rect x="78" y="18" width="10" height="22" rx="1.5" fill="#78716c" />
        {/* Smoke puffs */}
        <circle cx="83" cy="12" r="3" fill="#d1d5db" opacity="0.6"
          style={{ animation: 'float 3s ease-in-out infinite' }} />
        <circle cx="87" cy="6" r="2.5" fill="#e5e7eb" opacity="0.4"
          style={{ animation: 'float 3s ease-in-out infinite 0.5s' }} />
        <circle cx="81" cy="2" r="2" fill="#f3f4f6" opacity="0.3"
          style={{ animation: 'float 3s ease-in-out infinite 1s' }} />
      </g>
    )}
    {/* Sparkles on completion */}
    {phase >= 4 && (
      <g>
        <circle cx="18" cy="30" r="2" fill="#fbbf24"
          style={{ animation: 'ping 1.5s ease-in-out infinite' }} />
        <circle cx="102" cy="25" r="1.5" fill="#fbbf24"
          style={{ animation: 'ping 1.5s ease-in-out infinite 0.3s' }} />
        <circle cx="12" cy="60" r="1.5" fill="#a78bfa"
          style={{ animation: 'ping 1.5s ease-in-out infinite 0.7s' }} />
        <circle cx="108" cy="65" r="2" fill="#34d399"
          style={{ animation: 'ping 1.5s ease-in-out infinite 1.1s' }} />
      </g>
    )}
  </svg>
);

// Cooking step indicator
interface StepItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  done: boolean;
}

const ProgressStep: React.FC<{ step: StepItem; index: number }> = ({ step, index }) => (
  <div
    className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-500 ${
      step.active ? 'bg-blue-50 scale-[1.02]' : step.done ? 'opacity-60' : 'opacity-30'
    }`}
    style={{ animation: `slideInLeft 0.4s ease-out ${index * 0.1}s both` }}
  >
    <div className={`relative w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-500 ${
      step.done ? 'bg-green-100 text-green-600' : step.active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
    }`}>
      {step.done ? (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : step.active ? (
        <div className="w-4 h-4">
          {step.icon}
          <div className="absolute inset-0 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="w-4 h-4 text-gray-400">
          {step.icon}
        </div>
      )}
    </div>
    <span className={`text-sm font-medium transition-colors duration-300 ${
      step.done ? 'text-green-700' : step.active ? 'text-blue-800 font-semibold' : 'text-gray-400'
    }`}>
      {step.label}
    </span>
  </div>
);

const ListingProgressModal: React.FC<ListingProgressModalProps> = ({
  isOpen,
  isCompressing,
  isUploading,
  isSubmitting,
  uploadProgress,
}) => {
  const { t } = useTranslation(['seller']);
  const [dots, setDots] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number>(Date.now());

  // Animate dots
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Track elapsed time
  useEffect(() => {
    if (!isOpen) {
      setElapsedTime(0);
      startTimeRef.current = Date.now();
      return;
    }
    startTimeRef.current = Date.now();
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  // Determine current phase for house animation
  let housePhase = 0;
  if (isCompressing) housePhase = 1;
  else if (isUploading && uploadProgress < 50) housePhase = 2;
  else if (isUploading && uploadProgress >= 50) housePhase = 3;
  else if (isSubmitting) housePhase = 4;

  // Calculate overall progress
  let overallProgress = 0;
  if (isCompressing) {
    overallProgress = 15;
  } else if (isUploading) {
    overallProgress = 20 + (uploadProgress * 0.5); // 20-70%
  } else if (isSubmitting) {
    overallProgress = 80;
  }

  // Current status headline
  let headline = t('seller:createListing.progress.compressing', 'Compressing images...');
  let subtitle = t('seller:createListing.progress.compressingHint', 'Optimizing your images for the best quality...');
  if (isUploading) {
    headline = t('seller:createListing.progress.uploading', 'Uploading to cloud...');
    subtitle = t('seller:createListing.progress.uploadingHint', 'Securely uploading your photos...');
  } else if (isSubmitting && !isUploading && !isCompressing) {
    headline = t('seller:createListing.progress.creating', 'Creating listing...');
    subtitle = t('seller:createListing.progress.creatingHint', 'Almost there! Saving your listing...');
  }

  const steps: StepItem[] = [
    {
      key: 'compress',
      label: t('seller:createListing.progress.compressing', 'Compressing images...'),
      icon: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>,
      active: isCompressing,
      done: !isCompressing && (isUploading || isSubmitting),
    },
    {
      key: 'upload',
      label: t('seller:createListing.progress.uploading', 'Uploading to cloud...'),
      icon: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>,
      active: isUploading,
      done: !isUploading && !isCompressing && isSubmitting,
    },
    {
      key: 'distances',
      label: t('seller:createListing.progress.distances', 'Calculating distances...'),
      icon: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>,
      active: isSubmitting && !isUploading && !isCompressing,
      done: false,
    },
    {
      key: 'publish',
      label: t('seller:createListing.progress.publishing', 'Publishing listing...'),
      icon: <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21" /></svg>,
      active: false,
      done: false,
    },
  ];

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(15,23,42,0.85), rgba(2,6,23,0.95))',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: 'fadeIn 0.3s ease-out',
      }}
    >
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-72 h-72 rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, #3b82f6, transparent 70%)',
            top: '-5%', left: '-5%',
            animation: 'float 8s ease-in-out infinite',
          }} />
        <div className="absolute w-96 h-96 rounded-full opacity-15"
          style={{
            background: 'radial-gradient(circle, #8b5cf6, transparent 70%)',
            bottom: '-10%', right: '-10%',
            animation: 'float 10s ease-in-out infinite 2s',
          }} />
        <div className="absolute w-48 h-48 rounded-full opacity-10"
          style={{
            background: 'radial-gradient(circle, #06b6d4, transparent 70%)',
            top: '30%', right: '15%',
            animation: 'float 6s ease-in-out infinite 4s',
          }} />
      </div>

      {/* Main modal card */}
      <div
        className="relative w-full max-w-md mx-4 rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04))',
          border: '1px solid rgba(255,255,255,0.15)',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
          animation: 'scaleIn 0.4s ease-out',
        }}
      >
        {/* Top glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />

        <div className="p-6 sm:p-8">
          {/* House animation */}
          <div className="w-28 h-28 mx-auto mb-5">
            <AnimatedHouse phase={housePhase} />
          </div>

          {/* Headline */}
          <h2 className="text-xl font-bold text-white text-center mb-1"
            style={{ animation: 'fadeIn 0.4s ease-out 0.2s both' }}>
            {headline.replace('...', '')}{dots}
          </h2>
          <p className="text-sm text-white/50 text-center mb-6"
            style={{ animation: 'fadeIn 0.4s ease-out 0.3s both' }}>
            {subtitle}
          </p>

          {/* Overall progress bar */}
          <div className="relative w-full h-2 rounded-full overflow-hidden mb-6"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${Math.max(5, overallProgress)}%`,
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6, #06b6d4)',
                boxShadow: '0 0 12px rgba(99,102,241,0.5)',
              }}
            />
            {/* Shimmer overlay */}
            <div className="absolute inset-0 rounded-full"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                animation: 'shimmer 1.5s ease-in-out infinite',
              }} />
          </div>

          {/* Upload progress detail */}
          {isUploading && (
            <div className="flex items-center justify-between text-xs text-white/40 mb-5 px-1"
              style={{ animation: 'fadeIn 0.3s ease-out' }}>
              <span>{Math.round(uploadProgress)}%</span>
              <span>{formatTime(elapsedTime)}</span>
            </div>
          )}

          {/* Step checklist */}
          <div className="space-y-1 mb-4">
            {steps.map((step, i) => (
              <ProgressStep key={step.key} step={step} index={i} />
            ))}
          </div>

          {/* Fun cooking message */}
          <div className="text-center pt-3 border-t border-white/5">
            <p className="text-xs text-white/30 italic">
              {t('seller:createListing.progress.cookingMsg', 'We\'re cooking up something great for you!')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingProgressModal;
