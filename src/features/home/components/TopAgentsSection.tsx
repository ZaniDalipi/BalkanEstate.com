import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { getAllAgents } from '@/src/features/agents/api/agentApi';
import { optimizeCloudinaryUrl } from '@/config/cloudinaryConfig';
import DefaultAvatar from '@/components/shared/DefaultAvatar';
import { useAppContext } from '@/context/AppContext';
import { useLocalizedNavigation } from '@/src/hooks/useLocalizedNavigation';
import type { Agent } from '@/src/shared/types';

// Composite score: rating is king, then sales, then active listings, then reviews
// Max: 100 (rating 5★) + 50 (10 sales) + 20 (10 listings) + 10 (10 reviews) = 180
function calcScore(agent: Agent): number {
  const ratingPts = (agent.rating || 0) * 20;
  const salesPts  = Math.min((agent.propertiesSold || 0) * 5, 50);
  const activePts = Math.min((agent.activeListings || 0) * 2, 20);
  const reviewPts = Math.min((agent.totalReviews || 0) * 1, 10);
  return Math.round(ratingPts + salesPts + activePts + reviewPts);
}

function getAchievementBadge(agent: Agent): { label: string; color: string } | null {
  const sold    = agent.propertiesSold || 0;
  const active  = agent.activeListings || 0;
  const rating  = agent.rating || 0;
  const reviews = agent.totalReviews || 0;
  if (sold >= 5)                    return { label: '🔥 Top Seller',     color: '#ef4444' };
  if (rating >= 4.5 && reviews >= 3) return { label: '⭐ Top Rated',      color: '#f59e0b' };
  if (active >= 10)                  return { label: '🚀 Most Active',    color: '#3b82f6' };
  if (reviews >= 5)                  return { label: '💬 Most Reviewed',  color: '#8b5cf6' };
  if (active >= 3)                   return { label: '📈 Rising Star',    color: '#10b981' };
  return null;
}

const MEDAL = {
  0: {
    border: '#FFD700',
    glow: 'rgba(255,215,0,0.55)',
    glowStrong: 'rgba(255,215,0,0.35)',
    label: '1st',
    textColor: '#92710A',
    pillarFrom: 'rgba(255,215,0,0.14)',
    pillarTo:   'rgba(255,215,0,0.03)',
  },
  1: {
    border: '#C0C0C0',
    glow: 'rgba(192,192,192,0.4)',
    glowStrong: 'rgba(192,192,192,0.15)',
    label: '2nd',
    textColor: '#5A5A5A',
    pillarFrom: 'rgba(192,192,192,0.1)',
    pillarTo:   'rgba(192,192,192,0.02)',
  },
  2: {
    border: '#CD7F32',
    glow: 'rgba(205,127,50,0.4)',
    glowStrong: 'rgba(205,127,50,0.15)',
    label: '3rd',
    textColor: '#6B3E1A',
    pillarFrom: 'rgba(205,127,50,0.1)',
    pillarTo:   'rgba(205,127,50,0.02)',
  },
} as const;

const PODIUM_HEIGHTS = [280, 340, 240]; // visual positions: 2nd, 1st, 3rd
const PODIUM_ORDER   = [1, 0, 2];       // data indices in visual left→right order

