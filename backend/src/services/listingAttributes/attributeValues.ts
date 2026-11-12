/**
 * Parsers that turn a free-text attribute value ("1.2 km", "Fully furnished",
 * "Centralno grijanje") into the enum / number our Property model stores.
 */

/** Parse a distance string like "500m", "1.2 km", "800 metara" → number in metres. */
export const parseDistanceValue = (v: string): number | null => {
  const m = v.match(/(\d[\d.,\s]*\d|\d)\s*(km|m\b|mi\b|km\b|kilomet|meter|metar|metre)/i);
  if (!m) {
    const plain = v.match(/(\d[\d.,\s]*\d|\d)/);
    if (plain) {
      const n = parseFloat(plain[1].replace(/[\s.]/g, '').replace(',', '.'));
      if (n >= 1 && n <= 100_000) return n;
    }
    return null;
  }
  const rawNum = parseFloat(m[1].replace(/[\s]/g, '').replace(',', '.'));
  const unit = m[2].toLowerCase();
  const metres = /km|kilomet/i.test(unit) ? rawNum * 1000 : rawNum;
  if (metres >= 1 && metres <= 200_000) return metres;
  return null;
};

/**
 * Stems are matched without a trailing word boundary ("furn" must hit
 * "furnished"), and "not furnished" forms are checked before "furnished"
 * because they contain it ("nenamješten", "unfurnished").
 */
export const mapFurnishingValue = (v: string): string | undefined => {
  const l = v.toLowerCase();
  if (/(semi|part(ly|ially)|djelomi[čc]|delimi[čc]|polunam|teilmöbl|partiel|parzialmente|félbúto)/i.test(l)) return 'semi-furnished';
  if (/(unfurn|not\s*furn|nenam[jy]?e[šs]t|nije\s*nam|bez\s*nam|neopremlj|ohne.?möb|non.?meub|non.?arred|bútorozatlan|e\s*pamobil)/i.test(l)) return 'unfurnished';
  if (/(furn|nam[jy]?e[šs]t|opremlj|kompletno|vollmöbl|möbliert|meublé|arredato|bútorozot|mobilat|mobiluar|επιπλωμ|обзавед|намештен)/i.test(l)) return 'furnished';
  return undefined;
};

export const mapHeatingValue = (v: string): string | undefined => {
  const l = v.toLowerCase();
  if (/\b(central|district|daljinsko|centralno|fernwärme|téléchauf)\b/i.test(l)) return 'central';
  if (/\b(electr|elek|struj|elektr|elektro|électr|eletric)\b/i.test(l)) return 'electric';
  if (/\b(gas|gaz|plin)\b/i.test(l)) return 'gas';
  if (/\b(oil|mazut|loži|heiz[öo]l|fioul|gasoil)\b/i.test(l)) return 'oil';
  if (/\b(heat.?pump|topl[oi]n[sa]\s*pumpa|wärmepumpe|pompe.?chaleur)\b/i.test(l)) return 'heat-pump';
  if (/\b(solar|solarno|solaire)\b/i.test(l)) return 'solar';
  if (/\b(wood|drv[ao]|bois|legna|holz|biomass|peć)\b/i.test(l)) return 'wood';
  return undefined;
};

export const mapConditionValue = (v: string): string | undefined => {
  const l = v.toLowerCase();
  if (/\b(new|novo|novo?gradnja|neubau|neuf|nuovo)\b/i.test(l)) return 'new';
  if (/\b(excellent|odlič|izvrs|ausgezeich|excell|eccellente|kiváló)\b/i.test(l)) return 'excellent';
  if (/\b(good|dobr[ao]|gut|bon|buono|jó)\b/i.test(l)) return 'good';
  if (/\b(fair|srednje|prihvatl|befriedi|passable|discreto)\b/i.test(l)) return 'fair';
  if (/\b(renovat|needs.?work|za.?renovir|umbaubedürf|rénov|da.?ristruttur|felújítand)\b/i.test(l)) return 'needs-renovation';
  return undefined;
};

export const mapViewValue = (v: string): string | undefined => {
  const l = v.toLowerCase();
  if (/\b(sea|more|meer|mer|mare|tenger|θάλ|deniz)\b/i.test(l)) return 'sea';
  if (/\b(mountain|planin|berg|montagne|montagna|hegy)\b/i.test(l)) return 'mountain';
  if (/\b(city|grad|stadt|ville|città|città|város)\b/i.test(l)) return 'city';
  if (/\b(park|parque|parc|parco)\b/i.test(l)) return 'park';
  if (/\b(garden|vrt|garten|jardin|giardino|kert)\b/i.test(l)) return 'garden';
  if (/\b(street|ulica|straße|rue|strada|utca)\b/i.test(l)) return 'street';
  return undefined;
};

export const mapOrientationValue = (v: string): string | undefined => {
  const l = v.toLowerCase().replace(/\s+/g, '');
  if (/\b(northeast|severoistok|nordost|nordest)\b/i.test(l)) return 'northEast';
  if (/\b(northwest|severozapad|nordwest|nordovest)\b/i.test(l)) return 'northWest';
  if (/\b(southeast|jugoistok|südost|sudest)\b/i.test(l)) return 'southEast';
  if (/\b(southwest|jugozapad|südwest|sudovest)\b/i.test(l)) return 'southWest';
  if (/\b(north|sever|sjever|nord|nord|север)\b/i.test(l)) return 'north';
  if (/\b(south|jug|sud|sud|юг)\b/i.test(l)) return 'south';
  if (/\b(east|istok|ost|est|восток)\b/i.test(l)) return 'east';
  if (/\b(west|zapad|west|ovest|запад)\b/i.test(l)) return 'west';
  return undefined;
};
