import React, { useState, useEffect } from 'react';
import { Property } from '../../../types';
import { BuildingOfficeIcon } from '../../../constants';

interface ComparisonBarProps {
    properties: Property[];
    onCompareNow: () => void;
    onRemove: (id: string) => void;
    onClear: () => void;
}

const CompareImage: React.FC<{ prop: Property; onRemove: (id: string) => void; }> = ({ prop, onRemove }) => {
    const [error, setError] = useState(false);
    useEffect(() => { setError(false); }, [prop.imageUrl]);

    return (
        <div className="relative group">
            {error ? (
                <div className="w-10 h-10 object-cover rounded-full border-2 border-white shadow-md bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
                    <BuildingOfficeIcon className="w-5 h-5 text-neutral-400" />
                </div>
            ) : (
                 <img
                    src={prop.imageUrl}
                    alt={prop.address}
                    className="w-10 h-10 object-cover rounded-full border-2 border-white shadow-md"
                    onError={() => setError(true)}
                />
            )}
            <button
                onClick={() => onRemove(prop.id)}
                className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
                &times;
            </button>
        </div>
    )
};

const ComparisonBar: React.FC<ComparisonBarProps> = ({ properties, onCompareNow, onRemove, onClear }) => {
    const propertyCount = properties.length;
    const canCompare = propertyCount >= 2;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] p-3">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:w-auto flex items-center gap-3 flex-grow">
                    <div className="flex -space-x-2.5">
                        {properties.map(prop => (
                           <CompareImage key={prop.id} prop={prop} onRemove={onRemove} />
                        ))}
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm text-neutral-800">Compare Properties</h3>
                        <p className="text-xs text-neutral-600">{propertyCount} of 5 selected</p>
                    </div>
                </div>
                <div className="w-full sm:w-auto flex items-center justify-end gap-3 flex-shrink-0">
                    <button onClick={onClear} className="text-sm font-semibold text-neutral-600 hover:text-primary">
                        Clear
                    </button>
                    <button
                        onClick={onCompareNow}
                        disabled={!canCompare}
                        className="flex-grow sm:flex-grow-0 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-lg shadow-md hover:bg-primary-dark transition-colors disabled:bg-neutral-300 disabled:cursor-not-allowed"
                    >
                        Compare Now ({propertyCount})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ComparisonBar;