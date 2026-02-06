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
}) => {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
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
    question: 'How do I list my property on Balkan Estate?',
    answer: 'To list your property, create an account, verify your email, and click "Create Listing" in your dashboard. You can add photos, descriptions, and set your price. Free accounts can list up to 3 properties, while Pro subscribers get up to 20 listings.',
  },
  {
    question: 'Which countries does Balkan Estate cover?',
    answer: 'Balkan Estate covers properties across the entire Balkan region including Serbia, Montenegro, Croatia, Bosnia and Herzegovina, North Macedonia, Albania, Kosovo, and Slovenia. We are constantly expanding to new areas.',
  },
  {
    question: 'How much does it cost to list a property?',
    answer: 'Basic listings are free with up to 3 active properties. Our Pro subscription at €12/month or €120/year gives you 20 listings, promotion coupons, and priority support. Agencies can get custom plans starting at €1000/year.',
  },
  {
    question: 'How do I contact a property seller?',
    answer: 'Click the "Contact Seller" button on any property page to start a conversation. You\'ll need to create a free account first. All messages are securely stored in your inbox for easy reference.',
  },
  {
    question: 'Are the agents and agencies verified?',
    answer: 'Yes, all agents on our platform must provide valid license documentation which is verified by our team. Verified agents display a badge on their profile. We recommend only working with verified professionals.',
  },
  {
    question: 'Can I save properties to view later?',
    answer: 'Yes! Click the heart icon on any property to save it to your favorites. You can access all saved properties from your dashboard. Pro subscribers also get price drop alerts on saved properties.',
  },
  {
    question: 'How accurate are the property prices?',
    answer: 'All prices are set by property owners or agents and displayed in Euros (€). Prices are regularly updated, but we recommend confirming the current price with the seller when making inquiries.',
  },
  {
    question: 'What payment methods are accepted for subscriptions?',
    answer: 'We accept all major credit cards through our secure payment provider, as well as payments via Google Play Store and Apple App Store for mobile users. All payments are secure and encrypted.',
  },
  {
    question: 'Can I promote my listing for more visibility?',
    answer: 'Yes! We offer promotion packages including Featured, Highlight, and Premium tiers that boost your listing\'s visibility. Pro subscribers receive monthly promotion coupons as part of their subscription.',
  },
  {
    question: 'How do I report a suspicious listing?',
    answer: 'If you encounter a suspicious listing or fraudulent activity, please use the "Report" button on the property page or contact our support team directly. We take all reports seriously and investigate promptly.',
  },
];

export default FAQSchema;
