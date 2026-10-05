import type { FeedMapping } from './feedTypes';

/**
 * The BalkanEstateAI canonical feed format (version 1.0).
 *
 * Documented for agencies in docs/agency-feeds/README.md, with a full example
 * in docs/agency-feeds/sample-feed.xml. An agency whose CRM can emit this
 * format needs no field mapping at all; every other feed uses a custom
 * `FeedMapping` built in the dashboard.
 *
 *   <balkanestate-feed version="1.0" total="2" next-page="https://…">
 *     <listing>
 *       <id>AG-1001</id>
 *       <status>active</status>                 active|sold|rented|reserved|removed
 *       <url>https://agency.example/l/1001</url>
 *       <title><![CDATA[…]]></title>
 *       <description><![CDATA[…]]></description>
 *       <transaction>sale</transaction>         sale|rent
 *       <rent-period>monthly</rent-period>
 *       <type>apartment</type>
 *       <price currency="EUR">185000</price>    or <price on-request="true"/>
 *       <location visibility="exact">           exact|private
 *         <country/> <city/> <district/> <address/> <latitude/> <longitude/>
 *       </location>
 *       <area unit="m2">74</area> <land-area/> <bedrooms/> <bathrooms/>
 *       <living-rooms/> <floor/> <total-floors/> <year-built/> <energy-rating/>
 *       <amenities><amenity>balcony</amenity></amenities>
 *       <images><image url="…"/></images>
 *       <floorplans><floorplan url="…" label="Ground floor"/></floorplans>
 *       <updated>2026-09-28T10:00:00Z</updated>
 *     </listing>
 *   </balkanestate-feed>
 */
export const CANONICAL_FORMAT_VERSION = '1.0';

export const CANONICAL_MAPPING: FeedMapping = {
  recordElement: 'listing',
  fields: {
    externalId: 'id',
    status: 'status',
    sourceUrl: 'url',
    title: 'title',
    description: 'description',
    listingType: 'transaction',
    rentPeriod: 'rent-period',
    propertyType: 'type',
    price: 'price',
    currency: 'price/@currency',
    priceOnRequest: 'price/@on-request',
    country: 'location/country',
    city: 'location/city',
    district: 'location/district',
    address: 'location/address',
    addressVisibility: 'location/@visibility',
    latitude: 'location/latitude',
    longitude: 'location/longitude',
    area: 'area',
    landArea: 'land-area',
    bedrooms: 'bedrooms',
    bathrooms: 'bathrooms',
    livingRooms: 'living-rooms',
    floor: 'floor',
    totalFloors: 'total-floors',
    yearBuilt: 'year-built',
    energyRating: 'energy-rating',
    amenities: 'amenities/amenity',
    images: 'images/image',
    floorplans: 'floorplans/floorplan',
    updatedAt: 'updated',
  },
  areaUnit: 'm2',
  feed: {
    totalCount: '@total',
    nextPage: '@next-page',
  },
};
