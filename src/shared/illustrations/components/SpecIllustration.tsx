import React from 'react';
import { specIllustrationUrl } from '../assets';
import type { IllustrationProps, SpecIllustrationName } from '../types';
import { DecorativeImage } from './DecorativeImage';

/** An isometric property-spec scene (bedrooms, pool, plot…). Lazy-loaded. */
export const SpecIllustration: React.FC<IllustrationProps<SpecIllustrationName>> = ({ name, className }) => (
  <DecorativeImage src={specIllustrationUrl(name)} className={className} lazy />
);
