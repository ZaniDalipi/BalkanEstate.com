import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import Footer from '@/components/shared/Footer';

const TermsOfServicePage: React.FC = () => {
  const { t } = useTranslation(['legal', 'common']);
  const { dispatch } = useAppContext();

  const handleBack = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
    window.history.pushState({}, '', '/');
  };

  const lastUpdated = 'January 12, 2026';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors mb-4"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="font-medium">{t('common:back', 'Back')}</span>
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            {t('legal:terms.title', 'Terms of Service')}
          </h1>
          <p className="text-gray-600">
            {t('legal:terms.lastUpdated', 'Last updated')}: {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.intro.title', 'Agreement to Terms')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:terms.intro.text', 'By accessing or using BalkanEstate ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service. We reserve the right to modify these terms at any time, and your continued use constitutes acceptance of any changes.')}
            </p>
          </section>

          {/* Eligibility */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.eligibility.title', 'Eligibility')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:terms.eligibility.text', 'You must be at least 18 years old to use our Service. By using BalkanEstate, you represent that you are of legal age and have the legal capacity to enter into a binding agreement. If you are using the Service on behalf of a company or organization, you represent that you have the authority to bind that entity to these terms.')}
            </p>
          </section>

          {/* Account Registration */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.account.title', 'Account Registration')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:terms.account.text', 'To access certain features, you must create an account. You agree to:')}
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>{t('legal:terms.account.accurate', 'Provide accurate and complete registration information')}</li>
              <li>{t('legal:terms.account.update', 'Keep your account information updated')}</li>
              <li>{t('legal:terms.account.secure', 'Maintain the security of your password and account')}</li>
              <li>{t('legal:terms.account.notify', 'Notify us immediately of any unauthorized access')}</li>
              <li>{t('legal:terms.account.responsible', 'Be responsible for all activities under your account')}</li>
            </ul>
          </section>

          {/* Listing Properties */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.listings.title', 'Property Listings')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:terms.listings.text', 'When listing a property on BalkanEstate, you agree that:')}
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>{t('legal:terms.listings.ownership', 'You are the owner or authorized agent of the property')}</li>
              <li>{t('legal:terms.listings.accurate', 'All information provided is accurate and not misleading')}</li>
              <li>{t('legal:terms.listings.photos', 'Photos accurately represent the property')}</li>
              <li>{t('legal:terms.listings.legal', 'The listing does not violate any laws or regulations')}</li>
              <li>{t('legal:terms.listings.update', 'You will promptly update or remove listings when sold or unavailable')}</li>
              <li>{t('legal:terms.listings.respond', 'You will respond to inquiries in a timely and professional manner')}</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('legal:terms.listings.remove', 'We reserve the right to remove any listing that violates these terms or is reported as fraudulent.')}
            </p>
          </section>

          {/* Subscriptions and Payments */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.payments.title', 'Subscriptions and Payments')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:terms.payments.text', 'Certain features require a paid subscription:')}
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>{t('legal:terms.payments.recurring', 'Subscriptions are billed on a recurring basis (monthly or yearly)')}</li>
              <li>{t('legal:terms.payments.auto', 'Subscriptions auto-renew unless cancelled before the renewal date')}</li>
              <li>{t('legal:terms.payments.cancel', 'You can cancel your subscription at any time through your account settings')}</li>
              <li>{t('legal:terms.payments.refund', 'Refunds are available within 30 days of purchase if you are not satisfied (see our Refund Policy)')}</li>
              <li>{t('legal:terms.payments.price', 'We may change subscription prices with 30 days notice')}</li>
            </ul>
            <div className="bg-gray-50 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-gray-800 mb-2">{t('legal:terms.payments.paddle.title', 'Payment Processing')}</h4>
              <p className="text-gray-600 text-sm">
                {t('legal:terms.payments.paddle.text', 'All payments are processed by Paddle.com, our Merchant of Record. Paddle handles payment processing, invoicing, VAT/tax compliance, and refunds on our behalf. When you make a purchase, you are transacting with Paddle, who then remits payment to us. Your payment will appear on your statement as a charge from Paddle.')}
              </p>
              <a href="https://www.paddle.com/legal/terms" target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline mt-2 inline-block">Paddle Terms of Service →</a>
            </div>
          </section>

          {/* Prohibited Conduct */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.prohibited.title', 'Prohibited Conduct')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:terms.prohibited.text', 'You agree not to:')}
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>{t('legal:terms.prohibited.false', 'Post false, misleading, or fraudulent listings')}</li>
              <li>{t('legal:terms.prohibited.spam', 'Send spam or unsolicited communications')}</li>
              <li>{t('legal:terms.prohibited.harass', 'Harass, abuse, or threaten other users')}</li>
              <li>{t('legal:terms.prohibited.impersonate', 'Impersonate others or misrepresent your identity')}</li>
              <li>{t('legal:terms.prohibited.scrape', 'Scrape, crawl, or harvest data from our Service')}</li>
              <li>{t('legal:terms.prohibited.interfere', 'Interfere with the proper functioning of the Service')}</li>
              <li>{t('legal:terms.prohibited.circumvent', 'Attempt to bypass security measures')}</li>
              <li>{t('legal:terms.prohibited.illegal', 'Use the Service for any illegal purpose')}</li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.ip.title', 'Intellectual Property')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:terms.ip.text', 'The BalkanEstate name, logo, and all related trademarks, service marks, and content are owned by us. You may not use our intellectual property without prior written consent. You retain ownership of content you post but grant us a license to display and distribute it on our platform.')}
            </p>
          </section>

          {/* Disclaimer */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.disclaimer.title', 'Disclaimer of Warranties')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:terms.disclaimer.text', 'THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THE ACCURACY OF PROPERTY LISTINGS OR THE CONDUCT OF OTHER USERS. WE ARE NOT A REAL ESTATE AGENCY AND DO NOT PROVIDE REAL ESTATE ADVICE. ALL TRANSACTIONS ARE BETWEEN BUYERS AND SELLERS DIRECTLY.')}
            </p>
          </section>

          {/* Limitation of Liability */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.liability.title', 'Limitation of Liability')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:terms.liability.text', 'TO THE MAXIMUM EXTENT PERMITTED BY LAW, BALKANESTATE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS.')}
            </p>
          </section>

          {/* Indemnification */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.indemnity.title', 'Indemnification')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:terms.indemnity.text', 'You agree to indemnify and hold harmless BalkanEstate and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Service or violation of these terms.')}
            </p>
          </section>

          {/* Termination */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.termination.title', 'Termination')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:terms.termination.text', 'We may suspend or terminate your account at any time for violation of these terms or for any other reason at our discretion. You may also delete your account at any time. Upon termination, your right to use the Service will cease immediately, and your listings will be removed.')}
            </p>
          </section>

          {/* User Content License */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.userContent.title', 'User Content License')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:terms.userContent.text', 'By posting content (including property listings, photos, descriptions, and reviews) on BalkanEstate, you:')}
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>{t('legal:terms.userContent.own', 'Represent that you own or have the right to use and share this content')}</li>
              <li>{t('legal:terms.userContent.license', 'Grant us a non-exclusive, worldwide, royalty-free license to use, display, reproduce, and distribute your content on our platform')}</li>
              <li>{t('legal:terms.userContent.sublicense', 'Allow us to sublicense this content to our partners and affiliates for platform purposes')}</li>
              <li>{t('legal:terms.userContent.retain', 'Retain all ownership rights in your content')}</li>
              <li>{t('legal:terms.userContent.remove', 'May remove your content at any time by deleting it or your account')}</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('legal:terms.userContent.responsibility', 'You are solely responsible for your content and the consequences of posting it. We do not endorse user content and reserve the right to remove content that violates these terms.')}
            </p>
          </section>

          {/* API and Automated Access */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.api.title', 'API and Automated Access')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:terms.api.text', 'Automated access to our Service is strictly regulated:')}
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>{t('legal:terms.api.prohibited', 'Scraping, crawling, or automated data collection is prohibited without our written consent')}</li>
              <li>{t('legal:terms.api.rate', 'Excessive requests that burden our servers may result in IP blocking')}</li>
              <li>{t('legal:terms.api.partnership', 'For API access or data partnerships, contact us at partners@balkanestateai.com')}</li>
              <li>{t('legal:terms.api.robots', 'You must comply with our robots.txt file and any access restrictions')}</li>
            </ul>
          </section>

          {/* Professional Services Disclaimer */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.professional.title', 'Professional Services Disclaimer')}
            </h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-gray-700 leading-relaxed">
                {t('legal:terms.professional.text', 'BalkanEstate is a platform that connects property buyers and sellers. WE ARE NOT a real estate agency, brokerage, legal firm, or financial advisor. We do not provide legal, financial, tax, or real estate advice. All property transactions are conducted directly between users. We strongly recommend consulting with licensed professionals (real estate agents, lawyers, notaries) before making any property decisions. Property valuations, descriptions, and information are provided by users and have not been independently verified by BalkanEstate.')}
              </p>
            </div>
          </section>

          {/* Force Majeure */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.forceMajeure.title', 'Force Majeure')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:terms.forceMajeure.text', 'BalkanEstate shall not be liable for any failure or delay in performing our obligations due to circumstances beyond our reasonable control, including but not limited to: natural disasters, wars, terrorism, riots, pandemics, government actions, power outages, internet failures, or third-party service provider failures. During such events, our obligations will be suspended for the duration of the event.')}
            </p>
          </section>

          {/* Dispute Resolution */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.disputes.title', 'Dispute Resolution')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:terms.disputes.text', 'In the event of any dispute arising from these Terms or your use of the Service:')}
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>{t('legal:terms.disputes.informal', 'Informal Resolution:')}</strong> {t('legal:terms.disputes.informalDesc', 'We encourage you to contact us first at legal@balkanestateai.com to attempt informal resolution. We commit to responding within 15 business days.')}</li>
              <li><strong>{t('legal:terms.disputes.mediation', 'Mediation:')}</strong> {t('legal:terms.disputes.mediationDesc', 'If informal resolution fails, both parties agree to attempt mediation before any formal proceedings.')}</li>
              <li><strong>{t('legal:terms.disputes.jurisdiction', 'Jurisdiction:')}</strong> {t('legal:terms.disputes.jurisdictionDesc', 'Any legal proceedings shall be conducted in the courts of Skopje, North Macedonia.')}</li>
              <li><strong>{t('legal:terms.disputes.time', 'Time Limitation:')}</strong> {t('legal:terms.disputes.timeDesc', 'Any claim must be filed within one (1) year of the event giving rise to the claim, or it will be permanently barred.')}</li>
            </ul>
          </section>

          {/* Governing Law */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.law.title', 'Governing Law')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:terms.law.text', 'These Terms shall be governed by the laws of North Macedonia. Any disputes shall be resolved in the courts of Skopje, North Macedonia. If any provision of these terms is found to be unenforceable, the remaining provisions shall continue in effect.')}
            </p>
          </section>

          {/* Severability */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.severability.title', 'Severability')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:terms.severability.text', 'If any provision of these Terms is held to be invalid, illegal, or unenforceable by a court of competent jurisdiction, that provision shall be modified to the minimum extent necessary to make it enforceable, or if modification is not possible, severed from these Terms. The invalidity of any provision shall not affect the validity of the remaining provisions, which shall continue in full force and effect.')}
            </p>
          </section>

          {/* Entire Agreement */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.entireAgreement.title', 'Entire Agreement')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:terms.entireAgreement.text', 'These Terms of Service, together with our Privacy Policy and Cookie Policy, constitute the entire agreement between you and BalkanEstate regarding your use of the Service. These Terms supersede all prior agreements, communications, and understandings, whether written or oral, relating to the subject matter hereof.')}
            </p>
          </section>

          {/* Waiver */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.waiver.title', 'Waiver')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:terms.waiver.text', 'Our failure to enforce any right or provision of these Terms shall not constitute a waiver of such right or provision. Any waiver of any provision of these Terms will be effective only if in writing and signed by BalkanEstate.')}
            </p>
          </section>

          {/* Assignment */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.assignment.title', 'Assignment')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:terms.assignment.text', 'You may not assign or transfer these Terms or your rights under them without our prior written consent. We may assign these Terms without restriction. Any attempted assignment in violation of this section shall be void.')}
            </p>
          </section>

          {/* Modifications to Service */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.modifications.title', 'Modifications to Service')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:terms.modifications.text', 'We reserve the right to modify, suspend, or discontinue any part of the Service at any time without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuation of the Service.')}
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.contact.title', 'Contact Us')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:terms.contact.text', 'If you have questions about these Terms of Service, please contact us:')}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-gray-700"><strong>BalkanEstate</strong></p>
              <p className="text-gray-700">Email: legal@balkanestateai.com</p>
              <p className="text-gray-700">Phone: +389 71 967 915</p>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default TermsOfServicePage;
