import React from 'react';
import { useTranslation } from 'react-i18next';
import { Building2 } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import type { Development } from '../../../types';
import { useBuilderImages } from '../../../hooks/useBuilderImages';
import { BuilderFields } from './BuilderFields';
import { BuilderImageField } from './BuilderImageField';
import { useBuilderForm } from './useBuilderForm';

interface BuilderSectionProps {
  development: Development;
  canEdit: boolean;
}

/**
 * "The builder": the company building this residence, as buyers see it on the
 * residence page (banner, logo, facts, contacts). Logo and banner save at once;
 * the text saves with "Save builder".
 */
export const BuilderSection: React.FC<BuilderSectionProps> = ({ development, canEdit }) => {
  const { t } = useTranslation('developments');
  const b = useBuilderForm(development);
  const images = useBuilderImages(development.id);
  const disabled = !canEdit || b.saving;

  return (
    <section aria-labelledby="builder-heading" className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <h2 id="builder-heading" className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <Building2 className="h-5 w-5 text-primary" aria-hidden="true" />
        {t('builder.heading', 'The builder')}
      </h2>
      <p className="mb-5 mt-1 text-sm text-slate-600">
        {canEdit
          ? t('builder.intro', 'The company building this residence. Buyers see it at the top of the residence page, with its banner, logo and contacts.')
          : t('details.readOnly', 'Only owners and admins can change these details.')}
      </p>
      <div className="mb-6 grid gap-4 sm:grid-cols-[auto_1fr]">
        <BuilderImageField kind="logo" url={development.builder?.logo?.url} disabled={!canEdit} onUpload={(file) => images.upload({ kind: 'logo', file })} onRemove={() => images.remove('logo')} />
        <BuilderImageField kind="banner" url={development.builder?.banner?.url} disabled={!canEdit} onUpload={(file) => images.upload({ kind: 'banner', file })} onRemove={() => images.remove('banner')} />
      </div>
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void b.save();
        }}
        className="space-y-5"
      >
        <BuilderFields form={b.form} set={b.set} errors={b.errors} disabled={disabled} />
        {b.formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{b.formError}</p>}
        {canEdit && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-3">
            <span role="status" className="mr-auto text-sm text-slate-600">
              {b.dirty ? t('details.unsaved', 'You have unsaved changes.') : b.saved ? t('builder.saved', 'The builder was saved.') : null}
            </span>
            <Button type="button" variant="ghost" disabled={!b.dirty || b.saving} onClick={b.discard}>
              {t('details.discard', 'Discard')}
            </Button>
            <Button type="submit" disabled={!b.dirty || b.saving}>
              {b.saving ? t('details.saving', 'Saving…') : t('builder.save', 'Save builder')}
            </Button>
          </div>
        )}
      </form>
    </section>
  );
};
