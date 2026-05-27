import axios from 'axios';
import { apiLogger } from '../utils/logger';

export interface WikiImage {
  title: string;
  url: string;       // direct image URL
  thumbUrl: string;  // 800px thumbnail URL
  credit: string;    // attribution text
}

const axiosInstance = axios.create({
  timeout: 8_000,
  headers: {
    'User-Agent': 'BalkanEstate Research Bot/1.0 (real estate data aggregation)',
    'Accept': 'application/json',
  },
});

// ── Fallback image URLs ───────────────────────────────────────────────────────

/**
 * Direct Wikimedia Commons Special:FilePath URLs for all 89 cities.
 * These redirect to the actual image file — reliable as last-resort fallback.
 */
export const CITY_FALLBACK_IMAGES: Record<string, string> = {
  // Kosovo
  Prishtina: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pristina_Kosovo.jpg?width=1200',
  Prizren: 'https://commons.wikimedia.org/wiki/Special:FilePath/Prizren_Kosovo.jpg?width=1200',
  Peja: 'https://commons.wikimedia.org/wiki/Special:FilePath/Peja_Kosovo.jpg?width=1200',
  Gjakova: 'https://commons.wikimedia.org/wiki/Special:FilePath/Gjakova_Kosovo.jpg?width=1200',
  Ferizaj: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ferizaj_Kosovo.jpg?width=1200',
  Mitrovica: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mitrovica_Kosovo.jpg?width=1200',
  Gjilan: 'https://commons.wikimedia.org/wiki/Special:FilePath/Gjilan_Kosovo.jpg?width=1200',

  // Albania
  Tirana: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tirana_Albania.jpg?width=1200',
  Durres: 'https://commons.wikimedia.org/wiki/Special:FilePath/Durres_Albania.jpg?width=1200',
  Vlore: 'https://commons.wikimedia.org/wiki/Special:FilePath/Vlore_Albania.jpg?width=1200',
  Sarande: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sarande_Albania.jpg?width=1200',
  Shkoder: 'https://commons.wikimedia.org/wiki/Special:FilePath/Shkoder_Albania.jpg?width=1200',
  Fier: 'https://commons.wikimedia.org/wiki/Special:FilePath/Fier_Albania.jpg?width=1200',
  Berat: 'https://commons.wikimedia.org/wiki/Special:FilePath/Berat_Albania.jpg?width=1200',
  Elbasan: 'https://commons.wikimedia.org/wiki/Special:FilePath/Elbasan_Albania.jpg?width=1200',
  Korce: 'https://commons.wikimedia.org/wiki/Special:FilePath/Korce_Albania.jpg?width=1200',

  // North Macedonia
  Skopje: 'https://commons.wikimedia.org/wiki/Special:FilePath/Skopje_Macedonia.jpg?width=1200',
  Ohrid: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ohrid_Macedonia.jpg?width=1200',
  Bitola: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bitola_Macedonia.jpg?width=1200',
  Tetovo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tetovo_Macedonia.jpg?width=1200',
  Kumanovo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kumanovo_Macedonia.jpg?width=1200',
  Veles: 'https://commons.wikimedia.org/wiki/Special:FilePath/Veles_Macedonia.jpg?width=1200',
  Strumica: 'https://commons.wikimedia.org/wiki/Special:FilePath/Strumica_Macedonia.jpg?width=1200',
  Kavadarci: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kavadarci_Macedonia.jpg?width=1200',

  // Serbia
  Belgrade: 'https://commons.wikimedia.org/wiki/Special:FilePath/Belgrade_Serbia.jpg?width=1200',
  'Novi Sad': 'https://commons.wikimedia.org/wiki/Special:FilePath/Novi_Sad_Serbia.jpg?width=1200',
  Nis: 'https://commons.wikimedia.org/wiki/Special:FilePath/Nis_Serbia.jpg?width=1200',
  Kragujevac: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kragujevac_Serbia.jpg?width=1200',
  Subotica: 'https://commons.wikimedia.org/wiki/Special:FilePath/Subotica_Serbia.jpg?width=1200',
  Zrenjanin: 'https://commons.wikimedia.org/wiki/Special:FilePath/Zrenjanin_Serbia.jpg?width=1200',
  Pancevo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pancevo_Serbia.jpg?width=1200',
  Cacak: 'https://commons.wikimedia.org/wiki/Special:FilePath/Cacak_Serbia.jpg?width=1200',
  Valjevo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Valjevo_Serbia.jpg?width=1200',
  Smederevo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Smederevo_Serbia.jpg?width=1200',

  // Bosnia and Herzegovina
  Sarajevo: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sarajevo_Bosnia.jpg?width=1200',
  'Banja Luka': 'https://commons.wikimedia.org/wiki/Special:FilePath/Banja_Luka_Bosnia.jpg?width=1200',
  Mostar: 'https://commons.wikimedia.org/wiki/Special:FilePath/Mostar_Bosnia.jpg?width=1200',
  Tuzla: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tuzla_Bosnia.jpg?width=1200',
  Zenica: 'https://commons.wikimedia.org/wiki/Special:FilePath/Zenica_Bosnia.jpg?width=1200',
  Trebinje: 'https://commons.wikimedia.org/wiki/Special:FilePath/Trebinje_Bosnia.jpg?width=1200',
  Bijeljina: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bijeljina_Bosnia.jpg?width=1200',
  Brcko: 'https://commons.wikimedia.org/wiki/Special:FilePath/Brcko_Bosnia.jpg?width=1200',

  // Croatia
  Zagreb: 'https://commons.wikimedia.org/wiki/Special:FilePath/Zagreb_Croatia.jpg?width=1200',
  Split: 'https://commons.wikimedia.org/wiki/Special:FilePath/Split_Croatia.jpg?width=1200',
  Dubrovnik: 'https://commons.wikimedia.org/wiki/Special:FilePath/Dubrovnik_Croatia.jpg?width=1200',
  Rijeka: 'https://commons.wikimedia.org/wiki/Special:FilePath/Rijeka_Croatia.jpg?width=1200',
  Osijek: 'https://commons.wikimedia.org/wiki/Special:FilePath/Osijek_Croatia.jpg?width=1200',
  Zadar: 'https://commons.wikimedia.org/wiki/Special:FilePath/Zadar_Croatia.jpg?width=1200',
  Pula: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pula_Croatia.jpg?width=1200',
  Sibenik: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sibenik_Croatia.jpg?width=1200',
  Varazdin: 'https://commons.wikimedia.org/wiki/Special:FilePath/Varazdin_Croatia.jpg?width=1200',
  'Slavonski Brod': 'https://commons.wikimedia.org/wiki/Special:FilePath/Slavonski_Brod_Croatia.jpg?width=1200',

  // Montenegro
  Podgorica: 'https://commons.wikimedia.org/wiki/Special:FilePath/Podgorica_Montenegro.jpg?width=1200',
  Budva: 'https://commons.wikimedia.org/wiki/Special:FilePath/Budva_Montenegro.jpg?width=1200',
  Kotor: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kotor_Montenegro.jpg?width=1200',
  Niksic: 'https://commons.wikimedia.org/wiki/Special:FilePath/Niksic_Montenegro.jpg?width=1200',
  'Herceg Novi': 'https://commons.wikimedia.org/wiki/Special:FilePath/Herceg_Novi_Montenegro.jpg?width=1200',
  Bar: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bar_Montenegro.jpg?width=1200',
  Ulcinj: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ulcinj_Montenegro.jpg?width=1200',
  Tivat: 'https://commons.wikimedia.org/wiki/Special:FilePath/Tivat_Montenegro.jpg?width=1200',

  // Greece
  Athens: 'https://commons.wikimedia.org/wiki/Special:FilePath/View_of_Athens_Greece.jpg?width=1200',
  Thessaloniki: 'https://commons.wikimedia.org/wiki/Special:FilePath/Thessaloniki_Greece.jpg?width=1200',
  Patras: 'https://commons.wikimedia.org/wiki/Special:FilePath/Patras_Greece.jpg?width=1200',
  Heraklion: 'https://commons.wikimedia.org/wiki/Special:FilePath/Heraklion_Greece.jpg?width=1200',
  Volos: 'https://commons.wikimedia.org/wiki/Special:FilePath/Volos_Greece.jpg?width=1200',
  Larissa: 'https://commons.wikimedia.org/wiki/Special:FilePath/Larissa_Greece.jpg?width=1200',
  Ioannina: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ioannina_Greece.jpg?width=1200',
  Kavala: 'https://commons.wikimedia.org/wiki/Special:FilePath/Kavala_Greece.jpg?width=1200',
  Chania: 'https://commons.wikimedia.org/wiki/Special:FilePath/Chania_Greece.jpg?width=1200',
  Rhodes: 'https://commons.wikimedia.org/wiki/Special:FilePath/Rhodes_Greece.jpg?width=1200',

  // Bulgaria
  Sofia: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sofia_Bulgaria.jpg?width=1200',
  Plovdiv: 'https://commons.wikimedia.org/wiki/Special:FilePath/Plovdiv_Bulgaria.jpg?width=1200',
  Varna: 'https://commons.wikimedia.org/wiki/Special:FilePath/Varna_Bulgaria.jpg?width=1200',
  Burgas: 'https://commons.wikimedia.org/wiki/Special:FilePath/Burgas_Bulgaria.jpg?width=1200',
  'Stara Zagora': 'https://commons.wikimedia.org/wiki/Special:FilePath/Stara_Zagora_Bulgaria.jpg?width=1200',
  Pleven: 'https://commons.wikimedia.org/wiki/Special:FilePath/Pleven_Bulgaria.jpg?width=1200',
  Ruse: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ruse_Bulgaria.jpg?width=1200',
  Sliven: 'https://commons.wikimedia.org/wiki/Special:FilePath/Sliven_Bulgaria.jpg?width=1200',
  Dobrich: 'https://commons.wikimedia.org/wiki/Special:FilePath/Dobrich_Bulgaria.jpg?width=1200',

  // Romania
  Bucharest: 'https://commons.wikimedia.org/wiki/Special:FilePath/Bucharest_Romania.jpg?width=1200',
  'Cluj-Napoca': 'https://commons.wikimedia.org/wiki/Special:FilePath/Cluj-Napoca_Romania.jpg?width=1200',
  Timisoara: 'https://commons.wikimedia.org/wiki/Special:FilePath/Timisoara_Romania.jpg?width=1200',
  Brasov: 'https://commons.wikimedia.org/wiki/Special:FilePath/Brasov_Romania.jpg?width=1200',
  Iasi: 'https://commons.wikimedia.org/wiki/Special:FilePath/Iasi_Romania.jpg?width=1200',
  Constanta: 'https://commons.wikimedia.org/wiki/Special:FilePath/Constanta_Romania.jpg?width=1200',
  Galati: 'https://commons.wikimedia.org/wiki/Special:FilePath/Galati_Romania.jpg?width=1200',
  Craiova: 'https://commons.wikimedia.org/wiki/Special:FilePath/Craiova_Romania.jpg?width=1200',
  Ploiesti: 'https://commons.wikimedia.org/wiki/Special:FilePath/Ploiesti_Romania.jpg?width=1200',
  Oradea: 'https://commons.wikimedia.org/wiki/Special:FilePath/Oradea_Romania.jpg?width=1200',
};

