import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Agent } from '@/types';
import {
    CheckCircleIcon,
} from '@/constants';
import DefaultAvatar from '@/components/shared/DefaultAvatar';
import FeaturedAgencies from '@/components/FeaturedAgencies';
import { SEO, Breadcrumbs, generateAgentBreadcrumbs } from '@/src/components/seo';
import { PageTransition, Animated } from '@/src/components/ui/Animations';

// Extracted sub-components
import { useAgentProfile } from './useAgentProfile';
import AgentProfileHeader from './AgentProfileHeader';
import AgentProfileTabs from './AgentProfileTabs';
import AgentEditModal from './AgentEditModal';
import AgentContactActions from './AgentContactActions';
import MarketReportModal from './MarketReportModal';

// ─── Inline Helpers (not extracted) ─────────────────────────────────────────

/**
 * ProfileAvatar - a fallback avatar component with error handling.
 * Kept inline as it is a small utility not shared across features.
 */
const ProfileAvatar: React.FC<{ agent: Agent }> = ({ agent }) => {
    const [error, setError] = useState(false);

    return (
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
            {(!agent.avatarUrl || error) ? (
                <div className="w-full h-full flex items-center justify-center">
                    <DefaultAvatar gender={agent.gender} seed={agent.agentId || agent.id || agent.name} avatarOptions={agent.avatarOptions} show3d />
                </div>
            ) : (
                <img
                    src={agent.avatarUrl}
                    alt={agent.name}
                    className="w-full h-full object-cover"
                    onError={() => setError(true)}
                />
            )}
        </div>
    );
};

// ─── Main Component ─────────────────────────────────────────────────────────

interface AgentProfilePageProps {
    agent: Agent;
}

