const countryCurrencyMap: { [key: string]: string } = {
  'Serbia': 'EUR',
  'Croatia': 'EUR',
  'Bosnia and Herzegovina': 'EUR',
  'Slovenia': 'EUR',
  'North Macedonia': 'EUR',
  'Montenegro': 'EUR',
  'Albania': 'EUR',
  'Bulgaria': 'EUR',
  'Greece': 'EUR',
  'Kosovo': 'EUR',
  'Romania': 'EUR',
};

export const formatPrice = (price: number, country: string): string => {
  const currency = countryCurrencyMap[country] || 'EUR'; // Default to EUR

  // Use a locale that fits the general Balkan number format (e.g., de-DE uses dots for thousands)
  return new Intl.NumberFormat('de-DE', { 
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0, 
    minimumFractionDigits: 0,
  }).format(price);
};

export const getCurrencySymbol = (country: string): string => {
    const currencyCode = countryCurrencyMap[country] || 'EUR';
    // This is a simplified way to get a symbol; Intl API is more robust.
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode });
    const parts = formatter.formatToParts(1);
    const symbol = parts.find(part => part.type === 'currency')?.value || '€';
    return symbol;
};

export const COUNTRIES = Object.keys(countryCurrencyMap);