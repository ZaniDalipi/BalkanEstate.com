export interface PhoneCountryCode {
    code: string;
    country: string;
    label: string;
    flag: string;
}

// Balkan country codes (shown first in dropdowns)
export const BALKAN_PHONE_CODES: PhoneCountryCode[] = [
    { code: '+383', country: 'XK', label: 'Kosovo', flag: '🇽🇰' },
    { code: '+355', country: 'AL', label: 'Albania', flag: '🇦🇱' },
    { code: '+381', country: 'RS', label: 'Serbia', flag: '🇷🇸' },
    { code: '+389', country: 'MK', label: 'N. Macedonia', flag: '🇲🇰' },
    { code: '+387', country: 'BA', label: 'Bosnia', flag: '🇧🇦' },
    { code: '+382', country: 'ME', label: 'Montenegro', flag: '🇲🇪' },
    { code: '+385', country: 'HR', label: 'Croatia', flag: '🇭🇷' },
    { code: '+386', country: 'SI', label: 'Slovenia', flag: '🇸🇮' },
    { code: '+359', country: 'BG', label: 'Bulgaria', flag: '🇧🇬' },
    { code: '+40', country: 'RO', label: 'Romania', flag: '🇷🇴' },
    { code: '+30', country: 'GR', label: 'Greece', flag: '🇬🇷' },
];

