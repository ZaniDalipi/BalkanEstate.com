/**
 * Agency Contact Card Component
 * Displays contact information with interactive links
 */

import React from 'react';
import {
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
} from '@/constants';

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
  if (!phone && !email && !address) return null;

  return (
    <div className="bg-slate-50/80 rounded-xl p-5 border border-slate-200/60">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <PhoneIcon className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">Get in Touch</h3>
      </div>
      <div className="space-y-3">
        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-100 hover:border-primary/30 hover:shadow-md transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:scale-110 flex items-center justify-center transition-all duration-300">
              <PhoneIcon className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Phone</div>
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
            <div className="w-10 h-10 rounded-xl bg-primary/10 group-hover:bg-primary group-hover:scale-110 flex items-center justify-center transition-all duration-300">
              <EnvelopeIcon className="w-5 h-5 text-primary group-hover:text-white transition-colors" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Email</div>
              <span className="font-semibold text-slate-700 group-hover:text-primary transition-colors">
                {email}
              </span>
            </div>
          </a>
        )}
        {address && (
          <div className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MapPinIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-xs text-slate-400 font-medium">Address</div>
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
