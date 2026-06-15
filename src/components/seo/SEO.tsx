import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

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
    originalPrice?: number;
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
    datePosted?: number | string;
    dateModified?: number | string;
    // Video/virtual tour for VideoObject schema
    videoUrl?: string;
    virtualTour360Url?: string;
    listingType?: 'sale' | 'rent';
  };
  // Agency-specific fields
  agency?: {
    name?: string;
    logo?: string;
    description?: string;
    address?: string;
    city?: string;
    country?: string;
    phone?: string;
    email?: string;
    rating?: number;
    totalReviews?: number;
    totalProperties?: number;
    totalAgents?: number;
    website?: string;
    yearsFounded?: number;
  };
  // Agent-specific fields for PersonSchema + AggregateRating
  agent?: {
    name?: string;
    image?: string;
    description?: string;
    phone?: string;
    email?: string;
    city?: string;
    country?: string;
    rating?: number;
    totalReviews?: number;
    activeListings?: number;
    propertiesSold?: number;
    specializations?: string[];
    languages?: string[];
    yearsOfExperience?: number;
    agencyName?: string;
    agencySlug?: string;
  };
  // Search results for ItemList schema (Zillow-style)
  searchResults?: Array<{
    id: string;
    title: string;
    url: string;
    image?: string;
    price?: number;
    currency?: string;
    city?: string;
    country?: string;
  }>;
}

const SITE_NAME = 'BalkanEstateAI';
const DEFAULT_DESCRIPTION = 'Find property for sale across 11 Balkan countries. Browse apartments in Tirana, villas in Montenegro, houses in Belgrade, real estate in North Macedonia, and more. AI-powered search, 10 languages. The only pan-Balkan property platform.';
const DEFAULT_IMAGE = '/og-image.jpg';
const BASE_URL = typeof window !== 'undefined' ? window.location.origin : 'https://balkanestateai.com';

// All supported languages for hreflang tags
const HREFLANG_LANGUAGES = ['en', 'sq', 'sr', 'bg', 'hr', 'bs', 'mk', 'me', 'ro', 'el'] as const;

// Map language codes to og:locale format
const OG_LOCALE_MAP: Record<string, string> = {
  en: 'en_US', sq: 'sq_AL', sr: 'sr_RS', bg: 'bg_BG',
  hr: 'hr_HR', bs: 'bs_BA', mk: 'mk_MK', me: 'sr_ME',
  ro: 'ro_RO', el: 'el_GR',
};

/**
 * Get the current page path without language prefix,
 * so we can generate hreflang alternates for all languages.
 */
