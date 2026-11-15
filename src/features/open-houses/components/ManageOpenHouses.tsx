import React, { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMyOpenHouses } from '../hooks/useOpenHouses';
import { useHostOpenHouse } from '../hooks/useOpenHouseMutations';
import { MAX_OPEN_HOUSES_PER_LISTING } from '../utils/openHouseDraft';
import { openHouseErrorKey } from '../utils/openHouseErrorKey';
import HostOpenHouseRow from './HostOpenHouseRow';
import OpenHouseWindowForm from './OpenHouseWindowForm';

interface ManageOpenHousesProps {
  propertyId: string;
}

/**
 * On a seller's own listing: an optional, collapsed "Open house" row. Opening
 * it lists the planned open houses with who's coming, and lets them add one.
 */
const ManageOpenHouses: React.FC<ManageOpenHousesProps> = ({ propertyId }) => {
  const { t } = useTranslation('property');
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const panelId = useId();
  const { data: list = [], isLoading, isError } = useMyOpenHouses(propertyId, open);
  const { add, cancel } = useHostOpenHouse(propertyId);
  const failure = add.error ?? cancel.error;

  return (
    <div className="border-t border-neutral-100 pt-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[44px] w-full items-center justify-between text-left text-sm font-semibold text-neutral-800"
      >
        <span>
          {t('openHouse.manageTitle', { defaultValue: 'Open house' })}{' '}
          <span className="font-normal text-neutral-500">{t('openHouse.optional', { defaultValue: '(optional)' })}</span>
        </span>
        <span aria-hidden="true" className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div id={panelId} className="space-y-3 pb-2">
          {isLoading && <p className="text-sm text-neutral-500">{t('openHouse.loading', { defaultValue: 'Loading…' })}</p>}
          {isError && <p role="alert" className="text-sm text-red-600">{t('openHouse.errors.generic', { defaultValue: 'Something went wrong. Please try again.' })}</p>}
          {!isLoading && !isError && list.length === 0 && !adding && (
            <p className="text-sm text-neutral-600">{t('openHouse.noneYet', { defaultValue: 'No open house planned. Add a date if you want people to drop by.' })}</p>
          )}
          {list.length > 0 && (
            <ul className="space-y-2">
              {list.map((oh) => (
                <HostOpenHouseRow
                  key={oh.id}
                  openHouse={oh}
                  cancelling={cancel.isPending && cancel.variables === oh.id}
                  onCancel={() => cancel.mutate(oh.id)}
                />
              ))}
            </ul>
          )}
          {failure && <p role="alert" className="text-sm text-red-600">{t(openHouseErrorKey(failure).key, { defaultValue: openHouseErrorKey(failure).defaultValue })}</p>}
          {adding ? (
            <OpenHouseWindowForm
              existing={list}
              submitting={add.isPending}
              onAdd={(draft) => add.mutate(draft, { onSuccess: () => setAdding(false) })}
              onCancel={() => setAdding(false)}
            />
          ) : list.length < MAX_OPEN_HOUSES_PER_LISTING && !isLoading && (
            <button type="button" onClick={() => { add.reset(); setAdding(true); }} className="min-h-[44px] rounded-lg border border-emerald-600 px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-50">
              {t('openHouse.addOpenHouse', { defaultValue: '+ Add an open house' })}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ManageOpenHouses;