const ScoreLegend: React.FC = () => (
  <div style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.9rem',
    marginTop: '0.85rem',
    padding: '8px 18px',
    background: 'rgba(255,255,255,0.75)',
    borderRadius: '14px',
    border: '1px solid rgba(226,232,240,0.9)',
    flexWrap: 'wrap',
    justifyContent: 'center',
  }}>
    <span style={{ fontSize: '0.62rem', color: '#94a3b8', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
      How to rank up →
    </span>
    {[
      { icon: '★', label: 'Rating ×20', color: '#f59e0b' },
      { icon: '🏠', label: 'Sales ×5',  color: '#10b981' },
      { icon: '📋', label: 'Active ×2', color: '#3b82f6' },
      { icon: '💬', label: 'Reviews ×1', color: '#8b5cf6' },
    ].map(item => (
      <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        <span style={{ fontSize: '0.72rem' }}>{item.icon}</span>
        <span style={{ fontSize: '0.65rem', color: item.color, fontWeight: 700 }}>{item.label}</span>
      </div>
    ))}
  </div>
);

/* ─── Single agent podium card ─── */
const AgentPodiumCard: React.FC<{
  agent: Agent;
  rank: number;
  podiumHeight: number;
  score: number;
  topScore: number;
  onAgentClick?: (agent: Agent) => void;
  t: (key: string, fallback?: string) => string;
}> = ({ agent, rank, podiumHeight, score, topScore, onAgentClick, t }) => {
  const cardRef   = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  const m         = MEDAL[rank as keyof typeof MEDAL];
  const badge     = getAchievementBadge(agent);
  const gap       = rank > 0 ? topScore - score : 0;
  const isChamp   = rank === 0;
  const agentName = agent.name || 'Agent';
  const delay     = rank === 0 ? '0s' : rank === 1 ? '0.15s' : '0.3s';

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVis(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    obs.observe(card);
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      flex: isChamp ? '1.2' : '1', minWidth: 0,
    }}>
      {/* Card */}
      <div
        ref={cardRef}
        onClick={() => onAgentClick?.(agent)}
        role="button" tabIndex={0}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAgentClick?.(agent); } }}
        style={{
          width: '100%',
          maxWidth: isChamp ? '260px' : '220px',
          background: isChamp
            ? 'linear-gradient(145deg, #fffef5 0%, #ffffff 60%, #fffbeb 100%)'
            : 'rgba(255,255,255,0.96)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: isChamp ? '1.75rem 1.25rem 1.25rem' : '1.5rem 1rem 1rem',
          textAlign: 'center',
          position: 'relative',
          boxShadow: isChamp
            ? `0 28px 56px -14px ${m.glowStrong}, 0 0 0 1.5px rgba(255,215,0,0.35), 0 8px 20px rgba(0,0,0,0.07)`
            : `0 20px 40px -10px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.8)`,
          marginBottom: podiumHeight > 0 ? '-30px' : '0',
          zIndex: 10,
          cursor: 'pointer',
          opacity: vis ? 1 : 0,
          transform: vis ? 'translateY(0) scale(1)' : 'translateY(80px) scale(0.9)',
          transition: `opacity 0.7s cubic-bezier(0.34,1.56,0.64,1) ${delay}, transform 0.7s cubic-bezier(0.34,1.56,0.64,1) ${delay}`,
        }}
      >
        {/* Crown for #1 */}
        {isChamp && (
          <div style={{
            position: 'absolute', top: '-22px', left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '26px', lineHeight: 1,
            filter: 'drop-shadow(0 4px 10px rgba(255,180,0,0.65))',
            animation: vis ? 'tas-bounce 2.4s ease-in-out infinite' : 'none',
          }}>
            👑
          </div>
        )}

        {/* Rank medal for 2nd / 3rd */}
        {!isChamp && (
          <div style={{
            position: 'absolute', top: '-14px', left: '50%',
            transform: 'translateX(-50%)',
            width: '30px', height: '30px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${m.border}, ${m.border}bb)`,
            boxShadow: `0 4px 12px ${m.glow}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: 800, color: m.textColor,
            border: '2px solid rgba(255,255,255,0.9)',
          }}>
            {rank + 1}
          </div>
        )}

        {/* "X pts to #1" gap pill */}
        {rank > 0 && gap > 0 && (
          <div style={{
            position: 'absolute', top: '-10px', right: '10px',
            background: 'linear-gradient(135deg, #ff6b35, #e8320a)',
            color: '#fff',
            fontSize: '0.58rem', fontWeight: 700,
            padding: '2px 7px', borderRadius: '999px',
            letterSpacing: '0.02em',
            boxShadow: '0 2px 8px rgba(232,50,10,0.45)',
            whiteSpace: 'nowrap',
          }}>
            {gap} pts to #1
          </div>
        )}

        {/* Avatar */}
        <div style={{
          width: isChamp ? '84px' : '66px',
          height: isChamp ? '84px' : '66px',
          borderRadius: '50%',
          margin: isChamp ? '1rem auto 0.75rem' : '0.5rem auto 0.75rem',
          overflow: 'hidden',
          border: `3px solid ${m.border}`,
          boxShadow: `0 0 0 3px rgba(255,255,255,0.9), 0 0 22px ${m.glow}`,
          background: '#f1f5f9',
        }}>
          {agent.avatarUrl ? (
            <img
              src={optimizeCloudinaryUrl(agent.avatarUrl, { width: 160, quality: 'auto', crop: 'fill' })}
              alt={agentName}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              loading="eager"
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DefaultAvatar gender={agent.gender} seed={agent.id || agentName} avatarOptions={agent.avatarOptions} show3d />
            </div>
          )}
        </div>

        {/* Score pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '3px',
          background: isChamp
            ? 'linear-gradient(135deg, #FFD700, #FFA500)'
            : rank === 1 ? '#f1f5f9' : '#fdf4eb',
          borderRadius: '999px',
          padding: '3px 11px',
          marginBottom: '0.45rem',
        }}>
          <span style={{
            fontSize: isChamp ? '0.82rem' : '0.72rem',
            fontWeight: 800,
            color: isChamp ? '#92710A' : '#475569',
          }}>
            {score} pts
          </span>
        </div>

        {/* Name */}
        <h3 style={{
          fontSize: isChamp ? '1.05rem' : '0.9rem',
          fontWeight: 700, color: '#0f172a',
          marginBottom: '2px', lineHeight: 1.2,
        }}>
          {agentName}
        </h3>

        {/* Location */}
        {(agent.city || agent.country) && (
          <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.45rem' }}>
            {[agent.city, agent.country].filter(Boolean).join(', ')}
          </p>
        )}

        {/* Rating */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', marginBottom: '0.5rem' }}>
          <span style={{ color: '#facc15', fontSize: '13px' }}>★</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
            {(agent.rating || 0).toFixed(1)}
          </span>
          {agent.totalReviews != null && (
            <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>({agent.totalReviews})</span>
          )}
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: '0.55rem',
          marginBottom: badge ? '0.6rem' : '0',
        }}>
          {[
            { value: agent.propertiesSold || 0, label: t('topAgents.sold', 'sold') },
            { value: agent.activeListings || 0,  label: t('topAgents.active', 'active') },
          ].map(stat => (
            <div key={stat.label} style={{
              padding: '0.28rem 0.55rem',
              borderRadius: '8px',
              background: 'rgba(248,250,252,0.85)',
              border: '1px solid rgba(226,232,240,0.7)',
            }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0f172a' }}>{stat.value}</span>
              <span style={{ fontSize: '0.62rem', color: '#94a3b8', marginLeft: '3px' }}>{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Achievement badge */}
        {badge && (
          <div style={{
            display: 'inline-block',
            fontSize: '0.63rem', fontWeight: 700,
            color: badge.color,
            background: `${badge.color}16`,
            border: `1px solid ${badge.color}28`,
            borderRadius: '999px',
            padding: '2px 9px',
          }}>
            {badge.label}
          </div>
        )}
      </div>

      {/* Podium pillar */}
      {podiumHeight > 0 && (
        <div style={{
          width: '100%',
          maxWidth: isChamp ? '260px' : '220px',
          height: `${podiumHeight}px`,
          background: `linear-gradient(180deg, ${m.pillarFrom} 0%, ${m.pillarTo} 100%)`,
          borderRadius: '16px 16px 0 0',
          border: `1px solid ${m.border}28`,
          borderBottom: 'none',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'flex-start',
          paddingTop: '2.5rem',
          position: 'relative', overflow: 'hidden',
        }}>
          <span style={{
            fontSize: isChamp ? '4rem' : '3rem',
            fontWeight: 900,
            color: `${m.border}28`,
            lineHeight: 1,
          }}>
            {m.label}
          </span>
          <div style={{
            position: 'absolute', top: 0, left: '10%', right: '10%',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${m.border}55, transparent)`,
          }} />
        </div>
      )}
    </div>
  );
};

