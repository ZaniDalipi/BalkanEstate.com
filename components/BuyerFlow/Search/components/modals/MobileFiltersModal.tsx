import React from 'react';
import { XMarkIcon } from '../../../../../constants';
import { Filters } from '../../../../../types';

interface MobileFiltersModalProps {
    isOpen: boolean;
    onClose: () => void;
    localFilters: Filters;
    onLocalFilterChange: (name: keyof Filters, value: string | number | null) => void;
    onReset: () => void;
    onSave: () => void;
    onApply: () => void;
    isSaving: boolean;
    searchMode: 'manual' | 'ai';
    children: React.ReactNode;
}

const MobileFiltersModal: React.FC<MobileFiltersModalProps> = ({
    isOpen,
    onClose,
    localFilters,
    onLocalFilterChange,
    onReset,
    onSave,
    onApply,
    isSaving,
    searchMode,
    children
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-30 flex flex-col">
            <div className="absolute inset-0 bg-black/50" onClick={onClose}></div>
            <div className="relative w-full h-full" onClick={onClose}>
                <div className="absolute inset-0 bg-white" onClick={e => e.stopPropagation()}>
                    <div className="bg-white h-full w-full flex flex-col">
                        <div className="flex-shrink-0 p-4 border-b border-neutral-200 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-neutral-800">Filters</h2>
                            <button onClick={onClose} className="p-2 text-neutral-500 hover:text-neutral-800">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        {children}
                        {searchMode === 'manual' && (
                            <div className="flex-shrink-0 p-4 border-t border-neutral-200 bg-white flex items-center gap-2">
                                <button onClick={onReset} className="px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100">
                                    Reset
                                </button>
                                <button onClick={onSave} disabled={isSaving} className="px-3 py-2 border border-neutral-300 rounded-lg text-sm font-semibold text-neutral-700 hover:bg-neutral-100">
                                    Save Search
                                </button>
                                <button onClick={onApply} className="flex-grow px-3 py-2 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark">
                                    Show Results
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MobileFiltersModal;