import {
  mapConditionValue,
  mapFurnishingValue,
  mapHeatingValue,
  mapOrientationValue,
  mapViewValue,
  parseDistanceValue,
} from './attributeValues';
import { fieldForLabel, type AttributeField } from './labelMap';

export type MappedListing = Record<string, unknown>;

/**
 * Write one attribute value into `target` under its canonical field, parsing
 * and range-checking it on the way. Fields that are already filled are left
 * alone (the first, most specific source wins) — except a price that was
 * clearly collapsed by a dot-thousands parse ("620.000" → 620).
 */
export const applyAttribute = (target: MappedListing, field: AttributeField, valueRaw: string): void => {
  const v = valueRaw.trim();
  if (!v) return;

  if (field === 'price') {
    // Override if no price yet, OR if the existing value is a bare integer < 1000
    // (likely a dot-thousands price that JSON already collapsed: "620.000" → 620).
    const existing = target.price;
    const existingIsCollapsed = typeof existing === 'number' && existing < 1000;
    if (!existing || existingIsCollapsed) target.price = v;
  } else if (field === 'sqft' && !target.sqft) {
    // Extract the leading numeric part, using the same separator logic as
    // normalizePriceNumeric so "1.500 m²" → 1500 but "180.5 m²" → 180.5.
    const m = v.match(/(\d[\d.,\s]*\d|\d)/);
    if (m) {
      const raw = m[1].replace(/ /g, ' ').trim();
      // Dot-thousands: "1.500" → if 3 digits after last dot and no comma, strip dot
      const stripped = /^\d{1,3}(\.\d{3})+$/.test(raw)
        ? raw.replace(/\./g, '')
        : raw.replace(/\s/g, '').replace(',', '.');
      const n = parseFloat(stripped);
      if (n >= 10 && n <= 50_000) target.sqft = n;
    }
  } else if (field === 'plotSqm' && !target.plotSqm) {
    const m = v.match(/(\d[\d.,\s]*\d|\d)/);
    if (m) {
      const raw = m[1].replace(/ /g, ' ').trim();
      const stripped = /^\d{1,3}(\.\d{3})+$/.test(raw)
        ? raw.replace(/\./g, '')
        : raw.replace(/\s/g, '').replace(',', '.');
      const n = parseFloat(stripped);
      if (n >= 1 && n <= 500_000) target.plotSqm = n;
    }
  } else if (field === 'beds' && !target.beds) {
    const n = parseInt(v, 10);
    if (n >= 1 && n <= 20) target.beds = n;
  } else if (field === 'baths' && !target.baths) {
    const n = parseInt(v, 10);
    if (n >= 1 && n <= 10) target.baths = n;
  } else if (field === 'city' && !target.city) {
    target.city = v.split(/[,/]/)[0].trim();
    if (!target.address) target.address = v;
  } else if (field === 'propertyType' && !target.propertyType) {
    target.propertyType = v;
  } else if (field === 'yearBuilt' && !target.yearBuilt) {
    const n = parseInt(v, 10);
    if (n >= 1800 && n <= 2100) target.yearBuilt = n;
  } else if (field === 'floor' && !target.floor) {
    target.floor = v;
  } else if (field === 'distanceToSea' && !target.distanceToSea) {
    const n = parseDistanceValue(v);
    if (n != null) target.distanceToSea = n;
  } else if (field === 'livingRooms' && !target.livingRooms) {
    const n = parseInt(v, 10);
    if (n >= 1 && n <= 5) target.livingRooms = n;
  } else if (field === 'totalFloors' && !target.totalFloors) {
    const n = parseInt(v, 10);
    if (n >= 1 && n <= 100) target.totalFloors = n;
  } else if (field === 'parking' && !target.parking) {
    const n = parseInt(v, 10);
    if (n >= 1 && n <= 10) target.parking = n;
  } else if (field === 'furnishing' && !target.furnishing) {
    target.furnishing = mapFurnishingValue(v);
  } else if (field === 'heatingType' && !target.heatingType) {
    target.heatingType = mapHeatingValue(v);
  } else if (field === 'condition' && !target.condition) {
    target.condition = mapConditionValue(v);
  } else if (field === 'viewType' && !target.viewType) {
    target.viewType = mapViewValue(v);
  } else if (field === 'energyRating' && !target.energyRating) {
    const m = v.match(/\b([A-G][+]?)\b/);
    if (m) target.energyRating = m[1].toUpperCase();
  } else if (field === 'orientation' && !target.orientation) {
    target.orientation = mapOrientationValue(v);
  } else if (field === 'distanceToCenter' && !target.distanceToCenter) {
    const n = parseDistanceValue(v);
    if (n != null) target.distanceToCenter = n;
  } else if (field === 'propertyId' && !target.propertyId) {
    // Store the external listing ID if it looks reasonable (not a long URL/hash).
    if (v.length <= 50 && !/^https?:\/\//.test(v)) target.propertyId = v;
  } else if (field === 'listingType' && !target.listingType) {
    const lv = v.toLowerCase();
    if (/\b(sale|prodaj|shitj|vanzar|πωλ|eladó|verkauf|kauf|продаж)\b/i.test(lv)) target.listingType = 'sale';
    else if (/\b(rent|najam|qira|chirie|ενοικ|kiadó|miete|наем|кирија)\b/i.test(lv)) target.listingType = 'rent';
  } else if (field === 'address' && !target.address) {
    target.address = v;
  } else if (field === 'country' && !target.country) {
    target.country = v;
  } else if ((field === 'lat' || field === 'lng') && target[field] == null) {
    const n = parseFloat(v.replace(',', '.'));
    const max = field === 'lat' ? 90 : 180;
    if (Number.isFinite(n) && n !== 0 && Math.abs(n) <= max) target[field] = n;
  }
};

/** Look a human label up in the dictionary and apply its value. */
export const applyLabelValue = (target: MappedListing, labelRaw: string, valueRaw: string): void => {
  if (!labelRaw || !valueRaw) return;
  const field = fieldForLabel(labelRaw);
  if (field) applyAttribute(target, field, valueRaw);
};
