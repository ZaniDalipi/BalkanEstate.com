import React, { useMemo } from 'react';

interface FloorInputCombinedProps {
    label: string;
    floorNumber: number;
    totalFloors: number;
    onFloorNumberChange: (value: number) => void;
    onTotalFloorsChange: (value: number) => void;
}

/**
 * Combined floor input showing "Floor X / Y" format
 * For apartments - shows floor number and total building floors
 */
const FloorInputCombined: React.FC<FloorInputCombinedProps> = ({
    label,
    floorNumber,
    totalFloors,
    onFloorNumberChange,
    onTotalFloorsChange,
}) => {
    const id = useMemo(() => `floor-input-combined`, []);

    const handleFloorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 0) {
            // Floor number can't exceed total floors
            const maxFloor = totalFloors > 0 ? totalFloors : 999;
            onFloorNumberChange(Math.min(val, maxFloor));
        } else if (e.target.value === '') {
            onFloorNumberChange(0);
        }
    };

    const handleTotalFloorsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseInt(e.target.value, 10);
        if (!isNaN(val) && val >= 1) {
            onTotalFloorsChange(val);
            // If floor number exceeds new total, adjust it
            if (floorNumber > val) {
                onFloorNumberChange(val);
            }
        } else if (e.target.value === '') {
            onTotalFloorsChange(1);
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>, isFloor: boolean) => {
        const val = parseInt(e.target.value, 10);
        if (isFloor) {
            if (isNaN(val) || val < 0) {
                onFloorNumberChange(1);
            } else if (totalFloors > 0 && val > totalFloors) {
                onFloorNumberChange(totalFloors);
            }
        } else {
            if (isNaN(val) || val < 1) {
                onTotalFloorsChange(1);
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
        }
    };

    const inputClasses = "w-16 h-[58px] px-2 text-center text-lg font-semibold text-neutral-900 bg-white rounded-lg border border-neutral-300 focus:border-primary focus:ring-1 focus:ring-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";

    return (
        <div className="relative">
            <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1">
                {label}
            </label>
            <div className="flex items-center gap-2 bg-white rounded-lg border border-neutral-300 p-2">
                <div className="flex flex-col items-center">
                    <span className="text-xs text-neutral-500 mb-1">Floor</span>
                    <input
                        type="number"
                        id={`${id}-floor`}
                        value={floorNumber || ''}
                        onChange={handleFloorChange}
                        onBlur={(e) => handleBlur(e, true)}
                        onKeyDown={handleKeyDown}
                        className={inputClasses}
                        min={0}
                        max={totalFloors || 999}
                        placeholder="8"
                        aria-label="Floor number"
                    />
                </div>
                <span className="text-2xl font-bold text-neutral-400 self-end mb-3">/</span>
                <div className="flex flex-col items-center">
                    <span className="text-xs text-neutral-500 mb-1">Total</span>
                    <input
                        type="number"
                        id={`${id}-total`}
                        value={totalFloors || ''}
                        onChange={handleTotalFloorsChange}
                        onBlur={(e) => handleBlur(e, false)}
                        onKeyDown={handleKeyDown}
                        className={inputClasses}
                        min={1}
                        placeholder="14"
                        aria-label="Total floors in building"
                    />
                </div>
                <div className="ml-2 flex items-center text-neutral-500 self-end mb-4">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                </div>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
                e.g., Floor 8 of 14-story building
            </p>
        </div>
    );
};

export default FloorInputCombined;
