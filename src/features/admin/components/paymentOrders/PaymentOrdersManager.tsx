import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PaymentOrderCard from './PaymentOrderCard';
import MarkPaidDialog from './MarkPaidDialog';
import CancelOrderDialog from './CancelOrderDialog';
import { usePaymentOrders } from '../../hooks/usePaymentOrdersAdmin';
import type { PaymentOrderFilters } from '../../api/paymentOrdersAdminApi';
import type { AdminPlanOrder } from '@/src/features/payments/types/paymentOrders';

type StatusFilter = NonNullable<PaymentOrderFilters['status']> | 'all';

const TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: 'requested', label: 'Waiting for payment' },
  { id: 'paid', label: 'Paid' },
  { id: 'cancelled', label: 'Cancelled' },
  { id: 'all', label: 'All' },
];

/**
 * Plan requests to settle: customers ask for a plan and pay by arrangement;
 * here the team marks them paid (which starts the plan) or cancels them.
 */
const PaymentOrdersManager: React.FC = () => {
  const { t } = useTranslation('admin');
  const [status, setStatus] = useState<StatusFilter>('requested');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState<AdminPlanOrder | null>(null);
  const [cancelling, setCancelling] = useState<AdminPlanOrder | null>(null);
  const { data, isLoading, isError, refetch } = usePaymentOrders({ status: status === 'all' ? undefined : status, q: q || undefined, page });

  const choose = (next: StatusFilter) => {
    setStatus(next);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t('paymentOrders.title', 'Payment orders')}</h2>
        <p className="text-sm text-gray-600">
          {t('paymentOrders.subtitle', 'Plans customers asked for. When the money arrives, mark the order paid and the plan starts.')}
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label={t('paymentOrders.filterLabel', 'Show orders')} className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button key={tab.id} type="button" role="tab" aria-selected={status === tab.id} onClick={() => choose(tab.id)}
              className={`min-h-[44px] rounded-full px-4 text-sm font-medium ${status === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {t(`paymentOrders.tabs.${tab.id}`, tab.label)}
            </button>
          ))}
        </div>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); setQ(search.trim()); setPage(1); }}>
          <label htmlFor="order-search" className="sr-only">{t('paymentOrders.search', 'Search')}</label>
          <input id="order-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder={t('paymentOrders.searchPlaceholder', 'Reference, email or name')}
            className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 text-sm lg:w-72" />
          <button type="submit" className="min-h-[44px] rounded-lg bg-gray-800 px-4 text-sm font-medium text-white">{t('paymentOrders.search', 'Search')}</button>
        </form>
      </div>

      {isError && (
        <div role="alert" className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {t('paymentOrders.loadFailed', 'Orders could not be loaded.')}
          <button type="button" onClick={() => refetch()} className="min-h-[44px] px-3 font-medium underline">{t('paymentOrders.retry', 'Try again')}</button>
        </div>
      )}
      {isLoading && <p className="text-sm text-gray-500">{t('paymentOrders.loading', 'Loading orders…')}</p>}
      {data && data.orders.length === 0 && (
        <p className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">{t('paymentOrders.empty', 'No orders here.')}</p>
      )}
      {data && data.orders.length > 0 && (
        <ul className="space-y-3">
          {data.orders.map((order) => (
            <PaymentOrderCard key={order.reference} order={order} onMarkPaid={setPaying} onCancel={setCancelling} />
          ))}
        </ul>
      )}

      {data && data.pages > 1 && (
        <nav aria-label={t('paymentOrders.pages', 'Pages')} className="flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="min-h-[44px] rounded-lg border px-4 text-sm disabled:opacity-40">
            {t('paymentOrders.previous', 'Previous')}
          </button>
          <span className="text-sm text-gray-600">{t('paymentOrders.pageOf', 'Page {{page}} of {{pages}}', { page: data.page, pages: data.pages })}</span>
          <button type="button" disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="min-h-[44px] rounded-lg border px-4 text-sm disabled:opacity-40">
            {t('paymentOrders.next', 'Next')}
          </button>
        </nav>
      )}

      {paying && <MarkPaidDialog order={paying} onClose={() => setPaying(null)} />}
      {cancelling && <CancelOrderDialog order={cancelling} onClose={() => setCancelling(null)} />}
    </div>
  );
};

export default PaymentOrdersManager;
