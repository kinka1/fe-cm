/**
 * Helper export XLSX.
 *
 * Halaman cukup mendeskripsikan kolom (header + cara mengambil nilai + format),
 * lalu memanggil `downloadXlsx`. Angka sengaja ditulis sebagai angka asli — bukan
 * string hasil `currency()` — supaya masih bisa dijumlah/di-pivot di Excel; tampilan
 * Rupiah diatur lewat number format sel.
 */
import * as XLSX from '@e965/xlsx';

export type CellFormat = 'text' | 'number' | 'currency';

export type CellValue = string | number | null | undefined;

export interface SheetColumn<T> {
  header: string;
  value: (row: T) => CellValue;
  format?: CellFormat;
  width?: number;
}

export interface SheetSpec<T> {
  name: string;
  title?: string;
  meta?: string[];
  columns: Array<SheetColumn<T>>;
  rows: T[];
  emptyMessage?: string;
}

export interface PreparedSheet {
  name: string;
  build: () => XLSX.WorkSheet;
}

const NUMBER_FORMAT: Record<Exclude<CellFormat, 'text'>, string> = {
  number: '#,##0.##',
  currency: '"Rp"#,##0',
};

const INVALID_SHEET_CHARS = /[\\/?*[\]:]/g;
const MAX_SHEET_NAME = 31;

function safeSheetName(name: string, used: Set<string>): string {
  const base = name.replace(INVALID_SHEET_CHARS, ' ').trim().slice(0, MAX_SHEET_NAME) || 'Sheet';
  let candidate = base;
  let counter = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${counter})`;
    candidate = base.slice(0, MAX_SHEET_NAME - suffix.length) + suffix;
    counter += 1;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function numberWidth(value: number, format?: CellFormat): number {
  const digits = Math.abs(Math.trunc(value)).toString().length;
  return digits + Math.floor((digits - 1) / 3) + (format === 'currency' ? 3 : 0) + (value < 0 ? 1 : 0);
}

function autoWidth<T>(column: SheetColumn<T>, rows: T[]): number {
  let widest = column.header.length;
  for (const row of rows) {
    const value = column.value(row);
    if (value === null || value === undefined) continue;
    const width = typeof value === 'number' ? numberWidth(value, column.format) : String(value).length;
    if (width > widest) widest = width;
  }
  return Math.min(44, Math.max(12, widest + 2));
}

function buildSheet<T>(spec: SheetSpec<T>): XLSX.WorkSheet {
  const heading: CellValue[][] = [];
  if (spec.title) heading.push([spec.title]);
  for (const line of spec.meta ?? []) heading.push([line]);
  if (heading.length > 0) heading.push([]);

  const headerRow = heading.length;
  const matrix: CellValue[][] = [...heading, spec.columns.map((column) => column.header)];

  if (spec.rows.length === 0) {
    matrix.push([spec.emptyMessage ?? 'Tidak ada data pada filter ini.']);
  } else {
    for (const row of spec.rows) {
      matrix.push(spec.columns.map((column) => column.value(row) ?? ''));
    }
  }

  const sheet = XLSX.utils.aoa_to_sheet(matrix);

  spec.columns.forEach((column, columnIndex) => {
    if (!column.format || column.format === 'text') return;
    const numberFormat = NUMBER_FORMAT[column.format];
    for (let index = 0; index < spec.rows.length; index += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: headerRow + 1 + index, c: columnIndex })] as XLSX.CellObject | undefined;
      if (cell?.t === 'n') cell.z = numberFormat;
    }
  });

  sheet['!cols'] = spec.columns.map((column) => ({ wch: column.width ?? autoWidth(column, spec.rows) }));
  return sheet;
}

export function sheet<T>(spec: SheetSpec<T>): PreparedSheet {
  return { name: spec.name, build: () => buildSheet(spec) };
}

export function downloadXlsx(fileName: string, sheets: Array<PreparedSheet | false | null | undefined>): void {
  const prepared = sheets.filter((item): item is PreparedSheet => Boolean(item));
  if (prepared.length === 0) throw new Error('Tidak ada data yang bisa diexport.');

  const book = XLSX.utils.book_new();
  const used = new Set<string>();
  for (const item of prepared) {
    XLSX.utils.book_append_sheet(book, item.build(), safeSheetName(item.name, used));
  }

  XLSX.writeFile(book, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`, { compression: true });
}
