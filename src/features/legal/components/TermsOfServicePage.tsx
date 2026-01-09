import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';

const TermsOfServicePage: React.FC = () => {
  const { t } = useTranslation(['legal', 'common']);
  const { dispatch } = useAppContext();

  const handleBack = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
    window.history.pushState({}, '', '/');
  };

  const lastUpdated = 'January 9, 2026';

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
              <li>{t('legal:terms.payments.refund', 'Refunds are available within 30 days of purchase if you are not satisfied')}</li>
              <li>{t('legal:terms.payments.price', 'We may change subscription prices with 30 days notice')}</li>
            </ul>
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

          {/* Governing Law */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:terms.law.title', 'Governing Law')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:terms.law.text', 'These Terms shall be governed by the laws of North Macedonia. Any disputes shall be resolved in the courts of Skopje, North Macedonia. If any provision of these terms is found to be unenforceable, the remaining provisions shall continue in effect.')}
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
              <p className="text-gray-700">Email: legal@balkanestate.com</p>
              <p className="text-gray-700">Phone: +389 71 967 915</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
