/**
 * Utility for conditionally joining class names together.
 */
export function cn(...inputs: unknown[]): string {
  return inputs.filter((v): v is string => typeof v === 'string' && v.length > 0).join(' ');
}

export interface CardData {
  id: number;
  title: string;
  description: string;
  color: string;
}

export const cardData: CardData[] = [
  {
    id: 1,
    title: 'Luxury Villas',
    description: 'Discover premium villas across the Balkans with breathtaking views and modern amenities.',
    color: 'rgba(59, 130, 246, 0.8)',
  },
  {
    id: 2,
    title: 'City Apartments',
    description: 'Find stylish apartments in vibrant city centers, perfect for urban living.',
    color: 'rgba(139, 92, 246, 0.8)',
  },
  {
    id: 3,
    title: 'Seaside Properties',
    description: 'Explore stunning coastal homes along the Adriatic and Mediterranean shores.',
    color: 'rgba(14, 165, 233, 0.8)',
  },
  {
    id: 4,
    title: 'Mountain Retreats',
    description: 'Escape to serene mountain properties surrounded by pristine nature.',
    color: 'rgba(16, 185, 129, 0.8)',
  },
  {
    id: 5,
    title: 'Investment Properties',
    description: 'High-yield real estate opportunities across emerging Balkan markets.',
    color: 'rgba(245, 158, 11, 0.8)',
  },
];
