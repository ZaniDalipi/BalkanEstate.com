import { GoogleGenAI, Type } from "@google/genai";
import { Property, PropertyImageTag, ChatMessage, AiSearchQuery, Filters } from '../types';
import type { LatLngBounds } from 'leaflet';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Retry configuration for handling 503 and other transient errors
const MAX_RETRIES = 3;
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
    // Check if error is retryable (503, network errors, rate limits)
    const isRetryable =
      error?.status === 503 ||
      error?.status === 429 ||
      error?.code === 'ECONNRESET' ||
      error?.code === 'ETIMEDOUT' ||
      error?.message?.includes('503') ||
      error?.message?.includes('Service Unavailable') ||
      error?.message?.includes('timeout');

    if (!isRetryable || retries <= 0) {
      throw error;
    }

    console.warn(`Gemini API call failed, retrying in ${delay}ms... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
    await new Promise(resolve => setTimeout(resolve, delay));

    // Exponential backoff: double the delay for next retry
    return retryWithBackoff(fn, retries - 1, delay * 2);
  }
}

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve(base64Data);
    };
    reader.readAsDataURL(file);
  });
  return {
    inlineData: {
      data: await base64EncodedDataPromise,
      mimeType: file.type,
    },
  };
};

export interface ImageTag {
    index: number;
    tag: PropertyImageTag;
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


export const generateDescriptionFromImages = async (images: File[], language: string, propertyType: 'house' | 'apartment' | 'villa' | 'other'): Promise<PropertyAnalysisResult> => {
    const imageParts = await Promise.all(images.map(fileToGenerativePart));

    const prompt = `You are a professional real estate analyst specializing in Balkan properties. Analyze the following images for a property that is a(n) "${propertyType}". Based on the images and knowing its type, provide a detailed, accurate analysis. The property is located in the Balkans. The description should be written in ${language} and be tailored specifically for a(n) "${propertyType}". Provide the following details in a JSON object:

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
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }, ...imageParts] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                timeout: 60000, // 60 second timeout
            },
        })
    );

    try {
        const jsonText = result.text.trim();
        const sanitizedJsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
        const parsedResult = JSON.parse(sanitizedJsonText);
        return parsedResult as PropertyAnalysisResult;
    } catch (e) {
        console.error("Error parsing Gemini response:", e instanceof Error ? e.message : String(e));
        console.error("Raw response text:", result.text);
        throw new Error("Failed to get a valid response from the AI. Please try again.");
    }
};

export interface DistanceCalculationResult {
    distanceToCenter: number; // in km
    distanceToSea: number; // in km
    distanceToSchool: number; // in km
    distanceToHospital: number; // in km
}

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
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [{ text: prompt }] },
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                timeout: 30000, // 30 second timeout
            },
        })
    );

    try {
        const jsonText = result.text.trim();
        const sanitizedJsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
        const parsedResult = JSON.parse(sanitizedJsonText);
        return parsedResult as DistanceCalculationResult;
    } catch (e) {
        console.error("Error parsing Gemini distance calculation response:", e instanceof Error ? e.message : String(e));
        console.error("Raw response text:", result.text);
        throw new Error("Failed to calculate distances. Using default values.");
    }
};

export interface AiChatResponse {
    responseMessage: string;
    searchQuery: AiSearchQuery | null;
    isFinalQuery: boolean;
}

