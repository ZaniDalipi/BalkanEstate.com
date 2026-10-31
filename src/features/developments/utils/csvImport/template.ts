/** A ready-to-fill example sheet (semicolon-separated, as Excel opens it in the region). */
export const buildTemplateCsv = (): string =>
  [
    'Building;Floor;Unit number;Type;Bedrooms;Bathrooms;Area (m2);Price;Currency;Availability;Orientation;Features',
    'Object A;Ground floor;A-001;Retail;;1;85;;EUR;Available;South;',
    'Object A;1;A-101;Apartment;2;1;64,5;96.000;EUR;Available;South-east;Corner, Parking',
    'Object A;1;A-102;Studio;0;1;38;52.000;EUR;Reserved;North;',
    'Object A;2;A-201;Apartment;3;2;92;138.000;EUR;Sold;South-west;Big terrace, Storage',
    'Object B;1;B-101;Apartment;2;1;70;99.000;EUR;Not released;East;',
  ].join('\r\n') + '\r\n';
