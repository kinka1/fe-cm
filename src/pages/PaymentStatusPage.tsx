import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, Coffee, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useParams } from 'react-router-dom';
import { publicApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Button } from '../components/ui';
import { ErrorState, LoadingState } from '../components/states';
import { currency } from '../lib/format';

export function PaymentStatusPage() {
  const { orderNumber = '' } = useParams();

  const status = useQuery({
    queryKey: ['public-payment-status', orderNumber],
    queryFn: () => publicApi.paymentStatus(orderNumber),
    enabled: Boolean(orderNumber),
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 4000;
      if (data.payment_status === 'pending') return 4000;
      return false;
    },
  });

  const payment = status.data;
  const viewState = useMemo(() => {
    if (!payment) return 'loading';
    if (payment.payment_status === 'paid') return 'success';
    if (payment.payment_status === 'cancelled' || payment.order_status === 'cancelled') return 'failed';
    return 'pending';
  }, [payment]);

  return (
    <main className="min-h-screen bg-slate-100 text-[#2E1D19]">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col bg-[#FDFBF7] px-4 py-5 shadow-2xl">
        <header className="mb-5 flex items-center justify-between gap-3">
          <Link to="/u" className="rounded-full bg-white p-2 text-[#4A2C2A] shadow-sm ring-1 ring-[#FAF0E6]">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <div className="mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#4A2C2A] to-[#C8A27B] text-white shadow">
              <Coffee className="h-5 w-5" />
            </div>
            <h1 className="text-sm font-black uppercase tracking-tight text-[#4A2C2A]">Status Pembayaran</h1>
          </div>
          <button
            onClick={() => status.refetch()}
            disabled={status.isFetching}
            className="rounded-full bg-white p-2 text-[#4A2C2A] shadow-sm ring-1 ring-[#FAF0E6] disabled:opacity-50"
            aria-label="Refresh status"
          >
            <RefreshCw className={status.isFetching ? 'h-5 w-5 animate-spin' : 'h-5 w-5'} />
          </button>
        </header>

        {status.isLoading && <LoadingState label="Memuat status pembayaran..." />}
        {status.error && <ErrorState message={getApiError(status.error)} />}

        {payment && (
          <div className="grid flex-1 content-start gap-4">
            <div className="rounded-[28px] border border-[#FAF0E6] bg-white p-5 text-center shadow-sm">
              {viewState === 'pending' && (
                <div className="space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Clock className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-[#4A2C2A]">{payment.payment_status_label ?? 'Menunggu Pembayaran'}</h2>
                    <p className="mt-1 text-xs text-[#7D645E]">Scan QRIS, lalu halaman ini akan mengecek pembayaran otomatis.</p>
                  </div>

                  {payment.qr_string ? (
                    <div className="mx-auto max-w-[230px] rounded-2xl border border-[#EADAC9] bg-slate-50 p-4">
                      <div className="mb-2 inline-block rounded bg-[#122A4E] px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white">QRIS GPN</div>
                      <QRCodeSVG value={payment.qr_string} size={190} marginSize={2} className="mx-auto rounded-lg bg-white" />
                      <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-[#8A6F6A]">{payment.payment_gateway === 'xendit' ? 'Powered by Xendit' : 'QRIS Payment'}</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900">QRIS belum tersedia. Coba refresh status pembayaran.</div>
                  )}
                </div>
              )}

              {viewState === 'success' && (
                <div className="space-y-4 py-3">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-emerald-800">{payment.payment_status_label ?? 'Pembayaran Berhasil'}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-[#7D645E]">{payment.order_status_label ?? 'Pesanan Diproses'}. Terima kasih, pesanan kamu sudah diteruskan ke barista.</p>
                  </div>
                </div>
              )}

              {viewState === 'failed' && (
                <div className="space-y-4 py-3">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-red-600">
                    <AlertCircle className="h-10 w-10" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-red-800">{payment.payment_status_label ?? 'Pembayaran Gagal'}</h2>
                    <p className="mt-1 text-xs leading-relaxed text-[#7D645E]">Pembayaran gagal atau kadaluarsa. Silakan buat pesanan ulang.</p>
                  </div>
                  <Link to="/u">
                    <Button className="w-full rounded-full bg-red-700 hover:bg-red-800">Buat Pesanan Ulang</Button>
                  </Link>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-[#FAF0E6] bg-white p-4 text-xs shadow-sm">
              <div className="flex justify-between gap-3 py-1.5">
                <span className="text-[#8A6F6A]">Nomor Order</span>
                <strong className="text-right text-[#2E1D19]">{payment.order_number}</strong>
              </div>
              <div className="flex justify-between gap-3 py-1.5">
                <span className="text-[#8A6F6A]">Pelanggan</span>
                <strong className="text-right text-[#2E1D19]">{payment.customer_name || '-'}</strong>
              </div>
              <div className="flex justify-between gap-3 py-1.5">
                <span className="text-[#8A6F6A]">Meja</span>
                <strong className="text-right text-[#2E1D19]">{payment.table_label ?? (payment.table_id ? `Meja #${payment.table_id}` : '-')}</strong>
              </div>
              <div className="flex justify-between gap-3 py-1.5">
                <span className="text-[#8A6F6A]">Status Order</span>
                <strong className="text-right text-[#2E1D19]">{payment.order_status_label ?? payment.order_status}</strong>
              </div>
              <div className="mt-2 flex justify-between border-t border-[#FAF0E6] pt-3 text-sm">
                <span className="font-bold text-[#4A2C2A]">Total Tagihan</span>
                <strong className="text-[#4A2C2A]">{currency(payment.total_amount)}</strong>
              </div>
            </div>

            {viewState === 'pending' && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                <p className="font-black">Menunggu pembayaran</p>
                <p className="mt-1 leading-relaxed">Status dicek otomatis setiap 4 detik. Kamu juga bisa menekan tombol refresh di kanan atas.</p>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
