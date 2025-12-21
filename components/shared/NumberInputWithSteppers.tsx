import React, { useMemo } from 'react';

interface NumberInputWithSteppersProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
}

const NumberInputWithSteppers: React.FC<NumberInputWithSteppersProps> = ({ label, value, onChange, min = 0, max, step = 1 }) => {
    const id = useMemo(() => `number-input-${label.toLowerCase().replace(/\s+/g, '-')}`, [label]);

    const handleIncrement = () => {
        const newValue = (value || 0) + step;
        if (max === undefined || newValue <= max) {
            onChange(newValue);
        }
    };

    const handleDecrement = () => {
        const newValue = (value || 0) - step;
        if (min === undefined || newValue >= min) {
            onChange(newValue);
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numValue = e.target.value === '' ? min : parseInt(e.target.value, 10);
        if (!isNaN(numValue)) {
            let clampedValue = numValue;
            if (min !== undefined && clampedValue < min) clampedValue = min;
            if (max !== undefined && clampedValue > max) clampedValue = max;
            onChange(clampedValue);
        }
    };

    return (
        <div className="relative">
            <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>
            <div className="flex items-center justify-between w-full h-[58px] bg-white rounded-lg border border-neutral-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all">
                <button 
                    type="button" 
                    onClick={handleDecrement} 
                    disabled={value <= min}
                    className="px-4 sm:px-6 py-2 text-2xl sm:text-3xl font-light text-neutral-600 hover:bg-neutral-100 disabled:text-neutral-300 disabled:cursor-not-allowed h-full rounded-l-lg focus:outline-none transition-colors"
                    aria-label={`Decrease ${label}`}
                >
                    -
                </button>
                <input 
                    type="number" 
                    id={id}
                    value={value || ''} 
                    onChange={handleChange}
                    className="w-full text-center text-lg font-semibold text-neutral-900 border-none focus:ring-0 bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min={min}
                    max={max}
                    aria-label={label}
                />
                <button 
                    type="button" 
                    onClick={handleIncrement}
                    disabled={max !== undefined && value >= max}
                    className="px-4 sm:px-6 py-2 text-2xl sm:text-3xl font-light text-neutral-600 hover:bg-neutral-100 disabled:text-neutral-300 disabled:cursor-not-allowed h-full rounded-r-lg focus:outline-none transition-colors"
                    aria-label={`Increase ${label}`}
                >
                    +
                </button>
            </div>
        </div>
    );
};

export default NumberInputWithSteppers;