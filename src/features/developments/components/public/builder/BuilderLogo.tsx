import React from 'react';
import { Building2 } from 'lucide-react';
import { optimizeImageUrl } from '@/config/mediaConfig';
import { cn } from '@/src/lib/utils';

/** The builder's logo in a white tile, or its initial when there is no logo. */
export const BuilderLogo: React.FC<{ name: string; url?: string; size: number; className?: string }> = ({ name, url, size, className }) => (
  <span className={cn('flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200', className)} style={{ width: size, height: size }}>
    {url ? (
      <img src={optimizeImageUrl(url, { width: size * 2, height: size * 2 })} alt="" className="h-full w-full object-contain p-1" loading="lazy" />
    ) : name ? (
      <span className="font-extrabold text-primary" style={{ fontSize: Math.round(size * 0.42) }} aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>
    ) : (
      <Building2 className="h-1/2 w-1/2 text-slate-400" aria-hidden="true" />
    )}
  </span>
);
