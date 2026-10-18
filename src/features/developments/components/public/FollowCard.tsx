import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, Check } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { navigate } from '@/src/app/router/navigation';
import { paths } from '@/src/app/router/paths';
import { Button } from '@/src/components/ui/button';
import { useFollow } from '../../hooks';
import type { FollowFilters, FollowPreferences } from '../../types';

interface FollowCardProps {
  slug: string;
  developmentName: string;
}

const DEFAULT_PREFS: FollowPreferences = {
  newUnits: true,
  priceReductions: true,
  availabilityChanges: true,
  newBuildings: false,
};

const PREF_KEYS: (keyof FollowPreferences)[] = [
  'newUnits',
  'priceReductions',
  'availabilityChanges',
  'newBuildings',
];

/** Parse a numeric input to a non-negative number or undefined (empty). */
const num = (v: string): number | undefined => {
  if (v.trim() === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/**
 * Follow a residence and manage alert preferences + match filters (panel 5).
 * Signed-in only; validates filter ranges before saving and surfaces errors.
 */
export const FollowCard: React.FC<FollowCardProps> = ({ slug, developmentName }) => {
  const { t } = useTranslation('developments');
  const { state } = useAppContext();
  const isAuthed = !!state.isAuthenticated;

  const { following, follow, save, isSaving, unfollow, isUnfollowing } = useFollow(slug, isAuthed);

  const [prefs, setPrefs] = useState<FollowPreferences>(DEFAULT_PREFS);
  const [filters, setFilters] = useState<FollowFilters>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Hydrate the form from the saved follow.
  useEffect(() => {
    if (follow) {
      setPrefs({ ...DEFAULT_PREFS, ...follow.preferences });
      setFilters(follow.filters ?? {});
    }
  }, [follow]);

  const validate = (): string | null => {
    const { minBeds, maxBeds, minPrice, maxPrice, minArea, maxArea } = filters;
    if (minBeds != null && maxBeds != null && minBeds > maxBeds) return t('follow.errBeds');
    if (minPrice != null && maxPrice != null && minPrice > maxPrice) return t('follow.errPrice');
    if (minArea != null && maxArea != null && minArea > maxArea) return t('follow.errArea');
    return null;
  };

  const onSave = async (nextPrefs = prefs) => {
    setError(null);
    setSaved(false);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    try {
      await save({ preferences: nextPrefs, filters });
      setSaved(true);
    } catch {
      setError(t('errors.generic'));
    }
  };

  const onFollow = () => onSave(DEFAULT_PREFS);

  const setFilter = (key: keyof FollowFilters, value: string) =>
    setFilters((prev) => ({ ...prev, [key]: num(value) }));

  // --- Not signed in ------------------------------------------------------
  if (!isAuthed) {
    return (
      <div className="rounded-2xl border border-border bg-white p-5">
        <div className="mb-2 flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 className="text-base font-semibold text-foreground">{t('follow.title', { name: developmentName })}</h3>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{t('follow.signedOutHint')}</p>
        <Button onClick={() => navigate(paths.login())}>{t('follow.signIn')}</Button>
      </div>
    );
  }

  // --- Signed in ----------------------------------------------------------
  return (
    <div className="rounded-2xl border border-border bg-white p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {following ? (
            <Bell className="h-5 w-5 text-primary" aria-hidden="true" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          )}
          <h3 className="text-base font-semibold text-foreground">
            {t('follow.title', { name: developmentName })}
          </h3>
        </div>
        {following ? (
          <Button variant="ghost" size="sm" onClick={() => unfollow()} disabled={isUnfollowing}>
            {t('follow.unfollow')}
          </Button>
        ) : (
          <Button size="sm" onClick={onFollow} disabled={isSaving}>
            <Bell className="mr-1 h-4 w-4" aria-hidden="true" />
            {t('follow.follow')}
          </Button>
        )}
      </div>

      {!following && <p className="text-sm text-muted-foreground">{t('follow.hint')}</p>}

      {following && (
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">{t('follow.prefsHeading')}</legend>
            <div className="space-y-1.5">
              {PREF_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={prefs[key]}
                    onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.checked }))}
                  />
                  {t(`follow.prefs.${key}`)}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">{t('follow.filtersHeading')}</legend>
            <div className="grid grid-cols-2 gap-3">
              <NumRange
                label={t('unit.beds')}
                minValue={filters.minBeds}
                maxValue={filters.maxBeds}
                onMin={(v) => setFilter('minBeds', v)}
                onMax={(v) => setFilter('maxBeds', v)}
                t={t}
              />
              <NumRange
                label={t('unit.price')}
                minValue={filters.minPrice}
                maxValue={filters.maxPrice}
                onMin={(v) => setFilter('minPrice', v)}
                onMax={(v) => setFilter('maxPrice', v)}
                t={t}
              />
              <NumRange
                label={`${t('unit.area')} (m²)`}
                minValue={filters.minArea}
                maxValue={filters.maxArea}
                onMin={(v) => setFilter('minArea', v)}
                onMax={(v) => setFilter('maxArea', v)}
                t={t}
              />
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          {saved && !error && (
            <p className="flex items-center gap-1 text-sm text-green-700 dark:text-green-400">
              <Check className="h-4 w-4" aria-hidden="true" />
              {t('follow.saved')}
            </p>
          )}

          <Button onClick={() => onSave()} disabled={isSaving}>
            {t('follow.savePrefs')}
          </Button>
        </div>
      )}
    </div>
  );
};

const NumRange: React.FC<{
  label: string;
  minValue?: number;
  maxValue?: number;
  onMin: (v: string) => void;
  onMax: (v: string) => void;
  t: (k: string) => string;
}> = ({ label, minValue, maxValue, onMin, onMax, t }) => (
  <div className="col-span-2 sm:col-span-1">
    <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={0}
        inputMode="numeric"
        placeholder={t('follow.min')}
        value={minValue ?? ''}
        onChange={(e) => onMin(e.target.value)}
        className="min-h-[36px] w-full rounded-lg border border-input bg-background px-2 text-sm"
      />
      <span className="text-muted-foreground">–</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        placeholder={t('follow.max')}
        value={maxValue ?? ''}
        onChange={(e) => onMax(e.target.value)}
        className="min-h-[36px] w-full rounded-lg border border-input bg-background px-2 text-sm"
      />
    </div>
  </div>
);
