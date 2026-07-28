import { GoogleGenAI, Type } from '@google/genai';
import sharp from 'sharp';
import { apiLogger } from '../utils/logger';

// Target long-edge (px) for the high-quality downloadable restyle image.
const HQ_LONG_EDGE = 2048;

let ai: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
  if (!ai) {
    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_AI_API_KEY is not configured');
    }
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'Referer': process.env.FRONTEND_URL || 'https://balkanestateai.com',
        },
      },
    });
  }
  return ai;
};

// ============================================================================
// Types
// ============================================================================

export interface ImageTag {
  index: number;
  tag: 'exterior' | 'living_room' | 'kitchen' | 'bedroom' | 'bathroom' | 'other';
}

export interface PropertyAnalysisResult {
  bedrooms: number;
  bathrooms: number;
  living_rooms: number;
  sq_meters: number;
  year_built: number;
  parking_spots: number;
  amenities: string[];
  key_features: string[];
  materials: string[];
  description: string;
  image_tags: ImageTag[];
  property_type: 'house' | 'apartment' | 'villa' | 'other';
  floor_number?: number;
  total_floors?: number;
}

export interface LocationContext {
  country?: string;
  city?: string;
  address?: string;
}

export interface DistanceCalculationResult {
  distanceToCenter: number;
  distanceToSea: number;
  distanceToSchool: number;
  distanceToHospital: number;
}

export interface AiChatResponse {
  responseMessage: string;
  searchQuery: Record<string, any> | null;
  isFinalQuery: boolean;
}

export interface RoomStyleResult {
  imageBase64: string;
  mimeType: string;
}

// Retry configuration for handling 503 and other transient errors
const MAX_RETRIES = 5;
const INITIAL_DELAY = 2000; // 2 seconds

/**
 * Retry wrapper for Gemini API calls with exponential backoff
 * Handles 503 errors and other transient failures
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_DELAY
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    // Never retry auth/config errors — they won't resolve on retry
    const isNonRetryable =
      error?.status === 400 ||
      error?.status === 401 ||
      error?.status === 403 ||
      error?.message?.includes('API key') ||
      error?.message?.includes('API_KEY_INVALID') ||
      error?.message?.includes('PERMISSION_DENIED') ||
      error?.message?.includes('not found for API version');

    if (isNonRetryable) {
      throw error;
    }

    // Check if error is retryable (503, network errors, rate limits)
    const isRetryable =
      error?.status === 503 ||
      error?.status === 429 ||
      error?.code === 'ECONNRESET' ||
      error?.code === 'ETIMEDOUT' ||
      error?.message?.includes('503') ||
      error?.message?.includes('Service Unavailable') ||
      error?.message?.includes('timeout') ||
      error?.message?.includes('ECONNRESET') ||
      error?.message?.includes('ETIMEDOUT');

    if (!isRetryable || retries <= 0) {
      throw error;
    }

    apiLogger.warn(`Gemini API call failed, retrying in ${delay}ms... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
    apiLogger.warn(`Error: ${error?.message || String(error)}`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Exponential backoff: double the delay for next retry
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

/**
 * Get neighborhood insights for a given location
 * Uses Google's Gemini AI to generate contextual information about the area
 */
export const getNeighborhoodInsights = async (
  lat: number,
  lng: number,
  address: string,
  city: string,
  country: string,
  language: string = 'English'
): Promise<string> => {
  const prompt = `
You are a helpful local guide for the "Balkan Estate" real estate agency.
A user is looking at a property located at ${address}, ${city}, ${country} (coordinates: ${lat}, ${lng}).

**IMPORTANT: Your entire response MUST be written in ${language}. Do not use English unless ${language} is English.**

Based on these coordinates, generate a proximity-based summary of the neighborhood. Your response should be helpful for someone considering moving there. Structure your response as a short introductory paragraph followed by a bulleted list.

**Crucially, identify specific, named points of interest and describe how close they are.** Focus on:
- **Schools:** Name specific schools (e.g., "Ivan Gundulić Elementary School").
- **Parks:** Name specific parks (e.g., "Kalemegdan Park").
- **Public Transport:** Name specific train, tram, or bus stations.
- **Other Amenities:** Mention key markets, cafes, or cultural sites by name if they are significant landmarks.

Use phrases like "a short walk to...", "just 5 minutes from...", "conveniently close to..." (translated appropriately to ${language}). Keep the tone friendly and informative. Do not mention the specific coordinates in your response. The response should be in markdown format.

Remember: Write the ENTIRE response in ${language}.
`;

  try {
    const result = await retryWithBackoff(() =>
      getAI().models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      })
    );

    if (!result.text) {
      throw new Error("No text returned from Gemini API");
    }

    return result.text.trim();
  } catch (e) {
    apiLogger.error("Error fetching neighborhood insights:", e instanceof Error ? e.message : String(e));
    throw new Error("Could not retrieve neighborhood insights at this time. Please try again later.");
  }
};