// ── Wikimedia Commons API helpers ─────────────────────────────────────────────

interface WikiSearchResult {
  query?: {
    search?: Array<{ title: string }>;
  };
}

interface WikiImageInfoResult {
  query?: {
    pages?: Record<string, {
      imageinfo?: Array<{
        url?: string;
        thumburl?: string;
        extmetadata?: {
          Artist?: { value: string };
          LicenseShortName?: { value: string };
          Attribution?: { value: string };
        };
      }>;
    }>;
  };
}

function buildFallbackWikiImage(city: string, country: string): WikiImage {
  const url = getCityFallbackImageUrl(city, country);
  return {
    title: `${city}, ${country}`,
    url,
    thumbUrl: url,
    credit: `Image via Wikimedia Commons. City: ${city}, ${country}.`,
  };
}

function isValidImageFile(title: string): boolean {
  const lower = title.toLowerCase();
  if (!lower.endsWith('.jpg') && !lower.endsWith('.png')) return false;
  const excluded = ['map', 'coat', 'flag', 'logo', 'symbol'];
  return !excluded.some(word => lower.includes(word));
}

function isPreferredImageFile(title: string): boolean {
  const lower = title.toLowerCase();
  const preferred = ['skyline', 'aerial', 'panorama', 'view'];
  return preferred.some(word => lower.includes(word));
}

