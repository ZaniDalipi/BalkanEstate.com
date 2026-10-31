import React from 'react';
import { navPictureUrl } from '../assets';
import type { IllustrationProps, NavPictureName } from '../types';
import { DecorativeImage } from './DecorativeImage';

/** A 3D sidebar picture, for any navigation that points at the same place. */
export const NavPicture: React.FC<IllustrationProps<NavPictureName>> = ({ name, className }) => (
  <DecorativeImage src={navPictureUrl(name)} className={className ?? 'w-6 h-6'} />
);