/**
 * Generate property description and analysis from uploaded images
 * Uses Gemini vision capabilities to analyze property photos
 */
export const generateDescriptionFromImages = async (
  images: Buffer[],
  mimeTypes: string[],
  language: string,
  propertyType: 'house' | 'apartment' | 'villa' | 'land' | 'other',
  location?: LocationContext
): Promise<PropertyAnalysisResult> => {
  // Convert buffers to base64 inline data parts for Gemini API
  const imageParts = images.map((buffer, i) => ({
    inlineData: {
      data: buffer.toString('base64'),
      mimeType: mimeTypes[i] || 'image/jpeg',
    },
  }));

  // Build location context string if provided
  const locationInfo = location && (location.country || location.city || location.address)
    ? `
    **LOCATION CONTEXT:**
    ${location.country ? `- Country: ${location.country}` : ''}
    ${location.city ? `- City: ${location.city}` : ''}
    ${location.address ? `- Address/Neighborhood: ${location.address}` : ''}

    Use this location information to make the description more specific and relevant. Mention local landmarks, nearby attractions, or neighborhood characteristics that would be typical for this area. The description should reflect the character of ${location.city || location.country || 'the area'}.
    `
    : 'The property is located somewhere in the Balkans.';

  const prompt = `You are a professional real estate analyst specializing in Balkan properties. Analyze the following images for a property that is a(n) "${propertyType}". Based on the images and knowing its type, provide a detailed, accurate analysis.

    ${locationInfo}

    The description should be written in ${language} and be tailored specifically for a(n) "${propertyType}". Provide the following details in a JSON object:

    Always make sure to organize the text in a bullet list format where applicable for clarity.

    1.  **description**: A compelling and detailed property description in ${language}, starting with a short intro paragraph and then a bulleted list of "Key Features" and "Materials & Construction". Make sure the tone and focus of the description are appropriate for a(n) "${propertyType}". The description should highlight what makes this property unique and desirable.

    2.  **bedrooms**: Count the number of bedrooms visible in the images. Look for rooms with beds, closets, or typical bedroom furniture. Be precise.

    3.  **bathrooms**: Count the number of bathrooms visible. Look for rooms with toilets, sinks, showers, or bathtubs. Include both full bathrooms and half-baths.

    4.  **living_rooms**: Count the number of living rooms or common areas visible. Look for rooms with sofas, TVs, or social seating arrangements.

    5.  **sq_meters**: Provide a realistic estimation of the total square meters based on room sizes, layout, and property type. For apartments, typical range is 40-150m². For houses, 80-300m². For villas, 150-500m².

    6.  **year_built**: Estimate the construction year based on architectural style, materials, fixtures, and overall condition. Consider: modern (2010+), contemporary (2000-2010), established (1980-2000), older (pre-1980).

    7.  **parking_spots**: Count visible parking spaces including garages, driveways, or designated parking areas. If none are visible, use 0.

    8.  **amenities**: List observable amenities such as "swimming pool", "balcony", "garden", "terrace", "fireplace", "walk-in closet", "laundry room", "basement", "attic". Only include amenities clearly visible in the images.

    9.  **key_features**: List distinctive selling points like "modern kitchen with granite countertops", "hardwood floors throughout", "panoramic city view", "high ceilings", "open floor plan", "renovated bathroom", "built-in wardrobes". Be specific and descriptive.

    10. **materials**: Identify prominent building and finishing materials visible in the images (e.g., "brick exterior", "marble floors", "wood beams", "stainless steel appliances", "ceramic tiles", "stone facade", "parquet flooring").

    11. **image_tags**: CAREFULLY analyze each image and assign the MOST APPROPRIATE tag. Guidelines:
        - 'exterior': Outside views of the building, facade, entrance, yard, or outdoor areas
        - 'living_room': Main living areas with sofas, TV, or social seating
        - 'kitchen': Kitchen areas with appliances, counters, or dining tables
        - 'bedroom': Bedrooms with beds or sleeping areas
        - 'bathroom': Bathrooms with toilet, sink, shower, or bathtub
        - 'other': Hallways, storage, laundry, balconies, or unclear rooms

        The output must be an array where EVERY image gets a tag. Array length must equal number of images. Each object has 'index' (0-based) and 'tag'.

    12. **property_type**: Confirm the property type. It must be "${propertyType}".

    13. **floor_number**: If the property is an 'apartment', estimate which floor it's on (1-20). Look for views, elevator buttons, or stairwell clues. If not an apartment or unclear, omit this field.

    14. **total_floors**: If the property is a 'house' or 'villa', count the number of floors visible (typically 1-4). If not a house/villa or unclear, omit this field.



    IMPORTANT: Ensure image_tags array has exactly ${images.length} entries, one for each image provided. Be accurate and thorough in your analysis.

    Please provide only the JSON object as a response.
    `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING, description: 'A compelling and detailed property description with an intro and bulleted lists for "Key Features" and "Materials & Construction".' },
      bedrooms: { type: Type.INTEGER, description: 'The number of bedrooms visible.' },
      bathrooms: { type: Type.INTEGER, description: 'The number of bathrooms visible.' },
      living_rooms: { type: Type.INTEGER, description: 'The number of living rooms visible.' },
      sq_meters: { type: Type.NUMBER, description: 'An estimation of the total square meters.' },
      year_built: { type: Type.INTEGER, description: 'An estimation of the year the property was built.' },
      parking_spots: { type: Type.INTEGER, description: 'The number of parking spots available.' },
      amenities: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'A list of amenities observed.',
      },
      key_features: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'A list of key selling points.',
      },
      materials: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: 'A list of prominent building materials seen.',
      },
      image_tags: {
        type: Type.ARRAY,
        description: 'Tags for each image provided.',
        items: {
          type: Type.OBJECT,
          properties: {
            index: { type: Type.INTEGER },
            tag: {
              type: Type.STRING,
              enum: ['exterior', 'living_room', 'kitchen', 'bedroom', 'bathroom', 'other'],
            },
          },
          required: ['index', 'tag'],
        },
      },
      property_type: {
        type: Type.STRING,
        enum: [propertyType],
        description: `The type of the property, which must be '${propertyType}'.`,
      },
      floor_number: {
        type: Type.INTEGER,
        description: 'The floor the apartment is on. Only for apartments.',
        nullable: true,
      },
      total_floors: {
        type: Type.INTEGER,
        description: 'The total number of floors. Only for houses or villas.',
        nullable: true,
      },
    },
    required: ['description', 'bedrooms', 'bathrooms', 'living_rooms', 'sq_meters', 'year_built', 'parking_spots', 'amenities', 'key_features', 'materials', 'image_tags', 'property_type'],
  };

  const result = await retryWithBackoff(() =>
    getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }, ...imageParts] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    })
  );

  if (!result.text) {
    throw new Error("No text returned from Gemini API");
  }

  try {
    const jsonText = result.text.trim();
    const sanitizedJsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    const parsedResult = JSON.parse(sanitizedJsonText);
    return parsedResult as PropertyAnalysisResult;
  } catch (_e) {
    throw new Error("Failed to get a valid response from the AI. Please try again.");
  }
};

