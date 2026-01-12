import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import Footer from '@/components/shared/Footer';

const RefundPolicyPage: React.FC = () => {
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
            {t('legal:refund.title', 'Refund Policy')}
          </h1>
          <p className="text-gray-600">
            {t('legal:refund.lastUpdated', 'Last updated')}: {lastUpdated}
          </p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 space-y-8">
          {/* Introduction */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:refund.intro.title', 'Our Commitment')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:refund.intro.text', 'At BalkanEstate AI, we want you to be completely satisfied with your subscription. If you are not satisfied with our services, we offer refunds based on your subscription type. This policy outlines the terms and conditions for requesting a refund.')}
            </p>
          </section>

          {/* Refund Periods */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:refund.guarantee.title', 'Refund Periods')}
            </h2>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h4 className="text-green-800 font-semibold mb-1">Monthly Subscriptions</h4>
                <p className="text-green-700 text-2xl font-bold">7 Days</p>
                <p className="text-green-600 text-sm">Full refund within 7 days of purchase</p>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="text-blue-800 font-semibold mb-1">Yearly Subscriptions</h4>
                <p className="text-blue-700 text-2xl font-bold">30 Days</p>
                <p className="text-blue-600 text-sm">Full refund within 30 days of purchase</p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:refund.guarantee.text', 'If you are not satisfied with your subscription for any reason, you can request a full refund within the applicable refund period. This guarantee applies to:')}
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>{t('legal:refund.guarantee.newSub', 'New subscription purchases')}</li>
              <li>{t('legal:refund.guarantee.upgrade', 'Plan upgrades (refund for the difference paid)')}</li>
              <li>{t('legal:refund.guarantee.firstTime', 'First-time subscribers')}</li>
            </ul>
          </section>

          {/* Eligibility */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:refund.eligibility.title', 'Refund Eligibility')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:refund.eligibility.text', 'You are eligible for a refund if:')}
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>{t('legal:refund.eligibility.withinPeriod', 'Your request is made within 7 days (monthly) or 30 days (yearly) of the original purchase')}</li>
              <li>{t('legal:refund.eligibility.firstPurchase', 'It is your first subscription with BalkanEstate AI')}</li>
              <li>{t('legal:refund.eligibility.notAbused', 'The refund policy has not been previously used by you')}</li>
              <li>{t('legal:refund.eligibility.goodFaith', 'You have used the service in good faith')}</li>
            </ul>
          </section>

          {/* Non-Refundable */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:refund.nonRefundable.title', 'Non-Refundable Situations')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:refund.nonRefundable.text', 'Refunds are not available in the following cases:')}
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>{t('legal:refund.nonRefundable.afterPeriod', 'Requests made after the refund period (7 days for monthly, 30 days for yearly)')}</li>
              <li>{t('legal:refund.nonRefundable.renewal', 'Automatic subscription renewals (you should cancel before renewal date)')}</li>
              <li>{t('legal:refund.nonRefundable.abuse', 'Accounts terminated due to Terms of Service violations')}</li>
              <li>{t('legal:refund.nonRefundable.repeat', 'Repeat refund requests (one refund per user)')}</li>
              <li>{t('legal:refund.nonRefundable.partial', 'Partial usage after the refund window has expired')}</li>
            </ul>
          </section>

          {/* How to Request */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:refund.howTo.title', 'How to Request a Refund')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:refund.howTo.text', 'To request a refund, please follow these steps:')}
            </p>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold">1</div>
                <div>
                  <h4 className="font-semibold text-gray-800">{t('legal:refund.howTo.step1.title', 'Send an Email')}</h4>
                  <p className="text-gray-600">{t('legal:refund.howTo.step1.text', 'Email us at refunds@balkanestateai.com with the subject line "Refund Request"')}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold">2</div>
                <div>
                  <h4 className="font-semibold text-gray-800">{t('legal:refund.howTo.step2.title', 'Include Your Details')}</h4>
                  <p className="text-gray-600">{t('legal:refund.howTo.step2.text', 'Include your account email address, subscription plan, purchase date, and reason for the refund (optional)')}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold">3</div>
                <div>
                  <h4 className="font-semibold text-gray-800">{t('legal:refund.howTo.step3.title', 'Wait for Confirmation')}</h4>
                  <p className="text-gray-600">{t('legal:refund.howTo.step3.text', 'We will review your request and respond within 2-3 business days')}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center font-semibold">4</div>
                <div>
                  <h4 className="font-semibold text-gray-800">{t('legal:refund.howTo.step4.title', 'Receive Your Refund')}</h4>
                  <p className="text-gray-600">{t('legal:refund.howTo.step4.text', 'Once approved, refunds are processed within 5-10 business days to your original payment method')}</p>
                </div>
              </div>
            </div>
          </section>

          {/* Refund Request Form Alternative */}
          <section>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                {t('legal:refund.contact.title', 'Request a Refund Now')}
              </h3>
              <p className="text-blue-800 mb-4">
                {t('legal:refund.contact.text', 'Ready to request a refund? Contact our support team:')}
              </p>
              <div className="space-y-2">
                <p className="text-blue-900">
                  <strong>Email:</strong>{' '}
                  <a href="mailto:refunds@balkanestateai.com" className="underline hover:no-underline">
                    refunds@balkanestateai.com
                  </a>
                </p>
                <p className="text-blue-900">
                  <strong>Phone:</strong> +389 71 967 915
                </p>
                <p className="text-blue-900 text-sm mt-2">
                  {t('legal:refund.contact.response', 'We typically respond within 24-48 hours during business days.')}
                </p>
              </div>
            </div>
          </section>

          {/* Processing Time */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:refund.processing.title', 'Refund Processing')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:refund.processing.text', 'Refunds are processed by Paddle, our Merchant of Record. Here is what to expect:')}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-700">{t('legal:refund.processing.review', 'Review time')}</span>
                <span className="font-medium text-gray-900">2-3 business days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">{t('legal:refund.processing.process', 'Processing time')}</span>
                <span className="font-medium text-gray-900">5-10 business days</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700">{t('legal:refund.processing.bank', 'Bank processing')}</span>
                <span className="font-medium text-gray-900">Varies by bank (up to 10 days)</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm mt-4">
              {t('legal:refund.processing.note', 'Note: Refund timing may vary depending on your payment method and financial institution.')}
            </p>
          </section>

          {/* Paddle as MoR */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:refund.paddle.title', 'Payment Processing')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:refund.paddle.text', 'All payments and refunds are processed by Paddle.com, our Merchant of Record. Paddle handles payment processing, tax compliance, and refund disbursements on our behalf. When you receive a refund, it will appear on your statement from Paddle. For any payment-related inquiries, you may also contact Paddle directly, though we recommend contacting us first for the fastest resolution.')}
            </p>
          </section>

          {/* Cancellation vs Refund */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:refund.cancellation.title', 'Cancellation vs. Refund')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:refund.cancellation.text', 'Please note the difference between cancellation and refund:')}
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">{t('legal:refund.cancellation.cancel', 'Cancellation')}</h4>
                <p className="text-gray-600 text-sm">{t('legal:refund.cancellation.cancelDesc', 'Stops future billing. You retain access until the end of your current billing period. No refund is issued.')}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">{t('legal:refund.cancellation.refund', 'Refund')}</h4>
                <p className="text-gray-600 text-sm">{t('legal:refund.cancellation.refundDesc', 'Returns your payment. Subscription is immediately terminated and access is revoked upon refund processing.')}</p>
              </div>
            </div>
          </section>

          {/* Prorated Refunds */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:refund.prorated.title', 'Prorated Refunds for Annual Plans')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:refund.prorated.text', 'For annual subscription plans, if you request a refund after the 30-day guarantee period but within the first 90 days, we may offer a prorated refund at our discretion, minus a processing fee. Please contact our support team to discuss your specific situation.')}
            </p>
          </section>

          {/* Disputes */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:refund.disputes.title', 'Disputes and Chargebacks')}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {t('legal:refund.disputes.text', 'We encourage you to contact us directly before filing a dispute with your bank or credit card company. Chargebacks are costly and time-consuming for both parties. We are committed to resolving any issues fairly and quickly. If you file a chargeback without first contacting us, your account may be suspended pending investigation.')}
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">
              {t('legal:refund.contactUs.title', 'Contact Us')}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              {t('legal:refund.contactUs.text', 'If you have any questions about our refund policy or need assistance, please contact us:')}
            </p>
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <p className="text-gray-700"><strong>BalkanEstate AI</strong></p>
              <p className="text-gray-700">Refunds: <a href="mailto:refunds@balkanestateai.com" className="text-primary hover:underline">refunds@balkanestateai.com</a></p>
              <p className="text-gray-700">Support: <a href="mailto:support@balkanestateai.com" className="text-primary hover:underline">support@balkanestateai.com</a></p>
              <p className="text-gray-700">Phone: +389 71 967 915</p>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default RefundPolicyPage;
