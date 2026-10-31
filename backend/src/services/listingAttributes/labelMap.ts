/**
 * Multilingual dictionary of listing attribute labels.
 *
 * Every real-estate site names the same attributes differently ("Bathrooms",
 * "Kupatilo", "Banjo", "Μπάνιο", "num_bathrooms", <bathrooms>…). Labels are
 * normalised (lower-case, separators and punctuation stripped) and looked up
 * here to find the canonical field on our Property model. The same table is
 * used for detail-page HTML label/value blocks and for the keys of
 * structured JSON / XML feed records.
 */

export type AttributeField =
  | 'price' | 'sqft' | 'plotSqm' | 'beds' | 'baths' | 'livingRooms' | 'city'
  | 'address' | 'propertyType' | 'yearBuilt' | 'floor' | 'totalFloors' | 'parking'
  | 'furnishing' | 'heatingType' | 'condition' | 'viewType' | 'energyRating'
  | 'orientation' | 'distanceToSea' | 'distanceToCenter' | 'propertyId' | 'listingType'
  | 'lat' | 'lng' | 'country';

/** Strip separators and non-letter/digit chars; keeps every Unicode script. */
export const normLabel = (s: string): string =>
  s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/[\s\-_./:()|]+/g, '')
    .replace(/[^\p{L}\d]/gu, '')
    .trim();

