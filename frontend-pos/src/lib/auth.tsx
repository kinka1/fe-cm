import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/endpoints';
import { getApiError, tokenStore, userStore } from '../api/client';
import type { User } from '../types/api';
import { useToast } from './toast';

export type AppRole = 'admin' | 'kasir' | 'user';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  role: AppRole;
  isAuthenticated: boolean;
  login: (payload: { username: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  canAccess: (roles: AppRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const roleIdMap: Record<number, AppRole> = {
  1: 'admin',
  2: 'kasir',
  3: 'user',
};

function normalizeRoleName(value: unknown): AppRole | null {
  if (typeof value !== 'string') return null;
  const role = value.toLowerCase().trim();
  if (['admin', 'administrator', 'owner', 'manager'].includes(role)) return 'admin';
  if (['kasir', 'cashier', 'operator'].includes(role)) return 'kasir';
  if (['user', 'customer', 'pelanggan'].includes(role)) return 'user';
  return null;
}

export function getUserRole(user: User | null): AppRole {
  if (!user) return 'user';

  const directRole = normalizeRoleName(user.role) ?? normalizeRoleName(user.role_name);
  if (directRole) return directRole;

  if (typeof user.role === 'object' && user.role) {
    const nestedRole = normalizeRoleName(user.role.name) ?? normalizeRoleName(user.role.role_name);
    if (nestedRole) return nestedRole;
  }

  const roleId = user.role_id ?? user.employee?.role_id;
  if (typeof roleId === 'number' && roleIdMap[roleId]) return roleIdMap[roleId];

  return user.employee_id ? 'kasir' : 'user';
}

export function getRoleHome(role: AppRole) {
  if (role === 'admin') return '/';
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

  const role = getUserRole(user);

  const canAccess = useCallback((roles: AppRole[]) => roles.includes(role), [role]);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    role,
    isAuthenticated: Boolean(token),
    login,
    logout,
    canAccess,
  }), [user, token, role, login, logout, canAccess]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}