export const getAiChatResponse = async (history: ChatMessage[], properties: Property[]): Promise<AiChatResponse> => {
    const simplifiedProperties = properties.map(p => ({
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

    const chatHistoryString = history.map(msg => `${msg.sender}: ${msg.text}`).join('\n');

    const systemPrompt = `
        You are a professional, friendly, and helpful real-estate assistant for the "Balkan Estate" agency. Your job is to help buyers find properties in the Balkans that match their preferences by chatting with them naturally also use less tokens as possible for the answer.

        Your main goal is to understand the user's needs and convert their conversational request into a structured search query. Be concise and helpful. Never be salesy.

        You have access to a list of properties. Use their attributes (city, country, price, beds, baths, livingRooms, sqft, specialFeatures) to understand what's available.

        Always show first the highlighted properties in the search results

        **Your instructions are:**
        1.  **Engage Naturally:** Start with a friendly greeting if it's the beginning of the conversation.
        2.  **Language Matching:** Your entire 'responseMessage' MUST be in the same language as the user's last message. For example, if the user writes in Serbian, you must reply in Serbian. If you are unsure of the language, default to English.
        3.  **Understand Intent:** Interpret casual language (e.g., "something cozy" might mean a smaller apartment or house).
        4.  **Ask Clarifying Questions:** If key details like budget, location, or number of bedrooms/living rooms are missing, ask a SINGLE, brief follow-up question. Do not ask multiple questions at once.
        5.  **Formulate a Search Query:** Once you have enough information (usually location and price range), formulate a structured JSON search query. You can also ask about size in square meters (m²).
        6.  **Respond in JSON:** Your entire response MUST be a single JSON object.
        7.  **Crucially, when you set isFinalQuery to true, your responseMessage should ask the user to confirm by clicking the 'Apply Filters' button.** This gives them control.

        **JSON Output Structure:**
        You must return a JSON object with three fields:
        - \`responseMessage\`: A string containing your friendly, natural language message to the user, matching the user's language.
        - \`searchQuery\`: A JSON object with the extracted search criteria (fields: location, minPrice, maxPrice, beds, baths, livingRooms, minSqft, maxSqft, features). Set this to \`null\` if you don't have enough information to search yet.
        - \`isFinalQuery\`: A boolean. Set to \`true\` only when you have sufficient information and have provided a \`searchQuery\`. Otherwise, set it to \`false\`.

        **Example Interactions:**
        User: "I'm looking for something quiet in Belgrade under 400k."
        Your JSON Response:
        {
          "responseMessage": "Great! A quiet place in Belgrade for under 400,000 €. Are you looking for a specific number of bedrooms or living rooms?",
          "searchQuery": null,
          "isFinalQuery": false
        }
        
        User: "Përshëndetje, po kërkoj një apartament në Tiranë." (Albanian)
        Your JSON Response:
        {
            "responseMessage": "Përshëndetje! gjithmonë këtu për tju ndihmuar. A keni një buxhet të caktuar ose ndonjë preferencë për numrin e dhomave të gjumit/fjetje/ndenje?",
            "searchQuery": {
                "location": "Tirana"
            },
            "isFinalQuery": false
        }

        User: "At least 3 bedrooms and 1 living room."
        Your JSON Response:
        {
          "responseMessage": "Okay, I've put together a search for a quiet property in Belgrade with at least 3 bedrooms and 1 living room, for under 400,000 €. Does that sound right? If so, just hit 'Apply Filters' below!",
          "searchQuery": {
            "location": "Belgrade",
            "maxPrice": 400000,
            "beds": 3,
            "livingRooms": 1,
            "features": ["quiet"]
          },
          "isFinalQuery": true
        }
        ---
        **Available Property Data Context (for your reference):**
        ${JSON.stringify(simplifiedProperties.slice(0, 10), null, 2)}
        ---
        **Current Conversation History:**
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
                    minPrice: { type: Type.NUMBER },
                    maxPrice: { type: Type.NUMBER },
                    beds: { type: Type.INTEGER },
                    baths: { type: Type.INTEGER },
                    livingRooms: { type: Type.INTEGER },
                    minSqft: { type: Type.NUMBER, description: 'The minimum size in square meters.' },
                    maxSqft: { type: Type.NUMBER, description: 'The maximum size in square meters.' },
                    features: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
            },
            isFinalQuery: { type: Type.BOOLEAN, description: 'True if the searchQuery is ready to be executed.' },
        },
        required: ['responseMessage', 'searchQuery', 'isFinalQuery'],
    };

    const result = await retryWithBackoff(() =>
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: systemPrompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: responseSchema,
                timeout: 200000, // 20 second timeout
            },
        })
    );

    try {
        const jsonText = result.text.trim();
        const parsedResult = JSON.parse(jsonText);
        return parsedResult as AiChatResponse;
    } catch (e) {
        console.error("Error parsing Gemini chat response:", e instanceof Error ? e.message : String(e));
        console.error("Raw chat response text:", result.text);
        return {
            responseMessage: "I'm having a little trouble understanding. Could you please rephrase your request, or try using the manual filters?",
            searchQuery: null,
            isFinalQuery: false,
        };
    }
};

export const generateSearchName = async (filters: Filters): Promise<string> => {
    const relevantFilters: Partial<Filters> = {};
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
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                timeout: 15000, // 15 second timeout
            },
        })
    );

    return result.text.trim();
};

export const generateSearchNameFromCoords = async (lat: number, lng: number, bounds?: LatLngBounds): Promise<string> => {
    // Helper function to get the best location name from address
    const getLocationName = (address: any): string | null => {
        // Prioritize the most specific location name based on what's available
        if (address.suburb) return address.suburb;
        if (address.neighbourhood) return address.neighbourhood;
        if (address.city) return address.city;
        if (address.town) return address.town;
        if (address.village) return address.village;
        if (address.municipality) return address.municipality;
        if (address.county) return address.county;
        if (address.state) return address.state;
        if (address.country) return address.country;
        return null;
    };

    // If bounds are provided, get location names for both corners
    if (bounds) {
        try {
            const { reverseGeocode } = await import('./osmService');

            // Get southwest (starting) corner location
            const sw = bounds.getSouthWest();
            const swResult = await reverseGeocode(sw.lat, sw.lng);

            // Get northeast (ending) corner location
            const ne = bounds.getNorthEast();
            const neResult = await reverseGeocode(ne.lat, ne.lng);

            const swName = swResult?.address ? getLocationName(swResult.address) : null;
            const neName = neResult?.address ? getLocationName(neResult.address) : null;

            // If both locations are found and different, show as range
            if (swName && neName) {
                if (swName === neName) {
                    // Same location, just return the name
                    return swName;
                } else {
                    // Different locations, show as range
                    return `${swName} to ${neName}`;
                }
            }

            // If only one location found, use it
            if (swName) return `Area near ${swName}`;
            if (neName) return `Area near ${neName}`;

            // Fall through to center-based naming if corners don't have good names
        } catch (error) {
            console.error('Bounds reverse geocoding failed, trying center:', error);
        }
    }

    // Use reverse geocoding for center point (original behavior)
    try {
        const { reverseGeocode } = await import('./osmService');
        const result = await reverseGeocode(lat, lng);

        if (result && result.address) {
            const locationName = getLocationName(result.address);
            if (locationName) return locationName;
        }
    } catch (error) {
        console.error('Reverse geocoding failed, falling back to AI:', error);
    }

    // Fallback to AI if reverse geocoding fails
    const boundsInfo = bounds
        ? `\nThe area spans from (${bounds.getSouthWest().lat.toFixed(4)}, ${bounds.getSouthWest().lng.toFixed(4)}) to (${bounds.getNorthEast().lat.toFixed(4)}, ${bounds.getNorthEast().lng.toFixed(4)})`
        : '';

    const prompt = `
        You are a helpful real estate assistant. Given the following latitude and longitude coordinates, generate a concise, human-readable name for the geographic area they represent. The name should be suitable for a saved search.

        - Identify the most prominent feature at or very near these coordinates. This could be a village, a specific neighborhood, a mountain, a well-known park, or a coastal area.
        - The name should be short and descriptive, under 5 words.
        - For example: "Sirogojno Village Area", "Zlatibor Mountain Center", "Near Partizanska Street, Zlatibor", "Kranilakeside".

        Center Coordinates:
        Latitude: ${lat}
        Longitude: ${lng}${boundsInfo}

        Return only the generated name string, without any markdown or extra text.
    `;

    const aiResult = await retryWithBackoff(() =>
        ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                timeout: 15000, // 15 second timeout
            },
        })
    );

    return aiResult.text.trim();
};

export const getNeighborhoodInsights = async (lat: number, lng: number, city: string, country: string): Promise<string> => {
    const prompt = `
        You are a helpful local guide for the "Balkan Estate" real estate agency.
        A user is looking at a property located in ${city}, ${country} at coordinates (latitude: ${lat}, longitude: ${lng}).

        Based on these coordinates, generate a proximity-based summary of the neighborhood. Your response should be helpful for someone considering moving there. Structure your response as a short introductory paragraph followed by a bulleted list.

        **Crucially, identify specific, named points of interest and describe how close they are.** Focus on:
        - **Schools:** Name specific schools (e.g., "Ivan Gundulić Elementary School").
        - **Parks:** Name specific parks (e.g., "Kalemegdan Park").
        - **Public Transport:** Name specific train, tram, or bus stations.
        - **Other Amenities:** Mention key markets, cafes, or cultural sites by name if they are significant landmarks.

        Use phrases like "a short walk to...", "just 5 minutes from...", "conveniently close to...". Keep the tone friendly and informative. Do not mention the specific coordinates in your response. The response should be in markdown format.
        
        Example response format:
        This property offers excellent connectivity and convenience, located in a well-established neighborhood. Everything you need is right on your doorstep.

        *   **Education:** It is a 5-minute walk from the highly-regarded **"Sveti Sava" Primary School**.
        *   **Recreation:** You'll be just around the corner from **Tašmajdan Park**, perfect for morning jogs or relaxing weekends.
        *   **Transport:** The main **Vukov Spomenik train station** is conveniently located a 10-minute walk away, providing easy access across the city.
        *   **Shopping:** The well-known **Kalenić Market** is also nearby for fresh, local produce.
    `;

    try {
        const result = await retryWithBackoff(() =>
            ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    timeout: 20000, // 20 second timeout
                },
            })
        );
        return result.text.trim();
    } catch (e) {
        console.error("Error fetching neighborhood insights:", e instanceof Error ? e.message : String(e));
        throw new Error("Could not retrieve neighborhood insights at this time.");
    }
};