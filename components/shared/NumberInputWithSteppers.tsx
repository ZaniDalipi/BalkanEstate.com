import React, { useMemo, useCallback, memo, useState, useEffect } from 'react';

interface NumberInputWithSteppersProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    step?: number;
    /** Allow fractional values to be typed (e.g. 102.2 m²). Defaults to integers only. */
    allowDecimals?: boolean;
}

const NumberInputWithSteppers: React.FC<NumberInputWithSteppersProps> = memo(({ label, value, onChange, min = 0, max, step = 1, allowDecimals = false }) => {
    const id = useMemo(() => `number-input-${label.toLowerCase().replace(/\s+/g, '-')}`, [label]);

    // Local text state so partial decimal entry (e.g. "102." or "102.20") isn't
    // clobbered while the user is still typing.
    const [inputStr, setInputStr] = useState<string>(value === undefined || value === null ? '' : String(value));
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (!isEditing) {
            setInputStr(value === undefined || value === null ? '' : String(value));
        }
    }, [value, isEditing]);

    const clamp = useCallback((n: number) => {
        let c = n;
        if (min !== undefined && c < min) c = min;
        if (max !== undefined && c > max) c = max;
        return c;
    }, [min, max]);

    // Avoid floating point noise from repeated stepping (e.g. 0.1 + 0.2).
    const round = useCallback((n: number) => Math.round(n * 1e6) / 1e6, []);

    const handleIncrement = useCallback(() => {
        const newValue = round((value || 0) + step);
        if (max === undefined || newValue <= max) {
            onChange(newValue);
        }
    }, [value, step, max, onChange, round]);

    const handleDecrement = useCallback(() => {
        const newValue = round((value || 0) - step);
        if (min === undefined || newValue >= min) {
            onChange(newValue);
        }
    }, [value, step, min, onChange, round]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setInputStr(raw);

        if (raw === '') {
            onChange(min ?? 0);
            return;
        }

        const numValue = allowDecimals ? parseFloat(raw) : parseInt(raw, 10);
        if (!isNaN(numValue)) {
            onChange(clamp(numValue));
        }
    }, [allowDecimals, min, clamp, onChange]);

    const handleFocus = useCallback(() => setIsEditing(true), []);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
        setIsEditing(false);
        const raw = e.target.value;
        if (raw === '' || isNaN(Number(raw))) {
            onChange(min ?? 0);
            return;
        }
        onChange(clamp(Number(raw)));
    }, [min, clamp, onChange]);

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
                    value={isEditing ? inputStr : (value === undefined || value === null ? '' : value)}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="flex-1 min-w-0 text-center text-lg font-semibold text-neutral-900 border-x border-neutral-200 h-full bg-transparent focus:outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min={min}
                    max={max}
                    step={allowDecimals ? 'any' : step}
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