async function searchWikimediaImages(query: string): Promise<string[]> {
  try {
    const encoded = encodeURIComponent(query);
    const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encoded}&srnamespace=6&format=json&srlimit=10&origin=*`;
    const response = await axiosInstance.get<WikiSearchResult>(url);
    const results = response.data?.query?.search ?? [];
    return results.map(r => r.title.replace(/^File:/, ''));
  } catch {
    return [];
  }
}

async function fetchImageInfo(filename: string): Promise<WikiImage | null> {
  try {
    const encoded = encodeURIComponent(`File:${filename}`);
    const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encoded}&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=1200&format=json&origin=*`;
    const response = await axiosInstance.get<WikiImageInfoResult>(url);
    const pages = response.data?.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0];
    if (!page?.imageinfo?.length) return null;

    const info = page.imageinfo[0];
    const imageUrl = info.url ?? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=1200`;
    const thumbUrl = info.thumburl ?? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(filename)}?width=800`;

    const meta = info.extmetadata;
    const artist = meta?.Artist?.value ?? '';
    const license = meta?.LicenseShortName?.value ?? 'CC BY-SA';
    const attribution = meta?.Attribution?.value ?? '';
    const credit = attribution || (artist ? `${artist} (${license})` : `Wikimedia Commons (${license})`);

    return {
      title: filename,
      url: imageUrl,
      thumbUrl,
      credit,
    };
  } catch {
    return null;
  }
}

