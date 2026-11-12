/** One headline number: a quiet label, the value large, its unit small. */
import React from 'react';
import { CARD } from './terrainStyles';

export interface StatTileProps {
  label: string;
  value: string;
  unit: string;
}

/** "27.13 ha" → ["27.13", "ha"]. */
export const splitUnit = (text: string): [string, string] => {
  const at = text.lastIndexOf(' ');
  return at === -1 ? [text, ''] : [text.slice(0, at), text.slice(at + 1)];
};

const StatTile: React.FC<StatTileProps> = ({ label, value, unit }) => (
  <div className={`${CARD} px-3 py-2.5`}>
    <dt className="text-xs text-gray-500">{label}</dt>
    <dd className="mt-0.5 text-xl font-semibold tracking-tight tabular-nums text-gray-900">
      {value}
      {unit && <span className="ml-1 text-[13px] font-medium text-gray-500">{unit}</span>}
    </dd>
  </div>
);

export default StatTile;
