import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { formatPrice, getCurrencySymbol } from '../../../utils/currency';
import { CurrencyDollarIcon } from '../../../constants';

interface MortgageCalculatorProps {
  propertyPrice: number;
  country: string;
}

const TermButton: React.FC<{ term: number, selectedTerm: number, onClick: (term: number) => void }> = ({ term, selectedTerm, onClick }) => (
    <button
        type="button"
        onClick={() => onClick(term)}
        className={`px-2 py-1 rounded-full text-xs font-semibold transition-all duration-300 flex-grow text-center ${
            selectedTerm === term
            ? 'bg-primary text-white shadow'
            : 'text-neutral-600 hover:bg-neutral-200'
        }`}
    >
        {term} yrs
    </button>
);

const MortgageCalculator: React.FC<MortgageCalculatorProps> = ({ propertyPrice, country }) => {
    const [downPayment, setDownPayment] = useState(20);
    const [downPaymentType, setDownPaymentType] = useState<'percent' | 'amount'>('percent');
    const [interestRate, setInterestRate] = useState(3.5);
    const [loanTerm, setLoanTerm] = useState(30);
    const [monthlyPayment, setMonthlyPayment] = useState(0);

    const currencySymbol = getCurrencySymbol(country);
    
    const downPaymentAmount = useMemo(() => {
        return downPaymentType === 'percent' ? propertyPrice * (downPayment / 100) : downPayment;
    }, [propertyPrice, downPayment, downPaymentType]);

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
                <CurrencyDollarIcon className="w-5 h-5 text-primary" />
                <h3 className="text-base font-bold text-neutral-800">Mortgage Calculator</h3>
            </div>
            
            <div className="space-y-4">
                <div>
                    <label className="text-xs font-medium text-neutral-500">Property Price</label>
                    <p className="text-lg font-bold text-neutral-800">{formatPrice(propertyPrice, country)}</p>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-neutral-700">Down Payment</label>
                        <div className="bg-neutral-100 p-0.5 rounded-full flex items-center text-xs font-semibold">
                            <button onClick={() => handleDownPaymentTypeChange('percent')} className={`px-2 py-0.5 rounded-full ${downPaymentType === 'percent' ? 'bg-white shadow-sm text-primary' : 'text-neutral-500'}`}>%</button>
                            <button onClick={() => handleDownPaymentTypeChange('amount')} className={`px-2 py-0.5 rounded-full ${downPaymentType === 'amount' ? 'bg-white shadow-sm text-primary' : 'text-neutral-500'}`}>{currencySymbol}</button>
                        </div>
                    </div>
                     <div className="flex items-center gap-2">
                        <input 
                            type="range" 
                            min={0} 
                            max={downPaymentType === 'percent' ? 100 : propertyPrice}
                            step={downPaymentType === 'percent' ? 1 : 1000}
                            value={downPayment} 
                            onChange={handleDownPaymentChange}
                            className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                         <input 
                            type="number" 
                            value={downPayment}
                            onChange={handleDownPaymentChange}
                            className="w-20 text-xs font-semibold bg-neutral-50 border border-neutral-200 rounded-md p-1 text-center text-neutral-900"
                        />
                    </div>
                    <p className="text-[11px] text-right text-neutral-500 mt-1">({formatPrice(downPaymentAmount, country)})</p>
                </div>
                
                 <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Loan Term</label>
                    <div className="flex items-center space-x-1 bg-neutral-100 p-1 rounded-full border border-neutral-200">
                        {[15, 20, 25, 30].map(term => (
                            <TermButton key={term} term={term} selectedTerm={loanTerm} onClick={setLoanTerm} />
                        ))}
                    </div>
                </div>

                <div>
                    <label htmlFor="interest-rate" className="block text-xs font-semibold text-neutral-700 mb-1">Interest Rate (%)</label>
                    <input 
                        id="interest-rate"
                        type="number" 
                        step="0.01" 
                        value={interestRate} 
                        onChange={e => setInterestRate(e.target.valueAsNumber || 0)}
                        className="w-full text-sm font-semibold bg-neutral-50 border border-neutral-200 rounded-md p-1.5 text-neutral-900"
                    />
                </div>

                <div className="border-t border-neutral-200 pt-3 text-center">
                    <p className="text-xs font-semibold text-neutral-600">Estimated Monthly Payment</p>
                    <p className="text-2xl font-extrabold text-primary mt-0.5">
                        {formatPrice(monthlyPayment, country)}
                    </p>
                </div>
            </div>
            
            <p className="text-center text-[10px] text-neutral-400 mt-4">
                This is an estimate for informational purposes only. Consult with a financial professional for actual rates and payments.
            </p>
        </div>
    );
};

export default MortgageCalculator;