// International country codes (sorted alphabetically)
export const INTERNATIONAL_PHONE_CODES: PhoneCountryCode[] = [
    { code: '+93', country: 'AF', label: 'Afghanistan', flag: '🇦🇫' },
    { code: '+54', country: 'AR', label: 'Argentina', flag: '🇦🇷' },
    { code: '+61', country: 'AU', label: 'Australia', flag: '🇦🇺' },
    { code: '+43', country: 'AT', label: 'Austria', flag: '🇦🇹' },
    { code: '+973', country: 'BH', label: 'Bahrain', flag: '🇧🇭' },
    { code: '+880', country: 'BD', label: 'Bangladesh', flag: '🇧🇩' },
    { code: '+375', country: 'BY', label: 'Belarus', flag: '🇧🇾' },
    { code: '+32', country: 'BE', label: 'Belgium', flag: '🇧🇪' },
    { code: '+55', country: 'BR', label: 'Brazil', flag: '🇧🇷' },
    { code: '+1', country: 'CA', label: 'Canada', flag: '🇨🇦' },
    { code: '+56', country: 'CL', label: 'Chile', flag: '🇨🇱' },
    { code: '+86', country: 'CN', label: 'China', flag: '🇨🇳' },
    { code: '+57', country: 'CO', label: 'Colombia', flag: '🇨🇴' },
    { code: '+506', country: 'CR', label: 'Costa Rica', flag: '🇨🇷' },
    { code: '+357', country: 'CY', label: 'Cyprus', flag: '🇨🇾' },
    { code: '+420', country: 'CZ', label: 'Czech Republic', flag: '🇨🇿' },
    { code: '+45', country: 'DK', label: 'Denmark', flag: '🇩🇰' },
    { code: '+20', country: 'EG', label: 'Egypt', flag: '🇪🇬' },
    { code: '+372', country: 'EE', label: 'Estonia', flag: '🇪🇪' },
    { code: '+358', country: 'FI', label: 'Finland', flag: '🇫🇮' },
    { code: '+33', country: 'FR', label: 'France', flag: '🇫🇷' },
    { code: '+49', country: 'DE', label: 'Germany', flag: '🇩🇪' },
    { code: '+233', country: 'GH', label: 'Ghana', flag: '🇬🇭' },
    { code: '+852', country: 'HK', label: 'Hong Kong', flag: '🇭🇰' },
    { code: '+36', country: 'HU', label: 'Hungary', flag: '🇭🇺' },
    { code: '+354', country: 'IS', label: 'Iceland', flag: '🇮🇸' },
    { code: '+91', country: 'IN', label: 'India', flag: '🇮🇳' },
    { code: '+62', country: 'ID', label: 'Indonesia', flag: '🇮🇩' },
    { code: '+98', country: 'IR', label: 'Iran', flag: '🇮🇷' },
    { code: '+964', country: 'IQ', label: 'Iraq', flag: '🇮🇶' },
    { code: '+353', country: 'IE', label: 'Ireland', flag: '🇮🇪' },
    { code: '+972', country: 'IL', label: 'Israel', flag: '🇮🇱' },
    { code: '+39', country: 'IT', label: 'Italy', flag: '🇮🇹' },
    { code: '+81', country: 'JP', label: 'Japan', flag: '🇯🇵' },
    { code: '+962', country: 'JO', label: 'Jordan', flag: '🇯🇴' },
    { code: '+7', country: 'KZ', label: 'Kazakhstan', flag: '🇰🇿' },
    { code: '+254', country: 'KE', label: 'Kenya', flag: '🇰🇪' },
    { code: '+82', country: 'KR', label: 'South Korea', flag: '🇰🇷' },
    { code: '+965', country: 'KW', label: 'Kuwait', flag: '🇰🇼' },
    { code: '+371', country: 'LV', label: 'Latvia', flag: '🇱🇻' },
    { code: '+961', country: 'LB', label: 'Lebanon', flag: '🇱🇧' },
    { code: '+370', country: 'LT', label: 'Lithuania', flag: '🇱🇹' },
    { code: '+352', country: 'LU', label: 'Luxembourg', flag: '🇱🇺' },
    { code: '+60', country: 'MY', label: 'Malaysia', flag: '🇲🇾' },
    { code: '+356', country: 'MT', label: 'Malta', flag: '🇲🇹' },
    { code: '+52', country: 'MX', label: 'Mexico', flag: '🇲🇽' },
    { code: '+373', country: 'MD', label: 'Moldova', flag: '🇲🇩' },
    { code: '+212', country: 'MA', label: 'Morocco', flag: '🇲🇦' },
    { code: '+31', country: 'NL', label: 'Netherlands', flag: '🇳🇱' },
    { code: '+64', country: 'NZ', label: 'New Zealand', flag: '🇳🇿' },
    { code: '+234', country: 'NG', label: 'Nigeria', flag: '🇳🇬' },
    { code: '+47', country: 'NO', label: 'Norway', flag: '🇳🇴' },
    { code: '+968', country: 'OM', label: 'Oman', flag: '🇴🇲' },
    { code: '+92', country: 'PK', label: 'Pakistan', flag: '🇵🇰' },
    { code: '+51', country: 'PE', label: 'Peru', flag: '🇵🇪' },
    { code: '+63', country: 'PH', label: 'Philippines', flag: '🇵🇭' },
    { code: '+48', country: 'PL', label: 'Poland', flag: '🇵🇱' },
    { code: '+351', country: 'PT', label: 'Portugal', flag: '🇵🇹' },
    { code: '+974', country: 'QA', label: 'Qatar', flag: '🇶🇦' },
    { code: '+7', country: 'RU', label: 'Russia', flag: '🇷🇺' },
    { code: '+966', country: 'SA', label: 'Saudi Arabia', flag: '🇸🇦' },
    { code: '+65', country: 'SG', label: 'Singapore', flag: '🇸🇬' },
    { code: '+421', country: 'SK', label: 'Slovakia', flag: '🇸🇰' },
    { code: '+27', country: 'ZA', label: 'South Africa', flag: '🇿🇦' },
    { code: '+34', country: 'ES', label: 'Spain', flag: '🇪🇸' },
    { code: '+46', country: 'SE', label: 'Sweden', flag: '🇸🇪' },
    { code: '+41', country: 'CH', label: 'Switzerland', flag: '🇨🇭' },
    { code: '+66', country: 'TH', label: 'Thailand', flag: '🇹🇭' },
    { code: '+90', country: 'TR', label: 'Turkey', flag: '🇹🇷' },
    { code: '+380', country: 'UA', label: 'Ukraine', flag: '🇺🇦' },
    { code: '+971', country: 'AE', label: 'UAE', flag: '🇦🇪' },
    { code: '+44', country: 'GB', label: 'United Kingdom', flag: '🇬🇧' },
    { code: '+1', country: 'US', label: 'United States', flag: '🇺🇸' },
    { code: '+58', country: 'VE', label: 'Venezuela', flag: '🇻🇪' },
    { code: '+84', country: 'VN', label: 'Vietnam', flag: '🇻🇳' },
];

// Combined list: Balkan countries first, then international
export const ALL_PHONE_COUNTRY_CODES: PhoneCountryCode[] = [
    ...BALKAN_PHONE_CODES,
    ...INTERNATIONAL_PHONE_CODES,
];

