import React from 'react';
import { useTranslation } from 'react-i18next';
import { Agent } from '@/types';
import {
    PhoneIcon,
    EnvelopeIcon,
    ChatBubbleBottomCenterTextIcon,
    CheckCircleIcon,
    UsersIcon,
    ChevronRightIcon,
    UserCircleIcon,
    ShieldCheckIcon,
    AcademicCapIcon,
    TrophyIcon,
    XMarkIcon,
    BuildingOfficeIcon,
    HomeIcon,
    MapPinIcon,
} from '@/constants';
import StarRating from '@/components/shared/StarRating';
import DefaultAvatar from '@/components/shared/DefaultAvatar';
import UserAvatar from '@/components/shared/UserAvatar';
import AgentInquiryModal from '@/src/features/inquiries/components/AgentInquiryModal';
import { Agency } from '@/types';
import { AppraisalFormData, ConsultationFormData, MarketInsights } from './useAgentProfile';

interface AgentContactActionsProps {
    agent: Agent;
    firstName: string;
    isAgencyAgent: string | false | undefined;
    agencyData?: Agency | null;
    agencyGradient?: string;
    onVisitAgency?: () => void;
    similarAgents: Agent[];
    loadingSimilarAgents: boolean;
    showAppraisalModal: boolean;
    setShowAppraisalModal: (show: boolean) => void;
    showConsultationModal: boolean;
    setShowConsultationModal: (show: boolean) => void;
    showInquiryModal: boolean;
    setShowInquiryModal: (show: boolean) => void;
    appraisalForm: AppraisalFormData;
    setAppraisalForm: React.Dispatch<React.SetStateAction<AppraisalFormData>>;
    consultationForm: ConsultationFormData;
    setConsultationForm: React.Dispatch<React.SetStateAction<ConsultationFormData>>;
    isSubmitting: boolean;
    currentUser: any;
    onRequestAppraisal: () => void;
    onSubmitAppraisal: (e: React.FormEvent) => void;
    onSubmitConsultation: (e: React.FormEvent) => void;
    onRequestMarketReport: () => void;
    onSelectSimilarAgent: (agent: Agent) => void;
    onViewMoreAgents: () => void;
    marketInsights?: MarketInsights;
}

