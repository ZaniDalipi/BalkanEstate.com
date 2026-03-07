import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getAgencies } from '@/src/features/agencies/api/agencyApi';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import type { Agency } from '@/src/shared/types';

gsap.registerPlugin(ScrollTrigger);

const MEDAL_COLORS = {
  0: { bg: '#FFD700', text: '#92710A', glow: 'rgba(255, 215, 0, 0.4)', gradient: 'linear-gradient(135deg, #FFD700, #FFC107)' },
  1: { bg: '#C0C0C0', text: '#5A5A5A', glow: 'rgba(192, 192, 192, 0.4)', gradient: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)' },
  2: { bg: '#CD7F32', text: '#6B3E1A', glow: 'rgba(205, 127, 50, 0.4)', gradient: 'linear-gradient(135deg, #CD7F32, #B8722E)' },
} as const;

const PODIUM_HEIGHTS = [240, 300, 200]; // 2nd, 1st, 3rd
const PODIUM_ORDER = [1, 0, 2]; // Data indices shown as: 2nd, 1st, 3rd

const FALLBACK_AGENCIES: Agency[] = [
  {
    _id: 'demo-agency-1', name: 'Adriatic Realty Group', email: '', phone: '',
    city: 'Dubrovnik', country: 'Croatia',
    totalProperties: 84, totalAgents: 12, isFeatured: true,
    yearsInBusiness: 8, type: 'luxury',
  },
  {
    _id: 'demo-agency-2', name: 'Balkan Prime Estates', email: '', phone: '',
    city: 'Belgrade', country: 'Serbia',
    totalProperties: 156, totalAgents: 24, isFeatured: true,
    yearsInBusiness: 15, type: 'standard',
  },
  {
    _id: 'demo-agency-3', name: 'Sofia Property Partners', email: '', phone: '',
    city: 'Sofia', country: 'Bulgaria',
    totalProperties: 62, totalAgents: 8, isFeatured: true,
    yearsInBusiness: 5, type: 'boutique',
  },
];

/* ─── Single agency podium card ─── */
const AgencyPodiumCard: React.FC<{
  agency: Agency;
  rank: number;
  podiumHeight: number;
}> = ({ agency, rank, podiumHeight }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const medal = MEDAL_COLORS[rank as keyof typeof MEDAL_COLORS];

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    gsap.set(card, { y: 100, opacity: 0, scale: 0.9 });

    const trigger = ScrollTrigger.create({
      trigger: card.parentElement,
      start: 'top 75%',
      once: true,
      onEnter: () => {
        gsap.to(card, {
          y: 0,
          opacity: 1,
          scale: 1,
          duration: 0.9,
          delay: rank === 0 ? 0 : rank === 1 ? 0.15 : 0.3,
          ease: 'back.out(1.4)',
        });
      },
    });

    return () => { trigger.kill(); };
  }, [rank]);

  const agencyName = agency.name || 'Agency';
  const initials = agencyName.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: rank === 0 ? '1.2' : '1',
      }}
    >
      {/* Agency Card */}
      <div
        ref={cardRef}
        style={{
          width: '100%',
          maxWidth: rank === 0 ? '280px' : '230px',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          overflow: 'hidden',
          position: 'relative',
          boxShadow: '0 20px 40px -10px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.8)',
          marginBottom: '-30px',
          zIndex: 10,
          opacity: 0,
        }}
      >
        {/* Cover / gradient header */}
        <div
          style={{
            height: rank === 0 ? '80px' : '64px',
            background: agency.coverImage
              ? `url(${optimizeCloudinaryUrl(agency.coverImage, { width: 560, quality: 'auto', crop: 'fill' })}) center/cover`
              : 'linear-gradient(135deg, #0f172a, #1e293b)',
            position: 'relative',
          }}
        >
          {/* Medal badge */}
          <div
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: medal.gradient,
              boxShadow: `0 4px 12px ${medal.glow}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 800,
              color: medal.text,
              border: '2px solid rgba(255,255,255,0.9)',
            }}
          >
            {rank + 1}
          </div>
        </div>

        {/* Logo overlapping cover */}
        <div
          style={{
            width: rank === 0 ? '64px' : '52px',
            height: rank === 0 ? '64px' : '52px',
            borderRadius: '16px',
            margin: `${rank === 0 ? '-32px' : '-26px'} auto 0.5rem`,
            overflow: 'hidden',
            border: '3px solid white',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            background: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {agency.logo ? (
            <img
              src={optimizeCloudinaryUrl(agency.logo, { width: 128, quality: 'auto', crop: 'fill' })}
              alt={agencyName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
          ) : (
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#64748b' }}>
              {initials}
            </span>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '0 1rem 1.25rem', textAlign: 'center' }}>
          <h3
            style={{
              fontSize: rank === 0 ? '1rem' : '0.9rem',
              fontWeight: 700,
              color: '#0f172a',
              marginBottom: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {agencyName}
          </h3>

          {(agency.city || agency.country) && (
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.6rem' }}>
              {[agency.city, agency.country].filter(Boolean).join(', ')}
            </p>
          )}

          {/* Stats row */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
            <div style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '8px',
              background: 'rgba(248,250,252,0.8)',
              border: '1px solid rgba(226,232,240,0.6)',
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{agency.totalProperties || 0}</span>
              <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginLeft: '3px' }}>listings</span>
            </div>
            <div style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '8px',
              background: 'rgba(248,250,252,0.8)',
              border: '1px solid rgba(226,232,240,0.6)',
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{agency.totalAgents || 0}</span>
              <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginLeft: '3px' }}>agents</span>
            </div>
            {agency.yearsInBusiness != null && (
              <div style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '8px',
                background: 'rgba(248,250,252,0.8)',
                border: '1px solid rgba(226,232,240,0.6)',
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{agency.yearsInBusiness}</span>
                <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginLeft: '3px' }}>yrs</span>
              </div>
            )}
          </div>

          {/* Agency type tag */}
          {agency.type && agency.type !== 'standard' && (
            <div
              style={{
                display: 'inline-block',
                marginTop: '0.5rem',
                padding: '2px 8px',
                borderRadius: '6px',
                fontSize: '0.65rem',
                fontWeight: 600,
                textTransform: 'capitalize',
                background: agency.type === 'luxury' ? 'rgba(255,215,0,0.12)' : 'rgba(2,82,205,0.08)',
                color: agency.type === 'luxury' ? '#92710A' : '#0252CD',
              }}
            >
              {agency.type}
            </div>
          )}
        </div>
      </div>

      {/* Podium pillar */}
      <div
        style={{
          width: '100%',
          maxWidth: rank === 0 ? '280px' : '230px',
          height: `${podiumHeight}px`,
          background: `linear-gradient(180deg, ${medal.bg}18 0%, ${medal.bg}06 100%)`,
          borderRadius: '16px 16px 0 0',
          border: `1px solid ${medal.bg}28`,
          borderBottom: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          paddingTop: '2.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            fontSize: rank === 0 ? '3.5rem' : '2.5rem',
            fontWeight: 900,
            color: `${medal.bg}25`,
            lineHeight: 1,
          }}
        >
          #{rank + 1}
        </span>

        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '10%',
            right: '10%',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${medal.bg}55, transparent)`,
          }}
        />
      </div>
    </div>
  );
};

