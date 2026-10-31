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
 * Platform FAQs, shown on the About page (and only emitted as FAQPage markup
 * where they are visible — FAQ structured data must match the page's text).
 *
 * Keep these factual: what the platform does and how it works. No market
 * statistics, no superlatives, no claims about competitors.
 */
export const realEstateFAQs: FAQItem[] = [
  {
    question: 'Which countries does BalkanEstateAI cover?',
    answer: 'Albania, Bosnia and Herzegovina, Bulgaria, Croatia, Greece, Kosovo, Montenegro, North Macedonia, Romania and Serbia. The site is available in English, Albanian, Serbian, Bulgarian, Croatian, Bosnian, Macedonian, Montenegrin, Romanian and Greek.',
  },
  {
    question: 'Who publishes the listings?',
    answer: 'Listings are created by property owners, agents and agencies who have an account. Some listings are imported from agency feeds or other websites; those show the original source and link back to it.',
  },
  {
    question: 'Does BalkanEstateAI verify every listing?',
    answer: 'No. We do not inspect properties or check each listing\'s details, so the seller or agent is responsible for what they publish. Before paying any deposit, check ownership at the official land registry and use a licensed local lawyer — each of our country buying guides names the registry to check.',
  },
  {
    question: 'How do I report a listing that looks wrong or fraudulent?',
    answer: 'Use the "Report it to us" link at the bottom of any listing page, or the contact form. Reports go to our support team, which reviews them.',
  },
  {
    question: 'Is BalkanEstateAI free for buyers and renters?',
    answer: 'Yes. Searching, saving properties and contacting sellers or agents is free. Agents and agencies can pay for subscriptions and promoted listings, and the site also shows advertising if you accept advertising cookies.',
  },
  {
    question: 'Where is AI used on the site?',
    answer: 'AI helps sellers draft a listing description from their photos, powers natural-language search, and produces automated price estimates. A seller reviews and publishes their own description, and automated estimates are indications, not professional valuations.',
  },
];

export default FAQSchema;