const AgentContactActions: React.FC<AgentContactActionsProps> = ({
    agent,
    firstName,
    isAgencyAgent,
    agencyData,
    agencyGradient = 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-900',
    onVisitAgency,
    similarAgents,
    loadingSimilarAgents,
    showAppraisalModal,
    setShowAppraisalModal,
    showConsultationModal,
    setShowConsultationModal,
    showInquiryModal,
    setShowInquiryModal,
    appraisalForm,
    setAppraisalForm,
    consultationForm,
    setConsultationForm,
    isSubmitting,
    currentUser,
    onRequestAppraisal,
    onSubmitAppraisal,
    onSubmitConsultation,
    onRequestMarketReport,
    onSelectSimilarAgent,
    onViewMoreAgents,
    marketInsights,
}) => {
    const { t } = useTranslation(['agents']);

    return (
        <>
            {/* Contact Agent Card */}
            <div className="bg-gradient-to-b from-blue-600 to-indigo-700 rounded-2xl shadow-xl p-6 mb-6 text-white">
                <h3 className="text-xl font-bold mb-4">{t('profilePage.contact.title', { name: firstName })}</h3>

                {agent.phone && (
                    <a
                        href={`tel:${agent.phone}`}
                        className="flex items-center gap-3 bg-white/10 hover:bg-white/20 active:bg-white/25 p-4 rounded-xl mb-3 transition-colors min-h-[56px]"
                    >
                        <PhoneIcon className="w-6 h-6 flex-shrink-0" />
                        <div className="min-w-0">
                            <div className="font-semibold">{t('profilePage.contact.callDirect')}</div>
                            <div className="text-lg font-bold truncate">{agent.phone}</div>
                        </div>
                    </a>
                )}

                {agent.email && (
                    <a
                        href={`mailto:${agent.email}`}
                        className="flex items-center gap-3 bg-white/10 hover:bg-white/20 active:bg-white/25 p-4 rounded-xl mb-3 transition-colors min-h-[56px]"
                    >
                        <EnvelopeIcon className="w-6 h-6 flex-shrink-0" />
                        <div className="min-w-0">
                            <div className="font-semibold">{t('profilePage.contact.sendEmail')}</div>
                            <div className="text-sm truncate">{agent.email}</div>
                        </div>
                    </a>
                )}

                {/* WhatsApp & Viber side by side on mobile */}
                {agent.phone && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <a
                        href={`https://wa.me/${agent.phone.replace(/[\s\-\(\)]/g, '')}?text=${encodeURIComponent(
                            t('profilePage.contact.whatsappMessage', {
                                name: agent.name,
                                defaultValue: `Hi ${agent.name}, I found your profile on BalkanEstate and would like to discuss real estate opportunities.`
                            })
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 active:bg-[#25D366]/40 p-3.5 rounded-xl transition-colors min-h-[56px]"
                    >
                        <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        <div className="min-w-0">
                            <div className="font-semibold text-sm">{t('profilePage.contact.whatsapp', 'WhatsApp')}</div>
                            <div className="text-xs opacity-80 truncate">{t('profilePage.contact.whatsappDesc', 'Chat or call via WhatsApp')}</div>
                        </div>
                    </a>

                    <a
                        href={`viber://chat?number=${agent.phone.replace(/[\s\-\(\)\+]/g, '')}`}
                        onClick={(e) => {
                            const phone = agent.phone!.replace(/[\s\-\(\)\+]/g, '');
                            const deepLink = `viber://chat?number=${phone}`;
                            const fallback = 'https://www.viber.com/';
                            e.preventDefault();
                            window.location.href = deepLink;
                            setTimeout(() => {
                                if (!document.hidden) window.open(fallback, '_blank');
                            }, 1500);
                        }}
                        className="flex items-center gap-2 bg-[#7360F2]/20 hover:bg-[#7360F2]/30 active:bg-[#7360F2]/40 p-3.5 rounded-xl transition-colors min-h-[56px]"
                    >
                        <svg className="w-6 h-6 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1C6.477 1 2 5.477 2 11c0 2.136.67 4.116 1.81 5.74L2 22l5.26-1.81A9.94 9.94 0 0012 21c5.523 0 10-4.477 10-10S17.523 1 12 1zm-1.5 4.5c.3 0 .55.12.7.4l.9 1.7c.15.3.08.6-.15.8l-.5.6c-.12.15-.08.35.08.52.35.45.75.87 1.2 1.25.5.42 1.05.78 1.65 1.05.2.1.4.06.55-.1l.45-.55c.18-.22.42-.25.68-.12l1.7.9c.28.15.38.4.3.7-.12.48-.38.9-.75 1.2-.33.27-.72.45-1.15.5-.35.04-.7.02-.95-.05-.82-.22-1.6-.6-2.35-1.12-1.2-.83-2.25-1.88-3.1-3.1-.55-.75-.95-1.55-1.15-2.4-.12-.5-.08-1 .12-1.45.18-.4.45-.72.78-1 .3-.25.62-.43.95-.43z" />
                        </svg>
                        <div className="min-w-0">
                            <div className="font-semibold text-sm">{t('profilePage.contact.viber', 'Viber')}</div>
                            <div className="text-xs opacity-80 truncate">{t('profilePage.contact.viberDesc', 'Chat or call via Viber')}</div>
                        </div>
                    </a>
                  </div>
                )}

                {/* Send Inquiry Button */}
                <button
                    onClick={() => setShowInquiryModal(true)}
                    className="w-full flex items-center justify-center gap-3 bg-white text-blue-700 font-bold p-4 rounded-xl hover:bg-blue-50 active:bg-blue-100 transition-colors shadow-md min-h-[56px]"
                >
                    <ChatBubbleBottomCenterTextIcon className="w-6 h-6" />
                    <span>{t('profilePage.contact.sendInquiry', 'Send Inquiry')}</span>
                </button>
            </div>

            {/* Agent Inquiry Modal */}
            <AgentInquiryModal
                agent={{
                    id: agent.id,
                    userId: agent.userId,
                    agentId: agent.agentId,
                    name: agent.name,
                    avatarUrl: agent.avatarUrl,
                    agencyName: agent.agencyName,
                    city: agent.city,
                    country: agent.country,
                }}
                isOpen={showInquiryModal}
                onClose={() => setShowInquiryModal(false)}
                defaultName={currentUser?.name || ''}
                defaultEmail={currentUser?.email || ''}
                defaultPhone={currentUser?.phone || ''}
            />

            {/* Agency Card */}
            {isAgencyAgent && agencyData && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden mb-6">
                    {/* Agency Header with Gradient */}
                    <div className={`${agencyGradient} p-4 sm:p-6 text-white relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-black/10" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                    {agencyData.logo ? (
                                        <img
                                            src={agencyData.logo}
                                            alt={agencyData.name}
                                            loading="lazy"
                                            decoding="async"
                                            className="w-8 h-8 sm:w-12 sm:h-12 object-cover rounded-md sm:rounded-lg"
                                        />
                                    ) : (
                                        <BuildingOfficeIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] sm:text-xs font-medium text-white/80 mb-0.5 sm:mb-1">{t('profilePage.agencyCard.memberOf')}</p>
                                    <h3 className="text-sm sm:text-lg font-bold text-white truncate">{agencyData.name}</h3>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Agency Stats */}
                    <div className="p-3 sm:p-5 bg-gradient-to-b from-gray-50 to-white">
                        <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
                            <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                    <UsersIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600" />
                                    <span className="text-[10px] sm:text-xs text-gray-600 font-medium">{t('profilePage.agencyCard.agents')}</span>
                                </div>
                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{agencyData.totalAgents || 0}</p>
                            </div>
                            <div className="bg-white rounded-lg sm:rounded-xl p-2 sm:p-3 border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
                                    <HomeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                                    <span className="text-[10px] sm:text-xs text-gray-600 font-medium">{t('profilePage.agencyCard.properties')}</span>
                                </div>
                                <p className="text-xl sm:text-2xl font-bold text-gray-900">{agencyData.totalProperties || 0}</p>
                            </div>
                        </div>

                        {/* Location */}
                        {agencyData.city && (
                            <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 text-gray-600 bg-white rounded-lg p-2 sm:p-3 border border-gray-200">
                                <MapPinIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 text-gray-500" />
                                <span className="text-xs sm:text-sm truncate">{agencyData.city}, {agencyData.country}</span>
                            </div>
                        )}

                        {/* Visit Agency Button */}
                        <button
                            onClick={onVisitAgency}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 sm:py-3.5 px-3 sm:px-4 rounded-lg sm:rounded-xl transition-all duration-300 shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 sm:gap-2 group text-sm sm:text-base"
                        >
                            <BuildingOfficeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>{t('profilePage.agencyCard.visitAgency')}</span>
                            <ChevronRightIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            )}

            {/* Request Appraisal Card */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">{t('profilePage.appraisal.title')}</h3>
                <p className="text-gray-600 mb-4">
                    {t('profilePage.appraisal.description', { name: firstName })}
                </p>
                <button
                    onClick={onRequestAppraisal}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                    {t('profilePage.appraisal.requestAppraisal')}
                </button>
                <div className="text-center text-sm text-gray-500 mt-3">
                    <CheckCircleIcon className="w-4 h-4 inline mr-1 text-green-500" />
                    {t('profilePage.appraisal.freeNoObligation')}
                </div>
            </div>

            {/* Similar Agents / Agents from Same Agency */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <UsersIcon className="w-5 h-5 text-blue-600" />
                    {isAgencyAgent ? t('profilePage.similarAgents.fromSameAgency') : t('profilePage.similarAgents.otherInArea')}
                </h3>
                {loadingSimilarAgents ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                                <div className="w-12 h-12 rounded-full bg-gray-200" />
                                <div className="flex-1">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : similarAgents.length > 0 ? (
                    <div className="space-y-2">
                        {similarAgents.map((similarAgent, index) => (
                            <div
                                key={similarAgent.id}
                                onClick={() => onSelectSimilarAgent(similarAgent)}
                                className="group flex items-center gap-3 p-3 hover:bg-blue-50 rounded-xl transition-all duration-300 cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
                                style={{ animationDelay: `${index * 80}ms` }}
                            >
                                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white shadow-sm transition-shadow duration-300 group-hover:shadow-md group-hover:border-blue-200">
                                    <UserAvatar src={similarAgent.avatarUrl} alt={similarAgent.name} gender={similarAgent.gender} seed={similarAgent.agentId || similarAgent.id || similarAgent.name} avatarOptions={similarAgent.avatarOptions} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-gray-900 truncate">{similarAgent.name}</p>
                                    <div className="flex items-center gap-1">
                                        <StarRating rating={similarAgent.rating || 0} />
                                        <span className="text-sm text-gray-600">
                                            {(similarAgent.rating || 0).toFixed(1)} ({similarAgent.totalReviews || similarAgent.testimonials?.length || 0})
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 truncate">
                                        {similarAgent.agencyName || `${similarAgent.city || ''}, ${similarAgent.country || ''}`}
                                    </p>
                                </div>
                                <ChevronRightIcon className="w-5 h-5 text-gray-400 transition-all duration-300 group-hover:text-blue-500 group-hover:translate-x-1" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <UsersIcon className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-600 font-medium">{t('profilePage.similarAgents.noSimilarAgents')}</p>
                    </div>
                )}
                <button
                    onClick={onViewMoreAgents}
                    className="w-full mt-4 text-center text-blue-600 hover:text-blue-700 font-semibold text-sm py-2"
                >
                    {agent.city ? t('profilePage.similarAgents.viewMoreIn', { city: agent.city }) : t('profilePage.similarAgents.viewMoreGeneric')}
                </button>
            </div>

            {/* Agent Credentials */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6 mt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">{t('profilePage.credentials.title')}</h3>
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <ShieldCheckIcon className="w-5 h-5 text-green-500" />
                        <div>
                            <p className="font-medium text-gray-900">{t('profilePage.credentials.licensedAgent')}</p>
                            <p className="text-sm text-gray-600">{agent.licenseNumber || t('profilePage.credentials.memberOfAssociation')}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <AcademicCapIcon className="w-5 h-5 text-blue-500" />
                        <div>
                            <p className="font-medium text-gray-900">{t('profilePage.credentials.professionalCertifications')}</p>
                            <p className="text-sm text-gray-600">
                                {agent.certifications?.join(', ') || t('profilePage.credentials.memberOfAssociation')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <TrophyIcon className="w-5 h-5 text-amber-500" />
                        <div>
                            <p className="font-medium text-gray-900">{t('profilePage.credentials.awardsRecognition')}</p>
                            <p className="text-sm text-gray-600">
                                {agent.awards?.join(', ') || t('profilePage.credentials.noAwards')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            {marketInsights && (marketInsights.totalSold > 0 || marketInsights.totalActive > 0) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 mt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-3">{t('profilePage.marketInsights.quickStats', 'Quick Stats')}</h3>
                <div className="space-y-2.5">
                    <div className="flex justify-between items-center p-2.5 bg-green-50 rounded-lg">
                        <span className="text-sm text-gray-700">{t('profilePage.marketInsights.activeListings', 'Active Listings')}</span>
                        <span className="font-bold text-green-700">{marketInsights.totalActive}</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 bg-blue-50 rounded-lg">
                        <span className="text-sm text-gray-700">{t('profilePage.marketInsights.propertiesSold', 'Properties Sold')}</span>
                        <span className="font-bold text-blue-700">{marketInsights.totalSold}</span>
                    </div>
                    {marketInsights.hasRealSalesData && marketInsights.avgDaysToSell > 0 && (
                    <div className="flex justify-between items-center p-2.5 bg-orange-50 rounded-lg">
                        <span className="text-sm text-gray-700">{t('profilePage.marketInsights.avgDaysToSell', 'Avg. Days to Sell')}</span>
                        <span className="font-bold text-orange-700">{marketInsights.avgDaysToSell} {t('profilePage.marketInsights.days', 'days')}</span>
                    </div>
                    )}
                </div>
                <button
                    onClick={onRequestMarketReport}
                    className="w-full mt-3 text-center text-blue-600 hover:text-blue-700 font-semibold text-sm py-2"
                >
                    {t('profilePage.marketInsights.requestReport', 'Ask for a Market Report')} →
                </button>
            </div>
            )}

            {/* Appraisal Request Modal */}
            {showAppraisalModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">{t('profilePage.appraisalModal.title')}</h3>
                            <button
                                onClick={() => setShowAppraisalModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={onSubmitAppraisal} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    {t('profilePage.appraisalModal.propertyAddress')}
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={appraisalForm.address}
                                    onChange={(e) => setAppraisalForm({ ...appraisalForm, address: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder={t('profilePage.appraisalModal.enterAddress')}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    {t('profilePage.appraisalModal.propertyType')}
                                </label>
                                <select
                                    required
                                    value={appraisalForm.propertyType}
                                    onChange={(e) => setAppraisalForm({ ...appraisalForm, propertyType: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">{t('profilePage.appraisalModal.selectType')}</option>
                                    <option value="apartment">{t('profilePage.appraisalModal.apartment')}</option>
                                    <option value="house">{t('profilePage.appraisalModal.house')}</option>
                                    <option value="villa">{t('profilePage.appraisalModal.villa')}</option>
                                    <option value="land">{t('profilePage.appraisalModal.land')}</option>
                                    <option value="commercial">{t('profilePage.appraisalModal.commercial')}</option>
                                    <option value="other">{t('profilePage.appraisalModal.other')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    {t('profilePage.appraisalModal.additionalNotes')}
                                </label>
                                <textarea
                                    value={appraisalForm.notes}
                                    onChange={(e) => setAppraisalForm({ ...appraisalForm, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder={t('profilePage.appraisalModal.additionalInfo')}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAppraisalModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    {t('profilePage.appraisalModal.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            {t('profilePage.appraisalModal.sending')}
                                        </>
                                    ) : (
                                        t('profilePage.appraisalModal.submitRequest')
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Consultation Request Modal */}
            {showConsultationModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">{t('profilePage.consultationModal.title')}</h3>
                            <button
                                onClick={() => setShowConsultationModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <XMarkIcon className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                        <form onSubmit={onSubmitConsultation} className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {t('profilePage.consultationModal.preferredDate')}
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={consultationForm.date}
                                        onChange={(e) => setConsultationForm({ ...consultationForm, date: e.target.value })}
                                        min={new Date().toISOString().split('T')[0]}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[48px]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        {t('profilePage.consultationModal.preferredTime')}
                                    </label>
                                    <select
                                        required
                                        value={consultationForm.time}
                                        onChange={(e) => setConsultationForm({ ...consultationForm, time: e.target.value })}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[48px]"
                                    >
                                        <option value="">{t('profilePage.consultationModal.selectTime')}</option>
                                        <option value="09:00">09:00 AM</option>
                                        <option value="10:00">10:00 AM</option>
                                        <option value="11:00">11:00 AM</option>
                                        <option value="12:00">12:00 PM</option>
                                        <option value="13:00">01:00 PM</option>
                                        <option value="14:00">02:00 PM</option>
                                        <option value="15:00">03:00 PM</option>
                                        <option value="16:00">04:00 PM</option>
                                        <option value="17:00">05:00 PM</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    {t('profilePage.consultationModal.topic')}
                                </label>
                                <select
                                    required
                                    value={consultationForm.topic}
                                    onChange={(e) => setConsultationForm({ ...consultationForm, topic: e.target.value })}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="">{t('profilePage.consultationModal.selectTopic')}</option>
                                    <option value="buying">{t('profilePage.consultationModal.buyingProperty')}</option>
                                    <option value="selling">{t('profilePage.consultationModal.sellingProperty')}</option>
                                    <option value="investing">{t('profilePage.consultationModal.realEstateInvestment')}</option>
                                    <option value="market">{t('profilePage.consultationModal.marketAnalysis')}</option>
                                    <option value="other">{t('profilePage.consultationModal.other')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    {t('profilePage.consultationModal.additionalNotes')}
                                </label>
                                <textarea
                                    value={consultationForm.notes}
                                    onChange={(e) => setConsultationForm({ ...consultationForm, notes: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                    placeholder={t('profilePage.consultationModal.whatToDiscuss')}
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowConsultationModal(false)}
                                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                                >
                                    {t('profilePage.consultationModal.cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            {t('profilePage.consultationModal.scheduling')}
                                        </>
                                    ) : (
                                        t('profilePage.consultationModal.scheduleConsultation')
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default AgentContactActions;
