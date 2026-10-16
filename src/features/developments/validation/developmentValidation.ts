/**
 * Client-side validation for development forms.
 *
 * Follows the project's validation convention (a result object), but returns an
 * i18n KEY rather than a hardcoded English string so the component translates
 * it — no English leaks into the UI layer (see CLAUDE.md → i18n, validation).
 * Validate at the form-submit boundary only.
 */
import { DEVELOPMENT_CATEGORIES, type CreateDevelopmentPayload } from '../types';

export interface FieldResult {
  isValid: boolean;
  /** Translation key under the `developments` namespace, e.g. `validation.nameRequired`. */
  errorKey?: string;
}

const NAME_MAX = 200;

export const validateDevelopmentName = (value: string): FieldResult => {
  const v = (value ?? '').trim();
  if (!v) return { isValid: false, errorKey: 'validation.nameRequired' };
  if (v.length > NAME_MAX) return { isValid: false, errorKey: 'validation.nameTooLong' };
  return { isValid: true };
};

export const validateCountry = (value: string): FieldResult =>
  (value ?? '').trim()
    ? { isValid: true }
    : { isValid: false, errorKey: 'validation.countryRequired' };

export const validateCity = (value: string): FieldResult =>
  (value ?? '').trim()
    ? { isValid: true }
    : { isValid: false, errorKey: 'validation.cityRequired' };

export const validateCategory = (value: string): FieldResult =>
  (DEVELOPMENT_CATEGORIES as readonly string[]).includes(value)
    ? { isValid: true }
    : { isValid: false, errorKey: 'validation.categoryRequired' };

/** Field-keyed errors for the create form; empty object means valid. */
export type CreateDevelopmentErrors = Partial<
  Record<'name' | 'country' | 'city' | 'category', string>
>;

/**
 * Validate the whole create payload. Returns a map of field → error key for
 * every invalid field, so the form can render all errors at once.
 */
export const validateCreateDevelopment = (
  payload: Partial<CreateDevelopmentPayload>
): CreateDevelopmentErrors => {
  const errors: CreateDevelopmentErrors = {};
  const name = validateDevelopmentName(payload.name ?? '');
  if (!name.isValid) errors.name = name.errorKey;
  const country = validateCountry(payload.country ?? '');
  if (!country.isValid) errors.country = country.errorKey;
  const city = validateCity(payload.city ?? '');
  if (!city.isValid) errors.city = city.errorKey;
  const category = validateCategory(payload.category ?? '');
  if (!category.isValid) errors.category = category.errorKey;
  return errors;
};
