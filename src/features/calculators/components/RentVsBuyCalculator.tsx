import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import TouchSlider, { TONE_GOOD, TONE_WARN } from '@/src/components/ui/TouchSlider';
import { formatPrice, getCurrencySymbol } from '@/utils/currency';
import { ChevronDownIcon, ChevronUpIcon } from '@/constants';
import { InfoIcon } from 'lucide-react';

/** Horizon the "planning to stay" slider covers, in years. */
const STAY_MIN = 1;
const STAY_MAX = 30;

/**
 * The horizon slider is coloured by outcome: a short stay favours renting
 * (amber), a long one favours owning (green), and the crossover is exactly the
 * break-even year the results panel names. The ramp is positional, so the
 * colour under the thumb answers "does staying this long pay off?".
 */
const STAY_RAMP =
  'linear-gradient(90deg, #F97316 0%, #F59E0B 20%, #FACC15 38%, #A3E635 55%, #22C55E 72%, #059669 100%)';

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
  invalidValueText?: string;
}> = ({ label, value, onChange, placeholder, unit, tooltip, validate, invalidValueText = 'Invalid value' }) => {
  const id = `rvb-${label.toLowerCase().replace(/\s/g, '-')}`;
  const [error, setError] = useState('');

  const handleChange = (newValue: string) => {
    onChange(newValue);

    if (validate) {
      const numValue = Number(newValue);
      if (newValue && !validate(numValue)) {
        setError(invalidValueText);
      } else {
        setError('');
      }
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-[11px] text-neutral-600 font-medium leading-tight">{label}</label>
        {tooltip && <Tooltip content={tooltip} />}
      </div>
      <div className="relative">
        <input
          type="number"
          id={id}
          step="0.1"
          placeholder={placeholder}
          value={value}
          onChange={e => handleChange(e.target.value)}
          className={`w-full text-sm font-semibold bg-neutral-50 border rounded-lg p-2.5 text-right pr-12 focus:ring-2 focus:ring-primary/20 focus:border-primary text-neutral-900 transition-all ${
            error ? 'border-red-300 bg-red-50' : 'border-neutral-200'
          }`}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 font-medium pointer-events-none">{unit}</span>
        {error && (
          <div className="text-red-500 text-[10px] mt-1">{error}</div>
        )}
      </div>
    </div>
  );
};

// Group header component for advanced settings
const SettingsGroup: React.FC<{
  icon: string;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 pb-1 border-b border-neutral-100">
      <span className="text-sm">{icon}</span>
      <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wide">{title}</h4>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {children}
    </div>
  </div>
);

const RentVsBuyCalculator: React.FC<RentVsBuyCalculatorProps> = ({ propertyPrice, country }) => {
  const { t } = useTranslation(['calculators']);
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
        // Error removed
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

  // Thumb, headline and glow take the verdict's colour, so the slider and the
  // "cheaper to Buy/Rent" result below it never disagree. Results are debounced,
  // so hold the last verdict while a recalculation is in flight rather than
  // flashing back to the neutral colour mid-drag.
  const lastDecision = useRef<'Buy' | 'Rent'>('Rent');
  if (verdict) lastDecision.current = verdict.decision as 'Buy' | 'Rent';
  const decision = verdict?.decision ?? lastDecision.current;
  const stayTone = useMemo(
    () => ({ ...(decision === 'Buy' ? TONE_GOOD : TONE_WARN), ramp: STAY_RAMP }),
    [decision],
  );

  // Break-even is only known once it falls inside the chosen horizon; when it
  // does, mark it on the track so the crossover has a position, not just a number.
  const stayTicks = useMemo(() => {
    const year = results?.breakEvenYear;
    if (!year || year < STAY_MIN || year > STAY_MAX) return undefined;
    return [{
      percent: ((year - STAY_MIN) / (STAY_MAX - STAY_MIN)) * 100,
      title: `${t('calculators:rentVsBuy.results.breakEvenPoint')}: ${year} ${t('calculators:rentVsBuy.fields.years')}`,
    }];
  }, [results?.breakEvenYear, t]);

  return (
    <div className="bg-white p-4 rounded-xl shadow-lg border border-neutral-200 animate-fade-in">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">⚖️</span>
        <h3 className="text-base font-bold text-neutral-800">{t('calculators:rentVsBuy.title')}</h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <label className="text-xs font-semibold text-neutral-700">
              {t('calculators:rentVsBuy.fields.planningToStay')}
            </label>
            {/* Reads in the verdict's colour, matching the track under it.
                The permanent pulse was dropped: it competed with the drag. */}
            <span
              className="text-lg font-bold tabular-nums transition-colors duration-300"
              style={{ color: stayTone.accent }}
            >
              {planningToStay} {t('calculators:rentVsBuy.fields.years')}
            </span>
          </div>

          <TouchSlider
            id="planning-to-stay"
            value={planningToStay}
            min={STAY_MIN}
            max={STAY_MAX}
            step={1}
            onChange={setPlanningToStay}
            tone={stayTone}
            ticks={stayTicks}
            ariaLabel={t('calculators:rentVsBuy.fields.planningToStay')}
            valueText={`${planningToStay} ${t('calculators:rentVsBuy.fields.years')}`}
            icon={
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
            }
          />

          {/* Year markers */}
          <div className="flex justify-between px-1 mt-1">
            {[1, 10, 20, 30].map(year => (
              <span
                key={year}
                className="text-[10px] font-semibold transition-colors duration-300"
                style={{ color: planningToStay >= year ? stayTone.accent : '#A3A3A3' }}
              >
                {year}y
              </span>
            ))}
          </div>
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
            {t('calculators:rentVsBuy.fields.estimatedMonthlyRent')}
          </label>
        </div>

        <div>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex justify-between items-center w-full text-xs font-semibold text-neutral-700 p-2 hover:bg-neutral-50 rounded-md transition-colors"
          >
            <span>{t('calculators:rentVsBuy.advanced.title')}</span>
            {showAdvanced ? <ChevronUpIcon className="w-4 h-4"/> : <ChevronDownIcon className="w-4 h-4"/>}
          </button>
          
          {showAdvanced && (
            <div className="mt-4 space-y-5 pt-4 border-t border-neutral-200 animate-fade-in">
              {/* Loan Settings */}
              <SettingsGroup icon="🏦" title={t('calculators:rentVsBuy.groups.loanSettings')}>
                <AdvancedInput
                  label={t('calculators:rentVsBuy.advanced.downPayment')}
                  value={downPaymentPercent}
                  onChange={setDownPaymentPercent}
                  placeholder="20"
                  unit="%"
                  validate={validatePercentage}
                  tooltip={t('calculators:rentVsBuy.tooltips.downPayment')}
                  invalidValueText={t('calculators:common.invalidValue')}
                />
                <AdvancedInput
                  label={t('calculators:rentVsBuy.advanced.interestRate')}
                  value={interestRate}
                  onChange={setInterestRate}
                  placeholder="3.5"
                  unit="%"
                  validate={validatePercentage}
                  tooltip={t('calculators:rentVsBuy.tooltips.interestRate')}
                  invalidValueText={t('calculators:common.invalidValue')}
                />
                <div className="sm:col-span-2">
                  <AdvancedInput
                    label={t('calculators:rentVsBuy.advanced.loanTerm')}
                    value={loanTerm}
                    onChange={setLoanTerm}
                    placeholder="30"
                    unit={t('calculators:mortgage.fields.yrs')}
                    validate={validatePositive}
                    tooltip={t('calculators:rentVsBuy.tooltips.loanTerm')}
                    invalidValueText={t('calculators:common.invalidValue')}
                  />
                </div>
              </SettingsGroup>

              {/* Property Costs */}
              <SettingsGroup icon="🏠" title={t('calculators:rentVsBuy.groups.propertyCosts')}>
                <AdvancedInput
                  label={t('calculators:rentVsBuy.advanced.propertyTaxes')}
                  value={propertyTaxes}
                  onChange={setPropertyTaxes}
                  placeholder="1.2"
                  unit="%/yr"
                  validate={validatePercentage}
                  tooltip={t('calculators:rentVsBuy.tooltips.propertyTaxes')}
                  invalidValueText={t('calculators:common.invalidValue')}
                />
                <AdvancedInput
                  label={t('calculators:rentVsBuy.advanced.homeInsurance')}
                  value={homeInsurance}
                  onChange={setHomeInsurance}
                  placeholder="0.4"
                  unit="%/yr"
                  validate={validatePercentage}
                  tooltip={t('calculators:rentVsBuy.tooltips.homeInsurance')}
                  invalidValueText={t('calculators:common.invalidValue')}
                />
                <div className="sm:col-span-2">
                  <AdvancedInput
                    label={t('calculators:rentVsBuy.advanced.maintenance')}
                    value={maintenance}
                    onChange={setMaintenance}
                    placeholder="1.0"
                    unit="%/yr"
                    validate={validatePercentage}
                    tooltip={t('calculators:rentVsBuy.tooltips.maintenance')}
                    invalidValueText={t('calculators:common.invalidValue')}
                  />
                </div>
              </SettingsGroup>

              {/* Market Assumptions */}
              <SettingsGroup icon="📈" title={t('calculators:rentVsBuy.groups.marketAssumptions')}>
                <AdvancedInput
                  label={t('calculators:rentVsBuy.advanced.homeAppreciation')}
                  value={homeAppreciation}
                  onChange={setHomeAppreciation}
                  placeholder="3.0"
                  unit="%/yr"
                  validate={validatePercentage}
                  tooltip={t('calculators:rentVsBuy.tooltips.homeAppreciation')}
                  invalidValueText={t('calculators:common.invalidValue')}
                />
                <AdvancedInput
                  label={t('calculators:rentVsBuy.advanced.rentIncrease')}
                  value={rentIncrease}
                  onChange={setRentIncrease}
                  placeholder="2.5"
                  unit="%/yr"
                  validate={validatePercentage}
                  tooltip={t('calculators:rentVsBuy.tooltips.rentIncrease')}
                  invalidValueText={t('calculators:common.invalidValue')}
                />
              </SettingsGroup>

              {/* Transaction Costs */}
              <SettingsGroup icon="💰" title={t('calculators:rentVsBuy.groups.transactionCosts')}>
                <AdvancedInput
                  label={t('calculators:rentVsBuy.advanced.closingCosts')}
                  value={closingCostsPercent}
                  onChange={setClosingCostsPercent}
                  placeholder="3.0"
                  unit="%"
                  validate={validatePercentage}
                  tooltip={t('calculators:rentVsBuy.tooltips.closingCosts')}
                  invalidValueText={t('calculators:common.invalidValue')}
                />
                <AdvancedInput
                  label={t('calculators:rentVsBuy.advanced.sellingCosts')}
                  value={sellingCostsPercent}
                  onChange={setSellingCostsPercent}
                  placeholder="6.0"
                  unit="%"
                  validate={validatePercentage}
                  tooltip={t('calculators:rentVsBuy.tooltips.sellingCosts')}
                  invalidValueText={t('calculators:common.invalidValue')}
                />
              </SettingsGroup>

              {/* Investment */}
              <SettingsGroup icon="📊" title={t('calculators:rentVsBuy.groups.investment')}>
                <div className="sm:col-span-2">
                  <AdvancedInput
                    label={t('calculators:rentVsBuy.advanced.investmentReturn')}
                    value={investmentReturnPercent}
                    onChange={setInvestmentReturnPercent}
                    placeholder="7.0"
                    unit="%/yr"
                    validate={validatePercentage}
                    tooltip={t('calculators:rentVsBuy.tooltips.investmentReturn')}
                    invalidValueText={t('calculators:common.invalidValue')}
                  />
                </div>
              </SettingsGroup>
            </div>
          )}
        </div>

        {/* Fixed Height Results Container with Scrollable Yearly Breakdown */}
        <div className="min-h-[280px]">
          {isCalculating ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <p className="text-xs text-neutral-500 mt-2">{t('calculators:rentVsBuy.calculating')}</p>
              </div>
            </div>
          ) : results && verdict ? (
            <div className="border-t border-neutral-200 pt-3 text-center">
              <p className="text-xs font-semibold text-neutral-600">{t('calculators:rentVsBuy.results.cheaperTo', { years: planningToStay })}</p>
              <p className={`text-3xl font-extrabold my-0.5 ${verdict.color}`}>
                {verdict.decision === 'Buy' ? t('calculators:rentVsBuy.results.buy') : t('calculators:rentVsBuy.results.rent')}
              </p>
              <p className="text-sm font-semibold text-neutral-700">
                {t('calculators:rentVsBuy.results.estimatedSavings')}: {formatPrice(verdict.savings, country)}
              </p>

              {verdict.breakEvenYear && verdict.breakEvenYear <= planningToStay && (
                <p className="text-xs text-neutral-500 mt-1">
                  {t('calculators:rentVsBuy.results.breakEvenPoint')}: {verdict.breakEvenYear} {t('calculators:rentVsBuy.fields.years')}
                </p>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className={`p-2 rounded-lg border ${!isBuyCheaper ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className={`flex items-center gap-1.5 font-bold ${!isBuyCheaper ? 'text-green-700' : 'text-red-700'}`}>
                    <span>🏢</span>
                    <p className="text-sm">{t('calculators:rentVsBuy.results.rent')}</p>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{t('calculators:rentVsBuy.results.totalCostToRent')}</p>
                  <p className={`text-base font-bold ${!isBuyCheaper ? 'text-green-700' : 'text-red-700'}`}>
                    {formatPrice(results.totalRentCost, country)}
                  </p>
                </div>
                <div className={`p-2 rounded-lg border ${isBuyCheaper ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className={`flex items-center gap-1.5 font-bold ${isBuyCheaper ? 'text-green-700' : 'text-red-700'}`}>
                    <span>🏠</span>
                    <p className="text-sm">{t('calculators:rentVsBuy.results.own')}</p>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{t('calculators:rentVsBuy.results.netCostToOwn')}</p>
                  <p className={`text-base font-bold ${isBuyCheaper ? 'text-green-700' : 'text-red-700'}`}>
                    {formatPrice(results.netBuyCost, country)}
                  </p>
                </div>
              </div>

              {/* Yearly Breakdown Chart - Scrollable within fixed container */}
              {results.yearlyBreakdown.length > 0 && (
                <div className="mt-4 text-left">
                  <p className="text-xs font-semibold text-neutral-700 mb-2">{t('calculators:rentVsBuy.results.yearlyCostComparison')}</p>
                  <div className="space-y-1 max-h-32 overflow-y-auto border border-neutral-200 rounded-lg p-2 bg-neutral-50">
                    <div className="flex justify-between items-center text-xs font-semibold text-neutral-600 pb-1 border-b border-neutral-200">
                      <span>{t('calculators:rentVsBuy.results.year')}</span>
                      <div className="flex gap-4">
                        <span className="w-20 text-right">{t('calculators:rentVsBuy.results.rent')}</span>
                        <span className="w-20 text-right">{t('calculators:rentVsBuy.results.buy')}</span>
                      </div>
                    </div>
                    {results.yearlyBreakdown.map(({ year, rentCost, buyCost }) => (
                      <div key={year} className="flex justify-between items-center text-xs py-1">
                        <span className="text-neutral-600 font-medium">{t('calculators:rentVsBuy.results.year')} {year}</span>
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
        {t('calculators:rentVsBuy.disclaimer')}
      </p>
    </div>
  );
};

export default RentVsBuyCalculator;