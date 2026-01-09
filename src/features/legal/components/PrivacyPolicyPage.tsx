import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';

const PrivacyPolicyPage: React.FC = () => {
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
            {t('legal:privacy.title', 'Privacy Policy')}
          </h1>
          <p className="text-gray-600">
            {t('legal:privacy.lastUpdated', 'Last updated')}: {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:privacy.intro.title', 'Introduction')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:privacy.intro.text', 'Welcome to BalkanEstate ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.')}
            </p>
          </section>

          {/* Information We Collect */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:privacy.collect.title', 'Information We Collect')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:privacy.collect.text', 'We collect information that you provide directly to us, as well as information collected automatically when you use our services.')}
            </p>

            <h3 className="font-semibold text-gray-800 mb-2">
              {t('legal:privacy.collect.personal.title', 'Personal Information')}
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mb-4 ml-4">
              <li>{t('legal:privacy.collect.personal.name', 'Name and contact information (email, phone number)')}</li>
              <li>{t('legal:privacy.collect.personal.account', 'Account credentials (username, password)')}</li>
              <li>{t('legal:privacy.collect.personal.profile', 'Profile information (photo, bio, preferences)')}</li>
              <li>{t('legal:privacy.collect.personal.payment', 'Payment information (processed securely via Stripe)')}</li>
              <li>{t('legal:privacy.collect.personal.communication', 'Communications and messages you send through our platform')}</li>
            </ul>

            <h3 className="font-semibold text-gray-800 mb-2">
              {t('legal:privacy.collect.auto.title', 'Automatically Collected Information')}
            </h3>
            <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
              <li>{t('legal:privacy.collect.auto.device', 'Device information (browser type, operating system)')}</li>
              <li>{t('legal:privacy.collect.auto.ip', 'IP address and approximate location')}</li>
              <li>{t('legal:privacy.collect.auto.usage', 'Usage data (pages visited, time spent, search queries)')}</li>
              <li>{t('legal:privacy.collect.auto.cookies', 'Cookies and similar tracking technologies')}</li>
            </ul>
          </section>

          {/* How We Use Your Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:privacy.use.title', 'How We Use Your Information')}
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>{t('legal:privacy.use.provide', 'To provide and maintain our services')}</li>
              <li>{t('legal:privacy.use.account', 'To create and manage your account')}</li>
              <li>{t('legal:privacy.use.communicate', 'To communicate with you about properties, inquiries, and updates')}</li>
              <li>{t('legal:privacy.use.process', 'To process transactions and subscriptions')}</li>
              <li>{t('legal:privacy.use.improve', 'To analyze and improve our services')}</li>
              <li>{t('legal:privacy.use.personalize', 'To personalize your experience and show relevant properties')}</li>
              <li>{t('legal:privacy.use.protect', 'To detect and prevent fraud and abuse')}</li>
              <li>{t('legal:privacy.use.legal', 'To comply with legal obligations')}</li>
            </ul>
          </section>

          {/* Sharing Your Information */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:privacy.share.title', 'Sharing Your Information')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:privacy.share.text', 'We may share your information in the following circumstances:')}
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li><strong>{t('legal:privacy.share.agents', 'With Property Agents:')}</strong> {t('legal:privacy.share.agentsDesc', 'When you inquire about a property, your contact information is shared with the listing agent.')}</li>
              <li><strong>{t('legal:privacy.share.providers', 'Service Providers:')}</strong> {t('legal:privacy.share.providersDesc', 'We work with third parties for payment processing (Stripe), email services, and analytics.')}</li>
              <li><strong>{t('legal:privacy.share.legal', 'Legal Requirements:')}</strong> {t('legal:privacy.share.legalDesc', 'When required by law or to protect our rights.')}</li>
              <li><strong>{t('legal:privacy.share.business', 'Business Transfers:')}</strong> {t('legal:privacy.share.businessDesc', 'In connection with a merger, acquisition, or sale of assets.')}</li>
            </ul>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:privacy.security.title', 'Data Security')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:privacy.security.text', 'We implement appropriate technical and organizational security measures to protect your personal information. This includes encryption of data in transit and at rest, secure authentication, and regular security audits. However, no method of transmission over the Internet is 100% secure.')}
            </p>
          </section>

          {/* Your Rights */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:privacy.rights.title', 'Your Rights')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:privacy.rights.text', 'Depending on your location, you may have the following rights:')}
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>{t('legal:privacy.rights.access', 'Access and receive a copy of your personal data')}</li>
              <li>{t('legal:privacy.rights.correct', 'Correct inaccurate or incomplete data')}</li>
              <li>{t('legal:privacy.rights.delete', 'Request deletion of your personal data')}</li>
              <li>{t('legal:privacy.rights.restrict', 'Restrict or object to processing')}</li>
              <li>{t('legal:privacy.rights.portability', 'Data portability')}</li>
              <li>{t('legal:privacy.rights.withdraw', 'Withdraw consent at any time')}</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              {t('legal:privacy.rights.contact', 'To exercise these rights, please contact us at privacy@balkanestate.com')}
            </p>
          </section>

          {/* Data Retention */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:privacy.retention.title', 'Data Retention')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:privacy.retention.text', 'We retain your personal information for as long as necessary to provide our services, comply with legal obligations, resolve disputes, and enforce our agreements. When you delete your account, we will delete or anonymize your personal data within 30 days, unless retention is required by law.')}
            </p>
          </section>

          {/* International Transfers */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:privacy.transfers.title', 'International Data Transfers')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:privacy.transfers.text', 'Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers in accordance with applicable data protection laws.')}
            </p>
          </section>

          {/* Children's Privacy */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:privacy.children.title', "Children's Privacy")}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:privacy.children.text', 'Our services are not intended for individuals under 18 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.')}
            </p>
          </section>

          {/* Changes to Policy */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:privacy.changes.title', 'Changes to This Policy')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:privacy.changes.text', 'We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last Updated" date. Your continued use of our services after any changes constitutes acceptance of the updated policy.')}
            </p>
          </section>

          {/* Contact Us */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:privacy.contact.title', 'Contact Us')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:privacy.contact.text', 'If you have questions about this Privacy Policy or our data practices, please contact us:')}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-gray-700"><strong>BalkanEstate</strong></p>
              <p className="text-gray-700">Email: privacy@balkanestate.com</p>
              <p className="text-gray-700">Phone: +389 71 967 915</p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
