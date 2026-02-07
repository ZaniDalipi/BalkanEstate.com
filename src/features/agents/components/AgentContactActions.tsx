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
                    <div className="space-y-4">
                        {similarAgents.map((similarAgent) => (
                            <div
                                key={similarAgent.id}
                                onClick={() => onSelectSimilarAgent(similarAgent)}
                                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer"
                            >
                                {similarAgent.avatarUrl ? (
                                    <img
                                        src={similarAgent.avatarUrl}
                                        alt={similarAgent.name}
                                        loading="lazy"
                                        decoding="async"
                                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                                    />
                                ) : (
                                    <UserCircleIcon className="w-12 h-12 text-gray-300" />
                                )}
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
                                <ChevronRightIcon className="w-5 h-5 text-gray-400" />
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

            {/* Market Insights */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-6 mt-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4">{t('profilePage.marketInsights.title')}</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
                        <span className="font-medium text-gray-700">{t('profilePage.marketInsights.avgDaysOnMarket')}</span>
                        <span className="font-bold text-purple-600">{marketInsights?.avgDaysOnMarket || 30} {t('profilePage.marketInsights.days')}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
                        <span className="font-medium text-gray-700">{t('profilePage.marketInsights.priceGrowthYoY')}</span>
                        <span className="font-bold text-green-600">+{marketInsights?.priceGrowth || 5.2}%</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-white/50 rounded-lg">
                        <span className="font-medium text-gray-700">{t('profilePage.marketInsights.marketActivity')}</span>
                        <span className={`font-bold ${
                            marketInsights?.activityLevel === 'Very High' ? 'text-red-600' :
                            marketInsights?.activityLevel === 'High' ? 'text-purple-600' :
                            marketInsights?.activityLevel === 'Moderate' ? 'text-blue-600' :
                            'text-gray-600'
                        }`}>
                            {t(`profilePage.marketInsights.activity.${(marketInsights?.activityLevel || 'Moderate').toLowerCase().replace(' ', '')}`, marketInsights?.activityLevel || 'Moderate')}
                        </span>
                    </div>
                </div>
                <button
                    onClick={onRequestMarketReport}
                    className="w-full mt-4 text-center text-purple-600 hover:text-purple-700 font-semibold text-sm py-2"
                >
                    {t('profilePage.marketInsights.requestFullReport')} →
                </button>
            </div>

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
