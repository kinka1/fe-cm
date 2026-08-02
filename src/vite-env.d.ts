/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL API backend, termasuk akhiran `/api`
   * (contoh: `https://api.calon-mantoe.cloud/api`).
   *
   * Nama variabel ini harus sama persis di `.env` maupun di secret GitHub
   * Actions; kalau berbeda, Vite menyuntikkan nilai kosong saat build.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
