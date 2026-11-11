process.env.SKIP_TEST_DB = 'true';

import * as cheerio from 'cheerio';
import { enrichFromDetailHtml } from '../../services/listingHtmlEnricher';
import { listingJsonLdNodes } from '../../services/listingAttributes/jsonLdNodes';
import { coordinatesFromMapUrl, extractMapCoordinates } from '../../services/listingAttributes/mapCoordinates';
import { resolveLocation } from '../../services/listingAttributes/location';

/** Shaped like a WordPress real-estate theme page (agency in Istria). */
const WP_THEME_PAGE = `<html lang="en"><body>
  <header><a href="tel:+385.98.00.00.00">Call</a></header>
  <div class="listing-head"><h2>Banjole , kuća+bazen-na moru</h2><p><i class="la la-map-marker"></i>Banjole</p></div>
  <h3 class="CATEGORY">Opći podaci</h3>
  <ul>
    <li><h4>kategorije:</h4> <span>Kuća</span></li>
    <li><h4>Cijena:</h4> <span>€290,000</span></li>
    <li><h4>Kvadratura:</h4> <span>82m²</span></li>
    <li><h4>Broj spavaćih soba:</h4> <span>3</span></li>
    <li><h4>Broj kupaonica:</h4> <span>2</span></li>
    <li><h4>Plaža:</h4> <span>200m</span></li>
  </ul>
  <h3>Location</h3>
  <div class="sw_win_map"><div class="sw-hide latitude">44.824852</div><div class="sw-hide longitude">13.868486</div></div>
  <div class="similar"><div class="card"><p><i class="la la-map-marker"></i>Medulin</p><span>Kvadratura</span><span>63</span></div></div>
  <div class="modal"><ul class="sw_dlocation_list"><li><a href="#" class="sw_dl_more"><span>Load More...</span></a></li></ul></div>
</body></html>`;

/** Shaped like a page with the agency's schema block before the listing's. */
const SCHEMA_PAGE = `<html lang="en"><head>
  <script type="application/ld+json">{"@type":"RealEstateAgent","name":"Some Agency","address":{"@type":"PostalAddress","addressLocality":"Tiranë","addressCountry":"AL"},"logo":"https://a.example/logo.png","image":"https://a.example/logo.png"}</script>
  <script type="application/ld+json">{"@type":"WebSite","name":"Some Agency"}</script>
  <script type="application/ld+json">{"@type":"RealEstateListing","name":"Apartment in Radhime, Vlore","image":["https://a.example/1.jpg"],
    "numberOfRooms":1,"numberOfBathroomsTotal":1,"floorSize":{"value":57},
    "address":{"@type":"PostalAddress","addressCountry":"AL","addressLocality":"Radhime","streetAddress":"Rruga Radhime, Vlore 9426"},
    "geo":{"latitude":19.486741,"longitude":40.357529},"offers":{"@type":"Offer","priceCurrency":"EUR","price":155000}}</script>
</head><body><p>Registered office</p></body></html>`;

describe('detail page: WordPress theme layout', () => {
  const out = enrichFromDetailHtml(WP_THEME_PAGE, 'https://agency.example/listing-preview/banjole-kuca', {});

  it('reads the h4 / span attribute list in Croatian', () => {
    expect(out).toMatchObject({ propertyType: 'Kuća', price: '€290,000', sqft: 82, beds: 3, baths: 2, distanceToSea: 200 });
  });

  it('takes the place beside the map marker, the coordinates from the map, never "Load More"', () => {
    expect(out).toMatchObject({ city: 'Banjole', lat: 44.824852, lng: 13.868486 });
    expect(JSON.stringify(out)).not.toMatch(/Load|More\.\.\./);
  });

  it('knows the country from the phone prefix', () => {
    expect(resolveLocation(out)).toMatchObject({ city: 'Banjole', country: 'Croatia' });
  });
});

describe('detail page: schema.org blocks', () => {
  const out = enrichFromDetailHtml(SCHEMA_PAGE, 'https://a.example/en/properties/Vlore-ALVS1455/', {});

  it("uses the listing's block, not the agency's", () => {
    expect(out).toMatchObject({ title: 'Apartment in Radhime, Vlore', city: 'Radhime', price: 155000, sqft: 57, baths: 1 });
    expect(out.imageUrl).toBe('https://a.example/1.jpg');
    expect(out.propertyId).toBeUndefined(); // not "ered" from "Registered"
  });

  it('resolves to a known city with the coordinates the right way round', () => {
    expect(resolveLocation(out)).toEqual({
      city: 'Vlorë', country: 'Albania', address: 'Rruga Radhime, Vlore 9426', lat: 40.357529, lng: 19.486741,
    });
  });

  it('finds listing nodes nested under @graph / mainEntity / itemOffered', () => {
    const nodes = listingJsonLdNodes([
      { '@graph': [{ '@type': 'Organization' }, { '@type': 'WebPage', mainEntity: { '@type': 'Product', offers: { '@type': 'Offer', itemOffered: { '@type': 'Apartment', name: 'A' } } } }] },
    ]);
    expect(nodes.map((n) => n['@type'])).toEqual(['Apartment', 'Product']);
  });
});

describe('map coordinates', () => {
  const coords = (html: string) => extractMapCoordinates(cheerio.load(html));

  it.each([
    ['meta tags', '<meta property="place:location:latitude" content="42.44"><meta property="place:location:longitude" content="19.26">'],
    ['geo.position', '<meta name="geo.position" content="42.44;19.26">'],
    ['microdata', '<span itemprop="latitude" content="42.44"></span><span itemprop="longitude" content="19.26"></span>'],
    ['data attributes', '<div id="map" data-lat="42.44" data-lng="19.26"></div>'],
    ['Google Maps embed', '<iframe src="https://www.google.com/maps/embed?pb=!1m18!3d42.44!4d19.26!5e0"></iframe>'],
    ['Google Maps link', '<a href="https://maps.google.com/?q=42.44,19.26">Map</a>'],
    ['OpenStreetMap', '<iframe src="https://www.openstreetmap.org/export/embed.html?bbox=1,2,3,4&marker=42.44%2C19.26"></iframe>'],
    ['Google Maps script', '<script>var p = new google.maps.LatLng(42.44, 19.26); map.setCenter(p);</script>'],
    ['Leaflet script', '<script>L.marker([42.44, 19.26]).addTo(map);</script>'],
    ['JSON in a script', '<script>window.listing = {"title":"x","lat":"42.44","lng":"19.26"};</script>'],
  ])('reads %s', (_, html) => {
    expect(coords(html)).toEqual({ lat: 42.44, lng: 19.26 });
  });

  it('reads the Google @lat,lng form and ignores non-map links', () => {
    expect(coordinatesFromMapUrl('https://www.google.com/maps/place/Kotor/@42.4247,18.7712,15z')).toEqual({ lat: 42.4247, lng: 18.7712 });
    expect(coordinatesFromMapUrl('https://example.com/?q=42.44,19.26')).toBeUndefined();
  });
});
