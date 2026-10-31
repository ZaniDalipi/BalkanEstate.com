import { BALKAN_LOCATIONS } from '@/utils/balkanLocations';
import { BALKAN_PHONE_CODES } from '@/constants/phoneCountryCodes';

/** The dial code of a catalog country ("Albania" → "+355"), for preselecting the phone field. */
export const dialCodeForCountry = (country: string): string | undefined => {
  const iso = BALKAN_LOCATIONS.find((c) => c.name === country)?.code;
  return iso ? BALKAN_PHONE_CODES.find((p) => p.country === iso)?.code : undefined;
};
