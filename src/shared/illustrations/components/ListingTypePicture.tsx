import React from 'react';
import { NavPicture } from './NavPicture';

/**
 * The picture for a listing's type, wherever renting or buying is shown: the
 * same keys-and-house (rent) and magnifier (buy) as the sidebar, so the two
 * read the same on every page.
 */
export const ListingTypePicture: React.FC<{ type: 'rent' | 'sale'; className?: string }> = ({ type, className }) => (
  <NavPicture name={type === 'rent' ? 'rent' : 'buy'} className={className} />
);
