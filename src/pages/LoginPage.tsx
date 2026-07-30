import { Navigate, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Coffee, Lock, User, AlertCircle } from 'lucide-react';
import { getRoleHome, getUserRole, useAuth } from '../lib/auth';
import { Button, Input } from '../components/ui';
import { getApiError } from '../api/client';

export function LoginPage() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated && role !== 'user') return <Navigate to={getRoleHome(role)} replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const loggedInUser = await login({ username, password });
      navigate(getRoleHome(getUserRole(loggedInUser)), { replace: true });
    } catch (err: any) {
      setError(getApiError(err) || 'Login gagal. Periksa username dan password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#4A2C2A] via-[#2E1D19] to-[#1a0f0d] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#C8A27B]/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#C8A27B]/5 rounded-full blur-3xl -z-10" />

      <div className="w-full max-w-md space-y-6">
        {/* Premium Header Card */}
        <div className="text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#C8A27B] to-[#8B6F47] shadow-2xl">
            <Coffee className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Calon Mantoe</h1>
           <p className="mt-2 text-[#C8A27B] text-sm font-semibold uppercase tracking-wider">Coffee Shop System</p>
          <p className="mt-3 text-[#FAF5F0]/70 text-sm leading-relaxed">Akses sistem operasional dan kelola bisnis Anda dengan efisien</p>
        </div>

        {/* Login Form Card */}
        <form onSubmit={submit} className="rounded-2xl border border-[#C8A27B]/20 bg-white/95 backdrop-blur-xl p-8 shadow-2xl space-y-5">
          {/* Error Message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Username Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-[#2E1D19]">
              <User className="h-4 w-4 text-[#C8A27B]" />
              Username
            </label>
            <Input 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              autoComplete="username" 
              required 
              placeholder="Masukkan username Anda"
              disabled={loading}
              className="border-[#EADAC9] focus:border-[#4A2C2A] focus:ring-[#4A2C2A]"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-[#2E1D19]">
              <Lock className="h-4 w-4 text-[#C8A27B]" />
              Password
            </label>
            <Input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              autoComplete="current-password" 
              required 
              placeholder="Masukkan password Anda"
              disabled={loading}
              className="border-[#EADAC9] focus:border-[#4A2C2A] focus:ring-[#4A2C2A]"
            />
          </div>

          {/* Login Button */}
          <Button 
            disabled={loading || !username || !password} 
            className="w-full mt-8 h-11 bg-[#4A2C2A] hover:bg-[#3D2321] text-white font-bold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {loading ? (
              <>
                <span className="inline-block mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Masuk Sekarang
              </>
            )}
          </Button>

          {/* Demo Credentials Hint */}
          <div className="rounded-lg bg-[#FAF5F0] border border-[#EADAC9] p-3 text-xs text-[#7D645E] space-y-1">
            <p className="font-semibold">Demo Credentials:</p>
            <div className="space-y-0.5 font-mono text-[#4A2C2A]">
              <p>👤 Admin: <span className="font-bold">admin</span></p>
              <p>🧑‍💼 Supervisor: <span className="font-bold">supervisor</span></p>
              <p>💳 Operator: <span className="font-bold">operator</span></p>
              <p>🔑 Password: <span className="font-bold">password</span></p>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-[#FAF5F0]/60 text-xs">
            © 2024 Calon Mantoe POS System. Semua hak dilindungi.
          </p>
          <p className="text-[#C8A27B]/70 text-[10px] uppercase tracking-wider font-semibold">
            v1.0 Premium Edition
          </p>
        </div>
      </div>
    </main>
  );
}
