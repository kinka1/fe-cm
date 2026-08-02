import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/endpoints';
import { getApiError, tokenStore, userStore } from '../api/client';
import type { Store, User } from '../types/api';
import { useToast } from './toast';

export type AppRole = 'admin' | 'supervisor' | 'kasir' | 'user';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  role: AppRole;
  storeId: number | null;
  /** Toko yang boleh diakses user (pivot employee_store di backend). */
  stores: Store[];
  isAuthenticated: boolean;
  login: (payload: { username: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  canAccess: (roles: AppRole[]) => boolean;
  /** Ganti toko aktif (POST /me/current-store) lalu segarkan seluruh query. */
  setCurrentStore: (storeId: number) => Promise<void>;
  switchingStore: boolean;
}

/** store aktif user: current_store_id lalu fallback ke employee.store_id. */
export function getUserStoreId(user: User | null): number | null {
  return user?.current_store_id ?? user?.employee?.store_id ?? null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Backend RoleSeeder membuat role berurutan: operator (id 1), supervisor (id 2), admin (id 3).
const roleIdMap: Record<number, AppRole> = {
  1: 'kasir',
  2: 'supervisor',
  3: 'admin',
};

function normalizeRoleName(value: unknown): AppRole | null {
  if (typeof value !== 'string') return null;
  const role = value.toLowerCase().trim();
  if (['admin', 'administrator', 'owner', 'manager'].includes(role)) return 'admin';
  if (['supervisor', 'spv'].includes(role)) return 'supervisor';
  if (['kasir', 'cashier', 'operator'].includes(role)) return 'kasir';
  if (['user', 'customer', 'pelanggan'].includes(role)) return 'user';
  return null;
}

export function getUserRole(user: User | null): AppRole {
  if (!user) return 'user';

  // 1. Nested employee.role (backend Laravel: user.employee.role.role_name)
  const employeeRole = user.employee?.role;
  if (employeeRole && typeof employeeRole === 'object') {
    const nested = normalizeRoleName(employeeRole.role_name) ?? normalizeRoleName(employeeRole.name);
    if (nested) return nested;
  }

  // 2. Direct role string / role_name on user
  const directRole = normalizeRoleName(user.role) ?? normalizeRoleName(user.role_name);
  if (directRole) return directRole;

  // 3. Nested user.role object
  if (typeof user.role === 'object' && user.role) {
    const nestedRole = normalizeRoleName(user.role.name) ?? normalizeRoleName(user.role.role_name);
    if (nestedRole) return nestedRole;
  }

  // 4. Fallback ke role_id (best-effort; backend seeder tidak menjamin urutan id)
  const roleId = user.role_id ?? user.employee?.role_id;
  if (typeof roleId === 'number' && roleIdMap[roleId]) return roleIdMap[roleId];

  return user.employee_id ? 'kasir' : 'user';
}

export function getRoleHome(role: AppRole) {
  if (role === 'admin') return '/';
  if (role === 'supervisor') return '/employees';
  if (role === 'kasir') return '/pos';
  return '/u';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => tokenStore.get());
  const [user, setUser] = useState<User | null>(() => userStore.get<User>());
  const queryClient = useQueryClient();
  const toast = useToast();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ token: nextToken, user: nextUser }) => {
      tokenStore.set(nextToken);
      userStore.set(nextUser);
      setToken(nextToken);
      setUser(nextUser);
      queryClient.setQueryData(['me'], nextUser);
      toast.success('Login berhasil');
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const logout = useCallback(async () => {
    try {
      if (tokenStore.get()) await authApi.logout();
    } catch {
      // Logout lokal tetap dilakukan bila token sudah tidak valid di backend.
    } finally {
      tokenStore.clear();
      userStore.clear();
      setToken(null);
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  const login = useCallback(async (payload: { username: string; password: string }) => {
    const result = await loginMutation.mutateAsync(payload);
    return result.user;
  }, [loginMutation]);

  /**
   * User di localStorage adalah snapshot saat login: role, employee, atau toko
   * aktif bisa sudah berubah di backend. Ambil ulang /me tiap app dimuat supaya
   * gating role dan store_id tidak memakai data basi. Cache-nya sekalian jadi
   * sumber kebenaran user, jadi tidak perlu disalin balik ke state.
   */
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const me = await authApi.me();
      userStore.set(me);
      return me;
    },
    enabled: Boolean(token),
    staleTime: 60_000,
  });

  const storesQuery = useQuery({
    queryKey: ['me', 'stores'],
    queryFn: authApi.stores,
    enabled: Boolean(token),
  });

  const switchStore = useMutation({
    mutationFn: authApi.updateCurrentStore,
    onSuccess: (nextUser) => {
      userStore.set(nextUser);
      setUser(nextUser);
      queryClient.setQueryData(['me'], nextUser);
      toast.success(`Toko aktif: ${nextUser.current_store?.store_name ?? nextUser.current_store_id}`);
      // Hampir semua query di-scope per toko, jadi semuanya harus diambil ulang.
      queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const setCurrentStore = useCallback(async (nextStoreId: number) => {
    await switchStore.mutateAsync(nextStoreId);
  }, [switchStore]);

  // Snapshot localStorage dipakai sampai /me selesai supaya tidak ada flicker logout.
  const currentUser = meQuery.data ?? user;
  const role = getUserRole(currentUser);
  const storeId = currentUser?.current_store_id ?? currentUser?.employee?.store_id ?? null;
  const stores = useMemo(() => storesQuery.data ?? [], [storesQuery.data]);

  const canAccess = useCallback((roles: AppRole[]) => roles.includes(role), [role]);

  const value = useMemo<AuthContextValue>(() => ({
    user: currentUser,
    token,
    role,
    storeId,
    stores,
    isAuthenticated: Boolean(token),
    login,
    logout,
    canAccess,
    setCurrentStore,
    switchingStore: switchStore.isPending,
  }), [currentUser, token, role, storeId, stores, login, logout, canAccess, setCurrentStore, switchStore.isPending]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}