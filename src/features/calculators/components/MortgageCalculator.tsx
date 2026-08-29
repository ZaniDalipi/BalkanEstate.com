import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import TouchSlider, {
  RISK_RAMP,
  TONE_BAD,
  TONE_GOOD,
  TONE_WARN,
} from '../../../components/ui/TouchSlider';
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

/**
 * Deposit health bands, as a share of the property price. Lenders across the
 * region price 20% as the "normal" deposit and treat anything under 10% as a
 * high-risk loan, so those are the two boundaries the slider colours on.
 */
const DEPOSIT_FAIR_FROM = 10;
const DEPOSIT_STRONG_FROM = 20;

/**
 * Step for the €-amount slider: ~200 stops across the track (fine enough that a
 * drag reads as continuous) rounded to a 1/2/5 figure so the number under the
 * finger still looks deliberate.
 */
function amountStepFor(price: number): number {
  if (!(price > 0)) return 1;
  const raw = price / 200;
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)));
  const normalized = raw / magnitude;
  const nice = normalized >= 5 ? 5 : normalized >= 2 ? 2 : 1;
  return Math.max(1, nice * magnitude);
}

// Categorical colours for the principal/interest split. Validated (dataviz):
// CVD ΔE 38+ between the pair; the amber's low surface contrast is covered by
// the always-present direct labels + legend below the chart.
const PRINCIPAL_COLOR = '#0252CD'; // primary blue
const INTEREST_COLOR = '#F59E0B';  // amber

