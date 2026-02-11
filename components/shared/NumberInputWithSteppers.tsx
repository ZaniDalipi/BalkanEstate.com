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
        const inputValue = e.target.value;
        if (inputValue === '') {
            onChange(min ?? 0);
            return;
        }
        const numValue = parseInt(inputValue, 10);
        if (!isNaN(numValue)) {
            let clampedValue = numValue;
            if (min !== undefined && clampedValue < min) clampedValue = min;
            if (max !== undefined && clampedValue > max) clampedValue = max;
            onChange(clampedValue);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
        }
    };

    const canDecrement = min === undefined || value > min;
    const canIncrement = max === undefined || value < max;

    return (
        <div>
            <label htmlFor={id} className="block text-sm font-medium text-gray-500 mb-1.5">{label}</label>
            <div className="glass-input flex items-center h-[52px] overflow-hidden !p-0">
                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={!canDecrement}
                    className="w-12 h-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-black/[0.03] active:bg-black/[0.06] transition-colors disabled:opacity-25 disabled:pointer-events-none shrink-0"
                    aria-label={`Decrease ${label}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" d="M5 12h14" />
                    </svg>
                </button>
                <input
                    type="number"
                    id={id}
                    value={value === undefined || value === null ? '' : value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className="flex-1 h-full text-center text-lg font-semibold text-gray-900 bg-transparent outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min={min}
                    max={max}
                    aria-label={label}
                />
                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={!canIncrement}
                    className="w-12 h-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-black/[0.03] active:bg-black/[0.06] transition-colors disabled:opacity-25 disabled:pointer-events-none shrink-0"
                    aria-label={`Increase ${label}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default NumberInputWithSteppers;
