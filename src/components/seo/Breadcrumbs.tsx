import React from 'react';
import { Helmet } from 'react-helmet-async';
import { generatePropertySlug } from '@/utils/slug';

interface BreadcrumbItem {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * SEO-friendly Breadcrumbs Component
 * Includes JSON-LD structured data for rich snippets in Google
 *
 * Usage:
 * <Breadcrumbs items={[
 *   { label: 'Home', href: '/' },
 *   { label: 'Properties', href: '/search' },
 *   { label: 'Belgrade', href: '/search?city=Belgrade' },
 *   { label: '123 Main St', href: '/property/123' }
 * ]} />
 */
export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://balkanestate.com';

  // Generate JSON-LD structured data for breadcrumbs
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: item.href.startsWith('http') ? item.href : `${baseUrl}${item.href}`,
    })),
  };

  const handleClick = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    window.history.pushState({}, '', href);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      <nav aria-label="Breadcrumb" className={`flex items-center text-sm ${className}`}>
        <ol className="flex items-center flex-wrap gap-1" itemScope itemType="https://schema.org/BreadcrumbList">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;

            return (
              <li
                key={item.href}
                className="flex items-center"
                itemScope
                itemProp="itemListElement"
                itemType="https://schema.org/ListItem"
              >
                {index > 0 && (
                  <svg
                    className="w-4 h-4 text-neutral-400 mx-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}

                {isLast ? (
                  <span
                    className="text-neutral-600 font-medium truncate max-w-[200px]"
                    itemProp="name"
                    aria-current="page"
                  >
                    {item.label}
                  </span>
                ) : (
                  <a
                    href={item.href}
                    onClick={(e) => handleClick(item.href, e)}
                    className="text-primary hover:text-primary-dark hover:underline transition-colors"
                    itemProp="item"
                  >
                    <span itemProp="name">{item.label}</span>
                  </a>
                )}

                <meta itemProp="position" content={String(index + 1)} />
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
};

/**
 * Helper function to generate breadcrumbs for property pages
 */
export const generatePropertyBreadcrumbs = (property: {
  id: string;
  address: string;
  city: string;
  country: string;
  beds?: number;
  propertyType?: string;
  listingType?: string;
}): BreadcrumbItem[] => {
  return [
    { label: 'Home', href: '/' },
    { label: 'Properties', href: '/search' },
    { label: property.country, href: `/search?country=${encodeURIComponent(property.country)}` },
    { label: property.city, href: `/search?city=${encodeURIComponent(property.city)}` },
    { label: property.address, href: `/property/${generatePropertySlug(property)}` },
  ];
};

/**
 * Helper function to generate breadcrumbs for agency pages
 */
export const generateAgencyBreadcrumbs = (agency: {
  slug: string;
  name: string;
  country?: string;
}): BreadcrumbItem[] => {
  const items: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Agencies', href: '/agencies' },
  ];

  if (agency.country) {
    items.push({
      label: agency.country,
      href: `/agencies?country=${encodeURIComponent(agency.country)}`,
    });
  }

  items.push({ label: agency.name, href: `/agencies/${agency.slug}` });

  return items;
};

/**
 * Helper function to generate breadcrumbs for agent profile pages
 */
export const generateAgentBreadcrumbs = (agent: {
  id: string;
  name: string;
  city?: string;
  country?: string;
}): BreadcrumbItem[] => {
  const items: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Agents', href: '/agents' },
  ];

  if (agent.country) {
    items.push({
      label: agent.country,
      href: `/agents?country=${encodeURIComponent(agent.country)}`,
    });
  }

  if (agent.city) {
    items.push({
      label: agent.city,
      href: `/agents?city=${encodeURIComponent(agent.city)}`,
    });
  }

  items.push({ label: agent.name, href: `/agents/${agent.id}` });

  return items;
};

/**
 * Helper function to generate breadcrumbs for search pages
 */
export const generateSearchBreadcrumbs = (filters: {
  city?: string;
  country?: string;
  propertyType?: string;
}): BreadcrumbItem[] => {
  const items: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Properties', href: '/search' },
  ];

  if (filters.country) {
    items.push({
      label: filters.country,
      href: `/search?country=${encodeURIComponent(filters.country)}`,
    });
  }

  if (filters.city) {
    items.push({
      label: filters.city,
      href: `/search?city=${encodeURIComponent(filters.city)}`,
    });
  }

  if (filters.propertyType) {
    const typeLabel = filters.propertyType.charAt(0).toUpperCase() + filters.propertyType.slice(1) + 's';
    items.push({
      label: typeLabel,
      href: `/search?propertyType=${encodeURIComponent(filters.propertyType)}`,
    });
  }

  return items;
};

export default Breadcrumbs;
