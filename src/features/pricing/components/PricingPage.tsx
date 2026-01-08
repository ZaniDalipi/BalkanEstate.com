import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import PaymentWindow from '@/components/shared/PaymentWindow';
import { BuildingOfficeIcon, ChartBarIcon, CurrencyDollarIcon, BoltIcon, CheckIcon, ArrowLeftIcon } from '@/constants';
import { buildLocalizedPath } from '@/utils/languageRouting';

interface Product {
  id: string;
  productId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billingPeriod?: string;
  trialPeriodDays?: number;
  features: string[];
  targetRole: 'buyer' | 'seller' | 'agent' | 'all';
  displayOrder: number;
  badge?: string;
  badgeColor?: string;
  highlighted: boolean;
  durationDays?: number;
  listingsLimit?: number;
  promotionCoupons?: number;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const PricingPage: React.FC = () => {
  const { t } = useTranslation(['pricing']);
  const { state, dispatch } = useAppContext();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'seller' | 'buyer'>('seller');
  const [showPaymentWindow, setShowPaymentWindow] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    price: number;
    interval: 'month' | 'year';
    productId: string;
  } | null>(null);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/products?role=${activeTab}`);
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data.products || []);
      } catch (err) {
        console.error('Error fetching products:', err);
        setError('Failed to load pricing plans');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [activeTab]);

  const handleBack = () => {
    window.history.pushState({}, '', buildLocalizedPath('/'));
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
  };

  const handlePlanSelection = (product: Product) => {
    if (!state.isAuthenticated || !state.currentUser) {
      // Save pending subscription and redirect to login
      dispatch({
        type: 'SET_PENDING_SUBSCRIPTION',
        payload: {
          planName: product.name,
          planPrice: product.price,
          planInterval: product.billingPeriod === 'yearly' ? 'year' : 'month',
          modalType: activeTab,
        },
      });
      dispatch({
        type: 'TOGGLE_AUTH_MODAL',
        payload: { isOpen: true, view: 'login' },
      });
      return;
    }

    setSelectedPlan({
      name: product.name,
      price: product.price,
      interval: product.billingPeriod === 'yearly' ? 'year' : 'month',
      productId: product.productId,
    });

    // Enterprise plan needs agency creation first
    if (product.productId.includes('enterprise') && !state.pendingAgencyData) {
      dispatch({ type: 'TOGGLE_ENTERPRISE_MODAL', payload: true });
    } else {
      setShowPaymentWindow(true);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    console.log('Payment successful:', paymentIntentId);
    setShowPaymentWindow(false);
    dispatch({
      type: 'SHOW_ALERT',
      payload: {
        type: 'success',
        title: 'Success!',
        message: 'Your subscription has been activated.',
      },
    });
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
  };

  const getBadgeColor = (color?: string) => {
    switch (color) {
      case 'red': return 'bg-red-500';
      case 'green': return 'bg-green-500';
      case 'blue': return 'bg-blue-500';
      case 'amber': return 'bg-amber-500';
      case 'purple': return 'bg-purple-500';
      default: return 'bg-red-500';
    }
  };

  const formatPrice = (price: number, billingPeriod?: string) => {
    const period = billingPeriod === 'yearly' ? '/year' : billingPeriod === 'monthly' ? '/month' : '';
    return `€${price}${period}`;
  };

  const getUserRole = (): 'buyer' | 'private_seller' | 'agent' => {
    if (!state.currentUser) return 'private_seller';
    return state.currentUser.role === 'agent' ? 'agent' : 'private_seller';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            <h1 className="text-xl font-bold text-gray-900">Pricing Plans</h1>
            <div className="w-20" /> {/* Spacer for centering */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Title */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight">
            Choose Your Plan
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            Get your property in front of thousands of potential buyers with our flexible pricing options.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-10">
          <div className="bg-gray-100 p-1 rounded-full inline-flex">
            <button
              onClick={() => setActiveTab('seller')}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'seller'
                  ? 'bg-white text-primary shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              For Sellers
            </button>
            <button
              onClick={() => setActiveTab('buyer')}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all ${
                activeTab === 'buyer'
                  ? 'bg-white text-primary shadow-md'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              For Buyers
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading pricing plans...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-20">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && (
          <div className={`grid grid-cols-1 ${products.length > 2 ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-4xl mx-auto'} gap-8`}>
            {products.sort((a, b) => a.displayOrder - b.displayOrder).map((product) => (
              <div
                key={product.id}
                className={`relative rounded-2xl p-6 sm:p-8 flex flex-col ${
                  product.highlighted
                    ? 'bg-gradient-to-br from-green-50 to-cyan-50 border-2 border-green-400 shadow-lg transform md:-translate-y-2'
                    : product.productId.includes('enterprise')
                    ? 'bg-gray-800 text-white'
                    : 'bg-white border border-gray-200 shadow-md'
                }`}
              >
                {/* Badge */}
                {product.badge && (
                  <div className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2">
                    <span className={`inline-block ${getBadgeColor(product.badgeColor)} text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-md`}>
                      {product.badge}
                    </span>
                  </div>
                )}

                {/* Product Info */}
                <div className="text-center pt-4">
                  <div className="flex items-center justify-center gap-2">
                    {product.productId.includes('enterprise') && (
                      <BuildingOfficeIcon className="w-7 h-7 text-amber-400" />
                    )}
                    <h3 className="text-xl sm:text-2xl font-bold">{product.name}</h3>
                  </div>
                  {product.description && (
                    <p className={`mt-2 text-sm ${product.productId.includes('enterprise') ? 'text-gray-300' : 'text-gray-600'}`}>
                      {product.description}
                    </p>
                  )}
                  <div className="mt-4">
                    <span className={`text-4xl font-extrabold ${product.productId.includes('enterprise') ? 'text-white' : 'text-gray-900'}`}>
                      €{product.price}
                    </span>
                    <span className={`text-lg ${product.productId.includes('enterprise') ? 'text-gray-300' : 'text-gray-600'}`}>
                      /{product.billingPeriod === 'yearly' ? 'year' : product.billingPeriod === 'monthly' ? 'month' : product.billingPeriod}
                    </span>
                  </div>
                </div>

                {/* Features */}
                <ul className="mt-8 space-y-4 flex-grow">
                  {product.features && product.features.length > 0 ? (
                    product.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          product.productId.includes('enterprise') ? 'text-green-400' : 'text-green-500'
                        }`} />
                        <span className={`text-sm ${product.productId.includes('enterprise') ? 'text-gray-200' : 'text-gray-700'}`}>
                          {feature}
                        </span>
                      </li>
                    ))
                  ) : (
                    <>
                      {product.listingsLimit && product.listingsLimit > 0 && (
                        <li className="flex items-start gap-3">
                          <CheckIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${product.productId.includes('enterprise') ? 'text-green-400' : 'text-green-500'}`} />
                          <span className={`text-sm ${product.productId.includes('enterprise') ? 'text-gray-200' : 'text-gray-700'}`}>
                            Up to {product.listingsLimit} active listings
                          </span>
                        </li>
                      )}
                      {product.promotionCoupons && product.promotionCoupons > 0 && (
                        <li className="flex items-start gap-3">
                          <CheckIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${product.productId.includes('enterprise') ? 'text-green-400' : 'text-green-500'}`} />
                          <span className={`text-sm ${product.productId.includes('enterprise') ? 'text-gray-200' : 'text-gray-700'}`}>
                            {product.promotionCoupons} promotion coupons/month
                          </span>
                        </li>
                      )}
                    </>
                  )}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handlePlanSelection(product)}
                  className={`w-full mt-8 py-3.5 rounded-lg font-bold transition-all ${
                    product.highlighted
                      ? 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-md hover:shadow-xl'
                      : product.productId.includes('enterprise')
                      ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-md hover:shadow-xl'
                      : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-primary hover:shadow-lg'
                  }`}
                >
                  Get Started - {formatPrice(product.price, product.billingPeriod)}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* No Products Message */}
        {!loading && !error && products.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-600">No pricing plans available at the moment.</p>
          </div>
        )}

        {/* Benefits Section */}
        <div className="mt-16 pt-10 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="flex flex-col items-center">
              <CurrencyDollarIcon className="w-10 h-10 text-green-500 mb-3" />
              <h4 className="font-semibold text-gray-900">30-Day Money Back</h4>
              <p className="text-sm text-gray-600 mt-1">Full refund if not satisfied</p>
            </div>
            <div className="flex flex-col items-center">
              <ChartBarIcon className="w-10 h-10 text-blue-500 mb-3" />
              <h4 className="font-semibold text-gray-900">3x More Views</h4>
              <p className="text-sm text-gray-600 mt-1">Premium listings get more exposure</p>
            </div>
            <div className="flex flex-col items-center">
              <BoltIcon className="w-10 h-10 text-yellow-500 mb-3" />
              <h4 className="font-semibold text-gray-900">Instant Activation</h4>
              <p className="text-sm text-gray-600 mt-1">Start selling immediately</p>
            </div>
          </div>
        </div>
      </div>

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
