import React from 'react';

interface PropertyCardSkeletonProps {
  index?: number;
}

const PropertyCardSkeleton: React.FC<PropertyCardSkeletonProps> = ({ index = 0 }) => {
  // Stagger animation delay based on index
  const animationDelay = `${index * 100}ms`;

  return (
    <div
      className="bg-white rounded-lg overflow-hidden shadow-md border border-neutral-200 w-full flex flex-col opacity-0 animate-skeleton-fade-in"
      style={{ animationDelay }}
    >
      {/* Image placeholder with shimmer */}
      <div className="w-full h-32 sm:h-36 md:h-40 bg-neutral-200 relative overflow-hidden">
        <div className="absolute inset-0 shimmer-effect" />
      </div>

      <div className="p-2.5 sm:p-3 md:p-4 flex flex-col flex-grow">
        {/* Price */}
        <div className="h-4 sm:h-6 md:h-8 bg-neutral-200 rounded w-3/4 mb-2 relative overflow-hidden">
          <div className="absolute inset-0 shimmer-effect" />
        </div>

        {/* Address */}
        <div className="h-3 sm:h-4 bg-neutral-200 rounded w-1/2 mb-3 relative overflow-hidden">
          <div className="absolute inset-0 shimmer-effect" />
        </div>

        {/* Property details grid */}
        <div className="grid grid-cols-2 gap-x-2 sm:gap-x-3 md:gap-x-4 gap-y-2 border-t border-neutral-100 pt-2.5 sm:pt-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 sm:h-5 bg-neutral-200 rounded w-full relative overflow-hidden">
              <div className="absolute inset-0 shimmer-effect" style={{ animationDelay: `${i * 50}ms` }} />
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-neutral-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
          <div className="h-10 bg-neutral-200 rounded-full w-full sm:w-28 relative overflow-hidden">
            <div className="absolute inset-0 shimmer-effect" />
          </div>
          <div className="h-10 bg-neutral-200 rounded-full w-full sm:w-32 relative overflow-hidden">
            <div className="absolute inset-0 shimmer-effect" />
          </div>
        </div>
      </div>

      {/* Inline styles for shimmer animation */}
      <style>{`
        .shimmer-effect {
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.4) 50%,
            transparent 100%
          );
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes skeleton-fade-in {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-skeleton-fade-in {
          animation: skeleton-fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default PropertyCardSkeleton;
