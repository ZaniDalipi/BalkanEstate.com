import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Property } from '@/types';
import { API_CONFIG } from '@/src/shared/constants/app.constants';

interface ScheduleViewingModalProps {
    property: Property;
    isOpen: boolean;
    onClose: () => void;
}

export interface ViewingRequest {
    date: string;
    timeSlot: string;
    name: string;
    email: string;
    phone: string;
    message: string;
}

interface AvailabilityData {
    enabled: boolean;
    days: number[];
    timeSlots: string[];
    slotDurationMinutes: number;
    notes: string;
    bookedSlots: string[];
}

type Step = 'datetime' | 'details' | 'confirm';
const STEPS: Step[] = ['datetime', 'details', 'confirm'];

// Validation helpers
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/** Generate time slots from start/end time and duration (mirrors backend logic) */
function generateTimeSlotsFromConfig(startTime: string, endTime: string, durationMinutes: number): string[] {
    const slots: string[] = [];
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return slots;
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    for (let m = startMinutes; m + durationMinutes <= endMinutes; m += durationMinutes) {
        const h = Math.floor(m / 60);
        const min = m % 60;
        slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }
    return slots;
}

function generateICSFile(property: Property, date: string, timeSlot: string, durationMinutes: number): string {
    const [hours, minutes] = timeSlot.split(':').map(Number);
    const startDate = new Date(date);
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const location = [property.address, property.city, property.country].filter(Boolean).join(', ');
    const title = property.title || `${property.propertyType} in ${property.city}`;

    return [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//BalkanEstate//Viewing//EN',
        'BEGIN:VEVENT',
        `DTSTART:${fmt(startDate)}`,
        `DTEND:${fmt(endDate)}`,
        `SUMMARY:Property Viewing - ${title}`,
        `DESCRIPTION:Scheduled viewing for ${title} at ${location}`,
        `LOCATION:${location}`,
        'STATUS:CONFIRMED',
        `UID:${Date.now()}@balkanestate.com`,
        'END:VEVENT',
        'END:VCALENDAR',
    ].join('\r\n');
}

