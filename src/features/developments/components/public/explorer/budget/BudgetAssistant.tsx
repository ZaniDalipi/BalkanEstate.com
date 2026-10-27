import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Wallet } from 'lucide-react';
import type { PublicUnit } from '../../../../types';
import { BudgetPanel } from './BudgetPanel';
import { BudgetTeaser } from './BudgetTeaser';
import { useBudgetTeaser } from './useBudgetTeaser';
import { usePriceReference } from './usePriceReference';

export interface BudgetAssistantProps {
  units: PublicUnit[];
  city?: string;
  country?: string;
  /** Take the buyer to this apartment (the explorer glides there and opens it). */
  onShow: (unitId: string) => void;
  /** The explorer's pill style, so the button matches the controls beside it. */
  buttonClassName: string;
}

/**
 * "What's your budget?" on the explorer: a button with a one-time teaser
 * bubble (a bargain, or the starting price), opening a panel that suggests
 * homes for the buyer's budget. Renders nothing when no home on sale has a
 * public price, since there is nothing honest to suggest.
 */
export const BudgetAssistant: React.FC<BudgetAssistantProps> = ({ units, city, country, onShow, buttonClassName }) => {
  const { t } = useTranslation('developments');
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const { reference, featured } = usePriceReference(units, city, country);
  const teaser = useBudgetTeaser(!!featured && !open);
  if (!featured) return null;

  const pop = reduced
    ? {}
    : { initial: { opacity: 0, y: -8, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -8, scale: 0.96 }, transition: { duration: 0.18 } };
  const openPanel = () => {
    teaser.dismiss();
    setOpen(true);
  };

  return (
    <>
      <button type="button" className={buttonClassName} onClick={() => (open ? setOpen(false) : openPanel())} aria-expanded={open} aria-haspopup="dialog" aria-label={t('budget.open', 'Your budget')}>
        <Wallet className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline" aria-hidden="true">
          {t('budget.open', 'Your budget')}
        </span>
      </button>
      <div className="absolute right-0 top-full z-30 mt-2">
        <AnimatePresence>
          {open && (
            <motion.div key="panel" {...pop}>
              <BudgetPanel
                units={units}
                reference={reference}
                onClose={() => setOpen(false)}
                onShow={(id) => {
                  setOpen(false);
                  onShow(id);
                }}
              />
            </motion.div>
          )}
          {!open && teaser.visible && (
            <motion.div key="teaser" {...pop}>
              <BudgetTeaser
                pick={featured}
                reference={reference}
                onOpen={openPanel}
                onShow={(id) => {
                  teaser.dismiss();
                  onShow(id);
                }}
                onDismiss={teaser.dismiss}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};
