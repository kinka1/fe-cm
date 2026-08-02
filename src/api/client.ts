import axios, { AxiosError } from 'axios';
import type { ApiResponse } from '../types/api';

/**
 * Pakai `||`, bukan `??`: bila secret CI tidak ada, Vite menyuntikkan string
 * kosong — dan string kosong lolos dari `??`, membuat semua request jatuh ke
 * domain frontend alih-alih ke API.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() || 'https://api.calon-mantoe.cloud/api';
const TOKEN_KEY = 'pos_token';
const USER_KEY = 'pos_user';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const userStore = {
  get: <T>() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  set: (user: unknown) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clear: () => localStorage.removeItem(USER_KEY),
};

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Token Sanctum bisa dicabut dari backend (logout di device lain, token dihapus).
 * Saat itu terjadi setiap request balas 401; bersihkan sesi lokal supaya app tidak
 * terjebak menampilkan layout admin dengan token mati.
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const isLoginRequest = axios.isAxiosError(error) && Boolean(error.config?.url?.includes('/auth/login'));

    if (status === 401 && !isLoginRequest && tokenStore.get()) {
      tokenStore.clear();
      userStore.clear();
      if (!window.location.pathname.startsWith('/login')) window.location.assign('/login');
    }

    return Promise.reject(error);
  },
);

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiResponse<unknown>>;
    const data = axiosError.response?.data;
    const validation = data?.errors ? Object.values(data.errors).flat().join(', ') : '';
    return validation || data?.message || axiosError.message || 'Request failed';
  }
  return error instanceof Error ? error.message : 'Unexpected error';
}

export { API_BASE_URL };