// ── Public exports ────────────────────────────────────────────────────────────

/**
 * Returns the fallback image URL for a city.
 * Uses CITY_FALLBACK_IMAGES map first, then constructs a generic URL.
 */
export function getCityFallbackImageUrl(city: string, country: string): string {
  if (CITY_FALLBACK_IMAGES[city]) return CITY_FALLBACK_IMAGES[city];
  // Construct a generic Wikimedia URL as last resort
  const slug = city.replace(/\s+/g, '_');
  const countrySlug = country.replace(/\s+/g, '_');
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${slug}_${countrySlug}.jpg?width=1200`;
}

/**
 * Fetch city images from Wikimedia Commons.
 * Tries multiple search queries in order until enough images are found.
 * Always returns at least one image (fallback) — never throws.
 */
export async function fetchCityImages(
  city: string,
  country: string,
  count: number = 3,
): Promise<WikiImage[]> {
  try {
    const queries = [
      `${city} ${country} skyline`,
      `${city} ${country} city center`,
      `${city} ${country} aerial`,
      `${city} ${country}`,
    ];

    const collectedTitles: string[] = [];

    for (const query of queries) {
      if (collectedTitles.length >= count * 3) break; // gather extras to filter
      const titles = await searchWikimediaImages(query);
      for (const title of titles) {
        if (!collectedTitles.includes(title) && isValidImageFile(title)) {
          collectedTitles.push(title);
        }
      }
      if (collectedTitles.length >= count) break;
    }

    // Sort: preferred (skyline/aerial/etc.) first
    collectedTitles.sort((a, b) => {
      const aP = isPreferredImageFile(a) ? 0 : 1;
      const bP = isPreferredImageFile(b) ? 0 : 1;
      return aP - bP;
    });

    const images: WikiImage[] = [];
    for (const title of collectedTitles.slice(0, count * 2)) {
      if (images.length >= count) break;
      const info = await fetchImageInfo(title);
      if (info) images.push(info);
    }

    if (images.length === 0) {
      apiLogger.warn(`No Wikimedia images found for ${city}, ${country} — using fallback`);
      return [buildFallbackWikiImage(city, country)];
    }

    // Pad with fallback if we got fewer than requested
    if (images.length < count) {
      images.push(buildFallbackWikiImage(city, country));
    }

    return images;
  } catch (error) {
    apiLogger.error(`fetchCityImages failed for ${city}, ${country}:`, error);
    return [buildFallbackWikiImage(city, country)];
  }
}

/**
 * Fetch a single image for a suburb/neighborhood.
 * Returns null if nothing found (caller should use city-level image).
 */
export async function fetchSuburbImage(
  suburbName: string,
  city: string,
  country: string,
): Promise<WikiImage | null> {
  try {
    const queries = [
      `${suburbName} ${city} ${country}`,
      `${suburbName} ${city}`,
    ];

    for (const query of queries) {
      const titles = await searchWikimediaImages(query);
      const valid = titles.filter(isValidImageFile);
      if (valid.length > 0) {
        const info = await fetchImageInfo(valid[0]);
        if (info) return info;
      }
    }

    return null;
  } catch (error) {
    apiLogger.error(`fetchSuburbImage failed for ${suburbName}, ${city}:`, error);
    return null;
  }
}