// Maps normalised label → canonical target field.
export const LABEL_MAP: Readonly<Record<string, AttributeField>> = {
  // ── Price ──────────────────────────────────────────────────────────────
  // HR/BA
  'cijena': 'price', 'cjena': 'price', 'prodajnacijjena': 'price', 'cijenaponude': 'price',
  // SR Latin / SL
  'cena': 'price', 'prodajnacena': 'price', 'prodajnicena': 'price',
  // SR/MK/BG Cyrillic
  'цена': 'price', 'продажнацена': 'price', 'продажна': 'price',
  // RO
  'pret': 'price', 'pretul': 'price', 'costul': 'price', 'pretzul': 'price',
  // AL
  'çmimi': 'price', 'cmimi': 'price', 'çmimiishitjes': 'price', 'cmimiishitjes': 'price',
  // GR
  'τιμή': 'price', 'τιμη': 'price', 'τιμήπώλησης': 'price', 'τιμηπωλησης': 'price',
  // HU
  'ár': 'price', 'ar': 'price', 'eladásiár': 'price', 'eladasiar': 'price',
  // DE
  'preis': 'price', 'kaufpreis': 'price', 'verkaufspreis': 'price', 'mietpreis': 'price', 'kaltmiete': 'price',
  // FR
  'prix': 'price', 'prixdevente': 'price', 'prixdachat': 'price', 'loyer': 'price',
  // IT
  'prezzo': 'price', 'prezzovendita': 'price', 'affitto': 'price',
  // EN
  'price': 'price', 'askingprice': 'price', 'listprice': 'price', 'salesprice': 'price', 'rentalprice': 'price',

  // ── Area / Floor size ─────────────────────────────────────────────────
  // HR/BA/SR Latin
  'površina': 'sqft', 'povrsina': 'sqft', 'površinainterijera': 'sqft', 'povrsinainterijera': 'sqft',
  'stambenapovrš': 'sqft', 'stambena': 'sqft', 'stambenapovrsi': 'sqft',
  // SR/MK Cyrillic
  'површина': 'sqft', 'квадратура': 'sqft', 'стамбена': 'sqft',
  // BG Cyrillic
  'площ': 'sqft', 'жилищнаплощ': 'sqft', 'застроена': 'sqft', 'ползваема': 'sqft',
  // RO
  'suprafata': 'sqft', 'suprafaţa': 'sqft', 'suprafatautila': 'sqft', 'suprafatautil': 'sqft',
  'suprafataconstruita': 'sqft', 'suprafatabrutа': 'sqft',
  // AL
  'sipërfaqja': 'sqft', 'siperfaqja': 'sqft', 'sipërfaqe': 'sqft', 'siperfaqe': 'sqft',
  // GR
  'εμβαδόν': 'sqft', 'εμβαδον': 'sqft', 'εμβαδό': 'sqft',
  // HU
  'alapterület': 'sqft', 'alapterulet': 'sqft', 'hasznosalapterület': 'sqft',
  // DE
  'fläche': 'sqft', 'flache': 'sqft', 'wohnfläche': 'sqft', 'wohnflache': 'sqft',
  'nutzfläche': 'sqft', 'nutzflache': 'sqft',
  // FR
  'surface': 'sqft', 'surfacehabitable': 'sqft', 'superficiehabitable': 'sqft',
  // IT
  'superficie': 'sqft', 'superficieabitabile': 'sqft', 'superficieutile': 'sqft',
  // EN
  'area': 'sqft', 'floorarea': 'sqft', 'livingarea': 'sqft', 'internalarea': 'sqft',
  'grossarea': 'sqft', 'interiorarea': 'sqft', 'usablearea': 'sqft', 'netarea': 'sqft',
  'size': 'sqft', 'propertysize': 'sqft', 'interiorsize': 'sqft',

  // ── Plot / Land area ──────────────────────────────────────────────────
  // HR/BA/SR Latin
  'površinaokućnice': 'plotSqm', 'površinaokucnice': 'plotSqm', 'okućnica': 'plotSqm', 'okucnica': 'plotSqm',
  'površinaparcele': 'plotSqm', 'površinazem': 'plotSqm',
  // SR/MK Cyrillic
  'површинапарцеле': 'plotSqm', 'плац': 'plotSqm', 'парцела': 'plotSqm',
  // BG
  'площназемя': 'plotSqm', 'дворна': 'plotSqm', 'парцел': 'plotSqm',
  // RO
  'suprafataterean': 'plotSqm', 'suprafatatotala': 'plotSqm',
  // DE
  'grundfläche': 'plotSqm', 'grundflache': 'plotSqm', 'grundstücksfläche': 'plotSqm',
  // EN
  'plotarea': 'plotSqm', 'landarea': 'plotSqm', 'plotsize': 'plotSqm',
  'lotsize': 'plotSqm', 'groundarea': 'plotSqm', 'yardsize': 'plotSqm',

  // ── Bedrooms ──────────────────────────────────────────────────────────
  // HR/BA/SR Latin
  'spavaćesobe': 'beds', 'spavacesobe': 'beds', 'sobe': 'beds', 'spavaona': 'beds', 'brojsoba': 'beds',
  // SR Cyrillic
  'спаваћесобе': 'beds', 'собе': 'beds', 'бројсоби': 'beds', 'спаваоница': 'beds',
  // MK Cyrillic
  'соби': 'beds', 'броисоби': 'beds', 'спални': 'beds',
  // BG Cyrillic
  'спалня': 'beds', 'стаи': 'beds', 'броистаи': 'beds',
  // SL
  'spalnice': 'beds', 'številosob': 'beds',
  // RO
  'dormitoare': 'beds', 'camere': 'beds', 'camerededormit': 'beds', 'numarcamere': 'beds',
  // AL
  'dhomagjumi': 'beds', 'numridhomave': 'beds', 'dhoma': 'beds',
  // GR
  'υπνοδωμάτια': 'beds', 'υπνοδωματια': 'beds', 'κρεβατοκάμαρες': 'beds',
  // HU
  'hálószoba': 'beds', 'haloszoba': 'beds', 'szobák': 'beds', 'szobak': 'beds',
  // DE
  'schlafzimmer': 'beds', 'zimmeranzahl': 'beds',
  // FR
  'chambre': 'beds', 'chambres': 'beds', 'chambresàcoucher': 'beds',
  // IT
  'camera': 'beds', 'cameradaletto': 'beds',
  // EN
  'bedrooms': 'beds', 'bedroom': 'beds', 'beds': 'beds', 'numberofbedrooms': 'beds',

  // ── Bathrooms ─────────────────────────────────────────────────────────
  // HR/BA/SR
  'kupatilo': 'baths', 'kupatila': 'baths', 'kupaonica': 'baths', 'toalet': 'baths',
  // SR Cyrillic
  'купатило': 'baths', 'тоалет': 'baths',
  // BG
  'баня': 'baths', 'бани': 'baths',
  // RO
  'baie': 'baths', 'bai': 'baths',
  // AL
  'banjo': 'baths', 'tualet': 'baths',
  // GR
  'μπάνιο': 'baths', 'μπανιο': 'baths', 'λουτρό': 'baths',
  // HU
  'fürdőszoba': 'baths', 'furdoszoba': 'baths',
  // DE
  'badezimmer': 'baths', 'bäder': 'baths',
  // FR
  'salledebain': 'baths', 'salledebains': 'baths',
  // IT
  'bagno': 'baths', 'bagni': 'baths',
  // EN
  'bathrooms': 'baths', 'bathroom': 'baths', 'baths': 'baths',

  // ── Location / City ───────────────────────────────────────────────────
  // HR/BA/SR Latin
  'lokacija': 'city', 'mjesto': 'city', 'grad': 'city', 'adresa': 'city', 'općina': 'city', 'opcina': 'city',
  // SR Cyrillic
  'локација': 'city', 'место': 'city', 'град': 'city', 'адреса': 'city', 'општина': 'city',
  // MK Cyrillic
  'локациjа': 'city',
  // BG Cyrillic
  'местоположение': 'city', 'населеноместо': 'city', 'квартал': 'city', 'адрес': 'city',
  // SL
  'kraj': 'city',
  // RO
  'locatie': 'city', 'locaţie': 'city', 'localitate': 'city', 'oras': 'city', 'oraş': 'city',
  // AL
  'vendndodhja': 'city', 'qyteti': 'city',
  // GR
  'τοποθεσία': 'city', 'τοποθεσια': 'city', 'πόλη': 'city', 'πολη': 'city', 'περιοχή': 'city',
  // HU
  'helyszín': 'city', 'helyszin': 'city', 'város': 'city', 'varos': 'city', 'cím': 'city',
  // DE
  'lage': 'city', 'ort': 'city', 'stadt': 'city', 'standort': 'city', 'lageort': 'city',
  // FR
  'emplacement': 'city', 'ville': 'city', 'adresse': 'city',
  // IT
  'posizione': 'city', 'città': 'city', 'citta': 'city', 'indirizzo': 'city',
  // EN
  'location': 'city', 'city': 'city', 'address': 'city', 'town': 'city', 'district': 'city',

  // ── Property type ─────────────────────────────────────────────────────
  'vrstanekretnine': 'propertyType', 'vrstaponude': 'propertyType', 'tipnekretnine': 'propertyType',
  'врстанекретнине': 'propertyType', 'тип': 'propertyType', 'видимот': 'propertyType',
  'tipproprietate': 'propertyType', 'tipologie': 'propertyType',
  'immobilienart': 'propertyType', 'objektart': 'propertyType',
  'type': 'propertyType', 'propertytype': 'propertyType', 'typedebien': 'propertyType',

  // ── Year built ────────────────────────────────────────────────────────
  'godinaizgradnje': 'yearBuilt', 'godišnjaizgradnje': 'yearBuilt', 'godgradnje': 'yearBuilt',
  'годинаградње': 'yearBuilt', 'годнастрояване': 'yearBuilt',
  'anconstructie': 'yearBuilt', 'anconstruire': 'yearBuilt',
  'vitacostruizione': 'yearBuilt', 'annodiristruzione': 'yearBuilt',
  'baujahr': 'yearBuilt', 'építésiév': 'yearBuilt', 'epitesiév': 'yearBuilt',
  'annéedeconstruction': 'yearBuilt',
  'yearbuilt': 'yearBuilt', 'built': 'yearBuilt', 'constructionyear': 'yearBuilt',

  // ── Floor ─────────────────────────────────────────────────────────────
  'kat': 'floor', 'sprat': 'floor', 'etaža': 'floor', 'etaza': 'floor', 'etažnost': 'floor',
  'спрат': 'floor', 'кат': 'floor', 'етаж': 'floor',
  'etaj': 'floor', 'korridor': 'floor',
  'stockwerk': 'floor', 'etage': 'floor', 'obergeschoss': 'floor',
  'emelet': 'floor', 'piano': 'floor',
  'floor': 'floor', 'floornumber': 'floor', 'storey': 'floor',

  // ── Distance to sea ───────────────────────────────────────────────────
  'udaljenostodmora': 'distanceToSea', 'udaljenostdoumora': 'distanceToSea', 'odmorja': 'distanceToSea',
  'удаљеностодмора': 'distanceToSea', 'разстояниедоморе': 'distanceToSea',
  'distantafatademare': 'distanceToSea', 'distantadalamare': 'distanceToSea',
  'distanzevomeer': 'distanceToSea', 'meeresnähe': 'distanceToSea',
  'distancetosea': 'distanceToSea', 'distancefromsea': 'distanceToSea', 'distancetothesea': 'distanceToSea',
  'απόστασηαπόθάλασσα': 'distanceToSea', 'tengerközelség': 'distanceToSea',

  // ── Living rooms ──────────────────────────────────────────────────────
  // HR/BA/SR Latin
  'dnevnasoba': 'livingRooms', 'dnevnasobe': 'livingRooms', 'brojosobna': 'livingRooms',
  'salon': 'livingRooms', 'boravak': 'livingRooms', 'boravišnisob': 'livingRooms',
  // SR/MK Cyrillic
  'дневнасоба': 'livingRooms', 'дневнасобе': 'livingRooms', 'дневни': 'livingRooms',
  // BG
  'дневна': 'livingRooms', 'хол': 'livingRooms',
  // SL
  'dnevnaoba': 'livingRooms', 'dnevnisobor': 'livingRooms',
  // RO
  'cameradeziua': 'livingRooms', 'cameradestat': 'livingRooms', 'salonro': 'livingRooms',
  // AL
  'dhomaejeteses': 'livingRooms', 'dhomaeqeteses': 'livingRooms',
  // GR
  'καθιστικό': 'livingRooms', 'καθιστικο': 'livingRooms', 'σαλόνι': 'livingRooms',
  // HU
  'nappali': 'livingRooms', 'nappaliszoba': 'livingRooms',
  // DE
  'wohnzimmer': 'livingRooms', 'wohnraum': 'livingRooms',
  // FR
  'séjour': 'livingRooms', 'sejour': 'livingRooms', 'salonsejourou': 'livingRooms',
  // IT
  'soggiorno': 'livingRooms', 'salone': 'livingRooms',
  // EN
  'livingroom': 'livingRooms', 'livingrooms': 'livingRooms', 'sittingroom': 'livingRooms',
  'lounge': 'livingRooms', 'receptionrooms': 'livingRooms',

  // ── Total floors in building ──────────────────────────────────────────
  // HR/BA/SR Latin
  'ukupnokatova': 'totalFloors', 'ukupnospratova': 'totalFloors', 'ukupnoetaža': 'totalFloors',
  'ukupnoetaza': 'totalFloors', 'brojetaza': 'totalFloors', 'katnost': 'totalFloors',
  // SR Cyrillic
  'укупноспратова': 'totalFloors', 'укупноетажа': 'totalFloors', 'катност': 'totalFloors',
  // BG
  'броетажи': 'totalFloors', 'общоетажи': 'totalFloors',
  // RO
  'numaretaje': 'totalFloors', 'totaletaje': 'totalFloors',
  // DE
  'gesamtstockwerke': 'totalFloors', 'gesamtgeschosse': 'totalFloors', 'anzahlstockwerke': 'totalFloors',
  // EN
  'totalfloors': 'totalFloors', 'numberoffloors': 'totalFloors', 'floorsintotal': 'totalFloors',
  'buildingfloors': 'totalFloors', 'totalstoreys': 'totalFloors',

  // ── Parking ───────────────────────────────────────────────────────────
  // HR/BA/SR Latin
  'parking': 'parking', 'parkiralište': 'parking', 'parkiraliste': 'parking',
  'parkirnomjesto': 'parking', 'garaža': 'parking', 'garaza': 'parking', 'garažno': 'parking',
  'garazno': 'parking',
  // SR Cyrillic
  'паркинг': 'parking', 'гаража': 'parking', 'паркиралиште': 'parking',
  // BG
  'паркомясто': 'parking', 'гараж': 'parking',
  // RO
  'parcare': 'parking', 'garage': 'parking', 'locparcare': 'parking',
  // DE
  'stellplatz': 'parking', 'garagenstellplatz': 'parking', 'tiefgarage': 'parking',
  // EN
  'parkingspaces': 'parking', 'parkingspots': 'parking', 'garageplaces': 'parking',

  // ── Furnishing ────────────────────────────────────────────────────────
  // HR/BA/SR Latin
  'namještenost': 'furnishing', 'namjestenost': 'furnishing', 'oprema': 'furnishing',
  'namješteno': 'furnishing', 'namjesteno': 'furnishing', 'namještaj': 'furnishing',
  // SR Cyrillic
  'намештеност': 'furnishing', 'намештено': 'furnishing',
  // BG
  'обзавеждане': 'furnishing', 'обзаведен': 'furnishing',
  // RO
  'mobilare': 'furnishing', 'mobilat': 'furnishing', 'dotare': 'furnishing',
  // AL
  'mobilim': 'furnishing', 'mobiluar': 'furnishing',
  // GR
  'επίπλωση': 'furnishing', 'επιπλωση': 'furnishing', 'επιπλωμένο': 'furnishing',
  // HU
  'bútorozottság': 'furnishing', 'butorozottsag': 'furnishing',
  // DE
  'einrichtung': 'furnishing', 'möbliert': 'furnishing', 'moebliert': 'furnishing',
  'möblierung': 'furnishing',
  // FR
  'ameublement': 'furnishing', 'meublé': 'furnishing', 'meuble': 'furnishing',
  // IT
  'arredamento': 'furnishing', 'arredato': 'furnishing',
  // EN
  'furnishing': 'furnishing', 'furnished': 'furnishing', 'furnishings': 'furnishing',

  // ── Heating type ──────────────────────────────────────────────────────
  // HR/BA/SR Latin
  'grijanje': 'heatingType', 'vrstagrija': 'heatingType', 'tipgrijanja': 'heatingType',
  'centralnogrijanje': 'heatingType', 'centralnogrianj': 'heatingType',
  // SR Cyrillic
  'грејање': 'heatingType', 'централногрејање': 'heatingType',
  // SL
  'ogrevanje': 'heatingType', 'sistemogrevanja': 'heatingType',
  // BG
  'отопление': 'heatingType', 'видотопление': 'heatingType',
  // RO
  'incalzire': 'heatingType', 'tipincalzire': 'heatingType', 'sistemincalzire': 'heatingType',
  // AL
  'ngrohje': 'heatingType', 'sistemngrohjes': 'heatingType',
  // GR
  'θέρμανση': 'heatingType', 'θερμανση': 'heatingType',
  // HU
  'fűtés': 'heatingType', 'futes': 'heatingType', 'fűtésmód': 'heatingType',
  // DE
  'heizung': 'heatingType', 'heizungsart': 'heatingType', 'heizungstyp': 'heatingType',
  // FR
  'chauffage': 'heatingType', 'typedechauffage': 'heatingType',
  // IT
  'riscaldamento': 'heatingType', 'tipodiriscaldamento': 'heatingType',
  // EN
  'heating': 'heatingType', 'heatingtype': 'heatingType', 'heatingsystem': 'heatingType',

  // ── Condition / state ─────────────────────────────────────────────────
  // HR/BA/SR Latin
  'stanje': 'condition', 'stanjenekretni': 'condition', 'stanjeuređen': 'condition',
  // SR Cyrillic
  'стање': 'condition', 'стањенекретнине': 'condition',
  // SL
  'stanjepremoženja': 'condition',
  // BG
  'състояние': 'condition', 'видсъстояние': 'condition',
  // RO
  'stare': 'condition', 'stareproprietate': 'condition', 'stareclad': 'condition',
  // AL
  'gjendja': 'condition', 'gjendjaepronesise': 'condition',
  // GR
  'κατάσταση': 'condition', 'κατασταση': 'condition',
  // HU
  'állapot': 'condition', 'allapot': 'condition', 'ingatlanállapota': 'condition',
  // DE
  'zustand': 'condition', 'objektzustand': 'condition', 'zustandsbeschreibung': 'condition',
  // FR
  'état': 'condition', 'etat': 'condition', 'étatdubien': 'condition',
  // IT
  'condizione': 'condition', 'stato': 'condition', 'statoimmobile': 'condition',
  // EN
  'status': 'condition', 'propertystatus': 'condition',
  'condition': 'condition', 'propertycondition': 'condition', 'buildingcondition': 'condition',

  // ── View type ─────────────────────────────────────────────────────────
  // HR/BA/SR Latin
  'pogled': 'viewType', 'poglednamore': 'viewType', 'poglednagore': 'viewType',
  'poglednagrad': 'viewType', 'tipapogleda': 'viewType',
  // SR Cyrillic
  'поглед': 'viewType', 'погледнаморе': 'viewType',
  // BG
  'изглед': 'viewType', 'гледка': 'viewType', 'видизглед': 'viewType',
  // RO
  'vedere': 'viewType', 'tipvedere': 'viewType',
  // DE
  'aussicht': 'viewType', 'ausblick': 'viewType', 'blickrichtung': 'viewType',
  // FR
  'vue': 'viewType', 'typdevue': 'viewType',
  // IT
  'vista': 'viewType', 'tipodivista': 'viewType',
  // EN
  'view': 'viewType', 'viewtype': 'viewType', 'propertyview': 'viewType',

  // ── Energy rating ─────────────────────────────────────────────────────
  // HR/BA/SR Latin
  'energetskirazred': 'energyRating', 'energetskiceptifikat': 'energyRating',
  'energetskaklasa': 'energyRating',
  // SR Cyrillic
  'енергетскиразред': 'energyRating',
  // BG
  'енергийнакласа': 'energyRating', 'енергетиченрейтинг': 'energyRating',
  // RO
  'clasaenergetica': 'energyRating', 'certificatenergetica': 'energyRating',
  // DE
  'energieklasse': 'energyRating', 'energieausweis': 'energyRating', 'effizienzklasse': 'energyRating',
  // FR
  'classeenergetique': 'energyRating', 'diagnosticpe': 'energyRating',
  // IT
  'classeenergetica': 'energyRating', 'certificazioneenergetica': 'energyRating',
  // EN
  'energyrating': 'energyRating', 'energyclass': 'energyRating', 'epcrating': 'energyRating',
  'energyefficiency': 'energyRating',

  // ── Orientation ───────────────────────────────────────────────────────
  // HR/BA/SR Latin
  'orijentacija': 'orientation', 'stransvijetstrane': 'orientation',
  // SR Cyrillic
  'оријентација': 'orientation', 'страна': 'orientation',
  // BG
  'изложение': 'orientation', 'ориентация': 'orientation',
  // DE
  'ausrichtung': 'orientation', 'himmelsrichtung': 'orientation',
  // EN
  'orientation': 'orientation', 'facing': 'orientation', 'aspect': 'orientation',

  // ── Distance to center ────────────────────────────────────────────────
  // HR/BA/SR Latin
  'udaljenostodcentra': 'distanceToCenter', 'udaljenostdocentra': 'distanceToCenter',
  'odcentragrada': 'distanceToCenter',
  // SR Cyrillic
  'удаљеностодцентра': 'distanceToCenter',
  // BG
  'разстояниедоцентъра': 'distanceToCenter',
  // RO
  'distantafatadecentru': 'distanceToCenter',
  // DE
  'distanzzumzentrum': 'distanceToCenter', 'entfernungzumzentrum': 'distanceToCenter',
  // EN
  'distancetocenter': 'distanceToCenter', 'distancetocitycentre': 'distanceToCenter',
  'distancefromcenter': 'distanceToCenter',

  // ── Property / listing ID ─────────────────────────────────────────────
  // EN
  'propertyid': 'propertyId', 'listingid': 'propertyId', 'referenceid': 'propertyId',
  'refid': 'propertyId', 'ref': 'propertyId', 'id': 'propertyId', 'mlsid': 'propertyId',
  // HR/BA/SR
  'šifraoglasa': 'propertyId', 'sifraoglasa': 'propertyId', 'idoglasa': 'propertyId',
  'referenca': 'propertyId', 'oznaka': 'propertyId', 'sifra': 'propertyId',
  // SR Cyrillic
  'шифраогласа': 'propertyId', 'ознака': 'propertyId', 'шифра': 'propertyId',
  // AL
  'idproneesise': 'propertyId',
  // DE
  'objektnummer': 'propertyId', 'immobilienid': 'propertyId', 'referenznummer': 'propertyId',
  // FR
  'referencebien': 'propertyId', 'numerobien': 'propertyId',
  // IT
  'codiceimmobile': 'propertyId', 'riferimento': 'propertyId',

  // ── Listing type (sale vs rent) ───────────────────────────────────────
  // HR/BA/SR
  'vrstaprodaje': 'listingType', 'tipoglasa': 'listingType',
  'transakcija': 'listingType', 'nacinprodaje': 'listingType',
  // SR Cyrillic
  'врстапродаjе': 'listingType', 'трансакциjа': 'listingType',
  // EN
  'dealtype': 'listingType', 'transactiontype': 'listingType', 'offertype': 'listingType',
  'listingtype': 'listingType',
  // DE
  'angebotsart': 'listingType', 'transaktionsart': 'listingType',
  // AL
  'llojioferte': 'listingType', 'transaksion': 'listingType',
};

