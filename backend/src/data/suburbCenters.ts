/**
 * Static suburb center data for all 40 featured cities.
 * Each entry has a name, optional local name, center coordinates [lat, lng],
 * radius in km (used to generate approximate circular polygon), and an
 * optional official data URL.
 */

export interface SuburbCenterEntry {
  name: string;
  nameLocal?: string;
  center: [number, number]; // [lat, lng]
  radiusKm: number;
  officialDataUrl?: string;
}

export const SUBURB_CENTERS: Record<string, SuburbCenterEntry[]> = {
  // ── Kosovo ───────────────────────────────────────────────────────────────
  Gjakova: [
    { name: 'Center', center: [42.382, 20.430], radiusKm: 1.0 },
    { name: 'Çarshia e Madhe', center: [42.380, 20.425], radiusKm: 0.7 },
    { name: 'Hadum', center: [42.384, 20.434], radiusKm: 0.8 },
    { name: 'Çabrat', center: [42.390, 20.441], radiusKm: 1.0 },
  ],
  Ferizaj: [
    { name: 'Center', center: [42.370, 21.148], radiusKm: 1.0 },
    { name: 'Municipalities', center: [42.375, 21.155], radiusKm: 0.9 },
    { name: 'Kaçanik Road', center: [42.362, 21.141], radiusKm: 1.0 },
  ],
  Mitrovica: [
    { name: 'South Mitrovica', center: [42.883, 20.866], radiusKm: 1.0 },
    { name: 'North Mitrovica', center: [42.893, 20.866], radiusKm: 0.9 },
    { name: 'Bosniak Quarter', center: [42.888, 20.861], radiusKm: 0.7 },
    { name: 'Suhodol', center: [42.878, 20.876], radiusKm: 1.0 },
  ],
  Gjilan: [
    { name: 'Center', center: [42.461, 21.469], radiusKm: 1.0 },
    { name: 'Gjilani i Ri', center: [42.467, 21.476], radiusKm: 0.9 },
    { name: 'Shurdhan', center: [42.455, 21.462], radiusKm: 0.8 },
  ],
  Prishtina: [
    { name: 'Sunny Hill', center: [42.667, 21.158], radiusKm: 1.2 },
    { name: 'Dragodan', center: [42.657, 21.148], radiusKm: 1.0 },
    { name: 'Arberia', center: [42.653, 21.161], radiusKm: 0.9 },
    { name: 'Ulpiana', center: [42.646, 21.164], radiusKm: 1.1 },
    { name: 'City Center', center: [42.662, 21.162], radiusKm: 0.8 },
    { name: 'Dardania', center: [42.644, 21.154], radiusKm: 1.0 },
  ],
  Prizren: [
    { name: 'Old Town', center: [42.215, 20.740], radiusKm: 0.7 },
    { name: 'Marash', center: [42.213, 20.736], radiusKm: 0.8 },
    { name: 'Tusus', center: [42.218, 20.744], radiusKm: 0.8 },
    { name: 'Gërmia', center: [42.210, 20.748], radiusKm: 0.9 },
    { name: 'Ura', center: [42.220, 20.750], radiusKm: 0.8 },
  ],
  Peja: [
    { name: 'Center', center: [42.659, 20.288], radiusKm: 0.9 },
    { name: 'Vitomirica', center: [42.668, 20.303], radiusKm: 1.0 },
    { name: 'Karagaq', center: [42.653, 20.279], radiusKm: 0.9 },
    { name: 'Kapesnica', center: [42.650, 20.295], radiusKm: 0.8 },
  ],

  // ── Albania ──────────────────────────────────────────────────────────────
  Shkoder: [
    { name: 'Center', center: [42.068, 19.513], radiusKm: 1.1 },
    { name: 'Rus', center: [42.075, 19.520], radiusKm: 1.0 },
    { name: 'Bahçallek', center: [42.061, 19.507], radiusKm: 0.9 },
    { name: 'Perash', center: [42.079, 19.515], radiusKm: 1.0 },
  ],
  Fier: [
    { name: 'Center', center: [40.724, 19.556], radiusKm: 1.0 },
    { name: 'Apollonia', center: [40.716, 19.549], radiusKm: 0.9 },
    { name: 'Seman', center: [40.732, 19.563], radiusKm: 1.0 },
  ],
  Berat: [
    { name: 'Mangalem', center: [40.704, 19.950], radiusKm: 0.7 },
    { name: 'Gorica', center: [40.705, 19.954], radiusKm: 0.7 },
    { name: 'Kala', center: [40.708, 19.952], radiusKm: 0.6 },
    { name: 'Center', center: [40.700, 19.947], radiusKm: 0.8 },
  ],
  Elbasan: [
    { name: 'Center', center: [41.112, 20.082], radiusKm: 1.0 },
    { name: 'Qyteti Studenti', center: [41.118, 20.090], radiusKm: 0.9 },
    { name: 'Labinot', center: [41.105, 20.076], radiusKm: 1.1 },
  ],
  Korce: [
    { name: 'Center', center: [40.618, 20.779], radiusKm: 1.0 },
    { name: 'Varoshi', center: [40.622, 20.785], radiusKm: 0.8 },
    { name: 'Drililas', center: [40.613, 20.773], radiusKm: 0.9 },
  ],
  Tirana: [
    { name: 'Blloku', center: [41.325, 19.818], radiusKm: 0.8 },
    { name: 'New Bazaar', center: [41.336, 19.815], radiusKm: 0.9 },
    { name: 'Lake Park', center: [41.337, 19.822], radiusKm: 1.0 },
    { name: 'Kombinat', center: [41.310, 19.816], radiusKm: 1.2 },
    { name: 'Don Bosko', center: [41.321, 19.825], radiusKm: 0.9 },
    { name: 'Fresku', center: [41.342, 19.832], radiusKm: 1.0 },
  ],
  Durres: [
    { name: 'Plazh', center: [41.317, 19.441], radiusKm: 1.1 },
    { name: 'Currila', center: [41.300, 19.424], radiusKm: 1.0 },
    { name: 'Port Area', center: [41.327, 19.436], radiusKm: 0.9 },
    { name: 'Center', center: [41.323, 19.455], radiusKm: 1.0 },
    { name: 'Shkembi i Kavajes', center: [41.283, 19.418], radiusKm: 1.2 },
  ],
  Vlore: [
    { name: 'Center', center: [40.462, 19.483], radiusKm: 1.0 },
    { name: 'Radhima', center: [40.448, 19.470], radiusKm: 0.9 },
    { name: 'Lungomare', center: [40.471, 19.493], radiusKm: 0.8 },
    { name: 'Uji i Ftohte', center: [40.432, 19.453], radiusKm: 1.0 },
  ],
  Sarande: [
    { name: 'Center', center: [39.875, 20.004], radiusKm: 0.9 },
    { name: 'Ksamil', center: [39.773, 20.007], radiusKm: 1.0 },
    { name: 'Lukove', center: [39.941, 19.985], radiusKm: 0.8 },
    { name: 'Porto Palermo', center: [40.035, 19.973], radiusKm: 0.8 },
  ],

  // ── North Macedonia ──────────────────────────────────────────────────────
  Tetovo: [
    { name: 'Center', center: [42.010, 20.971], radiusKm: 1.0 },
    { name: 'Kamenjane', center: [42.018, 20.963], radiusKm: 1.0 },
    { name: 'Zelino', center: [42.002, 20.979], radiusKm: 0.9 },
    { name: 'Gostivar Road', center: [42.015, 20.985], radiusKm: 1.0 },
  ],
  Kumanovo: [
    { name: 'Center', center: [42.132, 21.714], radiusKm: 1.1 },
    { name: 'Prolece', center: [42.138, 21.721], radiusKm: 1.0 },
    { name: 'Stari Grad', center: [42.126, 21.707], radiusKm: 0.9 },
  ],
  Veles: [
    { name: 'Center', center: [41.716, 21.775], radiusKm: 0.9 },
    { name: 'Isar', center: [41.721, 21.781], radiusKm: 0.8 },
    { name: 'Malo Konjari', center: [41.709, 21.768], radiusKm: 0.9 },
  ],
  Strumica: [
    { name: 'Center', center: [41.438, 22.644], radiusKm: 1.0 },
    { name: 'Banica', center: [41.444, 22.651], radiusKm: 0.9 },
    { name: 'Kuklis', center: [41.432, 22.637], radiusKm: 0.9 },
  ],
  Kavadarci: [
    { name: 'Center', center: [41.432, 22.012], radiusKm: 0.9 },
    { name: 'Kavadarci North', center: [41.438, 22.018], radiusKm: 0.8 },
    { name: 'Vatasha', center: [41.426, 22.007], radiusKm: 0.8 },
  ],
  Skopje: [
    { name: 'Centar', center: [41.996, 21.433], radiusKm: 1.2 },
    { name: 'Aerodrom', center: [41.972, 21.447], radiusKm: 1.5 },
    { name: 'Karpos', center: [42.005, 21.398], radiusKm: 1.3 },
    { name: 'Gazi Baba', center: [42.003, 21.472], radiusKm: 1.5 },
    { name: 'Chair', center: [42.010, 21.438], radiusKm: 1.2 },
  ],
  Ohrid: [
    { name: 'Old Town', center: [41.114, 20.797], radiusKm: 0.7 },
    { name: 'Lagadin', center: [41.056, 20.799], radiusKm: 0.8 },
    { name: 'Sveti Stefan', center: [41.100, 20.797], radiusKm: 0.7 },
    { name: 'Kaneo', center: [41.108, 20.793], radiusKm: 0.6 },
  ],
  Bitola: [
    { name: 'Center', center: [41.031, 21.333], radiusKm: 1.0 },
    { name: 'Magnolia', center: [41.036, 21.340], radiusKm: 0.9 },
    { name: 'Bukovo', center: [41.020, 21.348], radiusKm: 1.0 },
  ],

  // ── Serbia ───────────────────────────────────────────────────────────────
  Subotica: [
    { name: 'Center', center: [46.100, 19.667], radiusKm: 1.2 },
    { name: 'Palic', center: [46.098, 19.740], radiusKm: 1.0 },
    { name: 'Aleksandrovo', center: [46.091, 19.659], radiusKm: 1.0 },
    { name: 'Kelebija', center: [46.117, 19.683], radiusKm: 1.0 },
  ],
  Zrenjanin: [
    { name: 'Center', center: [45.383, 20.383], radiusKm: 1.1 },
    { name: 'Bagljas', center: [45.390, 20.390], radiusKm: 1.0 },
    { name: 'Mikicevic', center: [45.376, 20.376], radiusKm: 1.0 },
  ],
  Pancevo: [
    { name: 'Center', center: [44.872, 20.641], radiusKm: 1.0 },
    { name: 'Vojlovica', center: [44.879, 20.648], radiusKm: 1.0 },
    { name: 'Omoljica', center: [44.863, 20.634], radiusKm: 1.0 },
  ],
  Cacak: [
    { name: 'Center', center: [43.891, 20.349], radiusKm: 1.0 },
    { name: 'Ljubic', center: [43.897, 20.356], radiusKm: 0.9 },
    { name: 'Konjevici', center: [43.884, 20.342], radiusKm: 0.9 },
  ],
  Valjevo: [
    { name: 'Center', center: [44.270, 19.886], radiusKm: 1.0 },
    { name: 'Petnica', center: [44.263, 19.879], radiusKm: 0.9 },
    { name: 'Beloševac', center: [44.277, 19.893], radiusKm: 0.9 },
  ],
  Smederevo: [
    { name: 'Center', center: [44.664, 20.928], radiusKm: 1.0 },
    { name: 'Radinac', center: [44.672, 20.935], radiusKm: 0.9 },
    { name: 'Kolari', center: [44.656, 20.921], radiusKm: 0.9 },
  ],
  Belgrade: [
    { name: 'Stari Grad', center: [44.818, 20.461], radiusKm: 1.0 },
    { name: 'Savski Venac', center: [44.800, 20.454], radiusKm: 1.5 },
    { name: 'Vracar', center: [44.792, 20.472], radiusKm: 1.2 },
    { name: 'Novi Beograd', center: [44.817, 20.407], radiusKm: 2.5 },
    { name: 'Zemun', center: [44.842, 20.402], radiusKm: 2.0 },
    { name: 'Palilula', center: [44.828, 20.494], radiusKm: 2.0 },
  ],
  'Novi Sad': [
    { name: 'Centar', center: [45.252, 19.836], radiusKm: 1.2 },
    { name: 'Liman', center: [45.240, 19.844], radiusKm: 1.3 },
    { name: 'Petrovaradin', center: [45.249, 19.869], radiusKm: 1.5 },
    { name: 'Detelinara', center: [45.263, 19.818], radiusKm: 1.2 },
  ],
  Nis: [
    { name: 'Center', center: [43.319, 21.896], radiusKm: 1.1 },
    { name: 'Medijana', center: [43.316, 21.917], radiusKm: 1.2 },
    { name: 'Palilula', center: [43.328, 21.910], radiusKm: 1.3 },
    { name: 'Bubanj', center: [43.300, 21.905], radiusKm: 1.0 },
  ],
  Kragujevac: [
    { name: 'Center', center: [44.014, 20.924], radiusKm: 1.0 },
    { name: 'Aerodrom', center: [44.020, 20.938], radiusKm: 1.1 },
    { name: 'Stanovo', center: [44.005, 20.915], radiusKm: 1.0 },
  ],

  // ── Bosnia and Herzegovina ────────────────────────────────────────────────
  Tuzla: [
    { name: 'Center', center: [44.538, 18.676], radiusKm: 1.1 },
    { name: 'Stupine', center: [44.544, 18.683], radiusKm: 1.0 },
    { name: 'Lamela', center: [44.531, 18.669], radiusKm: 0.9 },
    { name: 'Slatina', center: [44.548, 18.691], radiusKm: 1.0 },
  ],
  Zenica: [
    { name: 'Center', center: [44.202, 17.908], radiusKm: 1.1 },
    { name: 'Radakovo', center: [44.209, 17.915], radiusKm: 1.0 },
    { name: 'Crkvice', center: [44.195, 17.901], radiusKm: 0.9 },
  ],
  Trebinje: [
    { name: 'Center', center: [42.711, 18.344], radiusKm: 0.9 },
    { name: 'Luka', center: [42.717, 18.351], radiusKm: 0.8 },
    { name: 'Zasad', center: [42.705, 18.337], radiusKm: 0.8 },
  ],
  Bijeljina: [
    { name: 'Center', center: [44.756, 19.214], radiusKm: 1.0 },
    { name: 'Amajlije', center: [44.762, 19.221], radiusKm: 0.9 },
    { name: 'Patkovaca', center: [44.749, 19.207], radiusKm: 0.9 },
  ],
  Brcko: [
    { name: 'Center', center: [44.872, 18.810], radiusKm: 0.9 },
    { name: 'Brcko District', center: [44.878, 18.817], radiusKm: 0.9 },
    { name: 'Arizona', center: [44.865, 18.803], radiusKm: 0.8 },
  ],
  Sarajevo: [
    { name: 'Bascarsija', center: [43.860, 18.434], radiusKm: 0.8 },
    { name: 'Marijin Dvor', center: [43.851, 18.408], radiusKm: 1.0 },
    { name: 'Grbavica', center: [43.848, 18.397], radiusKm: 1.0 },
    { name: 'Novo Sarajevo', center: [43.843, 18.420], radiusKm: 1.2 },
    { name: 'Ilidza', center: [43.831, 18.310], radiusKm: 1.5 },
  ],
  'Banja Luka': [
    { name: 'Center', center: [44.775, 17.191], radiusKm: 1.0 },
    { name: 'Borik', center: [44.784, 17.183], radiusKm: 1.2 },
    { name: 'Mejdan', center: [44.770, 17.203], radiusKm: 1.0 },
    { name: 'Lazarevo', center: [44.782, 17.215], radiusKm: 1.1 },
  ],
  Mostar: [
    { name: 'Old Town', center: [43.337, 17.815], radiusKm: 0.7 },
    { name: 'Spanish Square', center: [43.341, 17.810], radiusKm: 0.8 },
    { name: 'Rondo', center: [43.350, 17.800], radiusKm: 0.9 },
    { name: 'East Mostar', center: [43.343, 17.822], radiusKm: 0.8 },
  ],

  // ── Croatia ───────────────────────────────────────────────────────────────
  Osijek: [
    { name: 'Center', center: [45.555, 18.695], radiusKm: 1.2 },
    { name: 'Gornji Grad', center: [45.561, 18.702], radiusKm: 1.0 },
    { name: 'Retfala', center: [45.548, 18.688], radiusKm: 1.0 },
    { name: 'Donji Grad', center: [45.564, 18.710], radiusKm: 1.0 },
  ],
  Zadar: [
    { name: 'Old Town', center: [44.115, 15.224], radiusKm: 0.6 },
    { name: 'Borik', center: [44.124, 15.216], radiusKm: 1.2 },
    { name: 'Bili Brig', center: [44.108, 15.232], radiusKm: 0.9 },
    { name: 'Puntamika', center: [44.131, 15.209], radiusKm: 1.0 },
  ],
  Pula: [
    { name: 'Old Town', center: [44.868, 13.847], radiusKm: 0.7 },
    { name: 'Veruda', center: [44.857, 13.854], radiusKm: 0.9 },
    { name: 'Vidikovac', center: [44.876, 13.854], radiusKm: 0.9 },
    { name: 'Veli Vrh', center: [44.880, 13.840], radiusKm: 0.9 },
  ],
  Sibenik: [
    { name: 'Old Town', center: [43.735, 15.893], radiusKm: 0.7 },
    { name: 'Crnica', center: [43.728, 15.900], radiusKm: 0.9 },
    { name: 'Vidici', center: [43.741, 15.906], radiusKm: 0.8 },
  ],
  Varazdin: [
    { name: 'Center', center: [46.305, 16.337], radiusKm: 1.0 },
    { name: 'Biškupec', center: [46.311, 16.344], radiusKm: 0.9 },
    { name: 'Jalkovec', center: [46.298, 16.330], radiusKm: 0.9 },
  ],
  'Slavonski Brod': [
    { name: 'Center', center: [45.160, 18.015], radiusKm: 1.0 },
    { name: 'Brodsko Brdo', center: [45.167, 18.022], radiusKm: 0.9 },
    { name: 'Korija', center: [45.153, 18.008], radiusKm: 0.9 },
  ],
  Zagreb: [
    { name: 'Centar', center: [45.815, 15.982], radiusKm: 1.2 },
    { name: 'Novi Zagreb', center: [45.783, 16.008], radiusKm: 2.0 },
    { name: 'Dubrava', center: [45.838, 16.048], radiusKm: 1.8 },
    { name: 'Maksimir', center: [45.829, 16.013], radiusKm: 1.5 },
    { name: 'Medveščak', center: [45.819, 15.973], radiusKm: 1.0 },
  ],
  Split: [
    { name: 'Diocletian Palace', center: [43.508, 16.440], radiusKm: 0.6 },
    { name: 'Bacvice', center: [43.503, 16.448], radiusKm: 0.8 },
    { name: 'Meje', center: [43.508, 16.430], radiusKm: 0.9 },
    { name: 'Trstenik', center: [43.498, 16.464], radiusKm: 1.0 },
    { name: 'Spinut', center: [43.514, 16.440], radiusKm: 0.9 },
  ],
  Dubrovnik: [
    { name: 'Old Town', center: [42.641, 18.108], radiusKm: 0.5 },
    { name: 'Lapad', center: [42.651, 18.067], radiusKm: 1.0 },
    { name: 'Pile', center: [42.641, 18.097], radiusKm: 0.6 },
    { name: 'Gruz', center: [42.657, 18.075], radiusKm: 0.8 },
    { name: 'Ploce', center: [42.644, 18.120], radiusKm: 0.7 },
  ],
  Rijeka: [
    { name: 'Center', center: [45.328, 14.442], radiusKm: 1.0 },
    { name: 'Trsat', center: [45.333, 14.453], radiusKm: 0.9 },
    { name: 'Pehlin', center: [45.340, 14.460], radiusKm: 1.0 },
    { name: 'Susak', center: [45.325, 14.454], radiusKm: 0.8 },
  ],

  // ── Montenegro ────────────────────────────────────────────────────────────
  Niksic: [
    { name: 'Center', center: [42.774, 18.944], radiusKm: 1.2 },
    { name: 'Gornja Varos', center: [42.780, 18.951], radiusKm: 1.0 },
    { name: 'Mioce', center: [42.767, 18.937], radiusKm: 1.0 },
    { name: 'Spuz', center: [42.782, 19.094], radiusKm: 1.0 },
  ],
  'Herceg Novi': [
    { name: 'Old Town', center: [42.452, 18.537], radiusKm: 0.6 },
    { name: 'Igalo', center: [42.453, 18.521], radiusKm: 0.9 },
    { name: 'Njivice', center: [42.460, 18.544], radiusKm: 0.8 },
    { name: 'Topla', center: [42.447, 18.549], radiusKm: 0.8 },
  ],
  Bar: [
    { name: 'Old Town', center: [42.096, 19.101], radiusKm: 0.7 },
    { name: 'Port Area', center: [42.098, 19.092], radiusKm: 0.8 },
    { name: 'Sutomore', center: [42.050, 19.028], radiusKm: 0.9 },
    { name: 'Susanj', center: [42.085, 19.100], radiusKm: 0.8 },
  ],
  Ulcinj: [
    { name: 'Old Town', center: [41.922, 19.217], radiusKm: 0.6 },
    { name: 'Velika Plaza', center: [41.896, 19.238], radiusKm: 1.2 },
    { name: 'Ada', center: [41.877, 19.349], radiusKm: 0.9 },
    { name: 'New Town', center: [41.926, 19.224], radiusKm: 0.8 },
  ],
  Tivat: [
    { name: 'Center', center: [42.434, 18.697], radiusKm: 0.9 },
    { name: 'Porto Montenegro', center: [42.430, 18.693], radiusKm: 0.7 },
    { name: 'Donja Lastva', center: [42.440, 18.703], radiusKm: 0.8 },
  ],
  Podgorica: [
    { name: 'Center', center: [42.441, 19.263], radiusKm: 1.0 },
    { name: 'Nova Varos', center: [42.445, 19.271], radiusKm: 1.1 },
    { name: 'Stara Varos', center: [42.440, 19.257], radiusKm: 0.9 },
    { name: 'Blok 5', center: [42.450, 19.278], radiusKm: 1.2 },
    { name: 'Zabjelo', center: [42.460, 19.278], radiusKm: 1.3 },
  ],
  Budva: [
    { name: 'Old Town', center: [42.288, 18.838], radiusKm: 0.5 },
    { name: 'Becici', center: [42.273, 18.875], radiusKm: 1.0 },
    { name: 'Sveti Stefan', center: [42.254, 18.890], radiusKm: 0.8 },
    { name: 'Petrovac', center: [42.208, 18.939], radiusKm: 1.0 },
    { name: 'Rozino', center: [42.299, 18.824], radiusKm: 0.8 },
  ],
  Kotor: [
    { name: 'Old Town', center: [42.424, 18.771], radiusKm: 0.5 },
    { name: 'Dobrota', center: [42.445, 18.763], radiusKm: 1.0 },
    { name: 'Prcanj', center: [42.432, 18.741], radiusKm: 0.8 },
    { name: 'Muo', center: [42.417, 18.757], radiusKm: 0.7 },
  ],

  // ── Greece ────────────────────────────────────────────────────────────────
  Athens: [
    { name: 'Plaka', center: [37.974, 23.727], radiusKm: 0.7 },
    { name: 'Kolonaki', center: [37.978, 23.745], radiusKm: 0.8 },
    { name: 'Glyfada', center: [37.868, 23.752], radiusKm: 1.5 },
    { name: 'Kifisia', center: [38.074, 23.814], radiusKm: 1.5 },
    { name: 'Piraeus', center: [37.943, 23.647], radiusKm: 1.8 },
    { name: 'Marousi', center: [38.047, 23.802], radiusKm: 1.5 },
  ],
  Thessaloniki: [
    { name: 'Center', center: [40.636, 22.934], radiusKm: 1.2 },
    { name: 'Kalamaria', center: [40.587, 22.954], radiusKm: 1.5 },
    { name: 'Nea Krini', center: [40.575, 22.949], radiusKm: 1.2 },
    { name: 'Toumba', center: [40.618, 22.958], radiusKm: 1.2 },
    { name: 'Neapoli', center: [40.651, 22.934], radiusKm: 1.0 },
  ],
  Patras: [
    { name: 'Center', center: [38.246, 21.735], radiusKm: 1.2 },
    { name: 'Rio', center: [38.305, 21.783], radiusKm: 1.3 },
    { name: 'Psila Alonia', center: [38.250, 21.742], radiusKm: 0.9 },
    { name: 'Agyia', center: [38.261, 21.756], radiusKm: 1.0 },
  ],
  Heraklion: [
    { name: 'Old Town', center: [35.340, 25.134], radiusKm: 0.8 },
    { name: 'Nea Alikarnassos', center: [35.327, 25.163], radiusKm: 1.2 },
    { name: 'Agia Marina', center: [35.356, 25.090], radiusKm: 1.0 },
    { name: 'Patsideros', center: [35.334, 25.148], radiusKm: 0.9 },
  ],

  // ── Bulgaria ──────────────────────────────────────────────────────────────
  Sofia: [
    { name: 'Center', center: [42.698, 23.322], radiusKm: 1.0 },
    { name: 'Lozenets', center: [42.671, 23.337], radiusKm: 1.5 },
    { name: 'Studentski Grad', center: [42.651, 23.350], radiusKm: 1.5 },
    { name: 'Mladost', center: [42.651, 23.379], radiusKm: 2.0 },
    { name: 'Lyulin', center: [42.703, 23.259], radiusKm: 2.0 },
    { name: 'Vitosha', center: [42.641, 23.310], radiusKm: 1.5 },
  ],
  Plovdiv: [
    { name: 'Old Town', center: [42.150, 24.748], radiusKm: 0.7 },
    { name: 'Kapana', center: [42.143, 24.748], radiusKm: 0.6 },
    { name: 'Trakia', center: [42.128, 24.772], radiusKm: 1.5 },
    { name: 'Karchiyaka', center: [42.150, 24.730], radiusKm: 1.2 },
    { name: 'Hristo Smirnenski', center: [42.138, 24.742], radiusKm: 1.0 },
  ],
  Varna: [
    { name: 'Center', center: [43.213, 27.916], radiusKm: 1.0 },
    { name: 'Sea Garden', center: [43.202, 27.915], radiusKm: 0.9 },
    { name: 'Asparuhovo', center: [43.189, 27.895], radiusKm: 1.5 },
    { name: 'Vinitsa', center: [43.243, 27.899], radiusKm: 1.5 },
    { name: 'Chaika', center: [43.225, 27.963], radiusKm: 1.3 },
  ],
  Burgas: [
    { name: 'Center', center: [42.508, 27.463], radiusKm: 1.0 },
    { name: 'Lazur', center: [42.518, 27.468], radiusKm: 1.0 },
    { name: 'Sea Garden', center: [42.490, 27.480], radiusKm: 0.9 },
    { name: 'Bratya Miladinovi', center: [42.503, 27.453], radiusKm: 1.0 },
    { name: 'Meden Rudnik', center: [42.490, 27.440], radiusKm: 1.2 },
  ],

  // ── Romania ───────────────────────────────────────────────────────────────
  Bucharest: [
    { name: 'Old Town', center: [44.432, 26.104], radiusKm: 0.8 },
    { name: 'Dorobanti', center: [44.458, 26.083], radiusKm: 1.2 },
    { name: 'Herastrau', center: [44.468, 26.083], radiusKm: 1.5 },
    { name: 'Floreasca', center: [44.464, 26.096], radiusKm: 1.2 },
    { name: 'Titan', center: [44.415, 26.153], radiusKm: 1.8 },
    { name: 'Drumul Taberei', center: [44.421, 26.035], radiusKm: 1.8 },
  ],
  'Cluj-Napoca': [
    { name: 'Center', center: [46.769, 23.590], radiusKm: 1.0 },
    { name: 'Marasti', center: [46.783, 23.578], radiusKm: 1.2 },
    { name: 'Gheorgheni', center: [46.755, 23.605], radiusKm: 1.2 },
    { name: 'Grigorescu', center: [46.763, 23.609], radiusKm: 1.0 },
    { name: 'Manastur', center: [46.775, 23.557], radiusKm: 1.5 },
  ],
  Timisoara: [
    { name: 'Center', center: [45.748, 21.209], radiusKm: 1.0 },
    { name: 'Fabric', center: [45.756, 21.224], radiusKm: 1.2 },
    { name: 'Iosefin', center: [45.743, 21.200], radiusKm: 1.0 },
    { name: 'Complexul Studentesc', center: [45.738, 21.237], radiusKm: 1.3 },
    { name: 'Ronat', center: [45.763, 21.197], radiusKm: 1.2 },
  ],
  Brasov: [
    { name: 'Historic Center', center: [45.643, 25.588], radiusKm: 0.8 },
    { name: 'Schei', center: [45.635, 25.580], radiusKm: 1.0 },
    { name: 'Tractorul', center: [45.659, 25.619], radiusKm: 1.5 },
    { name: 'Noua', center: [45.654, 25.570], radiusKm: 1.2 },
    { name: 'Bartolomeu', center: [45.665, 25.558], radiusKm: 1.3 },
  ],
};

