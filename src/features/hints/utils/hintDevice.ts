import type { HintDef } from './hintCatalog';

/** What the current device can do, as far as tips care. */
export interface DeviceTraits {
  /** Touch is the primary input (phone, tablet). */
  touch: boolean;
  /** Running as the installed app (home screen), not in a browser tab. */
  installed: boolean;
}

/** The tip describes something this device can actually do. */
export function hintFitsDevice(hint: HintDef, device: DeviceTraits): boolean {
  switch (hint.device) {
    case 'any':
      return true;
    case 'touch':
      return device.touch;
    case 'pointer':
      return !device.touch;
    case 'installed':
      return device.touch && device.installed;
  }
}

const matches = (query: string): boolean => {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  } catch {
    return false;
  }
};

/** Reads the device traits from the browser. */
export function readDeviceTraits(): DeviceTraits {
  const iosStandalone =
    typeof navigator !== 'undefined' && (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return {
    touch: matches('(pointer: coarse)'),
    installed: matches('(display-mode: standalone)') || iosStandalone,
  };
}
