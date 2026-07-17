import { Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LockKeyhole, UserRound } from 'lucide-react';
import { getRoleHome, getUserRole, useAuth } from '../lib/auth';
import { Button, Field, Input } from '../components/ui';

export function LoginPage() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to={getRoleHome(role)} replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const loggedInUser = await login({ username, password });
      navigate(getRoleHome(getUserRole(loggedInUser)), { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-screen flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-lg border border-white/40 bg-white/90 p-6 shadow-[0_28px_80px_rgba(15,35,42,0.22)] backdrop-blur">
        <div className="mb-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-md bg-[#12323a] text-[#f59e0b]"><LockKeyhole className="h-6 w-6" /></div>
          <h1 className="text-2xl font-bold text-ink">Masuk POS</h1>
          <p className="mt-1 text-sm text-muted">Gunakan akun operator dari backend Laravel.</p>
        </div>
        <div className="grid gap-4">
          <Field label="Username"><Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required /></Field>
          <Field label="Password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></Field>
          <Button disabled={loading} className="w-full"><UserRound className="h-4 w-4" />{loading ? 'Memproses...' : 'Login'}</Button>
        </div>
      </form>
    </main>
  );
}
