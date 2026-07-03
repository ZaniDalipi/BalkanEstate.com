/**
 * Native-language, high-intent SEO/GEO landing pages for BalkanEstateAI.
 *
 * Each entry targets the highest-volume buying/renting queries in a country's
 * primary language, so AI answer engines and search engines can surface a
 * native-language page for native-language questions (e.g. "Sa kushton një
 * apartament në Tiranë?", "Колку чини стан во Скопје?").
 *
 * The prerenderer (scripts/prerender.mjs) consumes this file:
 *   - `path` must use query params the SPA already routes (country/city), so the
 *     React app renders a real page when a user lands there.
 *   - `en` provides the English fallback used for the default-language file and
 *     all non-primary language variants (hreflang scaffolding).
 *   - `loc` provides native title/description/h1/faqs for the country's primary
 *     language only.
 *
 * SCALING: adding more cities/intents is just adding rows here — no code change.
 * Native strings below are written to be grammatically correct; any additions in
 * a new language/city should be reviewed by a native speaker before shipping,
 * since incorrect grammar hurts credibility with both users and AI engines.
 */

export const LANDING_PAGES = [
  // ─── Albania (sq) — Tirana ──────────────────────────────────────────────────
  {
    path: '/search?country=Albania&city=Tirana',
    en: {
      title: 'Apartments for Sale in Tirana - Property in Albania',
      description: 'Find apartments for sale in Tirana, Albania. New builds, 1+1 and 2+1 flats, and investment property in the city center. AI-powered search.',
    },
    loc: {
      sq: {
        title: 'Apartamente në shitje në Tiranë — Prona në Shqipëri',
        h1: 'Apartamente në shitje në Tiranë',
        description: 'Gjeni apartamente në shitje në Tiranë. Apartamente 1+1, 2+1 dhe 3+1, prona të reja dhe investime në qendër të Tiranës. Kërkim me inteligjencë artificiale dhe çmime aktuale.',
        faqs: [
          { q: 'Sa kushton një apartament në Tiranë?', a: 'Çmimet në Tiranë zakonisht fillojnë nga rreth €800–1,200/m², në varësi të lagjes dhe gjendjes së pronës. Përdorni vlerësimin falas me AI të BalkanEstateAI për çmimin aktual.' },
          { q: 'Cilat janë lagjet më të mira në Tiranë?', a: 'Lagjet e kërkuara përfshijnë Bllokun, Qendrën, Liqenin Artificial dhe Komunën e Parisit. Shfletoni listimet sipas lagjes në BalkanEstateAI.' },
          { q: 'A ia vlen të blesh apartament në Shqipëri?', a: 'Shqipëria ofron çmime të ulëta dhe qira atraktive (5–9% në bregdet), duke e bërë tërheqëse për investim. Krahasoni tregjet me BalkanEstateAI.' },
          { q: 'Si të blej apartament me kredi?', a: 'Bankat shqiptare ofrojnë kredi hipotekare për rezidentë dhe diasporën. Përdorni llogaritësin e kredisë në BalkanEstateAI për të vlerësuar këstet.' },
        ],
      },
    },
  },
  {
    path: '/rentals?country=Albania&city=Tirana',
    en: {
      title: 'Apartments for Rent in Tirana, Albania',
      description: 'Find apartments for rent in Tirana. Studios, garsoniere, and short- and long-term rentals across the city. Contact owners directly, no commission.',
    },
    loc: {
      sq: {
        title: 'Apartamente me qira në Tiranë',
        h1: 'Apartamente me qira në Tiranë',
        description: 'Gjeni apartamente me qira në Tiranë. Garsoniere, studio dhe apartamente afatshkurtra e afatgjata. Kontakto pa komision.',
        faqs: [
          { q: 'Sa kushton qiraja e një apartamenti në Tiranë?', a: 'Qiraja në Tiranë ndryshon sipas lagjes dhe madhësisë; një garsoniere fillon nga rreth €250–400/muaj. Shfletoni listimet aktuale në BalkanEstateAI.' },
          { q: 'Si të gjej apartament me qira për studentë?', a: 'Filtroni listimet sipas çmimit dhe lagjes pranë universiteteve dhe kontaktoni pronarët drejtpërdrejt në BalkanEstateAI.' },
        ],
      },
    },
  },

  // ─── Kosovo (sq) — Pristina ─────────────────────────────────────────────────
  {
    path: '/search?country=Kosovo&city=Pristina',
    en: {
      title: 'Apartments for Sale in Pristina - Property in Kosovo',
      description: 'Find apartments and houses for sale in Pristina, Kosovo. New builds, 1+1 and 2+1 flats, land, and commercial units. AI-powered search.',
    },
    loc: {
      sq: {
        title: 'Banesa në shitje në Prishtinë — Prona në Kosovë',
        h1: 'Banesa në shitje në Prishtinë',
        description: 'Gjeni banesa në shitje në Prishtinë. Banesa të reja, 1+1 dhe 2+1, shtëpi, tokë dhe lokale në Prishtinë e Fushë Kosovë. Kërkim me inteligjencë artificiale.',
        faqs: [
          { q: 'Sa kushton një banesë në Prishtinë?', a: 'Çmimet në Prishtinë zakonisht fillojnë nga rreth €700–1,200/m², varësisht nga lagjja. Përdorni vlerësimin falas me AI të BalkanEstateAI.' },
          { q: 'Ku është më mirë të jetosh në Prishtinë?', a: 'Lagjet e kërkuara përfshijnë Qendrën, Dragodanin, Ulpianën dhe Bregun e Diellit. Shfletoni listimet sipas lagjes.' },
          { q: 'A mund të blejnë diaspora prona në Kosovë?', a: 'Po, diaspora mund të blejë prona në Kosovë. BalkanEstateAI ju lidh me agjentë me përvojë në blerjet nga diaspora.' },
          { q: 'Si bëhet kontrata e shitjes?', a: 'Kontrata e shitjes noterizohet te noteri dhe regjistrohet në kadastër. Agjentët në BalkanEstateAI ju udhëzojnë në çdo hap.' },
        ],
      },
    },
  },
  {
    path: '/rentals?country=Kosovo&city=Pristina',
    en: {
      title: 'Apartments for Rent in Pristina, Kosovo',
      description: 'Find apartments and houses for rent in Pristina and Fushë Kosovë. Flats, houses, and commercial units. Contact directly, no commission.',
    },
    loc: {
      sq: {
        title: 'Banesa me qira në Prishtinë',
        h1: 'Banesa me qira në Prishtinë',
        description: 'Gjeni banesa me qira në Prishtinë dhe Fushë Kosovë. Banesa, shtëpi dhe lokale me qira. Kontakto pa komision.',
        faqs: [
          { q: 'Sa kushton një banesë me qira në Prishtinë?', a: 'Qiraja në Prishtinë fillon nga rreth €250–450/muaj për një banesë 1+1, varësisht nga lagjja. Shfletoni listimet aktuale në BalkanEstateAI.' },
        ],
      },
    },
  },

  // ─── North Macedonia (mk) — Skopje ──────────────────────────────────────────
  {
    path: '/search?country=North+Macedonia&city=Skopje',
    en: {
      title: 'Apartments for Sale in Skopje - Property in North Macedonia',
      description: 'Find apartments and houses for sale in Skopje. New builds, flats in the center, and land. Affordable prices, AI-powered search.',
    },
    loc: {
      mk: {
        title: 'Станови на продажба во Скопје — Недвижности Македонија',
        h1: 'Станови на продажба во Скопје',
        description: 'Најдете станови на продажба во Скопје. Нови станови, гарсоњери и куќи во Центар и пошироко. Пребарување со вештачка интелигенција.',
        faqs: [
          { q: 'Колку чини стан во Скопје?', a: 'Цените во Скопје обично почнуваат од околу €600–1.000/м², во зависност од населбата. Користете ја бесплатната AI проценка на BalkanEstateAI.' },
          { q: 'Каде да купам стан во Скопје?', a: 'Барани населби се Центар, Дебар Маало, Аеродром и Карпош. Разгледајте огласи по населба.' },
          { q: 'Дали вреди да се инвестира во недвижности?', a: 'Скопје нуди ниски цени и стабилен пазар, што е привлечно за инвеститори. Споредете пазари на BalkanEstateAI.' },
          { q: 'Како се купува стан?', a: 'Договорот се заверува кај нотар и се запишува во катастар. Агентите на BalkanEstateAI ве водат низ процесот.' },
        ],
      },
    },
  },
  {
    path: '/rentals?country=North+Macedonia&city=Skopje',
    en: {
      title: 'Apartments for Rent in Skopje, North Macedonia',
      description: 'Find apartments for rent in Skopje. Studios, flats, and commercial space across the city. Contact directly, no commission.',
    },
    loc: {
      mk: {
        title: 'Станови за изнајмување во Скопје',
        h1: 'Станови за изнајмување во Скопје',
        description: 'Најдете станови за изнајмување во Скопје. Гарсоњери, станови и деловен простор. Контактирајте без провизија.',
        faqs: [
          { q: 'Колку чини изнајмување на стан во Скопје?', a: 'Киријата во Скопје почнува од околу €200–350/месец за гарсоњера, во зависност од населбата. Разгледајте ги тековните огласи на BalkanEstateAI.' },
        ],
      },
    },
  },

  // ─── Serbia (sr) — Belgrade ─────────────────────────────────────────────────
  {
    path: '/search?country=Serbia&city=Belgrade',
    en: {
      title: 'Apartments for Sale in Belgrade - Property in Serbia',
      description: 'Find apartments and houses for sale in Belgrade. New builds, city-center flats, land, and luxury apartments. AI-powered search.',
    },
    loc: {
      sr: {
        title: 'Stanovi na prodaju u Beogradu — Nekretnine Srbija',
        h1: 'Stanovi na prodaju u Beogradu',
        description: 'Pronađite stanove na prodaju u Beogradu. Novogradnja, jednosobni i dvosobni stanovi, kuće i placevi. Pretraga uz veštačku inteligenciju.',
        faqs: [
          { q: 'Koliko košta stan u Beogradu?', a: 'Cene u Beogradu obično počinju od oko €1.500–2.500/m², u zavisnosti od dela grada. Koristite besplatnu AI procenu na BalkanEstateAI.' },
          { q: 'Koji je najbolji deo Beograda za kupovinu?', a: 'Tražene lokacije su Vračar, Stari grad, Novi Beograd i Dorćol. Pregledajte oglase po delu grada.' },
          { q: 'Kako kupiti stan?', a: 'Ugovor se overava kod javnog beležnika i upisuje u katastar. Agenti na BalkanEstateAI vas vode kroz svaki korak.' },
          { q: 'Kako do kredita za stan u Srbiji?', a: 'Banke u Srbiji nude stambene kredite za rezidente i dijasporu. Koristite kalkulator kredita na BalkanEstateAI da procenite ratu.' },
        ],
      },
    },
  },
  {
    path: '/rentals?country=Serbia&city=Belgrade',
    en: {
      title: 'Apartments for Rent in Belgrade, Serbia',
      description: 'Find apartments for rent in Belgrade. Studios, flats, and commercial space across the city. Contact directly, no commission.',
    },
    loc: {
      sr: {
        title: 'Stanovi za izdavanje u Beogradu',
        h1: 'Stanovi za izdavanje u Beogradu',
        description: 'Pronađite stanove za izdavanje u Beogradu. Garsonjere, stanovi i poslovni prostor. Kontakt bez provizije.',
        faqs: [
          { q: 'Koliko košta najam stana u Beogradu?', a: 'Najam u Beogradu počinje od oko €300–500 mesečno za garsonjeru, u zavisnosti od dela grada. Pregledajte aktuelne oglase na BalkanEstateAI.' },
        ],
      },
    },
  },

  // ─── Montenegro (me) — Budva ────────────────────────────────────────────────
  {
    path: '/search?country=Montenegro&city=Budva',
    en: {
      title: 'Apartments for Sale in Budva - Montenegro Coastal Property',
      description: 'Find apartments for sale in Budva, Montenegro. Sea-view apartments, luxury residences, and new builds on the Budva Riviera. AI-powered search.',
    },
    loc: {
      me: {
        title: 'Stanovi i apartmani na prodaju u Budvi — Nekretnine Crna Gora',
        h1: 'Stanovi i apartmani na prodaju u Budvi',
        description: 'Pronađite stanove i apartmane na prodaju u Budvi. Nekretnine uz more, luksuzni stanovi i novogradnja na Budvanskoj rivijeri.',
        faqs: [
          { q: 'Koliko košta apartman na moru u Budvi?', a: 'Cene uz more u Budvi obično se kreću od oko €2.000–3.500/m², zavisno od lokacije. Koristite besplatnu AI procenu na BalkanEstateAI.' },
          { q: 'Gdje kupiti stan u Crnoj Gori?', a: 'Tražene lokacije su Budva, Kotor, Tivat i Porto Montenegro. Pregledajte oglase po gradu.' },
          { q: 'Isplati li se investicija u nekretnine u Crnoj Gori?', a: 'Crnogorsko primorje nudi prinose od izdavanja od 5–8% godišnje, a vlasništvo nad nekretninom omogućava i privremeni boravak.' },
        ],
      },
    },
  },
  {
    path: '/rentals?country=Montenegro&city=Budva',
    en: {
      title: 'Apartments for Rent in Budva, Montenegro',
      description: 'Find apartments for rent in Budva. Sea-view rentals, long-term and short-term apartments on the coast. Contact directly, no commission.',
    },
    loc: {
      me: {
        title: 'Apartmani za izdavanje u Budvi',
        h1: 'Apartmani za izdavanje u Budvi',
        description: 'Pronađite apartmane za izdavanje u Budvi. Smeštaj uz more, dugoročni i kratkoročni najam.',
        faqs: [
          { q: 'Koliko košta najam apartmana u Budvi?', a: 'Najam u Budvi zavisi od sezone i blizine mora; dugoročni najam počinje od oko €400–700 mesečno. Pregledajte aktuelne oglase na BalkanEstateAI.' },
        ],
      },
    },
  },

  // ─── Croatia (hr) — Zagreb ──────────────────────────────────────────────────
  {
    path: '/search?country=Croatia&city=Zagreb',
    en: {
      title: 'Apartments for Sale in Zagreb - Property in Croatia',
      description: 'Find apartments and houses for sale in Zagreb. New builds, city flats, land, and luxury apartments. AI-powered search.',
    },
    loc: {
      hr: {
        title: 'Stanovi na prodaju u Zagrebu — Nekretnine Hrvatska',
        h1: 'Stanovi na prodaju u Zagrebu',
        description: 'Pronađite stanove na prodaju u Zagrebu. Novogradnja, jednosobni i dvosobni stanovi, kuće i zemljište. Pretraga uz umjetnu inteligenciju.',
        faqs: [
          { q: 'Koliko košta stan u Zagrebu?', a: 'Cijene u Zagrebu obično počinju od oko €2.000–3.000/m², ovisno o lokaciji. Koristite besplatnu AI procjenu na BalkanEstateAI.' },
          { q: 'Gdje kupiti apartman na moru?', a: 'Tražene lokacije uz more su Split, Zadar, Dubrovnik i Istra. Pregledajte oglase po gradu.' },
          { q: 'Isplati li se kupiti stan?', a: 'Hrvatska obala nudi snažan najam tijekom turističke sezone, što je privlačno za ulaganje. Usporedite tržišta na BalkanEstateAI.' },
        ],
      },
    },
  },
  {
    path: '/rentals?country=Croatia&city=Zagreb',
    en: {
      title: 'Apartments for Rent in Zagreb, Croatia',
      description: 'Find apartments for rent in Zagreb. Studios, flats, and apartments across the city. Contact directly, no commission.',
    },
    loc: {
      hr: {
        title: 'Stanovi za najam u Zagrebu',
        h1: 'Stanovi za najam u Zagrebu',
        description: 'Pronađite stanove za najam u Zagrebu. Garsonijere, stanovi i apartmani. Kontakt bez provizije.',
        faqs: [
          { q: 'Koliko košta najam stana u Zagrebu?', a: 'Najam u Zagrebu počinje od oko €350–600 mjesečno za garsonijeru, ovisno o lokaciji. Pregledajte aktualne oglase na BalkanEstateAI.' },
        ],
      },
    },
  },

  // ─── Bosnia and Herzegovina (bs) — Sarajevo ─────────────────────────────────
  {
    path: '/search?country=Bosnia&city=Sarajevo',
    en: {
      title: 'Apartments for Sale in Sarajevo - Property in Bosnia',
      description: 'Find apartments and houses for sale in Sarajevo. New builds, flats, houses, and weekend homes. AI-powered search.',
    },
    loc: {
      bs: {
        title: 'Stanovi na prodaju u Sarajevu — Nekretnine BiH',
        h1: 'Stanovi na prodaju u Sarajevu',
        description: 'Pronađite stanove na prodaju u Sarajevu. Novogradnja, stanovi, kuće i vikendice. Pretraga uz vještačku inteligenciju.',
        faqs: [
          { q: 'Koliko košta stan u Sarajevu?', a: 'Cijene u Sarajevu obično počinju od oko €1.000–1.800/m², ovisno o lokaciji. Koristite besplatnu AI procjenu na BalkanEstateAI.' },
          { q: 'Gdje kupiti stan u Sarajevu?', a: 'Tražene lokacije su Centar, Novo Sarajevo, Ilidža i Stari Grad. Pregledajte oglase po dijelu grada.' },
          { q: 'Kako kupiti nekretninu?', a: 'Ugovor se ovjerava kod notara i upisuje u zemljišne knjige. Agenti na BalkanEstateAI vas vode kroz svaki korak.' },
        ],
      },
    },
  },
  {
    path: '/rentals?country=Bosnia&city=Sarajevo',
    en: {
      title: 'Apartments for Rent in Sarajevo, Bosnia',
      description: 'Find apartments and houses for rent in Sarajevo. Studios, flats, and houses across the city. Contact directly, no commission.',
    },
    loc: {
      bs: {
        title: 'Stanovi za iznajmljivanje u Sarajevu',
        h1: 'Stanovi za iznajmljivanje u Sarajevu',
        description: 'Pronađite stanove za iznajmljivanje u Sarajevu. Garsonjere, stanovi i kuće. Kontakt bez provizije.',
        faqs: [
          { q: 'Koliko košta najam stana u Sarajevu?', a: 'Najam u Sarajevu počinje od oko €250–450 mjesečno za garsonjeru, ovisno o lokaciji. Pregledajte aktualne oglase na BalkanEstateAI.' },
        ],
      },
    },
  },

  // ─── Bulgaria (bg) — Sofia ──────────────────────────────────────────────────
  {
    path: '/search?country=Bulgaria&city=Sofia',
    en: {
      title: 'Apartments for Sale in Sofia - Property in Bulgaria',
      description: 'Find apartments and houses for sale in Sofia. New builds, flats, houses, and plots. AI-powered search.',
    },
    loc: {
      bg: {
        title: 'Апартаменти за продажба в София — Имоти България',
        h1: 'Апартаменти за продажба в София',
        description: 'Намерете апартаменти за продажба в София. Ново строителство, едностайни и двустайни апартаменти, къщи и парцели. Търсене с изкуствен интелект.',
        faqs: [
          { q: 'Колко струва апартамент в София?', a: 'Цените в София обикновено започват от около €1.000–1.800/м², в зависимост от квартала. Използвайте безплатната AI оценка на BalkanEstateAI.' },
          { q: 'Кои са най-добрите квартали в София?', a: 'Търсени квартали са Център, Лозенец, Витоша и Младост. Разгледайте обявите по квартал.' },
          { q: 'Изгодно ли е да се купи имот в София?', a: 'София предлага стабилен пазар и атрактивни цени, което я прави привлекателна за инвестиция. Сравнете пазарите на BalkanEstateAI.' },
        ],
      },
    },
  },
  {
    path: '/rentals?country=Bulgaria&city=Sofia',
    en: {
      title: 'Apartments for Rent in Sofia, Bulgaria',
      description: 'Find apartments for rent in Sofia. Studios, flats, and offices across the city. Contact directly, no commission.',
    },
    loc: {
      bg: {
        title: 'Апартаменти под наем в София',
        h1: 'Апартаменти под наем в София',
        description: 'Намерете апартаменти под наем в София. Гарсониери, апартаменти и офиси. Контакт без комисиона.',
        faqs: [
          { q: 'Колко струва наем на апартамент в София?', a: 'Наемите в София започват от около €300–500 на месец за гарсониера, в зависимост от квартала. Разгледайте текущите обяви на BalkanEstateAI.' },
        ],
      },
    },
  },

  // ─── Romania (ro) — Bucharest ───────────────────────────────────────────────
  {
    path: '/search?country=Romania&city=Bucharest',
    en: {
      title: 'Apartments for Sale in Bucharest - Property in Romania',
      description: 'Find apartments and houses for sale in Bucharest. New builds, flats, houses, and land. AI-powered search.',
    },
    loc: {
      ro: {
        title: 'Apartamente de vânzare în București — Imobiliare România',
        h1: 'Apartamente de vânzare în București',
        description: 'Găsiți apartamente de vânzare în București. Construcții noi, garsoniere și apartamente cu 2-3 camere, case și terenuri. Căutare cu inteligență artificială.',
        faqs: [
          { q: 'Cât costă un apartament în București?', a: 'Prețurile în București încep de obicei de la circa €1.200–2.000/m², în funcție de zonă. Folosiți evaluarea gratuită cu AI de la BalkanEstateAI.' },
          { q: 'Care sunt cele mai bune cartiere din București?', a: 'Zone căutate sunt Centrul, Herăstrău, Pipera și Cotroceni. Răsfoiți anunțurile pe cartier.' },
          { q: 'Merită să cumperi un apartament în București?', a: 'București oferă o piață stabilă și randamente atractive din chirii, fiind atractiv pentru investiții. Comparați piețele pe BalkanEstateAI.' },
        ],
      },
    },
  },
  {
    path: '/rentals?country=Romania&city=Bucharest',
    en: {
      title: 'Apartments for Rent in Bucharest, Romania',
      description: 'Find apartments for rent in Bucharest. Studios, flats, and commercial space across the city. Contact directly, no commission.',
    },
    loc: {
      ro: {
        title: 'Apartamente de închiriat în București',
        h1: 'Apartamente de închiriat în București',
        description: 'Găsiți apartamente de închiriat în București. Garsoniere, apartamente și spații comerciale. Contact fără comision.',
        faqs: [
          { q: 'Cât costă chiria unui apartament în București?', a: 'Chiriile în București încep de la circa €300–500 pe lună pentru o garsonieră, în funcție de zonă. Răsfoiți anunțurile actuale pe BalkanEstateAI.' },
        ],
      },
    },
  },

  // ─── Greece (el) — Athens ───────────────────────────────────────────────────
  {
    path: '/search?country=Greece&city=Athens',
    en: {
      title: 'Apartments for Sale in Athens - Property in Greece',
      description: 'Find apartments and houses for sale in Athens. New builds, penthouses, houses, and plots. Golden Visa eligible. AI-powered search.',
    },
    loc: {
      el: {
        title: 'Διαμερίσματα προς πώληση στην Αθήνα — Ακίνητα Ελλάδα',
        h1: 'Διαμερίσματα προς πώληση στην Αθήνα',
        description: 'Βρείτε διαμερίσματα προς πώληση στην Αθήνα. Νεόδμητα, ρετιρέ, μονοκατοικίες και οικόπεδα. Αναζήτηση με τεχνητή νοημοσύνη.',
        faqs: [
          { q: 'Πόσο κοστίζει ένα διαμέρισμα στην Αθήνα;', a: 'Οι τιμές στην Αθήνα ξεκινούν συνήθως από περίπου €1.500–3.000/τ.μ., ανάλογα με την περιοχή. Χρησιμοποιήστε τη δωρεάν εκτίμηση AI του BalkanEstateAI.' },
          { q: 'Πώς αγοράζω σπίτι στην Ελλάδα;', a: 'Το συμβόλαιο υπογράφεται ενώπιον συμβολαιογράφου και καταχωρείται στο κτηματολόγιο. Οι σύμβουλοι του BalkanEstateAI σας καθοδηγούν σε κάθε βήμα.' },
          { q: 'Αξίζει να αγοράσω ακίνητο στην Αθήνα;', a: 'Η Ελλάδα προσφέρει τη Golden Visa και ισχυρές αποδόσεις από βραχυχρόνια μίσθωση, καθιστώντας την ελκυστική για επένδυση.' },
        ],
      },
    },
  },
  {
    path: '/rentals?country=Greece&city=Athens',
    en: {
      title: 'Apartments for Rent in Athens, Greece',
      description: 'Find apartments for rent in Athens. Studios, flats, and commercial space across the city. Contact directly, no commission.',
    },
    loc: {
      el: {
        title: 'Διαμερίσματα προς ενοικίαση στην Αθήνα',
        h1: 'Διαμερίσματα προς ενοικίαση στην Αθήνα',
        description: 'Βρείτε διαμερίσματα προς ενοικίαση στην Αθήνα. Στούντιο, διαμερίσματα και επαγγελματικοί χώροι. Επικοινωνία χωρίς προμήθεια.',
        faqs: [
          { q: 'Πόσο κοστίζει η ενοικίαση διαμερίσματος στην Αθήνα;', a: 'Τα ενοίκια στην Αθήνα ξεκινούν από περίπου €350–550 τον μήνα για στούντιο, ανάλογα με την περιοχή. Δείτε τις τρέχουσες αγγελίες στο BalkanEstateAI.' },
        ],
      },
    },
  },
];