const DISCLAIMER_TEXT = 'VIRTUALLY STAGED · AI-GENERATED · FOR DEMONSTRATION ONLY — NOT AN ACTUAL PHOTO OF THE PROPERTY';

/**
 * Composite a disclaimer caption bar onto the bottom of a generated image so the
 * AI staging can never be mistaken for a real listing photo, even once downloaded.
 * Non-fatal: returns the original buffer if compositing fails (e.g. missing fonts).
 */
const addDisclaimerCaption = async (buffer: Buffer): Promise<Buffer> => {
  try {
    const meta = await sharp(buffer).metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;
    if (!width || !height) return buffer;

    const barHeight = Math.max(28, Math.round(height * 0.05));
    const fontSize = Math.max(11, Math.round(barHeight * 0.4));
    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="${height - barHeight}" width="${width}" height="${barHeight}" fill="rgba(0,0,0,0.6)"/>
      <text x="50%" y="${height - barHeight / 2}" text-anchor="middle" dominant-baseline="central"
        font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="600"
        letter-spacing="0.5" fill="#ffffff">${DISCLAIMER_TEXT}</text>
    </svg>`;

    return await sharp(buffer)
      .composite([{ input: Buffer.from(svg), gravity: 'south' }])
      .png({ quality: 100, compressionLevel: 6 })
      .toBuffer();
  } catch (e) {
    apiLogger.warn(`Disclaimer caption failed, returning image without it: ${e instanceof Error ? e.message : String(e)}`);
    return buffer;
  }
};

/**
 * Restyle (or empty) a room photo in a chosen interior design style.
 * Uses Gemini's image model ("Nano Banana") to re-render the SAME space while
 * preserving the architecture, camera angle and proportions. A disclaimer caption
 * is baked onto the result. Returns the generated image as base64 + its mime type.
 */
export const restyleRoomImage = async (
  imageBase64: string,
  mimeType: string,
  styleId: string,
  styleLabel: string,
  stylePrompt: string,
  category: 'interior' | 'exterior' = 'interior'
): Promise<RoomStyleResult> => {
  const isEmptyRoom = styleId === 'no-furniture';
  const isExterior = category === 'exterior';
  const isExtRefresh = styleId === 'ext-refresh';

  const subjectPreservation = `SUBJECT PRESERVATION (critical):
- Keep the EXACT same space as the input photo: for interiors keep wall positions, window and door locations and sizes, ceiling height, floor plan and proportions; for exteriors keep the building's footprint, rooflines, window/door positions and number of floors. The structural shell must be unchanged.
- Built-in fixtures (bathtub, shower, sink, toilet, tiles, kitchen cabinets/counters, etc.) are NOT part of the structure: keep them in their existing POSITIONS with realistic plumbing, but their style, material and finish SHOULD change to match the chosen style.
- Keep the SAME camera angle, perspective and framing as the original photo.
- NEVER invent or hallucinate a different room, building, or scene, and never change the type of space.
- Preserve any real view visible through the windows and the real surroundings.
- Do NOT add people, pets, on-image text, logos, watermarks, or captions.`;

  let task: string;
  if (isEmptyRoom) {
    task = `TASK — EMPTY THE ROOM:
- Remove ALL furniture, rugs, decor, wall art, plants, curtains and clutter so the room is completely empty and unfurnished.
- Keep the existing wall color/finish and flooring exactly as they are — do NOT repaint or re-floor.
- Result: a clean, bright, empty real-estate photograph of the same space.`;
  } else if (isExtRefresh) {
    task = `TASK — REFRESH & LANDSCAPING (exterior):
- Keep the same house exactly as it is. Only tidy and refresh the outdoors: healthy green lawn and plants, trimmed hedges, clean driveway and paths, and remove clutter, cars, bins and debris. Clean the facade.
- Do NOT restyle or change the architecture, materials or colours of the building.`;
  } else if (isExterior) {
    task = `TASK — RESTYLE THE EXTERIOR of the house in the "${styleLabel}" architectural style:
STYLE BRIEF — ${styleLabel}: ${stylePrompt}
- Restyle the facade cladding/paint, roof material and colour, front door, window frames and trim, garage, driveway/path and landscaping so the house convincingly matches the "${styleLabel}" style.
- Keep the building's structure, footprint, rooflines, window and door positions and number of floors unchanged — never add or remove floors or change the building's shape.`;
  } else {
    task = `TASK — RESTYLE THE INTERIOR in the "${styleLabel}" style:
STYLE BRIEF — ${styleLabel}: ${stylePrompt}
- Restyle EVERY interior element to match the style: furniture, decor, textiles, rugs, wall treatment/paint, flooring finish, lighting fixtures and the overall color palette.
- Also restyle the built-in fixtures and fittings that are present in the room:
  · Bathroom: the bathtub, shower, vanity, sink/basin, faucets and taps, toilet, wall & floor tiles, mirror, towel rails, radiators and all hardware.
  · Kitchen: the cabinetry, countertops, backsplash, sink, faucet and visible appliances.
- Update each fixture's design, material and finish to suit the "${styleLabel}" style, and update or neatly conceal any exposed pipes/plumbing to match. Keep every fixture in its EXISTING position and keep the plumbing layout realistic.
- Do NOT leave any element in the original style — the whole room should convincingly read as "${styleLabel}".`;
  }

  const prompt = `You are an expert interior designer and architectural photographer. Edit the provided real-estate photograph exactly as instructed.

${subjectPreservation}

${task}

PHOTOREALISM (this is critical — the result must look like a REAL photo, not AI):
- Render it as a genuine real-estate listing PHOTOGRAPH, as if shot with a full-frame DSLR camera and a ~24mm wide-angle lens.
- Use natural daylight; match the original photo's lighting direction, warmth and time of day.
- Include realistic, physically-accurate soft shadows and contact shadows, accurate reflections, and true-to-life material textures (wood grain, fabric weave, matte and gloss surfaces).
- Keep natural color balance and realistic dynamic range; avoid over-saturation and over-sharpening.
- Preserve subtle real-world imperfections and fine surface detail. Add a very slight, natural photographic grain.
- It MUST NOT look like a 3D render, CGI, a video-game screenshot, an illustration, or digital art. Avoid the over-smooth, waxy, plastic, "too perfect" AI look.

Output only the edited photograph.`;

  const result = await retryWithBackoff(() =>
    getAI().models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { text: prompt },
          { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } },
        ],
      },
    })
  );

  const parts = result.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p: any) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    // No image returned — likely a safety block or a text-only response.
    const textPart = parts.find((p: any) => typeof p.text === 'string')?.text;
    apiLogger.warn(`Room restyle returned no image. Text response: ${textPart || '(none)'}`);
    throw new Error('The AI did not return a styled image. Please try a different photo or style.');
  }

  const rawBuffer = Buffer.from(imagePart.inlineData.data, 'base64');

  // Upscale to a high-quality version for download. The generative model outputs
  // ~1024px on the long edge; enlarge with a high-quality kernel + gentle sharpen
  // so the saved file is crisp for viewing/printing. Falls back to the raw image
  // if sharp fails for any reason. A disclaimer caption is baked on either way.
  let finalBuffer: Buffer = rawBuffer;
  try {
    const meta = await sharp(rawBuffer).metadata();
    const longEdge = Math.max(meta.width || 0, meta.height || 0);
    let pipeline = sharp(rawBuffer);
    if (longEdge > 0 && longEdge < HQ_LONG_EDGE) {
      const scale = HQ_LONG_EDGE / longEdge;
      pipeline = pipeline
        .resize({
          width: Math.round((meta.width || longEdge) * scale),
          height: Math.round((meta.height || longEdge) * scale),
          kernel: 'lanczos3',
          fit: 'fill',
        })
        .sharpen();
    }
    finalBuffer = await pipeline.png({ quality: 100, compressionLevel: 6 }).toBuffer();
  } catch (e) {
    apiLogger.warn(`HQ upscale failed, using raw model image: ${e instanceof Error ? e.message : String(e)}`);
  }

  finalBuffer = await addDisclaimerCaption(finalBuffer);
  return { imageBase64: finalBuffer.toString('base64'), mimeType: 'image/png' };
};

/**
 * Calculate estimated distances from a property to key amenities
 * Uses Gemini AI to estimate distances based on geographic knowledge
 */
export const calculatePropertyDistances = async (
  address: string,
  city: string,
  country: string,
  lat: number,
  lng: number
): Promise<DistanceCalculationResult> => {
  const prompt = `You are a geographic analyst specializing in property locations. Analyze the following property location and provide estimated distances to key amenities:

Property Address: ${address}
City: ${city}
Country: ${country}
Coordinates: ${lat}, ${lng}

Based on your knowledge of ${city}, ${country} and typical urban planning in the region, provide realistic distance estimates (in kilometers) to the following locations:

1. **distanceToCenter**: Distance to the city center/downtown area (main commercial/cultural hub)
2. **distanceToSea**: Distance to the nearest sea, beach, or major waterfront (if landlocked or very far, use 999 km as indicator)
3. **distanceToSchool**: Distance to the nearest primary or secondary school
4. **distanceToHospital**: Distance to the nearest hospital or major medical facility

Provide accurate estimates based on:
- The property's coordinates and address
- Typical infrastructure and amenities in ${city}
- Regional geography and city layout
- For sea distance: consider if the country/city is coastal or landlocked

Return ONLY a JSON object with the four distance values as numbers (in kilometers, rounded to 1 decimal place).
If a location type doesn't apply (e.g., sea for landlocked cities), use 999 to indicate "not applicable/very far".`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      distanceToCenter: {
        type: Type.NUMBER,
        description: 'Distance in km to city center/downtown',
      },
      distanceToSea: {
        type: Type.NUMBER,
        description: 'Distance in km to nearest sea/beach (999 if landlocked)',
      },
      distanceToSchool: {
        type: Type.NUMBER,
        description: 'Distance in km to nearest school',
      },
      distanceToHospital: {
        type: Type.NUMBER,
        description: 'Distance in km to nearest hospital',
      },
    },
    required: ['distanceToCenter', 'distanceToSea', 'distanceToSchool', 'distanceToHospital'],
  };

  const result = await retryWithBackoff(() =>
    getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    })
  );

  if (!result.text) {
    throw new Error("No text returned from Gemini API");
  }

  try {
    const jsonText = result.text.trim();
    const sanitizedJsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
    const parsedResult = JSON.parse(sanitizedJsonText);
    return parsedResult as DistanceCalculationResult;
  } catch (_e) {
    throw new Error("Failed to calculate distances. Using default values.");
  }
};