/**
 * Maps city name to ISO 3166-1 alpha-2 country code.
 */
export const CITY_COUNTRY_MAP: Record<string, string> = {
  // Kosovo
  Prishtina: 'XK',
  Prizren: 'XK',
  Peja: 'XK',

  // Albania
  Tirana: 'AL',
  Durres: 'AL',
  Vlore: 'AL',
  Sarande: 'AL',

  // North Macedonia
  Skopje: 'MK',
  Ohrid: 'MK',
  Bitola: 'MK',

  // Serbia
  Belgrade: 'RS',
  'Novi Sad': 'RS',
  Nis: 'RS',
  Kragujevac: 'RS',

  // Bosnia and Herzegovina
  Sarajevo: 'BA',
  'Banja Luka': 'BA',
  Mostar: 'BA',

  // Croatia
  Zagreb: 'HR',
  Split: 'HR',
  Dubrovnik: 'HR',
  Rijeka: 'HR',

  // Montenegro
  Podgorica: 'ME',
  Budva: 'ME',
  Kotor: 'ME',

  // Greece
  Athens: 'GR',
  Thessaloniki: 'GR',
  Patras: 'GR',
  Heraklion: 'GR',

  // Bulgaria
  Sofia: 'BG',
  Plovdiv: 'BG',
  Varna: 'BG',
  Burgas: 'BG',

  // Romania
  Bucharest: 'RO',
  'Cluj-Napoca': 'RO',
  Timisoara: 'RO',
  Brasov: 'RO',
};
