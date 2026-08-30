import { normalizePlaceName, matchesPlaceToken } from './normalize';
import { haversineDistanceKm, type Coordinates } from './distance';

/**
 * Curated gazetteer of villages, resorts and coastal settlements that sit
 * inside a listed city's area but are not cities in their own right.
 *
 * Why this exists: Nominatim ranks by global "importance", so a query for a
 * 300-person riviera village (Palasë, Qeparo, Trpejca) is easily outranked by
 * a same-named street on the other side of the Balkans and never reaches the
 * 7-result window the seller sees. These entries are matched locally and shown
 * first, so the places sellers actually list are always reachable.
 *
 * Coordinates are settlement centres accurate to roughly a kilometre — enough
 * to fly the map to the right village. The exact pin is then resolved from the
 * geocoder (see `useLocationSearch`) or set by the seller dragging the marker,
 * so this file never has to be survey-grade.
 */
export interface Locality {
  /** Local spelling, shown to the seller. */
  name: string;
  /** Other names people type for the same place (diacritics are handled separately). */
  aliases?: string[];
  /** Parent city — must match a `name` in `BALKAN_LOCATIONS`. */
  city: string;
  /** Parent country — must match a `name` in `BALKAN_LOCATIONS`. */
  country: string;
  lat: number;
  lng: number;
  kind: 'village' | 'town' | 'resort' | 'beach' | 'neighbourhood';
}

