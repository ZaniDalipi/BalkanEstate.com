import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  noindex?: boolean;
  // Property-specific fields for rich snippets
  property?: {
    price?: number;
    currency?: string;
    bedrooms?: number;
    bathrooms?: number;
    sqft?: number;
    address?: string;
    city?: string;
    country?: string;
    propertyType?: string;
    images?: string[];
    latitude?: number;
    longitude?: number;
  };
  // Agency-specific fields
  agency?: {
    name?: string;
    logo?: string;
    description?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

const SITE_NAME = 'BalkanEstateAI';
const DEFAULT_DESCRIPTION = 'Find your dream property in the Balkans with AI. Browse houses, apartments, and villas for sale across Serbia, Montenegro, Croatia, and more. Your AI-powered real estate platform.';
const DEFAULT_IMAGE = '/og-image.png';
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://balkanestateai.com';

export const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
  property,
  agency,
}) => {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const fullImage = image.startsWith('http') ? image : `${BASE_URL}${image}`;
  const canonicalUrl = canonical || (typeof window !== 'undefined' ? window.location.href : BASE_URL);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />

      {/* Additional SEO Meta Tags */}
      <meta name="theme-color" content="#0252CD" />
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="apple-mobile-web-app-title" content={SITE_NAME} />

      {/* Geo Meta Tags for Balkans */}
      <meta name="geo.region" content="RS" />
      <meta name="geo.placename" content="Balkans" />

      {/* Property-specific JSON-LD */}
      {property && (
        <script type="application/ld+json">
          {JSON.stringify(generatePropertySchema(property, fullTitle, description, fullImage, canonicalUrl))}
        </script>
      )}

      {/* Agency-specific JSON-LD */}
      {agency && (
        <script type="application/ld+json">
          {JSON.stringify(generateAgencySchema(agency))}
        </script>
      )}

      {/* Website-level JSON-LD */}
      {!property && !agency && (
        <script type="application/ld+json">
          {JSON.stringify(generateWebsiteSchema())}
        </script>
      )}
    </Helmet>
  );
};

// Generate JSON-LD Schema for Property Listings
function generatePropertySchema(
  property: SEOProps['property'],
  title: string,
  description: string,
  image: string,
  url: string
) {
  if (!property) return {};

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: title,
    description: description,
    url: url,
    image: property.images?.length ? property.images : [image],
    datePosted: new Date().toISOString(),

    // Property Details
    ...(property.bedrooms && { numberOfBedrooms: property.bedrooms }),
    ...(property.bathrooms && { numberOfBathroomsTotal: property.bathrooms }),
    ...(property.sqft && {
      floorSize: {
        '@type': 'QuantitativeValue',
        value: property.sqft,
        unitCode: 'FTK' // Square feet
      }
    }),

    // Price
    ...(property.price && {
      offers: {
        '@type': 'Offer',
        price: property.price,
        priceCurrency: property.currency || 'EUR',
        availability: 'https://schema.org/InStock',
        url: url
      }
    }),

    // Location
    ...(property.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: property.address,
        addressLocality: property.city,
        addressCountry: property.country
      }
    }),

    // Geo Coordinates
    ...(property.latitude && property.longitude && {
      geo: {
        '@type': 'GeoCoordinates',
        latitude: property.latitude,
        longitude: property.longitude
      }
    }),

    // Property Type
    ...(property.propertyType && {
      '@type': ['RealEstateListing', getSchemaPropertyType(property.propertyType)]
    })
  };

  return schema;
}

// Generate JSON-LD Schema for Real Estate Agencies
function generateAgencySchema(agency: SEOProps['agency']) {
  if (!agency) return {};

  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: agency.name,
    description: agency.description,
    logo: agency.logo,
    image: agency.logo,
    ...(agency.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: agency.address
      }
    }),
    ...(agency.phone && { telephone: agency.phone }),
    ...(agency.email && { email: agency.email }),
    areaServed: {
      '@type': 'GeoCircle',
      geoMidpoint: {
        '@type': 'GeoCoordinates',
        latitude: 44.0165,
        longitude: 21.0059 // Central Balkans
      },
      geoRadius: '500'
    }
  };
}

// Generate Website-level JSON-LD Schema
function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    url: BASE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logo.png`
      }
    }
  };
}

// Map property types to Schema.org types
function getSchemaPropertyType(type: string): string {
  const typeMap: Record<string, string> = {
    house: 'House',
    apartment: 'Apartment',
    villa: 'House',
    condo: 'Apartment',
    land: 'LandOrLot',
    commercial: 'CommercialBuilding',
    other: 'Residence'
  };
  return typeMap[type.toLowerCase()] || 'Residence';
}

export default SEO;
