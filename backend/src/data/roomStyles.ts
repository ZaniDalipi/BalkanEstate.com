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
  category?: 'interior' | 'exterior';
}

export const ROOM_STYLES: RoomStyleDefinition[] = [
  {
    id: 'no-furniture',
    label: 'No Furniture',
    prompt:
      'An empty, unfurnished room. Remove ALL furniture, rugs, decor, wall art, plants, curtains and clutter, leaving the room completely empty — keep the existing wall color/finish and flooring exactly as they are.',
  },
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

/**
 * Exterior / architectural style catalog. Used when the user toggles the styler
 * to "Exterior". These restyle the facade, roof, front door, garage, driveway and
 * landscaping — never interior furniture. Ids are prefixed `ext-` to avoid
 * colliding with interior ids that share a name.
 */
export const EXTERIOR_STYLES: RoomStyleDefinition[] = [
  {
    id: 'ext-refresh',
    label: 'Refresh & Landscaping',
    category: 'exterior',
    prompt:
      'A clean, well-maintained version of the same house: healthy green lawn, tidy plants and trimmed hedges, clean driveway and paths, no clutter, cars, bins or debris. The architecture stays unchanged.',
  },
  {
    id: 'ext-modern',
    label: 'Modern',
    category: 'exterior',
    prompt:
      'Modern exterior: smooth rendered/stucco facade in white or light grey, large glazing with slim dark window frames, flat or low-slope roof, a sleek front door, clean geometric lines, and minimalist architectural landscaping with a neat concrete path.',
  },
  {
    id: 'ext-contemporary',
    label: 'Contemporary',
    category: 'exterior',
    prompt:
      'Contemporary exterior: mixed cladding (wood, render and stone) in bold contrasting tones, generous glazing, a mono-pitch or flat roof, a statement front door, warm exterior lighting, and tidy modern landscaping with hardscaping.',
  },
  {
    id: 'ext-mediterranean',
    label: 'Mediterranean Villa',
    category: 'exterior',
    prompt:
      'Mediterranean villa exterior: warm cream or terracotta stucco walls, a low-pitched terracotta tile roof, arched windows and doorways, wrought-iron details, wooden shutters, stone accents, and olive trees with a gravel or tiled courtyard.',
  },
  {
    id: 'ext-farmhouse',
    label: 'Modern Farmhouse',
    category: 'exterior',
    prompt:
      'Modern farmhouse exterior: white or soft-grey board-and-batten siding, black-framed windows, a gabled metal or shingle roof, a covered front porch, natural wood accents, and simple tidy planting beds.',
  },
  {
    id: 'ext-traditional',
    label: 'Traditional / Colonial',
    category: 'exterior',
    prompt:
      'Traditional / Colonial exterior: a symmetrical facade in red brick or painted clapboard, multi-pane windows with shutters, a central panelled front door with a portico, a pitched shingle roof, and classic manicured landscaping with hedges.',
  },
  {
    id: 'ext-craftsman',
    label: 'Craftsman',
    category: 'exterior',
    prompt:
      'Craftsman/bungalow exterior: a low-pitched gabled roof with wide eaves and exposed rafters, tapered columns on a front porch, earthy paint tones, natural wood and stone, and cottage-style landscaping.',
  },
  {
    id: 'ext-rustic',
    label: 'Rustic Cabin',
    category: 'exterior',
    prompt:
      'Rustic cabin/chalet exterior: natural timber or log cladding with a stone base, a steep pitched roof, warm wood tones, chunky wooden beams, and a natural mountain/forest landscaping setting.',
  },
  {
    id: 'ext-tudor',
    label: 'Tudor',
    category: 'exterior',
    prompt:
      'Tudor exterior: decorative half-timbering over cream stucco or brick, steeply pitched gable roofs, tall narrow leaded windows, a prominent brick chimney, an arched front door, and traditional landscaping.',
  },
];

// Combined catalog — interior styles get category 'interior', exterior are explicit.
export const ALL_ROOM_STYLES: RoomStyleDefinition[] = [
  ...ROOM_STYLES.map(s => ({ ...s, category: 'interior' as const })),
  ...EXTERIOR_STYLES,
];

export const ROOM_STYLE_IDS = ALL_ROOM_STYLES.map(s => s.id);

export const getRoomStyle = (id: string): RoomStyleDefinition | undefined =>
  ALL_ROOM_STYLES.find(s => s.id === id);
