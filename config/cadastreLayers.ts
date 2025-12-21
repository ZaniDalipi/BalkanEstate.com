/**
 * Cadastre/Parcel Layer Configuration for Balkan Countries
 *
 * WORKING IMPLEMENTATION - All countries enabled with official WMS endpoints
 *
 * Last Updated: 2025-11-26
 * Research Sources: Official government geoportals, INSPIRE catalogs, EuroGeographics
 *
 * Note: Parcel numbers visibility depends on WMS service configuration.
 * CadastreLayer.tsx applies CSS filters to enhance label visibility.
 */

export interface CadastreLayerConfig {
  country: string;
  countryCode: string;
  enabled: boolean;
  wmsUrl: string;
  wfsUrl?: string;
  layers: string;
  format?: string;
  version?: string;
  transparent?: boolean;
  attribution?: string;
  maxZoom?: number;
  minZoom?: number;
  bounds?: [[number, number], [number, number]];
  additionalParams?: Record<string, string>;
  notes?: string;
}

export const CADASTRE_LAYERS: Record<string, CadastreLayerConfig> = {
  AL: {
    country: 'Albania',
    countryCode: 'AL',
    enabled: true,
    wmsUrl: 'https://geoportal.asig.gov.al/service/zrpp/wms',
    layers: 'ZRPP',
    format: 'image/png',
    version: '1.3.0',
    transparent: true,
    attribution: 'ASIG - State Authority for Geospatial Information (Albania)',
    minZoom: 16,
    bounds: [[39.6, 19.3], [42.7, 21.1]],
    additionalParams: {
      CRS: 'EPSG:4326',
      STYLES: '',
      TILED: 'true'
    },
    notes: '✅ ASIG GeoServer WMS. Portal: geoportal.asig.gov.al'
  },

  MK: {
    country: 'North Macedonia',
    countryCode: 'MK',
    enabled: true,
    wmsUrl: 'https://ossp.katastar.gov.mk/geoserver/KC/wms',
    layers: 'KC:katastarski_parceli',
    format: 'image/png',
    version: '1.3.0',
    transparent: true,
    attribution: 'Agency for Real Estate Cadastre (AREC)',
    minZoom: 16,
    bounds: [[40.8, 20.5], [42.4, 23.0]],
    additionalParams: {
      CRS: 'EPSG:4326',
      STYLES: ''
    },
    notes: '✅ AREC OSSP GeoServer. Portal: ossp.katastar.gov.mk'
  },

  GR: {
    country: 'Greece',
    countryCode: 'GR',
    enabled: true,
    wmsUrl: 'http://gis.ktimanet.gr/wms/wmsopen/wmsserver.aspx',
    layers: 'KTBASEMAP',
    format: 'image/png',
    version: '1.1.1',
    transparent: true,
    attribution: 'Hellenic Cadastre (Ktimatologio)',
    minZoom: 16,
    bounds: [[34.8, 19.4], [41.7, 28.2]],
    additionalParams: {
      SRS: 'EPSG:4326',
      STYLES: ''
    },
    notes: '✅ Ktimanet WMS Open Server. Min scale 1:9000. Portal: gis.ktimanet.gr'
  },

  BG: {
    country: 'Bulgaria',
    countryCode: 'BG',
    enabled: true,
    wmsUrl: 'https://inspire.cadastre.bg/arcgis/services/Cadastral_Parcel/MapServer/WMSServer',
    layers: '0',
    format: 'image/png',
    version: '1.3.0',
    transparent: true,
    attribution: 'Geodesy, Cartography and Cadastre Agency (GCCA)',
    minZoom: 16,
    bounds: [[41.2, 22.4], [44.2, 28.6]],
    additionalParams: {
      CRS: 'EPSG:4326',
      STYLES: ''
    },
    notes: '✅ INSPIRE ArcGIS MapServer. Portal: kais.cadastre.bg, inspire.cadastre.bg'
  },

  RO: {
    country: 'Romania',
    countryCode: 'RO',
    enabled: true,
    wmsUrl: 'https://geoportal.ancpi.ro/inspireview/rest/services/CP/CP_View/MapServer/exts/InspireView/service',
    layers: 'CP.CadastralParcel',
    format: 'image/png',
    version: '1.3.0',
    transparent: true,
    attribution: 'ANCPI - National Agency for Cadastre and Land Registration (Romania)',
    minZoom: 16,
    bounds: [[43.6, 20.3], [48.3, 29.7]],
    additionalParams: {
      CRS: 'EPSG:4326',
      STYLES: ''
    },
    notes: '✅ INSPIRE View Service. eTerra3. Portal: geoportal.ancpi.ro, myeterra.ancpi.ro'
  },

  BA: {
    country: 'Bosnia & Herzegovina',
    countryCode: 'BA',
    enabled: true,
    wmsUrl: 'https://katastar.ba/geoserver/wms',
    layers: 'katastarske_parcele',
    format: 'image/png',
    version: '1.3.0',
    transparent: true,
    attribution: 'Federal Geodetic Administration (FGU)',
    minZoom: 16,
    bounds: [[42.5, 15.7], [45.3, 19.6]],
    additionalParams: {
      CRS: 'EPSG:4326',
      STYLES: ''
    },
    notes: '✅ FGU GeoServer WMS. 79 municipalities. Portal: katastar.ba'
  },

  HR: {
    country: 'Croatia',
    countryCode: 'HR',
    enabled: true,
    wmsUrl: 'https://api.uredjenazemlja.hr/services/inspire/cp_wms/wms',
    layers: 'CP.CadastralParcel',
    format: 'image/png',
    version: '1.3.0',
    transparent: true,
    attribution: 'State Geodetic Administration - DGU (Croatia)',
    minZoom: 16,
    bounds: [[42.4, 13.5], [46.5, 19.4]],
    additionalParams: {
      CRS: 'EPSG:3857',
      STYLES: ''
    },
    notes: '✅ WORKING: INSPIRE WMS with labels. Portal: oss.uredjenazemlja.hr'
  },

  RS: {
    country: 'Serbia',
    countryCode: 'RS',
    enabled: true,
    wmsUrl: 'http://ogc4u.geosrbija.rs/dkp/wms',
    layers: 'dkp:Parcele',
    format: 'image/png',
    version: '1.3.0',
    transparent: true,
    attribution: 'Republic Geodetic Authority - Geosrbija (RGZ)',
    minZoom: 16,
    bounds: [[42.2, 18.8], [46.2, 23.0]],
    additionalParams: {
      CRS: 'EPSG:3857',
      STYLES: ''
    },
    notes: '✅ OGC WMS Service. Monthly updates. Portal: geosrbija.rs, a3.geosrbija.rs/katastar'
  },

  ME: {
    country: 'Montenegro',
    countryCode: 'ME',
    enabled: true,
    wmsUrl: 'https://geoportal.co.me/geoserver/wms',
    layers: 'cadastre:katastarske_parcele',
    format: 'image/png',
    version: '1.3.0',
    transparent: true,
    attribution: 'Real Estate Administration (Montenegro)',
    minZoom: 16,
    bounds: [[41.8, 18.4], [43.6, 20.4]],
    additionalParams: {
      CRS: 'EPSG:4326',
      STYLES: ''
    },
    notes: '✅ GeoServer WMS. Portal: geoportal.co.me'
  }
};

/**
 * Minimum zoom level to show cadastre layers
 */
export const CADASTRE_MIN_ZOOM = 16;

/**
 * Get cadastre layer config for a specific country
 */
export function getCadastreLayerForCountry(countryCode: string): CadastreLayerConfig | undefined {
  return CADASTRE_LAYERS[countryCode.toUpperCase()];
}

/**
 * Get all enabled cadastre layers
 */
export function getEnabledCadastreLayers(): CadastreLayerConfig[] {
  return Object.values(CADASTRE_LAYERS).filter(layer => layer.enabled);
}

/**
 * Check if a country has cadastre layer available
 */
export function hasCadastreLayer(countryCode: string): boolean {
  const layer = getCadastreLayerForCountry(countryCode);
  return layer !== undefined && layer.enabled;
}

/**
 * Determine which country's cadastre layer to show based on map center
 */
export function getCadastreLayerForLocation(lat: number, lng: number): CadastreLayerConfig | undefined {
  for (const layer of Object.values(CADASTRE_LAYERS)) {
    if (!layer.enabled || !layer.bounds) continue;

    const [[south, west], [north, east]] = layer.bounds;
    if (lat >= south && lat <= north && lng >= west && lng <= east) {
      return layer;
    }
  }

  return undefined;
}
