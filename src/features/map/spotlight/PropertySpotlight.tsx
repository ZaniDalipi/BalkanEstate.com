import React, { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls, useReducedMotion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import type { Property } from '@/types';
import { useEscapeLayer } from '@/src/features/developments/components/public/explorer/useEscapeLayer';
import SpotlightTabs, { type SpotlightTab } from './SpotlightTabs';
import SpotlightDetails from './SpotlightDetails';
import SpotlightRoute from './SpotlightRoute';
import SpotlightAsk from './SpotlightAsk';
import { useSpotlightRoute } from './useSpotlightRoute';
import { useAskProperty } from './useAskProperty';

interface PropertySpotlightProps {
  property: Property;
  map: google.maps.Map | null;
  userLocation: [number, number] | null;
  isAuthenticated: boolean;
  onClose: () => void;
  onViewDetails: () => void;
  onSignIn: () => void;
}

/**
 * A listing explored without leaving the map: details, the route from the
 * visitor's place (drawn on the map), and questions to the AI. A bottom sheet
 * on phones (drag the handle down to close), a card on the right on larger
 * screens. The map stays usable behind it; Esc closes it.
 */
const PropertySpotlight: React.FC<PropertySpotlightProps> = ({ property, map, userLocation, isAuthenticated, onClose, onViewDetails, onSignIn }) => {
  const { t } = useTranslation(['search']);
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  const [tab, setTab] = useState<SpotlightTab>('details');
  const destination = { lat: property.lat, lng: property.lng };
  const route = useSpotlightRoute(map, destination, userLocation);
  const chat = useAskProperty(property.id);
  const reduceMotion = useReducedMotion();
  const drag = useDragControls();
  useEscapeLayer(ref, onClose);

  const enter = reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 };
  return createPortal(
    <motion.section
      ref={ref}
      role="dialog"
      aria-labelledby={`${id}-title`}
      className="fixed inset-x-0 bottom-0 z-[1150] flex max-h-[72dvh] flex-col rounded-t-3xl bg-white shadow-[0_-12px_40px_rgba(15,23,42,0.18)] md:inset-x-auto md:bottom-6 md:right-6 md:top-24 md:max-h-none md:w-[400px] md:rounded-3xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      initial={enter}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 34 }}
      drag={reduceMotion ? false : 'y'}
      dragListener={false}
      dragControls={drag}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.6 }}
      onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 600) onClose(); }}
    >
      <div className="flex-none px-4 pt-2">
        <div onPointerDown={(e) => drag.start(e)} className="mx-auto mb-2 flex h-6 w-16 cursor-grab touch-none items-center justify-center md:hidden" aria-hidden="true">
          <span className="h-1.5 w-10 rounded-full bg-neutral-300" />
        </div>
        <div className="mb-3 flex items-center gap-3">
          <h2 id={`${id}-title`} className="min-w-0 flex-1 truncate text-base font-bold text-neutral-900">
            {property.title || [property.city, property.country].filter(Boolean).join(', ')}
          </h2>
          <button type="button" onClick={onClose} aria-label={t('search:spotlight.close', 'Close')}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-xl text-neutral-500 hover:bg-neutral-100">×</button>
        </div>
        <SpotlightTabs value={tab} onChange={setTab} idPrefix={id} />
      </div>
      <div id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4">
        {tab === 'details' && <SpotlightDetails property={property} route={route} onViewDetails={onViewDetails} onShowRoute={() => setTab('route')} />}
        {tab === 'route' && <SpotlightRoute route={route} destination={destination} />}
        {tab === 'ask' && <SpotlightAsk chat={chat} isAuthenticated={isAuthenticated} onSignIn={onSignIn} />}
      </div>
    </motion.section>,
    document.body,
  );
};

export default PropertySpotlight;
