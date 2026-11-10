/**
 * ZoneDynamicsCard — is the area around this home a buyer's or a seller's
 * market? Uses the months of supply the area-prices endpoint already works out
 * from nearby listings, so it shares that query and costs no extra request.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/types';
import { useAreaPrices } from '../../hooks/useAreaPrices';
import type { ZoneDynamics } from '../../api/areaPricesApi';
import MarketGauge from './MarketGauge';
import HowMeasured from './HowMeasured';
import { useDynamicsText } from './useDynamicsText';

export interface ZoneDynamicsCardProps {
  property: Pick<Property, 'id' | 'listingType'>;
}

const ZoneDynamicsCard: React.FC<ZoneDynamicsCardProps> = ({ property }) => {
  const { data } = useAreaPrices(property.id);
  // Loading and errors are shown by the neighbourhood prices section, which
  // runs the same query; an older server sends no dynamics at all.
  if (!data?.dynamics) return null;
  return <ZoneDynamicsBody dynamics={data.dynamics} isRent={property.listingType === 'rent'} />;
};

const ZoneDynamicsBody: React.FC<{ dynamics: ZoneDynamics; isRent: boolean }> = ({ dynamics, isRent }) => {
  const { t } = useTranslation(['property']);
  const text = useDynamicsText(dynamics, isRent);

  return (
    <section
      aria-labelledby="zone-dynamics-title"
      className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6 landscape:p-3 shadow-sm"
    >
      <h3 id="zone-dynamics-title" className="text-lg sm:text-xl landscape:text-base font-bold text-neutral-800">
        {t('property:areaInsights.dynamics.title', 'Zone dynamics')}
      </h3>

      {dynamics.status === 'ok' ? (
        <>
          <p className="mt-1 font-semibold text-neutral-900">{text.headline}</p>
          <p className="mt-0.5 text-neutral-600">{text.description}</p>
          <MarketGauge score={dynamics.score} isRent={isRent} />
          <ul className="mt-4 landscape:mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-neutral-500">
            {text.facts.map((fact) => <li key={fact}>{fact}</li>)}
          </ul>
        </>
      ) : (
        <p className="mt-1 text-sm text-neutral-600">{text.description}</p>
      )}

      <HowMeasured>
        <p>
          {t(
            'property:areaInsights.dynamics.explain',
            'Months of supply: the homes on the market nearby, divided by how many sold each month over the last year. Under 4 months favours sellers, over 7 favours buyers.'
          )}
        </p>
      </HowMeasured>
    </section>
  );
};

export default ZoneDynamicsCard;