export const BALKAN_LOCALITIES: Locality[] = [
  // ─────────────────────────── Albania ───────────────────────────
  // Vlorë — the Albanian Riviera runs ~55km south of the city centre.
  { name: 'Radhimë', aliases: ['Radhima'], city: 'Vlore', country: 'Albania', lat: 40.3838, lng: 19.4553, kind: 'village' },
  { name: 'Orikum', aliases: ['Orikumi'], city: 'Vlore', country: 'Albania', lat: 40.3253, lng: 19.4711, kind: 'town' },
  { name: 'Tragjas', city: 'Vlore', country: 'Albania', lat: 40.3167, lng: 19.5417, kind: 'village' },
  { name: 'Dukat', city: 'Vlore', country: 'Albania', lat: 40.2833, lng: 19.5333, kind: 'village' },
  { name: 'Llogara', aliases: ['Llogara Pass', 'Qafa e Llogarase'], city: 'Vlore', country: 'Albania', lat: 40.2000, lng: 19.5833, kind: 'village' },
  { name: 'Palasë', aliases: ['Palasa'], city: 'Vlore', country: 'Albania', lat: 40.2033, lng: 19.5967, kind: 'village' },
  { name: 'Dhërmi', aliases: ['Drymades', 'Drimadhes'], city: 'Vlore', country: 'Albania', lat: 40.1500, lng: 19.6417, kind: 'village' },
  { name: 'Jalë', aliases: ['Jala', 'Jale Beach'], city: 'Vlore', country: 'Albania', lat: 40.1350, lng: 19.6600, kind: 'beach' },
  { name: 'Vuno', city: 'Vlore', country: 'Albania', lat: 40.1244, lng: 19.6700, kind: 'village' },
  { name: 'Himarë', aliases: ['Himara'], city: 'Vlore', country: 'Albania', lat: 40.1017, lng: 19.7442, kind: 'town' },
  { name: 'Livadh', aliases: ['Livadhi'], city: 'Vlore', country: 'Albania', lat: 40.1150, lng: 19.7300, kind: 'beach' },
  { name: 'Potam', city: 'Vlore', country: 'Albania', lat: 40.0950, lng: 19.7522, kind: 'beach' },
  { name: 'Qeparo', city: 'Vlore', country: 'Albania', lat: 40.0561, lng: 19.8017, kind: 'village' },
  { name: 'Borsh', city: 'Vlore', country: 'Albania', lat: 40.0500, lng: 19.8500, kind: 'village' },
  { name: 'Piqeras', city: 'Vlore', country: 'Albania', lat: 39.9917, lng: 19.9000, kind: 'village' },
  { name: 'Lukovë', aliases: ['Lukova'], city: 'Vlore', country: 'Albania', lat: 39.9667, lng: 19.9333, kind: 'village' },
  { name: 'Kanina', city: 'Vlore', country: 'Albania', lat: 40.4333, lng: 19.5167, kind: 'village' },
  { name: 'Selenicë', aliases: ['Selenica'], city: 'Vlore', country: 'Albania', lat: 40.5333, lng: 19.6333, kind: 'town' },
  { name: 'Novoselë', aliases: ['Novosela'], city: 'Vlore', country: 'Albania', lat: 40.5667, lng: 19.4333, kind: 'village' },
  { name: 'Zvërnec', aliases: ['Zvernec'], city: 'Vlore', country: 'Albania', lat: 40.5300, lng: 19.4200, kind: 'village' },
  { name: 'Nartë', aliases: ['Narta'], city: 'Vlore', country: 'Albania', lat: 40.5333, lng: 19.4500, kind: 'village' },

  // Sarandë
  { name: 'Ksamil', city: 'Sarande', country: 'Albania', lat: 39.7683, lng: 20.0028, kind: 'town' },
  { name: 'Butrint', aliases: ['Butrinti'], city: 'Sarande', country: 'Albania', lat: 39.7456, lng: 20.0206, kind: 'village' },
  { name: 'Çukë', aliases: ['Cuka'], city: 'Sarande', country: 'Albania', lat: 39.7833, lng: 20.0500, kind: 'village' },
  { name: 'Xarrë', aliases: ['Xarra'], city: 'Sarande', country: 'Albania', lat: 39.7333, lng: 20.1000, kind: 'village' },
  { name: 'Delvinë', aliases: ['Delvina'], city: 'Sarande', country: 'Albania', lat: 39.9481, lng: 20.0967, kind: 'town' },
  { name: 'Konispol', city: 'Sarande', country: 'Albania', lat: 39.6592, lng: 20.1794, kind: 'town' },

  // Tirana
  { name: 'Kamëz', aliases: ['Kamza'], city: 'Tirana', country: 'Albania', lat: 41.3833, lng: 19.7667, kind: 'town' },
  { name: 'Vorë', aliases: ['Vora'], city: 'Tirana', country: 'Albania', lat: 41.3931, lng: 19.6553, kind: 'town' },
  { name: 'Kashar', city: 'Tirana', country: 'Albania', lat: 41.3489, lng: 19.7311, kind: 'neighbourhood' },
  { name: 'Sauk', city: 'Tirana', country: 'Albania', lat: 41.2947, lng: 19.8306, kind: 'neighbourhood' },
  { name: 'Farkë', aliases: ['Farka'], city: 'Tirana', country: 'Albania', lat: 41.3000, lng: 19.8667, kind: 'village' },
  { name: 'Petrelë', aliases: ['Petrela'], city: 'Tirana', country: 'Albania', lat: 41.2597, lng: 19.8353, kind: 'village' },
  { name: 'Dajt', aliases: ['Dajti'], city: 'Tirana', country: 'Albania', lat: 41.3667, lng: 19.9333, kind: 'village' },
  { name: 'Ndroq', city: 'Tirana', country: 'Albania', lat: 41.2700, lng: 19.6500, kind: 'village' },

  // Durrës
  { name: 'Golem', city: 'Durres', country: 'Albania', lat: 41.2500, lng: 19.5000, kind: 'resort' },
  { name: 'Qerret', city: 'Durres', country: 'Albania', lat: 41.2333, lng: 19.5167, kind: 'resort' },
  { name: 'Shkëmbi i Kavajës', aliases: ['Shkembi i Kavajes'], city: 'Durres', country: 'Albania', lat: 41.2800, lng: 19.4650, kind: 'resort' },
  { name: 'Sukth', city: 'Durres', country: 'Albania', lat: 41.4028, lng: 19.5253, kind: 'town' },
  { name: 'Shijak', city: 'Durres', country: 'Albania', lat: 41.3453, lng: 19.5675, kind: 'town' },
  { name: 'Manëz', aliases: ['Maneza'], city: 'Durres', country: 'Albania', lat: 41.4333, lng: 19.5333, kind: 'village' },
  { name: 'Spille', city: 'Kavaje', country: 'Albania', lat: 41.1000, lng: 19.4667, kind: 'beach' },

  // Shkodër
  { name: 'Velipojë', aliases: ['Velipoja'], city: 'Shkoder', country: 'Albania', lat: 41.8667, lng: 19.4167, kind: 'resort' },
  { name: 'Shirokë', aliases: ['Shiroka'], city: 'Shkoder', country: 'Albania', lat: 42.0500, lng: 19.4667, kind: 'village' },
  { name: 'Zogaj', city: 'Shkoder', country: 'Albania', lat: 42.0667, lng: 19.4167, kind: 'village' },
  { name: 'Koplik', city: 'Shkoder', country: 'Albania', lat: 42.2064, lng: 19.4364, kind: 'town' },
  { name: 'Razëm', aliases: ['Razma'], city: 'Shkoder', country: 'Albania', lat: 42.2833, lng: 19.5500, kind: 'village' },
  { name: 'Theth', aliases: ['Thethi'], city: 'Shkoder', country: 'Albania', lat: 42.3947, lng: 19.7869, kind: 'village' },

  // Other Albanian areas
  { name: 'Shëngjin', aliases: ['Shengjini'], city: 'Lezhe', country: 'Albania', lat: 41.8139, lng: 19.5942, kind: 'resort' },
  { name: 'Tale', aliases: ['Tale Beach'], city: 'Lezhe', country: 'Albania', lat: 41.7833, lng: 19.5833, kind: 'beach' },
  { name: 'Fushë-Krujë', aliases: ['Fushe Kruje'], city: 'Kruje', country: 'Albania', lat: 41.4783, lng: 19.7167, kind: 'town' },
  { name: 'Lazarat', city: 'Gjirokaster', country: 'Albania', lat: 40.0333, lng: 20.1333, kind: 'village' },
  { name: 'Libohovë', aliases: ['Libohova'], city: 'Gjirokaster', country: 'Albania', lat: 40.0333, lng: 20.2667, kind: 'town' },
  { name: 'Tepelenë', aliases: ['Tepelena'], city: 'Gjirokaster', country: 'Albania', lat: 40.2969, lng: 20.0189, kind: 'town' },
  { name: 'Voskopojë', aliases: ['Voskopoja'], city: 'Korce', country: 'Albania', lat: 40.6333, lng: 20.5833, kind: 'village' },
  { name: 'Dardhë', aliases: ['Dardha'], city: 'Korce', country: 'Albania', lat: 40.5667, lng: 20.7500, kind: 'village' },
  { name: 'Maliq', city: 'Korce', country: 'Albania', lat: 40.7167, lng: 20.7000, kind: 'town' },
  { name: 'Lin', city: 'Pogradec', country: 'Albania', lat: 41.0333, lng: 20.6333, kind: 'village' },
  { name: 'Tushemisht', city: 'Pogradec', country: 'Albania', lat: 40.8833, lng: 20.6833, kind: 'village' },
  { name: 'Drilon', city: 'Pogradec', country: 'Albania', lat: 40.8917, lng: 20.6750, kind: 'village' },
  { name: 'Kuçovë', aliases: ['Kucova'], city: 'Berat', country: 'Albania', lat: 40.8000, lng: 19.9167, kind: 'town' },
  { name: 'Ura Vajgurore', city: 'Berat', country: 'Albania', lat: 40.7667, lng: 19.8833, kind: 'town' },
  { name: 'Patos', city: 'Fier', country: 'Albania', lat: 40.6833, lng: 19.6167, kind: 'town' },
  { name: 'Apollonia', aliases: ['Apoloni', 'Pojan'], city: 'Fier', country: 'Albania', lat: 40.7167, lng: 19.4667, kind: 'village' },
  { name: 'Seman', city: 'Fier', country: 'Albania', lat: 40.8333, lng: 19.4333, kind: 'beach' },

  // ────────────────────────── Montenegro ──────────────────────────
  { name: 'Bečići', aliases: ['Becici'], city: 'Budva', country: 'Montenegro', lat: 42.2833, lng: 18.8667, kind: 'resort' },
  { name: 'Rafailovići', aliases: ['Rafailovici'], city: 'Budva', country: 'Montenegro', lat: 42.2794, lng: 18.8619, kind: 'resort' },
  { name: 'Pržno', aliases: ['Przno'], city: 'Budva', country: 'Montenegro', lat: 42.2667, lng: 18.8917, kind: 'village' },
  { name: 'Miločer', aliases: ['Milocer'], city: 'Budva', country: 'Montenegro', lat: 42.2650, lng: 18.8850, kind: 'resort' },
  { name: 'Sveti Stefan', city: 'Budva', country: 'Montenegro', lat: 42.2564, lng: 18.8917, kind: 'resort' },
  { name: 'Petrovac', aliases: ['Petrovac na Moru'], city: 'Budva', country: 'Montenegro', lat: 42.2058, lng: 18.9439, kind: 'town' },
  { name: 'Buljarica', city: 'Budva', country: 'Montenegro', lat: 42.1900, lng: 18.9600, kind: 'beach' },
  { name: 'Jaz', aliases: ['Jaz Beach'], city: 'Budva', country: 'Montenegro', lat: 42.2900, lng: 18.8100, kind: 'beach' },
  { name: 'Dobrota', city: 'Kotor', country: 'Montenegro', lat: 42.4519, lng: 18.7639, kind: 'village' },
  { name: 'Perast', city: 'Kotor', country: 'Montenegro', lat: 42.4869, lng: 18.6994, kind: 'town' },
  { name: 'Prčanj', aliases: ['Prcanj'], city: 'Kotor', country: 'Montenegro', lat: 42.4553, lng: 18.7328, kind: 'village' },
  { name: 'Risan', city: 'Kotor', country: 'Montenegro', lat: 42.5158, lng: 18.6961, kind: 'town' },
  { name: 'Muo', city: 'Kotor', country: 'Montenegro', lat: 42.4283, lng: 18.7550, kind: 'village' },
  { name: 'Stoliv', city: 'Kotor', country: 'Montenegro', lat: 42.4667, lng: 18.7167, kind: 'village' },
  { name: 'Orahovac', city: 'Kotor', country: 'Montenegro', lat: 42.4750, lng: 18.7250, kind: 'village' },
  { name: 'Igalo', city: 'Herceg Novi', country: 'Montenegro', lat: 42.4569, lng: 18.5167, kind: 'town' },
  { name: 'Meljine', city: 'Herceg Novi', country: 'Montenegro', lat: 42.4506, lng: 18.5583, kind: 'village' },
  { name: 'Kumbor', city: 'Herceg Novi', country: 'Montenegro', lat: 42.4544, lng: 18.5844, kind: 'village' },
  { name: 'Đenovići', aliases: ['Djenovici', 'Denovici'], city: 'Herceg Novi', country: 'Montenegro', lat: 42.4636, lng: 18.5806, kind: 'village' },
  { name: 'Baošići', aliases: ['Baosici'], city: 'Herceg Novi', country: 'Montenegro', lat: 42.4592, lng: 18.5972, kind: 'village' },
  { name: 'Bijela', city: 'Herceg Novi', country: 'Montenegro', lat: 42.4500, lng: 18.6167, kind: 'village' },
  { name: 'Rose', city: 'Herceg Novi', country: 'Montenegro', lat: 42.4200, lng: 18.5500, kind: 'village' },
  { name: 'Žanjice', aliases: ['Zanjice'], city: 'Herceg Novi', country: 'Montenegro', lat: 42.4144, lng: 18.5589, kind: 'beach' },
  { name: 'Sutomore', city: 'Bar', country: 'Montenegro', lat: 42.1403, lng: 19.0453, kind: 'town' },
  { name: 'Čanj', aliases: ['Canj'], city: 'Bar', country: 'Montenegro', lat: 42.1667, lng: 18.9833, kind: 'beach' },
  { name: 'Utjeha', city: 'Bar', country: 'Montenegro', lat: 42.0333, lng: 19.1333, kind: 'village' },
  { name: 'Dobra Voda', city: 'Bar', country: 'Montenegro', lat: 42.0167, lng: 19.1500, kind: 'village' },
  { name: 'Virpazar', city: 'Bar', country: 'Montenegro', lat: 42.2419, lng: 19.0906, kind: 'village' },
  { name: 'Velika Plaža', aliases: ['Velika Plaza', 'Long Beach'], city: 'Ulcinj', country: 'Montenegro', lat: 41.9000, lng: 19.2833, kind: 'beach' },
  { name: 'Ada Bojana', city: 'Ulcinj', country: 'Montenegro', lat: 41.8500, lng: 19.3333, kind: 'beach' },
  { name: 'Valdanos', city: 'Ulcinj', country: 'Montenegro', lat: 41.9400, lng: 19.1667, kind: 'beach' },
  { name: 'Donja Lastva', city: 'Tivat', country: 'Montenegro', lat: 42.4400, lng: 18.6900, kind: 'village' },
  { name: 'Porto Montenegro', city: 'Tivat', country: 'Montenegro', lat: 42.4340, lng: 18.6870, kind: 'neighbourhood' },
  { name: 'Krašići', aliases: ['Krasici'], city: 'Tivat', country: 'Montenegro', lat: 42.4000, lng: 18.6667, kind: 'village' },
  { name: 'Radovići', aliases: ['Radovici'], city: 'Tivat', country: 'Montenegro', lat: 42.3833, lng: 18.6833, kind: 'village' },
  { name: 'Tuzi', city: 'Podgorica', country: 'Montenegro', lat: 42.3653, lng: 19.3319, kind: 'town' },
  { name: 'Golubovci', city: 'Podgorica', country: 'Montenegro', lat: 42.3300, lng: 19.2200, kind: 'town' },

  // ─────────────────────────── Croatia ───────────────────────────
  { name: 'Kaštela', aliases: ['Kastela'], city: 'Split', country: 'Croatia', lat: 43.5500, lng: 16.3800, kind: 'town' },
  { name: 'Podstrana', city: 'Split', country: 'Croatia', lat: 43.4900, lng: 16.5400, kind: 'town' },
  { name: 'Stobreč', aliases: ['Stobrec'], city: 'Split', country: 'Croatia', lat: 43.5050, lng: 16.5250, kind: 'village' },
  { name: 'Solin', city: 'Split', country: 'Croatia', lat: 43.5400, lng: 16.4900, kind: 'town' },
  { name: 'Seget', aliases: ['Seget Donji'], city: 'Trogir', country: 'Croatia', lat: 43.5200, lng: 16.2300, kind: 'village' },
  { name: 'Baška Voda', aliases: ['Baska Voda'], city: 'Makarska', country: 'Croatia', lat: 43.3567, lng: 16.9500, kind: 'town' },
  { name: 'Brela', city: 'Makarska', country: 'Croatia', lat: 43.3722, lng: 16.9250, kind: 'town' },
  { name: 'Tučepi', aliases: ['Tucepi'], city: 'Makarska', country: 'Croatia', lat: 43.2761, lng: 17.0561, kind: 'town' },
  { name: 'Podgora', city: 'Makarska', country: 'Croatia', lat: 43.2436, lng: 17.0678, kind: 'town' },
  { name: 'Živogošće', aliases: ['Zivogosce'], city: 'Makarska', country: 'Croatia', lat: 43.2000, lng: 17.1667, kind: 'village' },
  { name: 'Drvenik', city: 'Makarska', country: 'Croatia', lat: 43.1750, lng: 17.2500, kind: 'village' },
  { name: 'Gradac', city: 'Makarska', country: 'Croatia', lat: 43.1500, lng: 17.2500, kind: 'town' },
  { name: 'Mlini', city: 'Dubrovnik', country: 'Croatia', lat: 42.6300, lng: 18.1700, kind: 'village' },
  { name: 'Srebreno', city: 'Dubrovnik', country: 'Croatia', lat: 42.6350, lng: 18.1800, kind: 'village' },
  { name: 'Orašac', aliases: ['Orasac'], city: 'Dubrovnik', country: 'Croatia', lat: 42.7100, lng: 18.0100, kind: 'village' },
  { name: 'Zaton', aliases: ['Zaton Mali'], city: 'Dubrovnik', country: 'Croatia', lat: 42.6900, lng: 18.0400, kind: 'village' },
  { name: 'Trsteno', city: 'Dubrovnik', country: 'Croatia', lat: 42.7300, lng: 17.9800, kind: 'village' },
  { name: 'Slano', city: 'Dubrovnik', country: 'Croatia', lat: 42.7833, lng: 17.8833, kind: 'village' },
  { name: 'Ston', city: 'Dubrovnik', country: 'Croatia', lat: 42.8400, lng: 17.6900, kind: 'town' },
  { name: 'Sukošan', aliases: ['Sukosan'], city: 'Zadar', country: 'Croatia', lat: 43.9700, lng: 15.3100, kind: 'town' },
  { name: 'Bibinje', city: 'Zadar', country: 'Croatia', lat: 44.0600, lng: 15.3100, kind: 'village' },
  { name: 'Petrčane', aliases: ['Petrcane'], city: 'Zadar', country: 'Croatia', lat: 44.1700, lng: 15.1600, kind: 'village' },
  { name: 'Nin', city: 'Zadar', country: 'Croatia', lat: 44.2400, lng: 15.1800, kind: 'town' },
  { name: 'Privlaka', city: 'Zadar', country: 'Croatia', lat: 44.2650, lng: 15.1400, kind: 'village' },
  { name: 'Lovran', city: 'Opatija', country: 'Croatia', lat: 45.2900, lng: 14.2750, kind: 'town' },
  { name: 'Ičići', aliases: ['Icici'], city: 'Opatija', country: 'Croatia', lat: 45.3300, lng: 14.2800, kind: 'village' },
  { name: 'Mošćenička Draga', aliases: ['Moscenicka Draga'], city: 'Opatija', country: 'Croatia', lat: 45.2367, lng: 14.2467, kind: 'village' },
  { name: 'Crikvenica', city: 'Rijeka', country: 'Croatia', lat: 45.1767, lng: 14.6928, kind: 'town' },
  { name: 'Novi Vinodolski', city: 'Rijeka', country: 'Croatia', lat: 45.1283, lng: 14.7883, kind: 'town' },
  { name: 'Kraljevica', city: 'Rijeka', country: 'Croatia', lat: 45.2700, lng: 14.5700, kind: 'town' },
  { name: 'Kostrena', city: 'Rijeka', country: 'Croatia', lat: 45.2900, lng: 14.5300, kind: 'village' },
  { name: 'Baška', aliases: ['Baska'], city: 'Krk', country: 'Croatia', lat: 44.9700, lng: 14.7500, kind: 'town' },
  { name: 'Malinska', city: 'Krk', country: 'Croatia', lat: 45.1200, lng: 14.5300, kind: 'town' },
  { name: 'Njivice', city: 'Krk', country: 'Croatia', lat: 45.1667, lng: 14.5500, kind: 'village' },
  { name: 'Punat', city: 'Krk', country: 'Croatia', lat: 45.0200, lng: 14.6300, kind: 'town' },
  { name: 'Vrbnik', city: 'Krk', country: 'Croatia', lat: 45.0800, lng: 14.6700, kind: 'village' },
  { name: 'Omišalj', aliases: ['Omisalj'], city: 'Krk', country: 'Croatia', lat: 45.2100, lng: 14.5600, kind: 'village' },
  { name: 'Banjole', city: 'Pula', country: 'Croatia', lat: 44.8200, lng: 13.8400, kind: 'village' },
  { name: 'Premantura', city: 'Pula', country: 'Croatia', lat: 44.7900, lng: 13.9200, kind: 'village' },
  { name: 'Rogoznica', city: 'Sibenik', country: 'Croatia', lat: 43.5300, lng: 15.9700, kind: 'town' },
  { name: 'Brodarica', city: 'Sibenik', country: 'Croatia', lat: 43.7000, lng: 15.9000, kind: 'village' },
  { name: 'Grebaštica', aliases: ['Grebastica'], city: 'Sibenik', country: 'Croatia', lat: 43.6500, lng: 15.9200, kind: 'village' },
  { name: 'Tribunj', city: 'Sibenik', country: 'Croatia', lat: 43.7500, lng: 15.7500, kind: 'village' },
  { name: 'Pirovac', city: 'Sibenik', country: 'Croatia', lat: 43.8200, lng: 15.6800, kind: 'town' },

  // ──────────────────────────── Greece ────────────────────────────
  { name: 'Glyfada', city: 'Athens', country: 'Greece', lat: 37.8667, lng: 23.7500, kind: 'neighbourhood' },
  { name: 'Voula', city: 'Athens', country: 'Greece', lat: 37.8467, lng: 23.7667, kind: 'neighbourhood' },
  { name: 'Vouliagmeni', city: 'Athens', country: 'Greece', lat: 37.8100, lng: 23.7800, kind: 'neighbourhood' },
  { name: 'Varkiza', city: 'Athens', country: 'Greece', lat: 37.8200, lng: 23.8000, kind: 'resort' },
  { name: 'Piraeus', aliases: ['Pireas'], city: 'Athens', country: 'Greece', lat: 37.9475, lng: 23.6425, kind: 'town' },
  { name: 'Kifissia', aliases: ['Kifisia'], city: 'Athens', country: 'Greece', lat: 38.0736, lng: 23.8103, kind: 'neighbourhood' },
  { name: 'Rafina', city: 'Athens', country: 'Greece', lat: 38.0250, lng: 24.0056, kind: 'town' },
  { name: 'Sounio', aliases: ['Sounion'], city: 'Athens', country: 'Greece', lat: 37.6500, lng: 24.0250, kind: 'village' },
  { name: 'Kalamaria', city: 'Thessaloniki', country: 'Greece', lat: 40.5800, lng: 22.9500, kind: 'neighbourhood' },
  { name: 'Panorama', city: 'Thessaloniki', country: 'Greece', lat: 40.5883, lng: 23.0464, kind: 'neighbourhood' },
  { name: 'Peraia', aliases: ['Perea'], city: 'Thessaloniki', country: 'Greece', lat: 40.5000, lng: 22.9200, kind: 'town' },
  { name: 'Platanias', city: 'Chania', country: 'Greece', lat: 35.5100, lng: 23.8900, kind: 'resort' },
  { name: 'Kissamos', city: 'Chania', country: 'Greece', lat: 35.4950, lng: 23.6550, kind: 'town' },
  { name: 'Georgioupoli', city: 'Chania', country: 'Greece', lat: 35.3600, lng: 24.2600, kind: 'resort' },
  { name: 'Almyrida', city: 'Chania', country: 'Greece', lat: 35.3800, lng: 24.2000, kind: 'village' },
  { name: 'Hersonissos', aliases: ['Chersonisos'], city: 'Heraklion', country: 'Greece', lat: 35.3200, lng: 25.3900, kind: 'resort' },
  { name: 'Malia', city: 'Heraklion', country: 'Greece', lat: 35.2900, lng: 25.4600, kind: 'resort' },
  { name: 'Gouves', city: 'Heraklion', country: 'Greece', lat: 35.3400, lng: 25.2900, kind: 'village' },
  { name: 'Lindos', city: 'Rhodes', country: 'Greece', lat: 36.0917, lng: 28.0872, kind: 'village' },
  { name: 'Faliraki', city: 'Rhodes', country: 'Greece', lat: 36.3400, lng: 28.2000, kind: 'resort' },
  { name: 'Ialysos', aliases: ['Ialyssos', 'Trianta'], city: 'Rhodes', country: 'Greece', lat: 36.4200, lng: 28.1600, kind: 'town' },
  { name: 'Pefkos', aliases: ['Pefki'], city: 'Rhodes', country: 'Greece', lat: 36.0700, lng: 28.0700, kind: 'resort' },
  { name: 'Paleokastritsa', city: 'Corfu', country: 'Greece', lat: 39.6750, lng: 19.7100, kind: 'resort' },
  { name: 'Sidari', city: 'Corfu', country: 'Greece', lat: 39.7900, lng: 19.7000, kind: 'resort' },
  { name: 'Kassiopi', city: 'Corfu', country: 'Greece', lat: 39.7900, lng: 19.9200, kind: 'village' },
  { name: 'Benitses', city: 'Corfu', country: 'Greece', lat: 39.5400, lng: 19.9100, kind: 'village' },
  { name: 'Fiskardo', city: 'Kefalonia', country: 'Greece', lat: 38.4600, lng: 20.5750, kind: 'village' },
  { name: 'Assos', city: 'Kefalonia', country: 'Greece', lat: 38.3800, lng: 20.5400, kind: 'village' },
  { name: 'Lassi', city: 'Kefalonia', country: 'Greece', lat: 38.1700, lng: 20.4700, kind: 'resort' },
  { name: 'Laganas', city: 'Zakynthos', country: 'Greece', lat: 37.7200, lng: 20.8600, kind: 'resort' },
  { name: 'Tsilivi', city: 'Zakynthos', country: 'Greece', lat: 37.8100, lng: 20.8500, kind: 'resort' },
  { name: 'Nidri', aliases: ['Nydri'], city: 'Lefkada', country: 'Greece', lat: 38.7000, lng: 20.7100, kind: 'resort' },
  { name: 'Vasiliki', city: 'Lefkada', country: 'Greece', lat: 38.6300, lng: 20.6100, kind: 'village' },
  { name: 'Agios Nikitas', city: 'Lefkada', country: 'Greece', lat: 38.7900, lng: 20.6100, kind: 'village' },
  { name: 'Naoussa', city: 'Paros', country: 'Greece', lat: 37.1250, lng: 25.2400, kind: 'town' },
  { name: 'Agios Prokopios', city: 'Naxos', country: 'Greece', lat: 37.0800, lng: 25.3600, kind: 'resort' },
  { name: 'Oia', city: 'Santorini', country: 'Greece', lat: 36.4600, lng: 25.3760, kind: 'village' },
  { name: 'Fira', aliases: ['Thira'], city: 'Santorini', country: 'Greece', lat: 36.4167, lng: 25.4333, kind: 'town' },
  { name: 'Kamari', city: 'Santorini', country: 'Greece', lat: 36.3700, lng: 25.4800, kind: 'resort' },
  { name: 'Perissa', city: 'Santorini', country: 'Greece', lat: 36.3550, lng: 25.4700, kind: 'resort' },
  { name: 'Ornos', city: 'Mykonos', country: 'Greece', lat: 37.4200, lng: 25.3200, kind: 'resort' },
  { name: 'Platis Gialos', city: 'Mykonos', country: 'Greece', lat: 37.4100, lng: 25.3400, kind: 'resort' },
  { name: 'Ano Mera', city: 'Mykonos', country: 'Greece', lat: 37.4400, lng: 25.3900, kind: 'village' },

  // ─────────────────────────── Bulgaria ───────────────────────────
  { name: 'Sunny Beach', aliases: ['Slanchev Bryag'], city: 'Burgas', country: 'Bulgaria', lat: 42.6900, lng: 27.7100, kind: 'resort' },
  { name: 'Nesebar', aliases: ['Nessebar'], city: 'Burgas', country: 'Bulgaria', lat: 42.6592, lng: 27.7364, kind: 'town' },
  { name: 'Sveti Vlas', city: 'Burgas', country: 'Bulgaria', lat: 42.7100, lng: 27.7500, kind: 'resort' },
  { name: 'Ravda', city: 'Burgas', country: 'Bulgaria', lat: 42.6400, lng: 27.6800, kind: 'village' },
  { name: 'Pomorie', city: 'Burgas', country: 'Bulgaria', lat: 42.5589, lng: 27.6417, kind: 'town' },
  { name: 'Sozopol', city: 'Burgas', country: 'Bulgaria', lat: 42.4181, lng: 27.6950, kind: 'town' },
  { name: 'Chernomorets', city: 'Burgas', country: 'Bulgaria', lat: 42.4450, lng: 27.6450, kind: 'town' },
  { name: 'Primorsko', city: 'Burgas', country: 'Bulgaria', lat: 42.2653, lng: 27.7583, kind: 'town' },
  { name: 'Kiten', city: 'Burgas', country: 'Bulgaria', lat: 42.2350, lng: 27.7800, kind: 'resort' },
  { name: 'Tsarevo', city: 'Burgas', country: 'Bulgaria', lat: 42.1697, lng: 27.8489, kind: 'town' },
  { name: 'Ahtopol', city: 'Burgas', country: 'Bulgaria', lat: 42.1000, lng: 27.9400, kind: 'town' },
  { name: 'Golden Sands', aliases: ['Zlatni Pyasatsi'], city: 'Varna', country: 'Bulgaria', lat: 43.2833, lng: 28.0417, kind: 'resort' },
  { name: 'Sveti Konstantin', aliases: ['Saints Constantine and Helena'], city: 'Varna', country: 'Bulgaria', lat: 43.2300, lng: 28.0100, kind: 'resort' },
  { name: 'Albena', city: 'Varna', country: 'Bulgaria', lat: 43.3700, lng: 28.0800, kind: 'resort' },
  { name: 'Balchik', city: 'Varna', country: 'Bulgaria', lat: 43.4050, lng: 28.1600, kind: 'town' },
  { name: 'Kavarna', city: 'Varna', country: 'Bulgaria', lat: 43.4300, lng: 28.3400, kind: 'town' },
  { name: 'Byala', city: 'Varna', country: 'Bulgaria', lat: 42.8767, lng: 27.8867, kind: 'town' },
  { name: 'Obzor', city: 'Varna', country: 'Bulgaria', lat: 42.8167, lng: 27.8833, kind: 'town' },
  { name: 'Bankya', city: 'Sofia', country: 'Bulgaria', lat: 42.7100, lng: 23.1500, kind: 'town' },
  { name: 'Boyana', city: 'Sofia', country: 'Bulgaria', lat: 42.6500, lng: 23.2700, kind: 'neighbourhood' },
  { name: 'Dragalevtsi', city: 'Sofia', country: 'Bulgaria', lat: 42.6300, lng: 23.3100, kind: 'neighbourhood' },
  { name: 'Simeonovo', city: 'Sofia', country: 'Bulgaria', lat: 42.6200, lng: 23.3300, kind: 'neighbourhood' },
  { name: 'Bansko', city: 'Blagoevgrad', country: 'Bulgaria', lat: 41.8383, lng: 23.4881, kind: 'town' },
  { name: 'Razlog', city: 'Blagoevgrad', country: 'Bulgaria', lat: 41.8850, lng: 23.4700, kind: 'town' },
  { name: 'Sandanski', city: 'Blagoevgrad', country: 'Bulgaria', lat: 41.5667, lng: 23.2833, kind: 'town' },
  { name: 'Melnik', city: 'Blagoevgrad', country: 'Bulgaria', lat: 41.5250, lng: 23.3950, kind: 'town' },

  // ─────────────────────────── Romania ────────────────────────────
  { name: 'Mamaia', city: 'Constanta', country: 'Romania', lat: 44.2500, lng: 28.6167, kind: 'resort' },
  { name: 'Năvodari', aliases: ['Navodari'], city: 'Constanta', country: 'Romania', lat: 44.3167, lng: 28.6000, kind: 'town' },
  { name: 'Eforie', aliases: ['Eforie Nord', 'Eforie Sud'], city: 'Constanta', country: 'Romania', lat: 44.0500, lng: 28.6400, kind: 'resort' },
  { name: 'Costinești', aliases: ['Costinesti'], city: 'Constanta', country: 'Romania', lat: 43.9500, lng: 28.6300, kind: 'resort' },
  { name: 'Olimp', city: 'Constanta', country: 'Romania', lat: 43.8400, lng: 28.5900, kind: 'resort' },
  { name: 'Neptun', city: 'Constanta', country: 'Romania', lat: 43.8300, lng: 28.5900, kind: 'resort' },
  { name: 'Jupiter', city: 'Constanta', country: 'Romania', lat: 43.8350, lng: 28.5900, kind: 'resort' },
  { name: 'Venus', city: 'Constanta', country: 'Romania', lat: 43.8250, lng: 28.5850, kind: 'resort' },
  { name: 'Saturn', city: 'Constanta', country: 'Romania', lat: 43.8200, lng: 28.5800, kind: 'resort' },
  { name: 'Mangalia', city: 'Constanta', country: 'Romania', lat: 43.8167, lng: 28.5833, kind: 'town' },
  { name: '2 Mai', aliases: ['Doi Mai'], city: 'Constanta', country: 'Romania', lat: 43.7700, lng: 28.5750, kind: 'village' },
  { name: 'Vama Veche', city: 'Constanta', country: 'Romania', lat: 43.7500, lng: 28.5750, kind: 'village' },
  { name: 'Poiana Brașov', aliases: ['Poiana Brasov'], city: 'Brasov', country: 'Romania', lat: 45.5900, lng: 25.5500, kind: 'resort' },
  { name: 'Predeal', city: 'Brasov', country: 'Romania', lat: 45.5000, lng: 25.5750, kind: 'town' },
  { name: 'Bran', city: 'Brasov', country: 'Romania', lat: 45.5150, lng: 25.3670, kind: 'village' },
  { name: 'Râșnov', aliases: ['Rasnov'], city: 'Brasov', country: 'Romania', lat: 45.5900, lng: 25.4600, kind: 'town' },
  { name: 'Otopeni', city: 'Bucharest', country: 'Romania', lat: 44.5500, lng: 26.0700, kind: 'town' },
  { name: 'Voluntari', city: 'Bucharest', country: 'Romania', lat: 44.4900, lng: 26.1400, kind: 'town' },
  { name: 'Snagov', city: 'Bucharest', country: 'Romania', lat: 44.7100, lng: 26.1800, kind: 'village' },
  { name: 'Popești-Leordeni', aliases: ['Popesti-Leordeni'], city: 'Bucharest', country: 'Romania', lat: 44.3800, lng: 26.1700, kind: 'town' },

  // ──────────────────────────── Serbia ────────────────────────────
  { name: 'Zemun', city: 'Belgrade', country: 'Serbia', lat: 44.8430, lng: 20.4010, kind: 'neighbourhood' },
  { name: 'Novi Beograd', aliases: ['New Belgrade'], city: 'Belgrade', country: 'Serbia', lat: 44.8100, lng: 20.4000, kind: 'neighbourhood' },
  { name: 'Avala', city: 'Belgrade', country: 'Serbia', lat: 44.6900, lng: 20.5100, kind: 'village' },
  { name: 'Surčin', aliases: ['Surcin'], city: 'Belgrade', country: 'Serbia', lat: 44.7900, lng: 20.2800, kind: 'town' },
  { name: 'Obrenovac', city: 'Belgrade', country: 'Serbia', lat: 44.6550, lng: 20.2000, kind: 'town' },
  { name: 'Sremski Karlovci', city: 'Novi Sad', country: 'Serbia', lat: 45.2000, lng: 19.9333, kind: 'town' },
  { name: 'Petrovaradin', city: 'Novi Sad', country: 'Serbia', lat: 45.2500, lng: 19.8700, kind: 'neighbourhood' },
  { name: 'Fruška Gora', aliases: ['Fruska Gora'], city: 'Novi Sad', country: 'Serbia', lat: 45.1600, lng: 19.7000, kind: 'village' },
  { name: 'Zlatibor', city: 'Uzice', country: 'Serbia', lat: 43.7300, lng: 19.7000, kind: 'resort' },
  { name: 'Kopaonik', city: 'Kraljevo', country: 'Serbia', lat: 43.2800, lng: 20.8000, kind: 'resort' },

  // ─────────────────── Bosnia and Herzegovina ────────────────────
  { name: 'Ilidža', aliases: ['Ilidza'], city: 'Sarajevo', country: 'Bosnia and Herzegovina', lat: 43.8300, lng: 18.3100, kind: 'town' },
  { name: 'Vogošća', aliases: ['Vogosca'], city: 'Sarajevo', country: 'Bosnia and Herzegovina', lat: 43.9000, lng: 18.3400, kind: 'town' },
  { name: 'Jahorina', city: 'Sarajevo', country: 'Bosnia and Herzegovina', lat: 43.7300, lng: 18.5700, kind: 'resort' },
  { name: 'Bjelašnica', aliases: ['Bjelasnica'], city: 'Sarajevo', country: 'Bosnia and Herzegovina', lat: 43.7100, lng: 18.2700, kind: 'resort' },
  { name: 'Pale', city: 'Sarajevo', country: 'Bosnia and Herzegovina', lat: 43.8200, lng: 18.5700, kind: 'town' },
  { name: 'Trebević', aliases: ['Trebevic'], city: 'Sarajevo', country: 'Bosnia and Herzegovina', lat: 43.8300, lng: 18.4400, kind: 'village' },
  { name: 'Blagaj', city: 'Mostar', country: 'Bosnia and Herzegovina', lat: 43.2570, lng: 17.8890, kind: 'village' },
  { name: 'Međugorje', aliases: ['Medjugorje'], city: 'Mostar', country: 'Bosnia and Herzegovina', lat: 43.1900, lng: 17.6800, kind: 'village' },
  { name: 'Počitelj', aliases: ['Pocitelj'], city: 'Mostar', country: 'Bosnia and Herzegovina', lat: 43.1300, lng: 17.7300, kind: 'village' },
  { name: 'Neum', city: 'Mostar', country: 'Bosnia and Herzegovina', lat: 42.9200, lng: 17.6000, kind: 'town' },

  // ──────────────────────────── Kosovo ────────────────────────────
  { name: 'Graçanicë', aliases: ['Gracanica'], city: 'Prishtina', country: 'Kosovo', lat: 42.6000, lng: 21.1900, kind: 'town' },
  { name: 'Fushë Kosovë', aliases: ['Fushe Kosove', 'Kosovo Polje'], city: 'Prishtina', country: 'Kosovo', lat: 42.6300, lng: 21.0900, kind: 'town' },
  { name: 'Obiliq', aliases: ['Obilic'], city: 'Prishtina', country: 'Kosovo', lat: 42.6900, lng: 21.0700, kind: 'town' },
  { name: 'Rugovë', aliases: ['Rugova'], city: 'Peja', country: 'Kosovo', lat: 42.6700, lng: 20.1500, kind: 'village' },
  { name: 'Brezovicë', aliases: ['Brezovica'], city: 'Prizren', country: 'Kosovo', lat: 42.2000, lng: 21.0000, kind: 'resort' },

  // ─────────────────────── North Macedonia ────────────────────────
  { name: 'Peštani', aliases: ['Pestani'], city: 'Ohrid', country: 'North Macedonia', lat: 40.9800, lng: 20.8100, kind: 'village' },
  { name: 'Trpejca', city: 'Ohrid', country: 'North Macedonia', lat: 40.9300, lng: 20.7900, kind: 'village' },
  { name: 'Sveti Naum', city: 'Ohrid', country: 'North Macedonia', lat: 40.9140, lng: 20.7430, kind: 'village' },
  { name: 'Lagadin', city: 'Ohrid', country: 'North Macedonia', lat: 41.0300, lng: 20.8100, kind: 'village' },
  { name: 'Matka', city: 'Skopje', country: 'North Macedonia', lat: 41.9500, lng: 21.3000, kind: 'village' },
  { name: 'Mavrovo', city: 'Gostivar', country: 'North Macedonia', lat: 41.6300, lng: 20.7700, kind: 'resort' },
  { name: 'Krushevo', aliases: ['Krusevo'], city: 'Prilep', country: 'North Macedonia', lat: 41.3700, lng: 21.2500, kind: 'town' },
  { name: 'Dojran', aliases: ['Star Dojran'], city: 'Gevgelija', country: 'North Macedonia', lat: 41.1900, lng: 22.7200, kind: 'town' },
];

