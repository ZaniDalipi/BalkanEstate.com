import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../shared/Modal';
import PaymentWindow from '../../shared/PaymentWindow';
import { AtSymbolIcon, UserIcon, BuildingOfficeIcon, CheckCircleIcon } from '../../../constants';
import { useAppContext } from '../../../context/AppContext';
import { fetchBuyerProducts, Product } from '../../../utils/api';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEmail?: string;
}

const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, initialEmail }) => {
  const { t } = useTranslation(['modals']);
  const { state, dispatch } = useAppContext();
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

  const handleViewSellerPlans = () => {
    onClose();
    // A small delay to ensure the first modal has time to start closing animation
    setTimeout(() => {
        dispatch({ type: 'TOGGLE_PRICING_MODAL', payload: { isOpen: true, isOffer: false } });
    }, 150);
  };

  const handleSubscribeClick = (e: React.FormEvent) => {
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
      alert('Please enter a valid email address');
      return;
    }
    setShowPaymentWindow(true);
  };

  const handlePaymentSuccess = (paymentIntentId: string) => {
    console.log('Payment successful:', paymentIntentId);
    // TODO: Update user subscription status via API
    setShowPaymentWindow(false);
    onClose();
    // Show success message
    alert('Subscription activated successfully!');
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    // Error is already shown in the PaymentWindow component
  };

  const inputBaseClasses = "block w-full text-base bg-neutral-50 border border-neutral-300 rounded-lg text-neutral-900 shadow-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors focus:bg-white placeholder:text-neutral-700";

  // Get buyer product (default to first buyer product or fallback values)
  const buyerProduct = buyerProducts.find(p => p.productId === 'buyer_pro_monthly') || buyerProducts[0];
  const buyerPrice = buyerProduct?.price || 1.50;
  const buyerName = buyerProduct?.name || 'Buyer Pro';
  const buyerFeatures = buyerProduct?.features || [
    'Instant email & SMS notifications',
    'Save unlimited searches',
    'Early access to new listings',
    'Advanced market insights',
  ];

  const renderBuyerPlan = () => (
    <div className="animate-fade-in grid md:grid-cols-2 gap-8 items-center">
        {loading ? (
          <div className="col-span-2 text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-neutral-600">{t('modals:subscription.loadingPlans')}</p>
          </div>
        ) : (
          <>
            <div>
               <h3 className="text-xl sm:text-2xl font-bold text-neutral-800">{buyerName}</h3>
               <div className="mt-4">
                  <span className="text-3xl sm:text-4xl font-extrabold text-primary">€{buyerPrice}</span>
                  <span className="text-base sm:text-lg font-semibold text-neutral-500">{t('modals:subscription.perMonth')}</span>
               </div>
               <p className="text-neutral-600 mt-3 text-sm sm:text-base">{buyerProduct?.description || 'Never miss a new listing! Get notified the moment a property matching your criteria hits the market.'}</p>
              <ul className="mt-8 space-y-4 text-neutral-700 text-sm sm:text-base">
                  {buyerFeatures.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircleIcon className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
              </ul>
            </div>
        <div className="bg-neutral-50 p-6 rounded-xl border border-neutral-200">
             <form onSubmit={handleSubscribeClick}>
                <div className="mb-6">
                    <label htmlFor="email_sub" className="block text-neutral-700 font-semibold mb-3 text-sm">{t('modals:subscription.emailAddress')}</label>
                    <div className="relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <AtSymbolIcon className="h-5 w-5 text-neutral-400" />
                        </div>
                        <input
                          type="email"
                          id="email_sub"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={`${inputBaseClasses} pl-11`}
                          placeholder="you@example.com"
                          required
                        />
                    </div>
                </div>
                <button type="submit" className="w-full bg-gradient-to-r from-secondary to-secondary/90 text-white py-3.5 rounded-lg font-bold hover:shadow-xl hover:scale-[1.02] transition-all shadow-md">
                    {t('modals:subscription.continueToPayment')}
                </button>
                <p className="text-xs text-neutral-500 text-center mt-4">
                  {t('modals:subscription.securePayment')}
                </p>
            </form>
        </div>
          </>
        )}
    </div>
  );

  const renderSellerPlan = () => (
    <div className="animate-fade-in p-4 sm:p-6">
        {/* Header */}
        <div className="text-center mb-8">
            <div className="inline-block p-3 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl mb-4 shadow-lg">
                <span className="text-3xl">🚀</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900">{t('modals:subscription.sellerPromotion.title')}</h3>
            <p className="text-gray-600 mt-2 max-w-md mx-auto text-sm">
                {t('modals:subscription.sellerPromotion.description')}
            </p>
        </div>

        {/* Promotion Tiers - Enhanced with tier-specific colors */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {/* Featured - Violet theme */}
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 border-2 border-violet-200 rounded-2xl p-5 hover:border-violet-400 hover:shadow-lg hover:shadow-violet-100 transition-all group">
                <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-violet-400 to-purple-500 rounded-2xl shadow-lg mb-3 group-hover:scale-110 transition-transform">
                        <span className="text-2xl filter drop-shadow">⭐</span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-lg">Featured</h4>
                    <p className="text-sm text-gray-600 mb-3">Priority in search results</p>
                    <div className="text-3xl font-bold text-violet-600">€1.99<span className="text-lg text-gray-400">+</span></div>
                    <div className="text-xs text-gray-500 mt-1">7-90 days</div>
                </div>
                <ul className="space-y-2">
                    <li className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-violet-500 font-bold mt-0.5">✓</span>
                        <span>Top of search results</span>
                    </li>
                    <li className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-violet-500 font-bold mt-0.5">✓</span>
                        <span>Featured badge</span>
                    </li>
                    <li className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-violet-500 font-bold mt-0.5">✓</span>
                        <span>2x visibility boost</span>
                    </li>
                </ul>
            </div>

            {/* Highlight - Sky/Cyan theme */}
            <div className="bg-gradient-to-br from-sky-50 to-cyan-50 border-2 border-sky-300 rounded-2xl p-5 hover:shadow-xl hover:shadow-sky-100 transition-all relative group scale-[1.02]">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                    ✨ Most Popular
                </div>
                <div className="text-center mb-4 pt-2">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-sky-400 to-cyan-500 rounded-2xl shadow-lg mb-3 group-hover:scale-110 transition-transform">
                        <span className="text-2xl filter drop-shadow">💎</span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-lg">Highlight</h4>
                    <p className="text-sm text-gray-600 mb-3">Stand out with color</p>
                    <div className="text-3xl font-bold text-sky-600">€3.99<span className="text-lg text-gray-400">+</span></div>
                    <div className="text-xs text-gray-500 mt-1">7-90 days</div>
                </div>
                <ul className="space-y-2">
                    <li className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-sky-500 font-bold mt-0.5">✓</span>
                        <span>All Featured benefits</span>
                    </li>
                    <li className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-sky-500 font-bold mt-0.5">✓</span>
                        <span>Colored background</span>
                    </li>
                    <li className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-sky-500 font-bold mt-0.5">✓</span>
                        <span>3x visibility boost</span>
                    </li>
                </ul>
            </div>

            {/* Premium - Amber/Gold theme */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-200 rounded-2xl p-5 hover:border-amber-400 hover:shadow-lg hover:shadow-amber-100 transition-all group">
                <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-2xl shadow-lg mb-3 group-hover:scale-110 transition-transform">
                        <span className="text-2xl filter drop-shadow">👑</span>
                    </div>
                    <h4 className="font-bold text-gray-900 text-lg">Premium</h4>
                    <p className="text-sm text-gray-600 mb-3">Homepage featuring</p>
                    <div className="text-3xl font-bold text-amber-600">€7.99<span className="text-lg text-gray-400">+</span></div>
                    <div className="text-xs text-gray-500 mt-1">7-90 days</div>
                </div>
                <ul className="space-y-2">
                    <li className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-amber-500 font-bold mt-0.5">✓</span>
                        <span>All Highlight benefits</span>
                    </li>
                    <li className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-amber-500 font-bold mt-0.5">✓</span>
                        <span>Homepage carousel</span>
                    </li>
                    <li className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-amber-500 font-bold mt-0.5">✓</span>
                        <span>5x visibility boost</span>
                    </li>
                </ul>
            </div>
        </div>

        {/* Info Box - Enhanced */}
        <div className="bg-gradient-to-r from-slate-50 to-blue-50/50 border border-slate-200 rounded-xl p-5 mb-6">
            <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                    <span className="text-lg">💡</span>
                </div>
                <div className="flex-1">
                    <p className="font-semibold text-gray-900 mb-1">How it works:</p>
                    <p className="text-sm text-gray-600">
                        When creating a listing, select your promotion tier and duration. Payment is processed before publishing. Discount coupons are supported!
                    </p>
                </div>
            </div>
        </div>

        {/* Buttons - Enhanced */}
        <div className="flex flex-col sm:flex-row gap-3">
            <button
                onClick={handleViewSellerPlans}
                className="flex-1 px-6 py-3.5 bg-white border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm"
            >
                {t('modals:subscription.sellerPromotion.viewSubscriptionPlans')}
            </button>
            <button
                onClick={onClose}
                className="flex-1 px-6 py-3.5 bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-xl hover:shadow-lg hover:scale-[1.02] transition-all shadow-md"
            >
                {t('modals:subscription.sellerPromotion.startCreatingListing')}
            </button>
        </div>
    </div>
  );


  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="2xl" title={t('modals:subscription.title')}>
          <div className="bg-neutral-100 p-1 rounded-full flex items-center space-x-1 border border-neutral-200 shadow-sm max-w-md mx-auto mb-8">
              <button
                  onClick={() => setActiveTab('buyer')}
                  className={`w-1/2 px-4 py-2.5 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'buyer' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}
              >
                  <UserIcon className="w-5 h-5"/>
                  {t('modals:subscription.forBuyers')}
              </button>
              <button
                  onClick={() => setActiveTab('seller')}
                  className={`w-1/2 px-4 py-2.5 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'seller' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}
              >
                  <BuildingOfficeIcon className="w-5 h-5"/>
                  {t('modals:subscription.forSellers')}
              </button>
          </div>

          {activeTab === 'buyer' ? renderBuyerPlan() : renderSellerPlan()}

          <div className="text-center mt-8 pt-4">
              <button onClick={onClose} className="text-sm font-semibold text-neutral-500 hover:text-neutral-700 transition-colors">
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