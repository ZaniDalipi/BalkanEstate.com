/**
 * ZoneDynamicsCard — is the area around this home a buyer's or a seller's
 * market? Uses the months of supply the area-prices endpoint already works out
 * from nearby listings, so it shares that query and costs no extra request.
 *
 * Laid out as a plain page section: title with ⓘ, the verdict in bold, what
 * it means, and a buyer → seller bar. The figures behind it sit in the ⓘ.
 */

import React, { useId } from 'react';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/types';
import { useAreaPrices } from '../../hooks/useAreaPrices';
import type { ZoneDynamics } from '../../api/areaPricesApi';
import MarketGauge from './MarketGauge';
import InfoPopover from './InfoPopover';
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
  const headingId = useId();
  const text = useDynamicsText(dynamics, isRent);
  const title = t('property:areaInsights.dynamics.title', 'Zone dynamics');

  return (
    <section aria-labelledby={headingId} className="py-2">
      <div className="flex items-center gap-1">
        <h3 id={headingId} className="text-xl sm:text-2xl landscape:text-lg font-bold text-neutral-900">{title}</h3>
        <InfoPopover topic={title} align="start">
          <p>
            {t(
              'property:areaInsights.dynamics.explain',
              'Months of supply: the homes on the market nearby, divided by how many sold each month over the last year. Under 4 months favours sellers, over 7 favours buyers.'
            )}
          </p>
          {text.facts.length > 0 && (
            <ul className="mt-3 space-y-1 tabular-nums text-neutral-800">
              {text.facts.map((fact) => <li key={fact}>{fact}</li>)}
            </ul>
          )}
        </InfoPopover>
      </div>

      {dynamics.status === 'ok' ? (
        <>
          <p className="mt-1 text-base sm:text-lg landscape:text-base font-semibold text-neutral-900">{text.headline}</p>
          <p className="mt-0.5 text-base sm:text-lg landscape:text-base leading-relaxed text-neutral-600">{text.description}</p>
          <MarketGauge score={dynamics.score} isRent={isRent} />
        </>
      ) : (
        <p className="mt-1 text-base text-neutral-600">{text.description}</p>
      )}
    </section>
  );
};

export default ZoneDynamicsCard;