export interface LocalityMatch extends Locality {
  /** Distance from the search anchor, when one was supplied. */
  distanceKm?: number;
  /** Higher is a better match; used to order suggestions. */
  score: number;
}

interface IndexedLocality extends Locality {
  normalizedNames: string[];
  normalizedCity: string;
  normalizedCountry: string;
}

const INDEX: IndexedLocality[] = BALKAN_LOCALITIES.map((locality) => ({
  ...locality,
  normalizedNames: [locality.name, ...(locality.aliases ?? [])].map(normalizePlaceName),
  normalizedCity: normalizePlaceName(locality.city),
  normalizedCountry: normalizePlaceName(locality.country),
}));

/** Every locality registered under a city, in declaration order. */
export const getLocalitiesForCity = (country: string, city: string): Locality[] => {
  const normalizedCountry = normalizePlaceName(country);
  const normalizedCity = normalizePlaceName(city);
  return INDEX.filter(
    (entry) => entry.normalizedCountry === normalizedCountry && entry.normalizedCity === normalizedCity
  );
};

export interface LocalitySearchOptions {
  /** Restrict to one country (city names repeat across the Balkans). */
  country?: string;
  /** Localities of this city rank above the rest. */
  city?: string;
  /** Anchor used to compute `distanceKm` and to drop far-away matches. */
  near?: Coordinates | null;
  /** Matches further than this from `near` are dropped. */
  maxDistanceKm?: number;
  maxResults?: number;
}

