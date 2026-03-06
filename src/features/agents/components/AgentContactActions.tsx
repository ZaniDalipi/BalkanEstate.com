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
} from '@/constants';
import StarRating from '@/components/shared/StarRating';
import DefaultAvatar from '@/components/shared/DefaultAvatar';
import UserAvatar from '@/components/shared/UserAvatar';
import AgentInquiryModal from '@/src/features/inquiries/components/AgentInquiryModal';
import { AppraisalFormData, ConsultationFormData, MarketInsights } from './useAgentProfile';

interface AgentContactActionsProps {
    agent: Agent;
    firstName: string;
    isAgencyAgent: string | false | undefined;
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
                        className="flex items-center gap-3 bg-white/10 hover:bg-white/20 p-4 rounded-xl mb-3 transition-colors"
                    >
                        <PhoneIcon className="w-6 h-6" />
                        <div>
                            <div className="font-semibold">{t('profilePage.contact.callDirect')}</div>
                            <div className="text-lg font-bold">{agent.phone}</div>
                        </div>
                    </a>
                )}

                {agent.email && (
                    <a
                        href={`mailto:${agent.email}`}
                        className="flex items-center gap-3 bg-white/10 hover:bg-white/20 p-4 rounded-xl mb-3 transition-colors"
                    >
                        <EnvelopeIcon className="w-6 h-6" />
                        <div>
                            <div className="font-semibold">{t('profilePage.contact.sendEmail')}</div>
                            <div className="text-sm truncate">{agent.email}</div>
                        </div>
                    </a>
                )}

                {/* WhatsApp Contact */}
                {agent.phone && (
                    <a
                        href={`https://wa.me/${agent.phone.replace(/[\s\-\(\)]/g, '')}?text=${encodeURIComponent(
                            t('profilePage.contact.whatsappMessage', {
                                name: agent.name,
                                defaultValue: `Hi ${agent.name}, I found your profile on BalkanEstate and would like to discuss real estate opportunities.`
                            })
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-[#25D366]/20 hover:bg-[#25D366]/30 p-4 rounded-xl mb-3 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        <div>
                            <div className="font-semibold">{t('profilePage.contact.whatsapp', 'WhatsApp')}</div>
                            <div className="text-sm opacity-80">{t('profilePage.contact.whatsappDesc', 'Chat or call via WhatsApp')}</div>
                        </div>
                    </a>
                )}

                {/* Viber Contact */}
                {agent.phone && (
                    <a
                        href={`viber://chat?number=${agent.phone.replace(/[\s\-\(\)\+]/g, '')}`}
                        className="flex items-center gap-3 bg-[#7360F2]/20 hover:bg-[#7360F2]/30 p-4 rounded-xl mb-3 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M11.398.002C9.473.028 5.331.344 3.014 2.467 1.294 4.177.518 6.77.41 9.91.302 13.05.088 18.953 5.978 20.637l.043.013v2.93s-.035.567.348.684c.462.14.733-.298 1.175-.773.242-.26.576-.642.828-.926l.026-.03.021-.024c2.237 2.14 5.103 2.804 7.537 2.907h.002c.093.004.184.006.273.006 1.868 0 3.473-.408 4.748-1.164l.028-.016c1.72-1.02 2.868-2.414 3.59-3.586.58-.94.886-1.878 1.052-2.682.18-.871.2-1.558.192-1.942l-.001-.057C24.242 6.743 18.303.259 12.094.014c-.234-.01-.468-.014-.696-.012zM11.4 1.466c.2-.002.401.002.607.01 5.455.213 10.628 5.977 10.625 14.38.003.258.003.886-.156 1.654-.14.68-.4 1.476-.893 2.275-.63 1.023-1.634 2.243-3.146 3.14-1.098.65-2.506 1.024-4.147 1.024-.081 0-.163-.002-.247-.005-2.108-.09-4.727-.648-6.8-2.67l-.076-.073-.081-.088.042.047.01.011c.018.02.017.015.001-.012a1.64 1.64 0 00-.076-.093c-.234-.276-.556-.64-.787-.891-.173-.19-.323-.339-.443-.417-.093-.06-.116-.04-.085-.049l.016-.005-.258-.082C3.154 18.4 1.77 13.443 1.873 9.95c.1-2.888.81-5.193 2.288-6.66C6.137 1.388 9.702 1.07 11.4 1.466zM11.93 4.19c-.11 0-.155.08-.14.18a.326.326 0 00.07.147c.48.498.876 1.054 1.205 1.652a6.818 6.818 0 01.699 1.902c.07.313.115.638.14.963l.001.02c.004.03.016.064.046.089a.129.129 0 00.088.027h.006c.064-.005.098-.059.1-.107a7.395 7.395 0 00-.14-1.13 7.498 7.498 0 00-.76-2.04 8.11 8.11 0 00-1.256-1.665.196.196 0 00-.06-.037zm-3.78.67a.93.93 0 00-.457.128c-.332.185-.633.42-.888.699l-.012.013-.007.008a1.872 1.872 0 00-.48.872c-.105.47-.012.986.194 1.537l.004.012.006.011c.614 1.437 1.437 2.772 2.444 3.956a14.71 14.71 0 003.57 3.244c.757.492 1.553.916 2.38 1.267l.013.006h.001c.35.145.702.221 1.033.221.402 0 .773-.119 1.063-.369l.01-.009.01-.008c.253-.232.468-.501.635-.799.192-.355.096-.744-.195-.965a10.4 10.4 0 00-1.713-1.076l-.01-.005c-.321-.17-.7-.138-1 .094l-.534.44a.506.506 0 01-.565.06l-.024-.014a10.89 10.89 0 01-2.087-1.51 10.696 10.696 0 01-1.596-1.881l-.02-.032a.504.504 0 01.009-.55l.388-.555c.206-.298.24-.67.073-.992l-.006-.012a10.73 10.73 0 00-.968-1.587c-.13-.16-.31-.25-.487-.259h-.001a.75.75 0 00-.135-.024c-.028-.002-.055-.003-.082-.003v.001l-.102-.002h-.015zm5.42.51c-.079-.007-.135.06-.128.131.03.245.039.493.025.74a4.165 4.165 0 01-.287 1.332c-.09.222-.2.437-.332.634l-.003.008c-.034.053-.01.118.04.15.017.01.034.016.05.016a.1.1 0 00.078-.035c.286-.377.51-.795.67-1.24.168-.48.255-.987.258-1.497l.001-.019a.098.098 0 00-.031-.093c-.017-.012-.035-.019-.055-.022l-.005-.001-.016-.003h-.001a.265.265 0 00-.038-.003h-.006l-.007-.001a.236.236 0 00-.017-.001l-.006-.001h-.02l-.008-.002h-.008l-.016-.002a.284.284 0 00-.038-.002h-.011l-.008-.001h-.028zm-1.43.317c-.11 0-.156.104-.128.195.1.31.223.61.372.895.217.42.491.81.814 1.153l.017.018c.02.02.04.027.06.027a.088.088 0 00.073-.038.097.097 0 00-.005-.119 5.629 5.629 0 01-.77-1.072 5.1 5.1 0 01-.344-.864.16.16 0 00-.055-.1.1.1 0 00-.034-.023l-.016-.005c-.006-.002-.012-.002-.019-.002v-.065z" />
                        </svg>
                        <div>
                            <div className="font-semibold">{t('profilePage.contact.viber', 'Viber')}</div>
                            <div className="text-sm opacity-80">{t('profilePage.contact.viberDesc', 'Chat or call via Viber')}</div>
                        </div>
                    </a>
                )}

                {/* Send Inquiry Button */}
                <button
                    onClick={() => setShowInquiryModal(true)}
                    className="w-full flex items-center justify-center gap-3 bg-white text-blue-700 font-bold p-4 rounded-xl hover:bg-blue-50 transition-colors shadow-md"
                >
                    <ChatBubbleBottomCenterTextIcon className="w-6 h-6" />
                    <span>{t('profilePage.contact.sendInquiry', 'Send Inquiry')}</span>
                </button>
            </div>

            {/* Agent Inquiry Modal */}
            <AgentInquiryModal
                agent={{
                    id: agent.id,
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
                            <div className="grid grid-cols-2 gap-4">
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