/**
 * Keys that structured feeds (JSON APIs, XML exports such as Kyero/OpenImmo-
 * style files) use but that rarely appear as a visible label on a web page.
 * Consulted after LABEL_MAP.
 */
export const FEED_KEY_MAP: Readonly<Record<string, AttributeField>> = {
  // Price
  askingprice: 'price', saleprice: 'price', rentprice: 'price', priceeur: 'price', pricevalue: 'price',
  listprice: 'price', cijenaeur: 'price', cenaeur: 'price', monthlyrent: 'price',
  // Area
  sqm: 'sqft', m2: 'sqft', squaremeters: 'sqft', squaremetres: 'sqft', surfacearea: 'sqft',
  surfaceareabuilt: 'sqft', builtarea: 'sqft', livingspace: 'sqft', habitablesurface: 'sqft',
  kvadratura: 'sqft', kvadrata: 'sqft', usefularea: 'sqft', totalarea: 'sqft', floorsize: 'sqft',
  surfaceareaplot: 'plotSqm', plot: 'plotSqm', landsize: 'plotSqm', lot: 'plotSqm', plotsqm: 'plotSqm',
  // Rooms
  bed: 'beds', bedroomscount: 'beds', bedroomcount: 'beds', numberofbedrooms: 'beds', spavacesobe: 'beds',
  brojspavacihsoba: 'beds', bath: 'baths', bathroomcount: 'baths', numberofbathrooms: 'baths',
  kupaonice: 'baths', brojkupatila: 'baths', wc: 'baths', toilets: 'baths',
  livingroomcount: 'livingRooms', numberoflivingrooms: 'livingRooms', dnevnisoba: 'livingRooms',
  dnevniboravak: 'livingRooms',
  // Location
  town: 'city', municipality: 'city', locality: 'city', addresslocality: 'city', cityname: 'city',
  place: 'city', settlement: 'city', qytet: 'city', grad: 'city',
  street: 'address', streetaddress: 'address', address1: 'address', fulladdress: 'address',
  country: 'country', countrycode: 'country', addresscountry: 'country', drzava: 'country', zemlja: 'country',
  lat: 'lat', latitude: 'lat', geolat: 'lat', lng: 'lng', lon: 'lng', long: 'lng', longitude: 'lng', geolng: 'lng',
  // Building
  floornumber: 'floor', floorlevel: 'floor', level: 'floor', etaz: 'floor',
  floors: 'totalFloors', buildingfloors: 'totalFloors', storeys: 'totalFloors',
  yearofconstruction: 'yearBuilt', constructionyear: 'yearBuilt', godinaizgradnje: 'yearBuilt',
  garages: 'parking', parkingspace: 'parking', parkingplaces: 'parking', garagespaces: 'parking',
  energycertificate: 'energyRating', energy: 'energyRating',
  // Listing
  category: 'propertyType', propertycategory: 'propertyType', kind: 'propertyType', vrsta: 'propertyType',
  transaction: 'listingType', offer: 'listingType', purpose: 'listingType', contracttype: 'listingType',
  reference: 'propertyId', referencenumber: 'propertyId', refno: 'propertyId', externalid: 'propertyId',
};

