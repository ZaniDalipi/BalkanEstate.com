import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { formatPrice, getCurrencySymbol } from '../../../utils/currency';
import { ScaleIcon, ChevronDownIcon, ChevronUpIcon, KeyIcon, BuildingOfficeIcon } from '../../../constants';
import { InfoIcon } from 'lucide-react';

interface RentVsBuyCalculatorProps {
  propertyPrice: number;
  country: string;
}

interface CalculationInputs {
  estimatedRent: number;
  planningToStay: number;
  downPaymentPercent: number;
  interestRate: number;
  loanTerm: number;
  propertyTaxes: number;
  homeInsurance: number;
  maintenance: number;
  homeAppreciation: number;
  rentIncrease: number;
  closingCostsPercent: number;
  sellingCostsPercent: number;
  investmentReturnPercent: number;
}

interface CalculationResults {
  totalRentCost: number;
  netBuyCost: number;
  breakEvenYear?: number;
  yearlyBreakdown: {
    year: number;
    rentCost: number;
    buyCost: number;
    homeValue: number;
  }[];
}

interface TooltipProps {
  content: string;
}

const Tooltip: React.FC<TooltipProps> = ({ content }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <InfoIcon 
        className="w-4 h-4 text-neutral-400 cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      />
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-neutral-800 text-white text-xs rounded-lg w-64 z-10">
          {content}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-neutral-800"></div>
        </div>
      )}
    </div>
  );
};

const AdvancedInput: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  unit: string;
  tooltip?: string;
  validate?: (value: number) => boolean;
}> = ({ label, value, onChange, placeholder, unit, tooltip, validate }) => {
  const id = `rvb-${label.toLowerCase().replace(/\s/g, '-')}`;
  const [error, setError] = useState('');

  const handleChange = (newValue: string) => {
    onChange(newValue);
    
    if (validate) {
      const numValue = Number(newValue);
      if (newValue && !validate(numValue)) {
        setError('Invalid value');
      } else {
        setError('');
      }
    }
  };

  return (
    <div className="flex justify-between items-center text-xs">
      <div className="flex items-center gap-1">
        <label htmlFor={id} className="text-neutral-600 font-medium">{label}</label>
        {tooltip && <Tooltip content={tooltip} />}
      </div>
      <div className="relative w-28">
        <input 
          type="number"
          id={id}
          step="0.1"
          placeholder={placeholder}
          value={value}
          onChange={e => handleChange(e.target.value)} 
          className={`w-full text-xs font-semibold bg-neutral-100 border rounded-md p-1.5 text-right pr-7 focus:ring-1 focus:ring-primary focus:border-primary text-neutral-900 ${
            error ? 'border-red-300' : 'border-neutral-200'
          }`}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 font-medium pointer-events-none">{unit}</span>
        {error && (
          <div className="absolute -bottom-5 right-0 text-red-500 text-[10px]">{error}</div>
        )}
      </div>
    </div>
  );
};

