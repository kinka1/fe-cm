import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, CalendarDays, Coins, CreditCard, FileSpreadsheet, Receipt, Wallet } from 'lucide-react';
import { catalogApi, revenueApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Card, Field, Input, PageHeader, Select, StatCard, TableShell, Td, Th, THead, Toolbar, TRow } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { currency, dateTime, decimal, statusLabel, toNumber } from '../lib/format';
import { clockStamp, firstDayOfMonthIso, todayIso } from '../lib/date';
import type { SheetColumn } from '../lib/excel';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import type { Order, OrderDetail, PaymentMethod, RevenueDailyRow, RevenueDayStat, RevenueSummary, SalesBreakdownRow, SalesGroupBy } from '../types/api';

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

const MONEY_COLUMNS: Array<{ header: string; key: 'subtotal' | 'discount' | 'tax' | 'payment_fee' | 'cash_revenue' | 'qris_revenue' | 'transfer_revenue' }> = [
  { header: 'Subtotal', key: 'subtotal' },
  { header: 'Diskon', key: 'discount' },
  { header: 'Pajak', key: 'tax' },
  { header: 'Biaya pembayaran', key: 'payment_fee' },
  { header: 'Tunai', key: 'cash_revenue' },
  { header: 'QRIS', key: 'qris_revenue' },
  { header: 'Transfer', key: 'transfer_revenue' },
];

type MoneyKey = (typeof MONEY_COLUMNS)[number]['key'];

interface OrderItemRow {
  order: Order;
  detail: OrderDetail;
}

function itemCount(order: Order): number {
  return (order.details ?? []).reduce((total, detail) => total + toNumber(detail.quantity), 0);
}

function moneyColumns<T extends Record<MoneyKey, number>>(): Array<SheetColumn<T>> {
  return MONEY_COLUMNS.map((column) => ({ header: column.header, value: (row: T) => row[column.key], format: 'currency' }));
}

