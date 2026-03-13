import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getAgencies } from '@/src/features/agencies/api/agencyApi';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import { useAppContext } from '@/context/AppContext';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import type { Agency } from '@/src/shared/types';

const MEDAL_COLORS = {
  0: { bg: '#FFD700', text: '#92710A', glow: 'rgba(255, 215, 0, 0.4)', gradient: 'linear-gradient(135deg, #FFD700, #FFC107)' },
  1: { bg: '#C0C0C0', text: '#5A5A5A', glow: 'rgba(192, 192, 192, 0.4)', gradient: 'linear-gradient(135deg, #C0C0C0, #A8A8A8)' },
  2: { bg: '#CD7F32', text: '#6B3E1A', glow: 'rgba(205, 127, 50, 0.4)', gradient: 'linear-gradient(135deg, #CD7F32, #B8722E)' },
} as const;

const PODIUM_HEIGHTS = [240, 300, 200]; // 2nd, 1st, 3rd
const PODIUM_ORDER = [1, 0, 2]; // Data indices shown as: 2nd, 1st, 3rd


/* ─── Single agency podium card ─── */
const AgencyPodiumCard: React.FC<{
  agency: Agency;
  rank: number;
  podiumHeight: number;
  onAgencyClick?: (agency: Agency) => void;
  t: (key: string, fallback?: string) => string;
}> = ({ agency, rank, podiumHeight, onAgencyClick, t }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const medal = MEDAL_COLORS[rank as keyof typeof MEDAL_COLORS];

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(card);
    return () => observer.disconnect();
  }, []);

  const agencyName = agency.name || 'Agency';
  const initials = agencyName.split(' ').map(n => n[0]).join('').slice(0, 2);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: rank === 0 ? '1.2' : '1',
        minWidth: 0,
      }}
    >
      {/* Agency Card */}
      <div
        ref={cardRef}
        onClick={() => onAgencyClick?.(agency)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAgencyClick?.(agency); } }}
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
          cursor: 'pointer',
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(80px) scale(0.9)',
          transition: `opacity 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${rank === 0 ? '0s' : rank === 1 ? '0.15s' : '0.3s'}, transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${rank === 0 ? '0s' : rank === 1 ? '0.15s' : '0.3s'}`,
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
              loading="eager"
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
              <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginLeft: '3px' }}>{t('topAgencies.listings', 'listings')}</span>
            </div>
            <div style={{
              padding: '0.25rem 0.5rem',
              borderRadius: '8px',
              background: 'rgba(248,250,252,0.8)',
              border: '1px solid rgba(226,232,240,0.6)',
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{agency.totalAgents || 0}</span>
              <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginLeft: '3px' }}>{t('topAgencies.agents', 'agents')}</span>
            </div>
            {agency.yearsInBusiness != null && (
              <div style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '8px',
                background: 'rgba(248,250,252,0.8)',
                border: '1px solid rgba(226,232,240,0.6)',
              }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{agency.yearsInBusiness}</span>
                <span style={{ fontSize: '0.6rem', color: '#94a3b8', marginLeft: '3px' }}>{t('topAgencies.years', 'yrs')}</span>
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
  const { dispatch } = useAppContext();
  const { navigate } = useLocalizedNavigation();

  const handleAgencyClick = useCallback((agency: Agency) => {
    const agencyIdentifier = agency.slug || agency._id;
    dispatch({ type: 'SET_SELECTED_AGENCY', payload: agencyIdentifier });
    navigate(`/agencies/${agencyIdentifier}`, { direction: 'up' });
  }, [dispatch, navigate]);

  const { data: agencies = [], isLoading } = useQuery<Agency[]>({
    queryKey: ['topAgenciesMonth'],
    queryFn: async () => {
      const data = await getAgencies({ limit: 3 });
      const list = data.agencies || [];
      return list.filter((a: Agency) => a.name).slice(0, 3);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const displayAgencies = agencies;

  // Don't render section at all if no agencies and not loading
  if (!isLoading && displayAgencies.length === 0) return null;

  const podiumAgencies = displayAgencies.slice(0, 3);
  const hasPodium = podiumAgencies.length === 3;

  return (
    <section
      style={{
        background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        padding: '4rem 1rem 0',
      }}
    >
      {/* Header */}
      <div style={{ maxWidth: '72rem', margin: '0 auto', textAlign: 'center', marginBottom: '2rem', padding: '0 1rem' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '20px',
            background: 'rgba(2,82,205,0.08)',
            border: '1px solid rgba(2,82,205,0.15)',
            marginBottom: '0.75rem',
          }}
        >
          <span style={{ fontSize: '14px' }}>🏢</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#0252CD', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {t('topAgencies.badge', 'Agencies of the Month')}
          </span>
        </div>
        <h2
          style={{
            fontSize: 'clamp(1.25rem, 4vw, 2.25rem)',
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.02em',
            marginBottom: '0.5rem',
          }}
        >
          {t('topAgencies.title', 'Leading Real Estate Agencies')}
        </h2>
        <p style={{ fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', color: '#64748b', maxWidth: '500px', margin: '0 auto' }}>
          {t('topAgencies.subtitle', 'Top-performing agencies with the most listings, agents, and client trust')}
        </p>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex justify-center gap-4 px-4" style={{ maxWidth: '860px', margin: '0 auto' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 flex flex-col items-center animate-pulse">
              <div className="w-full max-w-[230px] rounded-3xl bg-white/80 overflow-hidden">
                <div className="h-16 bg-slate-200" />
                <div className="p-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-slate-200 mx-auto -mt-8 mb-3" />
                  <div className="h-4 bg-slate-200 rounded w-28 mx-auto mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-20 mx-auto" />
                </div>
              </div>
              <div className="w-full max-w-[230px] h-[160px] rounded-t-2xl bg-slate-100/50 mt-[-20px]" />
            </div>
          ))}
        </div>
      )}

      {/* 3 agencies: Podium 2-1-3 layout */}
      {!isLoading && hasPodium && (
        <>
          <div
            className="hidden sm:flex"
            style={{
              maxWidth: '860px',
              margin: '0 auto',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: '1rem',
              padding: '0 1rem',
            }}
          >
            {PODIUM_ORDER.map((dataIndex, visualIndex) => (
              <AgencyPodiumCard
                key={podiumAgencies[dataIndex]._id}
                agency={podiumAgencies[dataIndex]}
                rank={dataIndex}
                podiumHeight={PODIUM_HEIGHTS[visualIndex]}
                onAgencyClick={handleAgencyClick}
                t={t}
              />
            ))}
          </div>

          {/* Mobile: vertical stack */}
          <div className="sm:hidden flex flex-col items-center gap-5 px-4 pb-6">
            {[0, 1, 2].map((dataIndex) => (
              <AgencyPodiumCard
                key={podiumAgencies[dataIndex]._id}
                agency={podiumAgencies[dataIndex]}
                rank={dataIndex}
                podiumHeight={50}
                onAgencyClick={handleAgencyClick}
                t={t}
              />
            ))}
          </div>
        </>
      )}

      {/* 1-2 agencies: simple card row */}
      {!isLoading && !hasPodium && podiumAgencies.length > 0 && (
        <div style={{
          maxWidth: '860px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
          gap: '1.5rem',
          padding: '0 1rem',
          flexWrap: 'wrap',
        }}>
          {podiumAgencies.map((agency, i) => (
            <AgencyPodiumCard
              key={agency._id}
              agency={agency}
              rank={i}
              podiumHeight={180}
              onAgencyClick={handleAgencyClick}
              t={t}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default TopAgenciesSection;
