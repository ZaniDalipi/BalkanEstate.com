import React from 'react';
import { ArrowRight } from 'lucide-react';
import { AppLink } from '@/src/app/router/AppLink';

interface HomeSectionHeaderProps {
  id: string;
  title: string;
  subtitle: string;
  action: { label: string; to: string };
}

/** A home page section's title, a line under it, and a link to see everything. */
export const HomeSectionHeader: React.FC<HomeSectionHeaderProps> = ({ id, title, subtitle, action }) => (
  <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-3 px-4">
    <div className="min-w-0">
      <h2 id={id} className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h2>
      <p className="mt-1 text-sm text-slate-600 sm:text-base">{subtitle}</p>
    </div>
    <AppLink
      to={action.to}
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm hover:border-primary/40 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      {action.label}
      <ArrowRight className="h-4 w-4" aria-hidden="true" />
    </AppLink>
  </div>
);
