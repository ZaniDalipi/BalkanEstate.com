import React from 'react';
import { useTranslation } from 'react-i18next';
import { AdjustmentsHorizontalIcon, ChevronDownIcon } from '@/constants';

interface CollapsibleFilterPanelProps {
    id: string;
    collapsed: boolean;
    onToggle: () => void;
    /** Shown as a badge on the header while the panel is folded. */
    activeCount?: number;
    children: React.ReactNode;
}

/**
 * A "Filters" header that folds the filter controls below it away with a slow
 * height/opacity animation — the same panel the buy search uses on desktop.
 */
const CollapsibleFilterPanel: React.FC<CollapsibleFilterPanelProps> = ({ id, collapsed, onToggle, activeCount = 0, children }) => {
    const { t } = useTranslation();
    return (
        <div>
            <div className="px-4 pt-2 pb-2">
                <button
                    type="button"
                    onClick={onToggle}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 transition-colors"
                    aria-expanded={!collapsed}
                    aria-controls={id}
                >
                    <div className="flex items-center gap-2">
                        <AdjustmentsHorizontalIcon className="w-4 h-4 text-neutral-600" />
                        <span className="text-sm font-semibold text-neutral-700">{t('search:filters.filters', 'Filters')}</span>
                        {collapsed && activeCount > 0 && (
                            <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-primary rounded-full">
                                {activeCount}
                            </span>
                        )}
                    </div>
                    <ChevronDownIcon className={`w-4 h-4 text-neutral-500 transition-transform duration-[600ms] ${collapsed ? '' : 'rotate-180'}`} />
                </button>
            </div>
            <div
                id={id}
                className="overflow-hidden transition-[max-height,opacity] duration-[600ms] ease-in-out"
                style={collapsed ? { maxHeight: 0, opacity: 0 } : { maxHeight: '50vh', opacity: 1 }}
            >
                <div className="overflow-y-auto" style={{ maxHeight: '50vh' }}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default CollapsibleFilterPanel;
