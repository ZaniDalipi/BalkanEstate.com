import React from 'react';
import { AppLink } from '@/src/app/router/AppLink';
import { paths } from '@/src/app/router/paths';
import type { PriceTableCountry, PriceTableRow } from '../../types';
import { countryLabel, formatCount } from '../../utils/marketPageText';
import { priceCell, priceColumns } from '../../utils/priceTableText';
import { useMarketText } from '../../hooks/useMarketText';

const CELL = 'px-3 py-2 text-right tabular-nums whitespace-nowrap';

/** One country's table: the whole country, then each city, sale and rent side by side. */
const PriceCountryTable: React.FC<{ country: PriceTableCountry }> = ({ country }) => {
  const { t, lang } = useMarketText();
  const columns = priceColumns(t);
  const name = countryLabel(t, country);
  const titleId = `prices-${country.slug}`;

  const row = (place: PriceTableRow, label: React.ReactNode, total = false) => (
    <tr key={place.slug} className={total ? 'bg-neutral-50 font-semibold' : 'border-t border-neutral-100'}>
      {/* Pinned, so the place stays in view while the figures scroll sideways on a phone. */}
      <th scope="row" className={`sticky left-0 z-10 px-3 py-2 text-left font-medium text-neutral-900 ${total ? 'bg-neutral-50' : 'bg-white'}`}>
        {label}
      </th>
      {columns.map((column) => {
        const value = column.value(place);
        return (
          <td key={column.key} className={CELL}>
            {column.count ? formatCount(value ?? 0, lang) : priceCell(value, lang)}
          </td>
        );
      })}
    </tr>
  );

  return (
    <section aria-labelledby={titleId} className="mt-8">
      <h2 id={titleId} className="text-lg font-semibold">
        <AppLink to={paths.market('sale', country.slug)} className="text-neutral-900 hover:text-primary-700">{name}</AppLink>
      </h2>
      {/* The table scrolls inside its frame on a narrow screen; the page itself never scrolls sideways. */}
      <div className="mt-3 overflow-x-auto rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <table className="w-full min-w-[680px] text-sm">
          <caption className="sr-only">{name}</caption>
          <thead className="text-neutral-600">
            <tr>
              <th scope="col" rowSpan={2} className="sticky left-0 z-10 bg-white px-3 py-2 text-left align-bottom">
                {t('marketPages:prices.place', { defaultValue: 'Place' })}
              </th>
              <th scope="colgroup" colSpan={3} className="border-b border-neutral-100 px-3 pt-2 text-center text-neutral-900">
                {t('marketPages:switch.sale', { defaultValue: 'For sale' })}
              </th>
              <th scope="colgroup" colSpan={3} className="border-b border-neutral-100 px-3 pt-2 text-center text-neutral-900">
                {t('marketPages:switch.rent', { defaultValue: 'For rent' })}
              </th>
            </tr>
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-3 py-2 text-right font-medium">{column.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {row(country, t('marketPages:prices.wholeCountry', { defaultValue: 'Whole country' }), true)}
            {country.cities.map((city) =>
              row(city, <AppLink to={paths.market('sale', country.slug, city.slug)} className="hover:text-primary-700">{city.name}</AppLink>))}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default PriceCountryTable;