const RentVsBuyCalculator: React.FC<RentVsBuyCalculatorProps> = ({ propertyPrice, country }) => {
  // --- Basic Inputs ---
  const suggestedRent = useMemo(() => Math.round(propertyPrice / 300), [propertyPrice]);
  const [estimatedRent, setEstimatedRent] = useState('');
  const [planningToStay, setPlanningToStay] = useState(8);
  
  // --- Advanced Inputs ---
  const [downPaymentPercent, setDownPaymentPercent] = useState('20');
  const [interestRate, setInterestRate] = useState('3.5');
  const [loanTerm, setLoanTerm] = useState('30');
  const [propertyTaxes, setPropertyTaxes] = useState('1.2');
  const [homeInsurance, setHomeInsurance] = useState('0.4');
  const [maintenance, setMaintenance] = useState('1.0');
  const [homeAppreciation, setHomeAppreciation] = useState('3.0');
  const [rentIncrease, setRentIncrease] = useState('2.5');
  const [closingCostsPercent, setClosingCostsPercent] = useState('3.0');
  const [sellingCostsPercent, setSellingCostsPercent] = useState('6.0');
  const [investmentReturnPercent, setInvestmentReturnPercent] = useState('7.0');
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);

  // Reserve space for results to prevent layout shift
  const [results, setResults] = useState<CalculationResults | null>(null);

  // --- Validation Functions ---
  const validatePercentage = useCallback((value: number) => value >= 0 && value <= 100, []);
  const validatePositive = useCallback((value: number) => value >= 0, []);

  // --- Calculation Hook ---
  const calculateCosts = useCallback((): CalculationResults => {
    // Parse all inputs with defaults
    const inputs: CalculationInputs = {
      estimatedRent: Number(estimatedRent) || suggestedRent,
      planningToStay,
      downPaymentPercent: Number(downPaymentPercent) || 20,
      interestRate: Number(interestRate) || 3.5,
      loanTerm: Number(loanTerm) || 30,
      propertyTaxes: Number(propertyTaxes) || 1.2,
      homeInsurance: Number(homeInsurance) || 0.4,
      maintenance: Number(maintenance) || 1.0,
      homeAppreciation: Number(homeAppreciation) || 3.0,
      rentIncrease: Number(rentIncrease) || 2.5,
      closingCostsPercent: Number(closingCostsPercent) || 3.0,
      sellingCostsPercent: Number(sellingCostsPercent) || 6.0,
      investmentReturnPercent: Number(investmentReturnPercent) || 7.0,
    };

    const {
      estimatedRent: rentValue,
      planningToStay: years,
      loanTerm: termYears,
      downPaymentPercent: dpPercent,
      interestRate: ratePercent,
      propertyTaxes: taxPercent,
      homeInsurance: insurancePercent,
      maintenance: maintenancePercent,
      homeAppreciation: appreciationPercent,
      rentIncrease: rentIncreasePercent,
      closingCostsPercent: closingCosts,
      sellingCostsPercent: sellingCosts,
      investmentReturnPercent: investmentReturn,
    } = inputs;

    // --- RENT CALCULATION ---
    let totalRentCost = 0;
    let currentAnnualRent = rentValue * 12;
    const yearlyRentCosts: number[] = [];

    for (let i = 0; i < years; i++) {
      totalRentCost += currentAnnualRent;
      yearlyRentCosts.push(currentAnnualRent);
      currentAnnualRent *= (1 + rentIncreasePercent / 100);
    }

    // Opportunity cost of down payment + closing costs if invested
    const downPaymentAmount = propertyPrice * (dpPercent / 100);
    const closingCostsAmount = propertyPrice * (closingCosts / 100);
    const totalInitialCash = downPaymentAmount + closingCostsAmount;
    
    const opportunityCost = totalInitialCash * Math.pow(1 + investmentReturn / 100, years) - totalInitialCash;

    // --- BUY CALCULATION ---
    const loanPrincipal = propertyPrice - downPaymentAmount;

    // Mortgage calculation
    const monthlyRate = (ratePercent / 100) / 12;
    const numberOfPayments = termYears * 12;
    const paymentsMade = Math.min(years * 12, numberOfPayments);

    let monthlyPayment = 0;
    if (monthlyRate > 0) {
      monthlyPayment = loanPrincipal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
                      (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    } else {
      monthlyPayment = loanPrincipal / numberOfPayments;
    }

    const totalMortgagePaid = monthlyPayment * paymentsMade;

    // Remaining principal calculation
    let remainingPrincipal = 0;
    if (monthlyRate > 0 && paymentsMade < numberOfPayments) {
      remainingPrincipal = loanPrincipal * 
        (Math.pow(1 + monthlyRate, numberOfPayments) - Math.pow(1 + monthlyRate, paymentsMade)) / 
        (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    }

    const principalPaid = loanPrincipal - remainingPrincipal;
    const interestPaid = totalMortgagePaid - principalPaid;

    // Year-by-year breakdown
    let currentPropertyValue = propertyPrice;
    let totalTaxesPaid = 0;
    let totalInsurancePaid = 0;
    let totalMaintenancePaid = 0;
    const yearlyBreakdown = [];

    for (let year = 1; year <= years; year++) {
      // Annual costs based on current property value
      const annualTaxes = currentPropertyValue * (taxPercent / 100);
      const annualInsurance = currentPropertyValue * (insurancePercent / 100);
      const annualMaintenance = currentPropertyValue * (maintenancePercent / 100);
      
      totalTaxesPaid += annualTaxes;
      totalInsurancePaid += annualInsurance;
      totalMaintenancePaid += annualMaintenance;

      // Appreciate property value
      currentPropertyValue *= (1 + appreciationPercent / 100);

      yearlyBreakdown.push({
        year,
        rentCost: yearlyRentCosts[year - 1] || 0,
        buyCost: annualTaxes + annualInsurance + annualMaintenance + (interestPaid / years),
        homeValue: currentPropertyValue,
      });
    }

    const appreciatedValue = currentPropertyValue;
    const sellingCostsAmount = appreciatedValue * (sellingCosts / 100);
    const netProceedsFromSale = appreciatedValue - remainingPrincipal - sellingCostsAmount;

    // Total costs for buying
    const totalBuyCosts = interestPaid + totalTaxesPaid + totalInsurancePaid + 
                         totalMaintenancePaid + closingCostsAmount + sellingCostsAmount;
    
    const netBuyCost = totalBuyCosts + opportunityCost - (netProceedsFromSale - downPaymentAmount);

    // Calculate break-even point
    let breakEvenYear: number | undefined;
    for (let year = 1; year <= years; year++) {
      const cumulativeRent = yearlyRentCosts.slice(0, year).reduce((sum, cost) => sum + cost, 0);
      
      // Simplified buy cost for break-even calculation
      const yearBuyCost = interestPaid * (year / years) + 
                         totalTaxesPaid * (year / years) + 
                         totalInsurancePaid * (year / years) + 
                         totalMaintenancePaid * (year / years) + 
                         closingCostsAmount + 
                         opportunityCost * (year / years);
      
      if (yearBuyCost < cumulativeRent) {
        breakEvenYear = year;
        break;
      }
    }

    return {
      totalRentCost: Math.max(0, totalRentCost),
      netBuyCost: Math.max(0, netBuyCost),
      breakEvenYear,
      yearlyBreakdown,
    };
  }, [
    propertyPrice, estimatedRent, planningToStay, loanTerm, downPaymentPercent, 
    interestRate, propertyTaxes, homeInsurance, maintenance, homeAppreciation, 
    rentIncrease, closingCostsPercent, sellingCostsPercent, investmentReturnPercent, suggestedRent
  ]);

  // --- Debounced Calculation ---
  useEffect(() => {
    setIsCalculating(true);
    const timeoutId = setTimeout(() => {
      try {
        const calculatedResults = calculateCosts();
        setResults(calculatedResults);
      } catch (error) {
        console.error('Calculation error:', error);
        setResults(null);
      } finally {
        setIsCalculating(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [calculateCosts]);

  // --- Verdict Calculation ---
  const verdict = useMemo(() => {
    if (!results) return null;
    const { totalRentCost, netBuyCost, breakEvenYear } = results;

    if (netBuyCost < totalRentCost) {
      return {
        decision: 'Buy',
        savings: totalRentCost - netBuyCost,
        color: 'text-green-600',
        breakEvenYear,
      };
    } else {
      return {
        decision: 'Rent',
        savings: netBuyCost - totalRentCost,
        color: 'text-red-600',
        breakEvenYear,
      };
    }
  }, [results]);

  const currencySymbol = getCurrencySymbol(country);
  const isBuyCheaper = verdict?.decision === 'Buy';

  return (
    <div className="bg-white p-4 rounded-xl shadow-lg border border-neutral-200 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <ScaleIcon className="w-5 h-5 text-primary" />
        <h3 className="text-base font-bold text-neutral-800">Rent vs. Buy Calculator</h3>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <label htmlFor="planning-to-stay" className="text-xs font-semibold text-neutral-700">
              Planning to stay
            </label>
            <span className="text-base font-bold text-neutral-900">{planningToStay} years</span>
          </div>
          <input 
            id="planning-to-stay"
            type="range" 
            min={1} 
            max={30}
            value={planningToStay} 
            onChange={e => setPlanningToStay(e.target.valueAsNumber)}
            className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-primary"
          />
        </div>
        
        <div className="relative">
          <input 
            type="number" 
            id="estimated-rent"
            value={estimatedRent}
            onChange={e => setEstimatedRent(e.target.value)}
            placeholder={`${currencySymbol} ${suggestedRent.toLocaleString('de-DE')}`}
            className="w-full text-sm font-semibold bg-neutral-100 border-neutral-200 border rounded-md p-2 text-neutral-900"
          />
          <label htmlFor="estimated-rent" className="block text-xs font-semibold text-neutral-700 mb-1 absolute -top-2.5 left-3 bg-white px-1 text-[11px]">
            Estimated monthly rent
          </label>
        </div>

        <div>
          <button 
            onClick={() => setShowAdvanced(!showAdvanced)} 
            className="flex justify-between items-center w-full text-xs font-semibold text-neutral-700 p-2 hover:bg-neutral-50 rounded-md transition-colors"
          >
            <span>Advanced Settings</span>
            {showAdvanced ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
          </button>
          
          {showAdvanced && (
            <div className="mt-3 space-y-3 pt-3 border-t animate-fade-in">
              <AdvancedInput 
                label="Down Payment" 
                value={downPaymentPercent} 
                onChange={setDownPaymentPercent} 
                placeholder="e.g., 20" 
                unit="%" 
                validate={validatePercentage}
                tooltip="Percentage of home price paid upfront"
              />
              <AdvancedInput 
                label="Interest Rate" 
                value={interestRate} 
                onChange={setInterestRate} 
                placeholder="e.g., 3.5" 
                unit="%" 
                validate={validatePercentage}
                tooltip="Annual mortgage interest rate"
              />
              <AdvancedInput 
                label="Loan Term" 
                value={loanTerm} 
                onChange={setLoanTerm} 
                placeholder="e.g., 30" 
                unit="yrs" 
                validate={validatePositive}
                tooltip="Length of mortgage in years"
              />
              <AdvancedInput 
                label="Property Taxes" 
                value={propertyTaxes} 
                onChange={setPropertyTaxes} 
                placeholder="e.g., 1.2" 
                unit="%/yr" 
                validate={validatePercentage}
                tooltip="Annual property tax rate (based on home value)"
              />
              <AdvancedInput 
                label="Home Insurance" 
                value={homeInsurance} 
                onChange={setHomeInsurance} 
                placeholder="e.g., 0.4" 
                unit="%/yr" 
                validate={validatePercentage}
                tooltip="Annual home insurance cost (based on home value)"
              />
              <AdvancedInput 
                label="Maintenance" 
                value={maintenance} 
                onChange={setMaintenance} 
                placeholder="e.g., 1.0" 
                unit="%/yr" 
                validate={validatePercentage}
                tooltip="Annual maintenance and repair costs (based on home value)"
              />
              <AdvancedInput 
                label="Home Appreciation" 
                value={homeAppreciation} 
                onChange={setHomeAppreciation} 
                placeholder="e.g., 3.0" 
                unit="%/yr" 
                validate={validatePercentage}
                tooltip="Expected annual home value appreciation"
              />
              <AdvancedInput 
                label="Rent Increase" 
                value={rentIncrease} 
                onChange={setRentIncrease} 
                placeholder="e.g., 2.5" 
                unit="%/yr" 
                validate={validatePercentage}
                tooltip="Expected annual rent increase"
              />
              <AdvancedInput 
                label="Closing Costs" 
                value={closingCostsPercent} 
                onChange={setClosingCostsPercent} 
                placeholder="e.g., 3.0" 
                unit="%" 
                validate={validatePercentage}
                tooltip="One-time closing costs when buying (percentage of home price)"
              />
              <AdvancedInput 
                label="Selling Costs" 
                value={sellingCostsPercent} 
                onChange={setSellingCostsPercent} 
                placeholder="e.g., 6.0" 
                unit="%" 
                validate={validatePercentage}
                tooltip="Costs when selling home (real estate commissions, fees)"
              />
              <AdvancedInput 
                label="Investment Return" 
                value={investmentReturnPercent} 
                onChange={setInvestmentReturnPercent} 
                placeholder="e.g., 7.0" 
                unit="%/yr" 
                validate={validatePercentage}
                tooltip="Expected annual return if investing money instead of buying"
              />
            </div>
          )}
        </div>

        {/* Fixed Height Results Container with Scrollable Yearly Breakdown */}
        <div className="min-h-[280px]">
          {isCalculating ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <p className="text-xs text-neutral-500 mt-2">Calculating...</p>
              </div>
            </div>
          ) : results && verdict ? (
            <div className="border-t border-neutral-200 pt-3 text-center">
              <p className="text-xs font-semibold text-neutral-600">After {planningToStay} years, it's cheaper to</p>
              <p className={`text-3xl font-extrabold my-0.5 ${verdict.color}`}>
                {verdict.decision}
              </p>
              <p className="text-sm font-semibold text-neutral-700">
                Estimated savings: {formatPrice(verdict.savings, country)}
              </p>

              {verdict.breakEvenYear && verdict.breakEvenYear <= planningToStay && (
                <p className="text-xs text-neutral-500 mt-1">
                  Break-even point: {verdict.breakEvenYear} years
                </p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className={`p-2 rounded-lg border ${!isBuyCheaper ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className={`flex items-center gap-1.5 font-bold ${!isBuyCheaper ? 'text-green-700' : 'text-red-700'}`}>
                    <BuildingOfficeIcon className="w-4 h-4"/>
                    <p className="text-sm">Rent</p>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Total Cost to Rent</p>
                  <p className={`text-base font-bold ${!isBuyCheaper ? 'text-green-700' : 'text-red-700'}`}>
                    {formatPrice(results.totalRentCost, country)}
                  </p>
                </div>
                <div className={`p-2 rounded-lg border ${isBuyCheaper ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className={`flex items-center gap-1.5 font-bold ${isBuyCheaper ? 'text-green-700' : 'text-red-700'}`}>
                    <KeyIcon className="w-4 h-4"/>
                    <p className="text-sm">Own</p>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">Net Cost to Own</p>
                  <p className={`text-base font-bold ${isBuyCheaper ? 'text-green-700' : 'text-red-700'}`}>
                    {formatPrice(results.netBuyCost, country)}
                  </p>
                </div>
              </div>

              {/* Yearly Breakdown Chart - Scrollable within fixed container */}
              {results.yearlyBreakdown.length > 0 && (
                <div className="mt-4 text-left">
                  <p className="text-xs font-semibold text-neutral-700 mb-2">Yearly Cost Comparison</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto border border-neutral-200 rounded-lg p-2 bg-neutral-50">
                    <div className="flex justify-between items-center text-xs font-semibold text-neutral-600 pb-1 border-b border-neutral-200">
                      <span>Year</span>
                      <div className="flex gap-4">
                        <span className="w-20 text-right">Rent</span>
                        <span className="w-20 text-right">Buy</span>
                      </div>
                    </div>
                    {results.yearlyBreakdown.map(({ year, rentCost, buyCost }) => (
                      <div key={year} className="flex justify-between items-center text-xs py-1">
                        <span className="text-neutral-600 font-medium">Year {year}</span>
                        <div className="flex gap-4">
                          <span className={`w-20 text-right ${rentCost < buyCost ? 'text-green-600 font-semibold' : 'text-neutral-500'}`}>
                            {formatPrice(rentCost, country)}
                          </span>
                          <span className={`w-20 text-right ${buyCost < rentCost ? 'text-green-600 font-semibold' : 'text-neutral-500'}`}>
                            {formatPrice(buyCost, country)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Empty placeholder that maintains exact same height including yearly breakdown
            <div className="border-t border-neutral-200 pt-3 h-64 invisible">
              <div className="text-center">
                <p className="text-xs font-semibold text-neutral-600">After 8 years, it's cheaper to</p>
                <p className="text-3xl font-extrabold my-0.5 text-transparent">Buy</p>
                <p className="text-sm font-semibold text-neutral-700 opacity-0">
                  Estimated savings: $0
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2 opacity-0">
                  <div className="p-2 rounded-lg border">
                    <p className="text-[11px]">Total Cost to Rent</p>
                    <p className="text-base font-bold">$0</p>
                  </div>
                  <div className="p-2 rounded-lg border">
                    <p className="text-[11px]">Net Cost to Own</p>
                    <p className="text-base font-bold">$0</p>
                  </div>
                </div>
                <div className="mt-4 text-left opacity-0">
                  <p className="text-xs font-semibold text-neutral-700 mb-2">Yearly Cost Comparison</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto border border-neutral-200 rounded-lg p-2 bg-neutral-50">
                    <div className="flex justify-between items-center text-xs">
                      <span>Year 1</span>
                      <div className="flex gap-4">
                        <span className="w-20 text-right">$0</span>
                        <span className="w-20 text-right">$0</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-[10px] text-neutral-400 mt-4">
        This is an estimate for informational purposes. Many factors can influence the costs of buying and renting.
        Consider consulting with a financial advisor for major decisions.
      </p>
    </div>
  );
};

export default RentVsBuyCalculator;