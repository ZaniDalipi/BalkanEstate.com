import type { CountryGuide, Source } from '../types/guide.types';

/**
 * When the facts below were last checked against their sources. Shown on the
 * page next to the disclaimer.
 */
export const GUIDES_LAST_REVIEWED = '2026-10-11';

/**
 * The ten country guides, in the order the quick-jump bar shows them.
 *
 * Rules for editing this file:
 * - Every fact must come from an official publication (statistics office,
 *   central bank, tax authority, ministry, official gazette, Eurostat) and
 *   cite it. The allowed domains are listed in `src/tests/buying-guides.test.ts`.
 * - State only what the source says. No estimates, no ranges built by hand,
 *   no marketing claims. If there is no official source, leave the field out.
 * - Slugs are published URLs (`/guides/montenegro`, and the old `/guides#bosnia`
 *   anchors) — do not rename one without a redirect.
 */

const MONSTAT_NEW_DWELLINGS_Q1_2026: Source = {
  publisher: 'MONSTAT (Statistical Office of Montenegro)',
  title: 'Prices of dwellings in new residential buildings, I quarter 2026',
  url: 'https://monstat.org/uploads/files/gradjevinarstvo/Cijene%20stanova%20u%20novogradnji/2026/1/Prices_of_dwellings_in_new_residential_buildings_I_quarter_2026.pdf',
};

