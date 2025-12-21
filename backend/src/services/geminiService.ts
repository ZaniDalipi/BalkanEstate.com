import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY || '' });

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

    console.warn(`Gemini API call failed, retrying in ${delay}ms... (${MAX_RETRIES - retries + 1}/${MAX_RETRIES})`);
    console.warn(`Error: ${error?.message || String(error)}`);
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
  country: string
): Promise<string> => {
  const prompt = `
You are a helpful local guide for the "Balkan Estate" real estate agency.
A user is looking at a property located at ${address}, ${city}, ${country} (coordinates: ${lat}, ${lng}).

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
      })
    );

    if (!result.text) {
      throw new Error("No text returned from Gemini API");
    }

    return result.text.trim();
  } catch (e) {
    console.error("Error fetching neighborhood insights:", e instanceof Error ? e.message : String(e));
    throw new Error("Could not retrieve neighborhood insights at this time. Please try again later.");
  }
};
