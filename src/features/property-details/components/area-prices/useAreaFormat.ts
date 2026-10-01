/**
 * Formatters and labels for the neighbourhood prices section, chosen once
 * from what the server compared on — so no component has to know whether it
 * is showing sales, monthly rents or nightly stays.
 *
 *   sale         €1,388/m² · €118,000          "For sale" / "Sold"
 *   monthly rent €8.5/m²   · €650/mo           "For rent" / "Rented"
 *   nightly stay €80/night · €80/night         "For rent" / "Rented"
 */

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AreaPricesResponse } from '../../api/areaPricesApi';
import { fmtCompactEur, fmtEur } from './format';

export interface AreaFormat {
  isRent: boolean;
  /** True when homes are compared per m² (so a per-m² figure is worth showing). */
  showsPerSqm: boolean;
  /** A compared value: "€1,388/m²", "€8.5/m²", "€80/night". */
  value: (v: number) => string;
  /** A price or rent: "€118,000", "€650/mo", "€80/night". */
  price: (v: number) => string;
  /** Short enough for a map pin: "€118k", "€650". */
  compactPrice: (v: number) => string;
  labels: {
    active: string;
    closed: string;
    medianAsking: string;
    medianClosed: string;
    activeNearby: string;
    closedNearby: string;
    recentlyClosed: string;
    noneClosed: string;
    noneActive: string;
    stripHint: string;
    trendTitle: string;
    trendHint: string;
    askingSeries: string;
    closedSeries: string;
    /** Says what was compared when it is not the same type of home. */
    widerTypes: string;
    /** Says which rents are compared; empty for sales. */
    basisNote: string;
  };
}

type Basis = Pick<AreaPricesResponse, 'listingType' | 'rentUnit' | 'metric' | 'propertyType'>;

export function useAreaFormat(basis: Basis): AreaFormat {
  const { t } = useTranslation(['property']);
  const { listingType, rentUnit, metric, propertyType } = basis;

  return useMemo(() => {
    const isRent = listingType === 'rent';
    const isNightly = rentUnit === 'night';
    const k = (key: string, fallback: string) => t(`property:areaPrices.${key}`, fallback);

    const perUnit = !isRent ? '' : isNightly ? k('perNight', '/night') : k('perMonth', '/mo');
    const price = (v: number) => `${fmtEur(v)}${perUnit}`;
    const value = metric === 'price' ? price : (v: number) => `${fmtEur(v)}/m²`;

    return {
      isRent,
      showsPerSqm: metric === 'perSqm',
      value,
      price,
      compactPrice: fmtCompactEur,
      labels: {
        active: isRent ? k('forRent', 'For rent') : k('forSale', 'For sale'),
        closed: isRent ? k('rented', 'Rented') : k('sold', 'Sold'),
        medianAsking: isNightly ? k('medianAskingNight', 'Asking per night') : k('medianAsking', 'Asking €/m²'),
        medianClosed: isNightly
          ? k('medianRentedNight', 'Let per night')
          : isRent ? k('medianRented', 'Rented €/m²') : k('medianSold', 'Sold €/m²'),
        activeNearby: isRent ? k('forRentNearby', 'For rent nearby') : k('forSaleNearby', 'For sale nearby'),
        closedNearby: isRent ? k('rentedNearby', 'Rented nearby') : k('soldNearby', 'Sold nearby'),
        recentlyClosed: isRent ? k('recentlyRented', 'Recently rented') : k('recentlySold', 'Recently sold'),
        noneClosed: isRent ? k('noneRented', 'No rented homes nearby yet.') : k('noneSold', 'No sold homes nearby yet.'),
        noneActive: isRent
          ? k('noneActiveRent', 'No other homes for rent nearby right now.')
          : k('noneActive', 'No other homes for sale nearby right now.'),
        stripHint: isNightly
          ? k('stripHintNight', 'Each dot is a nightly let nearby, by price per night. Tap one to open it.')
          : k('stripHint', 'Each dot is a home nearby, by price per m². Tap one to open it.'),
        trendTitle: isNightly
          ? k('trendTitleNight', 'Price per night over time')
          : isRent ? k('trendTitleRent', 'Rent per m² over time') : k('trendTitle', 'Price per m² over time'),
        trendHint: isRent
          ? k('trendHintRent', 'Median per quarter: asking rent when homes were listed, and the rent when they were let.')
          : k('trendHintSale', 'Median per quarter: asking prices when homes were listed, and the price when they sold.'),
        askingSeries: k('askingPrice', 'Asking price'),
        closedSeries: isRent ? k('rentedPrice', 'Rent agreed') : k('soldPrice', 'Sold price'),
        widerTypes: propertyType === 'luxury-villa'
          ? k('villasIncluded', 'Including other villas')
          : k('allTypes', 'All property types'),
        basisNote: !isRent ? '' : isNightly
          ? k('perNightNote', 'Nightly lets only')
          : k('perMonthNote', 'Monthly rents · weekly rents converted'),
      },
    };
  }, [listingType, rentUnit, metric, propertyType, t]);
}
