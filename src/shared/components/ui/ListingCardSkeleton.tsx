import React from 'react';

const ListingCardSkeleton: React.FC = () => {
    return (
        <div className="bg-white p-4 rounded-xl border border-neutral-200 flex flex-col sm:flex-row gap-5 animate-pulse">
            <div className="w-full sm:w-48 h-40 bg-neutral-200 rounded-lg flex-shrink-0"></div>
            <div className="flex-grow flex flex-col w-full">
                <div className="h-5 bg-neutral-200 rounded w-24 mb-2"></div>
                <div className="h-7 bg-neutral-200 rounded w-40 mb-2"></div>
                <div className="h-4 bg-neutral-200 rounded w-48"></div>
                
                <div className="flex-grow"></div>

                <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-3 pt-3 border-t border-neutral-100">
                    <div className="h-4 bg-neutral-200 rounded w-12"></div>
                    <div className="h-4 bg-neutral-200 rounded w-12"></div>
                    <div className="h-4 bg-neutral-200 rounded w-12"></div>
                    <div className="h-4 bg-neutral-200 rounded w-24"></div>
                </div>
                
                <div className="flex items-center gap-2 mt-4">
                    <div className="h-10 bg-neutral-200 rounded-lg w-28"></div>
                    <div className="h-10 bg-neutral-200 rounded-lg w-36"></div>
                </div>
            </div>
        </div>
    );
};

export default ListingCardSkeleton;