const TermButton: React.FC<{ term: number, selectedTerm: number, onClick: (term: number) => void, yrsLabel: string }> = ({ term, selectedTerm, onClick, yrsLabel }) => (
    <button
        type="button"
        onClick={() => onClick(term)}
        className={`px-2 py-2.5 sm:py-1.5 rounded-full text-xs font-semibold transition-all duration-300 flex-grow text-center ${
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
const StatTile: React.FC<{ label: string; value: string; accent?: string }> = ({ label, value, accent }) => {
    // Scale the figure down as it grows so big euro totals stay on one line
    // instead of breaking mid-number.
    const len = value.length;
    const valueClass = len > 14 ? 'text-[10px]' : len > 11 ? 'text-[11px]' : len > 8 ? 'text-xs' : 'text-sm';
    return (
        <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-2.5 sm:p-3 min-w-0 flex items-center justify-between gap-3 sm:block">
            <div className="flex items-center gap-1.5 min-w-0">
                {accent && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: accent }} />}
                <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500 leading-tight">{label}</span>
            </div>
            <p className={`${valueClass} font-bold text-neutral-800 tabular-nums whitespace-nowrap leading-tight min-w-0 text-right sm:text-left sm:mt-1`} title={value}>{value}</p>
        </div>
    );
};

const MortgageCalculator: React.FC<MortgageCalculatorProps> = ({ propertyPrice, country }) => {
    const { t } = useTranslation(['calculators']);
    const profile = useMemo(() => getMortgageProfile(country), [country]);

    const [downPayment, setDownPayment] = useState(profile.defaultDownPaymentPercent);
    const [downPaymentType, setDownPaymentType] = useState<'percent' | 'amount'>('percent');
    // Rate is string-backed so the field can be empty while editing (no sticky 0)
    // and accepts decimals cleanly.
    const [rateInput, setRateInput] = useState<string>(String(profile.typicalRate));
    const [rateError, setRateError] = useState<string | undefined>();
    const [loanTerm, setLoanTerm] = useState(profile.defaultTermYears);
    const [monthlyPayment, setMonthlyPayment] = useState(0);
    const [isSliderActive, setIsSliderActive] = useState(false);
    const [dpFocused, setDpFocused] = useState(false); // blank the field only while editing

    const interestRate = parseFloat(rateInput);
    const effectiveRate = Number.isFinite(interestRate) && interestRate > 0 ? interestRate : 0;

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
        setRateInput(String(profile.typicalRate));
        setRateError(undefined);
        setLoanTerm(profile.defaultTermYears);
    }, [profile]);

    // Handle slider interaction states. The "active" flag drives the thumb's
    // enlarged/glowing look, so it lingers briefly after release.
    const restTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const handleSliderStart = useCallback(() => {
        if (restTimer.current) clearTimeout(restTimer.current);
        setIsSliderActive(true);
    }, []);
    const handleSliderEnd = useCallback(() => {
        // Keep animation running briefly after release for smooth feel
        if (restTimer.current) clearTimeout(restTimer.current);
        restTimer.current = setTimeout(() => setIsSliderActive(false), 800);
    }, []);
    useEffect(() => () => { if (restTimer.current) clearTimeout(restTimer.current); }, []);

    const downPaymentAmount = useMemo(() => {
        return downPaymentType === 'percent' ? propertyPrice * (downPayment / 100) : downPayment;
    }, [propertyPrice, downPayment, downPaymentType]);

    // Slider range: 0–100 in percent mode, 0–price in € mode. Guard against a
    // missing/zero price so the track never divides by zero (which used to
    // surface as "NaN €").
    const sliderMax = downPaymentType === 'percent' ? 100 : Math.max(0, propertyPrice);
    const sliderStep = downPaymentType === 'percent' ? 1 : amountStepFor(propertyPrice);

    const sliderPercent = sliderMax > 0 && Number.isFinite(downPayment)
        ? Math.min(100, Math.max(0, (downPayment / sliderMax) * 100))
        : 0;

    // Deposit health: the slider's colour, its bubble and the label under it all
    // answer "is this a comfortable deposit?" rather than just "how far along
    // the track am I". Both modes measure the same thing — a share of the price
    // — so the colour at a given position means the same in € and in %.
    const depositShare = propertyPrice > 0
        ? (downPaymentAmount / propertyPrice) * 100
        : (downPaymentType === 'percent' ? downPayment : 0);
    const depositTone = useMemo(() => {
        if (depositShare >= DEPOSIT_STRONG_FROM) {
            return {
                ...TONE_GOOD,
                ramp: RISK_RAMP,
                label: t('calculators:mortgage.deposit.strong', { defaultValue: 'Strong deposit' }),
                className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            };
        }
        if (depositShare >= DEPOSIT_FAIR_FROM) {
            return {
                ...TONE_WARN,
                ramp: RISK_RAMP,
                label: t('calculators:mortgage.deposit.fair', { defaultValue: 'Fair deposit' }),
                className: 'bg-amber-50 text-amber-700 border-amber-200',
            };
        }
        return {
            ...TONE_BAD,
            ramp: RISK_RAMP,
            label: t('calculators:mortgage.deposit.low', { defaultValue: 'Low deposit' }),
            className: 'bg-red-50 text-red-700 border-red-200',
        };
    }, [depositShare, t]);

    useEffect(() => {
        const principal = propertyPrice - downPaymentAmount;

        if (principal <= 0 || effectiveRate <= 0 || loanTerm <= 0) {
            setMonthlyPayment(0);
            return;
        }

        const monthlyInterestRate = (effectiveRate / 100) / 12;
        const numberOfPayments = loanTerm * 12;

        const M = principal * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1);

        setMonthlyPayment(M > 0 ? M : 0);
    }, [propertyPrice, downPaymentAmount, effectiveRate, loanTerm]);

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
            setDownPayment(Math.max(0, Math.min(Math.max(0, propertyPrice), value)));
        }
    };

    const handleDownPaymentTypeChange = (type: 'percent' | 'amount') => {
        setDownPaymentType(type);
        if (type === 'percent') {
            // Convert current amount back to percentage. With no price to divide
            // by there is no meaningful percentage — fall back to 0 rather than NaN.
            setDownPayment(propertyPrice > 0 ? Math.round((downPaymentAmount / propertyPrice) * 100) : 0);
        } else {
            // Use current calculated amount
            setDownPayment(Math.round(downPaymentAmount) || 0);
        }
    };

    const handleInterestRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let v = e.target.value.replace(',', '.'); // accept comma decimals
        if (!/^\d*\.?\d*$/.test(v)) return;       // ignore anything not numeric
        if (/^0\d/.test(v)) v = v.replace(/^0+/, ''); // drop a stuck leading zero (04 -> 4)
        setRateInput(v);

        const num = parseFloat(v);
        if (v === '' || Number.isNaN(num)) {
            setRateError(t('calculators:mortgage.errors.rateRequired', 'Enter an interest rate'));
        } else if (num < MIN_RATE || num > MAX_RATE) {
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
                            <button onClick={() => handleDownPaymentTypeChange('percent')} className={`px-3.5 py-2 sm:px-2.5 sm:py-1 rounded-full transition-all ${downPaymentType === 'percent' ? 'bg-white shadow-sm text-primary' : 'text-neutral-500'}`}>%</button>
                            <button onClick={() => handleDownPaymentTypeChange('amount')} className={`px-3.5 py-2 sm:px-2.5 sm:py-1 rounded-full transition-all ${downPaymentType === 'amount' ? 'bg-white shadow-sm text-primary' : 'text-neutral-500'}`}>{currencySymbol}</button>
                        </div>
                    </div>

                    {/* Slider. Colour runs red → amber → green along the
                        track, so where the thumb sits also says whether the
                        deposit is a comfortable one. */}
                    <div className="relative mt-2">
                        {/* Scale markers above the track */}
                        <div className="flex justify-between items-center mb-3 px-1">
                            {[0, 25, 50, 75, 100].map(mark => (
                                <span
                                    key={mark}
                                    className="text-[10px] sm:text-xs font-semibold transition-colors duration-300 min-w-[28px] text-center"
                                    style={{ color: sliderPercent >= mark ? depositTone.accent : '#A3A3A3' }}
                                >
                                    {mark}%
                                </span>
                            ))}
                        </div>

                        <TouchSlider
                            value={Number.isFinite(downPayment) ? downPayment : 0}
                            min={0}
                            max={sliderMax}
                            step={sliderStep}
                            onChange={setDownPayment}
                            onDragStart={handleSliderStart}
                            onDragEnd={handleSliderEnd}
                            disabled={sliderMax <= 0}
                            active={isSliderActive}
                            tone={depositTone}
                            icon={<span className="text-xs">💵</span>}
                            ariaLabel={t('calculators:mortgage.fields.downPayment')}
                            valueText={`${depositTone.label}: ${downPaymentType === 'percent' ? `${downPayment}%` : fmt(downPayment)}`}
                            bubbleLabel={downPaymentType === 'percent' ? `${downPayment}%` : fmt(downPayment)}
                        />
                    </div>

                    {/* Value display with input */}
                    <div className="flex items-center justify-between gap-2 mt-2">
                        <div className="min-w-0">
                            <p
                                className="text-sm font-semibold tabular-nums break-words min-w-0 transition-colors duration-300"
                                style={{ color: depositTone.accent }}
                            >
                                {fmt(downPaymentAmount)}
                            </p>
                            {/* The verdict in words: colour is never the only cue. */}
                            <span className={`inline-block mt-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${depositTone.className}`}>
                                {depositTone.label}
                            </span>
                        </div>
                        <input
                            type="number"
                            value={dpFocused && downPayment === 0 ? '' : downPayment}
                            onChange={handleDownPaymentChange}
                            onFocus={(e) => { handleSliderStart(); setDpFocused(true); e.target.select(); }}
                            onBlur={() => { handleSliderEnd(); setDpFocused(false); }}
                            placeholder="0"
                            inputMode="numeric"
                            aria-label={t('calculators:mortgage.fields.downPayment')}
                            className="w-20 flex-shrink-0 text-sm font-semibold bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-center text-neutral-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                        type="text"
                        inputMode="decimal"
                        value={rateInput}
                        onChange={handleInterestRateChange}
                        onFocus={(e) => e.target.select()}
                        onBlur={() => { if (rateInput.trim() === '' || rateInput === '.') setRateInput('0'); }}
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
