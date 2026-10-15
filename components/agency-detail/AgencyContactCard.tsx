/**
 * Agency Contact Card Component
 * Displays contact information with interactive links
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SoftIcon } from '@/src/shared/illustrations';

interface AgencyContactCardProps {
  phone?: string;
  email?: string;
  address?: string;
}

const AgencyContactCard: React.FC<AgencyContactCardProps> = ({
  phone,
  email,
  address,
}) => {
  const { t } = useTranslation(['agents']);

  if (!phone && !email && !address) return null;

  return (
    <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200/60">
      <div className="flex items-center gap-2 mb-4">
        <SoftIcon name="phone" className="w-8 h-8" />
        <h3 className="text-sm font-bold text-slate-900">{t('agencies.contact.getInTouch')}</h3>
      </div>
      <div className="space-y-3">
        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all group"
          >
            <SoftIcon name="phone" className="w-10 h-10 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
            <div>
              <div className="text-xs text-slate-400 font-medium">{t('agencies.contact.phone')}</div>
              <span className="font-semibold text-slate-700 group-hover:text-primary transition-colors">
                {phone}
              </span>
            </div>
          </a>
        )}
        {email && (
          <a
            href={`mailto:${email}`}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all group"
          >
            <SoftIcon name="envelope" className="w-10 h-10 flex-shrink-0 group-hover:scale-110 transition-transform duration-300" />
            <div>
              <div className="text-xs text-slate-400 font-medium">{t('agencies.contact.email')}</div>
              <span className="font-semibold text-slate-700 group-hover:text-primary transition-colors">
                {email}
              </span>
            </div>
          </a>
        )}
        {address && (
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100">
            <SoftIcon name="pin" className="w-10 h-10 flex-shrink-0" />
            <div>
              <div className="text-xs text-slate-400 font-medium">{t('agencies.contact.address')}</div>
              <span className="font-medium text-slate-700 text-sm leading-snug">
                {address}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgencyContactCard;
