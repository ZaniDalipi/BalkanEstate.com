import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getMortgageProfile,
  formatEur,
  MORTGAGE_DATA_YEAR,
} from '../data/mortgageMarketData';

interface MortgageCalculatorProps {
  propertyPrice: number;
  country: string;
}

/** Sensible bounds for the editable interest-rate field. */
const MIN_RATE = 0.01;
const MAX_RATE = 30;

// Categorical colours for the principal/interest split. Validated (dataviz):
// CVD ΔE 38+ between the pair; the amber's low surface contrast is covered by
// the always-present direct labels + legend below the chart.
const PRINCIPAL_COLOR = '#0252CD'; // primary blue
const INTEREST_COLOR = '#F59E0B';  // amber

const TermButton: React.FC<{ term: number, selectedTerm: number, onClick: (term: number) => void, yrsLabel: string }> = ({ term, selectedTerm, onClick, yrsLabel }) => (
    <button
        type="button"
        onClick={() => onClick(term)}
        className={`px-2 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 flex-grow text-center ${
            selectedTerm === term
            ? 'bg-primary text-white shadow-md shadow-primary/25'
            : 'text-neutral-600 hover:bg-neutral-200'
        }`}
    >
        {term} {yrsLabel}
    </button>
);

/**
 * Donut splitting total repayment into principal vs interest. Two arcs on a
 * shared circle with a small gap; the center shows the total. Purely
 * presentational — identity is carried by the legend, not colour alone.
 */