const PREFIXES = ['numberof', 'noof', 'num', 'nr', 'no', 'count', 'broj', 'total', 'property', 'listing'];
const SUFFIXES = ['count', 'cnt', 'num', 'number', 'nr', 'total', 'qty', 'm2', 'sqm', 'eur', 'value', 'amount', 'text'];

const lookupFeedKey = (key: string): AttributeField | undefined => LABEL_MAP[key] ?? FEED_KEY_MAP[key];

/**
 * Canonical field for a label shown on a web page ("Broj kupatila",
 * "Bathrooms"), or undefined when unknown. Exact dictionary match only —
 * page text is noisy, so no guessing.
 */
export const fieldForLabel = (label: string): AttributeField | undefined => {
  const key = normLabel(label);
  return key ? LABEL_MAP[key] : undefined;
};

/**
 * Canonical field for a key in a structured feed record (JSON or XML).
 * Also knows feed-only keys and naming styles like `num_bathrooms`,
 * `bedroomsCount`, `area_m2` or `price_eur`, by trying the key with a common
 * prefix / suffix removed.
 */
export const fieldForFeedKey = (name: string): AttributeField | undefined => {
  const key = normLabel(name);
  if (!key || key.length > 40) return undefined;
  const exact = lookupFeedKey(key);
  if (exact) return exact;
  const stems = [key];
  for (const suf of SUFFIXES) {
    if (key.endsWith(suf) && key.length > suf.length + 2) stems.push(key.slice(0, -suf.length));
  }
  for (const stem of stems) {
    const hit = lookupFeedKey(stem);
    if (hit) return hit;
    for (const pre of PREFIXES) {
      if (stem.startsWith(pre) && stem.length > pre.length + 2) {
        const both = lookupFeedKey(stem.slice(pre.length));
        if (both) return both;
      }
    }
  }
  return undefined;
};
