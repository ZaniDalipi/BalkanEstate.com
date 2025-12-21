# Cadastre Layer Integration

This document describes the cadastral parcel layer integration for the Balkan Estate application.

## Overview

The application now supports displaying cadastral parcel boundaries and numbers from national cadastre agencies across all Balkan countries. This feature helps users identify exact property boundaries when viewing properties or selecting locations.

## Supported Countries

The following countries have cadastre layer integration:

| Country | Code | Agency | Service Type |
|---------|------|--------|--------------|
| Albania | AL | ASIG - Agency for Spatial Information | WMS |
| North Macedonia | MK | Agency for Real Estate Cadastre | WMS |
| Greece | GR | Hellenic Cadastre (Ktimatologio) | WMS (INSPIRE) |
| Bulgaria | BG | KAIS - Cadastral Geoportal | WMS |
| Kosovo | XK | Kosovo Cadastral Agency (AKK) | WMS |
| Romania | RO | ANCPI - National Agency for Cadastre | WMS/ArcGIS |
| Bosnia & Herzegovina | BA | Federal Geodetic Administration | WMS |
| Croatia | HR | State Geodetic Administration - NIPP | WMS |
| Serbia | RS | Republic Geodetic Authority - Geosrbija | WMS/ArcGIS |
| Montenegro | ME | Real Estate Administration - eKatastar | WMS |
| Slovenia | SI | GURS - eProstor | WMS (INSPIRE) |

## How It Works

### User Experience

1. **Satellite View Only**: Cadastre layers are only shown when the satellite view is active
2. **Zoom Level**: Layers become visible at zoom level 16+ to minimize data usage
3. **Automatic Country Detection**: The system automatically shows the correct country's cadastre layer based on map location
4. **Toggle Control**: Users can enable/disable the cadastre layer using the "Parcels" button

### Technical Implementation

#### Components

1. **CadastreLayer Component** (`components/Map/CadastreLayer.tsx`)
   - React-Leaflet component that renders WMS cadastre layers
   - Automatically detects which country layer to show based on map center
   - Only renders when enabled and zoom level is sufficient

2. **Configuration** (`config/cadastreLayers.ts`)
   - Contains all WMS endpoint configurations
   - Includes bounds, layer names, and attribution for each country
   - Helper functions for country detection and layer retrieval

#### Integration Points

The cadastre layer is integrated into the following map components:

- **MapComponent** (`components/BuyerFlow/MapComponent.tsx`)
  - Main property search map
  - Shows cadastre when satellite view is active and zoom ≥ 16

- **PropertyLocationMap** (`components/BuyerFlow/PropertyLocationMap.tsx`)
  - Individual property detail view
  - Higher zoom level (17) for better parcel visibility

- **MapLocationPicker** (`components/SellerFlow/MapLocationPicker.tsx`)
  - Seller property location selection
  - Helps sellers accurately place their property within parcel boundaries

## Data Usage Optimization

To minimize data transfer and improve performance:

1. **WMS (not WFS)**: Uses Web Map Service which delivers pre-rendered tiles instead of raw vector data
2. **Conditional Loading**: Only loads when satellite view is active
3. **Zoom Threshold**: Only requests tiles at zoom level 16+
4. **Single Country**: Only loads the layer for the country currently in view
5. **Lazy Loading**: Layers are loaded on-demand, not at initial page load

## Configuration

### Adding a New Country

To add cadastre support for a new country:

1. Add entry to `CADASTRE_LAYERS` in `config/cadastreLayers.ts`:

```typescript
XX: {
  country: 'Country Name',
  countryCode: 'XX',
  enabled: true,
  wmsUrl: 'https://cadastre-service-url/wms',
  layers: 'layer-name',
  format: 'image/png',
  version: '1.3.0',
  transparent: true,
  attribution: 'Cadastre Agency Name',
  minZoom: 16,
  bounds: [[south, west], [north, east]],
  notes: 'Additional information about the service',
}
```

2. Test the layer by zooming into the country region in satellite view

### Modifying WMS Parameters

Each country configuration supports:

- `wmsUrl`: The base WMS endpoint URL
- `layers`: Comma-separated list of layer names
- `format`: Image format (typically 'image/png')
- `version`: WMS version (typically '1.3.0')
- `transparent`: Whether to use transparency (default: true)
- `additionalParams`: Additional WMS parameters (e.g., CRS, STYLES)

## Important Notes

### API Access

Some national cadastre services may require:
- **API Keys**: Contact the respective agency for access credentials
- **Rate Limiting**: Be aware of request limits
- **Terms of Use**: Ensure compliance with each agency's terms of service

### Known Limitations

1. **Endpoint Accuracy**: Some endpoints are based on standard patterns and may need adjustment
2. **Layer Names**: Actual layer names may vary; contact agencies for exact layer identifiers
3. **Service Availability**: Some services may have downtime or limited availability
4. **Coverage**: Cadastre coverage may vary by region within a country

### Future Improvements

Potential enhancements:

- [ ] Add caching layer for frequently accessed tiles
- [ ] Implement fallback layers if primary service is unavailable
- [ ] Add parcel click functionality for detailed information
- [ ] Support for additional parcel metadata (owner, size, type)
- [ ] Label overlay for parcel numbers
- [ ] Support for historical cadastre data

## Troubleshooting

### Cadastre Layer Not Showing

1. **Check zoom level**: Must be at least zoom level 16
2. **Verify satellite view**: Cadastre only shows in satellite mode
3. **Toggle enabled**: Ensure the "Parcels" button is activated
4. **Country coverage**: Check if the country has cadastre support
5. **Console errors**: Check browser console for WMS errors

### Performance Issues

If cadastre layers load slowly:

1. Check network tab for failed WMS requests
2. Verify the WMS endpoint is accessible
3. Some services may be slower during peak hours
4. Consider reducing opacity or disabling when not needed

## Contact Information

For issues or questions about cadastre layer integration, please open an issue on the repository or contact the development team.

## References

- [OGC Web Map Service (WMS) Specification](https://www.ogc.org/standards/wms)
- [INSPIRE Directive (EU)](https://inspire.ec.europa.eu/)
- [Leaflet WMS Documentation](https://leafletjs.com/reference.html#tilelayer-wms)