// Phone number format patterns per country code (digit groupings)
export const PHONE_FORMAT_PATTERNS: Record<string, number[]> = {
    // Balkan countries
    '+383': [2, 3, 4],    // Kosovo: 44 123 4567
    '+355': [2, 3, 4],    // Albania: 69 123 4567
    '+381': [2, 3, 4],    // Serbia: 63 123 4567
    '+389': [2, 3, 3],    // N. Macedonia: 70 123 456
    '+387': [2, 3, 3],    // Bosnia: 61 123 456
    '+382': [2, 3, 3],    // Montenegro: 67 123 456
    '+385': [2, 3, 4],    // Croatia: 91 123 4567
    '+386': [2, 3, 2, 2], // Slovenia: 31 123 45 67
    '+359': [2, 3, 4],    // Bulgaria: 88 123 4567
    '+40':  [3, 3, 3],    // Romania: 721 123 456
    '+30':  [3, 3, 4],    // Greece: 694 123 4567
    // Common international formats
    '+1':   [3, 3, 4],    // US/Canada: 202 555 0123
    '+44':  [4, 3, 3],    // UK: 7911 123 456
    '+49':  [3, 4, 4],    // Germany: 151 1234 5678
    '+33':  [1, 2, 2, 2, 2], // France: 6 12 34 56 78
    '+39':  [3, 3, 4],    // Italy: 312 345 6789
    '+34':  [3, 3, 3],    // Spain: 612 345 678
    '+43':  [3, 3, 4],    // Austria: 664 123 4567
    '+41':  [2, 3, 2, 2], // Switzerland: 76 123 45 67
    '+31':  [1, 3, 3, 2], // Netherlands: 6 123 456 78
    '+32':  [3, 2, 2, 2], // Belgium: 470 12 34 56
    '+90':  [3, 3, 2, 2], // Turkey: 532 123 45 67
    '+380': [2, 3, 2, 2], // Ukraine: 50 123 45 67
    '+48':  [3, 3, 3],    // Poland: 512 345 678
    '+36':  [2, 3, 4],    // Hungary: 20 123 4567
    '+420': [3, 3, 3],    // Czech Republic: 601 123 456
    '+421': [3, 3, 3],    // Slovakia: 901 123 456
    '+91':  [5, 5],       // India: 98765 43210
    '+61':  [3, 3, 3],    // Australia: 412 345 678
    '+81':  [2, 4, 4],    // Japan: 90 1234 5678
    '+86':  [3, 4, 4],    // China: 131 1234 5678
    '+82':  [2, 4, 4],    // South Korea: 10 1234 5678
    '+971': [2, 3, 4],    // UAE: 50 123 4567
    '+966': [2, 3, 4],    // Saudi Arabia: 50 123 4567
    '+55':  [2, 5, 4],    // Brazil: 11 91234 5678
    '+52':  [2, 4, 4],    // Mexico: 55 1234 5678
    '+27':  [2, 3, 4],    // South Africa: 82 123 4567
    '+65':  [4, 4],       // Singapore: 9123 4567
    '+353': [2, 3, 4],    // Ireland: 85 123 4567
    '+351': [3, 3, 3],    // Portugal: 912 345 678
    '+46':  [2, 3, 2, 2], // Sweden: 70 123 45 67
    '+47':  [3, 2, 3],    // Norway: 412 34 567
    '+45':  [2, 2, 2, 2], // Denmark: 20 12 34 56
    '+358': [2, 3, 4],    // Finland: 40 123 4567
    '+372': [4, 4],       // Estonia: 5123 4567
    '+371': [2, 3, 3],    // Latvia: 20 123 456
    '+370': [3, 2, 3],    // Lithuania: 612 34 567
};

export const formatPhoneNumber = (countryCode: string, digits: string): string => {
    const clean = digits.replace(/\D/g, '');
    const pattern = PHONE_FORMAT_PATTERNS[countryCode] || [3, 3, 4];
    const parts: string[] = [];
    let pos = 0;
    for (const groupSize of pattern) {
        if (pos >= clean.length) break;
        parts.push(clean.slice(pos, pos + groupSize));
        pos += groupSize;
    }
    if (pos < clean.length && parts.length > 0) {
        parts[parts.length - 1] += clean.slice(pos);
    } else if (pos < clean.length) {
        parts.push(clean.slice(pos));
    }
    return parts.join(' ');
};

export const getPhonePlaceholder = (countryCode: string): string => {
    const pattern = PHONE_FORMAT_PATTERNS[countryCode] || [3, 3, 4];
    return pattern.map(n => 'X'.repeat(n)).join(' ');
};
