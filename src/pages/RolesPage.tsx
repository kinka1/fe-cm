import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { employeesApi, rolesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Button, Card, Field, IconButton, Input, PageHeader, SplitLayout } from '../components/ui';
import { EmptyState, ErrorState, LoadingState } from '../components/states';
import { useToast } from '../lib/toast';

export function RolesPage() {
  const [roleName, setRoleName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const toast = useToast();
  const queryClient = useQueryClient();

  const roles = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const employees = useQuery({ queryKey: ['employees'], queryFn: () => employeesApi.list({ per_page: 100 }) });

  const reset = () => {
    setRoleName('');
    setEditingId(null);
  };

  const save = useMutation({
    mutationFn: () => (editingId ? rolesApi.update(editingId, { role_name: roleName }) : rolesApi.create({ role_name: roleName })),
    onSuccess: () => {
      toast.success(editingId ? 'Role diperbarui' : 'Role dibuat');
      reset();
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const remove = useMutation({
    mutationFn: rolesApi.delete,
    onSuccess: () => {
      toast.success('Role dihapus');
      queryClient.invalidateQueries({ queryKey: ['roles'] });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  /** Backend tidak mencegah penghapusan role yang masih terpakai, jadi dicegah di sini. */
  const countEmployees = (roleId: number) => employees.data?.data.filter((employee) => employee.role_id === roleId).length ?? 0;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (roleName.trim()) save.mutate();
  };

  return (
    <section className="grid gap-5">
      <PageHeader title="Role" description="Role karyawan; namanya menentukan menu yang tampil di aplikasi." />

      <SplitLayout
        main={
          <>
            {roles.isLoading && <LoadingState />}
            {roles.error && <ErrorState message={getApiError(roles.error)} />}
            {!roles.isLoading && !roles.error && roles.data?.length === 0 && (
              <EmptyState title="Role kosong" description="Tambahkan role lewat form di samping." />
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              {roles.data?.map((role) => {
                const usage = countEmployees(role.id);

                return (
                  <Card key={role.id} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate font-bold capitalize">{role.role_name}</h2>
                      <p className="mt-1 text-sm text-muted">ID {role.id} &middot; {usage} karyawan</p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <IconButton label="Edit role" onClick={() => { setRoleName(role.role_name); setEditingId(role.id); }}>
                        <Edit2 className="h-4 w-4" />
                      </IconButton>
                      <IconButton
                        label={usage > 0 ? 'Masih dipakai karyawan' : 'Hapus role'}
                        tone="danger"
                        disabled={usage > 0}
                        onClick={() => remove.mutate(role.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </div>
                  </Card>
                );
              })}
            </div>
          </>
        }
        aside={
          <Card>
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
              <ShieldCheck className="h-5 w-5" />{editingId ? 'Edit Role' : 'Buat Role'}
            </h2>
            <form onSubmit={submit} className="grid gap-3">
              <Field
                label="Nama role"
                hint="Dikenali aplikasi: admin, supervisor, kasir/operator. Nama lain diperlakukan sebagai user biasa."
                required
              >
                <Input value={roleName} onChange={(event) => setRoleName(event.target.value)} required maxLength={255} placeholder="admin / supervisor / operator" />
              </Field>
              <div className="flex gap-2">
                <Button type="submit" loading={save.isPending}>
                  <Plus className="h-4 w-4" />Simpan
                </Button>
                <Button type="button" variant="secondary" onClick={reset}>Reset</Button>
              </div>
            </form>
          </Card>
        }
      />
    </section>
  );
}
