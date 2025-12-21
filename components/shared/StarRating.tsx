import React, { memo } from 'react';
import { StarIcon } from '../../constants';
import { StarIconSolid } from '../../constants';

interface StarRatingProps {
  rating: number;
  totalStars?: number;
  className?: string;
}

const StarRating: React.FC<StarRatingProps> = ({ rating, totalStars = 5, className = 'h-5 w-5' }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = totalStars - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center">
      {[...Array(fullStars)].map((_, i) => (
        <StarIconSolid key={`full-${i}`} className={`${className} text-yellow-400`} />
      ))}
      {hasHalfStar && (
        <div className="relative">
          <StarIcon className={`${className} text-yellow-200`} />
          <div className="absolute top-0 left-0 overflow-hidden w-1/2">
            <StarIconSolid className={`${className} text-yellow-400`} />
          </div>
        </div>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <StarIcon key={`empty-${i}`} className={`${className} text-yellow-200`} />
      ))}
    </div>
  );
};

export default memo(StarRating);