import React, { useMemo, useCallback, memo } from 'react';

interface NumberInputWithSteppersProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
}

const NumberInputWithSteppers: React.FC<NumberInputWithSteppersProps> = memo(({ label, value, onChange, min = 0, max, step = 1 }) => {
    const id = useMemo(() => `number-input-${label.toLowerCase().replace(/\s+/g, '-')}`, [label]);

    const handleIncrement = useCallback(() => {
        const newValue = (value || 0) + step;
        if (max === undefined || newValue <= max) {
            onChange(newValue);
        }
    }, [value, step, max, onChange]);

    const handleDecrement = useCallback(() => {
        const newValue = (value || 0) - step;
        if (min === undefined || newValue >= min) {
            onChange(newValue);
        }
    }, [value, step, min, onChange]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
    }, [min, max, onChange]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
        }
    }, []);

    const canDecrement = min === undefined || value > min;
    const canIncrement = max === undefined || value < max;

    return (
        <div className="relative">
            <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1">{label}</label>
            <div className="flex items-center w-full h-[52px] bg-white rounded-xl border border-neutral-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition-all overflow-hidden">
                <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={!canDecrement}
                    className="flex-shrink-0 w-12 sm:w-14 h-full flex items-center justify-center text-xl sm:text-2xl font-medium text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 disabled:text-neutral-300 disabled:cursor-not-allowed transition-colors"
                    aria-label={`Decrease ${label}`}
                >
                    −
                </button>
                <input
                    type="number"
                    id={id}
                    value={value === undefined || value === null ? '' : value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-w-0 text-center text-lg font-semibold text-neutral-900 border-x border-neutral-200 h-full bg-transparent focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min={min}
                    max={max}
                    aria-label={label}
                />
                <button
                    type="button"
                    onClick={handleIncrement}
                    disabled={!canIncrement}
                    className="flex-shrink-0 w-12 sm:w-14 h-full flex items-center justify-center text-xl sm:text-2xl font-medium text-neutral-600 hover:bg-neutral-100 active:bg-neutral-200 disabled:text-neutral-300 disabled:cursor-not-allowed transition-colors"
                    aria-label={`Increase ${label}`}
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                    </svg>
                </button>
            </div>
        </div>
    );
});

export default NumberInputWithSteppers;
