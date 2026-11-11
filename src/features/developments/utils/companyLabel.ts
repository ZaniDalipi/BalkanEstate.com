import type { TFunction } from 'i18next';
import type { DevelopmentBuilder } from '../types';

/** Whether the company shown is the publishing agency standing in for an unnamed builder. */
export const isAgencyCompany = (builder: Pick<DevelopmentBuilder, 'source'> | undefined): boolean => builder?.source === 'agency';

/**
 * What the company behind a residence is called on its page and links: "The
 * builder" when the owner named one, "The company" when it is the agency that
 * published the residence (it may sell rather than build it).
 */
export const companyLabel = (t: TFunction, builder: Pick<DevelopmentBuilder, 'source'> | undefined): string =>
  isAgencyCompany(builder) ? t('builderPublic.companyLabel', 'The company') : t('builderPublic.label', 'The builder');
