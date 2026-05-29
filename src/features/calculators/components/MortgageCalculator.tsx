import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPrice, getCurrencySymbol } from '@/utils/currency';

interface MortgageCalculatorProps {
  propertyPrice: number;
  country: string;
}

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

const MortgageCalculator: React.FC<MortgageCalculatorProps> = ({ propertyPrice, country }) => {
    const { t } = useTranslation(['calculators']);
    const [downPayment, setDownPayment] = useState(20);
    const [downPaymentType, setDownPaymentType] = useState<'percent' | 'amount'>('percent');
    const [interestRate, setInterestRate] = useState(3.5);
    const [loanTerm, setLoanTerm] = useState(30);
    const [monthlyPayment, setMonthlyPayment] = useState(0);
    const [isSliderActive, setIsSliderActive] = useState(false);

    const currencySymbol = getCurrencySymbol(country);

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

    return (
        <div className="bg-white p-4 rounded-xl shadow-lg border border-neutral-200 animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">💰</span>
                <h3 className="text-base font-bold text-neutral-800">{t('calculators:mortgage.title')}</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-xs font-medium text-neutral-500">{t('calculators:mortgage.fields.propertyPrice')}</label>
                    <p className="text-lg font-bold text-neutral-800">{formatPrice(propertyPrice, country)}</p>
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
                    <div className="flex items-center justify-between mt-2">
                        <p className="text-sm font-semibold text-primary">{formatPrice(downPaymentAmount, country)}</p>
                        <input
                            type="number"
                            value={downPayment}
                            onChange={handleDownPaymentChange}
                            onFocus={handleSliderStart}
                            onBlur={handleSliderEnd}
                            className="w-20 text-xs font-semibold bg-neutral-50 border border-neutral-200 rounded-lg p-2 text-center text-neutral-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                </div>

                 <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">{t('calculators:mortgage.fields.loanTerm')}</label>
                    <div className="flex items-center space-x-1 bg-neutral-100 p-1 rounded-full border border-neutral-200">
                        {[15, 20, 25, 30].map(term => (
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
                        value={interestRate}
                        onChange={e => setInterestRate(e.target.valueAsNumber || 0)}
                        className="w-full text-sm font-semibold bg-neutral-50 border border-neutral-200 rounded-md p-2 text-neutral-900 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                </div>

                <div className="border-t border-neutral-200 pt-4 text-center">
                    <p className="text-xs font-semibold text-neutral-600">{t('calculators:mortgage.results.estimatedMonthlyPayment')}</p>
                    <p className="text-3xl font-extrabold bg-gradient-to-r from-primary via-violet-500 to-primary bg-clip-text text-transparent mt-1">
                        {formatPrice(monthlyPayment, country)}
                    </p>
                </div>
            </div>

            <p className="text-center text-[10px] text-neutral-400 mt-4">
                {t('calculators:mortgage.disclaimer')}
            </p>
        </div>
    );
};

export default MortgageCalculator;
