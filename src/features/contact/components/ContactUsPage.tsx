/**
 * ContactUsPage Component
 * Full contact page with liquid glass design, form, and contact info
 */

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { CONTACT_CONFIG } from '@/src/shared/config/contact';
import { sendContactInquiry, uploadAdvertisingImage } from '@/services/apiService';
import { useContactForm } from '../hooks/use-contact-form';
import ContactForm from './ContactForm';
import ContactSuccess from './ContactSuccess';
import LegalFooter from '@/src/features/legal/components/LegalFooter';
import type { ContactFormData } from '../types';
import type { AppView } from '@/types';

// Inline SVG icons to avoid importing full icon set
const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
  </svg>
);

const EnvelopeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
);

const PhoneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
  </svg>
);

const MapPinIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ContactUsPage: React.FC = () => {
  const { t } = useTranslation(['contact', 'common']);
  const { dispatch } = useAppContext();

  // Preselect the "advertising" subject (and a starter message) when arriving
  // from a "Your Ad Here" placeholder (?topic=advertise).
  const isAdvertising = (() => {
    try {
      return new URLSearchParams(window.location.search).get('topic') === 'advertise';
    } catch {
      return false;
    }
  })();
  const advertisingOverrides = isAdvertising
    ? {
        subject: 'advertising',
        adPage: 'all',
        adPlacement: 'in-content',
        message: t(
          'contact:advertising.prefill',
          "Hi, I'd like to advertise on BalkanEstate. Please send me your ad placements and pricing."
        ),
      }
    : undefined;

  const {
    formData,
    errors,
    isSubmitting,
    isSuccess,
    submitError,
    handleChange,
    handlePhoneChange,
    handleSubmit,
    setField,
    reset,
  } = useContactForm(advertisingOverrides);

  const [isAdImageUploading, setIsAdImageUploading] = useState(false);

  const handleAdImageSelect = useCallback(
    async (file: File) => {
      setIsAdImageUploading(true);
      try {
        const { url } = await uploadAdvertisingImage(file);
        setField('adImageUrl', url);
      } catch {
        /* silently ignore — the creative is optional */
      } finally {
        setIsAdImageUploading(false);
      }
    },
    [setField]
  );

  const handleAdImageClear = useCallback(() => setField('adImageUrl', undefined), [setField]);

  const handleBack = useCallback(() => {
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
    window.history.pushState({}, '', '/');
  }, [dispatch]);

  const handleNavigate = useCallback(
    (view: AppView | string) => {
      dispatch({ type: 'SET_ACTIVE_VIEW', payload: view as AppView });
      window.history.pushState({}, '', `/${view}`);
    },
    [dispatch]
  );

  const onFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit(async (data: ContactFormData) => {
        const isAd = data.subject === 'advertising';
        await sendContactInquiry({
          name: data.name,
          email: data.email,
          phone: data.phone || undefined,
          subject: data.subject,
          message: data.message,
          adPage: isAd ? data.adPage : undefined,
          adPlacement: isAd ? data.adPlacement : undefined,
          attachmentUrl: isAd ? data.adImageUrl : undefined,
        });
      });
    },
    [handleSubmit]
  );

  const contactInfoItems = [
    {
      icon: EnvelopeIcon,
      label: t('contact:info.email', 'Email'),
      value: CONTACT_CONFIG.email.contact,
      href: `mailto:${CONTACT_CONFIG.email.contact}`,
    },
    {
      icon: PhoneIcon,
      label: t('contact:info.phone', 'Phone'),
      value: CONTACT_CONFIG.phone.primary,
      href: `tel:${CONTACT_CONFIG.phone.primaryTel}`,
    },
    {
      icon: MapPinIcon,
      label: t('contact:info.location', 'Location'),
      value: t('contact:info.locationValue', 'Balkans Region'),
      href: undefined,
    },
    {
      icon: ClockIcon,
      label: t('contact:info.hours', 'Business Hours'),
      value: t('contact:info.hoursValue', 'Mon-Fri, 9:00-18:00 CET'),
      href: undefined,
    },
  ];

  return (
    <div className="liquid-glass-bg min-h-screen flex flex-col">
      <div className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-neutral-600 hover:text-primary active:text-primary/80 transition-colors mb-6 py-2 -ml-2 pl-2 pr-3 rounded-lg min-h-[44px]"
          >
            <ArrowLeftIcon className="w-5 h-5" />
            <span className="font-medium">{t('common:back', 'Back')}</span>
          </button>

          {/* Page Header */}
          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-3">
              {t('contact:title', 'Contact Us')}
            </h1>
            <p className="text-neutral-600 max-w-lg mx-auto text-base sm:text-lg">
              {t(
                'contact:subtitle',
                'Have a question or need help? We\'d love to hear from you. Send us a message and we\'ll respond as soon as possible.'
              )}
            </p>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-8">
            {/* Contact Form - spans 3 cols */}
            <div className="lg:col-span-3">
              <div className="glass-panel p-6 sm:p-8">
                <h2 className="text-xl font-semibold text-neutral-900 mb-6">
                  {t('contact:form.heading', 'Send us a Message')}
                </h2>
                {isSuccess ? (
                  <ContactSuccess onReset={reset} />
                ) : (
                  <ContactForm
                    formData={formData}
                    errors={errors}
                    isSubmitting={isSubmitting}
                    submitError={submitError}
                    onChange={handleChange}
                    onPhoneChange={handlePhoneChange}
                    onSubmit={onFormSubmit}
                    onAdImageSelect={handleAdImageSelect}
                    onAdImageClear={handleAdImageClear}
                    isAdImageUploading={isAdImageUploading}
                  />
                )}
              </div>
            </div>

            {/* Contact Info Sidebar - spans 2 cols */}
            <div className="lg:col-span-2 space-y-6">
              {/* Contact Details Card */}
              <div className="glass-panel p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-5">
                  {t('contact:info.heading', 'Get in Touch')}
                </h3>
                <div className="space-y-5">
                  {contactInfoItems.map((item) => {
                    const Icon = item.icon;
                    const content = (
                      <div className="flex items-start gap-3.5 group">
                        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs text-neutral-500 font-medium uppercase tracking-wider">
                            {item.label}
                          </p>
                          <p className="text-sm text-neutral-800 font-medium mt-0.5">
                            {item.value}
                          </p>
                        </div>
                      </div>
                    );

                    if (item.href) {
                      return (
                        <a
                          key={item.label}
                          href={item.href}
                          className="block hover:opacity-80 transition-opacity"
                        >
                          {content}
                        </a>
                      );
                    }
                    return <div key={item.label}>{content}</div>;
                  })}
                </div>
              </div>

              {/* Quick Help Card */}
              <div className="glass-panel-light p-6">
                <h3 className="text-lg font-semibold text-neutral-900 mb-3">
                  {t('contact:quickHelp.heading', 'Quick Help')}
                </h3>
                <ul className="space-y-3 text-sm text-neutral-600">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5 flex-shrink-0">&#8226;</span>
                    <button
                      onClick={() => handleNavigate('how-it-works')}
                      className="text-left hover:text-primary transition-colors"
                    >
                      {t('contact:quickHelp.howItWorks', 'Learn how BalkanEstate works')}
                    </button>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5 flex-shrink-0">&#8226;</span>
                    <button
                      onClick={() => handleNavigate('pricing')}
                      className="text-left hover:text-primary transition-colors"
                    >
                      {t('contact:quickHelp.pricing', 'View our pricing plans')}
                    </button>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5 flex-shrink-0">&#8226;</span>
                    <button
                      onClick={() => handleNavigate('agents')}
                      className="text-left hover:text-primary transition-colors"
                    >
                      {t('contact:quickHelp.findAgent', 'Find a real estate agent')}
                    </button>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5 flex-shrink-0">&#8226;</span>
                    <button
                      onClick={() => handleNavigate('privacy')}
                      className="text-left hover:text-primary transition-colors"
                    >
                      {t('contact:quickHelp.privacy', 'Read our privacy policy')}
                    </button>
                  </li>
                </ul>
              </div>

              {/* Messaging Apps Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
                {/* WhatsApp Card */}
                <a
                  href={`https://wa.me/${CONTACT_CONFIG.social.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block glass-panel-light p-5 hover:shadow-md active:shadow-sm transition-shadow group min-h-[64px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors flex-shrink-0">
                      <svg className="w-6 h-6 sm:w-5 sm:h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.917.918l4.458-1.495A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.324 0-4.47-.757-6.21-2.037l-.435-.327-2.648.888.888-2.648-.327-.435A9.96 9.96 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">
                        {t('contact:whatsapp.title', 'Chat on WhatsApp')}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {t('contact:whatsapp.subtitle', 'Quick response during business hours')}
                      </p>
                    </div>
                  </div>
                </a>

                {/* Viber Card */}
                <a
                  href={`viber://chat?number=${CONTACT_CONFIG.social.whatsappNumber}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const deepLink = `viber://chat?number=${CONTACT_CONFIG.social.whatsappNumber}`;
                    window.location.href = deepLink;
                    setTimeout(() => {
                      if (!document.hidden) window.open('https://www.viber.com/', '_blank');
                    }, 1500);
                  }}
                  className="block glass-panel-light p-5 hover:shadow-md active:shadow-sm transition-shadow group min-h-[64px]"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 sm:w-10 sm:h-10 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors flex-shrink-0">
                      <svg className="w-6 h-6 sm:w-5 sm:h-5 text-purple-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M12 1C6.477 1 2 5.477 2 11c0 2.136.67 4.116 1.81 5.74L2 22l5.26-1.81A9.94 9.94 0 0012 21c5.523 0 10-4.477 10-10S17.523 1 12 1zm-1.5 4.5c.3 0 .55.12.7.4l.9 1.7c.15.3.08.6-.15.8l-.5.6c-.12.15-.08.35.08.52.35.45.75.87 1.2 1.25.5.42 1.05.78 1.65 1.05.2.1.4.06.55-.1l.45-.55c.18-.22.42-.25.68-.12l1.7.9c.28.15.38.4.3.7-.12.48-.38.9-.75 1.2-.33.27-.72.45-1.15.5-.35.04-.7.02-.95-.05-.82-.22-1.6-.6-2.35-1.12-1.2-.83-2.25-1.88-3.1-3.1-.55-.75-.95-1.55-1.15-2.4-.12-.5-.08-1 .12-1.45.18-.4.45-.72.78-1 .3-.25.62-.43.95-.43z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">
                        {t('contact:viber.title', 'Chat on Viber')}
                      </p>
                      <p className="text-xs text-neutral-500">
                        {t('contact:viber.subtitle', 'Popular in the Balkans region')}
                      </p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <LegalFooter onNavigate={handleNavigate} />
    </div>
  );
};

export default ContactUsPage;