/**
 * Get AI chat response for the real estate assistant
 * Processes conversation history and available properties to provide helpful responses
 */
export const getAiChatResponse = async (
  history: Array<{ sender: string; text: string }>,
  properties: Array<any>
): Promise<AiChatResponse> => {
  const simplifiedProperties = properties.map((p: any) => ({
    id: p.id,
    price: p.price,
    city: p.city,
    country: p.country,
    beds: p.beds,
    baths: p.baths,
    livingRooms: p.livingRooms,
    sqft: p.sqft,
    specialFeatures: p.specialFeatures,
  }));

  const chatHistoryString = history.map((msg: { sender: string; text: string }) => `${msg.sender}: ${msg.text}`).join('\n');

  const systemPrompt = `
        You are a professional, friendly, and helpful real-estate assistant for the "Balkan Estate" agency. Your job is to help buyers find properties in the Balkans by chatting naturally. Be concise and helpful. Never be salesy.

        **IMPORTANT - Balkan Countries:** Albania, Bosnia and Herzegovina, Bulgaria, Croatia, Greece, Kosovo, Montenegro, North Macedonia, Romania, Serbia. Extract country to the "country" field when mentioned.

        **IMPORTANT - Location Resolution:** When a user mentions ANY city or place name, you MUST:
        - Set the "location" field to that city/place name.
        - Set the "country" field to the correct country for that city/place.
        - Common cities: Tirana/Tiranë → Albania, Belgrade/Beograd → Serbia, Zagreb → Croatia, Sarajevo → Bosnia and Herzegovina, Skopje → North Macedonia, Sofia/Sofija → Bulgaria, Bucharest/București → Romania, Athens/Athinai → Greece, Pristina/Prishtinë → Kosovo, Podgorica → Montenegro, Durrës → Albania, Vlorë → Albania, Shkodër → Albania, Novi Sad → Serbia, Niš → Serbia, Split → Croatia, Dubrovnik → Croatia, Thessaloniki → Greece, Plovdiv → Bulgaria, etc.
        - If the user says "all properties in [city]" or "show me everything in [city]" or "what do you have in [city]", this means they want ALL properties in that location — set isFinalQuery to true immediately with the location, do NOT ask further questions.

        **Your instructions:**
        1.  **Engage Naturally:** Greet warmly if it's the start. Keep the conversation flowing like a real chat — never end the conversation, always be ready for follow-ups.
        2.  **Language Matching:** Your 'responseMessage' MUST be in the same language as the user's last message. If the user writes in Albanian, reply in Albanian. Serbian → Serbian. Croatian → Croatian. Bosnian → Bosnian. Macedonian → Macedonian. Bulgarian → Bulgarian. Romanian → Romanian. Greek → Greek. If unsure, default to English.
        3.  **Understand Intent:** Interpret casual language (e.g., "something cozy" → smaller apartment, "family home" → house with 3+ beds).
        4.  **Extract Property Type from context:**
            - "apartment", "flat", "stan" → "apartment"
            - "house", "kuća", "shtëpi" → "house"
            - "villa", "vila" → "villa"
            - "land", "plot", "plac" → "land"
            - "office", "shop", "commercial" → "commercial"
        5.  **CRITICAL - Extract ONLY what user mentions:**
            - Do NOT include sellerType unless user explicitly says "private seller", "from owner", "bez agencije", "agent", etc.
            - Do NOT include propertyType unless user explicitly mentions a type.
            - If not mentioned, set these to null. Never assume defaults.
        6.  **CRITICAL - isFinalQuery Rules:**
            - Set \`isFinalQuery: false\` when you are ASKING a question AND the user has not given enough info yet (e.g., only said "hi").
            - Set \`isFinalQuery: true\` when you have AT LEAST a location OR a country. You do NOT need all filters — a location alone is enough to search.
            - If the user says "show me properties in [city]" or "I want apartments in [country]" — that IS enough. Set isFinalQuery: true.
            - NEVER set isFinalQuery to true AND ask a question in the same message!
        7.  **CRITICAL - Continuous Conversation:**
            - NEVER say "click Proceed" or tell the user to click any button. The results are shown automatically.
            - When isFinalQuery is true, summarize what you found and INVITE THE USER TO CONTINUE. For example: "Here are some options! Want me to adjust the price range or look in another area?"
            - After showing results, the user may say "show me cheaper ones", "what about 2 bedrooms?", "try Belgrade instead" — handle these as refinements by updating searchQuery and setting isFinalQuery: true again.
            - ALWAYS keep the conversation going. Never end with a dead-end response.
        8.  **Respond in JSON.**

        **JSON Output:**
        - \`responseMessage\`: Your friendly message in the user's language. Always end with an invitation to continue.
        - \`searchQuery\`: Object with: location, country, minPrice, maxPrice, beds, baths, livingRooms, minSqft, maxSqft, propertyType, sellerType, features. Set to null if no useful info yet.
        - \`isFinalQuery\`: true = search ready (have at least location or country), false = still need basic info.

        **Example Interactions:**

        User: "I want all properties in Tirana"
        {
          "responseMessage": "Here are all available properties in Tirana! Let me know if you'd like to filter by price, number of rooms, or property type.",
          "searchQuery": { "location": "Tirana", "country": "Albania" },
          "isFinalQuery": true
        }

        User: "Looking for an apartment in Albania"
        {
          "responseMessage": "Here are apartments available across Albania — swipe through them! Want me to narrow it down by city or budget?",
          "searchQuery": { "country": "Albania", "propertyType": "apartment" },
          "isFinalQuery": true
        }

        User: "under 100k"
        {
          "responseMessage": "Updated to apartments in Albania under €100,000! Want me to narrow it down by number of rooms or a specific city?",
          "searchQuery": { "country": "Albania", "propertyType": "apartment", "maxPrice": 100000 },
          "isFinalQuery": true
        }

        User: "make it 2 bedrooms"
        {
          "responseMessage": "Updated to 2+ bedroom apartments in Albania under €100,000. Let me know if you'd like to change anything else!",
          "searchQuery": { "country": "Albania", "propertyType": "apartment", "maxPrice": 100000, "beds": 2 },
          "isFinalQuery": true
        }

        User: "Tražim kuću u Beogradu, 3 spavaće sobe, do 200000 evra"
        {
          "responseMessage": "Odlično! Evo kuća u Beogradu sa 3+ spavaće sobe do €200.000. Želite li da prilagodim nešto — možda veću površinu ili drugi deo grada?",
          "searchQuery": { "location": "Belgrade", "country": "Serbia", "propertyType": "house", "beds": 3, "maxPrice": 200000 },
          "isFinalQuery": true
        }

        User: "show me what you got"
        {
          "responseMessage": "Here's everything I have — take a look! Let me know if you want to filter by location, price, or anything else.",
          "searchQuery": {},
          "isFinalQuery": true
        }

        User: "çfarë keni në Durrës"
        {
          "responseMessage": "Ja pronat e disponueshme në Durrës! A dëshironi të filtroj sipas çmimit, numrit të dhomave, apo diçka tjetër?",
          "searchQuery": { "location": "Durrës", "country": "Albania" },
          "isFinalQuery": true
        }
        ---
        **Available Properties Context (sample of ${simplifiedProperties.length}):**
        ${JSON.stringify(simplifiedProperties.slice(0, 15), null, 2)}
        ---
        **Conversation History:**
        ${chatHistoryString}
    `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      responseMessage: { type: Type.STRING, description: 'Your friendly, natural language message to the user.' },
      searchQuery: {
        type: Type.OBJECT,
        nullable: true,
        properties: {
          location: { type: Type.STRING, description: 'The city or area to search in.' },
          country: { type: Type.STRING, description: 'The country name (Albania, Serbia, Croatia, etc.).' },
          minPrice: { type: Type.NUMBER },
          maxPrice: { type: Type.NUMBER },
          beds: { type: Type.INTEGER },
          baths: { type: Type.INTEGER },
          livingRooms: { type: Type.INTEGER },
          minSqft: { type: Type.NUMBER, description: 'The minimum size in square meters.' },
          maxSqft: { type: Type.NUMBER, description: 'The maximum size in square meters.' },
          propertyType: {
            type: Type.STRING,
            nullable: true,
            enum: ['house', 'apartment', 'villa', 'land', 'commercial'],
            description: 'ONLY set if user explicitly mentions property type (house, apartment, etc). Must be null if not mentioned.'
          },
          sellerType: {
            type: Type.STRING,
            nullable: true,
            enum: ['agent', 'private'],
            description: 'ONLY set if user explicitly says "private seller", "from owner", "agent", etc. Must be null if not mentioned.'
          },
          features: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
      isFinalQuery: { type: Type.BOOLEAN, description: 'True if the searchQuery is ready to be executed.' },
    },
    required: ['responseMessage', 'searchQuery', 'isFinalQuery'],
  };

  const result = await retryWithBackoff(() =>
    getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: responseSchema,
      },
    })
  );

  if (!result.text) {
    throw new Error("No text returned from Gemini API");
  }

  try {
    const jsonText = result.text.trim();
    const parsedResult = JSON.parse(jsonText);

    // Strip null/undefined values from searchQuery so the frontend
    // doesn't treat them as explicitly set filters
    if (parsedResult.searchQuery) {
      for (const key of Object.keys(parsedResult.searchQuery)) {
        if (parsedResult.searchQuery[key] === null || parsedResult.searchQuery[key] === undefined) {
          delete parsedResult.searchQuery[key];
        }
      }
    }

    return parsedResult as AiChatResponse;
  } catch (_e) {
    return {
      responseMessage: "I'm having a little trouble understanding. Could you please rephrase your request, or try using the manual filters?",
      searchQuery: null,
      isFinalQuery: false,
    };
  }
};

