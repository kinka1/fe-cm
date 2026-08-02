import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CalendarDays, Coins, CreditCard, Receipt, Wallet } from 'lucide-react';
import { catalogApi, revenueApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Card, Field, Input, PageHeader, Select, StatCard, TableShell, Td, Th, THead, Toolbar, TRow } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { currency, dateTime, decimal, statusLabel } from '../lib/format';
import { firstDayOfMonthIso, todayIso } from '../lib/date';
import { useAuth } from '../lib/auth';
import type { PaymentMethod, SalesBreakdownRow, SalesGroupBy } from '../types/api';

const GROUP_BY_OPTIONS: Array<{ value: SalesGroupBy; label: string }> = [
  { value: 'day', label: 'Per hari' },
  { value: 'product', label: 'Per produk' },
  { value: 'category', label: 'Per kategori' },
  { value: 'payment_method', label: 'Per metode bayar' },
  { value: 'store', label: 'Per toko' },
];

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'qris', 'transfer'];

const GROUP_COLUMN_LABEL: Record<SalesGroupBy, string> = {
  day: 'Tanggal',
  product: 'Produk',
  category: 'Kategori',
  store: 'Toko',
  payment_method: 'Metode bayar',
};

function breakdownLabel(row: SalesBreakdownRow, groupBy: SalesGroupBy): string {
  switch (groupBy) {
    case 'day':
      return row.date ?? '-';
    case 'product':
      return row.product_name ? `${row.product_name}${row.sku ? ` (${row.sku})` : ''}` : `Produk #${row.product_id}`;
    case 'category':
      return row.category_name ?? 'Tanpa kategori';
    case 'store':
      return row.store_name ?? `Toko #${row.store_id}`;
    case 'payment_method':
      return statusLabel(row.payment_method);
  }
}

