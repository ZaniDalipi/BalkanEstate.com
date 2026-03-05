import React from 'react';
import { Helmet } from 'react-helmet-async';

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQSchemaProps {
  faqs: FAQItem[];
  showUI?: boolean;
  className?: string;
  language?: string;
}

/**
 * FAQ Schema Component
 * Adds JSON-LD structured data for FAQ rich snippets
 * Optionally displays an FAQ accordion UI
 */
export const FAQSchema: React.FC<FAQSchemaProps> = ({
  faqs,
  showUI = false,
  className = '',
  language = 'en',
}) => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: language,
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      </Helmet>

      {showUI && (
        <div className={`space-y-3 ${className}`}>
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-neutral-200 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-neutral-50 transition-colors text-left"
              >
                <span className="font-medium text-neutral-800 pr-4">{faq.question}</span>
                <svg
                  className={`w-5 h-5 text-neutral-500 transition-transform flex-shrink-0 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIndex === index && (
                <div className="p-4 pt-0 bg-white">
                  <p className="text-neutral-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

/**
 * Pre-defined FAQs for the real estate platform
 */
export const realEstateFAQs: FAQItem[] = [
  {
    question: 'Which countries does BalkanEstateAI cover for property search?',
    answer: 'BalkanEstateAI is the only platform covering all 11 Balkan countries: Kosovo, Albania, North Macedonia, Montenegro, Serbia, Bosnia and Herzegovina, Croatia, Bulgaria, Romania, Greece, and Slovenia. We support property searches in 10 languages including Albanian, Serbian, Macedonian, Croatian, Bosnian, Bulgarian, Romanian, and Greek.',
  },
  {
    question: 'Can foreigners buy property in the Balkans?',
    answer: 'Yes, foreigners can buy property in most Balkan countries, though rules vary. In Montenegro, foreigners can buy apartments freely. Albania allows foreign property ownership except agricultural land. Serbia allows EU citizens to buy freely, while others need reciprocity agreements. Kosovo, North Macedonia, and Croatia have specific conditions. BalkanEstateAI provides country-specific buying guides and connects you with local agents who specialize in foreign purchases.',
  },
  {
    question: 'What is the cheapest Balkan country to buy property?',
    answer: 'North Macedonia and Albania generally offer the lowest property prices in the Balkans. In Skopje, apartments start from €600-800/sqm, while Tirana averages €800-1,200/sqm. Kosovo (Pristina) offers apartments from €700-1,000/sqm. For comparison, Montenegro coastal cities like Budva average €2,000-3,500/sqm, and Croatian cities like Dubrovnik can exceed €4,000/sqm. Use BalkanEstateAI to compare prices across all 11 countries.',
  },
  {
    question: 'How does the AI-powered property search work?',
    answer: 'BalkanEstateAI uses artificial intelligence to match you with properties based on your preferences, budget, and lifestyle needs. Simply describe what you\'re looking for in natural language — for example, "seaside apartment in Montenegro under €100,000" or "family house near schools in Skopje" — and our AI finds the best matches across all 11 Balkan countries. No other Balkan property platform offers AI-powered search.',
  },
  {
    question: 'What is the best area to invest in Balkan real estate?',
    answer: 'Top investment areas in 2026 include: Montenegro\'s coast (Budva, Kotor, Tivat) for tourism rental yields of 5-8%; Albania\'s Riviera (Saranda, Vlora) for rapid price growth; Tirana for capital appreciation; Belgrade for stable rental income; and Pristina (Kosovo) as an emerging market with no dominant competition. BalkanEstateAI\'s AI valuation tool helps you assess investment potential across all markets.',
  },
  {
    question: 'Can I get a residence permit by buying property in Montenegro?',
    answer: 'Yes, Montenegro offers a temporary residence permit for property owners. By purchasing property in Montenegro, you can apply for a one-year renewable residence permit. The process is straightforward and BalkanEstateAI connects you with agents and legal professionals experienced in the residency-through-property process.',
  },
  {
    question: 'How do I list my property on BalkanEstateAI?',
    answer: 'To list your property, create a free account, verify your email, and click "Create Listing" in your dashboard. Add photos, descriptions in any of our 10 supported languages, and set your price in Euros. Free accounts can list up to 3 properties. Pro subscribers (€12/month) get 20 listings with promotion coupons and priority visibility.',
  },
  {
    question: 'What makes BalkanEstateAI different from Realitica or Indomio?',
    answer: 'BalkanEstateAI is the only platform that covers all 11 Balkan countries on a single platform with AI-powered search. Unlike Realitica (4 countries, outdated mobile experience) or Indomio (separate sites per country, no AI), BalkanEstateAI offers: AI property matching, AI-powered valuations, 10 native languages, a modern mobile-first PWA, virtual property tours, and comprehensive agent/agency directories — all in one place.',
  },
  {
    question: 'What are property taxes like in the Balkans?',
    answer: 'Property tax rates vary across the Balkans. Montenegro: 0.25-1% annually. Serbia: 0.4-2% based on value. Croatia: no annual property tax, but 3% transfer tax. Albania: low annual property tax (0.05-0.2%). North Macedonia: 0.1-0.2%. Bulgaria: 0.01-0.45%. Romania: varies by location. Greece: ENFIA tax 0.1-1.15%. Always consult local experts — BalkanEstateAI connects you with agents in each country.',
  },
  {
    question: 'What is the rental yield for property in Montenegro and Albania?',
    answer: 'Montenegro coastal properties achieve gross rental yields of 5-8% annually, with premium locations like Budva and Kotor performing best during the May-September tourist season. In Albania, Tirana apartments yield 5-7%, while Saranda and the Albanian Riviera offer 6-9% during peak tourist months. These are among the highest rental yields in Europe, making the Balkans attractive for property investors.',
  },
];

export default FAQSchema;
