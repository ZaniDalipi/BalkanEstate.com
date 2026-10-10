import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type TermsStatus, acceptTerms, getTermsStatus } from '../api/listingSourceApi';

interface Props {
  /** Called once the user successfully accepts the terms. */
  onAccepted: (status: TermsStatus) => void;
}

/**
 * Full-page gate shown to users who haven't accepted the Listing Sources
 * alpha-feature terms. The modal cannot be dismissed without acceptance —
 * the only exit is the "I understand and accept" checkbox + button, or
 * navigating away from the page entirely.
 */
const ListingSourcesAlphaTerms: React.FC<Props> = ({ onAccepted }) => {
  const { t } = useTranslation(['listingFeeds', 'common']);
  const [checked, setChecked] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAccept = useCallback(async () => {
    if (!checked) return;
    setAccepting(true);
    setError(null);
    try {
      await acceptTerms();
      const status = await getTermsStatus();
      onAccepted(status);
    } catch (e) {
      setError((e as Error).message || 'Failed to record acceptance. Please try again.');
    } finally {
      setAccepting(false);
    }
  }, [checked, onAccepted]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Alpha badge + title */}
        <div className="flex items-center gap-3 mb-6">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold uppercase tracking-wider">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            {t('listingFeeds:ui.listingSourcesAlphaTerms.alpha', 'Alpha')}
          </span>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('listingFeeds:termsTitle', 'Listing Sources — Terms of Use')}
          </h2>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Warning banner */}
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex gap-3">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {t('listingFeeds:termsBetaWarning', 'This is an experimental alpha feature')}
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                {t('listingFeeds:termsBetaDescription',
                  'Listing Sources is under active development. Data may be incomplete, incorrect, or missing. You must review and correct all imported properties before publishing them.'
                )}
              </p>
            </div>
          </div>

          {/* Terms body */}
          <div className="px-6 py-5 space-y-5 text-sm text-gray-700 max-h-[50vh] overflow-y-auto">

            <Section title={t('listingFeeds:ui.listingSourcesAlphaTerms.n1AlphaBetaStatus', '1. Alpha / Beta Status')}>
              <p>
                {t('listingFeeds:ui.listingSourcesAlphaTerms.theListingSourcesFeatureIs', 'The Listing Sources feature is currently in')} <strong>{t('listingFeeds:ui.listingSourcesAlphaTerms.alphaTesting', 'alpha testing')}</strong> {t('listingFeeds:ui.listingSourcesAlphaTerms.andIsProvidedOnAn', 'and is provided on an')} <em>{t('listingFeeds:ui.listingSourcesAlphaTerms.asIsAsAvailable', '"as-is, as-available"')}</em> {t('listingFeeds:ui.listingSourcesAlphaTerms.basisFeaturesMayChangeBe', 'basis. Features may change, be removed, or behave unexpectedly without prior notice. BalkanEstate makes no guarantee of uptime, data completeness, or continued availability of this feature.')}
              </p>
            </Section>

            <Section title={t('listingFeeds:ui.listingSourcesAlphaTerms.n2NoWarrantyOnScraped', '2. No Warranty on Scraped Data')}>
              <p>
                {t('listingFeeds:ui.listingSourcesAlphaTerms.balkanestateDoes', 'BalkanEstate does')} <strong>{t('listingFeeds:ui.listingSourcesAlphaTerms.notVerifyValidateOrGuarantee', 'not verify, validate, or guarantee the accuracy')}</strong> {t('listingFeeds:ui.listingSourcesAlphaTerms.ofAnyDataImportedThrough', 'of any data imported through Listing Sources. Prices, dimensions, descriptions, images, and all other property details are retrieved automatically from third-party websites and may be:')}
              </p>
              <ul className="mt-2 ml-4 list-disc space-y-1 text-gray-600">
                <li>{t('listingFeeds:ui.listingSourcesAlphaTerms.inaccurateOutdatedOrIncomplete', 'Inaccurate, outdated, or incomplete')}</li>
                <li>{t('listingFeeds:ui.listingSourcesAlphaTerms.misattributedToTheWrongProperty', 'Misattributed to the wrong property or location')}</li>
                <li>{t('listingFeeds:ui.listingSourcesAlphaTerms.formattedIncorrectlyDueToParsing', 'Formatted incorrectly due to parsing limitations')}</li>
                <li>{t('listingFeeds:ui.listingSourcesAlphaTerms.missingKeyFieldsSuchAs', 'Missing key fields such as price, area, or address')}</li>
              </ul>
            </Section>

            <Section title={t('listingFeeds:ui.listingSourcesAlphaTerms.n3YourResponsibilityToReview', '3. Your Responsibility to Review and Correct')}>
              <p>
                <strong>{t('listingFeeds:ui.listingSourcesAlphaTerms.youAreSolelyResponsible', 'You are solely responsible')}</strong> {t('listingFeeds:ui.listingSourcesAlphaTerms.forReviewingEveryImportedProperty', 'for reviewing every imported property before it is published or presented to any third party. You must:')}
              </p>
              <ul className="mt-2 ml-4 list-disc space-y-1 text-gray-600">
                <li>{t('listingFeeds:ui.listingSourcesAlphaTerms.verifyAllPricesDimensionsAnd', 'Verify all prices, dimensions, and property details against the original source')}</li>
                <li>{t('listingFeeds:ui.listingSourcesAlphaTerms.correctAnyInaccuraciesMissingData', 'Correct any inaccuracies, missing data, or mis-parsed values')}</li>
                <li>{t('listingFeeds:ui.listingSourcesAlphaTerms.removeOrUnpublishAnyProperty', 'Remove or unpublish any property that does not meet your quality standards')}</li>
                <li>{t('listingFeeds:ui.listingSourcesAlphaTerms.ensureYourPublishedListingsComply', 'Ensure your published listings comply with applicable advertising laws')}</li>
              </ul>
            </Section>

            <Section title={t('listingFeeds:ui.listingSourcesAlphaTerms.n4LegalResponsibilityForScraping', '4. Legal Responsibility for Scraping')}>
              <p>
                {t('listingFeeds:ui.listingSourcesAlphaTerms.beforeAddingAWebsiteAs', 'Before adding a website as a Listing Source,')} <strong>{t('listingFeeds:ui.listingSourcesAlphaTerms.youMustEnsureYouHave', 'you must ensure you have the legal right to scrape and republish that site\'s content.')}</strong> {t('listingFeeds:ui.listingSourcesAlphaTerms.thisIncludesButIsNot', 'This includes but is not limited to:')}
              </p>
              <ul className="mt-2 ml-4 list-disc space-y-1 text-gray-600">
                <li>{t('listingFeeds:ui.listingSourcesAlphaTerms.reviewingAndComplyingWithThe', 'Reviewing and complying with the source website\'s Terms of Service')}</li>
                <li>{t('listingFeeds:ui.listingSourcesAlphaTerms.complyingWithAny', 'Complying with any')} <code className="bg-gray-100 px-1 rounded text-xs">robots.txt</code> {t('listingFeeds:ui.listingSourcesAlphaTerms.directivesThatProhibitAutomatedAccess', 'directives that prohibit automated access')}</li>
                <li>{t('listingFeeds:ui.listingSourcesAlphaTerms.obtainingPermissionWhereRequiredBefore', 'Obtaining permission where required before reproducing or redistributing listings')}</li>
              </ul>
              <p className="mt-2">
                {t('listingFeeds:ui.listingSourcesAlphaTerms.balkanestateAcceptsNoLiabilityFor', 'BalkanEstate accepts no liability for any claims arising from your use of scraped content. Any legal consequences of scraping a website are')} <strong>{t('listingFeeds:ui.listingSourcesAlphaTerms.yourSoleResponsibility', 'your sole responsibility.')}</strong>
              </p>
            </Section>

            <Section title={t('listingFeeds:ui.listingSourcesAlphaTerms.n5CopyrightAndIntellectualProperty', '5. Copyright and Intellectual Property')}>
              <p>
                {t('listingFeeds:ui.listingSourcesAlphaTerms.propertyListingsImagesDescriptionsAnd', 'Property listings, images, descriptions, and other content on third-party websites may be protected by copyright. You acknowledge that:')}
              </p>
              <ul className="mt-2 ml-4 list-disc space-y-1 text-gray-600">
                <li>{t('listingFeeds:ui.listingSourcesAlphaTerms.balkanestateDoesNotHoldOr', 'BalkanEstate does not hold or grant you any licence over third-party content')}</li>
                <li>{t('listingFeeds:ui.listingSourcesAlphaTerms.youAreResponsibleForEnsuring', 'You are responsible for ensuring your use of imported content is lawful')}</li>
                <li>{t('listingFeeds:ui.listingSourcesAlphaTerms.youWillPromptlyRemoveAny', 'You will promptly remove any content that you do not have the right to publish')}</li>
              </ul>
            </Section>

            <Section title={t('listingFeeds:ui.listingSourcesAlphaTerms.n6GdprAndPrivacy', '6. GDPR and Privacy')}>
              <p>
                {t('listingFeeds:ui.listingSourcesAlphaTerms.ifTheImportedDataIncludes', 'If the imported data includes personal information (e.g. contact details, agent names), you are a')} <strong>{t('listingFeeds:ui.listingSourcesAlphaTerms.dataController', 'data controller')}</strong> {t('listingFeeds:ui.listingSourcesAlphaTerms.underGdprAndEquivalentRegulations', 'under GDPR and equivalent regulations. You must have a lawful basis for processing that data and must comply with all applicable data-protection obligations.')}
              </p>
            </Section>

            <Section title={t('listingFeeds:ui.listingSourcesAlphaTerms.n7RateLimitingAndFair', '7. Rate Limiting and Fair Use')}>
              <p>
                {t('listingFeeds:ui.listingSourcesAlphaTerms.theToolIncludesConfigurableRate', 'The tool includes configurable rate-limiting. You must not use Listing Sources to conduct denial-of-service attacks or send excessive requests to any website. BalkanEstate reserves the right to suspend access to this feature if misuse is detected.')}
              </p>
            </Section>

            <Section title={t('listingFeeds:ui.listingSourcesAlphaTerms.n8NoLiability', '8. No Liability')}>
              <p>
                {t('listingFeeds:ui.listingSourcesAlphaTerms.toTheMaximumExtentPermitted', 'To the maximum extent permitted by applicable law, BalkanEstate, its officers, employees, and affiliates shall not be liable for any direct, indirect, incidental, special, or consequential damages arising from your use of the Listing Sources feature, including but not limited to: data loss, inaccurate listings, legal claims, or commercial losses.')}
              </p>
            </Section>

          </div>

          {/* Acceptance footer */}
          <div className="border-t border-gray-200 px-6 py-5 bg-gray-50">
            {error && (
              <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <label className="flex items-start gap-3 cursor-pointer group mb-5">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-primary focus:ring-2 focus:ring-primary/30 flex-shrink-0"
              />
              <span className="text-sm text-gray-700 leading-snug group-hover:text-gray-900">
                {t('listingFeeds:ui.listingSourcesAlphaTerms.iHaveReadAndUnderstood', 'I have read and understood these terms. I accept full responsibility for reviewing all imported data, ensuring I have the legal right to scrape and republish the content, and complying with all applicable laws and third-party terms of service.')}
              </span>
            </label>

            <button
              type="button"
              onClick={() => void handleAccept()}
              disabled={!checked || accepting}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {accepting && (
                <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              )}
              {t('listingFeeds:termsAcceptButton', 'I understand and accept — continue')}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              {t('listingFeeds:termsAcceptNote',
                'Your acceptance is logged with a timestamp for legal record-keeping purposes.'
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <h3 className="font-semibold text-gray-900 mb-1.5">{title}</h3>
    <div className="text-gray-600 space-y-1 leading-relaxed">{children}</div>
  </div>
);

export default ListingSourcesAlphaTerms;
