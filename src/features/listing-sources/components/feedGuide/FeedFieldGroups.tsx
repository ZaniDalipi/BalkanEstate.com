import React from 'react';
import { useTranslation } from 'react-i18next';
import { FEED_FIELD_GROUPS, type FeedTemplateFormat } from '../../feedTemplate/feedTemplates';

type Group = 'needed' | 'recommended' | 'alsoRead';

const GROUPS: { id: Group; title: string; note: string; chip: string }[] = [
  { id: 'needed', title: 'Needed', note: "A listing can't be published without these.", chip: 'bg-red-50 text-red-800 border-red-200' },
  { id: 'recommended', title: 'Recommended', note: 'Buyers search and filter by these.', chip: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'alsoRead', title: 'Also read', note: 'Filled in when your feed has them.', chip: 'bg-gray-50 text-gray-700 border-gray-200' },
];

const TIPS = [
  { key: 'tipAnyShape', text: 'Already have your own JSON? Paste it — names like price, cijena, çmimi or kupatila are matched automatically; the template is just the shape that maps every field.' },
  { key: 'tipOneFile', text: 'Put every listing in one file. If it has to be split into pages, add a "next" link to the following page.' },
  { key: 'tipFixedUrl', text: 'Keep it at a fixed address (for example https://your-agency.com/feed.json), so new and changed listings sync automatically.' },
  { key: 'tipPhotos', text: 'Link full-size photos; up to 30 photos per listing are kept.' },
  { key: 'tipExisting', text: 'Already export to a portal (Kyero or OpenImmo-style XML) or have an RSS feed? Paste that link — it works as it is.' },
] as const;

/** Which fields the feed needs, which help, which are read too — and tips for a feed that imports cleanly. */
const FeedFieldGroups: React.FC<{ format: FeedTemplateFormat }> = ({ format }) => {
  const { t } = useTranslation(['listingFeeds']);
  return (
    <div className="space-y-4">
      <dl className="space-y-3">
        {GROUPS.map((g) => (
          <div key={g.id}>
            <dt className="text-sm font-semibold text-gray-800">
              {t(`listingFeeds:guide.group.${g.id}`, { defaultValue: g.title })}
              <span className="ml-2 font-normal text-gray-500">
                {t(`listingFeeds:guide.group.${g.id}Note`, { defaultValue: g.note })}
              </span>
            </dt>
            <dd className="mt-1.5 flex flex-wrap gap-1.5">
              {FEED_FIELD_GROUPS[format][g.id].map((name) => (
                <code key={name} className={`rounded-md border px-1.5 py-0.5 text-xs ${g.chip}`}>{name}</code>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <div>
        <h4 className="text-sm font-semibold text-gray-800">{t('listingFeeds:guide.tipsTitle', { defaultValue: 'Tips' })}</h4>
        <ul className="mt-1.5 space-y-1 list-disc pl-5 text-sm text-gray-600">
          {TIPS.map((tip) => (
            <li key={tip.key}>{t(`listingFeeds:guide.${tip.key}`, { defaultValue: tip.text })}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FeedFieldGroups;
