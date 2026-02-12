// Agent Profile Header Component
// Displays the hero section with agent info, avatar, and action buttons

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Agent } from '@/types';
import DefaultAvatar from '@/components/shared/DefaultAvatar';
import {
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  CheckBadgeIcon,
  ShareIcon,
  HeartIcon,
  MapPinIcon,
} from '@/constants';
import AgencyBadge from '@/components/shared/AgencyBadge';
import StarRating from '@/components/shared/StarRating';

interface AgentProfileHeaderProps {
  agent: Agent;
  isSaved: boolean;
  onToggleSave: () => void;
  onShare: () => void;
  onContact: () => void;
  gradient?: string;
}

const ProfileAvatar: React.FC<{ agent: Agent }> = ({ agent }) => {
  const [error, setError] = useState(false);

  return (
    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gradient-to-br from-gray-100 to-gray-200 flex-shrink-0">
      {(!agent.avatarUrl || error) ? (
        <div className="w-full h-full flex items-center justify-center">
          <DefaultAvatar gender={agent.gender} seed={agent.agentId || agent.id || agent.name} />
        </div>
      ) : (
        <img
          src={agent.avatarUrl}
          alt={agent.name}
          className="w-full h-full object-cover"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
};

const AgentProfileHeader: React.FC<AgentProfileHeaderProps> = ({
  agent,
  isSaved,
  onToggleSave,
  onShare,
  onContact,
  gradient = 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-900',
}) => {
  const { t } = useTranslation(['agents']);

  const isAgencyAgent = agent.agencyName && agent.agencyName !== 'Independent Agent';

  return (
    <div className={`${gradient} text-white`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <ProfileAvatar agent={agent} />

          {/* Info */}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold">{agent.name}</h1>
              {agent.licenseVerified && (
                <span className="inline-flex items-center gap-1 bg-white/20 text-white px-2 py-1 rounded-full text-xs font-medium">
                  <CheckBadgeIcon className="w-4 h-4" />
                  {t('agents:profilePage.verified')}
                </span>
              )}
            </div>

            {/* Location */}
            {(agent.city || agent.country) && (
              <div className="flex items-center gap-2 text-white/80 mb-2">
                <MapPinIcon className="w-4 h-4" />
                <span>{[agent.city, agent.country].filter(Boolean).join(', ')}</span>
              </div>
            )}

            {/* Agency Badge */}
            {isAgencyAgent && (
              <div className="mb-3">
                <AgencyBadge
                  agencyName={agent.agencyName}
                  agencyLogo={agent.agencyLogo}
                  agencyId={agent.agencyId}
                  variant="light"
                />
              </div>
            )}

            {/* Rating */}
            <div className="flex items-center gap-2 mb-4">
              <StarRating rating={agent.rating || 0} size="md" />
              <span className="text-white/80">
                ({agent.totalReviews || 0} {t('agents:profilePage.reviews')})
              </span>
            </div>

            {/* Contact Info */}
            <div className="flex flex-wrap gap-4 text-sm text-white/80">
              {agent.phone && (
                <a href={`tel:${agent.phone}`} className="flex items-center gap-1 hover:text-white transition-colors">
                  <PhoneIcon className="w-4 h-4" />
                  {agent.phone}
                </a>
              )}
              {agent.email && (
                <a href={`mailto:${agent.email}`} className="flex items-center gap-1 hover:text-white transition-colors">
                  <EnvelopeIcon className="w-4 h-4" />
                  {agent.email}
                </a>
              )}
              {agent.websiteUrl && (
                <a href={agent.websiteUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-white transition-colors">
                  <GlobeAltIcon className="w-4 h-4" />
                  {t('agents:profilePage.website')}
                </a>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4 md:mt-0">
            <button
              onClick={onToggleSave}
              className={`p-3 rounded-full ${
                isSaved ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              } transition-colors`}
              aria-label={isSaved ? t('agents:profilePage.unsave') : t('agents:profilePage.save')}
            >
              <HeartIcon className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={onShare}
              className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              aria-label={t('agents:profilePage.share')}
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onContact}
              className="px-6 py-3 bg-white text-blue-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              {t('agents:profilePage.contact')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentProfileHeader;
