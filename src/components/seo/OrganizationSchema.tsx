import React from 'react';
import { Helmet } from 'react-helmet-async';

interface OrganizationSchemaProps {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
  email?: string;
  phone?: string;
  address?: {
    streetAddress?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  };
  socialProfiles?: string[];
  foundingDate?: string;
}

/**
 * Organization Schema Component
 * Adds JSON-LD structured data for the organization
 * Helps with Google Knowledge Panel and brand visibility
 */
export const OrganizationSchema: React.FC<OrganizationSchemaProps> = ({
  name = 'Balkan Estate',
  url = 'https://balkanestate.com',
  logo = 'https://balkanestate.com/logo.png',
  description = 'Balkan Estate is the leading real estate platform in the Balkans, connecting buyers with their dream properties across Serbia, Montenegro, Croatia, Bosnia, North Macedonia, and Albania.',
  email = 'info@balkanestate.com',
  phone,
  address,
  socialProfiles = [],
  foundingDate = '2024',
}) => {
  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${url}/#organization`,
    name,
    url,
    logo: {
      '@type': 'ImageObject',
      url: logo,
      width: 512,
      height: 512,
    },
    description,
    email,
    foundingDate,
    areaServed: [
      { '@type': 'Country', name: 'Serbia' },
      { '@type': 'Country', name: 'Montenegro' },
      { '@type': 'Country', name: 'Croatia' },
      { '@type': 'Country', name: 'Bosnia and Herzegovina' },
      { '@type': 'Country', name: 'North Macedonia' },
      { '@type': 'Country', name: 'Albania' },
      { '@type': 'Country', name: 'Kosovo' },
      { '@type': 'Country', name: 'Slovenia' },
    ],
    knowsLanguage: ['en', 'sr', 'hr', 'bs', 'mk', 'sq', 'sl'],
    slogan: 'Find Your Dream Property in the Balkans',
    priceRange: '€€-€€€€',
  };

  if (phone) {
    schema.telephone = phone;
  }

  if (address) {
    schema.address = {
      '@type': 'PostalAddress',
      streetAddress: address.streetAddress,
      addressLocality: address.city,
      addressCountry: address.country,
      postalCode: address.postalCode,
    };
  }

  if (socialProfiles.length > 0) {
    schema.sameAs = socialProfiles;
  }

  // Add additional service offerings
  schema.hasOfferCatalog = {
    '@type': 'OfferCatalog',
    name: 'Real Estate Services',
    itemListElement: [
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Property Listings',
          description: 'List your property for sale on our platform',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Property Search',
          description: 'Find your dream property using our advanced search',
        },
      },
      {
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: 'Agent Directory',
          description: 'Connect with verified real estate agents',
        },
      },
    ],
  };

  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </Helmet>
  );
};

export default OrganizationSchema;
