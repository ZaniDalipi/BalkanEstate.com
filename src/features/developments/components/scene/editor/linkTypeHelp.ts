import type { TFunction } from 'i18next';
import type { HotspotLinkType } from '../../../types';

/** One-line explanation of what a region does for each link type (editor help). */
export const linkTypeHelp = (t: TFunction, lt: HotspotLinkType): string => {
  switch (lt) {
    case 'building':
      return t(
        'editor.linkHelp.building',
        'Opens that building. Use on the residence picture: buyers click a building to see its own pictures (or its apartments floor by floor).'
      );
    case 'floor':
      return t('editor.linkHelp.floor', 'Opens that floor’s picture, e.g. a floor plan where each apartment is clickable.');
    case 'unit':
      return t(
        'editor.linkHelp.unit',
        'An apartment from your Inventory. The card shows its number, floor, m², bedrooms, price and live status; clicking opens its details. Use this for apartments you sell in this residence.'
      );
    case 'listing':
      return t(
        'editor.linkHelp.listing',
        'A published BalkanEstate listing (e.g. a resale flat). The card shows the listing’s photo, price, m², floor and rooms; clicking opens the listing page. To show a listing on one of your apartments, link the region to the unit and attach the listing to that unit instead.'
      );
    case 'entrance':
      return t('editor.linkHelp.entrance', 'Marks a building entrance. It shows a label but does not open anything.');
    default:
      return '';
  }
};
