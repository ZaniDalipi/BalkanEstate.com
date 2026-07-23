/**
 * Interior design styles for the AI Room Styler UI.
 * `id` must match the backend catalog in backend/src/data/roomStyles.ts.
 * The authoritative prompt lives on the backend; here we only need the
 * display label and a short blurb. Styles are based on Zillow's guide.
 */
export interface RoomStyleOption {
  id: string;
  label: string;
  blurb: string;
}

export const ROOM_STYLE_OPTIONS: RoomStyleOption[] = [
  { id: 'scandinavian', label: 'Scandinavian', blurb: 'Light woods, whites & cozy minimalism' },
  { id: 'modern', label: 'Modern', blurb: 'Clean lines & neutral simplicity' },
  { id: 'contemporary', label: 'Contemporary', blurb: 'Current, sleek & sophisticated' },
  { id: 'minimalist', label: 'Minimalist', blurb: 'Only the essentials, calm & airy' },
  { id: 'mid-century-modern', label: 'Mid-Century Modern', blurb: 'Retro 50s–60s warmth & curves' },
  { id: 'industrial', label: 'Industrial', blurb: 'Brick, metal & raw warehouse edge' },
  { id: 'bohemian', label: 'Bohemian', blurb: 'Layered, earthy & plant-filled' },
  { id: 'farmhouse', label: 'Modern Farmhouse', blurb: 'Cozy, rustic & welcoming' },
  { id: 'rustic', label: 'Rustic', blurb: 'Reclaimed wood, stone & natural' },
  { id: 'coastal', label: 'Coastal', blurb: 'Breezy whites, blues & linen' },
  { id: 'traditional', label: 'Traditional', blurb: 'Timeless, rich & refined' },
  { id: 'transitional', label: 'Transitional', blurb: 'Classic meets modern balance' },
  { id: 'art-deco', label: 'Art Deco', blurb: 'Glamorous geometry & jewel tones' },
  { id: 'mediterranean', label: 'Mediterranean', blurb: 'Terracotta, arches & warm tile' },
];
