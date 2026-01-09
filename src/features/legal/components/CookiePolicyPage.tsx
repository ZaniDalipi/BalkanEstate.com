import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';

const CookiePolicyPage: React.FC = () => {
  const { t } = useTranslation(['legal', 'common']);
  const { dispatch } = useAppContext();

  const handleBack = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
    window.history.pushState({}, '', '/');
  };

  const handleManageCookies = () => {
    // Clear consent to re-show the banner
    localStorage.removeItem('balkanestate_cookie_consent');
    window.location.reload();
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
            {t('legal:cookies.title', 'Cookie Policy')}
          </h1>
          <p className="text-gray-600">
            {t('legal:cookies.lastUpdated', 'Last updated')}: {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:cookies.intro.title', 'What Are Cookies?')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:cookies.intro.text', 'Cookies are small text files that are stored on your device when you visit a website. They help websites remember your preferences, understand how you use the site, and improve your experience. This Cookie Policy explains how BalkanEstate uses cookies and similar technologies.')}
            </p>
          </section>

          {/* Why We Use Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:cookies.why.title', 'Why We Use Cookies')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:cookies.why.text', 'We use cookies to:')}
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>{t('legal:cookies.why.essential', 'Keep you signed in to your account')}</li>
              <li>{t('legal:cookies.why.preferences', 'Remember your language and currency preferences')}</li>
              <li>{t('legal:cookies.why.searches', 'Save your recent searches and viewed properties')}</li>
              <li>{t('legal:cookies.why.analytics', 'Understand how you use our site to improve it')}</li>
              <li>{t('legal:cookies.why.security', 'Protect your account and prevent fraud')}</li>
              <li>{t('legal:cookies.why.ads', 'Show you relevant advertisements (if you consent)')}</li>
            </ul>
          </section>

          {/* Types of Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:cookies.types.title', 'Types of Cookies We Use')}
            </h2>

            {/* Essential Cookies */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <h3 className="font-semibold text-gray-900">
                  {t('legal:cookies.types.essential.title', 'Essential Cookies')}
                </h3>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium ml-auto">
                  {t('legal:cookies.types.essential.required', 'Required')}
                </span>
              </div>
              <p className="text-gray-700 text-sm mb-3">
                {t('legal:cookies.types.essential.desc', 'These cookies are necessary for the website to function properly. They enable basic features like authentication, security, and accessibility. You cannot disable these cookies.')}
              </p>
              <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-mono text-gray-600">auth_token</span>
                  <span className="text-gray-500">{t('legal:cookies.types.essential.auth', 'Keeps you logged in')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-gray-600">session_id</span>
                  <span className="text-gray-500">{t('legal:cookies.types.essential.session', 'Maintains your session')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-gray-600">csrf_token</span>
                  <span className="text-gray-500">{t('legal:cookies.types.essential.csrf', 'Security protection')}</span>
                </div>
              </div>
            </div>

            {/* Functional Cookies */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <h3 className="font-semibold text-gray-900">
                  {t('legal:cookies.types.functional.title', 'Functional Cookies')}
                </h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium ml-auto">
                  {t('legal:cookies.types.functional.optional', 'Optional')}
                </span>
              </div>
              <p className="text-gray-700 text-sm mb-3">
                {t('legal:cookies.types.functional.desc', 'These cookies remember your preferences and settings to provide a better experience. Disabling them may affect some website features.')}
              </p>
              <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-mono text-gray-600">language</span>
                  <span className="text-gray-500">{t('legal:cookies.types.functional.language', 'Your language preference')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-gray-600">currency</span>
                  <span className="text-gray-500">{t('legal:cookies.types.functional.currency', 'Your currency preference')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-gray-600">recent_searches</span>
                  <span className="text-gray-500">{t('legal:cookies.types.functional.searches', 'Your recent searches')}</span>
                </div>
              </div>
            </div>

            {/* Analytics Cookies */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <h3 className="font-semibold text-gray-900">
                  {t('legal:cookies.types.analytics.title', 'Analytics Cookies')}
                </h3>
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium ml-auto">
                  {t('legal:cookies.types.analytics.optional', 'Optional')}
                </span>
              </div>
              <p className="text-gray-700 text-sm mb-3">
                {t('legal:cookies.types.analytics.desc', 'These cookies help us understand how visitors use our website. They collect anonymous data about page views, traffic sources, and user behavior.')}
              </p>
              <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-mono text-gray-600">_ga</span>
                  <span className="text-gray-500">{t('legal:cookies.types.analytics.ga', 'Google Analytics')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-gray-600">_gid</span>
                  <span className="text-gray-500">{t('legal:cookies.types.analytics.gid', 'Google Analytics session')}</span>
                </div>
              </div>
            </div>

            {/* Marketing Cookies */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <h3 className="font-semibold text-gray-900">
                  {t('legal:cookies.types.marketing.title', 'Marketing Cookies')}
                </h3>
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium ml-auto">
                  {t('legal:cookies.types.marketing.optional', 'Optional')}
                </span>
              </div>
              <p className="text-gray-700 text-sm mb-3">
                {t('legal:cookies.types.marketing.desc', 'These cookies track your activity across websites to show you relevant advertisements. They are set by our advertising partners.')}
              </p>
              <div className="bg-white rounded-lg p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-mono text-gray-600">_fbp</span>
                  <span className="text-gray-500">{t('legal:cookies.types.marketing.fb', 'Facebook Pixel')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-mono text-gray-600">ads_session</span>
                  <span className="text-gray-500">{t('legal:cookies.types.marketing.ads', 'Ad campaign tracking')}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Managing Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:cookies.manage.title', 'Managing Your Cookie Preferences')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:cookies.manage.text', 'You can manage your cookie preferences at any time. Click the button below to update your settings or use your browser settings to control cookies.')}
            </p>
            <button
              onClick={handleManageCookies}
              className="px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors shadow-sm"
            >
              {t('legal:cookies.manage.button', 'Manage Cookie Preferences')}
            </button>
          </section>

          {/* Browser Settings */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:cookies.browser.title', 'Browser Cookie Settings')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:cookies.browser.text', 'Most browsers allow you to control cookies through their settings. Here are links to manage cookies in popular browsers:')}
            </p>
            <ul className="space-y-2 ml-4">
              <li>
                <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Google Chrome
                </a>
              </li>
              <li>
                <a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Safari
                </a>
              </li>
              <li>
                <a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  Microsoft Edge
                </a>
              </li>
            </ul>
          </section>

          {/* Third-Party Cookies */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:cookies.thirdParty.title', 'Third-Party Cookies')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:cookies.thirdParty.text', 'Some cookies on our site are set by third-party services we use, such as Google Analytics for website analytics and Stripe for payment processing. These services have their own privacy policies governing how they use your data.')}
            </p>
          </section>

          {/* Updates */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:cookies.updates.title', 'Updates to This Policy')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:cookies.updates.text', 'We may update this Cookie Policy from time to time to reflect changes in our practices or for legal reasons. We will notify you of significant changes by posting a notice on our website.')}
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:cookies.contact.title', 'Contact Us')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:cookies.contact.text', 'If you have questions about our use of cookies, please contact us:')}
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

export default CookiePolicyPage;
