/**
 * Interior design style catalog for the AI Room Styler.
 * `id` is the stable key sent from the frontend and validated here.
 * `label` + `prompt` are fed to the Gemini image model.
 * Styles are based on Zillow's interior design styles guide.
 */
export interface RoomStyleDefinition {
  id: string;
  label: string;
  prompt: string;
}

export const ROOM_STYLES: RoomStyleDefinition[] = [
  {
    id: 'scandinavian',
    label: 'Scandinavian',
    prompt:
      'Light and airy Nordic look. Pale wood floors and furniture, white and soft grey walls, cozy neutral textiles, minimal clutter, functional simple furniture, plenty of natural light, a few green plants and warm hygge accents.',
  },
  {
    id: 'modern',
    label: 'Modern',
    prompt:
      'Clean 20th-century modern look. Neutral palette, sleek low-profile furniture, smooth surfaces, straight lines, minimal ornamentation, uncluttered space, metal and glass accents.',
  },
  {
    id: 'contemporary',
    label: 'Contemporary',
    prompt:
      'Current, of-the-moment design. Soft neutral base with a bold accent color, curved and sculptural furniture, mixed textures, statement lighting, an open and sophisticated feel.',
  },
  {
    id: 'minimalist',
    label: 'Minimalist',
    prompt:
      'Extreme simplicity. Monochromatic neutral palette, only essential furniture, hidden storage, empty surfaces, clean lines, calm and serene, lots of negative space.',
  },
  {
    id: 'mid-century-modern',
    label: 'Mid-Century Modern',
    prompt:
      '1950s–60s aesthetic. Warm walnut and teak wood, tapered legs, organic curved shapes, retro mustard/olive/burnt-orange accents, iconic lounge furniture, graphic patterns.',
  },
  {
    id: 'industrial',
    label: 'Industrial',
    prompt:
      'Warehouse-inspired look. Exposed brick and concrete, black metal fixtures, raw wood, Edison-bulb lighting, leather furniture, a moody utilitarian palette of grey, black and rust.',
  },
  {
    id: 'bohemian',
    label: 'Bohemian',
    prompt:
      'Eclectic, layered boho look. Warm earthy tones, patterned rugs and textiles, rattan and macramé, abundant plants, mismatched vintage furniture, relaxed and collected-over-time feel.',
  },
  {
    id: 'farmhouse',
    label: 'Modern Farmhouse',
    prompt:
      'Cozy rustic-meets-clean look. Shiplap walls, white and warm-neutral palette, natural wood beams, vintage-inspired furniture, black metal accents, comfortable and welcoming.',
  },
  {
    id: 'rustic',
    label: 'Rustic',
    prompt:
      'Natural, rugged cabin feel. Reclaimed wood, stone, exposed beams, warm earthy tones, chunky solid furniture, cozy layered textiles, a handcrafted organic look.',
  },
  {
    id: 'coastal',
    label: 'Coastal',
    prompt:
      'Breezy beach-house look. Crisp whites with soft blues and sandy neutrals, light natural wood, linen and cotton textiles, woven textures, airy and relaxed with plenty of light.',
  },
  {
    id: 'traditional',
    label: 'Traditional',
    prompt:
      'Classic, timeless elegance. Rich warm woods, symmetrical arrangements, ornate detailing, upholstered furniture, layered fabrics, refined patterns, a formal and cozy feel.',
  },
  {
    id: 'transitional',
    label: 'Transitional',
    prompt:
      'A balanced blend of traditional and modern. Neutral palette, comfortable classic silhouettes with clean modern lines, subtle textures, understated and elegant.',
  },
  {
    id: 'art-deco',
    label: 'Art Deco',
    prompt:
      'Glamorous 1920s–30s look. Bold geometric patterns, rich jewel tones, brass and gold accents, velvet upholstery, lacquered surfaces, mirrored and sunburst details, luxurious and dramatic.',
  },
  {
    id: 'mediterranean',
    label: 'Mediterranean',
    prompt:
      'Warm southern-European look. Terracotta and warm earth tones, textured plaster walls, wrought-iron details, arched shapes, patterned tile, natural wood, rustic yet elegant.',
  },
  {
    id: 'arts-and-crafts',
    label: 'Arts & Crafts',
    prompt:
      'Early-1900s Craftsman/bungalow look reacting against mass production. Artisan-made pottery, stained-glass lamps and handcrafted wood furniture, rich woodwork and built-ins, a sophisticated palette of olive green, deep purples, vermilion red and earthy tones complementing natural wood.',
  },
  {
    id: 'biophilic',
    label: 'Biophilic',
    prompt:
      'Nature-connected (naturalist) design. Greens, browns and blues drawn from sky, trees and earth; abundant houseplants and living greenery, natural materials, large connection to the outdoors and lots of daylight, calm and organic.',
  },
  {
    id: 'cottagecore',
    label: 'Cottagecore',
    prompt:
      'Nostalgic English-countryside coziness. Muted pastels, dainty floral patterns, heirloom and vintage furniture, natural textiles like linen and knit throws, layered patterns and textures, warm ambient lamp lighting (not harsh overhead), quaint and lived-in.',
  },
  {
    id: 'japandi',
    label: 'Japandi',
    prompt:
      'Japanese + Scandinavian blend. Clutter-free minimalism, natural wood, stone and paper; light Scandi woods paired with darker, richer accents — black, deep green, deep red, aubergine; slatted wood walls, low furniture, earthy yet airy and serene.',
  },
  {
    id: 'maximalism',
    label: 'Maximalism',
    prompt:
      'Bold "more is more" style. Layered textiles, clashing patterns and mixed design eras held together by a cohesive palette (jewel tones or rich earth tones), statement wallpaper and art, abundant curated objects — vibrant, harmonious and expressive rather than cluttered.',
  },
  {
    id: 'shabby-chic',
    label: 'Shabby Chic',
    prompt:
      'Romantic vintage cottage revival. Mix of vintage and new furniture with distressed/painted finishes and machine-washable slipcovers, soft colors like rose, cream and light blue, floral accents, comfortable, cozy and lightly worn.',
  },
  {
    id: 'southwestern',
    label: 'Southwestern',
    prompt:
      'American Southwest (Pueblo/adobe) look blending Spanish, Native American and Mexican influences. Heavy wood beams (vigas), desert palette of cactus greens, adobe beiges and whites, sky blue and turquoise with deep orange, red and yellow; distressed wood with metal accents, tile floors, bold graphic patterns and woven rugs, with a boho touch.',
  },
  {
    id: 'memphis',
    label: 'Memphis',
    prompt:
      '1980s Memphis design. Simple geometric shapes with pops of bright, fun clashing colors, bold graphic patterns, playful and energetic, laminate and lacquer surfaces — form and function with an uninhibited, unique personality.',
  },
  {
    id: 'hollywood-regency',
    label: 'Hollywood Regency',
    prompt:
      'Old-Hollywood glamour (1920s–50s golden age). Luxurious and maximalist: velvet, satin and faux fur, gold and metallic flourishes on furniture and walls, high-gloss lacquer, mirrored surfaces, bold jewel tones, dramatic and opulent.',
  },
  {
    id: '1970s-revival',
    label: '1970s Revival',
    prompt:
      'Modern, toned-down 1970s comeback. Warm avocado greens and burnt oranges as accents, organic shapes (kidney-bean sofas), low-slung seating, textures like macramé and rattan, wood wall paneling — groovy retro warmth paired with clean modern lines.',
  },
];

export const ROOM_STYLE_IDS = ROOM_STYLES.map(s => s.id);

export const getRoomStyle = (id: string): RoomStyleDefinition | undefined =>
  ROOM_STYLES.find(s => s.id === id);