export function RevenueReportPage() {
  const { storeId, stores } = useAuth();
  const toast = useToast();

  const [fromDate, setFromDate] = useState(firstDayOfMonthIso);
  const [toDate, setToDate] = useState(todayIso);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [groupBy, setGroupBy] = useState<SalesGroupBy>('day');
  const [categoryId, setCategoryId] = useState('');
  const [scopeStoreId, setScopeStoreId] = useState('');
  const [dailyDate, setDailyDate] = useState(todayIso);
  const [exporting, setExporting] = useState(false);

  const effectiveStoreId = scopeStoreId ? Number(scopeStoreId) : storeId;
  const scope = { store_id: effectiveStoreId, payment_method: paymentMethod || null };
  const rangeReady = Boolean(fromDate && toDate);

  const categories = useQuery({ queryKey: ['categories', 'list', effectiveStoreId], queryFn: () => catalogApi.categories({ store_id: effectiveStoreId ?? undefined, per_page: 100 }) });

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
    queryFn: () => revenueApi.daily({ date: dailyDate, include_orders: true, per_page: 100, ...scope }),
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

  const peakRevenue = Math.max(1, ...(totals?.daily_details ?? []).map((row) => row.revenue));

  const storeLabel = effectiveStoreId
    ? stores.find((store) => store.id === effectiveStoreId)?.store_name ?? `Toko #${effectiveStoreId}`
    : 'Semua toko yang bisa diakses';
  const categoryLabel = categoryId
    ? categories.data?.find((category) => category.id === Number(categoryId))?.category_name ?? `Kategori #${categoryId}`
    : 'Semua kategori';
  const paymentLabel = paymentMethod ? statusLabel(paymentMethod) : 'Semua metode';

  const salesData = sales.data;
  const dailyData = daily.data;
  const exportReady = rangeReady && Boolean(totals || salesData || dailyData);

  const handleExport = async () => {
    setExporting(true);
    const downloadedAt = new Date();
    const filterLines = [
      `Periode: ${fromDate} s/d ${toDate}`,
      `Toko: ${storeLabel}`,
      `Metode bayar: ${paymentLabel}`,
      `Kategori produk: ${categoryLabel}`,
      `Diunduh: ${dateTime(downloadedAt.toISOString())}`,
    ];

    try {
      const [{ downloadXlsx, sheet }, fetched] = await Promise.all([
        import('../lib/excel'),
        revenueApi.salesOrders({
          from_date: fromDate,
          to_date: toDate,
          category_id: categoryId ? Number(categoryId) : null,
          ...scope,
        }),
      ]);

      const exportedOrders = fetched.orders;
      const itemRows: OrderItemRow[] = exportedOrders.flatMap(
        (order) => (order.details ?? []).map((detail) => ({ order, detail })),
      );

      const transactionMeta = [
        ...filterLines,
        `Jumlah transaksi: ${exportedOrders.length}${fetched.truncated ? ` dari ${fetched.total} (dipotong pada batas export)` : ''}`,
        `Jumlah baris item: ${itemRows.length}`,
        ...(categoryId
          ? ['Catatan: filter kategori menyaring transaksi yang memuat kategori tersebut; item lain dalam transaksi yang sama tetap ikut tercatat.']
          : []),
      ];

      // Jam unduh ikut di nama file supaya tiap export jadi file berbeda —
      // tanpa ini browser menyimpannya sebagai "... (1).xlsx" dan file lama
      // gampang terbuka lagi tanpa disadari.
      downloadXlsx(`laporan-pendapatan-${fromDate}-sd-${toDate}-${clockStamp(downloadedAt)}`, [
        totals && sheet<RevenueSummary>({
          name: 'Ringkasan',
          title: 'Ringkasan Pendapatan',
          meta: filterLines,
          columns: [
            { header: 'Total order', value: (row) => row.total_orders, format: 'number' },
            { header: 'Total pendapatan', value: (row) => row.total_revenue, format: 'currency' },
            ...moneyColumns<RevenueSummary>(),
          ],
          rows: [totals],
        }),

        totals && sheet<RevenueDailyRow>({
          name: 'Tren Harian',
          title: 'Tren Pendapatan Harian',
          meta: filterLines,
          columns: [
            { header: 'Tanggal', value: (row) => row.date },
            { header: 'Order', value: (row) => row.total_orders, format: 'number' },
            { header: 'Pendapatan', value: (row) => row.revenue, format: 'currency' },
            ...moneyColumns<RevenueDailyRow>(),
          ],
          rows: totals.daily_details,
          emptyMessage: 'Tidak ada transaksi paid pada rentang ini.',
        }),

        salesData && sheet<SalesBreakdownRow>({
          name: 'Analisis Penjualan',
          title: `Analisis Penjualan — ${GROUP_BY_OPTIONS.find((option) => option.value === groupBy)?.label ?? groupBy}`,
          meta: [
            ...filterLines,
            `Order: ${salesData.summary.total_orders} | Item terjual: ${decimal(salesData.summary.total_items)}`,
            `Gross: ${currency(salesData.summary.gross_sales)} | Diskon: ${currency(salesData.summary.discount)} | Net: ${currency(salesData.summary.net_sales)}`,
          ],
          columns: [
            { header: GROUP_COLUMN_LABEL[groupBy], value: (row) => breakdownLabel(row, groupBy) },
            { header: 'Order', value: (row) => row.total_orders, format: 'number' },
            { header: 'Item', value: (row) => row.total_items, format: 'number' },
            { header: 'Gross sales', value: (row) => row.gross_sales, format: 'currency' },
            { header: 'Diskon', value: (row) => row.discount, format: 'currency' },
            { header: 'Net sales', value: (row) => row.net_sales, format: 'currency' },
          ],
          rows: salesData.breakdown,
          emptyMessage: 'Tidak ada order paid pada filter ini.',
        }),

        dailyData && sheet<RevenueDayStat>({
          name: 'Rekap Harian',
          title: `Rekap Tanggal ${dailyDate}`,
          meta: [`Toko: ${storeLabel}`, `Metode bayar: ${paymentLabel}`],
          columns: [
            { header: 'Tanggal', value: (row) => row.date },
            { header: 'Order', value: (row) => row.total_orders, format: 'number' },
            { header: 'Pendapatan', value: (row) => row.total_revenue, format: 'currency' },
            ...moneyColumns<RevenueDayStat>(),
          ],
          rows: [dailyData.summary],
        }),

        sheet<Order>({
          name: 'Transaksi',
          title: 'Detail Transaksi',
          meta: transactionMeta,
          columns: [
            { header: 'No. order', value: (row) => row.order_number },
            { header: 'Waktu', value: (row) => dateTime(row.order_date) },
            { header: 'Toko', value: (row) => row.store?.store_name ?? '-' },
            { header: 'Tipe order', value: (row) => statusLabel(row.order_type) },
            { header: 'Pelanggan', value: (row) => row.customer_name || 'Tanpa nama' },
            { header: 'Status order', value: (row) => statusLabel(row.order_status) },
            { header: 'Jumlah item', value: (row) => itemCount(row), format: 'number' },
            { header: 'Metode bayar', value: (row) => statusLabel(row.payment_method) },
            { header: 'Status bayar', value: (row) => statusLabel(row.payment_status) },
            { header: 'Status transaksi', value: (row) => statusLabel(row.payment?.payment_status) },
            { header: 'Uang dibayar', value: (row) => (row.payment ? toNumber(row.payment.amount_paid) : null), format: 'currency' },
            { header: 'Kembalian', value: (row) => (row.payment ? toNumber(row.payment.change_amount) : null), format: 'currency' },
            { header: 'Ref. QRIS', value: (row) => row.payment?.qris_transaction_id ?? '-' },
            { header: 'Subtotal', value: (row) => toNumber(row.subtotal), format: 'currency' },
            { header: 'Diskon', value: (row) => toNumber(row.discount), format: 'currency' },
            { header: 'Pajak', value: (row) => toNumber(row.tax), format: 'currency' },
            { header: 'Biaya pembayaran', value: (row) => toNumber(row.payment_fee), format: 'currency' },
            { header: 'Total', value: (row) => toNumber(row.total_amount), format: 'currency' },
          ],
          rows: exportedOrders,
          emptyMessage: 'Tidak ada order paid pada filter ini.',
        }),

        sheet<OrderItemRow>({
          name: 'Item Transaksi',
          title: 'Rincian Menu per Transaksi',
          meta: transactionMeta,
          columns: [
            { header: 'No. order', value: ({ order }) => order.order_number },
            { header: 'Waktu', value: ({ order }) => dateTime(order.order_date) },
            { header: 'Toko', value: ({ order }) => order.store?.store_name ?? '-' },
            { header: 'Metode bayar', value: ({ order }) => statusLabel(order.payment_method) },
            { header: 'Menu', value: ({ detail }) => detail.product?.product_name ?? `Produk #${detail.product_id}` },
            { header: 'SKU', value: ({ detail }) => detail.product?.sku ?? '-' },
            { header: 'Satuan', value: ({ detail }) => detail.product?.unit_of_measure ?? '-' },
            { header: 'Qty', value: ({ detail }) => toNumber(detail.quantity), format: 'number' },
            { header: 'Harga satuan', value: ({ detail }) => toNumber(detail.unit_price), format: 'currency' },
            { header: 'Subtotal item', value: ({ detail }) => toNumber(detail.subtotal), format: 'currency' },
            { header: 'Catatan', value: ({ detail }) => detail.notes ?? '' },
          ],
          rows: itemRows,
          emptyMessage: 'Tidak ada item pada order di filter ini.',
        }),
      ]);

      toast.success(`Laporan diunduh: ${exportedOrders.length} transaksi, ${itemRows.length} baris item.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Gagal membuat file XLSX.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <section className="grid gap-5">
      <PageHeader
        title="Laporan Pendapatan"
        description="Rekap omzet dari order berstatus paid, sesuai perhitungan backend."
        actions={
          <Button onClick={() => void handleExport()} loading={exporting} disabled={!exportReady}>
            {!exporting && <FileSpreadsheet className="h-4 w-4" />}
            Export XLSX
          </Button>
        }
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
