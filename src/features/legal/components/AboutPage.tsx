import React from 'react';
import { useTranslation } from 'react-i18next';
import { SEO, FAQSchema, realEstateFAQs } from '@/src/components/seo';
import Footer from '@/components/shared/Footer';
import { AppLink } from '@/src/app/router/AppLink';
import { paths, withQuery } from '@/src/app/router/paths';
import { CONTACT_CONFIG } from '@/src/shared/config/contact';

/**
 * `/about` — who runs the site, what it does, where listings come from and
 * what we do (and do not) check.
 *
 * Only business facts already on record in CONTACT_CONFIG appear here. Do not
 * add registration numbers, addresses, team sizes, user counts or testimonials
 * unless they are verified and supplied by the company.
 */

interface Feature {
  title: string;
  text: string;
  to?: string;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mt-10">
    <h2 className="text-xl sm:text-2xl font-semibold text-neutral-900 mb-3">{title}</h2>
    <div className="space-y-3 text-neutral-700 leading-relaxed">{children}</div>
  </section>
);

const AboutPage: React.FC = () => {
  const { t } = useTranslation(['legal', 'common']);
  const { company, email, phone } = CONTACT_CONFIG;

  const features: Feature[] = [
    { title: t('legal:about.features.search.title', 'Map-based property search'), text: t('legal:about.features.search.text', 'Search homes for sale and rent on an interactive map, filter by price, size, rooms and property type, or describe what you want in plain language.'), to: paths.search() },
    { title: t('legal:about.features.listing.title', 'Detailed listing pages'), text: t('legal:about.features.listing.text', 'Photos, floor plans with photo positions, 360° virtual tours, 3D building views, the property\'s orientation and a sunlight and shadow simulation for any time of day.') },
    { title: t('legal:about.features.area.title', 'Neighbourhood information'), text: t('legal:about.features.area.text', 'Nearby schools, shops, transport and other points of interest, with distance measurement from the property.') },
    { title: t('legal:about.features.cities.title', 'City pages'), text: t('legal:about.features.cities.text', 'Price history, districts and economic indicators for cities across the region.'), to: paths.exploreCities() },
    { title: t('legal:about.features.calculators.title', 'Mortgage and rent-versus-buy calculators'), text: t('legal:about.features.calculators.text', 'Estimate monthly repayments and compare the cost of renting with buying.'), to: paths.mortgageCalculator() },
    { title: t('legal:about.features.valuation.title', 'Automated price estimates'), text: t('legal:about.features.valuation.text', 'An indication of a property\'s value based on comparable listings and location — not a professional valuation.'), to: paths.valuation() },
    { title: t('legal:about.features.guides.title', 'Country buying guides'), text: t('legal:about.features.guides.text', 'Who can buy, the taxes, the legal steps and the official registry for each country.'), to: paths.guides() },
    { title: t('legal:about.features.agents.title', 'Agent and agency profiles'), text: t('legal:about.features.agents.text', 'Profiles with each agent\'s and agency\'s listings and contact details, and viewing requests you can send from a listing.'), to: paths.agents() },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SEO
        title={t('legal:about.seoTitle', 'About Us')}
        canonical={`/en${paths.about()}`}
        alternates={false}
        description={t('legal:about.seoDescription', 'Who operates BalkanEstateAI, what the property marketplace offers, where its listings come from, how to report a listing and how to contact us.')}
      />
      <FAQSchema faqs={realEstateFAQs} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 landscape:text-2xl">
          {t('legal:about.title', 'About BalkanEstateAI')}
        </h1>
        <p className="mt-4 text-lg text-neutral-700 leading-relaxed">
          {t('legal:about.intro', 'BalkanEstateAI is an online property marketplace for Albania, Bosnia and Herzegovina, Bulgaria, Croatia, Greece, Kosovo, Montenegro, North Macedonia, Romania and Serbia. Owners, agents and agencies publish homes for sale and rent; buyers and renters search them, compare them and contact the seller directly.')}
        </p>

        <Section title={t('legal:about.operator.title', 'Who runs the site')}>
          <p>
            {t('legal:about.operator.text', 'BalkanEstateAI is operated by {{legalName}}.', { legalName: company.legalName })}
          </p>
          <ul className="list-none space-y-1">
            <li>
              {t('legal:about.operator.general', 'General enquiries')}:{' '}
              <a className="text-primary hover:underline" href={`mailto:${email.info}`}>{email.info}</a>
            </li>
            <li>
              {t('legal:about.operator.support', 'Support')}:{' '}
              <a className="text-primary hover:underline" href={`mailto:${email.support}`}>{email.support}</a>
            </li>
            <li>
              {t('legal:about.operator.privacy', 'Privacy and data requests')}:{' '}
              <a className="text-primary hover:underline" href={`mailto:${email.privacy}`}>{email.privacy}</a>
            </li>
            <li>
              {t('legal:about.operator.phone', 'Phone')}:{' '}
              <a className="text-primary hover:underline" href={`tel:${phone.primaryTel}`}>{phone.primary}</a>
            </li>
          </ul>
          <p>
            <AppLink to={paths.contact()} className="text-primary font-medium hover:underline">
              {t('legal:about.operator.contactForm', 'Or use the contact form')}
            </AppLink>
          </p>
        </Section>

        <Section title={t('legal:about.features.title', 'What you can do here')}>
          <ul className="grid gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f.title} className="rounded-xl border border-neutral-200 bg-white p-4">
                <h3 className="font-semibold text-neutral-900">
                  {f.to ? (
                    <AppLink to={f.to} className="hover:text-primary">{f.title}</AppLink>
                  ) : (
                    f.title
                  )}
                </h3>
                <p className="mt-1 text-sm">{f.text}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t('legal:about.listings.title', 'Where listings come from')}>
          <p>{t('legal:about.listings.text1', 'Listings are created by property owners, agents and agencies with an account. Each listing shows who published it and how to contact them.')}</p>
          <p>{t('legal:about.listings.text2', 'Some listings are imported from agency feeds or other websites. Those listings name and link their original source, and we keep them out of search engine indexes because the original text and photos belong to that source.')}</p>
          <p>{t('legal:about.listings.text3', 'Sellers can use AI to draft a description from their photos. The seller reviews, edits and publishes it, and is responsible for it like any other part of the listing.')}</p>
        </Section>

        <Section title={t('legal:about.checks.title', 'What we check — and what we don\'t')}>
          <p>{t('legal:about.checks.text1', 'We do not visit properties or confirm ownership, prices or measurements for each listing. Listing details are provided by the person who published them.')}</p>
          <p>
            {t('legal:about.checks.text2', 'Before paying a deposit, check ownership at the official land registry and use a licensed local lawyer or notary. Our')}{' '}
            <AppLink to={paths.guides()} className="text-primary hover:underline">{t('legal:about.checks.guidesLink', 'country buying guides')}</AppLink>{' '}
            {t('legal:about.checks.text3', 'name the registry to check in each country.')}
          </p>
        </Section>

        <Section title={t('legal:about.report.title', 'Reporting a listing')}>
          <p>{t('legal:about.report.text', 'If a listing looks inaccurate, misleading or fraudulent, use the "Report it to us" link at the bottom of the listing page, or write to us. Reports go to our support team for review.')}</p>
          <p>
            <AppLink to={withQuery(paths.contact(), { topic: 'report' })} className="text-primary font-medium hover:underline" rel="nofollow">
              {t('legal:about.report.link', 'Report a listing')}
            </AppLink>
          </p>
        </Section>

        <Section title={t('legal:about.money.title', 'How the site is funded')}>
          <p>{t('legal:about.money.text', 'Searching and contacting sellers is free. The site is funded by paid plans and promoted listings for agents and agencies, and by advertising. Advertising cookies are only used if you accept them.')}</p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <AppLink to={paths.pricing()} className="text-primary hover:underline">{t('legal:about.money.pricing', 'Plans and pricing')}</AppLink>
            <AppLink to={paths.privacy()} className="text-primary hover:underline">{t('legal:about.money.privacy', 'Privacy Policy')}</AppLink>
            <AppLink to={paths.cookies()} className="text-primary hover:underline">{t('legal:about.money.cookies', 'Cookie Policy')}</AppLink>
            <AppLink to={paths.terms()} className="text-primary hover:underline">{t('legal:about.money.terms', 'Terms of Service')}</AppLink>
          </p>
        </Section>

        <Section title={t('legal:about.faq.title', 'Frequently asked questions')}>
          <div className="space-y-4">
            {realEstateFAQs.map((faq) => (
              <div key={faq.question}>
                <h3 className="font-semibold text-neutral-900">{faq.question}</h3>
                <p className="mt-1">{faq.answer}</p>
              </div>
            ))}
          </div>
        </Section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
