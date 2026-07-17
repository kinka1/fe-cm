import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, Trash2 } from 'lucide-react';
import { employeesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Badge, Button, Field, Input, Select } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';
import type { Employee } from '../types/api';

type EmployeeForm = Partial<Employee> & { password?: string };

const blank: EmployeeForm = {
  full_name: '',
  email: '',
  role_id: 2,
  status: 'active',
  password: '',
};

const roleName: Record<number, string> = {
  1: 'Admin',
  2: 'Kasir',
  3: 'User',
};

export function EmployeesPage() {
  const [editing, setEditing] = useState<EmployeeForm>(blank);
  const [editingId, setEditingId] = useState<number | null>(null);
  const employees = useQuery({ queryKey: ['employees'], queryFn: () => employeesApi.list() });
  const queryClient = useQueryClient();
  const toast = useToast();

  const save = useMutation({
    mutationFn: (payload: EmployeeForm) => {
      const cleaned = { ...payload };
      if (!cleaned.password) delete cleaned.password;
      return editingId ? employeesApi.update(editingId, cleaned) : employeesApi.create(cleaned);
    },
    onSuccess: () => {
      toast.success(editingId ? 'Karyawan diperbarui' : 'Karyawan ditambahkan');
      setEditing(blank);
      setEditingId(null);
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
    save.mutate(editing);
  };

  const startEdit = (employee: Employee) => {
    setEditing({ ...employee, password: '' });
    setEditingId(employee.id);
  };

  return (
    <section className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="grid gap-4">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-sm text-muted">Admin dapat menambah, mengedit, dan menghapus karyawan sesuai role.</p>
        </div>
        {employees.isLoading && <LoadingState />}
        {employees.error && <ErrorState message={getApiError(employees.error)} />}
        {!employees.isLoading && employees.data?.data.length === 0 && <EmptyState title="Employee kosong" />}
        <div className="overflow-hidden rounded-md border border-line bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-muted">
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
                    <td className="px-4 py-3">{roleName[employee.role_id] ?? `Role #${employee.role_id}`}</td>
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

      <aside className="rounded-md border border-line bg-white p-4 shadow-sm xl:sticky xl:top-20">
        <h2 className="mb-4 text-lg font-bold">{editingId ? 'Edit Employee' : 'Create Employee'}</h2>
        <form onSubmit={submit} className="grid gap-3">
          <Field label="Nama lengkap"><Input value={editing.full_name ?? ''} onChange={(event) => setEditing({ ...editing, full_name: event.target.value })} required /></Field>
          <Field label="Email"><Input type="email" value={editing.email ?? ''} onChange={(event) => setEditing({ ...editing, email: event.target.value })} required /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role"><Select value={editing.role_id ?? 2} onChange={(event) => setEditing({ ...editing, role_id: Number(event.target.value) })}><option value={1}>Admin</option><option value={2}>Kasir</option><option value={3}>User</option></Select></Field>
            <Field label="Status"><Select value={editing.status ?? 'active'} onChange={(event) => setEditing({ ...editing, status: event.target.value as 'active' | 'inactive' })}><option value="active">Active</option><option value="inactive">Inactive</option></Select></Field>
          </div>
          <Field label={editingId ? 'Password baru (opsional)' : 'Password'}><Input type="password" value={editing.password ?? ''} onChange={(event) => setEditing({ ...editing, password: event.target.value })} required={!editingId} /></Field>
          <div className="flex gap-2">
            <Button disabled={save.isPending}><Plus className="h-4 w-4" />Save</Button>
            <Button type="button" variant="secondary" onClick={() => { setEditing(blank); setEditingId(null); }}>Reset</Button>
          </div>
        </form>
      </aside>
    </section>
  );
}