/**
 * Match a free-text query against the gazetteer.
 * Exact name > name prefix > word-inside-name; ties broken by proximity to
 * `near`, so "Palase" typed while listing in Vlorë resolves to the riviera
 * village rather than a same-named place elsewhere.
 */
export const searchLocalities = (
  query: string,
  { country, city, near, maxDistanceKm, maxResults = 6 }: LocalitySearchOptions = {}
): LocalityMatch[] => {
  const normalizedQuery = normalizePlaceName(query);
  if (normalizedQuery.length < 2) return [];

  const normalizedCountry = country ? normalizePlaceName(country) : undefined;
  const normalizedCity = city ? normalizePlaceName(city) : undefined;

  const matches: LocalityMatch[] = [];

  for (const entry of INDEX) {
    if (normalizedCountry && entry.normalizedCountry !== normalizedCountry) continue;

    let nameScore = 0;
    for (const name of entry.normalizedNames) {
      if (name === normalizedQuery) nameScore = Math.max(nameScore, 100);
      else if (name.startsWith(normalizedQuery)) nameScore = Math.max(nameScore, 70);
      else if (matchesPlaceToken(name, normalizedQuery)) nameScore = Math.max(nameScore, 40);
    }
    if (nameScore === 0) continue;

    const distanceKm = near ? haversineDistanceKm(near, { lat: entry.lat, lng: entry.lng }) : undefined;
    if (maxDistanceKm !== undefined && distanceKm !== undefined && distanceKm > maxDistanceKm) continue;

    let score = nameScore;
    if (normalizedCity && entry.normalizedCity === normalizedCity) score += 25;
    // Closer matches win, but proximity never outweighs a better name match.
    if (distanceKm !== undefined && Number.isFinite(distanceKm)) {
      score += Math.max(0, 20 - distanceKm / 5);
    }

    matches.push({ ...entry, distanceKm, score });
  }

  return matches.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, maxResults);
};