export const COUNTRY_GUIDES: readonly CountryGuide[] = [
  {
    slug: 'montenegro',
    country: 'Montenegro',
    countryKey: 'montenegro',
    flag: '🇲🇪',
    cities: ['Podgorica', 'Budva', 'Kotor', 'Tivat', 'Herceg Novi', 'Bar'],
    price: {
      kind: 'avg-per-sqm',
      amount: 2445,
      currency: 'EUR',
      measure: 'Average price of dwellings in new residential buildings (concluded sales contracts)',
      period: 'Q1 2026',
      source: MONSTAT_NEW_DWELLINGS_Q1_2026,
    },
    transferTax: {
      text: 'Progressive since 1 January 2024: 3% on the first €150,000 of the tax base, with higher rates above that amount.',
      sources: [
        {
          publisher: 'Government of Montenegro',
          title: 'Izmjene i dopune Zakona o porezu na promet nepokretnosti – u primjeni od 01.01.2024.',
          url: 'https://www.gov.me/clanak/izmjene-i-dopune-zakona-o-porezu-na-promet-nepokretnosti-u-primjeni-od-01012024',
        },
      ],
    },
    annualTax: {
      text: '0.25%–1.00% of the property’s market value a year, under the Law on Property Tax.',
      sources: [
        {
          publisher: 'Government of Montenegro',
          title: 'Porez na nepokretnosti',
          url: 'https://www.gov.me/clanak/porez-na-nepokretnosti',
        },
      ],
    },
    residency: {
      text:
        'Owning real estate in Montenegro is a legal ground for a temporary residence permit, issued for one year. ' +
        'Amendments to the Law on Foreigners add a minimum property value for this permit (the government’s proposal set €200,000) — confirm the amount in force with the Ministry of Interior.',
      sources: [
        {
          publisher: 'Government of Montenegro',
          title: 'Temporary residence',
          url: 'https://www.gov.me/en/article/temporary-residence',
        },
        {
          publisher: 'Government of Montenegro',
          title: 'Government adopts amendments to the Law on Foreigners',
          url: 'https://www.gov.me/en/article/government-adopts-amendments-to-the-law-on-foreigners-new-measures-to-regulate-residence',
        },
      ],
    },
  },
  {
    slug: 'albania',
    country: 'Albania',
    countryKey: 'albania',
    flag: '🇦🇱',
    cities: ['Tirana', 'Durres', 'Vlore', 'Sarande', 'Shkoder'],
  },
  {
    slug: 'serbia',
    country: 'Serbia',
    countryKey: 'serbia',
    flag: '🇷🇸',
    cities: ['Belgrade', 'Novi Sad', 'Nis', 'Subotica'],
    price: {
      kind: 'index-change',
      changePct: 5.25,
      measure: 'RGZ apartment price index, year-on-year change',
      period: 'Q2 2026',
      source: {
        publisher: 'RGZ (Republic Geodetic Authority of Serbia)',
        title: 'RGZ Indeks cena stanova',
        url: 'https://www.rgz.gov.rs/rgz-indeks-cena-stanova',
      },
    },
    transferTax: {
      text:
        '2.5% tax on the transfer of absolute rights; the seller is the taxpayer. ' +
        'The sale is exempt for up to 40 m² (plus 15 m² per household member) when an individual buyer is buying their first home in Serbia.',
      sources: [
        {
          publisher: 'Poreska uprava (Tax Administration of Serbia)',
          title: 'Porez na prenos apsolutnih prava kod prometa nepokretnosti (October 2025)',
          url: 'https://purs.gov.rs/upload/media/2025/10/21/760421/Porez_na_prenos_apsolutnih_prava_kod_prometa_nepokretnosti.pdf',
        },
      ],
    },
  },
  {
    slug: 'north-macedonia',
    country: 'North Macedonia',
    countryKey: 'north-macedonia',
    flag: '🇲🇰',
    cities: ['Skopje', 'Ohrid', 'Bitola', 'Tetovo'],
  },
  {
    slug: 'kosovo',
    country: 'Kosovo',
    countryKey: 'kosovo',
    flag: '🇽🇰',
    cities: ['Prishtina', 'Prizren', 'Peja', 'Gjakova'],
    price: {
      kind: 'index-change',
      changePct: 4.8,
      measure: 'Residential property price index (Kosovo Agency of Statistics), year-on-year change',
      period: 'Q3 2025',
      source: {
        publisher: 'Central Bank of the Republic of Kosovo',
        title: 'Annual Report 2025',
        url: 'https://bqk-kos.org/wp-content/uploads/2026/07/CBK_AnnualReport2025.pdf',
      },
    },
  },
  {
    slug: 'croatia',
    country: 'Croatia',
    countryKey: 'croatia',
    flag: '🇭🇷',
    cities: ['Zagreb', 'Split', 'Dubrovnik', 'Zadar', 'Rijeka'],
    price: {
      kind: 'avg-per-sqm',
      amount: 2861,
      currency: 'EUR',
      measure: 'Average price of new dwellings sold (all sellers)',
      period: 'H2 2025',
      source: {
        publisher: 'DZS (Croatian Bureau of Statistics)',
        title: 'GRAD-2025-4-1/2 Prices of Sold New Dwellings, 2025',
        url: 'https://podaci.dzs.hr/2025/en/97572',
      },
    },
    transferTax: {
      text: '3% of the property’s market value. Purchases on which 25% VAT is charged are not subject to this tax.',
      sources: [
        {
          publisher: 'Porezna uprava (Croatian Tax Administration)',
          title: 'Porez na promet nekretnina',
          url: 'https://porezna-uprava.gov.hr/hr/porez-na-promet-nekretni-na/4583',
        },
      ],
    },
    annualTax: {
      text:
        'Since 1 January 2025: €0.60–€8.00 per m² of useful area a year, set by the municipality. ' +
        'Not payable if the property is used for permanent residence or let on a long-term residential lease.',
      sources: [
        {
          publisher: 'Porezna uprava (Croatian Tax Administration)',
          title: 'Porez na nekretnine',
          url: 'https://porezna-uprava.gov.hr/hr/porez-na-nekretnine-4816/4816',
        },
        {
          publisher: 'gov.hr',
          title: 'Porez na nekretnine',
          url: 'https://gov.hr/hr/porez-na-nekretnine/1472',
        },
      ],
    },
    foreignOwnership: {
      text:
        'Citizens and companies of EU member states, Iceland, Liechtenstein, Norway and Switzerland buy on the same terms as Croatians. ' +
        'Others need reciprocity with their country and the consent of the Ministry of Justice.',
      sources: [
        {
          publisher: 'Ministry of Justice, Public Administration and Digital Transformation',
          title: 'Information on reciprocity in the acquisition of ownership rights in real estate',
          url: 'https://mpudt.gov.hr/information-on-reciprocity-in-the-acquisition-of-ownership-rights-in-real-estate-between-the-republic-of-croatia-and-countries-other-than-eu-member-states-republic-of-iceland-principality-of-liechtenstein-kingdom-of-norway-or-swiss-confederation-25361/25361',
        },
      ],
    },
  },
  {
    slug: 'bosnia',
    country: 'Bosnia and Herzegovina',
    countryKey: 'bosnia-herzegovina',
    flag: '🇧🇦',
    cities: ['Sarajevo', 'Mostar', 'Banja Luka', 'Tuzla'],
    price: {
      kind: 'avg-per-sqm',
      amount: 3147,
      currency: 'BAM',
      // Converted at the Central Bank of BiH's fixed rate: 1 EUR = 1.95583 KM.
      eurAmount: 1609,
      measure: 'Average price of new dwellings sold',
      period: 'Q2 2025',
      source: {
        publisher: 'BHAS (Agency for Statistics of Bosnia and Herzegovina)',
        title: 'Prices of new dwellings sold, Q2 2025',
        url: 'https://bhas.gov.ba/data/Publikacije/Saopstenja/2025/CON_05_2025_Q2_1_BS.pdf',
      },
    },
  },
  {
    slug: 'bulgaria',
    country: 'Bulgaria',
    countryKey: 'bulgaria',
    flag: '🇧🇬',
    cities: ['Sofia', 'Plovdiv', 'Varna', 'Burgas'],
    price: {
      kind: 'index-change',
      changePct: 14.8,
      measure: 'House price index (new and existing dwellings), year-on-year change — preliminary',
      period: 'Q1 2026',
      source: {
        publisher: 'NSI (National Statistical Institute of Bulgaria)',
        title: 'Housing price statistics – First quarter of 2026',
        url: 'https://www.nsi.bg/en/announcement/housing-price-statistics-9055',
      },
    },
    transferTax: {
      text: 'Local tax on the acquisition of property, set by each municipality between 0.1% and 3%.',
      sources: [
        {
          publisher: 'Ministry of Finance of Bulgaria',
          title: 'Local Taxes and Fees Act',
          url: 'https://minfin.bg/upload/60568/Local_Taxes_and_Fees_Act.pdf',
        },
      ],
    },
  },
  {
    slug: 'romania',
    country: 'Romania',
    countryKey: 'romania',
    flag: '🇷🇴',
    cities: ['Bucharest', 'Cluj-Napoca', 'Timisoara', 'Brasov', 'Constanta'],
    price: {
      kind: 'index-change',
      changePct: 12.1,
      measure: 'House price index, year-on-year change',
      period: 'Q2 2026',
      source: {
        publisher: 'Eurostat',
        title: 'House prices — euro indicators, Q2 2026',
        url: 'https://ec.europa.eu/eurostat/en/web/products-euro-indicators/w/2-01102026-bp',
      },
    },
  },
  {
    slug: 'greece',
    country: 'Greece',
    countryKey: 'greece',
    flag: '🇬🇷',
    cities: ['Athens', 'Thessaloniki', 'Heraklion', 'Chania', 'Rhodes'],
    price: {
      kind: 'index-change',
      changePct: 5.5,
      measure: 'Index of apartment prices (nationwide), year-on-year change',
      period: 'Q2 2026',
      source: {
        publisher: 'Bank of Greece',
        title: 'Indices of residential property prices: Q2 2026',
        url: 'https://www.bankofgreece.gr/en/news-and-media/press-office/news-list/news?announcement=ac5ae869-3e94-4550-b486-ef00c4292e07',
      },
    },
    transferTax: {
      text:
        '3% of the property’s taxable value, plus a municipal levy of 3% on that tax (about 3.09% in total), paid by the buyer before the contract is signed.',
      sources: [
        {
          publisher: 'AADE (Independent Authority for Public Revenue)',
          title: 'Real Estate Transfer Tax',
          url: 'https://www.aade.gr/en/greeks-abroad-non-residents/property-taxation/real-estate-transfer-tax',
        },
      ],
    },
    annualTax: {
      text: 'ENFIA: an annual tax on the property held on 1 January, calculated from each property’s surface area and characteristics.',
      sources: [
        {
          publisher: 'AADE (Independent Authority for Public Revenue)',
          title: 'Declaration E9 / Unified Property Tax (ENFIA)',
          url: 'https://www.aade.gr/en/e9enfia',
        },
      ],
    },
    residency: {
      text:
        'Golden Visa through property purchase: at least €800,000 in Attica, Thessaloniki, Mykonos, Santorini and islands with more than 3,100 inhabitants; at least €400,000 elsewhere; ' +
        '€250,000 for buildings converted from commercial to residential use and for listed buildings. Property bought for a Golden Visa may not be let short-term.',
      sources: [
        {
          publisher: 'Enterprise Greece',
          title: 'Greece adjusts Golden Visa program amid rising outlook for property market',
          url: 'https://newsletters.enterprisegreece.gov.gr/newsletter-articles/greece-adjusts-golden-visa-program-amid-rising-outlook-for-property-market/',
        },
        {
          publisher: 'Hellenic Republic — National Registry of Administrative Procedures (MITOS)',
          title: 'Permanent golden visa (change of use) – Initial issuance',
          url: 'https://en.mitos.gov.gr/index.php/%CE%94%CE%94:Permanent_golden_visa_(change_of_use)_%E2%80%93_Initial_issuance',
        },
        {
          publisher: 'Hellenic Republic — Housing Policy Portal',
          title: 'Απαγόρευση βραχυχρόνιας εκμίσθωσης των ακινήτων που αποκτήθηκαν μέσω του προγράμματος golden visa',
          url: 'https://stegasi.gov.gr/programs/apagorefsi-vrachychronias-ekmisthosis-ton-akiniton-pou-apoktithikan-meso-tou-programmatos-golden-visa/',
        },
      ],
    },
  },
];
