import React, { useState, useEffect } from 'react';
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
            <p className="mt-4 text-neutral-600">Loading plans...</p>
          </div>
        ) : (
          <>
            <div>
               <h3 className="text-xl sm:text-2xl font-bold text-neutral-800">{buyerName}</h3>
               <div className="mt-4">
                  <span className="text-3xl sm:text-4xl font-extrabold text-primary">€{buyerPrice}</span>
                  <span className="text-base sm:text-lg font-semibold text-neutral-500">/month</span>
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
                    <label htmlFor="email_sub" className="block text-neutral-700 font-semibold mb-3 text-sm">Email Address</label>
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
                    Continue to Payment
                </button>
                <p className="text-xs text-neutral-500 text-center mt-4">
                  Secure payment powered by Stripe
                </p>
            </form>
        </div>
          </>
        )}
    </div>
  );

  const renderSellerPlan = () => (
    <div className="animate-fade-in p-4 sm:p-6">
        <div className="text-center mb-6">
            <BuildingOfficeIcon className="w-12 h-12 text-primary mx-auto mb-3" />
            <h3 className="text-xl sm:text-2xl font-bold text-neutral-800">Listing Promotion Plans</h3>
            <p className="text-neutral-600 mt-2 max-w-md mx-auto text-sm">
                Boost your property listings to get more visibility and inquiries
            </p>
        </div>

        {/* Promotion Tiers */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
            {/* Featured */}
            <div className="bg-white border border-gray-300 rounded-lg p-5 hover:border-gray-400 hover:shadow transition-all">
                <div className="text-center mb-3">
                    <span className="text-2xl mb-2 block">⭐</span>
                    <h4 className="font-bold text-gray-900 text-lg mb-1">Featured</h4>
                    <p className="text-sm text-gray-600 mb-2">Priority in search results</p>
                    <div className="text-2xl font-bold text-gray-900">€1.99+</div>
                    <div className="text-xs text-gray-500">7-90 days</div>
                </div>
                <ul className="space-y-1.5 text-left">
                    <li className="text-xs text-gray-700 flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Top of search results</span>
                    </li>
                    <li className="text-xs text-gray-700 flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Featured badge</span>
                    </li>
                    <li className="text-xs text-gray-700 flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>2x visibility boost</span>
                    </li>
                </ul>
            </div>

            {/* Highlight */}
            <div className="bg-white border-2 border-primary rounded-lg p-5 hover:shadow-md transition-all relative">
                <div className="absolute -top-2 right-3 bg-primary text-white text-xs font-medium px-2 py-0.5 rounded">
                    Popular
                </div>
                <div className="text-center mb-3">
                    <span className="text-2xl mb-2 block">💎</span>
                    <h4 className="font-bold text-gray-900 text-lg mb-1">Highlight</h4>
                    <p className="text-sm text-gray-600 mb-2">Stand out with color</p>
                    <div className="text-2xl font-bold text-gray-900">€3.99+</div>
                    <div className="text-xs text-gray-500">7-90 days</div>
                </div>
                <ul className="space-y-1.5 text-left">
                    <li className="text-xs text-gray-700 flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>All Featured benefits</span>
                    </li>
                    <li className="text-xs text-gray-700 flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Colored background</span>
                    </li>
                    <li className="text-xs text-gray-700 flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>3x visibility boost</span>
                    </li>
                </ul>
            </div>

            {/* Premium */}
            <div className="bg-white border border-gray-300 rounded-lg p-5 hover:border-gray-400 hover:shadow transition-all">
                <div className="text-center mb-3">
                    <span className="text-2xl mb-2 block">👑</span>
                    <h4 className="font-bold text-gray-900 text-lg mb-1">Premium</h4>
                    <p className="text-sm text-gray-600 mb-2">Homepage featuring</p>
                    <div className="text-2xl font-bold text-gray-900">€7.99+</div>
                    <div className="text-xs text-gray-500">7-90 days</div>
                </div>
                <ul className="space-y-1.5 text-left">
                    <li className="text-xs text-gray-700 flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>All Highlight benefits</span>
                    </li>
                    <li className="text-xs text-gray-700 flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>Homepage carousel</span>
                    </li>
                    <li className="text-xs text-gray-700 flex items-start gap-2">
                        <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>5x visibility boost</span>
                    </li>
                </ul>
            </div>
        </div>

        {/* Info Box */}
        <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
                <span className="text-xl">💡</span>
                <div className="flex-1 text-sm text-gray-700">
                    <p className="font-medium mb-1">How it works:</p>
                    <p className="text-xs text-gray-600">
                        When creating a listing, select your promotion tier and duration. Payment is processed before publishing. Discount coupons are supported!
                    </p>
                </div>
            </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
            <button
                onClick={handleViewSellerPlans}
                className="flex-1 px-6 py-3 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg hover:border-gray-400 hover:shadow transition-all"
            >
                View Subscription Plans
            </button>
            <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors"
            >
                Start Creating Listing
            </button>
        </div>
    </div>
  );


  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} size="2xl" title="Choose Your Plan">
          <div className="bg-neutral-100 p-1 rounded-full flex items-center space-x-1 border border-neutral-200 shadow-sm max-w-md mx-auto mb-8">
              <button
                  onClick={() => setActiveTab('buyer')}
                  className={`w-1/2 px-4 py-2.5 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'buyer' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}
              >
                  <UserIcon className="w-5 h-5"/>
                  For Buyers
              </button>
              <button
                  onClick={() => setActiveTab('seller')}
                  className={`w-1/2 px-4 py-2.5 rounded-full text-sm sm:text-base font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'seller' ? 'bg-white text-primary shadow' : 'text-neutral-600 hover:bg-neutral-200'}`}
              >
                  <BuildingOfficeIcon className="w-5 h-5"/>
                  For Sellers
              </button>
          </div>

          {activeTab === 'buyer' ? renderBuyerPlan() : renderSellerPlan()}

          <div className="text-center mt-8 pt-4">
              <button onClick={onClose} className="text-sm font-semibold text-neutral-500 hover:text-neutral-700 transition-colors">
                  Maybe later
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