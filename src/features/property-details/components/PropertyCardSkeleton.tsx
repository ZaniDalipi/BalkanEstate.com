import React from 'react';

const PropertyCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-md border border-neutral-200 w-full flex flex-col animate-pulse">
      <div className="w-full h-32 sm:h-36 md:h-40 bg-neutral-200"></div>
      <div className="p-2.5 sm:p-3 md:p-4 flex flex-col flex-grow">
        <div className="h-4 sm:h-6 md:h-8 bg-neutral-200 rounded w-3/4 mb-2"></div>
        <div className="h-3 sm:h-4 bg-neutral-200 rounded w-1/2 mb-3"></div>

        <div className="grid grid-cols-2 gap-x-2 sm:gap-x-3 md:gap-x-4 gap-y-2 border-t border-neutral-100 pt-2.5 sm:pt-3">
          <div className="h-4 sm:h-5 bg-neutral-200 rounded w-full"></div>
          <div className="h-4 sm:h-5 bg-neutral-200 rounded w-full"></div>
          <div className="h-4 sm:h-5 bg-neutral-200 rounded w-full"></div>
          <div className="h-4 sm:h-5 bg-neutral-200 rounded w-full"></div>
        </div>

        <div className="mt-3 sm:mt-4 pt-2.5 sm:pt-3 border-t border-neutral-100 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
            <div className="h-10 bg-neutral-200 rounded-full w-full sm:w-28"></div>
            <div className="h-10 bg-neutral-200 rounded-full w-full sm:w-32"></div>
        </div>
      </div>
    </div>
  );
};

export default PropertyCardSkeleton;
