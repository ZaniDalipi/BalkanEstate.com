import { useTranslation } from 'react-i18next';
import { UNIT_ORIENTATIONS, UNIT_TYPES, UNIT_VIEWS } from '../../../types';
import type { SelectOption } from '../../shared/FormSelect';

/**
 * Labelled options for the unit editor's dropdowns. A value already on the
 * unit that is not in the list (e.g. an older free-text entry) stays
 * selectable, so opening the editor never silently changes it.
 */
export const useUnitChoices = () => {
  const { t } = useTranslation('developments');
  const withCurrent = (options: SelectOption[], current: string): SelectOption[] =>
    current && !options.some((o) => o.value === current) ? [...options, { value: current, label: current }] : options;
  return {
    types: (current: string) => withCurrent(UNIT_TYPES.map((v) => ({ value: v, label: t(`explorer.unitType.${v}`, v) })), current),
    orientations: (current: string) =>
      withCurrent(UNIT_ORIENTATIONS.map((v) => ({ value: v, label: t(`explorer.orientation.${v.toLowerCase()}`, v) })), current),
    views: (current: string) => withCurrent(UNIT_VIEWS.map((v) => ({ value: v, label: t(`unitView.${v}`, v) })), current),
  };
};
