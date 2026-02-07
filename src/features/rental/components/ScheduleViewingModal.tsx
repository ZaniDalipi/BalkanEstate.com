import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';

interface ScheduleViewingModalProps {
    property: Property;
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ViewingRequest) => void;
}

export interface ViewingRequest {
    date: string;
    timeSlot: string;
    name: string;
    email: string;
    phone: string;
    message: string;
}

const ScheduleViewingModal: React.FC<ScheduleViewingModalProps> = ({ property, isOpen, onClose, onSubmit }) => {
    const { t } = useTranslation(['rental']);
    const [step, setStep] = useState<'datetime' | 'details' | 'confirm'>('datetime');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Generate available dates (next 14 days, excluding past)
    const availableDates = useMemo(() => {
        const dates: { value: string; label: string; dayName: string }[] = [];
        const today = new Date();
        for (let i = 1; i <= 14; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            dates.push({
                value: d.toISOString().split('T')[0],
                label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
            });
        }
        return dates;
    }, []);

    const timeSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '13:00', '13:30', '14:00', '14:30',
        '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
    ];

    const handleSubmit = () => {
        onSubmit({ date: selectedDate, timeSlot: selectedTime, name, email, phone, message });
        setIsSubmitted(true);
    };

    const canProceedToDetails = selectedDate && selectedTime;
    const canSubmit = name.trim() && email.trim();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold">{t('rental:viewing.title', 'Schedule a Viewing')}</h2>
                            <p className="text-xs text-blue-100 mt-0.5">{property.address}, {property.city}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Step indicator */}
                    {!isSubmitted && (
                        <div className="flex items-center gap-2 mt-3">
                            {['datetime', 'details', 'confirm'].map((s, i) => (
                                <React.Fragment key={s}>
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                        step === s ? 'bg-white text-blue-600' :
                                        ['datetime', 'details', 'confirm'].indexOf(step) > i ? 'bg-blue-400 text-white' :
                                        'bg-blue-500/50 text-blue-200'
                                    }`}>
                                        {i + 1}
                                    </div>
                                    {i < 2 && <div className={`flex-1 h-0.5 ${['datetime', 'details', 'confirm'].indexOf(step) > i ? 'bg-blue-400' : 'bg-blue-500/30'}`} />}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[60vh] p-5">
                    {isSubmitted ? (
                        /* Success State */
                        <div className="text-center py-8">
                            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-neutral-800 mb-1">
                                {t('rental:viewing.requestSent', 'Viewing Request Sent!')}
                            </h3>
                            <p className="text-sm text-neutral-500 mb-4">
                                {t('rental:viewing.requestSentDesc', 'The landlord will confirm your viewing shortly.')}
                            </p>
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg text-sm text-blue-700 font-medium">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedTime}
                            </div>
                            <button
                                onClick={onClose}
                                className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all"
                            >
                                {t('rental:viewing.done', 'Done')}
                            </button>
                        </div>
                    ) : step === 'datetime' ? (
                        /* Step 1: Date & Time Selection */
                        <div className="space-y-4">
                            {/* Date Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                    {t('rental:viewing.selectDate', 'Select a date')}
                                </label>
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                    {availableDates.slice(0, 10).map(d => (
                                        <button
                                            key={d.value}
                                            onClick={() => setSelectedDate(d.value)}
                                            className={`px-2 py-2.5 rounded-lg text-center transition-all border ${
                                                selectedDate === d.value
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                                    : 'bg-white text-neutral-700 border-neutral-200 hover:border-blue-300 hover:bg-blue-50'
                                            }`}
                                        >
                                            <div className="text-[10px] font-medium opacity-70">{d.dayName}</div>
                                            <div className="text-xs font-bold">{d.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Time Selection */}
                            {selectedDate && (
                                <div>
                                    <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                        {t('rental:viewing.selectTime', 'Select a time')}
                                    </label>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                                        {timeSlots.map(time => (
                                            <button
                                                key={time}
                                                onClick={() => setSelectedTime(time)}
                                                className={`px-2 py-2 rounded-lg text-xs font-medium transition-all border ${
                                                    selectedTime === time
                                                        ? 'bg-blue-600 text-white border-blue-600'
                                                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-blue-300'
                                                }`}
                                            >
                                                {time}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : step === 'details' ? (
                        /* Step 2: Contact Details */
                        <div className="space-y-3">
                            <p className="text-sm text-neutral-500 mb-2">
                                {t('rental:viewing.enterDetails', 'Enter your contact details so the landlord can confirm.')}
                            </p>
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">{t('rental:viewing.name', 'Full Name')} *</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="John Doe"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">{t('rental:viewing.email', 'Email')} *</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">{t('rental:viewing.phone', 'Phone')} ({t('rental:viewing.optional', 'optional')})</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="+1 234 567 8900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-neutral-500 mb-1">{t('rental:viewing.message', 'Message')} ({t('rental:viewing.optional', 'optional')})</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                    placeholder={t('rental:viewing.messagePlaceholder', 'Any questions or preferences...')}
                                />
                            </div>
                        </div>
                    ) : (
                        /* Step 3: Confirmation */
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-neutral-800">
                                {t('rental:viewing.confirmDetails', 'Confirm your viewing')}
                            </h3>

                            {/* Summary Card */}
                            <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-neutral-800">
                                            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                        </p>
                                        <p className="text-xs text-neutral-500">{selectedTime}</p>
                                    </div>
                                </div>
                                <div className="border-t border-neutral-200 pt-3 space-y-1.5">
                                    <div className="flex items-center gap-2 text-xs">
                                        <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span className="text-neutral-700">{name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-neutral-700">{email}</span>
                                    </div>
                                    {phone && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                            </svg>
                                            <span className="text-neutral-700">{phone}</span>
                                        </div>
                                    )}
                                </div>
                                {message && (
                                    <div className="border-t border-neutral-200 pt-3">
                                        <p className="text-xs text-neutral-500 italic">"{message}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {!isSubmitted && (
                    <div className="px-5 py-4 border-t border-neutral-100 flex items-center justify-between">
                        {step !== 'datetime' ? (
                            <button
                                onClick={() => setStep(step === 'confirm' ? 'details' : 'datetime')}
                                className="text-sm text-neutral-500 hover:text-neutral-700 font-medium"
                            >
                                {t('rental:viewing.back', 'Back')}
                            </button>
                        ) : <div />}

                        {step === 'datetime' && (
                            <button
                                onClick={() => setStep('details')}
                                disabled={!canProceedToDetails}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-sm font-medium rounded-lg transition-all"
                            >
                                {t('rental:viewing.continue', 'Continue')}
                            </button>
                        )}
                        {step === 'details' && (
                            <button
                                onClick={() => setStep('confirm')}
                                disabled={!canSubmit}
                                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-sm font-medium rounded-lg transition-all"
                            >
                                {t('rental:viewing.review', 'Review')}
                            </button>
                        )}
                        {step === 'confirm' && (
                            <button
                                onClick={handleSubmit}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg transition-all"
                            >
                                {t('rental:viewing.confirmRequest', 'Confirm Request')}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ScheduleViewingModal;
