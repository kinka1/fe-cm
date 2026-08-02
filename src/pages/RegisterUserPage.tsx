import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { UserPlus } from 'lucide-react';
import { authApi, rolesApi, storesApi } from '../api/endpoints';
import { getApiError } from '../api/client';
import { Button, Card, Field, Input, PageHeader, Select } from '../components/ui';
import { ErrorState } from '../components/states';
import { useToast } from '../lib/toast';
import { useAuth } from '../lib/auth';
import { todayIso } from '../lib/date';
import type { RegisterPayload } from '../types/api';

const emptyForm = () => ({
  name: '',
  username: '',
  email: '',
  password: '',
  password_confirmation: '',
  full_name: '',
  join_date: todayIso(),
  role_id: '',
  store_id: '',
});

/**
 * POST /auth/register membuat baris employees + users sekaligus, jadi ini jalur
 * pembuatan akun yang bisa login — berbeda dengan halaman Karyawan yang hanya
 * membuat data karyawan tanpa kredensial.
 */
export function RegisterUserPage() {
  const [form, setForm] = useState(emptyForm);
  const toast = useToast();
  const { storeId } = useAuth();

  const roles = useQuery({ queryKey: ['roles'], queryFn: rolesApi.list });
  const stores = useQuery({ queryKey: ['stores'], queryFn: () => storesApi.list({ per_page: 100 }) });

  const register = useMutation({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: (result) => {
      toast.success(`Akun ${result.user.username ?? result.user.name} dibuat`);
      setForm({ ...emptyForm(), store_id: form.store_id });
    },
    onError: (error) => toast.error(getApiError(error)),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (form.password !== form.password_confirmation) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }

    register.mutate({
      name: form.name,
      username: form.username,
      email: form.email,
      password: form.password,
      password_confirmation: form.password_confirmation,
      full_name: form.full_name,
      join_date: form.join_date,
      role_id: Number(form.role_id),
      store_id: form.store_id ? Number(form.store_id) : storeId,
    });
  };

  return (
    <section className="grid max-w-3xl gap-5">
      <PageHeader title="Buat Akun Login" description="Membuat data karyawan sekaligus akun yang bisa masuk ke sistem." />

      {roles.error && <ErrorState message={getApiError(roles.error)} />}

      <Card>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Nama tampilan" required>
            <Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={255} />
          </Field>
          <Field label="Nama lengkap karyawan" required>
            <Input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} required maxLength={255} />
          </Field>
          <Field label="Username" required>
            <Input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required autoComplete="off" maxLength={255} />
          </Field>
          <Field label="Email" hint="Harus unik di tabel users maupun employees." required>
            <Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required maxLength={255} />
          </Field>
          <Field label="Password" hint="Minimal 8 karakter." required>
            <Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required minLength={8} autoComplete="new-password" />
          </Field>
          <Field label="Konfirmasi password" required>
            <Input type="password" value={form.password_confirmation} onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} required minLength={8} autoComplete="new-password" />
          </Field>
          <Field label="Tanggal bergabung" required>
            <Input type="date" value={form.join_date} onChange={(event) => setForm({ ...form, join_date: event.target.value })} required />
          </Field>
          <Field label="Role" required>
            <Select value={form.role_id} onChange={(event) => setForm({ ...form, role_id: event.target.value })} required>
              <option value="">Pilih role</option>
              {roles.data?.map((role) => <option key={role.id} value={role.id}>{role.role_name}</option>)}
            </Select>
          </Field>
          <Field label="Toko" hint="Karyawan otomatis mendapat akses ke toko ini." className="sm:col-span-2">
            <Select value={form.store_id} onChange={(event) => setForm({ ...form, store_id: event.target.value })}>
              <option value="">Toko aktif saya</option>
              {stores.data?.map((store) => <option key={store.id} value={store.id}>{store.store_name}</option>)}
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <Button type="submit" loading={register.isPending}>
              <UserPlus className="h-4 w-4" />Buat akun
            </Button>
          </div>
        </form>
      </Card>
    </section>
  );
}