/* ─── Section ─── */
const TopAgenciesSection: React.FC = () => {
  const { t } = useTranslation('home');
  const sectionRef = useRef<HTMLElement>(null);

  const { data: agencies = [] } = useQuery<Agency[]>({
    queryKey: ['topAgenciesMonth'],
    queryFn: async () => {
      const data = await getAgencies({ limit: 3 });
      const list = data.agencies || [];
      return list.filter((a: Agency) => a.name).slice(0, 3);
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const displayAgencies = agencies.length >= 3 ? agencies : FALLBACK_AGENCIES;

  // Section entrance
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    gsap.set(el, { opacity: 0, y: 50 });

    const trigger = ScrollTrigger.create({
      trigger: el,
      start: 'top 85%',
      once: true,
      onEnter: () => {
        gsap.to(el, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' });
      },
    });

    return () => { trigger.kill(); };
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        padding: '4rem 1rem 0',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{ maxWidth: '72rem', margin: '0 auto', textAlign: 'center', marginBottom: '3rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '20px',
            background: 'rgba(2,82,205,0.08)',
            border: '1px solid rgba(2,82,205,0.15)',
            marginBottom: '1rem',
          }}
        >
          <span style={{ fontSize: '16px' }}>🏢</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0252CD', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {t('topAgencies.badge', 'Agencies of the Month')}
          </span>
        </div>
        <h2
          style={{
            fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.02em',
            marginBottom: '0.5rem',
          }}
        >
          {t('topAgencies.title', 'Leading Real Estate Agencies')}
        </h2>
        <p style={{ fontSize: '0.95rem', color: '#64748b', maxWidth: '500px', margin: '0 auto' }}>
          {t('topAgencies.subtitle', 'Top-performing agencies with the most listings, agents, and client trust')}
        </p>
      </div>

      {/* Podium — 2-1-3 layout */}
      <div
        style={{
          maxWidth: '860px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '1rem',
          padding: '0 1rem',
        }}
      >
        {PODIUM_ORDER.map((dataIndex, visualIndex) => (
          <AgencyPodiumCard
            key={displayAgencies[dataIndex]._id}
            agency={displayAgencies[dataIndex]}
            rank={dataIndex}
            podiumHeight={PODIUM_HEIGHTS[visualIndex]}
          />
        ))}
      </div>
    </section>
  );
};

export default TopAgenciesSection;
