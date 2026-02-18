import React from 'react';
import PaymentWindow from '@/components/shared/PaymentWindow';
import Footer from '@/components/shared/Footer';
import {
  FloatingSphere,
  GlossyPill,
  AbstractBlob,
  GlassyDonut,
  SoftCone,
  Decorative3DStyles
} from '@/components/shared/Decorative3D';
import {
  PageTransition,
  Animated,
  SlideIn,
  FadeIn,
  Skeleton,
} from '@/src/components/ui/Animations';
import {
  ChartBarIcon,
  BoltIcon,
  ArrowLeftIcon,
  SparklesIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  LockClosedIcon,
} from '@/constants';
import { usePricingPage } from './usePricingPage';
import SellerPlansSection from './SellerPlansSection';
import BuyerPlansSection from './BuyerPlansSection';
import ListingPromotionSection from './ListingPromotionSection';
import AgencyFeatureSection from './AgencyFeatureSection';

const PricingPage: React.FC = () => {
  const {
    t,
    state,
    dispatch,
    activeTab,
    setActiveTab,
    showPaymentWindow,
    setShowPaymentWindow,
    selectedPlan,
    setSelectedPlan,
    showContactOptions,
    setShowContactOptions,
    selectedPromoTier,
    setSelectedPromoTier,
    selectedListing,
    setSelectedListing,
    selectedDuration,
    setSelectedDuration,
    selectedAgencyDuration,
    setSelectedAgencyDuration,
    loading,
    error,
    userListings,
    loadingListings,
    isRefetching,
    salesEmail,
    salesPhone,
    products,
    enterpriseProduct,
    proYearlyProduct,
    proMonthlyProduct,
    buyerProduct,
    agencyFeaturePlans,
    loadingPlans,
    getPromotionPrice,
    getAgencyPrice,
    getUserRole,
    handleBack,
    handleLegalNavigation,
    handlePlanSelection,
    handlePaymentSuccess,
    handlePaymentError,
    handlePromoteListing,
    handleSelectListingForPromotion,
    handlePurchasePromotion,
    handleAgencyFeature,
    isActivePlan,
    isPlanDisabled,
  } = usePricingPage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 pb-safe relative">
      {/* 3D Decorative Background Elements - fixed positioning so they don't block scroll */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Top right sphere */}
        <div className="absolute -top-10 right-[5%] opacity-40 hidden lg:block">
          <FloatingSphere size="xl" color="cyan" />
        </div>

        {/* Bottom left sphere */}
        <div className="absolute bottom-[20%] -left-10 opacity-30 hidden lg:block">
          <FloatingSphere size="lg" color="pink" animate={false} />
        </div>

        {/* Abstract blob - top left */}
        <div className="absolute top-[15%] left-[8%] opacity-20 hidden xl:block">
          <AbstractBlob variant={2} color="purple" />
        </div>

        {/* Glossy pill - right side */}
        <div className="absolute top-[40%] -right-6 opacity-25 hidden lg:block rotate-[-15deg]">
          <GlossyPill orientation="vertical" size="lg" color="blue" />
        </div>

        {/* Donut shape - bottom */}
        <div className="absolute bottom-[10%] right-[20%] opacity-25 hidden xl:block">
          <GlassyDonut size="lg" color="purple" />
        </div>

        {/* Soft cone - left */}
        <div className="absolute bottom-[35%] left-[3%] opacity-30 hidden lg:block">
          <SoftCone size="lg" color="peach" />
        </div>

        {/* Small accent spheres */}
        <div className="absolute top-[60%] right-[30%] opacity-35 hidden md:block">
          <FloatingSphere size="sm" color="purple" />
        </div>

        {/* Gradient overlays */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-blue-200/20 via-purple-200/10 to-transparent rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-tl from-pink-200/15 via-rose-200/10 to-transparent rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '2s' }} />
      </div>

      {/* Include 3D animation styles */}
      <Decorative3DStyles />

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-10 relative">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-1.5 sm:gap-2 text-gray-600 hover:text-gray-900 transition-colors p-1 -ml-1"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="font-medium text-sm sm:text-base">{t('common:back', 'Back')}</span>
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-bold text-gray-900">{t('pricing:pageTitle', 'Pricing Plans')}</h1>
              {isRefetching && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" title="Updating..." />
              )}
            </div>
            <div className="w-16 sm:w-20" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-16">
          {/* Hero Section */}
          <div className="text-center mb-8 sm:mb-12">
            <SlideIn direction="down" duration="normal">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                <SparklesIcon className="w-4 h-4" />
                <span>{t('pricing:simpleTransparent', 'Simple, transparent pricing')}</span>
              </div>
            </SlideIn>
            <Animated variant="fadeInUp" delay={100}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight">
                {t('pricing:title', 'Choose Your Plan')}
              </h2>
            </Animated>
            <Animated variant="fadeInUp" delay={200}>
              <p className="mt-4 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                {t('pricing:subtitle', 'Get your property in front of thousands of potential buyers with our flexible pricing options.')}
              </p>
            </Animated>
          </div>

        {/* Tab Switcher - Clean Pill Style */}
        <div className="flex justify-center mb-10 sm:mb-14">
          {/* Desktop: Single row with all tabs */}
          <div className="hidden sm:inline-flex bg-gray-100 p-1.5 rounded-full shadow-lg">
            {[
              {
                value: 'seller',
                label: t('pricing:tabs.forSellers', 'For Sellers'),
                icon: (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                ),
              },
              {
                value: 'buyer',
                label: t('pricing:tabs.forBuyers', 'For Buyers'),
                icon: (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                ),
              },
              {
                value: 'listing',
                label: t('pricing:tabs.listingHighlight', 'Highlight'),
                icon: (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ),
              },
              {
                value: 'agency',
                label: t('pricing:tabs.agencyFeature', 'Agency'),
                icon: (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                ),
              },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value as 'seller' | 'buyer' | 'listing' | 'agency')}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.value
                    ? 'bg-white text-gray-900 shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Mobile: Stacked 2x2 grid for better touch targets */}
          <div className="sm:hidden w-full max-w-sm">
            <div className="bg-gray-100 p-1.5 rounded-2xl shadow-lg">
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 'seller', label: t('pricing:tabs.forSellers', 'For Sellers') },
                  { value: 'buyer', label: t('pricing:tabs.forBuyers', 'For Buyers') },
                  { value: 'listing', label: t('pricing:tabs.listingHighlight', 'Highlight') },
                  { value: 'agency', label: t('pricing:tabs.agencyFeature', 'Agency') },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setActiveTab(tab.value as 'seller' | 'buyer' | 'listing' | 'agency')}
                    className={`py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      activeTab === tab.value
                        ? 'bg-white text-gray-900 shadow-md'
                        : 'text-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

          {/* Loading State with Skeletons */}
          {loading && (
            <FadeIn>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-3xl p-6 shadow-lg" style={{ animationDelay: `${i * 100}ms` }}>
                    <Skeleton variant="rectangular" height={24} className="rounded-lg mb-4 w-1/2 mx-auto" />
                    <Skeleton variant="text" className="w-3/4 mx-auto mb-2" />
                    <Skeleton variant="rectangular" height={48} className="rounded-lg w-2/3 mx-auto my-6" />
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <Skeleton variant="rounded" height={60} />
                      <Skeleton variant="rounded" height={60} />
                    </div>
                    <div className="space-y-3">
                      {[1, 2, 3, 4].map((j) => (
                        <Skeleton key={j} variant="text" className={j === 4 ? 'w-1/2' : 'w-full'} />
                      ))}
                    </div>
                    <Skeleton variant="rounded" height={48} className="mt-6" />
                  </div>
                ))}
              </div>
            </FadeIn>
          )}

          {/* Error State */}
          {error && (
            <Animated variant="scaleIn">
              <div className="text-center py-20">
                <div className="bg-red-50 rounded-2xl p-8 max-w-md mx-auto">
                  <p className="text-red-600 font-medium">{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-6 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                  >
                    {t('common:tryAgain', 'Try Again')}
                  </button>
                </div>
              </div>
            </Animated>
          )}

          {/* Seller Plans */}
          {!loading && !error && activeTab === 'seller' && (
            <SellerPlansSection
              t={t}
              proYearlyProduct={proYearlyProduct}
              proMonthlyProduct={proMonthlyProduct}
              enterpriseProduct={enterpriseProduct}
              onPlanSelection={handlePlanSelection}
              isActivePlan={isActivePlan}
              isPlanDisabled={isPlanDisabled}
            />
          )}

          {/* Buyer Plans */}
          {!loading && !error && activeTab === 'buyer' && (
            <BuyerPlansSection
              t={t}
              buyerProduct={buyerProduct}
              onPlanSelection={handlePlanSelection}
              isActivePlan={isActivePlan}
              isPlanDisabled={isPlanDisabled}
            />
          )}

          {/* Listing Highlight / Promotion */}
          {activeTab === 'listing' && (
            <ListingPromotionSection
              t={t}
              dispatch={dispatch}
              isAuthenticated={state.isAuthenticated}
              selectedPromoTier={selectedPromoTier}
              setSelectedPromoTier={setSelectedPromoTier}
              selectedListing={selectedListing}
              setSelectedListing={setSelectedListing}
              selectedDuration={selectedDuration}
              setSelectedDuration={setSelectedDuration}
              loadingListings={loadingListings}
              userListings={userListings}
              getPromotionPrice={getPromotionPrice}
              onPromoteListing={handlePromoteListing}
              onSelectListingForPromotion={handleSelectListingForPromotion}
              onPurchasePromotion={handlePurchasePromotion}
            />
          )}

          {/* Agency Feature */}
          {activeTab === 'agency' && (
            <AgencyFeatureSection
              t={t}
              currentUserAgencyId={state.currentUser?.agencyId}
              agencyFeaturePlans={agencyFeaturePlans}
              loadingPlans={loadingPlans}
              getAgencyPrice={getAgencyPrice}
              selectedAgencyDuration={selectedAgencyDuration}
              setSelectedAgencyDuration={setSelectedAgencyDuration}
              onAgencyFeature={handleAgencyFeature}
              onSetActiveTab={setActiveTab}
            />
          )}

          {/* No Products */}
          {!loading && !error && products.length === 0 && (
            <div className="text-center py-20">
              <div className="bg-gray-50 rounded-2xl p-8 max-w-md mx-auto">
                <p className="text-gray-600">{t('pricing:noPlans', 'No pricing plans available. Please run the seed script.')}</p>
              </div>
            </div>
          )}

          {/* Trust Badges */}
          <div className="mt-16 sm:mt-20">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <Animated variant="fadeInUp" delay={0} className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100 hover-lift">
                <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center mb-4">
                  <ShieldCheckIcon className="w-7 h-7 text-green-600" />
                </div>
                <h4 className="font-bold text-gray-900">{t('pricing:benefits.moneyBack', '30-Day Money Back')}</h4>
                <p className="text-sm text-gray-600 mt-1">{t('pricing:benefits.moneyBackDesc', 'Full refund if not satisfied')}</p>
              </Animated>
              <Animated variant="fadeInUp" delay={100} className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100 hover-lift">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                  <ChartBarIcon className="w-7 h-7 text-blue-600" />
                </div>
                <h4 className="font-bold text-gray-900">{t('pricing:benefits.moreViews', '3x More Views')}</h4>
                <p className="text-sm text-gray-600 mt-1">{t('pricing:benefits.moreViewsDesc', 'Premium listings get more exposure')}</p>
              </Animated>
              <Animated variant="fadeInUp" delay={200} className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/50 backdrop-blur-sm border border-gray-100 hover-lift">
                <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
                  <BoltIcon className="w-7 h-7 text-amber-600" />
                </div>
                <h4 className="font-bold text-gray-900">{t('pricing:benefits.instantActivation', 'Instant Activation')}</h4>
                <p className="text-sm text-gray-600 mt-1">{t('pricing:benefits.instantActivationDesc', 'Start selling immediately')}</p>
              </Animated>
            </div>
          </div>

          {/* Legal Links - Required for Payment Provider Domain Approval */}
          <div className="mt-12 sm:mt-16">
            <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 rounded-2xl border border-gray-200 p-6 sm:p-8 max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-2 mb-4">
                <LockClosedIcon className="w-5 h-5 text-gray-500" />
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                  {t('pricing:legal.title', 'Secure Payments & Policies')}
                </h4>
              </div>
              <p className="text-sm text-gray-600 text-center mb-6">
                {t('pricing:legal.description', 'All payments are processed securely by LemonSqueezy. By subscribing, you agree to our policies:')}
              </p>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
                <button
                  onClick={() => handleLegalNavigation('terms')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
                >
                  <DocumentTextIcon className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary">
                    {t('pricing:legal.termsOfService', 'Terms of Service')}
                  </span>
                </button>
                <button
                  onClick={() => handleLegalNavigation('privacy')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
                >
                  <LockClosedIcon className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary">
                    {t('pricing:legal.privacyPolicy', 'Privacy Policy')}
                  </span>
                </button>
                <button
                  onClick={() => handleLegalNavigation('refund')}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white rounded-xl border border-gray-200 hover:border-primary hover:bg-primary/5 transition-all duration-200 group"
                >
                  <ShieldCheckIcon className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                  <span className="text-sm font-medium text-gray-700 group-hover:text-primary">
                    {t('pricing:legal.refundPolicy', 'Refund Policy')}
                  </span>
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center mt-4">
                {t('pricing:legal.providerNote', 'Payments handled by LemonSqueezy as Merchant of Record. VAT/taxes included where applicable.')}
              </p>
            </div>
          </div>

          {/* Coupon CTA + Contact */}
          <div className="mt-16 text-center">
            {/* Coupon Banner */}
            <div className="max-w-lg mx-auto mb-8">
              <div className="bg-gradient-to-r from-primary/5 via-indigo-50 to-primary/5 border border-primary/20 rounded-2xl p-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
                  </svg>
                  <h3 className="text-lg font-bold text-gray-900">
                    {t('pricing:coupon.title', 'Do you have a coupon from the seller?')}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {t('pricing:coupon.description', 'Select any plan above and use your coupon code to activate your subscription instantly.')}
                </p>
                <button
                  onClick={() => {
                    // Scroll to plans section smoothly
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-indigo-600 text-white font-semibold rounded-xl hover:from-primary-dark hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l7.5-7.5 7.5 7.5m-15 6l7.5-7.5 7.5 7.5" />
                  </svg>
                  {t('pricing:coupon.selectPlan', 'Select a plan to use your coupon')}
                </button>
              </div>
            </div>

            <p className="text-gray-600 mb-4">
              {t('pricing:contact.haveQuestions', 'Have questions?')}
            </p>
            <div className="relative inline-block">
              <button
                onClick={() => setShowContactOptions(!showContactOptions)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors shadow-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {t('pricing:contact.contactSales', 'Contact our sales team')}
                <svg className={`w-4 h-4 transition-transform ${showContactOptions ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Contact popup - positioned above button with smooth fade */}
              <div
                className={`absolute bottom-full left-1/2 mb-2 bg-white rounded-xl shadow-xl border border-gray-200 py-2 min-w-[280px] z-20 transition-all duration-200 ease-out ${
                  showContactOptions
                    ? 'opacity-100 visible -translate-x-1/2 translate-y-0'
                    : 'opacity-0 invisible -translate-x-1/2 translate-y-2 pointer-events-none'
                }`}
              >
                <a
                  href={`mailto:${salesEmail}?subject=BalkanEstate%20Pricing%20Inquiry`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{t('pricing:contact.sendEmail', 'Send us an email')}</p>
                    <p className="text-xs text-gray-500">{salesEmail}</p>
                  </div>
                </a>
                <a
                  href={`tel:${salesPhone.replace(/\s/g, '')}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-gray-900">{t('pricing:contact.giveCall', 'Give us a call')}</p>
                    <p className="text-xs text-gray-500">{salesPhone}</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </PageTransition>

      <Footer />

      {/* Payment Window */}
      {selectedPlan && (
        <PaymentWindow
          isOpen={showPaymentWindow}
          onClose={() => {
            setShowPaymentWindow(false);
            setSelectedPlan(null);
          }}
          planName={selectedPlan.name}
          planPrice={selectedPlan.price}
          planInterval={selectedPlan.interval}
          userRole={getUserRole()}
          userEmail={state.currentUser?.email}
          userCountry={state.currentUser?.country || 'RS'}
          onSuccess={handlePaymentSuccess}
          onError={handlePaymentError}
          productId={selectedPlan.productId}
        />
      )}
    </div>
  );
};

export default PricingPage;
