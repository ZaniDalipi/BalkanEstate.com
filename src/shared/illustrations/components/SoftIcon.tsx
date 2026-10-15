import React from 'react';
import { softIconUrl } from '../assets';
import type { IllustrationProps, SoftIconName } from '../types';
import { DecorativeImage } from './DecorativeImage';

/** A soft 3D icon for use inside pages. Defaults to 24px. */
export const SoftIcon: React.FC<IllustrationProps<SoftIconName>> = ({ name, className }) => (
  <DecorativeImage src={softIconUrl(name)} className={className ?? 'w-6 h-6'} />
);
