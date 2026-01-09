import React, { useMemo } from 'react';

interface NumberInputWithSteppersProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    placeholder?: string;
}

/**
 * Simple validated number input (no +/- buttons)
 * Validates against min/max and prevents invalid values
 */
const NumberInputWithSteppers: React.FC<NumberInputWithSteppersProps> = ({
    label,
    value,
    onChange,
    min = 0,
    max,
    step = 1,
    placeholder
}) => {
    const id = useMemo(() => `number-input-${label.toLowerCase().replace(/\s+/g, '-')}`, [label]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;

        // Allow empty input to be treated as min value (usually 0)
        if (inputValue === '') {
            onChange(min ?? 0);
            return;
        }

        // Parse as float to support decimal step values
        const numValue = step % 1 !== 0 ? parseFloat(inputValue) : parseInt(inputValue, 10);

        if (!isNaN(numValue)) {
            // Clamp value between min and max
            let clampedValue = numValue;
            if (min !== undefined && clampedValue < min) clampedValue = min;
            if (max !== undefined && clampedValue > max) clampedValue = max;
            onChange(clampedValue);
        }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const inputValue = e.target.value;

        // On blur, ensure the value is valid
        if (inputValue === '' || isNaN(Number(inputValue))) {
            onChange(min ?? 0);
            return;
        }

        const numValue = Number(inputValue);
        let clampedValue = numValue;
        if (min !== undefined && clampedValue < min) clampedValue = min;
        if (max !== undefined && clampedValue > max) clampedValue = max;
        onChange(clampedValue);
    };

    // Prevent Enter key from submitting the form
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <div className="relative">
            <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1">
                {label}
            </label>
            <input
                type="number"
                id={id}
                value={value === undefined || value === null ? '' : value}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full h-[58px] px-4 text-lg font-semibold text-neutral-900 bg-white rounded-lg border border-neutral-300 focus:border-primary focus:ring-1 focus:ring-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min={min}
                max={max}
                step={step}
                aria-label={label}
            />
        </div>
    );
};

export default NumberInputWithSteppers;
