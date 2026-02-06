import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { useRealtimeProperties } from '@/src/features/properties/hooks';
import { Property, Agent } from '@/types';
import PropertyCard from '@/src/features/property-details/components/PropertyCard';
import { HeartIcon, UserCircleIcon, HomeIcon, UsersIcon } from '@/constants';
import ComparisonBar from '@/src/features/comparison/components/ComparisonBar';
import ComparisonModal from '@/src/features/comparison/components/ComparisonModal';
import Toast from '@/components/shared/Toast';
import PropertyCardSkeleton from '@/src/features/property-details/components/PropertyCardSkeleton';
import FeaturedAgencies from '@/components/FeaturedAgencies';
import Footer from '@/components/shared/Footer';
import { getSavedAgents } from '@/src/features/agents/api/agentApi';
import StarRating from '@/components/shared/StarRating';
import { FloatingSphere, Decorative3DStyles } from '@/components/shared/Decorative3D';
import SavedItemsHeroBanner from '@/components/shared/SavedItemsHeroBanner';

const SavedPropertiesPage: React.FC = () => {
  const { t } = useTranslation(['property', 'nav', 'agents']);
  const { state, dispatch, fetchSavedHomes } = useAppContext();
  const { savedHomes, comparisonList, properties, isAuthenticated, isLoadingUserData } = state;
  const [isComparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [toast, setToast] = useState<{ show: boolean, message: string, type: 'success' | 'error' }>({ show: false, message: '', type: 'success' });
  const [activeTab, setActiveTab] = useState<'properties' | 'agents'>('properties');
  const [savedAgentsList, setSavedAgentsList] = useState<Agent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);

  // Enable real-time updates - refresh saved homes when properties change
  useRealtimeProperties({
    onPropertyUpdated: () => {
      // Refresh saved homes when a property is updated (price change, status change, etc.)
      if (isAuthenticated) fetchSavedHomes?.();
    },
    onPropertyDeleted: () => {
      // Refresh saved homes when a property is deleted
      if (isAuthenticated) fetchSavedHomes?.();
    },
  });

  const showToast = (message: string, type: 'success' | 'error') => {
      setToast({ show: true, message, type });
  };

  // Fetch saved agents when tab changes to agents
  useEffect(() => {
    const fetchSavedAgents = async () => {
      if (!isAuthenticated || activeTab !== 'agents') return;
      setIsLoadingAgents(true);
      try {
        const agents = await getSavedAgents();
        setSavedAgentsList(agents);
      } catch (error) {
        // Error removed
      } finally {
        setIsLoadingAgents(false);
      }
    };
    fetchSavedAgents();
  }, [isAuthenticated, activeTab]);

  // New nested grouping type for Country -> City -> Properties
  type GroupedHomes = Record<string, Record<string, Property[]>>;

  const groupedHomes = savedHomes.reduce((acc: GroupedHomes, property) => {
    const { country, city } = property;
    if (!acc[country]) {
      acc[country] = {};
    }
    if (!acc[country][city]) {
      acc[country][city] = [];
    }
    acc[country][city].push(property);
    return acc;
  }, {});

  const selectedForComparison = useMemo(() => {
    return comparisonList.map(id => properties.find(p => p.id === id)).filter((p): p is Property => p !== undefined);
  }, [comparisonList, properties]);

  const exampleProperties = useMemo(() => properties.slice(0, 4), [properties]);

  const handleAgentClick = (agent: Agent) => {
    const agentIdentifier = agent.agentId || agent.id;
    dispatch({ type: 'SET_SELECTED_AGENT', payload: agentIdentifier });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agentProfile' });
    window.history.pushState({}, '', `/agents/${agentIdentifier}`);
  };

  const handleBrowseAgents = () => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'agents' });
    window.history.pushState({}, '', '/agents');
  };

  const renderAgentCard = (agent: Agent) => (
    <div
      key={agent.id}
      onClick={() => handleAgentClick(agent)}
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden border border-gray-100 group"
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          {agent.avatarUrl ? (
            <img
              src={agent.avatarUrl}
              alt={agent.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-gray-100"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <UserCircleIcon className="w-16 h-16 text-gray-300" />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-lg truncate group-hover:text-blue-600 transition-colors">
              {agent.name}
            </h3>
            {agent.agencyName && agent.agencyName !== 'Independent Agent' && (
              <p className="text-sm text-gray-500 truncate">{agent.agencyName}</p>
            )}
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={agent.rating || 0} size="sm" />
              <span className="text-sm text-gray-500">
                ({agent.totalReviews || 0} {t('agents:card.reviews')})
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-gray-600">
          {agent.yearsOfExperience && (
            <span>{agent.yearsOfExperience} {t('agents:card.years')}</span>
          )}
          {agent.propertiesSold > 0 && (
            <span>{agent.propertiesSold} {t('agents:card.sales')}</span>
          )}
          {agent.city && (
            <span className="truncate">{agent.city}</span>
          )}
        </div>

        {agent.specializations && agent.specializations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {agent.specializations.slice(0, 3).map((spec, i) => (
              <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded-full">
                {spec}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderPropertiesContent = () => {
    if (isLoadingUserData) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <PropertyCardSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (Object.keys(groupedHomes).length > 0) {
      return (
        <div className="space-y-8">
          {Object.entries(groupedHomes).map(([country, cities]) => (
            <div key={country}>
              <h2 className="text-2xl font-bold text-neutral-800 mb-4 pb-2 border-b-2 border-primary">{country}</h2>
              <div className="space-y-6">
                {Object.entries(cities).map(([city, cityProperties]) => (
                  <div key={city}>
                    <h3 className="text-lg font-semibold text-neutral-700 mb-3">{city}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {cityProperties.map((property) => (
                        <PropertyCard
                          key={property.id}
                          property={property}
                          showCompareButton={true}
                          showToast={showToast}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    } else {
      return (
        <>
          <div className="text-center py-16 px-4 bg-white rounded-2xl shadow-lg relative overflow-hidden">
            {/* 3D Decorative background */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
              <div className="absolute top-4 right-8">
                <FloatingSphere size="md" color="pink" />
              </div>
              <div className="absolute bottom-8 left-8">
                <FloatingSphere size="sm" color="blue" animate={false} />
              </div>
            </div>
            <div className="relative z-10">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center">
                <HeartIcon className="w-10 h-10 text-pink-400" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-800">{t('property:saved.noSaved')}</h3>
              <p className="text-neutral-500 mt-2">{t('property:saved.clickHeart')}</p>
            </div>
          </div>
          <div className="mt-8">
            <h2 className="text-xl font-bold text-neutral-800 mb-4 text-center">{t('property:saved.popularProperties')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {exampleProperties.map((property) => (
                <PropertyCard
                  key={property.id}
                  property={property}
                  showCompareButton={true}
                  showToast={showToast}
                />
              ))}
            </div>
          </div>
        </>
      );
    }
  };

  const renderAgentsContent = () => {
    if (isLoadingAgents) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-white rounded-xl shadow-md p-6 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (savedAgentsList.length > 0) {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedAgentsList.map(renderAgentCard)}
        </div>
      );
    } else {
      return (
        <div className="text-center py-16 px-4 bg-white rounded-2xl shadow-lg relative overflow-hidden">
          {/* 3D Decorative background */}
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div className="absolute top-4 left-8">
              <FloatingSphere size="md" color="purple" />
            </div>
            <div className="absolute bottom-8 right-8">
              <FloatingSphere size="sm" color="cyan" animate={false} />
            </div>
          </div>
          <div className="relative z-10">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center">
              <UsersIcon className="w-10 h-10 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-neutral-800">{t('property:saved.agents.noSaved')}</h3>
            <p className="text-neutral-500 mt-2">{t('property:saved.agents.clickHeart')}</p>
            <button
              onClick={handleBrowseAgents}
              className="mt-6 px-6 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark transition-colors"
            >
              {t('property:saved.agents.browseAgents')}
            </button>
          </div>
        </div>
      );
    }
  };

  const renderContent = () => {
    if (!isAuthenticated) {
      return (
        <div className="text-center py-16 px-4 bg-white rounded-2xl shadow-lg">
          <HeartIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-neutral-800">{t('property:saved.loginToView')}</h3>
          <p className="text-neutral-500 mt-2">{t('property:saved.saveDescription')}</p>
          <button
            onClick={() => dispatch({ type: 'TOGGLE_AUTH_MODAL', payload: { isOpen: true } })}
            className="mt-6 px-6 py-3 bg-primary text-white font-bold rounded-lg shadow-md hover:bg-primary-dark transition-colors"
          >
            {t('nav:loginRegister')}
          </button>
        </div>
      );
    }

    return activeTab === 'properties' ? renderPropertiesContent() : renderAgentsContent();
  };

  const totalSaved = savedHomes.length + savedAgentsList.length;

  return (
    <div className="bg-neutral-50 flex flex-col">

      <Toast
          show={toast.show}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ ...toast, show: false })}
      />
      <ComparisonModal
          isOpen={isComparisonModalOpen}
          onClose={() => setComparisonModalOpen(false)}
          properties={selectedForComparison}
      />

      {/* Modern Hero Banner with Tabs */}
      <SavedItemsHeroBanner
        savedPropertiesCount={savedHomes.length}
        savedAgentsCount={savedAgentsList.length}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        groupedCountries={Object.keys(groupedHomes).length}
      />

      <main className={`flex-grow ${comparisonList.length > 0 ? 'pb-20' : 'pb-8'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {renderContent()}
        </div>
      </main>
      {comparisonList.length > 0 && (
          <ComparisonBar
              properties={selectedForComparison}
              onCompareNow={() => setComparisonModalOpen(true)}
              onRemove={(id) => dispatch({ type: 'REMOVE_FROM_COMPARISON', payload: id })}
              onClear={() => dispatch({ type: 'CLEAR_COMPARISON' })}
          />
      )}

      {/* Featured Agencies */}
      <div className="bg-neutral-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-xl font-bold text-neutral-800 mb-4">{t('property:saved.featuredAgencies')}</h3>
          <FeaturedAgencies />
        </div>
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default SavedPropertiesPage;
