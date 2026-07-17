export const toNumber = (value: number | string | null | undefined) => Number(value ?? 0);

export const currency = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(toNumber(value));

export const decimal = (value: number | string | null | undefined) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(toNumber(value));

export const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-';

export const statusLabel = (value?: string | null) => value ? value.replaceAll('_', ' ') : '-';