const ScheduleViewingModal: React.FC<ScheduleViewingModalProps> = ({ property, isOpen, onClose }) => {
    const { t } = useTranslation(['rental', 'common']);
    const [step, setStep] = useState<Step>('datetime');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTime, setSelectedTime] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    // Availability from backend (with property.visitAvailability as fallback)
    const [availability, setAvailability] = useState<AvailabilityData | null>(null);
    const [loadingAvailability, setLoadingAvailability] = useState(true);

    /** Build availability from the property's own visitAvailability config (no booking info) */
    const buildLocalAvailability = useCallback((): AvailabilityData => {
        const va = property.visitAvailability;
        if (va?.enabled) {
            return {
                enabled: true,
                days: va.days ?? [1, 2, 3, 4, 5],
                timeSlots: generateTimeSlotsFromConfig(
                    va.startTime ?? '09:00',
                    va.endTime ?? '18:00',
                    va.slotDurationMinutes ?? 30,
                ),
                slotDurationMinutes: va.slotDurationMinutes ?? 30,
                notes: va.notes ?? '',
                bookedSlots: [], // Unknown without API
            };
        }
        // No scheduling configured — return defaults
        return {
            enabled: false,
            days: [1, 2, 3, 4, 5],
            timeSlots: generateTimeSlotsFromConfig('09:00', '18:00', 30),
            slotDurationMinutes: 30,
            notes: '',
            bookedSlots: [],
        };
    }, [property.visitAvailability]);

    // Fetch availability + booked slots from API when modal opens
    useEffect(() => {
        if (!isOpen) return;
        setLoadingAvailability(true);
        const controller = new AbortController();

        fetch(`${API_CONFIG.BASE_URL}/viewings/availability/${property.id}`, {
            signal: controller.signal,
        })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => {
                setAvailability(data);
                setLoadingAvailability(false);
            })
            .catch((err) => {
                if (err.name === 'AbortError') return;
                // API unavailable — use property's own visitAvailability config
                setAvailability(buildLocalAvailability());
                setLoadingAvailability(false);
            });

        return () => controller.abort();
    }, [isOpen, property.id, buildLocalAvailability]);

    // Reset state when closing
    useEffect(() => {
        if (!isOpen) {
            setStep('datetime');
            setSelectedDate('');
            setSelectedTime('');
            setName('');
            setEmail('');
            setPhone('');
            setMessage('');
            setIsSubmitted(false);
            setIsSubmitting(false);
            setError('');
            setFieldErrors({});
        }
    }, [isOpen]);

    // Generate available dates (next 14 days, filtered by allowed days)
    const availableDates = useMemo(() => {
        const dates: { value: string; label: string; dayName: string; dayOfWeek: number }[] = [];
        const today = new Date();
        const allowedDays = availability?.days || [1, 2, 3, 4, 5];
        for (let i = 1; i <= 21; i++) {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            if (allowedDays.includes(d.getDay())) {
                dates.push({
                    value: d.toISOString().split('T')[0],
                    label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
                    dayOfWeek: d.getDay(),
                });
            }
            if (dates.length >= 10) break;
        }
        return dates;
    }, [availability?.days]);

    // Time slots from availability (filtered by already booked)
    const timeSlots = useMemo(() => {
        const allSlots = availability?.timeSlots || [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '12:00', '13:00', '13:30', '14:00', '14:30',
            '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00',
        ];
        const bookedSet = new Set(availability?.bookedSlots || []);
        return allSlots.map(slot => ({
            time: slot,
            booked: selectedDate ? bookedSet.has(`${selectedDate}_${slot}`) : false,
        }));
    }, [availability, selectedDate]);

    // Validation
    const validateDetails = useCallback(() => {
        const errors: Record<string, string> = {};
        if (!name.trim()) errors.name = t('rental:viewing.errors.nameRequired', 'Name is required');
        if (!email.trim()) {
            errors.email = t('rental:viewing.errors.emailRequired', 'Email is required');
        } else if (!isValidEmail(email)) {
            errors.email = t('rental:viewing.errors.emailInvalid', 'Please enter a valid email');
        }
        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    }, [name, email, t]);

    const handleSubmit = async () => {
        setError('');

        // Client-side validation before submitting
        if (!selectedDate || !selectedTime) {
            setError(t('rental:viewing.errors.selectDateAndTime', 'Please select a date and time.'));
            return;
        }
        if (!name.trim() || !email.trim() || !isValidEmail(email.trim())) {
            setError(t('rental:viewing.errors.invalidDetails', 'Please provide valid contact details.'));
            return;
        }

        // Validate the selected slot isn't already booked (client-side guard)
        const bookedKey = `${selectedDate}_${selectedTime}`;
        if (availability?.bookedSlots?.includes(bookedKey)) {
            setError(t('rental:viewing.errors.slotAlreadyBooked', 'This time slot was just booked. Please select another.'));
            setSelectedTime('');
            return;
        }

        setIsSubmitting(true);

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/viewings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: property.id,
                    date: selectedDate,
                    timeSlot: selectedTime,
                    visitorName: name.trim(),
                    visitorEmail: email.trim(),
                    visitorPhone: phone.trim() || undefined,
                    visitorMessage: message.trim() || undefined,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                // Handle specific backend errors
                if (response.status === 409) {
                    // Slot was booked by someone else — refresh booked slots
                    setAvailability(prev => prev ? {
                        ...prev,
                        bookedSlots: [...prev.bookedSlots, bookedKey],
                    } : prev);
                    setSelectedTime('');
                    setStep('datetime');
                }
                throw new Error(data.message || 'Failed to schedule viewing');
            }

            setIsSubmitted(true);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            setError(message || t('rental:viewing.errors.submitFailed', 'Failed to schedule viewing. Please try again.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDownloadCalendar = () => {
        const duration = availability?.slotDurationMinutes || 30;
        const icsContent = generateICSFile(property, selectedDate, selectedTime, duration);
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `viewing-${property.id}-${selectedDate}.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const canProceedToDetails = selectedDate && selectedTime;
    const canProceedToConfirm = name.trim() && email.trim() && isValidEmail(email);

    const location = [property.address, property.city, property.country].filter(Boolean).join(', ');
    const formattedDate = selectedDate
        ? new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
        : '';

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                {/* Header */}
                <div className="px-5 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <h2 className="text-lg font-bold">{t('rental:viewing.title', 'Schedule a Viewing')}</h2>
                            <p className="text-xs text-blue-100 mt-0.5 truncate">{property.title || `${property.propertyType} in ${property.city}`}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-all flex-shrink-0 ml-3"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Step indicator */}
                    {!isSubmitted && (
                        <div className="flex items-center gap-2 mt-3">
                            {STEPS.map((s, i) => (
                                <React.Fragment key={s}>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                        step === s ? 'bg-white text-blue-600 shadow-lg' :
                                        STEPS.indexOf(step) > i ? 'bg-white/80 text-blue-600' :
                                        'bg-blue-500/40 text-blue-200'
                                    }`}>
                                        {STEPS.indexOf(step) > i ? (
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                            </svg>
                                        ) : i + 1}
                                    </div>
                                    {i < 2 && <div className={`flex-1 h-0.5 rounded transition-all ${STEPS.indexOf(step) > i ? 'bg-white/80' : 'bg-blue-500/30'}`} />}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>

                {/* Error banner */}
                {error && (
                    <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                        <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <p className="text-sm text-red-700">{error}</p>
                        <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="overflow-y-auto max-h-[60vh] p-5">
                    {loadingAvailability ? (
                        <div className="py-12 flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-neutral-500">{t('rental:viewing.loadingAvailability', 'Loading availability...')}</p>
                        </div>
                    ) : !availability?.enabled ? (
                        /* Scheduling not configured */
                        <div className="text-center py-8">
                            <div className="w-14 h-14 mx-auto mb-3 bg-amber-50 rounded-full flex items-center justify-center">
                                <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                            </div>
                            <h3 className="text-base font-semibold text-neutral-800 mb-1">
                                {t('rental:viewing.notConfigured', 'Online Scheduling Not Available')}
                            </h3>
                            <p className="text-sm text-neutral-500 max-w-xs mx-auto">
                                {t('rental:viewing.notConfiguredDesc', 'The property owner hasn\'t set up online visit scheduling. Please contact them directly to arrange a viewing.')}
                            </p>
                            <button
                                onClick={onClose}
                                className="mt-5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all"
                            >
                                {t('rental:viewing.understood', 'Got it')}
                            </button>
                        </div>
                    ) : isSubmitted ? (
                        /* Success State */
                        <div className="text-center py-6">
                            <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-neutral-800 mb-1">
                                {t('rental:viewing.requestSent', 'Viewing Request Sent!')}
                            </h3>
                            <p className="text-sm text-neutral-500 mb-1">
                                {t('rental:viewing.requestSentDesc', 'The property owner will confirm your viewing shortly.')}
                            </p>
                            <p className="text-xs text-neutral-400 mb-4">
                                {t('rental:viewing.emailSent', 'A confirmation email has been sent to')} <span className="font-medium text-neutral-600">{email}</span>
                            </p>

                            <div className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-50 rounded-lg text-sm text-blue-700 font-medium mb-4">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {formattedDate} at {selectedTime}
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4">
                                <button
                                    onClick={handleDownloadCalendar}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-neutral-200 hover:border-blue-300 text-neutral-700 text-sm font-medium rounded-lg transition-all hover:bg-blue-50"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                    {t('rental:viewing.addToCalendar', 'Add to Calendar')}
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all"
                                >
                                    {t('rental:viewing.done', 'Done')}
                                </button>
                            </div>
                        </div>
                    ) : step === 'datetime' ? (
                        /* Step 1: Date & Time Selection */
                        <div className="space-y-5">
                            {/* Availability schedule summary */}
                            {availability?.enabled && (
                                <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                                    <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div className="text-xs text-blue-800">
                                        <span className="font-medium">{t('rental:viewing.availableHours', 'Available hours')}:</span>{' '}
                                        {availability.timeSlots[0]} – {availability.timeSlots[availability.timeSlots.length - 1]}
                                        {availability.slotDurationMinutes && (
                                            <span className="text-blue-600"> ({availability.slotDurationMinutes} {t('rental:viewing.minSlots', 'min slots')})</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Seller notes */}
                            {availability?.notes && (
                                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                    <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="text-xs text-amber-800">{availability.notes}</p>
                                </div>
                            )}

                            {/* Date Selection */}
                            <div>
                                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                                    {t('rental:viewing.selectDate', 'Select a date')}
                                </label>
                                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                                    {availableDates.map(d => (
                                        <button
                                            key={d.value}
                                            onClick={() => { setSelectedDate(d.value); setSelectedTime(''); }}
                                            className={`px-2 py-2.5 rounded-lg text-center transition-all border ${
                                                selectedDate === d.value
                                                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
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
                                        {timeSlots.map(({ time, booked }) => (
                                            <button
                                                key={time}
                                                onClick={() => !booked && setSelectedTime(time)}
                                                disabled={booked}
                                                className={`px-2 py-2 rounded-lg text-xs font-medium transition-all border ${
                                                    booked
                                                        ? 'bg-neutral-100 text-neutral-300 border-neutral-100 cursor-not-allowed line-through'
                                                        : selectedTime === time
                                                            ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300'
                                                            : 'bg-white text-neutral-600 border-neutral-200 hover:border-blue-300 hover:bg-blue-50'
                                                }`}
                                                title={booked ? t('rental:viewing.slotBooked', 'Already booked') : time}
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
                        <div className="space-y-4">
                            <p className="text-sm text-neutral-500">
                                {t('rental:viewing.enterDetails', 'Enter your contact details so the owner can confirm.')}
                            </p>
                            <div>
                                <label className="block text-xs font-medium text-neutral-600 mb-1">{t('rental:viewing.name', 'Full Name')} <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => { setName(e.target.value); setFieldErrors(prev => ({ ...prev, name: '' })); }}
                                    className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                        fieldErrors.name ? 'border-red-300 bg-red-50' : 'border-neutral-200'
                                    }`}
                                    placeholder="John Doe"
                                />
                                {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-600 mb-1">{t('rental:viewing.email', 'Email')} <span className="text-red-500">*</span></label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: '' })); }}
                                    className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                                        fieldErrors.email ? 'border-red-300 bg-red-50' : 'border-neutral-200'
                                    }`}
                                    placeholder="john@example.com"
                                />
                                {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-600 mb-1">{t('rental:viewing.phone', 'Phone')} <span className="text-neutral-400">({t('rental:viewing.optional', 'optional')})</span></label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="+1 234 567 8900"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-neutral-600 mb-1">{t('rental:viewing.message', 'Message')} <span className="text-neutral-400">({t('rental:viewing.optional', 'optional')})</span></label>
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
                                {t('rental:viewing.confirmDetails', 'Confirm your viewing request')}
                            </h3>

                            {/* Property summary */}
                            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                {property.imageUrl && (
                                    <img src={property.imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                                )}
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-neutral-800 truncate">{property.title || `${property.propertyType} in ${property.city}`}</p>
                                    <p className="text-xs text-neutral-500 truncate">{location}</p>
                                </div>
                            </div>

                            {/* Details Card */}
                            <div className="bg-neutral-50 rounded-lg p-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-neutral-800">{formattedDate}</p>
                                        <p className="text-xs text-neutral-500">{t('rental:viewing.at', 'at')} {selectedTime}</p>
                                    </div>
                                </div>
                                <div className="border-t border-neutral-200 pt-3 space-y-2">
                                    <div className="flex items-center gap-2 text-xs">
                                        <svg className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                        <span className="text-neutral-700 font-medium">{name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <svg className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-neutral-700">{email}</span>
                                    </div>
                                    {phone && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <svg className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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

                            <p className="text-[11px] text-neutral-400 text-center">
                                {t('rental:viewing.confirmNote', 'A confirmation email will be sent to your email address.')}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {!isSubmitted && !loadingAvailability && (
                    <div className="px-5 py-4 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                        {step !== 'datetime' ? (
                            <button
                                onClick={() => setStep(step === 'confirm' ? 'details' : 'datetime')}
                                disabled={isSubmitting}
                                className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 font-medium transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                </svg>
                                {t('rental:viewing.back', 'Back')}
                            </button>
                        ) : <div />}

                        {step === 'datetime' && (
                            <button
                                onClick={() => setStep('details')}
                                disabled={!canProceedToDetails}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-200 disabled:text-neutral-400 text-white text-sm font-semibold rounded-lg transition-all shadow-sm disabled:shadow-none"
                            >
                                {t('rental:viewing.continue', 'Continue')}
                            </button>
                        )}
                        {step === 'details' && (
                            <button
                                onClick={() => {
                                    if (validateDetails()) setStep('confirm');
                                }}
                                className={`px-6 py-2.5 text-sm font-semibold rounded-lg transition-all shadow-sm ${
                                    canProceedToConfirm
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                        : 'bg-neutral-200 text-neutral-400 cursor-not-allowed'
                                }`}
                            >
                                {t('rental:viewing.review', 'Review')}
                            </button>
                        )}
                        {step === 'confirm' && (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-bold rounded-lg transition-all shadow-sm flex items-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        {t('rental:viewing.submitting', 'Scheduling...')}
                                    </>
                                ) : (
                                    t('rental:viewing.confirmRequest', 'Confirm Request')
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default ScheduleViewingModal;
