import React from 'react';
import { useTranslation } from 'react-i18next';
import CityPhotoRow from './CityPhotoRow';
import { cityRowKey, needsAttention, useCityPhotosManager } from './useCityPhotosManager';

/**
 * The photo shown for each city in Explore Cities.
 *
 * The same place is often curated three times over — as a city, as a City
 * Gallery panel and as a villa destination — and each of those had its own
 * upload. This screen resolves them: it shows which picture actually wins for
 * a city, offers the ones curated elsewhere for the same place so they can be
 * adopted with one press instead of re-uploaded, and lets a photo be
 * overridden outright. An override also stops the Wikipedia seeder from
 * replacing it on the next refresh.
 */
const CityPhotosManager: React.FC = () => {
    const { t } = useTranslation(['admin']);
    const {
        rows, visibleRows, search, setSearch, onlyNeedsAttention, setOnlyNeedsAttention,
        isLoading, loadError, error, notice, pendingKey, save, clear,
    } = useCityPhotosManager();

    const attentionCount = rows.filter(needsAttention).length;

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-lg font-bold text-gray-900">
                    {t('admin:cityPhotos.title', 'City Photos')}
                </h2>
                <p className="text-sm text-gray-500">
                    {t('admin:cityPhotos.subtitle', 'The picture each city shows in Explore Cities. Photos already curated in the City Gallery or as a villa destination can be reused here in one press.')}
                </p>
            </div>

            <p className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
                {t('admin:cityPhotos.precedenceHint', 'A city shows the first photo it has: your override, then its City Gallery panel, then a villa destination for the same place, then the automatically fetched one. Setting a photo here also stops the automatic fetch from replacing it.')}
            </p>

            {(error || loadError) && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
                    {error ?? loadError}
                </div>
            )}
            {notice && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div>
            )}

            <div className="flex flex-wrap items-center gap-3">
                <input
                    type="search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={t('admin:cityPhotos.searchPlaceholder', 'Search a city or country')}
                    aria-label={t('admin:cityPhotos.searchPlaceholder', 'Search a city or country')}
                    className="min-w-[220px] flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
                <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                        type="checkbox"
                        checked={onlyNeedsAttention}
                        onChange={e => setOnlyNeedsAttention(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                    />
                    {t('admin:cityPhotos.onlyNeedsAttention', 'Only unreviewed ({{count}})', { count: attentionCount })}
                </label>
            </div>

            {isLoading ? (
                <div className="py-12 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
                </div>
            ) : visibleRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center text-sm text-gray-500">
                    {rows.length === 0
                        ? t('admin:cityPhotos.empty', 'No cities on record yet — Explore Cities has nothing to show a photo for.')
                        : t('admin:cityPhotos.noMatches', 'No cities match that filter.')}
                </div>
            ) : (
                <div className="space-y-2">
                    {visibleRows.map(row => {
                        const key = cityRowKey(row.city, row.country);
                        return (
                            <CityPhotoRow
                                key={key}
                                row={row}
                                pending={pendingKey === key}
                                onSave={save}
                                onClear={() => clear(row)}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CityPhotosManager;