export function RevenueReportPage() {
  const { storeId, stores } = useAuth();

  const [fromDate, setFromDate] = useState(firstDayOfMonthIso);
  const [toDate, setToDate] = useState(todayIso);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [groupBy, setGroupBy] = useState<SalesGroupBy>('day');
  const [categoryId, setCategoryId] = useState('');
  const [scopeStoreId, setScopeStoreId] = useState('');
  const [dailyDate, setDailyDate] = useState(todayIso);

  // Kosong berarti memakai toko aktif user; backend tetap memvalidasi aksesnya.
  const effectiveStoreId = scopeStoreId ? Number(scopeStoreId) : storeId;
  const scope = { store_id: effectiveStoreId, payment_method: paymentMethod || null };
  const rangeReady = Boolean(fromDate && toDate);

  const categories = useQuery({ queryKey: ['categories'], queryFn: catalogApi.categories });

  const summary = useQuery({
    queryKey: ['revenue', 'summary', fromDate, toDate, effectiveStoreId, paymentMethod],
    queryFn: () => revenueApi.summary({ from_date: fromDate, to_date: toDate, ...scope }),
    enabled: rangeReady,
  });

  const sales = useQuery({
    queryKey: ['revenue', 'sales', fromDate, toDate, effectiveStoreId, paymentMethod, groupBy, categoryId],
    queryFn: () => revenueApi.sales({
      from_date: fromDate,
      to_date: toDate,
      group_by: groupBy,
      category_id: categoryId ? Number(categoryId) : null,
      ...scope,
    }),
    enabled: rangeReady,
  });

  const daily = useQuery({
    queryKey: ['revenue', 'daily', dailyDate, effectiveStoreId, paymentMethod],
    queryFn: () => revenueApi.daily({ date: dailyDate, include_orders: true, per_page: 10, ...scope }),
    enabled: Boolean(dailyDate),
  });

  const totals = summary.data;
  const stats = [
    { label: 'Total pendapatan', value: currency(totals?.total_revenue ?? 0), icon: BarChart3, tone: 'bg-brand-soft text-brand-dark' },
    { label: 'Jumlah order', value: totals?.total_orders ?? 0, icon: Receipt, tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Tunai', value: currency(totals?.cash_revenue ?? 0), icon: Wallet, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'QRIS', value: currency(totals?.qris_revenue ?? 0), icon: CreditCard, tone: 'bg-sky-50 text-sky-600' },
    { label: 'Transfer', value: currency(totals?.transfer_revenue ?? 0), icon: Coins, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Total diskon', value: currency(totals?.discount ?? 0), icon: CalendarDays, tone: 'bg-purple-50 text-purple-600' },
  ];

  // Skala bar tren harian; minimal 1 agar tidak membagi nol saat belum ada data.
  const peakRevenue = Math.max(1, ...(totals?.daily_details ?? []).map((row) => row.revenue));

  return (
    <section className="grid gap-5">
      <PageHeader
        title="Laporan Pendapatan"
        description="Rekap omzet dari order berstatus paid, sesuai perhitungan backend."
      />

      <Toolbar columns={5}>
        <Field label="Dari tanggal">
          <Input type="date" value={fromDate} max={toDate} onChange={(event) => setFromDate(event.target.value)} />
        </Field>
        <Field label="Sampai tanggal">
          <Input type="date" value={toDate} min={fromDate} onChange={(event) => setToDate(event.target.value)} />
        </Field>
        <Field label="Toko">
          <Select value={scopeStoreId} onChange={(event) => setScopeStoreId(event.target.value)}>
            <option value="">Toko aktif saya</option>
            {stores.map((store) => <option key={store.id} value={store.id}>{store.store_name}</option>)}
          </Select>
        </Field>
        <Field label="Metode bayar">
          <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            <option value="">Semua metode</option>
            {PAYMENT_METHODS.map((method) => <option key={method} value={method}>{statusLabel(method)}</option>)}
          </Select>
        </Field>
        <Field label="Kategori produk">
          <Select value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">Semua kategori</option>
            {categories.data?.map((category) => <option key={category.id} value={category.id}>{category.category_name}</option>)}
          </Select>
        </Field>
      </Toolbar>

      {summary.isLoading && <LoadingState label="Menghitung pendapatan..." />}
      {summary.error && <ErrorState message={getApiError(summary.error)} />}

      {totals && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {stats.map((stat) => <StatCard key={stat.label} {...stat} />)}
          </div>

          <Card>
            <h2 className="font-bold">Tren harian</h2>
            {totals.daily_details.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Tidak ada transaksi paid pada rentang ini.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {totals.daily_details.map((row) => (
                  <li key={row.date} className="grid gap-1.5 sm:grid-cols-[104px_minmax(0,1fr)_auto] sm:items-center sm:gap-3">
                    <span className="text-xs text-muted sm:text-sm">{row.date}</span>
                    <div className="h-2.5 rounded-full bg-subtle" role="presentation">
                      <div className="h-2.5 rounded-full bg-brand" style={{ width: `${Math.round((row.revenue / peakRevenue) * 100)}%` }} />
                    </div>
                    <span className="text-sm font-semibold sm:text-right">
                      {currency(row.revenue)} <span className="text-xs font-normal text-muted">({row.total_orders} order)</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      <Card className="grid gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-bold">Analisis penjualan</h2>
            <p className="text-sm text-muted">Diskon dialokasikan proporsional per item oleh backend (net sales).</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {GROUP_BY_OPTIONS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={groupBy === option.value ? 'primary' : 'secondary'}
                onClick={() => setGroupBy(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {sales.isLoading && <LoadingState />}
        {sales.error && <ErrorState message={getApiError(sales.error)} />}

        {sales.data && (
          <>
            <dl className="grid gap-3 rounded-md bg-subtle p-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
              <div><dt className="text-muted">Order</dt><dd className="font-bold">{sales.data.summary.total_orders}</dd></div>
              <div><dt className="text-muted">Item terjual</dt><dd className="font-bold">{decimal(sales.data.summary.total_items)}</dd></div>
              <div><dt className="text-muted">Gross sales</dt><dd className="font-bold">{currency(sales.data.summary.gross_sales)}</dd></div>
              <div><dt className="text-muted">Diskon</dt><dd className="font-bold">{currency(sales.data.summary.discount)}</dd></div>
              <div><dt className="text-muted">Net sales</dt><dd className="font-bold text-brand">{currency(sales.data.summary.net_sales)}</dd></div>
            </dl>

            {sales.data.breakdown.length === 0 ? (
              <EmptyState title="Belum ada penjualan" description="Tidak ada order paid pada filter ini." />
            ) : (
              <TableShell minWidth="min-w-[760px]">
                <THead>
                  <tr>
                    <Th>{GROUP_COLUMN_LABEL[groupBy]}</Th>
                    <Th align="right">Order</Th>
                    <Th align="right">Item</Th>
                    <Th align="right">Gross</Th>
                    <Th align="right">Diskon</Th>
                    <Th align="right">Net sales</Th>
                  </tr>
                </THead>
                <tbody>
                  {sales.data.breakdown.map((row, index) => (
                    <TRow key={`${groupBy}-${row.product_id ?? row.store_id ?? row.category_id ?? row.date ?? index}`}>
                      <Td className="font-semibold">{breakdownLabel(row, groupBy)}</Td>
                      <Td align="right">{row.total_orders}</Td>
                      <Td align="right">{decimal(row.total_items)}</Td>
                      <Td align="right">{currency(row.gross_sales)}</Td>
                      <Td align="right">{currency(row.discount)}</Td>
                      <Td align="right" className="font-bold">{currency(row.net_sales)}</Td>
                    </TRow>
                  ))}
                </tbody>
              </TableShell>
            )}
          </>
        )}
      </Card>

      <Card className="grid gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-bold">Rekap satu hari</h2>
            <p className="text-sm text-muted">Ringkasan beserta 10 order terakhir pada tanggal terpilih.</p>
          </div>
          <Field label="Tanggal" className="w-full sm:w-48">
            <Input type="date" value={dailyDate} onChange={(event) => setDailyDate(event.target.value)} />
          </Field>
        </div>

        {daily.isLoading && <LoadingState />}
        {daily.error && <ErrorState message={getApiError(daily.error)} />}

        {daily.data && (
          <>
            <dl className="grid gap-3 rounded-md bg-subtle p-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
              <div><dt className="text-muted">Order</dt><dd className="font-bold">{daily.data.summary.total_orders}</dd></div>
              <div><dt className="text-muted">Pendapatan</dt><dd className="font-bold text-brand">{currency(daily.data.summary.total_revenue)}</dd></div>
              <div><dt className="text-muted">Tunai</dt><dd className="font-bold">{currency(daily.data.summary.cash_revenue)}</dd></div>
              <div><dt className="text-muted">QRIS</dt><dd className="font-bold">{currency(daily.data.summary.qris_revenue)}</dd></div>
              <div><dt className="text-muted">Transfer</dt><dd className="font-bold">{currency(daily.data.summary.transfer_revenue)}</dd></div>
            </dl>

            {(daily.data.orders?.data.length ?? 0) === 0 ? (
              <EmptyState title="Belum ada order" description="Tidak ada transaksi paid pada tanggal ini." />
            ) : (
              <ul className="grid gap-2">
                {daily.data.orders?.data.map((order) => (
                  <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{order.order_number}</p>
                      <p className="truncate text-xs text-muted">{dateTime(order.order_date)} &middot; {order.customer_name || 'Tanpa nama'}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge tone={order.payment_method === 'cash' ? 'green' : order.payment_method === 'qris' ? 'blue' : 'amber'}>
                        {statusLabel(order.payment_method)}
                      </Badge>
                      <span className="font-bold">{currency(order.total_amount)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Card>
    </section>
  );
}
