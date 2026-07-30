import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { DoorOpen, DoorClosed, ArrowDownCircle, ArrowUpCircle, RefreshCw, Wallet } from 'lucide-react';
import { cashierSessionsApi, storesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Field, Input, Select, Textarea } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { currency, dateTime } from '../lib/format';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import type { CashMovementType } from '../types/api';

export function CashierSessionPage() {
  const { storeId } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [openStoreId, setOpenStoreId] = useState<number | ''>(storeId ?? '');
  const [openingCash, setOpeningCash] = useState('0');
  const [openingNotes, setOpeningNotes] = useState('');

  const [closingCash, setClosingCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');

  const [moveType, setMoveType] = useState<CashMovementType>('cash_in');
  const [moveAmount, setMoveAmount] = useState('');
  const [moveCategory, setMoveCategory] = useState('');
  const [moveDescription, setMoveDescription] = useState('');

  const current = useQuery({ queryKey: ['cashier-session-current'], queryFn: () => cashierSessionsApi.current() });
  const stores = useQuery({ queryKey: ['stores'], queryFn: () => storesApi.list() });

  const sessionId = current.data?.id ?? null;

  const summary = useQuery({
    queryKey: ['cashier-session-summary', sessionId],
    queryFn: () => cashierSessionsApi.summary(sessionId as number),
    enabled: sessionId !== null,
  });

  const movements = useQuery({
    queryKey: ['cashier-session-movements', sessionId],
    queryFn: () => cashierSessionsApi.cashMovements(sessionId as number, { per_page: 50 }),
    enabled: sessionId !== null,
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['cashier-session-current'] });
    queryClient.invalidateQueries({ queryKey: ['cashier-session-summary'] });
    queryClient.invalidateQueries({ queryKey: ['cashier-session-movements'] });
  };

  const openMutation = useMutation({
    mutationFn: () => {
      if (openStoreId === '') throw new Error('Pilih toko/cabang terlebih dahulu.');
      return cashierSessionsApi.open({ store_id: Number(openStoreId), opening_cash: Number(openingCash || 0), opening_notes: openingNotes || null });
    },
    onSuccess: () => {
      toast.success('Sesi kasir dibuka');
      setOpeningCash('0'); setOpeningNotes('');
      refreshAll();
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const closeMutation = useMutation({
    mutationFn: () => {
      if (sessionId === null) throw new Error('Tidak ada sesi kasir terbuka.');
      return cashierSessionsApi.close(sessionId, { closing_cash: Number(closingCash || 0), closing_notes: closingNotes || null });
    },
    onSuccess: () => {
      toast.success('Sesi kasir ditutup');
      setClosingCash(''); setClosingNotes('');
      refreshAll();
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const moveMutation = useMutation({
    mutationFn: () => {
      if (sessionId === null) throw new Error('Tidak ada sesi kasir terbuka.');
      return cashierSessionsApi.addCashMovement(sessionId, { type: moveType, amount: Number(moveAmount || 0), category: moveCategory || null, description: moveDescription || null });
    },
    onSuccess: () => {
      toast.success('Pergerakan kas dicatat');
      setMoveAmount(''); setMoveCategory(''); setMoveDescription('');
      refreshAll();
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  if (current.isLoading) return <LoadingState label="Memeriksa sesi kasir..." />;

  const session = current.data;

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Cashier Session</h1>
            <p className="text-sm text-muted">Buka & tutup kas, catat pergerakan kas, dan lihat ringkasan sesi berjalan.</p>
          </div>
          <Button variant="secondary" onClick={refreshAll}><RefreshCw className="h-4 w-4" />Refresh</Button>
        </div>

        {current.error && <ErrorState message={getApiError(current.error)} />}

        {!session && !current.error && (
          <EmptyState title="Tidak ada sesi kasir terbuka" description="Buka sesi kasir lewat form di samping untuk mulai transaksi." />
        )}

        {session && (
          <>
            <div className="rounded-md border border-line bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-brand" />
                    <h2 className="text-lg font-bold">{session.store?.store_name ?? `Store #${session.store_id}`}</h2>
                    <Badge tone={session.status === 'open' ? 'green' : 'slate'}>{session.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">Dibuka {dateTime(session.opened_at)} oleh {session.employee?.full_name ?? `Employee #${session.employee_id}`}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-muted">Kas awal</p>
                  <p className="text-xl font-bold">{currency(session.opening_cash)}</p>
                </div>
              </div>

              {summary.data && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <SummaryCard label="Penjualan cash" value={currency(summary.data.cash_sales)} />
                  <SummaryCard label="Penjualan QRIS" value={currency(summary.data.qris_sales)} />
                  <SummaryCard label="Total order (paid)" value={String(summary.data.total_orders)} />
                  <SummaryCard label="Kas masuk (manual)" value={currency(summary.data.cash_in)} />
                  <SummaryCard label="Kas keluar (manual)" value={currency(summary.data.cash_out)} />
                  <SummaryCard label="Perkiraan kas akhir" value={currency(summary.data.expected_cash)} highlight />
                </div>
              )}
            </div>

            <div className="rounded-md border border-line bg-white p-4 shadow-sm">
              <h2 className="mb-3 font-bold text-lg">Riwayat Pergerakan Kas</h2>
              {movements.isLoading && <LoadingState />}
              {movements.error && <ErrorState message={getApiError(movements.error)} />}
              {!movements.isLoading && (movements.data?.data.length ?? 0) === 0 && <EmptyState title="Belum ada pergerakan kas" />}
              {!movements.isLoading && (movements.data?.data.length ?? 0) > 0 && (
                <div className="grid gap-2">
                  {movements.data?.data.map((mv) => (
                    <div key={mv.id} className="flex items-center justify-between gap-3 rounded-md border border-line p-3 text-sm">
                      <div className="flex items-center gap-2">
                        {mv.type === 'cash_in' ? <ArrowDownCircle className="h-4 w-4 text-emerald-600" /> : <ArrowUpCircle className="h-4 w-4 text-red-600" />}
                        <div>
                          <p className="font-semibold">{mv.category || (mv.type === 'cash_in' ? 'Kas masuk' : 'Kas keluar')}</p>
                          <p className="text-xs text-muted">{mv.description || '-'} · {dateTime(mv.created_at)}</p>
                        </div>
                      </div>
                      <strong className={mv.type === 'cash_in' ? 'text-emerald-700' : 'text-red-600'}>
                        {mv.type === 'cash_in' ? '+' : '-'}{currency(mv.amount)}
                      </strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <aside className="grid content-start gap-4 xl:sticky xl:top-20 xl:self-start">
        {!session ? (
          <div className="rounded-md border border-line bg-white p-4 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><DoorOpen className="h-5 w-5 text-emerald-600" />Buka Sesi Kasir</h2>
            <form onSubmit={(e) => { e.preventDefault(); openMutation.mutate(); }} className="grid gap-3">
              <Field label="Toko/Cabang">
                <Select value={openStoreId} onChange={(e) => setOpenStoreId(e.target.value === '' ? '' : Number(e.target.value))} required>
                  <option value="">Pilih toko</option>
                  {stores.data?.map((store) => <option key={store.id} value={store.id}>{store.store_name}</option>)}
                </Select>
              </Field>
              <Field label="Kas awal"><Input type="number" min="0" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} required /></Field>
              <Field label="Catatan (opsional)"><Textarea value={openingNotes} onChange={(e) => setOpeningNotes(e.target.value)} /></Field>
              <Button disabled={openMutation.isPending}><DoorOpen className="h-4 w-4" />Buka Sesi</Button>
            </form>
          </div>
        ) : (
          <>
            <div className="rounded-md border border-line bg-white p-4 shadow-sm">
              <h2 className="mb-4 font-bold text-lg">Catat Pergerakan Kas</h2>
              <form onSubmit={(e) => { e.preventDefault(); moveMutation.mutate(); }} className="grid gap-3">
                <Field label="Tipe">
                  <Select value={moveType} onChange={(e) => setMoveType(e.target.value as CashMovementType)}>
                    <option value="cash_in">Kas masuk (cash in)</option>
                    <option value="cash_out">Kas keluar (cash out)</option>
                  </Select>
                </Field>
                <Field label="Jumlah"><Input type="number" min="0" step="0.01" value={moveAmount} onChange={(e) => setMoveAmount(e.target.value)} required /></Field>
                <Field label="Kategori (opsional)"><Input value={moveCategory} onChange={(e) => setMoveCategory(e.target.value)} placeholder="mis. setoran, pengeluaran ops" /></Field>
                <Field label="Deskripsi (opsional)"><Textarea value={moveDescription} onChange={(e) => setMoveDescription(e.target.value)} /></Field>
                <Button disabled={moveMutation.isPending}>Catat</Button>
              </form>
            </div>

            <div className="rounded-md border border-line bg-white p-4 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold"><DoorClosed className="h-5 w-5 text-red-600" />Tutup Sesi Kasir</h2>
              <form onSubmit={(e) => { e.preventDefault(); closeMutation.mutate(); }} className="grid gap-3">
                {summary.data && (
                  <div className="rounded-md bg-slate-50 p-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted">Perkiraan kas akhir</span><strong>{currency(summary.data.expected_cash)}</strong></div>
                    {closingCash !== '' && (
                      <div className="mt-1 flex justify-between"><span className="text-muted">Selisih</span><strong>{currency(Number(closingCash) - Number(summary.data.expected_cash))}</strong></div>
                    )}
                  </div>
                )}
                <Field label="Kas aktual saat tutup"><Input type="number" min="0" value={closingCash} onChange={(e) => setClosingCash(e.target.value)} required /></Field>
                <Field label="Catatan (opsional)"><Textarea value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} /></Field>
                <Button variant="danger" disabled={closeMutation.isPending}><DoorClosed className="h-4 w-4" />Tutup Sesi</Button>
              </form>
            </div>
          </>
        )}
      </aside>
    </section>
  );
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border p-3 text-center ${highlight ? 'border-brand/40 bg-teal-50' : 'border-line bg-slate-50'}`}>
      <span className="block text-xs uppercase font-semibold text-muted">{label}</span>
      <span className={`mt-0.5 block text-lg font-bold ${highlight ? 'text-brand' : 'text-ink'}`}>{value}</span>
    </div>
  );
}
