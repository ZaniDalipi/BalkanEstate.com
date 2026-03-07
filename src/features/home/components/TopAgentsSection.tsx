import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getAllAgents } from '@/src/features/agents/api/agentApi';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import DefaultAvatar from '@/components/shared/DefaultAvatar';
import { useAppContext } from '@/context/AppContext';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import type { Agent } from '@/src/shared/types';

const MEDAL_COLORS = {
  0: { bg: '#FFD700', text: '#92710A', glow: 'rgba(255, 215, 0, 0.4)', label: '1st' },
  1: { bg: '#C0C0C0', text: '#5A5A5A', glow: 'rgba(192, 192, 192, 0.4)', label: '2nd' },
  2: { bg: '#CD7F32', text: '#6B3E1A', glow: 'rgba(205, 127, 50, 0.4)', label: '3rd' },
} as const;

const PODIUM_HEIGHTS = [280, 340, 240]; // 2nd, 1st, 3rd
const PODIUM_ORDER = [1, 0, 2]; // Data indices: 2nd place, 1st place, 3rd place


/* ─── Single agent podium card ─── */
const AgentPodiumCard: React.FC<{
  agent: Agent;
  rank: number; // 0=1st, 1=2nd, 2=3rd
  podiumHeight: number;
  onAgentClick?: (agent: Agent) => void;
}> = ({ agent, rank, podiumHeight, onAgentClick }) => {
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

  const agentName = agent.name || 'Agent';

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
      {/* Agent Card */}
      <div
        ref={cardRef}
        onClick={() => onAgentClick?.(agent)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAgentClick?.(agent); } }}
        style={{
          width: '100%',
          maxWidth: rank === 0 ? '260px' : '220px',
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: rank === 0 ? '1.75rem 1.25rem' : '1.5rem 1rem',
          textAlign: 'center',
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
              alt={agentName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="lazy"
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DefaultAvatar gender={agent.gender} seed={agent.id || agentName} avatarOptions={agent.avatarOptions} show3d />
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
          {agentName}
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
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>{(agent.rating || 0).toFixed(1)}</span>
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
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{agent.propertiesSold || 0}</span>
            <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: '3px' }}>sold</span>
          </div>
          <div style={{
            padding: '0.3rem 0.6rem',
            borderRadius: '8px',
            background: 'rgba(248,250,252,0.8)',
            border: '1px solid rgba(226,232,240,0.6)',
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0f172a' }}>{agent.activeListings || 0}</span>
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
  const { dispatch } = useAppContext();
  const { navigate } = useLocalizedNavigation();

  const handleAgentClick = useCallback((agent: Agent) => {
    const agentIdentifier = agent.agentId || agent.id;
    dispatch({ type: 'SET_SELECTED_AGENT', payload: agentIdentifier });
    navigate(`/agents/${agentIdentifier}`);
  }, [dispatch, navigate]);

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ['topAgentsWeek'],
    queryFn: async () => {
      const { agents } = await getAllAgents();
      return agents
        .filter(a => a.name)
        .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        .slice(0, 3);
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  const displayAgents = agents;

  // Don't render section at all if no agents and not loading
  if (!isLoading && displayAgents.length === 0) return null;

  // Pad to 3 for podium layout, only use available agents
  const podiumAgents = displayAgents.slice(0, 3);
  const hasPodium = podiumAgents.length === 3;

  return (
    <section
      style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
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
            background: 'rgba(255,215,0,0.12)',
            border: '1px solid rgba(255,215,0,0.25)',
            marginBottom: '0.75rem',
          }}
        >
          <span style={{ fontSize: '14px' }}>🏆</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#92710A', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {t('topAgents.badge', 'Top Agents of the Week')}
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
          {t('topAgents.title', 'Meet Our Best Performing Agents')}
        </h2>
        <p style={{ fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', color: '#64748b', maxWidth: '500px', margin: '0 auto' }}>
          {t('topAgents.subtitle', 'Ranked by sales, ratings, and client satisfaction this week')}
        </p>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex justify-center gap-4 px-4" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 flex flex-col items-center animate-pulse">
              <div className="w-full max-w-[220px] rounded-3xl bg-white/80 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-200 mx-auto mb-3" />
                <div className="h-4 bg-slate-200 rounded w-24 mx-auto mb-2" />
                <div className="h-3 bg-slate-100 rounded w-16 mx-auto" />
              </div>
              <div className="w-full max-w-[220px] h-[200px] rounded-t-2xl bg-slate-100/50 mt-[-20px]" />
            </div>
          ))}
        </div>
      )}

      {/* 3 agents: Podium 2-1-3 layout */}
      {!isLoading && hasPodium && (
        <>
          <div
            className="hidden sm:flex"
            style={{
              maxWidth: '800px',
              margin: '0 auto',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: '2rem',
              padding: '0 1rem',
            }}
          >
            {PODIUM_ORDER.map((dataIndex, visualIndex) => (
              <AgentPodiumCard
                key={podiumAgents[dataIndex].id}
                agent={podiumAgents[dataIndex]}
                rank={dataIndex}
                podiumHeight={PODIUM_HEIGHTS[visualIndex]}
                onAgentClick={handleAgentClick}
              />
            ))}
          </div>

          {/* Mobile: vertical stack */}
          <div className="sm:hidden flex flex-col items-center gap-16 px-4 pb-6">
            {[0, 1, 2].map((dataIndex) => (
              <AgentPodiumCard
                key={podiumAgents[dataIndex].id}
                agent={podiumAgents[dataIndex]}
                rank={dataIndex}
                podiumHeight={60}
                onAgentClick={handleAgentClick}
              />
            ))}
          </div>
        </>
      )}

      {/* 1-2 agents: simple card row */}
      {!isLoading && !hasPodium && podiumAgents.length > 0 && (
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'center',
          gap: '1.5rem',
          padding: '0 1rem',
          flexWrap: 'wrap',
        }}>
          {podiumAgents.map((agent, i) => (
            <AgentPodiumCard
              key={agent.id}
              agent={agent}
              rank={i}
              podiumHeight={200}
              onAgentClick={handleAgentClick}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default TopAgentsSection;
