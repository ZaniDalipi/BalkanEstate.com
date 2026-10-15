import React from 'react';
import { categoryPictureUrl } from '../assets';
import type { CategoryPictureName, IllustrationProps } from '../types';
import { DecorativeImage } from './DecorativeImage';

/** A home-page category picture. Lazy-loaded. */
export const CategoryPicture: React.FC<IllustrationProps<CategoryPictureName>> = ({ name, className }) => (
  <DecorativeImage src={categoryPictureUrl(name)} className={className} lazy />
);
