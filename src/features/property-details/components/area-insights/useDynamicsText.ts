import { useTranslation } from 'react-i18next';
import type { ZoneDynamics } from '../../api/areaPricesApi';

export interface DynamicsText {
  headline: string;
  description: string;
  facts: string[];
}

/** The verdict, its explanation and the figures behind it, for sales or lets. */
export function useDynamicsText(dynamics: ZoneDynamics, isRent: boolean): DynamicsText {
  const { t, i18n } = useTranslation(['property']);
  const number = (v: number) => new Intl.NumberFormat(i18n.language, { maximumFractionDigits: 1 }).format(v);

  if (dynamics.status === 'insufficient') {
    return {
      headline: '',
      description: isRent
        ? t('property:areaInsights.dynamics.insufficientRent', "Not enough recent lets nearby to tell whether this area favours tenants or landlords.")
        : t('property:areaInsights.dynamics.insufficient', "Not enough recent sales nearby to tell whether this is a buyer's or a seller's market."),
      facts: [],
    };
  }

  const headlines = isRent
    ? {
        seller: t('property:areaInsights.dynamics.rent.seller.title', "This area is a landlord's market"),
        balanced: t('property:areaInsights.dynamics.rent.balanced.title', 'This area is a balanced rental market'),
        buyer: t('property:areaInsights.dynamics.rent.buyer.title', "This area is a tenant's market"),
      }
    : {
        seller: t('property:areaInsights.dynamics.sale.seller.title', "This area is a seller's market"),
        balanced: t('property:areaInsights.dynamics.sale.balanced.title', 'This area is a balanced market'),
        buyer: t('property:areaInsights.dynamics.sale.buyer.title', "This area is a buyer's market"),
      };
  const descriptions = isRent
    ? {
        seller: t('property:areaInsights.dynamics.rent.seller.text', 'Few homes to let — good ones are taken quickly.'),
        balanced: t('property:areaInsights.dynamics.rent.balanced.text', 'Homes to let and tenants are in balance.'),
        buyer: t('property:areaInsights.dynamics.rent.buyer.text', 'Plenty of homes to let — tenants can compare and negotiate.'),
      }
    : {
        seller: t('property:areaInsights.dynamics.sale.seller.text', 'Low supply — good homes sell quickly, with little room to negotiate.'),
        balanced: t('property:areaInsights.dynamics.sale.balanced.text', 'Supply and demand are even — prices are usually negotiable within reason.'),
        buyer: t('property:areaInsights.dynamics.sale.buyer.text', 'Plenty of choice — buyers have time to compare and room to negotiate.'),
      };

  const facts = [
    t('property:areaInsights.dynamics.onMarket', '{{count}} on the market', { count: dynamics.activeCount }),
    isRent
      ? t('property:areaInsights.dynamics.letLastYear', '{{count}} let in the last 12 months', { count: dynamics.closedLastYear })
      : t('property:areaInsights.dynamics.soldLastYear', '{{count}} sold in the last 12 months', { count: dynamics.closedLastYear }),
    t('property:areaInsights.dynamics.supply', '≈ {{months}} months of supply', { months: number(dynamics.monthsOfSupply) }),
  ];
  if (dynamics.medianDaysOnMarket !== null) {
    facts.push(isRent
      ? t('property:areaInsights.dynamics.daysToLet', 'Typically let in {{count}} days', { count: dynamics.medianDaysOnMarket })
      : t('property:areaInsights.dynamics.daysToSell', 'Typically sold in {{count}} days', { count: dynamics.medianDaysOnMarket }));
  }

  return { headline: headlines[dynamics.verdict], description: descriptions[dynamics.verdict], facts };
}
