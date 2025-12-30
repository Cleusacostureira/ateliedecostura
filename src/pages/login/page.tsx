import { useState } from 'react';
import { useCompanyLogo } from '../../lib/useCompanyLogo';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF7F3]">
      <div className="w-full max-w-md p-8 bg-white/80 backdrop-blur rounded-lg shadow-md">
        <div className="flex flex-col items-center mb-6">
          {/* system logo (use the provided image placed in public/assets/cleusa-logo.png) */}
          <div className="mb-3 flex items-center justify-center w-full">
            <LoginLogo />
          </div>
          <p className="text-sm text-[#7A1E2D]">Bem-vinda ao Cleusa Ateliê</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            try {
              const res = await supabase.auth.signInWithPassword({ email, password });
              if (res.error) {
                setError(res.error.message || 'Erro ao autenticar');
              } else {
                // successful sign in -> go to dashboard
                navigate('/dashboard');
              }
            } catch (err: any) {
              setError(err?.message || 'Erro desconhecido');
            } finally {
              setLoading(false);
            }
          }}
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#7A1E2D] focus:ring-[#C8A15A]/40"
              placeholder="you@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#7A1E2D] focus:ring-[#C8A15A]/40"
              placeholder="••••••••"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2 px-4 rounded-md bg-[#7A1E2D] text-white font-semibold hover:bg-[#6a1a27] transition disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
          {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
        </form>
      </div>
    </div>
  );
}

function LoginLogo() {
  const logo = useCompanyLogo();
  const src = logo || '/assets/cleusa-logo.png';
  return (
    <img
      src={src}
      key={src}
      alt="Cleusa Ateliê de Costura"
      className="w-64 md:w-80 lg:w-96 object-contain"
      style={{ background: 'transparent' }}
      onError={(e) => { (e.currentTarget as HTMLImageElement).onerror = null; (e.currentTarget as HTMLImageElement).src = '/assets/cleusa-logo.svg'; }}
    />
  );
}