/* ─── Section ─── */
const TopAgentsSection: React.FC = () => {
  const { t: rawT }  = useTranslation('home');
  const t = useCallback((key: string, fallback?: string): string =>
    rawT(key, { defaultValue: fallback }) as string, [rawT]);
  const { dispatch } = useAppContext();
  const { navigate } = useLocalizedNavigation();

  const handleAgentClick = useCallback((agent: Agent) => {
    const id = agent.agentId || agent.id;
    dispatch({ type: 'SET_SELECTED_AGENT', payload: id });
    navigate(`/agents/${id}`, { direction: 'up' });
  }, [dispatch, navigate]);

  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ['topAgentsWeek'],
    queryFn: async () => {
      const { agents } = await getAllAgents();
      return agents
        .filter(a => a.name)
        .sort((a, b) => calcScore(b) - calcScore(a))
        .slice(0, 3);
    },
    staleTime: 10 * 60 * 1000,
    gcTime:    30 * 60 * 1000,
    retry: 1,
  });

  if (!isLoading && agents.length === 0) return null;

  const podiumAgents = agents.slice(0, 3);
  const hasPodium    = podiumAgents.length === 3;
  const topScore     = podiumAgents.length > 0 ? calcScore(podiumAgents[0]) : 0;

  return (
    <section style={{
      background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)',
      padding: '4rem 1rem 0',
    }}>
      <style>{`
        @keyframes tas-bounce {
          0%, 100% { transform: translateX(-50%) translateY(0px); }
          50%       { transform: translateX(-50%) translateY(-5px); }
        }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: '72rem', margin: '0 auto', textAlign: 'center', marginBottom: '2rem', padding: '0 1rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 16px', borderRadius: '20px',
          background: 'rgba(255,215,0,0.12)', border: '1px solid rgba(255,215,0,0.25)',
          marginBottom: '0.75rem',
        }}>
          <span style={{ fontSize: '14px' }}>🏆</span>
          <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#92710A', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {t('topAgents.badge', 'Top Agents of the Week')}
          </span>
        </div>

        <h2 style={{
          fontSize: 'clamp(1.25rem, 4vw, 2.25rem)',
          fontWeight: 800, color: '#0f172a',
          letterSpacing: '-0.02em', marginBottom: '0.5rem',
        }}>
          {t('topAgents.title', 'Meet Our Best Performing Agents')}
        </h2>

        <p style={{ fontSize: 'clamp(0.8rem, 2vw, 0.95rem)', color: '#64748b', maxWidth: '500px', margin: '0 auto' }}>
          {t('topAgents.subtitle', 'Ranked by sales, ratings, and client satisfaction this week')}
        </p>

        <ScoreLegend />
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex justify-center gap-4 px-4" style={{ maxWidth: '800px', margin: '0 auto' }}>
          {[0, 1, 2].map(i => (
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

      {/* Podium: desktop 2–1–3 */}
      {!isLoading && hasPodium && (
        <>
          <div className="hidden sm:flex" style={{
            maxWidth: '800px', margin: '0 auto',
            alignItems: 'flex-end', justifyContent: 'center',
            gap: '2rem', padding: '0 1rem',
          }}>
            {PODIUM_ORDER.map((dataIndex, visualIndex) => (
              <AgentPodiumCard
                key={podiumAgents[dataIndex].id}
                agent={podiumAgents[dataIndex]}
                rank={dataIndex}
                podiumHeight={PODIUM_HEIGHTS[visualIndex]}
                score={calcScore(podiumAgents[dataIndex])}
                topScore={topScore}
                onAgentClick={handleAgentClick}
                t={t}
              />
            ))}
          </div>

          {/* Mobile: vertical stack */}
          <div className="sm:hidden flex flex-col items-center gap-6 px-4 pt-4 pb-6">
            {[0, 1, 2].map(dataIndex => (
              <AgentPodiumCard
                key={podiumAgents[dataIndex].id}
                agent={podiumAgents[dataIndex]}
                rank={dataIndex}
                podiumHeight={0}
                score={calcScore(podiumAgents[dataIndex])}
                topScore={topScore}
                onAgentClick={handleAgentClick}
                t={t}
              />
            ))}
          </div>
        </>
      )}

      {/* 1–2 agents fallback */}
      {!isLoading && !hasPodium && podiumAgents.length > 0 && (
        <div style={{
          maxWidth: '800px', margin: '0 auto',
          display: 'flex', justifyContent: 'center',
          gap: '1.5rem', padding: '0 1rem', flexWrap: 'wrap',
        }}>
          {podiumAgents.map((agent, i) => (
            <AgentPodiumCard
              key={agent.id}
              agent={agent}
              rank={i}
              podiumHeight={200}
              score={calcScore(agent)}
              topScore={topScore}
              onAgentClick={handleAgentClick}
              t={t}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default TopAgentsSection;
