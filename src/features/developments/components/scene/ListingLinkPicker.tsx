import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Check, X } from 'lucide-react';
import { useAttachableListings } from '../../hooks';
import { formatPrice } from '../../utils/format';

interface ListingLinkPickerProps {
  developmentId: string;
  /** The currently linked listing id (encoded), if any. */
  value: string;
  /** Called with the chosen listing id and its title (for the hotspot label). */
  onPick: (listingId: string, title: string) => void;
  onClear: () => void;
}

/**
 * Searchable picker over every listing the owner controls (their own plus any
 * from an agency they run), so a scene region can be linked straight to one of
 * their listings — "place my listing on the facade" — without pasting an id.
 */
export const ListingLinkPicker: React.FC<ListingLinkPickerProps> = ({
  developmentId,
  value,
  onPick,
  onClear,
}) => {
  const { t } = useTranslation('developments');
  const [q, setQ] = useState('');
  const { listings, isLoading } = useAttachableListings(developmentId, q);

  const selected = listings.find((l) => l.id === value);

  return (
    <div className="space-y-2">
      {/* Current selection */}
      {value && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/40 bg-primary/5 px-2 py-1.5 text-sm">
          <span className="min-w-0 truncate text-foreground">
            {selected?.title || t('scene.listingSelected')}
          </span>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={t('filters.clear')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('scene.searchListings')}
          className="min-h-[36px] w-full rounded-lg border border-input bg-background pl-8 pr-2 text-sm"
        />
      </div>

      {/* Results */}
      <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
        {isLoading ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">{t('wizard.creating')}</p>
        ) : listings.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">{t('scene.noListingsFound')}</p>
        ) : (
          <ul>
            {listings.map((l) => {
              const isSel = l.id === value;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => onPick(l.id, l.title)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm hover:bg-muted"
                  >
                    {l.imageUrl ? (
                      <img src={l.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded object-cover" />
                    ) : (
                      <span className="h-9 w-9 shrink-0 rounded bg-muted" aria-hidden="true" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-foreground">{l.title || t('scene.listingSelected')}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[l.city, l.price ? formatPrice(l.price) : null].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    {isSel && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
