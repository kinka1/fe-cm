/**
 * Utilitas tanggal untuk input `<input type="date">` dan filter laporan.
 *
 * Sengaja tidak memakai `toISOString()`: metode itu mengonversi ke UTC, sehingga
 * di zona WIB (UTC+7) tanggal sebelum pukul 07:00 pagi akan mundur satu hari —
 * laporan "hari ini" jadi menampilkan data kemarin.
 */

/** Format Date lokal menjadi `YYYY-MM-DD`. */
export function toDateInput(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${date.getFullYear()}-${month}-${day}`;
}

/** Tanggal hari ini menurut waktu perangkat kasir. */
export function todayIso(): string {
  return toDateInput(new Date());
}

/** Jam lokal `HHmmss`; membedakan nama file export yang periodenya sama. */
export function clockStamp(date: Date): string {
  const pad = (value: number) => `${value}`.padStart(2, '0');

  return `${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/** Tanggal 1 pada bulan berjalan; dipakai sebagai awal periode laporan. */
export function firstDayOfMonthIso(): string {
  const now = new Date();

  return toDateInput(new Date(now.getFullYear(), now.getMonth(), 1));
}
