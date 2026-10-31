/**
 * Field rules every unit write shares (manual edit, create, spreadsheet
 * import): outlook values from fixed lists and prices in euros only. One
 * place, so the paths can never disagree.
 */
import { UNIT_CURRENCY, UNIT_ORIENTATIONS, UNIT_VIEWS } from '../../config/developments';
import { ValidationError } from './developmentService';
import { tourUrlProblem } from './unitTour';

const CHOICES = { orientation: UNIT_ORIENTATIONS, viewType: UNIT_VIEWS } as const;
export type ChoiceField = keyof typeof CHOICES;

/** The message for a value outside a field's list, or null when it is allowed. */
export const choiceProblem = (field: ChoiceField, value: string): string | null =>
  (CHOICES[field] as readonly string[]).includes(value) ? null : `${field} must be one of: ${CHOICES[field].join(', ')}`;

export const currencyProblem = (value: string): string | null =>
  value.toUpperCase() === UNIT_CURRENCY ? null : `Prices are in euros (${UNIT_CURRENCY}); "${value}" is not accepted`;

/** Throw a ValidationError when `field` holds a value it may not. */
export const assertUnitValue = (field: string, value: string): void => {
  if (field === 'virtualTourUrl') {
    const bad = tourUrlProblem(value);
    if (bad) throw new ValidationError(bad, { code: 'URL_INVALID', field });
    return;
  }
  const problem = field === 'currency' ? currencyProblem(value) : field in CHOICES ? choiceProblem(field as ChoiceField, value) : null;
  if (problem) {
    throw new ValidationError(problem, field === 'currency' ? { code: 'CURRENCY_EUR_ONLY', field } : { code: 'FIELD_INVALID', field });
  }
};