const AgentProfilePage: React.FC<AgentProfilePageProps> = ({ agent }) => {
    const { t } = useTranslation(['agents']);

    // All state, computed values, effects, and handlers live in the hook
    const profile = useAgentProfile({ agent });

    // Build SEO data
    const agentName = profile.agentData.name;
    const agentCity = profile.agentData.city || '';
    const agentCountry = profile.agentData.country || '';
    const locationStr = [agentCity, agentCountry].filter(Boolean).join(', ');
    const seoTitle = t('agents:seo.agentTitle', {
        name: agentName,
        location: locationStr || 'the Balkans',
        defaultValue: `${agentName} - Real Estate Agent in ${locationStr || 'the Balkans'}`,
    });
    const seoDescription = profile.agentData.bio
        ? `${agentName} - ${profile.agentData.bio.slice(0, 140)}`
        : t('agents:seo.agentDescription', {
            name: agentName,
            location: locationStr || 'the Balkans',
            sales: profile.stats.totalSales,
            listings: profile.activeListings.length,
            defaultValue: `${agentName} is a verified real estate agent in ${locationStr || 'the Balkans'} on BalkanEstateAI. ${profile.stats.totalSales} properties sold, ${profile.activeListings.length} active listings. Contact today.`,
        });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* SEO Meta Tags + Agent Schema with AggregateRating */}
            <SEO
                title={seoTitle}
                description={seoDescription}
                canonical={`${typeof window !== 'undefined' ? window.location.origin : ''}/agents/${profile.agentData.agentId || profile.agentData.id}`}
                image={profile.agentData.avatarUrl}
                type="website"
                agent={{
                    name: agentName,
                    image: profile.agentData.avatarUrl,
                    description: profile.agentData.bio,
                    phone: profile.agentData.phone,
                    email: profile.agentData.email,
                    city: agentCity,
                    country: agentCountry,
                    rating: profile.agentData.rating,
                    totalReviews: profile.agentData.totalReviews || profile.stats.reviews,
                    activeListings: profile.activeListings.length,
                    propertiesSold: profile.stats.totalSales,
                    specializations: profile.agentData.specializations,
                    languages: profile.agentData.languages,
                    yearsOfExperience: profile.agentData.yearsOfExperience,
                    agencyName: profile.isAgencyAgent ? profile.agentData.agencyName : undefined,
                    agencySlug: profile.isAgencyAgent ? profile.agentData.agencySlug : undefined,
                }}
            />

            {/* SEO Breadcrumbs - Hidden visually but provides JSON-LD BreadcrumbList schema */}
            <div className="sr-only">
                <Breadcrumbs
                    items={generateAgentBreadcrumbs({
                        id: profile.agentData.agentId || profile.agentData.id,
                        name: agentName,
                        city: agentCity,
                        country: agentCountry,
                    })}
                />
            </div>

            {/* Header (sticky nav bar with back/save/share) + Hero Section */}
            <PageTransition>
            <AgentProfileHeader
                agent={profile.agentData}
                stats={profile.stats}
                activeListings={profile.activeListings}
                isAgencyAgent={profile.isAgencyAgent}
                agencyData={profile.agencyData}
                agencyGradient={profile.agencyGradient}
                headerGradient={profile.headerGradient}
                savedAgent={profile.savedAgent}
                isOwner={profile.isOwner}
                hasCoverImage={profile.hasCoverImage}
                onBack={profile.handleBack}
                onSaveAgent={profile.handleSaveAgent}
                onShareAgent={profile.handleShareAgent}
                onAgencyClick={profile.handleAgencyClick}
                onVisitAgency={profile.handleVisitAgency}
                onOpenEditModal={profile.handleOpenEditModal}
            />
            </PageTransition>

            {/* Main Content Area */}
            <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
                <div className="lg:flex lg:gap-8">
                    {/* Left Column - Main Content */}
                    <Animated variant="fadeInUp" delay={100} className="lg:w-2/3">
                        <AgentProfileTabs
                            agent={profile.agentData}
                            stats={profile.stats}
                            marketInsights={profile.marketInsights}
                            activeTab={profile.activeTab}
                            setActiveTab={profile.setActiveTab}
                            activeListings={profile.activeListings}
                            soldProperties={profile.soldProperties}
                            rentedProperties={profile.rentedProperties}
                            allAgentProperties={profile.allAgentProperties}
                            loadingProperties={profile.loadingProperties}
                            hasValidCoordinates={profile.hasValidCoordinates}
                            mapCardOpen={profile.mapCardOpen}
                            setMapCardOpen={profile.setMapCardOpen}
                            isAgencyAgent={profile.isAgencyAgent}
                            firstName={profile.firstName}
                            isOwner={profile.isOwner}
                            canWriteReview={profile.canWriteReview}
                            showReviewForm={profile.showReviewForm}
                            setShowReviewForm={profile.setShowReviewForm}
                            agentAchievements={profile.agentAchievements}
                            agentCredentials={profile.agentCredentials}
                            onContactAgent={profile.handleContactAgent}
                            onSearchAllProperties={profile.handleSearchAllProperties}
                            onRequestMarketReport={profile.handleRequestMarketReport}
                            onViewProperty={profile.handleViewProperty}
                        />
                    </Animated>

                    {/* Right Column - Sidebar */}
                    <Animated variant="fadeInUp" delay={200} className="lg:w-1/3">
                        <AgentContactActions
                            agent={profile.agentData}
                            firstName={profile.firstName}
                            isAgencyAgent={profile.isAgencyAgent}
                            agencyData={profile.agencyData}
                            agencyGradient={profile.agencyGradient}
                            onVisitAgency={profile.handleVisitAgency}
                            similarAgents={profile.similarAgents}
                            loadingSimilarAgents={profile.loadingSimilarAgents}
                            showAppraisalModal={profile.showAppraisalModal}
                            setShowAppraisalModal={profile.setShowAppraisalModal}
                            showConsultationModal={profile.showConsultationModal}
                            setShowConsultationModal={profile.setShowConsultationModal}
                            showInquiryModal={profile.showInquiryModal}
                            setShowInquiryModal={profile.setShowInquiryModal}
                            appraisalForm={profile.appraisalForm}
                            setAppraisalForm={profile.setAppraisalForm}
                            consultationForm={profile.consultationForm}
                            setConsultationForm={profile.setConsultationForm}
                            isSubmitting={profile.isSubmitting}
                            currentUser={profile.currentUser}
                            onRequestAppraisal={profile.handleRequestAppraisal}
                            onSubmitAppraisal={profile.handleSubmitAppraisal}
                            onSubmitConsultation={profile.handleSubmitConsultation}
                            onRequestMarketReport={profile.handleRequestMarketReport}
                            onSelectSimilarAgent={profile.handleSelectSimilarAgent}
                            onViewMoreAgents={profile.handleViewMoreAgents}
                            marketInsights={profile.marketInsights}
                        />
                    </Animated>
                </div>
            </main>

            {/* Bottom CTA */}
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-3xl font-bold mb-4">
                        {t('profilePage.bottomCta.readyToWork', { name: profile.firstName })}
                    </h2>
                    <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
                        {t('profilePage.bottomCta.contactToday', { name: profile.firstName })}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href={`tel:${agent.phone || ''}`}
                            className="bg-white text-gray-900 hover:bg-gray-100 font-bold py-3 px-8 rounded-xl transition-colors shadow-lg"
                        >
                            {agent.phone
                                ? t('profilePage.bottomCta.callNow', { phone: agent.phone })
                                : t('profilePage.bottomCta.contactForNumber')}
                        </a>
                        <button
                            onClick={profile.handleScheduleConsultation}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl transition-colors"
                        >
                            {t('profilePage.bottomCta.scheduleConsultation')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Featured Agencies */}
            <div className="bg-neutral-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <h3 className="text-xl font-bold text-neutral-800 mb-4">
                        {t('profilePage.featuredAgencies')}
                    </h3>
                    <FeaturedAgencies />
                </div>
            </div>

            {/* Share Toast Notification */}
            {profile.showShareToast && (
                <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-xl z-50 flex items-center gap-3 animate-fade-in">
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    <span>{t('profilePage.linkCopied')}</span>
                </div>
            )}

            {/* Market Report Modal */}
            <MarketReportModal
                isOpen={profile.showMarketReportModal}
                onClose={() => profile.setShowMarketReportModal(false)}
                city={profile.agentData.city || ''}
                country={profile.agentData.country || ''}
                agentName={profile.firstName}
                onContactAgent={profile.handleMarketReportContact}
            />

            {/* Edit Profile Modal */}
            <AgentEditModal
                isOpen={profile.isEditModalOpen}
                onClose={() => profile.setIsEditModalOpen(false)}
                editForm={profile.editForm}
                setEditForm={profile.setEditForm}
                isSavingProfile={profile.isSavingProfile}
                agentAchievements={profile.agentAchievements}
                onSaveProfile={profile.handleSaveProfile}
                onAddArrayItem={profile.handleAddArrayItem}
                onRemoveArrayItem={profile.handleRemoveArrayItem}
                onAddAchievement={profile.handleAddAchievement}
                onEditAchievement={profile.handleEditAchievement}
                onDeleteAchievement={profile.handleDeleteAchievement}
                agentCredentials={profile.agentCredentials}
                onCredentialsChange={profile.setAgentCredentials}
                licenseStatus={profile.agentData.licenseStatus || (profile.agentData.licenseVerified ? 'verified' : profile.agentData.licenseNumber ? 'pending' : 'none')}
                licenseNumber={profile.agentData.licenseNumber}
                licenseCountry={profile.agentData.licenseCountry}
                onLicenseSubmitted={profile.handleLicenseSubmitted}
                centerLat={profile.agentData.lat}
                centerLng={profile.agentData.lng}
            />
        </div>
    );
};

export default AgentProfilePage;