const BreakdownDonut: React.FC<{
    principalPct: number; // 0..1
    centerLabel: string;
    centerValue: string;
}> = ({ principalPct, centerLabel, centerValue }) => {
    const r = 42;
    const c = 2 * Math.PI * r;
    const gap = principalPct > 0 && principalPct < 1 ? 3 : 0; // 3px visual gap
    const principalLen = Math.max(0, principalPct * c - gap);
    const interestLen = Math.max(0, (1 - principalPct) * c - gap);
    // Shrink the centre figure as it grows so long totals stay inside the ring
    // without distorting the glyphs (no textLength squishing).
    const len = centerValue.length;
    const valueFontSize = len > 16 ? 6 : len > 13 ? 7 : len > 10 ? 8 : 9.5;
    return (
        <svg viewBox="0 0 100 100" className="w-32 h-32 sm:w-36 sm:h-36 -rotate-90 flex-shrink-0" role="img" aria-label={`${centerLabel}: ${centerValue}`}>
            <circle cx="50" cy="50" r={r} fill="none" stroke="#F1F5F9" strokeWidth="11" />
            <circle
                cx="50" cy="50" r={r} fill="none" stroke={INTEREST_COLOR} strokeWidth="11"
                strokeDasharray={`${interestLen} ${c - interestLen}`}
                strokeDashoffset={-(principalLen + gap)}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 400ms ease-out, stroke-dashoffset 400ms ease-out' }}
            />
            <circle
                cx="50" cy="50" r={r} fill="none" stroke={PRINCIPAL_COLOR} strokeWidth="11"
                strokeDasharray={`${principalLen} ${c - principalLen}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray 400ms ease-out' }}
            />
            {/* Counter-rotate the text so it reads horizontally. textLength caps
                the width so an extreme value can never spill past the ring. */}
            <g transform="rotate(90 50 50)">
                <text x="50" y="46" textAnchor="middle" className="fill-neutral-400" style={{ fontSize: '6px', fontWeight: 600 }}>{centerLabel}</text>
                <text
                    x="50" y="58" textAnchor="middle" className="fill-neutral-800"
                    style={{ fontSize: `${valueFontSize}px`, fontWeight: 800 }}
                >
                    {centerValue}
                </text>
            </g>
        </svg>
    );
};

/**
 * Compact labelled figure for the results grid. Renders as a label-left /
 * value-right row on mobile (full width, so large local-currency totals fit on
 * one line) and as a stacked card from sm up.
 */
const StatTile: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => (
    <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-2.5 sm:p-3 min-w-0 flex items-center justify-between gap-3 sm:block">
        <div className="flex items-center gap-1.5 min-w-0">
            {accent && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />}
            <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 leading-tight">{label}</span>
        </div>
        <p className="text-sm font-bold text-neutral-800 tabular-nums break-words leading-tight min-w-0 text-right sm:text-left sm:mt-1" title={value}>{value}</p>
    </div>
);

const MortgageCalculator: React.FC<MortgageCalculatorProps> = ({ propertyPrice, country }) => {
    const { t } = useTranslation(['calculators']);
    const profile = useMemo(() => getMortgageProfile(country), [country]);

    const [downPayment, setDownPayment] = useState(profile.defaultDownPaymentPercent);
    const [downPaymentType, setDownPaymentType] = useState<'percent' | 'amount'>('percent');
    const [interestRate, setInterestRate] = useState(profile.typicalRate);
    const [rateError, setRateError] = useState<string | undefined>();
    const [loanTerm, setLoanTerm] = useState(profile.defaultTermYears);
    const [monthlyPayment, setMonthlyPayment] = useState(0);
    const [isSliderActive, setIsSliderActive] = useState(false);

    // Single currency across the calculator: euros.
    const currencySymbol = '€';
    const fmt = formatEur;

    // Term presets, trimmed to what the selected market actually offers.
    const termOptions = useMemo(
        () => [15, 20, 25, 30, 35].filter((term) => term <= profile.maxTermYears),
        [profile],
    );

    // Re-seed the location-specific defaults whenever the country changes so the
    // pre-filled rate, down payment and term always reflect the selected market.
    useEffect(() => {
        setDownPayment(profile.defaultDownPaymentPercent);
        setDownPaymentType('percent');
        setInterestRate(profile.typicalRate);
        setLoanTerm(profile.defaultTermYears);
    }, [profile]);

    // Handle slider interaction states
    const handleSliderStart = useCallback(() => setIsSliderActive(true), []);
    const handleSliderEnd = useCallback(() => {
        // Keep animation running briefly after release for smooth feel
        setTimeout(() => setIsSliderActive(false), 800);
    }, []);

    const downPaymentAmount = useMemo(() => {
        return downPaymentType === 'percent' ? propertyPrice * (downPayment / 100) : downPayment;
    }, [propertyPrice, downPayment, downPaymentType]);

    // Calculate slider percentage for visual display
    const sliderPercent = useMemo(() => {
        if (downPaymentType === 'percent') {
            return downPayment;
        }
        return (downPayment / propertyPrice) * 100;
    }, [downPayment, downPaymentType, propertyPrice]);

    useEffect(() => {
        const principal = propertyPrice - downPaymentAmount;

        if (principal <= 0 || interestRate <= 0 || loanTerm <= 0) {
            setMonthlyPayment(0);
            return;
        }

        const monthlyInterestRate = (interestRate / 100) / 12;
        const numberOfPayments = loanTerm * 12;

        // Handle case where interest rate is 0
        if (monthlyInterestRate === 0) {
            setMonthlyPayment(principal / numberOfPayments);
            return;
        }

        const M = principal * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

        setMonthlyPayment(M > 0 ? M : 0);
    }, [propertyPrice, downPaymentAmount, interestRate, loanTerm]);

    // Full repayment breakdown derived from the monthly payment.
    const breakdown = useMemo(() => {
        const loanAmount = Math.max(0, propertyPrice - downPaymentAmount);
        const totalPayment = monthlyPayment * loanTerm * 12;
        const totalInterest = Math.max(0, totalPayment - loanAmount);
        const principalPct = totalPayment > 0 ? loanAmount / totalPayment : 0;
        return { loanAmount, totalPayment, totalInterest, principalPct };
    }, [propertyPrice, downPaymentAmount, monthlyPayment, loanTerm]);

    const handleDownPaymentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.valueAsNumber || 0;
        if (downPaymentType === 'percent') {
            setDownPayment(Math.max(0, Math.min(100, value)));
        } else {
            setDownPayment(Math.max(0, Math.min(propertyPrice, value)));
        }
    };

    const handleDownPaymentTypeChange = (type: 'percent' | 'amount') => {
        setDownPaymentType(type);
        if (type === 'percent') {
            // Convert current amount back to percentage
            setDownPayment(Math.round((downPaymentAmount / propertyPrice) * 100));
        } else {
            // Use current calculated amount
            setDownPayment(Math.round(downPaymentAmount));
        }
    };

    const handleInterestRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.valueAsNumber;
        if (Number.isNaN(raw)) {
            setInterestRate(0);
            setRateError(t('calculators:mortgage.errors.rateRequired', 'Enter an interest rate'));
            return;
        }
        setInterestRate(raw);
        if (raw < MIN_RATE || raw > MAX_RATE) {
            setRateError(t('calculators:mortgage.errors.rateRange', 'Rate must be between {{min}}% and {{max}}%', { min: MIN_RATE, max: MAX_RATE }));
        } else {
            setRateError(undefined);
        }
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl border border-neutral-200/80 overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-5 py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-neutral-100">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-lg flex-shrink-0">💰</span>
                <div className="min-w-0">
                    <h3 className="text-sm font-bold text-neutral-800 leading-tight truncate">{t('calculators:mortgage.title')}</h3>
                    <p className="text-[11px] text-neutral-500 truncate">{profile.name}</p>
                </div>
            </div>

            <div className="p-5 space-y-5">
                <div className="flex items-baseline justify-between gap-3">
                    <label className="text-xs font-medium text-neutral-500 flex-shrink-0">{t('calculators:mortgage.fields.propertyPrice')}</label>
                    <p className="text-lg font-bold text-neutral-800 tabular-nums text-right break-words min-w-0">{fmt(propertyPrice)}</p>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-semibold text-neutral-700">{t('calculators:mortgage.fields.downPayment')}</label>
                        <div className="bg-neutral-100 p-0.5 rounded-full flex items-center text-xs font-semibold">
                            <button onClick={() => handleDownPaymentTypeChange('percent')} className={`px-2.5 py-1 rounded-full transition-all ${downPaymentType === 'percent' ? 'bg-white shadow-sm text-primary' : 'text-neutral-500'}`}>%</button>
                            <button onClick={() => handleDownPaymentTypeChange('amount')} className={`px-2.5 py-1 rounded-full transition-all ${downPaymentType === 'amount' ? 'bg-white shadow-sm text-primary' : 'text-neutral-500'}`}>{currencySymbol}</button>
                        </div>
                    </div>

                    {/* Premium Slider Container */}
                    <div className="relative mt-2">
                        {/* Percentage markers positioned above the track */}
                        <div className="flex justify-between items-center mb-3 px-1">
                            {[0, 25, 50, 75, 100].map(mark => (
                                <span
                                    key={mark}
                                    className={`text-[10px] sm:text-xs font-semibold transition-all duration-300 min-w-[28px] text-center ${
                                        sliderPercent >= mark
                                            ? 'text-primary'
                                            : 'text-neutral-400'
                                    }`}
                                >
                                    {mark}%
                                </span>
                            ))}
                        </div>

                        {/* Slider track container with proper touch target */}
                        <div className="relative h-12 flex items-center" style={{ touchAction: 'none' }}>
                            {/* Glow effect behind track */}
                            <div
                                className={`absolute top-1/2 -translate-y-1/2 h-6 rounded-full pointer-events-none ${
                                    isSliderActive ? 'opacity-100' : 'opacity-40'
                                }`}
                                style={{
                                    left: '6px',
                                    width: `calc(${sliderPercent}% - 6px)`,
                                    background: 'linear-gradient(90deg, rgba(59,130,246,0.3), rgba(139,92,246,0.25), rgba(236,72,153,0.2))',
                                    filter: 'blur(8px)',
                                    willChange: 'width',
                                    transition: isSliderActive ? 'none' : 'opacity 300ms ease-out'
                                }}
                            />

                            {/* Track background - smooth glass effect */}
                            <div className="relative w-full h-3 rounded-full bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)] overflow-hidden">
                                {/* Gradient fill */}
                                <div
                                    className="absolute inset-y-0 left-0 rounded-full"
                                    style={{
                                        width: `${sliderPercent}%`,
                                        background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 25%, #8b5cf6 50%, #a855f7 75%, #ec4899 100%)',
                                        backgroundSize: isSliderActive ? '200% 100%' : '100% 100%',
                                        animation: isSliderActive ? 'shimmer 2s ease-in-out infinite' : 'none',
                                        willChange: 'width',
                                        transition: isSliderActive ? 'none' : 'width 80ms ease-out'
                                    }}
                                />

                                {/* Subtle sparkles - only visible when active */}
                                {isSliderActive && sliderPercent > 10 && (
                                    <div
                                        className="absolute inset-y-0 left-0 overflow-hidden rounded-full pointer-events-none"
                                        style={{ width: `${sliderPercent}%` }}
                                    >
                                        <div className="absolute inset-0 opacity-70">
                                            <div className="absolute top-0.5 left-[20%] w-1 h-1 bg-white rounded-full animate-pulse" />
                                            <div className="absolute top-1 left-[50%] w-0.5 h-0.5 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                                            <div className="absolute top-0.5 left-[80%] w-1 h-1 bg-white rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                                        </div>
                                    </div>
                                )}

                                {/* Glass highlight on track */}
                                <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/40 to-transparent rounded-t-full pointer-events-none" />
                            </div>

                            {/* Custom thumb */}
                            <div
                                className={`absolute top-1/2 -translate-y-1/2 pointer-events-none z-10 ${
                                    isSliderActive ? 'scale-110' : 'scale-100'
                                }`}
                                style={{
                                    left: `calc(${sliderPercent}% - ${sliderPercent * 0.28}px)`,
                                    willChange: 'left',
                                    transition: isSliderActive ? 'transform 150ms ease-out' : 'transform 150ms ease-out, left 80ms ease-out',
                                }}
                            >
                                {/* Outer glow ring - only animates when active */}
                                <div className={`absolute inset-0 -m-2 rounded-full bg-primary/20 transition-opacity duration-300 ${
                                    isSliderActive ? 'opacity-100 animate-pulse' : 'opacity-0'
                                }`} />

                                {/* Thumb container with glass effect */}
                                <div className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white shadow-lg flex items-center justify-center transition-all duration-200 ${
                                    isSliderActive
                                        ? 'shadow-[0_4px_20px_rgba(99,102,241,0.4)] ring-2 ring-primary/30'
                                        : 'shadow-[0_2px_8px_rgba(0,0,0,0.15)]'
                                }`}>
                                    {/* Inner gradient background */}
                                    <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-primary via-violet-500 to-pink-500" />

                                    {/* Money icon */}
                                    <span className="relative text-xs sm:text-sm drop-shadow-sm">💵</span>

                                    {/* Glass shine effect */}
                                    <div className="absolute top-0.5 left-1 w-2 h-2 bg-white/50 rounded-full blur-[2px]" />
                                </div>
                            </div>

                            {/* Invisible range input for interaction - full height for better touch target */}
                            <input
                                type="range"
                                min={0}
                                max={downPaymentType === 'percent' ? 100 : propertyPrice}
                                step={downPaymentType === 'percent' ? 1 : 1000}
                                value={downPayment}
                                onChange={handleDownPaymentChange}
                                onMouseDown={handleSliderStart}
                                onMouseUp={handleSliderEnd}
                                onTouchStart={handleSliderStart}
                                onTouchEnd={handleSliderEnd}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                aria-label={t('calculators:mortgage.fields.downPayment')}
                            />
                        </div>
                    </div>

                    {/* Value display with input */}
                    <div className="flex items-center justify-between gap-2 mt-2">
                        <p className="text-sm font-semibold text-primary tabular-nums break-words min-w-0">{fmt(downPaymentAmount)}</p>
                        <input
                            type="number"
                            value={downPayment}
                            onChange={handleDownPaymentChange}
                            onFocus={handleSliderStart}
                            onBlur={handleSliderEnd}
                            className="w-20 flex-shrink-0 text-xs font-semibold bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-center text-neutral-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                </div>

                 <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">{t('calculators:mortgage.fields.loanTerm')}</label>
                    <div className="flex items-center space-x-1 bg-neutral-100 p-1 rounded-full border border-neutral-200">
                        {termOptions.map(term => (
                            <TermButton key={term} term={term} selectedTerm={loanTerm} onClick={setLoanTerm} yrsLabel={t('calculators:mortgage.fields.yrs')} />
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="interest-rate" className="block text-xs font-semibold text-neutral-700 mb-1">{t('calculators:mortgage.fields.interestRate')}</label>
                    <input
                        id="interest-rate"
                        type="number"
                        step="0.01"
                        min={MIN_RATE}
                        max={MAX_RATE}
                        value={interestRate}
                        onChange={handleInterestRateChange}
                        aria-invalid={!!rateError}
                        aria-describedby={rateError ? 'interest-rate-error' : undefined}
                        className={`w-full text-sm font-semibold bg-neutral-50 border rounded-md p-2 text-neutral-900 focus:ring-2 transition-all ${
                            rateError
                                ? 'border-red-300 focus:ring-red-200 focus:border-red-400'
                                : 'border-neutral-200 focus:ring-primary/20 focus:border-primary'
                        }`}
                    />
                    {rateError && (
                        <p id="interest-rate-error" role="alert" className="text-[11px] font-medium text-red-600 mt-1">{rateError}</p>
                    )}
                    <p className="text-[10px] text-neutral-500 mt-1.5">
                        {t('calculators:mortgage.rateContext', {
                            country: profile.name,
                            min: profile.rateRange.min,
                            max: profile.rateRange.max,
                            year: MORTGAGE_DATA_YEAR,
                            defaultValue: 'Typical {{country}} rate: {{min}}%–{{max}}% ({{year}} market average). Adjust for your bank\'s offer.',
                        })}
                    </p>
                </div>

                {/* Results panel */}
                <div className="rounded-2xl bg-gradient-to-br from-primary/[0.06] to-violet-500/[0.04] border border-primary/10 p-5">
                    <div className="text-center">
                        <p className="text-xs font-semibold text-neutral-600">{t('calculators:mortgage.results.estimatedMonthlyPayment')}</p>
                        <p className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent mt-1 tabular-nums break-words leading-tight px-1">
                            {fmt(monthlyPayment)}
                        </p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">{t('calculators:common.perMonth', '/month')}</p>
                    </div>

                    {breakdown.totalPayment > 0 && (
                        <>
                            {/* Donut + legend */}
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mt-5">
                                <BreakdownDonut
                                    principalPct={breakdown.principalPct}
                                    centerLabel={t('calculators:mortgage.results.totalPayment')}
                                    centerValue={fmt(breakdown.totalPayment)}
                                />
                                <div className="space-y-2.5 w-full sm:w-auto min-w-0">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PRINCIPAL_COLOR }} />
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-neutral-500 leading-tight">{t('calculators:mortgage.results.principal')}</p>
                                            <p className="text-sm font-bold text-neutral-800 tabular-nums break-words">{fmt(breakdown.loanAmount)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: INTEREST_COLOR }} />
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-neutral-500 leading-tight">{t('calculators:mortgage.results.interest')}</p>
                                            <p className="text-sm font-bold text-neutral-800 tabular-nums break-words">{fmt(breakdown.totalInterest)}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stat tiles — stacked rows on mobile, cards from sm up */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5 mt-5">
                                <StatTile
                                    label={t('calculators:mortgage.fields.loanAmount')}
                                    value={fmt(breakdown.loanAmount)}
                                    accent={PRINCIPAL_COLOR}
                                />
                                <StatTile
                                    label={t('calculators:mortgage.results.totalInterest')}
                                    value={fmt(breakdown.totalInterest)}
                                    accent={INTEREST_COLOR}
                                />
                                <StatTile
                                    label={t('calculators:mortgage.results.totalPayment')}
                                    value={fmt(breakdown.totalPayment)}
                                />
                            </div>
                            <p className="text-center text-[11px] text-neutral-400 mt-2.5">
                                {t('calculators:mortgage.breakdown.overYears', { years: loanTerm, defaultValue: 'over {{years}} years' })}
                            </p>
                        </>
                    )}
                </div>
            </div>

            <p className="text-center text-[10px] text-neutral-400 px-5 pb-4">
                {t('calculators:mortgage.disclaimer')}
            </p>
        </div>
    );
};

export default MortgageCalculator;