function getPathWithoutLang(): string {
  if (typeof window === 'undefined') return '/';
  const path = window.location.pathname;
  const match = path.match(/^\/(en|sq|sr|bg|hr|bs|mk|me|ro|el)(\/|$)/);
  if (match) {
    const rest = path.slice(match[0].length);
    return rest.startsWith('/') ? rest : '/' + (rest || '');
  }
  return path;
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description = DEFAULT_DESCRIPTION,
  canonical,
  image = DEFAULT_IMAGE,
  type = 'website',
  noindex = false,
  property,
  agency,
  agent,
  searchResults,
}) => {
  const { i18n } = useTranslation();
  const currentLang = (i18n.language || 'en').split('-')[0];
  const ogLocale = OG_LOCALE_MAP[currentLang] || 'en_US';

  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const fullImage = image.startsWith('http') ? image : `${BASE_URL}${image}`;
  const canonicalUrl = canonical || (typeof window !== 'undefined' ? window.location.href.split('#')[0].split('?')[0] : BASE_URL);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={property ? 'product' : type} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:alt" content={title || 'BalkanEstateAI - Property for sale in the Balkans'} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:locale" content={ogLocale} />
      {/* Alternate locales for Facebook to discover other language versions */}
      {HREFLANG_LANGUAGES.filter(lang => lang !== currentLang).map(lang => (
        <meta key={`og-alt-${lang}`} property="og:locale:alternate" content={OG_LOCALE_MAP[lang] || 'en_US'} />
      ))}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:image:alt" content={title || 'BalkanEstateAI - Property for sale in the Balkans'} />

      {/* Geo Meta Tags for Balkans */}
      <meta name="geo.region" content="RS" />
      <meta name="geo.placename" content="Balkans" />

      {/* Dynamic hreflang tags for all 10 supported languages */}
      {HREFLANG_LANGUAGES.map(lang => (
        <link
          key={lang}
          rel="alternate"
          hrefLang={lang}
          href={`${BASE_URL}/${lang}${getPathWithoutLang() === '/' ? '' : getPathWithoutLang()}`}
        />
      ))}
      <link rel="alternate" hrefLang="x-default" href={`${BASE_URL}${getPathWithoutLang()}`} />

      {/* Open Graph product price tags for property pages */}
      {property?.price && (
        <>
          <meta property="product:price:amount" content={String(property.price)} />
          <meta property="product:price:currency" content={property.currency || 'EUR'} />
          {property.city && <meta property="og:locality" content={property.city} />}
          {property.country && <meta property="og:country-name" content={property.country} />}
        </>
      )}

      {/* Property-specific JSON-LD */}
      {property && (
        <script type="application/ld+json">
          {JSON.stringify(generatePropertySchema(property, fullTitle, description, fullImage, canonicalUrl, currentLang))}
        </script>
      )}

      {/* VideoObject schema for properties with video/virtual tours */}
      {property && (property.videoUrl || property.virtualTour360Url) && (
        <script type="application/ld+json">
          {JSON.stringify(generateVideoSchema(property, fullTitle, description, fullImage, canonicalUrl, currentLang))}
        </script>
      )}

      {/* Agency-specific JSON-LD with AggregateRating */}
      {agency && (
        <script type="application/ld+json">
          {JSON.stringify(generateAgencySchema(agency, currentLang))}
        </script>
      )}

      {/* Agent-specific JSON-LD with AggregateRating */}
      {agent && (
        <script type="application/ld+json">
          {JSON.stringify(generateAgentSchema(agent, currentLang))}
        </script>
      )}

      {/* ItemList schema for search results pages (Zillow-style) */}
      {searchResults && searchResults.length > 0 && (
        <script type="application/ld+json">
          {JSON.stringify(generateItemListSchema(searchResults, fullTitle, description, canonicalUrl))}
        </script>
      )}

      {/* Website-level JSON-LD */}
      {!property && !agency && !agent && !searchResults && (
        <script type="application/ld+json">
          {JSON.stringify(generateWebsiteSchema(currentLang))}
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
  url: string,
  lang: string
) {
  if (!property) return {};

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: title,
    description: description,
    url: url,
    inLanguage: lang,
    image: property.images?.length ? property.images : [image],
    datePosted: property.datePosted
      ? new Date(typeof property.datePosted === 'number' ? property.datePosted : property.datePosted).toISOString()
      : new Date().toISOString(),
    ...(property.dateModified && {
      dateModified: new Date(typeof property.dateModified === 'number' ? property.dateModified : property.dateModified).toISOString(),
    }),

    // Property Details
    ...(property.bedrooms && { numberOfBedrooms: property.bedrooms }),
    ...(property.bathrooms && { numberOfBathroomsTotal: property.bathrooms }),
    ...(property.sqft && {
      floorSize: {
        '@type': 'QuantitativeValue',
        value: property.sqft,
        unitCode: 'MTK', // Square meters (Balkan standard)
        unitText: 'm²'
      }
    }),

    // Price with Offer schema
    ...(property.price && {
      offers: {
        '@type': 'Offer',
        price: property.price,
        priceCurrency: property.currency || 'EUR',
        availability: 'https://schema.org/InStock',
        url: url,
        validFrom: property.datePosted
          ? new Date(typeof property.datePosted === 'number' ? property.datePosted : property.datePosted).toISOString()
          : new Date().toISOString(),
        seller: {
          '@type': 'Organization',
          name: 'BalkanEstateAI',
          url: 'https://balkanestateai.com'
        },
        // If price was reduced, include original price for price drop rich results
        ...(property.originalPrice && property.originalPrice > property.price && {
          priceSpecification: {
            '@type': 'PriceSpecification',
            price: property.price,
            priceCurrency: property.currency || 'EUR',
          },
        }),
      }
    }),

    // Location
    ...(property.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: property.address,
        addressLocality: property.city,
        addressCountry: property.country,
        addressRegion: property.city
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
    }),

    // Category for listing type
    ...(property.listingType && {
      category: property.listingType === 'rent' ? 'Rental' : 'For Sale'
    }),

    // Provider info
    provider: {
      '@type': 'Organization',
      name: 'BalkanEstateAI',
      url: 'https://balkanestateai.com'
    }
  };

  return schema;
}

