import React from 'react';
import { Filters } from '../../../../../types';

interface ListPanelProps {
    isMobile: boolean;
    mobileView: 'list' | 'map';
    filters: Filters;
    onFilterChange: (name: keyof Filters, value: string) => void;
    searchInput: React.ReactNode;
    children: React.ReactNode;
}

const ListPanel: React.FC<ListPanelProps> = ({ 
    isMobile, 
    mobileView, 
    filters, 
    onFilterChange,
    searchInput,
    children 
}) => {
    if (isMobile && mobileView !== 'list') return null;
    
    return (
        <div className={`absolute inset-0 z-10 h-full w-full bg-white md:relative md:w-3/5 md:flex-shrink-0 md:border-r md:border-neutral-200 md:flex md:flex-col ${
            isMobile && mobileView === 'list' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        } transition-transform duration-300`}>
            <div className="hidden md:block p-3 border-b border-neutral-200 flex-shrink-0">
                <h2 className="text-base font-semibold text-neutral-800 mb-3">
                    Properties for Sale
                </h2>
                <div className="flex gap-2 items-start">
                    {searchInput}
                    <select
                        value={filters.country}
                        onChange={(e) => onFilterChange('country', e.target.value)}
                        className="flex-shrink-0 bg-white border border-neutral-300 rounded-xl text-neutral-900 text-sm px-3 py-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none cursor-pointer"
                        style={{ 
                            backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", 
                            backgroundPosition: 'right 0.5rem center', 
                            backgroundRepeat: 'no-repeat', 
                            backgroundSize: '1.5em 1.5em', 
                            paddingRight: '2.5rem' 
                        }}
                    >
                        <option value="any">Any Country</option>
                        {/* Add your country options here */}
                    </select>
                </div>
            </div>
            {children}
        </div>
    );
};

export default ListPanel;