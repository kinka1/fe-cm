import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Trash2 } from 'lucide-react';
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
  const employees = useQuery({ queryKey: ['employees'], queryFn: () => employeesApi.list() });
  const roles = useQuery({ queryKey: ['roles'], queryFn: () => rolesApi.list() });
  const stores = useQuery({ queryKey: ['stores'], queryFn: () => storesApi.list() });
  const queryClient = useQueryClient();
  const toast = useToast();

  const roleName = useMemo(() => {
    const map = new Map<number, string>();
    roles.data?.forEach((role) => map.set(role.id, role.role_name));
    return map;
  }, [roles.data]);

  const reset = () => { setEditing(blank(storeId)); setEditingId(null); };

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
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {employees.data?.data.map((employee) => (
                  <tr key={employee.id} className="border-t border-line">
                    <td className="px-4 py-3 font-semibold">{employee.full_name}</td>
                    <td className="px-4 py-3">{employee.email}</td>
                    <td className="px-4 py-3">{employee.role?.role_name ?? roleName.get(employee.role_id) ?? `Role #${employee.role_id}`}</td>
                    <td className="px-4 py-3"><Badge tone={employee.status === 'active' ? 'green' : 'slate'}>{employee.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="secondary" onClick={() => startEdit(employee)}><Edit2 className="h-4 w-4" />Edit</Button>
                        <Button variant="danger" onClick={() => remove.mutate(employee.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <aside className="order-1 xl:order-2 rounded-card border border-line bg-card p-4 shadow-card xl:sticky xl:top-4 h-fit">
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
    </section>
  );
}