// Generate JSON-LD Schema for Real Estate Agencies (with AggregateRating)
function generateAgencySchema(agency: SEOProps['agency'], lang: string) {
  if (!agency) return {};

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: agency.name,
    description: agency.description,
    inLanguage: lang,
    logo: agency.logo,
    image: agency.logo,
    ...(agency.address && {
      address: {
        '@type': 'PostalAddress',
        streetAddress: agency.address,
        ...(agency.city && { addressLocality: agency.city }),
        ...(agency.country && { addressCountry: agency.country }),
      }
    }),
    ...(agency.phone && { telephone: agency.phone }),
    ...(agency.email && { email: agency.email }),
    ...(agency.website && { url: agency.website }),
    ...(agency.yearsFounded && { foundingDate: String(agency.yearsFounded) }),
    ...(agency.totalAgents && { numberOfEmployees: agency.totalAgents }),
    ...(agency.totalProperties && {
      makesOffer: {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: `${agency.totalProperties} Active Property Listings`,
        },
      },
    }),
    areaServed: {
      '@type': 'GeoCircle',
      geoMidpoint: {
        '@type': 'GeoCoordinates',
        latitude: 44.0165,
        longitude: 21.0059
      },
      geoRadius: '500'
    },
    priceRange: '€€-€€€€',
  };

  // AggregateRating - critical for rich snippets with stars in SERPs
  if (agency.rating && agency.rating > 0 && agency.totalReviews && agency.totalReviews > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: agency.rating.toFixed(1),
      bestRating: '5',
      worstRating: '1',
      ratingCount: agency.totalReviews,
    };
  }

  return schema;
}

// Generate JSON-LD Schema for Real Estate Agents (Person + AggregateRating)
function generateAgentSchema(agent: SEOProps['agent'], lang: string) {
  if (!agent) return {};

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    name: agent.name,
    inLanguage: lang,
    ...(agent.image && { image: agent.image }),
    ...(agent.description && { description: agent.description }),
    ...(agent.phone && { telephone: agent.phone }),
    ...(agent.email && { email: agent.email }),
    ...(agent.city && agent.country && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: agent.city,
        addressCountry: agent.country,
      }
    }),
    ...(agent.languages && agent.languages.length > 0 && {
      knowsLanguage: agent.languages,
    }),
    ...(agent.specializations && agent.specializations.length > 0 && {
      knowsAbout: agent.specializations,
    }),
    ...(agent.agencyName && {
      worksFor: {
        '@type': 'RealEstateAgent',
        name: agent.agencyName,
        ...(agent.agencySlug && {
          url: `${BASE_URL}/agencies/${agent.agencySlug}`,
        }),
      },
    }),
    ...(agent.activeListings && {
      makesOffer: {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: `${agent.activeListings} Active Property Listings`,
        },
      },
    }),
    priceRange: '€€-€€€€',
  };

  // AggregateRating for agent - enables star ratings in search results
  if (agent.rating && agent.rating > 0 && agent.totalReviews && agent.totalReviews > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: agent.rating.toFixed(1),
      bestRating: '5',
      worstRating: '1',
      ratingCount: agent.totalReviews,
    };
  }

  return schema;
}

// Generate VideoObject schema for properties with video/virtual tours
function generateVideoSchema(
  property: SEOProps['property'],
  title: string,
  description: string,
  thumbnail: string,
  url: string,
  lang: string
) {
  if (!property) return {};

  const videoUrl = property.videoUrl || property.virtualTour360Url;
  if (!videoUrl) return {};

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    inLanguage: lang,
    name: `${title} - Property Tour`,
    description: `Virtual tour of ${description}`,
    thumbnailUrl: thumbnail,
    contentUrl: videoUrl,
    ...(property.virtualTour360Url && { embedUrl: property.virtualTour360Url }),
    uploadDate: property.datePosted
      ? new Date(typeof property.datePosted === 'number' ? property.datePosted : property.datePosted).toISOString()
      : new Date().toISOString(),
    potentialAction: {
      '@type': 'WatchAction',
      target: url,
    },
  };
}

// Generate ItemList schema for search results pages (like Zillow)
function generateItemListSchema(
  results: NonNullable<SEOProps['searchResults']>,
  title: string,
  description: string,
  url: string
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    description: description,
    url: url,
    numberOfItems: results.length,
    itemListElement: results.slice(0, 20).map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
      name: item.title,
      ...(item.image && { image: item.image }),
      ...(item.price && {
        item: {
          '@type': 'RealEstateListing',
          name: item.title,
          url: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`,
          ...(item.image && { image: item.image }),
          offers: {
            '@type': 'Offer',
            price: item.price,
            priceCurrency: item.currency || 'EUR',
            availability: 'https://schema.org/InStock',
          },
          ...(item.city && item.country && {
            address: {
              '@type': 'PostalAddress',
              addressLocality: item.city,
              addressCountry: item.country,
            }
          }),
        }
      }),
    })),
  };
}

// Generate Website-level JSON-LD Schema
function generateWebsiteSchema(lang: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    name: SITE_NAME,
    alternateName: ['Balkan Estate AI', 'BalkanEstate'],
    description: DEFAULT_DESCRIPTION,
    url: BASE_URL,
    inLanguage: lang,
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
      '@id': `${BASE_URL}/#organization`,
      name: SITE_NAME,
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/icons/icon-512x512.png`,
        width: 512,
        height: 512
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
