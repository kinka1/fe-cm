import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Edit2, MoreVertical, Plus, Trash2, X } from 'lucide-react';
import { employeesApi, rolesApi, storesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { todayIso as today } from '../lib/date';
import { Badge, Button, Field, Input, Select } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import type { Employee } from '../types/api';

interface EmployeeForm {
  full_name: string;
  email: string;
  username: string;
  password: string;
  password_confirmation: string;
  role_id: number | '';
  store_id: number | '';
  join_date: string;
  status: 'active' | 'inactive';
  ktp: File | null;
  kk: File | null;
}

const blank = (storeId: number | null): EmployeeForm => ({
  full_name: '',
  email: '',
  username: '',
  password: '',
  password_confirmation: '',
  role_id: '',
  store_id: storeId ?? '',
  join_date: today(),
  status: 'active',
  ktp: null,
  kk: null,
});

export function EmployeesPage() {
  const { storeId } = useAuth();
  const [editing, setEditing] = useState<EmployeeForm>(() => blank(storeId));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [accessEmployeeId, setAccessEmployeeId] = useState<number | null>(null);
  const [storeAccessOpen, setStoreAccessOpen] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<number | null>(null);
  const [accessStoreIds, setAccessStoreIds] = useState<number[]>([]);
  const [accessCurrentStoreId, setAccessCurrentStoreId] = useState<number | ''>('');
  const employees = useQuery({ queryKey: ['employees', storeId], queryFn: () => employeesApi.list({ store_id: storeId ?? undefined }) });
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => rolesApi.list() });
  const stores = useQuery({ queryKey: ['stores'], queryFn: () => storesApi.list() });
  const employeeStores = useQuery({
    queryKey: ['employee-store-access', accessEmployeeId],
    queryFn: () => employeesApi.stores(accessEmployeeId as number),
    enabled: Boolean(accessEmployeeId),
  });
  const queryClient = useQueryClient();
  const toast = useToast();

  const roleName = useMemo(() => {
    const map = new Map<number, string>();
    roles.data?.forEach((role) => map.set(role.id, role.role_name));
    return map;
  }, [roles.data]);

  const reset = () => { setEditing(blank(storeId)); setEditingId(null); };

  useEffect(() => {
    if (!employeeStores.data) return;
    const ids = employeeStores.data.stores.map((store) => store.id);
    setAccessStoreIds(ids);
    setAccessCurrentStoreId(employeeStores.data.current_store_id ?? ids[0] ?? '');
  }, [employeeStores.data]);

  const save = useMutation({
    mutationFn: (form: EmployeeForm) => {
      const fd = new FormData();
      fd.append('full_name', form.full_name);
      fd.append('email', form.email);
      if (form.store_id !== '') fd.append('store_id', String(form.store_id));
      if (form.role_id !== '') fd.append('role_id', String(form.role_id));
      fd.append('join_date', form.join_date);
      if (form.ktp) fd.append('ktp', form.ktp);
      if (form.kk) fd.append('kk', form.kk);

      if (editingId) {
        // Update: multipart via POST + _method=PUT. username/password tidak diubah di sini.
        fd.append('_method', 'PUT');
        fd.append('status', form.status);
        return employeesApi.update(editingId, fd);
      }

      fd.append('username', form.username);
      fd.append('password', form.password);
      fd.append('password_confirmation', form.password_confirmation);
      return employeesApi.create(fd);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Karyawan diperbarui' : 'Karyawan ditambahkan');
      reset();
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-store-access'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const remove = useMutation({
    mutationFn: employeesApi.delete,
    onSuccess: () => {
      toast.success('Karyawan dihapus');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const syncStoreAccess = useMutation({
    mutationFn: ({ employeeId, storeIds, currentStoreId }: { employeeId: number; storeIds: number[]; currentStoreId: number | null }) =>
      employeesApi.syncStores(employeeId, { store_ids: storeIds, current_store_id: currentStoreId }),
    onSuccess: (data) => {
      toast.success('Akses store karyawan diperbarui');
      const ids = data.stores.map((store) => store.id);
      setAccessStoreIds(ids);
      setAccessCurrentStoreId(data.current_store_id ?? ids[0] ?? '');
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['employee-store-access', accessEmployeeId] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (editing.store_id === '') { toast.error('Pilih toko/cabang terlebih dahulu.'); return; }
    if (editing.role_id === '') { toast.error('Pilih role terlebih dahulu.'); return; }
    if (!editingId) {
      if (!editing.ktp || !editing.kk) { toast.error('Foto KTP dan KK wajib diunggah saat membuat karyawan baru.'); return; }
      if (editing.password !== editing.password_confirmation) { toast.error('Konfirmasi password tidak cocok.'); return; }
      if (editing.password.length < 8) { toast.error('Password minimal 8 karakter.'); return; }
    }
    save.mutate(editing);
  };

  const startEdit = (employee: Employee) => {
    setActionMenuId(null);
    setEditing({
      full_name: employee.full_name,
      email: employee.email,
      username: '',
      password: '',
      password_confirmation: '',
      role_id: employee.role_id ?? '',
      store_id: employee.store_id ?? storeId ?? '',
      join_date: employee.join_date ?? today(),
      status: employee.status,
      ktp: null,
      kk: null,
    });
    setEditingId(employee.id);
  };

  const startStoreAccess = (employee: Employee) => {
    setActionMenuId(null);
    setAccessEmployeeId(employee.id);
    setStoreAccessOpen(true);
    setAccessStoreIds([]);
    setAccessCurrentStoreId('');
    queryClient.invalidateQueries({ queryKey: ['employee-store-access', employee.id] });
  };

  const closeStoreAccess = () => {
    if (syncStoreAccess.isPending) return;
    setStoreAccessOpen(false);
    setAccessEmployeeId(null);
    setAccessStoreIds([]);
    setAccessCurrentStoreId('');
  };

  const toggleStoreAccess = (targetStoreId: number) => {
    setAccessStoreIds((current) => {
      const next = current.includes(targetStoreId) ? current.filter((id) => id !== targetStoreId) : [...current, targetStoreId];
      setAccessCurrentStoreId((currentStoreId) => {
        if (next.length === 0) return '';
        if (currentStoreId && next.includes(currentStoreId)) return currentStoreId;
        return next[0];
      });
      return next;
    });
  };

  const saveStoreAccess = () => {
    if (!accessEmployeeId) return;
    syncStoreAccess.mutate({
      employeeId: accessEmployeeId,
      storeIds: accessStoreIds,
      currentStoreId: accessCurrentStoreId === '' ? null : accessCurrentStoreId,
    });
  };

  const deleteEmployee = (employeeId: number) => {
    setActionMenuId(null);
    remove.mutate(employeeId);
  };

  const selectedAccessEmployee = employees.data?.data.find((employee) => employee.id === accessEmployeeId);
  const availableDefaultStores = stores.data?.filter((store) => accessStoreIds.includes(store.id)) ?? [];

  return (
    <section className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="order-2 grid min-w-0 gap-4 xl:order-1">
        <div>
          <h1 className="text-xl font-bold text-ink sm:text-2xl">Employees</h1>
          <p className="text-sm text-muted">Admin dapat menambah, mengedit, dan menghapus karyawan sesuai role.</p>
        </div>
        {employees.isLoading && <LoadingState />}
        {employees.error && <ErrorState message={getApiError(employees.error)} />}
        {!employees.isLoading && employees.data?.data.length === 0 && <EmptyState title="Employee kosong" />}
        <div className="overflow-hidden rounded-card border border-line bg-card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-subtle text-xs uppercase text-muted">
                <tr>
                  <th className="px-4 py-3">Nama</th>
                  <th className="px-4 py-3">Username</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Active Store</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {employees.data?.data.map((employee) => (
                  <tr key={employee.id} className="border-t border-line">
                    <td className="px-4 py-3 font-semibold">{employee.full_name}</td>
                    <td className="px-4 py-3">{employee.username}</td>
                    <td className="px-4 py-3">{employee.role?.role_name ?? roleName.get(employee.role_id) ?? `Role #${employee.role_id}`}</td>
                    <td className="px-4 py-3">{employee.current_store_name}</td>
                    <td className="px-4 py-3"><Badge tone={employee.status === 'active' ? 'green' : 'slate'}>{employee.status}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="relative inline-flex justify-end">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setActionMenuId((current) => (current === employee.id ? null : employee.id))}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        {actionMenuId === employee.id && (
                          <div className="absolute right-0 top-10 z-20 w-40 overflow-hidden rounded-md border border-line bg-card py-1 text-left shadow-card">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-subtle"
                              onClick={() => startEdit(employee)}
                            >
                              <Edit2 className="h-4 w-4" />Edit
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-subtle"
                              onClick={() => startStoreAccess(employee)}
                            >
                              <Building2 className="h-4 w-4" />Store
                            </button>
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                              onClick={() => deleteEmployee(employee.id)}
                            >
                              <Trash2 className="h-4 w-4" />Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <aside className="order-1 rounded-card border border-line bg-card p-4 shadow-card xl:order-2 xl:sticky xl:top-4 h-fit">
        <h2 className="mb-4 text-lg font-bold">{editingId ? 'Edit Employee' : 'Create Employee'}</h2>
        <form onSubmit={submit} className="grid gap-3">
          <Field label="Nama lengkap"><Input value={editing.full_name} onChange={(event) => setEditing({ ...editing, full_name: event.target.value })} required /></Field>
          <Field label="Email"><Input type="email" value={editing.email} onChange={(event) => setEditing({ ...editing, email: event.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <Select value={editing.role_id} onChange={(event) => setEditing({ ...editing, role_id: event.target.value === '' ? '' : Number(event.target.value) })} required>
                <option value="">Pilih role</option>
                {roles.data?.map((role) => <option key={role.id} value={role.id}>{role.role_name}</option>)}
              </Select>
            </Field>
            <Field label="Toko/Cabang">
              <Select value={editing.store_id} onChange={(event) => setEditing({ ...editing, store_id: event.target.value === '' ? '' : Number(event.target.value) })} required>
                <option value="">Pilih toko</option>
                {stores.data?.map((store) => <option key={store.id} value={store.id}>{store.store_name}</option>)}
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Join date"><Input type="date" value={editing.join_date} onChange={(event) => setEditing({ ...editing, join_date: event.target.value })} required /></Field>
            {editingId && (
              <Field label="Status">
                <Select value={editing.status} onChange={(event) => setEditing({ ...editing, status: event.target.value as 'active' | 'inactive' })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </Select>
              </Field>
            )}
          </div>

          {!editingId && (
            <>
              <Field label="Username"><Input value={editing.username} onChange={(event) => setEditing({ ...editing, username: event.target.value })} required /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Password"><Input type="password" value={editing.password} onChange={(event) => setEditing({ ...editing, password: event.target.value })} required minLength={8} /></Field>
                <Field label="Konfirmasi password"><Input type="password" value={editing.password_confirmation} onChange={(event) => setEditing({ ...editing, password_confirmation: event.target.value })} required minLength={8} /></Field>
              </div>
            </>
          )}

          <Field label={editingId ? 'Foto KTP (opsional, ganti)' : 'Foto KTP'}>
            <Input type="file" accept="image/jpeg,image/jpg,image/png" onChange={(event) => setEditing({ ...editing, ktp: event.target.files?.[0] ?? null })} required={!editingId} />
          </Field>
          <Field label={editingId ? 'Foto KK (opsional, ganti)' : 'Foto KK'}>
            <Input type="file" accept="image/jpeg,image/jpg,image/png" onChange={(event) => setEditing({ ...editing, kk: event.target.files?.[0] ?? null })} required={!editingId} />
          </Field>

          <div className="flex gap-2">
            <Button disabled={save.isPending}><Plus className="h-4 w-4" />Save</Button>
            <Button type="button" variant="secondary" onClick={reset}>Reset</Button>
          </div>
          {editingId && <p className="text-xs text-muted">Username & password tidak dapat diubah dari form ini (backend tidak menyediakan endpoint-nya).</p>}
        </form>
      </aside>

      {storeAccessOpen && accessEmployeeId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-card border border-line bg-card p-5 shadow-card">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-ink">Store Access</h2>
                <p className="text-sm text-muted">{employeeStores.data?.full_name ?? selectedAccessEmployee?.full_name ?? `Employee #${accessEmployeeId}`}</p>
              </div>
              <button className="rounded-md p-1 text-muted hover:bg-subtle" onClick={closeStoreAccess} aria-label="Tutup modal store access">
                <X className="h-5 w-5" />
              </button>
            </div>

            {employeeStores.isLoading && <LoadingState label="Memuat akses store..." />}
            {employeeStores.error && <ErrorState message={getApiError(employeeStores.error)} />}

            {!employeeStores.isLoading && !employeeStores.error && (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <p className="text-sm font-semibold text-ink">Store Access</p>
                  {stores.data?.map((store) => (
                    <label key={store.id} className="flex items-start gap-3 rounded-md border border-line p-3 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 rounded border-line"
                        checked={accessStoreIds.includes(store.id)}
                        onChange={() => toggleStoreAccess(store.id)}
                      />
                      <span className="min-w-0">
                        <span className="block font-semibold text-ink">{store.store_name}</span>
                        <span className="block text-xs text-muted">{store.code}</span>
                      </span>
                    </label>
                  ))}
                </div>

                <Field label="Default Active Store">
                  <Select
                    value={accessCurrentStoreId}
                    disabled={accessStoreIds.length === 0}
                    onChange={(event) => setAccessCurrentStoreId(event.target.value === '' ? '' : Number(event.target.value))}
                  >
                    <option value="">Tidak ada default</option>
                    {availableDefaultStores.map((store) => (
                      <option key={store.id} value={store.id}>{store.store_name}</option>
                    ))}
                  </Select>
                </Field>

                <p className="text-xs text-muted">Jika semua store tidak dicentang, akses toko employee akan dicabut.</p>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="secondary" onClick={closeStoreAccess} disabled={syncStoreAccess.isPending}>Batal</Button>
                  <Button type="button" onClick={saveStoreAccess} loading={syncStoreAccess.isPending}>Save Store Access</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
