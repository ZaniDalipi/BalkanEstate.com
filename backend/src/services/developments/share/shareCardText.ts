/**
 * The few words on a residence's share card and link preview, in every site
 * language. Numbers are filled in with {a} {t} {n} {p}.
 */
import { SUPPORTED_LANG_CODES, type SupportedLangCode } from '../../../config/ogConstants';

export interface ShareCardWords {
  /** "{a} of {t} homes available" */
  available: string;
  /** "from {p}" */
  from: string;
  /** Under a building's name: "{n} available" */
  buildingAvailable: string;
  soldOut: string;
}

const BCS = {
  available: '{a} od {t} stanova slobodno',
  from: 'od {p}',
  buildingAvailable: '{n} slobodno',
  soldOut: 'Rasprodano',
};

export const SHARE_CARD_WORDS: Record<SupportedLangCode, ShareCardWords> = {
  en: { available: '{a} of {t} homes available', from: 'from {p}', buildingAvailable: '{n} available', soldOut: 'Sold out' },
  sq: { available: '{a} nga {t} banesa të lira', from: 'nga {p}', buildingAvailable: '{n} të lira', soldOut: 'Të shitura' },
  bs: BCS,
  hr: BCS,
  me: BCS,
  sr: { available: '{a} од {t} станова слободно', from: 'од {p}', buildingAvailable: '{n} слободно', soldOut: 'Распродато' },
  mk: { available: '{a} од {t} станови слободни', from: 'од {p}', buildingAvailable: '{n} слободни', soldOut: 'Распродадено' },
  bg: { available: '{a} от {t} жилища свободни', from: 'от {p}', buildingAvailable: '{n} свободни', soldOut: 'Разпродадено' },
  el: { available: '{a} από {t} κατοικίες διαθέσιμες', from: 'από {p}', buildingAvailable: '{n} διαθέσιμες', soldOut: 'Εξαντλήθηκε' },
  ro: { available: '{a} din {t} locuințe disponibile', from: 'de la {p}', buildingAvailable: '{n} disponibile', soldOut: 'Vândut complet' },
};

export const shareLang = (raw: unknown): SupportedLangCode =>
  (SUPPORTED_LANG_CODES as readonly string[]).includes(String(raw)) ? (raw as SupportedLangCode) : 'en';

export const fill = (template: string, values: Record<string, string | number>): string =>
  template.replace(/\{(\w)\}/g, (_, k: string) => String(values[k] ?? ''));

/** "78.000 €" — the way prices read across the site. */
export const formatEuro = (amount: number): string => `${Math.round(amount).toLocaleString('de-DE')} €`;
