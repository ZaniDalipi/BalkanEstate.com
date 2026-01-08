import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/shared/Modal';
import PaymentWindow from '@/components/shared/PaymentWindow';
import { AtSymbolIcon, UserIcon, BuildingOfficeIcon, CheckCircleIcon } from '@/constants';
import { useAppContext } from '@/context/AppContext';
import { fetchBuyerProducts, Product } from '@/utils/api';
import { useNotification } from '@/shared/hooks/useNotification';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, initialEmail }) => {
  const { t } = useTranslation(['modals']);
  const { state, dispatch } = useAppContext();
  const { success, warning } = useNotification();
  const [activeTab, setActiveTab] = useState<'buyer' | 'seller'>('buyer');
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [email, setEmail] = useState(initialEmail || state.currentUser?.email || '');
  const [buyerProducts, setBuyerProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Update email when initialEmail changes
  useEffect(() => {
    if (initialEmail) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  // Fetch buyer products when modal opens
  useEffect(() => {
    if (isOpen && activeTab === 'buyer' && buyerProducts.length === 0) {
      const loadProducts = async () => {
        setLoading(true);
        const products = await fetchBuyerProducts();
        setBuyerProducts(products);
        setLoading(false);
      };
      loadProducts();
    }
  }, [isOpen, activeTab]);

  // Update URL when modal opens
  useEffect(() => {
    if (isOpen) {
      const currentLang = window.location.pathname.split('/')[1] || 'en';
      const validLangs = ['en', 'sq', 'sr', 'de', 'mk'];
      const lang = validLangs.includes(currentLang) ? currentLang : 'en';
      const subscribePath = `/${lang}/subscribe`;

      if (!window.location.pathname.includes('/subscribe') && !window.location.pathname.includes('/pricing')) {
        window.history.pushState({ modal: 'subscribe' }, '', subscribePath);
      }
    }
  }, [isOpen]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (isOpen && !window.location.pathname.includes('/subscribe')) {
        onClose();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen, onClose]);

  const handleViewSellerPlans = () => {
    onClose();
    // A small delay to ensure the first modal has time to start closing animation
    setTimeout(() => {
        dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'pricing' });
    }, 150);
  };

  const handleSubscribeClick = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if user is authenticated (check both flag and user object)
    if (!state.isAuthenticated && !state.currentUser) {
      // Save pending subscription
      dispatch({
        type: 'SET_PENDING_SUBSCRIPTION',
        payload: {
          planName: buyerName,
          planPrice: buyerPrice,
          planInterval: 'month',
          modalType: 'buyer',
        },
      });

      // Close this modal
      onClose();

      // Open auth modal
      dispatch({
        type: 'TOGGLE_AUTH_MODAL',
        payload: { isOpen: true, view: 'login' },
      });
      return;
    }

    if (!email || !email.includes('@')) {
      await warning('Invalid Email', 'Please enter a valid email address');
      return;
    }
    setShowPaymentWindow(true);
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    console.log('Payment successful:', paymentIntentId);
    // TODO: Update user subscription status via API
    setShowPaymentWindow(false);
    onClose();
    // Show success message
    await success('Subscription Activated', 'Your subscription has been activated successfully!');
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    // Error is already shown in the PaymentWindow component
  };

  const inputBaseClasses = "block w-full text-base bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors focus:bg-white placeholder:text-neutral-700";

  // Get buyer product (default to first buyer product or fallback values)
  const buyerProduct = buyerProducts.find(p => p.productId === 'buyer_pro_monthly') || buyerProducts[0];
  const buyerPrice = buyerProduct?.price || 1.50;
  const buyerName = buyerProduct?.name || t('modals:subscription.buyerPro.name');
  const buyerFeatures = buyerProduct?.features || [
    t('modals:subscription.buyerPro.features.notifications'),
    t('modals:subscription.buyerPro.features.unlimitedSearches'),
    t('modals:subscription.buyerPro.features.earlyAccess'),
    t('modals:subscription.buyerPro.features.marketInsights'),
  ];

  const renderBuyerPlan = () => (
    <div className="animate-fade-in">
        {loading ? (
          <div className="text-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-3 text-neutral-600 text-sm">{t('modals:subscription.loadingPlans')}</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-6 sm:items-start">
            {/* Plan Info - Shows first on mobile */}
            <div className="order-1 sm:order-1">
               <h3 className="text-lg sm:text-2xl font-bold text-neutral-800">{buyerName}</h3>
               <div className="mt-2 sm:mt-4">
                  <span className="text-2xl sm:text-4xl font-extrabold text-primary">€{buyerPrice}</span>
                  <span className="text-sm sm:text-lg font-semibold text-neutral-500">{t('modals:subscription.perMonth')}</span>
               </div>
               <p className="text-neutral-600 mt-2 text-sm hidden sm:block">{buyerProduct?.description || t('modals:subscription.buyerPro.description')}</p>
               <p className="text-neutral-600 mt-1 text-xs sm:hidden line-clamp-2">{buyerProduct?.description || t('modals:subscription.buyerPro.description')}</p>
              <ul className="mt-4 sm:mt-6 space-y-2 sm:space-y-3 text-neutral-700">
                  {buyerFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 sm:gap-3">
                      <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-500 flex-shrink-0" />
                      <span className="text-sm sm:text-base">{feature}</span>
                    </li>
                  ))}
              </ul>
            </div>

            {/* Form - Shows second on mobile */}
            <div className="order-2 sm:order-2 bg-neutral-50 p-4 sm:p-6 rounded-xl border border-neutral-200">
                 <form onSubmit={handleSubscribeClick}>
                    <div className="mb-4 sm:mb-6">
                        <label htmlFor="email_sub" className="block text-neutral-700 font-semibold mb-2 text-sm">{t('modals:subscription.emailAddress')}</label>
                        <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4">
                                <AtSymbolIcon className="h-5 w-5 text-neutral-400" />
                            </div>
                            <input
                              type="email"
                              id="email_sub"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className={`${inputBaseClasses} pl-10 sm:pl-11 py-2.5 sm:py-3`}
                              placeholder="you@example.com"
                              required
                            />
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-gradient-to-r from-secondary to-secondary/90 text-white py-3 sm:py-3.5 rounded-lg font-bold hover:shadow-xl hover:scale-[1.02] transition-all shadow-md text-sm sm:text-base">
                        {t('modals:subscription.continueToPayment')}
                    </button>
                    <p className="text-xs text-neutral-500 text-center mt-3 sm:mt-4">
                      {t('modals:subscription.securePayment')}
                    </p>
                </form>
            </div>
          </div>
        )}
    </div>
  );

  const renderSellerPlan = () => (
    <div className="animate-fade-in">
        {/* Header - Compact on mobile */}
        <div className="text-center mb-4 sm:mb-6">
            <div className="inline-block p-2 sm:p-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl sm:rounded-2xl mb-2 sm:mb-4 shadow-lg">
                <span className="text-2xl sm:text-3xl">🚀</span>
            </div>
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900">{t('modals:subscription.sellerPromotion.title')}</h3>
            <p className="text-gray-600 mt-1 sm:mt-2 max-w-md mx-auto text-xs sm:text-sm">
                {t('modals:subscription.sellerPromotion.description')}
            </p>
        </div>

        {/* Promotion Tiers - Horizontal scroll on mobile */}
        <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0 sm:overflow-visible sm:grid sm:grid-cols-3 sm:gap-4 mb-4 sm:mb-6 -mx-2 px-2 sm:mx-0 sm:px-0 snap-x snap-mandatory">
            {/* Featured - Violet theme */}
            <div className="flex-shrink-0 w-[200px] sm:w-auto snap-center bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-100 transition-all group">
                <div className="text-center mb-2 sm:mb-3">
                    <div className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-violet-400 to-purple-500 rounded-lg shadow-lg mb-2 group-hover:scale-110 transition-transform">
                        <span className="text-base sm:text-lg filter drop-shadow">⭐</span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm sm:text-base">Featured</h4>
                    <p className="text-xs text-gray-600 mb-2">Priority in search</p>
                    <div className="text-xl sm:text-2xl font-bold text-violet-600">€1.99<span className="text-sm text-gray-400">+</span></div>
                    <div className="text-[10px] sm:text-xs text-gray-500">7-90 days</div>
                </div>
                <ul className="space-y-1.5 sm:space-y-2">
                    <li className="text-xs sm:text-sm text-gray-700 flex items-start gap-1.5">
                        <span className="text-violet-500 font-bold">✓</span>
                        <span>Top of search</span>
                    </li>
                    <li className="text-xs sm:text-sm text-gray-700 flex items-start gap-1.5">
                        <span className="text-violet-500 font-bold">✓</span>
                        <span>Featured badge</span>
                    </li>
                    <li className="text-xs sm:text-sm text-gray-700 flex items-start gap-1.5">
                        <span className="text-violet-500 font-bold">✓</span>
                        <span>2x visibility</span>
                    </li>
                </ul>
            </div>

            {/* Highlight - Sky/Cyan theme */}
            <div className="flex-shrink-0 w-[200px] sm:w-auto snap-center bg-gradient-to-br from-sky-50 to-cyan-50 border-2 border-sky-300 rounded-xl sm:rounded-2xl p-3 sm:p-4 pt-6 sm:pt-6 hover:shadow-xl hover:shadow-sky-100 transition-all relative group sm:scale-[1.02]">
                <div className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-[10px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                    ✨ Popular
                </div>
                <div className="text-center mb-2 sm:mb-3">
                    <div className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-lg shadow-lg mb-2 group-hover:scale-110 transition-transform">
                        <span className="text-base sm:text-lg filter drop-shadow">💎</span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm sm:text-base">Highlight</h4>
                    <p className="text-xs text-gray-600 mb-2">Stand out</p>
                    <div className="text-xl sm:text-2xl font-bold text-sky-600">€3.99<span className="text-sm text-gray-400">+</span></div>
                    <div className="text-[10px] sm:text-xs text-gray-500">7-90 days</div>
                </div>
                <ul className="space-y-1.5 sm:space-y-2">
                    <li className="text-xs sm:text-sm text-gray-700 flex items-start gap-1.5">
                        <span className="text-sky-500 font-bold">✓</span>
                        <span>Featured benefits</span>
                    </li>
                    <li className="text-xs sm:text-sm text-gray-700 flex items-start gap-1.5">
                        <span className="text-sky-500 font-bold">✓</span>
                        <span>Colored highlight</span>
                    </li>
                    <li className="text-xs sm:text-sm text-gray-700 flex items-start gap-1.5">
                        <span className="text-sky-500 font-bold">✓</span>
                        <span>3x visibility</span>
                    </li>
                </ul>
            </div>

            {/* Premium - Amber/Gold theme */}
            <div className="flex-shrink-0 w-[200px] sm:w-auto snap-center bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-xl sm:rounded-2xl p-3 sm:p-4 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-100 transition-all group">
                <div className="text-center mb-2 sm:mb-3">
                    <div className="inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-lg shadow-lg mb-2 group-hover:scale-110 transition-transform">
                        <span className="text-base sm:text-lg filter drop-shadow">👑</span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-sm sm:text-base">Premium</h4>
                    <p className="text-xs text-gray-600 mb-2">Homepage featured</p>
                    <div className="text-xl sm:text-2xl font-bold text-amber-600">€7.99<span className="text-sm text-gray-400">+</span></div>
                    <div className="text-[10px] sm:text-xs text-gray-500">7-90 days</div>
                </div>
                <ul className="space-y-1.5 sm:space-y-2">
                    <li className="text-xs sm:text-sm text-gray-700 flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">✓</span>
                        <span>Highlight benefits</span>
                    </li>
                    <li className="text-xs sm:text-sm text-gray-700 flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">✓</span>
                        <span>Homepage carousel</span>
                    </li>
                    <li className="text-xs sm:text-sm text-gray-700 flex items-start gap-1.5">
                        <span className="text-amber-500 font-bold">✓</span>
                        <span>5x visibility</span>
                    </li>
                </ul>
            </div>
        </div>

        {/* Info Box - Compact on mobile */}
        <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
            <div className="flex items-start gap-2.5 sm:gap-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-sm sm:text-lg">💡</span>
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-0.5 text-sm sm:text-base">How it works:</p>
                    <p className="text-xs sm:text-sm text-gray-600">
                        Select promotion tier when creating listing. Discount coupons supported!
                    </p>
                </div>
            </div>
        </div>

        {/* Buttons - Stacked on mobile */}
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
                onClick={onClose}
                className="order-1 sm:order-2 flex-1 px-4 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-lg sm:rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all shadow-md text-sm sm:text-base"
            >
                {t('modals:subscription.sellerPromotion.startCreatingListing')}
            </button>
            <button
                onClick={handleViewSellerPlans}
                className="order-2 sm:order-1 flex-1 px-4 sm:px-6 py-2.5 sm:py-3.5 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-lg sm:rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm text-sm sm:text-base"
            >
                {t('modals:subscription.sellerPromotion.viewSubscriptionPlans')}
            </button>
        </div>
    </div>
  );


  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="2xl" title={t('modals:subscription.title')}>
          {/* Tabs - Compact on mobile */}
          <div className="bg-neutral-100 p-1 rounded-full flex items-center space-x-1 border border-neutral-200 shadow-sm max-w-xs sm:max-w-md mx-auto mb-4 sm:mb-6">
              <button
                  onClick={() => setActiveTab('buyer')}
                  className={`w-1/2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-base font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 ${activeTab === 'buyer' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}
              >
                  <UserIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                  {t('modals:subscription.forBuyers')}
              </button>
              <button
                  onClick={() => setActiveTab('seller')}
                  className={`w-1/2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full text-xs sm:text-base font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 sm:gap-2 ${activeTab === 'seller' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}
              >
                  <BuildingOfficeIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                  {t('modals:subscription.forSellers')}
              </button>
          </div>

          {activeTab === 'buyer' ? renderBuyerPlan() : renderSellerPlan()}

          <div className="text-center mt-4 sm:mt-6 pt-2 sm:pt-4">
              <button onClick={onClose} className="text-xs sm:text-sm font-semibold text-neutral-500 hover:text-neutral-700 transition-colors">
                  {t('modals:common.maybeLater')}
              </button>
          </div>
      </Modal>

      {/* Payment Window */}
      <PaymentWindow
        isOpen={showPaymentWindow}
        onClose={() => setShowPaymentWindow(false)}
        planName={buyerName}
        planPrice={buyerPrice}
        planInterval="month"
        userRole="buyer"
        userEmail={email}
        userCountry={state.currentUser?.country || 'RS'}
        onSuccess={handlePaymentSuccess}
        onError={handlePaymentError}
      />
    </>
  );
};

export default SubscriptionModal;