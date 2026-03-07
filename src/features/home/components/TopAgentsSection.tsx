import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { API_CONFIG } from '@/src/shared/constants/app.constants';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import DefaultAvatar from '@/components/shared/DefaultAvatar';

gsap.registerPlugin(ScrollTrigger);

interface TopAgent {
  _id: string;
  name: string;
  avatarUrl?: string;
  gender?: string;
  avatarOptions?: Record<string, unknown>;
  city?: string;
  country?: string;
  rating: number;
  totalReviews?: number;
  propertiesSold: number;
  activeListings: number;
  specializations?: string[];
  agencyName?: string;
  agencyLogo?: string;
}

const MEDAL_COLORS = {
  0: { bg: '#FFD700', text: '#92710A', glow: 'rgba(255, 215, 0, 0.4)', label: '1st' },
  1: { bg: '#C0C0C0', text: '#5A5A5A', glow: 'rgba(192, 192, 192, 0.4)', label: '2nd' },
  2: { bg: '#CD7F32', text: '#6B3E1A', glow: 'rgba(205, 127, 50, 0.4)', label: '3rd' },
} as const;

const PODIUM_HEIGHTS = [280, 340, 240]; // 2nd, 1st, 3rd
const PODIUM_ORDER = [1, 0, 2]; // Data indices: 2nd place, 1st place, 3rd place

/* ─── Single agent podium card ─── */
const AgentPodiumCard: React.FC<{
  agent: TopAgent;
  rank: number; // 0=1st, 1=2nd, 2=3rd
  podiumHeight: number;
}> = ({ agent, rank, podiumHeight }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const medal = MEDAL_COLORS[rank as keyof typeof MEDAL_COLORS];

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    gsap.set(card, { y: 120, opacity: 0, scale: 0.9 });

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

  const initials = agent.name.split(' ').map(n => n[0]).join('');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        flex: rank === 0 ? '1.2' : '1',
      }}
    >
      {/* Agent Card */}
      <div
        ref={cardRef}
        style={{
          width: '100%',
          maxWidth: rank === 0 ? '260px' : '220px',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: rank === 0 ? '1.75rem 1.25rem' : '1.5rem 1rem',
          textAlign: 'center',
          position: 'relative',
          boxShadow: `0 20px 40px -10px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.8)`,
          marginBottom: '-30px',
          zIndex: 10,
          opacity: 0,
        }}
      >
        {/* Medal badge */}
        <div
          style={{
            position: 'absolute',
            top: '-14px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${medal.bg}, ${medal.bg}dd)`,
            boxShadow: `0 4px 12px ${medal.glow}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            fontWeight: 800,
            color: medal.text,
            border: '2px solid rgba(255,255,255,0.9)',
          }}
        >
          {rank + 1}
        </div>

        {/* Avatar */}
        <div
          style={{
            width: rank === 0 ? '80px' : '64px',
            height: rank === 0 ? '80px' : '64px',
            borderRadius: '50%',
            margin: '0.5rem auto 0.75rem',
            overflow: 'hidden',
            border: `3px solid ${medal.bg}`,
            boxShadow: `0 0 20px ${medal.glow}`,
            position: 'relative',
            background: '#f1f5f9',
          }}
        >
          {agent.avatarUrl ? (
            <img
              src={optimizeCloudinaryUrl(agent.avatarUrl, { width: 160, quality: 'auto', crop: 'fill' })}
              alt={agent.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DefaultAvatar gender={agent.gender} seed={agent._id || agent.name} avatarOptions={agent.avatarOptions} show3d />
            </div>
          )}
        </div>

        {/* Name */}
        <h3
          style={{
            fontSize: rank === 0 ? '1.1rem' : '0.95rem',
            fontWeight: 700,
            color: '#0f172a',
            marginBottom: '2px',
          }}
        >
          {agent.name}
        </h3>

        {/* Location */}
        {(agent.city || agent.country) && (
          <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
            {[agent.city, agent.country].filter(Boolean).join(', ')}
          </p>
        )}

        {/* Rating */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '0.5rem' }}>
          <span style={{ color: '#facc15', fontSize: '14px' }}>★</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{agent.rating.toFixed(1)}</span>
          {agent.totalReviews != null && (
            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>({agent.totalReviews})</span>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
          <div style={{
            padding: '0.3rem 0.6rem',
            borderRadius: '8px',
            background: 'rgba(248,250,252,0.8)',
            border: '1px solid rgba(226,232,240,0.6)',
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{agent.propertiesSold}</span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '3px' }}>sold</span>
          </div>
          <div style={{
            padding: '0.3rem 0.6rem',
            borderRadius: '8px',
            background: 'rgba(248,250,252,0.8)',
            border: '1px solid rgba(226,232,240,0.6)',
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{agent.activeListings}</span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '3px' }}>active</span>
          </div>
        </div>
      </div>

      {/* Podium pillar */}
      <div
        style={{
          width: '100%',
          maxWidth: rank === 0 ? '260px' : '220px',
          height: `${podiumHeight}px`,
          background: `linear-gradient(180deg, ${medal.bg}22 0%, ${medal.bg}08 100%)`,
          borderRadius: '16px 16px 0 0',
          border: `1px solid ${medal.bg}33`,
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
        {/* Rank number large */}
        <span
          style={{
            fontSize: rank === 0 ? '4rem' : '3rem',
            fontWeight: 900,
            color: `${medal.bg}30`,
            lineHeight: 1,
          }}
        >
          {medal.label}
        </span>

        {/* Shimmer line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '10%',
            right: '10%',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${medal.bg}66, transparent)`,
          }}
        />
      </div>
    </div>
  );
};

/* ─── Section ─── */
const TopAgentsSection: React.FC = () => {
  const { t } = useTranslation('home');
  const sectionRef = useRef<HTMLElement>(null);

  const { data: agents = [] } = useQuery<TopAgent[]>({
    queryKey: ['topAgentsWeek'],
    queryFn: async () => {
      const res = await fetch(
        `${API_CONFIG.BASE_URL}/agents?sortBy=rating&limit=3&minRating=4`
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.agents || []).slice(0, 3);
    },
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

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

  if (agents.length < 3) return null;

  return (
    <section
      ref={sectionRef}
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
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
            background: 'rgba(255,215,0,0.12)',
            border: '1px solid rgba(255,215,0,0.25)',
            marginBottom: '1rem',
          }}
        >
          <span style={{ fontSize: '16px' }}>🏆</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#92710A', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {t('topAgents.badge', 'Top Agents of the Week')}
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
          {t('topAgents.title', 'Meet Our Best Performing Agents')}
        </h2>
        <p style={{ fontSize: '0.95rem', color: '#64748b', maxWidth: '500px', margin: '0 auto' }}>
          {t('topAgents.subtitle', 'Ranked by sales, ratings, and client satisfaction this week')}
        </p>
      </div>

      {/* Podium — 2-1-3 layout */}
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '1rem',
          padding: '0 1rem',
        }}
      >
        {PODIUM_ORDER.map((dataIndex, visualIndex) => (
          <AgentPodiumCard
            key={agents[dataIndex]._id}
            agent={agents[dataIndex]}
            rank={dataIndex}
            podiumHeight={PODIUM_HEIGHTS[visualIndex]}
          />
        ))}
      </div>
    </section>
  );
};

export default TopAgentsSection;
