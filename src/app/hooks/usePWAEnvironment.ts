import { useState, useEffect } from 'react';

export type Orientation = 'portrait' | 'landscape';

export interface PWAEnvironment {
  isPWA: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  orientation: Orientation;
  hasDynamicIsland: boolean;
  hasNotch: boolean;
}

function detectIOS(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream
  );
}

function detectAndroid(): boolean {
  return /Android/.test(navigator.userAgent);
}

function detectStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
}

function getOrientation(): Orientation {
  if (window.matchMedia('(orientation: landscape)').matches) return 'landscape';
  return 'portrait';
}

// Heuristic: devices with top safe-area > 44px likely have a notch or Dynamic Island
function detectNotchOrDynamicIsland(): boolean {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:env(safe-area-inset-top,0px);left:0;width:1px;height:1px;pointer-events:none;visibility:hidden;';
  document.body.appendChild(el);
  const top = parseFloat(getComputedStyle(el).top);
  document.body.removeChild(el);
  return top > 20;
}

export function usePWAEnvironment(): PWAEnvironment {
  const [env, setEnv] = useState<PWAEnvironment>(() => {
    const isIOS = detectIOS();
    const isAndroid = detectAndroid();
    const isPWA = detectStandalone();
    const orientation = getOrientation();
    const hasNotch = isIOS ? detectNotchOrDynamicIsland() : false;

    return {
      isPWA,
      isIOS,
      isAndroid,
      orientation,
      hasDynamicIsland: false,
      hasNotch,
    };
  });

  useEffect(() => {
    const orientationQuery = window.matchMedia('(orientation: landscape)');
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');

    const handleOrientationChange = () => {
      setEnv(prev => ({
        ...prev,
        orientation: getOrientation(),
      }));
    };

    const handleStandaloneChange = () => {
      setEnv(prev => ({
        ...prev,
        isPWA: standaloneQuery.matches,
      }));
    };

    orientationQuery.addEventListener('change', handleOrientationChange);
    standaloneQuery.addEventListener('change', handleStandaloneChange);

    return () => {
      orientationQuery.removeEventListener('change', handleOrientationChange);
      standaloneQuery.removeEventListener('change', handleStandaloneChange);
    };
  }, []);

  return env;
}
