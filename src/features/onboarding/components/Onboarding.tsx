import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useAppContext } from '@/context/AppContext';
import { LogoIcon } from '@/constants';
import { ONBOARDING_IMAGES } from '@/config/cloudinaryConfig';
import {
  SPONSORED_AGENCIES,
  SPONSOR_BANNERS,
  AD_SETTINGS,
  type SponsoredAgency,
} from '@/config/adsConfig';

/* ---------------- CONFIG ---------------- */

const GRAVITY = 0.02; // Slower gravity for smoother floating
const DAMPING = 0.8;
const MAX_VELOCITY = 2;

/* ---------------- TYPES ---------------- */

type FloatingLogo = {
  el: HTMLDivElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  size: number;
  sponsor: SponsoredAgency;
};

/* ---------------- COMPONENT ---------------- */

const Onboarding: React.FC = () => {
  const { t } = useTranslation(['common', 'nav']);
  const { dispatch } = useAppContext();

  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const logosRef = useRef<FloatingLogo[]>([]);
  const rafRef = useRef<number | null>(null);

  // Sponsor banner rotation state
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  const [bannerVisible, setBannerVisible] = useState(true);

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------- SPONSOR BANNER ROTATION ----------- */
  useEffect(() => {
    if (!AD_SETTINGS.sponsorBanner.enabled || SPONSOR_BANNERS.length <= 1) return;

    const interval = setInterval(() => {
      // Fade out
      setBannerVisible(false);

      // After fade out, change banner and fade in
      setTimeout(() => {
        setCurrentBannerIndex(prev => (prev + 1) % SPONSOR_BANNERS.length);
        setBannerVisible(true);
      }, AD_SETTINGS.sponsorBanner.animationDuration);
    }, AD_SETTINGS.sponsorBanner.rotationInterval);

    return () => clearInterval(interval);
  }, []);

  const currentBanner = SPONSOR_BANNERS[currentBannerIndex];

  /* ----------- INIT FLOATING AGENCY LOGOS ----------- */
  useEffect(() => {
    if (!backgroundRef.current || prefersReducedMotion || !AD_SETTINGS.floatingLogos.enabled) return;

    const bg = backgroundRef.current;
    const container = containerRef.current!;
    const { width, height } = container.getBoundingClientRect();

    logosRef.current = [];

    SPONSORED_AGENCIES.forEach(sponsor => {
      const instances = AD_SETTINGS.floatingLogos.instancesPerSponsor[sponsor.tier];
      const sizeRange = AD_SETTINGS.floatingLogos.sizeRange[sponsor.tier];

      for (let i = 0; i < instances; i++) {
        const size = Math.random() * (sizeRange.max - sizeRange.min) + sizeRange.min;

        const el = document.createElement('div');
        el.className = 'absolute pointer-events-none will-change-transform';
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.opacity = String(AD_SETTINGS.floatingLogos.opacity);

        // Create image element for the logo
        const img = document.createElement('img');
        img.src = sponsor.logo;
        img.alt = sponsor.name;
        img.className = 'w-full h-full object-contain rounded-lg drop-shadow-sm';
        img.style.filter = 'grayscale(30%)';
        img.loading = 'lazy';
        img.onerror = () => {
          // Fallback to text if image fails to load
          el.innerHTML = `<div class="w-full h-full bg-primary/10 rounded-lg flex items-center justify-center text-primary/30 text-xs font-bold">${sponsor.name.charAt(0)}</div>`;
        };

        el.appendChild(img);
        bg.appendChild(el);

        logosRef.current.push({
          el,
          size,
          sponsor,
          x: Math.random() * (width - size),
          y: Math.random() * (height - size),
          vx: (Math.random() - 0.5) * 0.8,
          vy: (Math.random() - 0.5) * 0.8,
          rotation: (Math.random() - 0.5) * 10, // Subtle rotation
          vr: (Math.random() - 0.5) * 0.2,
        });
      }
    });

    return () => {
      logosRef.current.forEach(logo => logo.el.remove());
      logosRef.current = [];
    };
  }, [prefersReducedMotion]);

  /* ------------- ANIMATION LOOP ------------- */
  useEffect(() => {
    if (prefersReducedMotion || !AD_SETTINGS.floatingLogos.enabled) return;

    let last = performance.now();

    const animate = (now: number) => {
      const dt = (now - last) / 16.67;
      last = now;

      const container = containerRef.current;
      if (!container) return;

      const { width, height } = container.getBoundingClientRect();

      logosRef.current.forEach(logo => {
        // Add gentle floating effect (sine wave)
        logo.vy += GRAVITY * dt * Math.sin(now / 2000);

        logo.vx = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, logo.vx));
        logo.vy = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, logo.vy));

        logo.x += logo.vx * dt;
        logo.y += logo.vy * dt;
        logo.rotation += logo.vr * dt;

        // Bounce off walls
        if (logo.x <= 0 || logo.x >= width - logo.size) {
          logo.vx *= -DAMPING;
          logo.x = Math.max(0, Math.min(width - logo.size, logo.x));
        }

        if (logo.y <= 0 || logo.y >= height - logo.size) {
          logo.vy *= -DAMPING;
          logo.y = Math.max(0, Math.min(height - logo.size, logo.y));
        }

        logo.vr *= 0.995;

        // Apply transform with subtle scale pulse
        const scalePulse = 1 + Math.sin(now / 1500) * 0.02;
        logo.el.style.transform = `
          translate(${logo.x}px, ${logo.y}px)
          rotate(${logo.rotation}deg)
          scale(${scalePulse})
        `;
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [prefersReducedMotion]);

  /* ---------------- ACTIONS ---------------- */

  const handleBuyChoice = () => {
    dispatch({ type: 'COMPLETE_ONBOARDING' });
    dispatch({ type: 'SET_ACTIVE_VIEW', payload: 'search' });
  };

  const handleSellChoice = () => {
    dispatch({ type: 'COMPLETE_ONBOARDING' });
    dispatch({ type: 'SET_PENDING_REDIRECT', payload: 'create-listing' });
    dispatch({
      type: 'TOGGLE_AUTH_MODAL',
      payload: { isOpen: true, view: 'signup' },
    });
  };

  /* ---------------- RENDER ---------------- */

  return (
    <>
      {/* Preload LCP image for this page - using Cloudinary CDN for faster loading */}
      <Helmet>
        <link
          rel="preload"
          as="image"
          href={ONBOARDING_IMAGES.buyCard.preload}
          imageSrcSet={ONBOARDING_IMAGES.buyCard.srcSet}
          imageSizes="(max-width: 768px) calc(100vw - 80px), 400px"
        />
      </Helmet>
      <div
        ref={containerRef}
        className="min-h-screen bg-neutral-50 relative overflow-hidden"
      >
      {/* BACKGROUND ICONS */}
      <div
        ref={backgroundRef}
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* FOREGROUND UI */}
      <div className="relative z-10 flex flex-col justify-center items-center p-4">
        {/* HEADER */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <LogoIcon className="w-12 h-12 text-primary" />
            <h1 className="text-4xl sm:text-5xl font-extrabold text-neutral-800">
              Balkan <span className="text-primary">Estate</span>
            </h1>
          </div>
          <p className="text-lg sm:text-xl text-neutral-600 max-w-xl">
            {t('common:tagline')}
          </p>
        </div>

        {/* CARDS */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-4xl border border-neutral-200">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">
            {t('nav:onboarding.question')}
          </h2>

          <div className="grid md:grid-cols-2 gap-8 min-h-[400px]">
            {/* BUY */}
            <div
              onClick={handleBuyChoice}
              className="group p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col"
            >
              {/* Image with Sponsor Overlay */}
              <div className="relative rounded-lg mb-6 overflow-hidden">
                <img
                  src={ONBOARDING_IMAGES.buyCard.src}
                  srcSet={ONBOARDING_IMAGES.buyCard.srcSet}
                  sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                  alt={ONBOARDING_IMAGES.buyCard.alt}
                  className="h-48 w-full object-cover"
                  loading="eager"
                  decoding="async"
                  fetchpriority="high"
                />
                {/* Sponsor Banner Overlay */}
                {AD_SETTINGS.sponsorBanner.enabled && currentBanner && (
                  <div
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 transition-opacity duration-500 ${
                      bannerVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-white">
                      {currentBanner.logo && (
                        <img
                          src={currentBanner.logo}
                          alt={currentBanner.agencyName}
                          className="w-6 h-6 object-contain bg-white rounded p-0.5"
                        />
                      )}
                      <p className="text-xs font-medium leading-tight">
                        <span className="font-bold">{currentBanner.agencyName}</span>
                        {' '}{currentBanner.message}{' '}
                        <span className="text-primary-light font-bold">BalkanEstate.com</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-semibold mb-2 text-center">
                {t('nav:onboarding.lookingToBuy')}
              </h3>
              <p className="text-neutral-600 mb-6 text-center flex-grow">
                {t('nav:onboarding.buyDescription')}
              </p>
              <button className="bg-primary text-white py-3 rounded-lg font-bold group-hover:bg-primary-dark transition-colors">
                {t('nav:onboarding.startSearching')}
              </button>
            </div>

            {/* SELL */}
            <div
              onClick={handleSellChoice}
              className="group p-6 bg-white rounded-xl shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 cursor-pointer flex flex-col"
            >
              {/* Image with Sponsor Overlay */}
              <div className="relative rounded-lg mb-6 overflow-hidden">
                <img
                  src={ONBOARDING_IMAGES.sellCard.src}
                  srcSet={ONBOARDING_IMAGES.sellCard.srcSet}
                  sizes="(max-width: 768px) calc(100vw - 80px), 400px"
                  alt={ONBOARDING_IMAGES.sellCard.alt}
                  className="h-48 w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
                {/* Sponsor Banner Overlay - Show different banner on sell card */}
                {AD_SETTINGS.sponsorBanner.enabled && SPONSOR_BANNERS.length > 0 && (
                  <div
                    className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/60 to-transparent p-3 transition-opacity duration-500 ${
                      bannerVisible ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-white">
                      {SPONSOR_BANNERS[(currentBannerIndex + 1) % SPONSOR_BANNERS.length]?.logo && (
                        <img
                          src={SPONSOR_BANNERS[(currentBannerIndex + 1) % SPONSOR_BANNERS.length].logo}
                          alt={SPONSOR_BANNERS[(currentBannerIndex + 1) % SPONSOR_BANNERS.length].agencyName}
                          className="w-6 h-6 object-contain bg-white rounded p-0.5"
                        />
                      )}
                      <p className="text-xs font-medium leading-tight">
                        <span className="font-bold">
                          {SPONSOR_BANNERS[(currentBannerIndex + 1) % SPONSOR_BANNERS.length]?.agencyName}
                        </span>
                        {' '}{SPONSOR_BANNERS[(currentBannerIndex + 1) % SPONSOR_BANNERS.length]?.message}{' '}
                        <span className="text-primary-light font-bold">BalkanEstate.com</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <h3 className="text-2xl font-semibold mb-2 text-center">
                {t('nav:onboarding.wantToSell')}
              </h3>
              <p className="text-neutral-600 mb-6 text-center flex-grow">
                {t('nav:onboarding.sellDescription')}
              </p>
              <button className="bg-neutral-800 text-white py-3 rounded-lg font-bold group-hover:bg-neutral-900 transition-colors">
                {t('nav:onboarding.listProperty')}
              </button>
            </div>
          </div>
        </div>

        <p className="text-neutral-500 mt-8">
          {t('common:footer.copyright', {
            year: new Date().getFullYear(),
          })}
        </p>
      </div>
    </div>
    </>
  );
};

export default Onboarding;