/**
 * Generate a human-readable name for a saved search based on filters
 * Uses Gemini AI to create concise, descriptive search names
 */
export const generateSearchName = async (filters: Record<string, any>): Promise<string> => {
  const relevantFilters: Record<string, any> = {};
  if (filters.query) relevantFilters.query = filters.query;
  if (filters.minPrice) relevantFilters.minPrice = filters.minPrice;
  if (filters.maxPrice) relevantFilters.maxPrice = filters.maxPrice;
  if (filters.beds) relevantFilters.beds = filters.beds;
  if (filters.baths) relevantFilters.baths = filters.baths;
  if (filters.livingRooms) relevantFilters.livingRooms = filters.livingRooms;
  if (filters.minSqft) relevantFilters.minSqft = filters.minSqft;
  if (filters.maxSqft) relevantFilters.maxSqft = filters.maxSqft;
  if (filters.sellerType !== 'any') relevantFilters.sellerType = filters.sellerType;

  const prompt = `
        You are a helpful real estate assistant. Given the following JSON object of search filters, generate a concise, human-readable name for a saved search. The name should be a single, descriptive phrase.

        - If there's a query (location), start with that.
        - Describe price ranges like "€50k - €100k" or "over €200k" or "under €150k".
        - Describe beds/baths/living rooms like "3+ beds", "2+ baths", "1+ living rooms".
        - Describe size like "over 100m²" or "50-100m²".
        - Mention the seller type if it's not 'any'.
        - Combine these elements with commas.
        - Be concise.

        Example 1 Input:
        { "query": "Bitola", "maxPrice": 100000, "sellerType": "agent", "beds": 3, "baths": 2 }
        Example 1 Output:
        Bitola, under €100k, by agent, 3+ beds, 2+ baths

        Example 2 Input:
        { "minPrice": 250010, "beds": 4, "livingRooms": 2 }
        Example 2 Output:
        Over €250k, 4+ beds, 2+ living rooms

        Example 3 Input:
        { "query": "Belgrade", "sellerType": "private" }
        Example 3 Output:
        Belgrade, private listings

        Example 4 Input:
        { "query": "Zagreb", "minSqft": 100 }
        Example 4 Output:
        Zagreb, over 100m²

        Now, generate a name for this filter object:
        ${JSON.stringify(relevantFilters)}

        Return only the generated name string, without any markdown or extra text.
    `;

  const result = await retryWithBackoff(() =>
    getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })
  );

  if (!result.text) {
    throw new Error("No text returned from Gemini API");
  }

  return result.text.trim();
};

/**
 * Generate a human-readable name for a saved search based on coordinates
 * Fallback when reverse geocoding fails on the frontend
 */
export const generateSearchNameFromCoords = async (
  lat: number,
  lng: number
): Promise<string> => {
  const prompt = `
        You are a helpful real estate assistant. Given the following latitude and longitude coordinates, generate a concise, human-readable name for the geographic area they represent. The name should be suitable for a saved search.

        - Identify the most prominent feature at or very near these coordinates. This could be a village, a specific neighborhood, a mountain, a well-known park, or a coastal area.
        - The name should be short and descriptive, under 5 words.
        - For example: "Sirogojno Village Area", "Zlatibor Mountain Center", "Near Partizanska Street, Zlatibor".

        Coordinates:
        Latitude: ${lat}
        Longitude: ${lng}

        Return only the generated name string, without any markdown or extra text.
    `;

  const result = await retryWithBackoff(() =>
    getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    })
  );

  if (!result.text) {
    throw new Error("No text returned from Gemini API");
  }

  return result.text.trim();
};
