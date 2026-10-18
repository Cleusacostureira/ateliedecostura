import { createContext, useContext, useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Users, Scissors, ShoppingBag, Wallet, BarChart3, MessageCircle, Settings, LogOut, Plus, Menu, X,
} from 'lucide-react';
import { useCompanyLogo } from '../lib/useCompanyLogo';
import { supabase } from '../lib/supabaseClient';
import { cx } from '../ui';
import { ToastProvider } from '../ui/toast';
import { DataProvider } from '../data/store';

/** Avisa as telas antigas que o menu novo já está na tela (elas escondem o menu antigo). */
const ShellCtx = createContext(false);
export const useInShell = () => useContext(ShellCtx);

const principais = [
  { to: '/dashboard', label: 'Início', icon: LayoutDashboard },
  { to: '/ordens', label: 'Ordens', icon: ClipboardList },
  { to: '/clientes', label: 'Clientes', icon: Users },
];
const gestao = [
  { to: '/servicos', label: 'Serviços', icon: Scissors },
  { to: '/compras', label: 'Compras', icon: ShoppingBag },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/disparos', label: 'Disparos', icon: MessageCircle },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
];

function Logo({ className }: { className?: string }) {
  const logo = useCompanyLogo();
  const [falhou, setFalhou] = useState(false);
  if (falhou || !logo) {
    return (
      <div className={cx('leading-tight', className)}>
        <div className="font-display text-xl text-at-wine">Cleusa</div>
        <div className="text-[11px] tracking-[0.2em] uppercase text-at-gold">Ateliê de Costura</div>
      </div>
    );
  }
  return <img src={logo} alt="Cleusa Ateliê de Costura" className={cx('h-12 w-auto', className)} onError={() => setFalhou(true)} />;
}

function NavItem({ to, label, icon: Icon, onClick }: { to: string; label: string; icon: any; onClick?: () => void }) {
  return (
    <NavLink to={to} onClick={onClick} className={({ isActive }) => cx(
      'flex items-center gap-3 px-3 h-10 rounded-xl text-sm font-medium transition-colors',
      isActive ? 'bg-at-blush text-at-wine' : 'text-at-ink/80 hover:bg-at-soft hover:text-at-ink',
    )}>
      <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
      {label}
    </NavLink>
  );
}

async function sair(navigate: (p: string) => void) {
  try { await supabase.auth.signOut(); } catch { /* ignora */ }
  navigate('/login');
}

export default function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [maisAberto, setMaisAberto] = useState(false);

  // Visual novo é sempre claro
  useEffect(() => { document.documentElement.classList.remove('dark'); }, []);
  useEffect(() => { setMaisAberto(false); }, [location.pathname]);

  return (
    <ShellCtx.Provider value={true}>
      <ToastProvider>
        <DataProvider>
          {/* Menu lateral (computador) */}
          <aside className="hidden lg:flex fixed inset-y-0 left-0 w-56 bg-white/70 backdrop-blur border-r border-at-line flex-col z-40">
            <div className="px-5 pt-6 pb-5"><Logo /></div>
            <div className="px-3">
              <button onClick={() => navigate('/ordens/nova')} className="w-full h-11 rounded-xl bg-at-wine text-white text-sm font-medium flex items-center justify-center gap-2 hover:bg-at-wineDark shadow-sm transition">
                <Plus className="w-4 h-4" /> Nova ordem
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {principais.map(i => <NavItem key={i.to} {...i} />)}
              <div className="pt-4 pb-1 px-3 text-[11px] uppercase tracking-wider text-at-muted">Gestão</div>
              {gestao.map(i => <NavItem key={i.to} {...i} />)}
            </nav>
            <div className="p-3 border-t border-at-line">
              <button onClick={() => sair(navigate)} className="w-full flex items-center gap-3 px-3 h-10 rounded-xl text-sm text-at-muted hover:bg-at-soft hover:text-at-ink transition">
                <LogOut className="w-[18px] h-[18px]" strokeWidth={1.8} /> Sair
              </button>
            </div>
          </aside>

          {/* Topo (celular) */}
          <header className="lg:hidden fixed top-0 inset-x-0 h-14 bg-at-bg/90 backdrop-blur border-b border-at-line flex items-center justify-between px-4 z-40">
            <Logo className="!h-9 scale-90 origin-left" />
          </header>

          <div className="min-h-screen bg-at-bg">
            <Outlet />
          </div>

          {/* Barra inferior (celular) */}
          <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur border-t border-at-line z-40 pb-[env(safe-area-inset-bottom)]">
            <div className="grid grid-cols-5 h-16">
              {principais.map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={({ isActive }) => cx('flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium', isActive ? 'text-at-wine' : 'text-at-muted')}>
                  <Icon className="w-5 h-5" strokeWidth={1.8} />{label}
                </NavLink>
              )).slice(0, 2)}
              <button onClick={() => navigate('/ordens/nova')} className="flex items-center justify-center" aria-label="Nova ordem">
                <span className="w-12 h-12 -mt-5 rounded-2xl bg-at-wine text-white flex items-center justify-center shadow-lift"><Plus className="w-6 h-6" /></span>
              </button>
              {principais.slice(2).map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} className={({ isActive }) => cx('flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium', isActive ? 'text-at-wine' : 'text-at-muted')}>
                  <Icon className="w-5 h-5" strokeWidth={1.8} />{label}
                </NavLink>
              ))}
              <button onClick={() => setMaisAberto(true)} className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-at-muted">
                <Menu className="w-5 h-5" strokeWidth={1.8} />Mais
              </button>
            </div>
          </nav>

          {/* Menu "Mais" (celular) */}
          {maisAberto && (
            <div className="lg:hidden fixed inset-0 z-50">
              <div className="absolute inset-0 bg-at-ink/40" onClick={() => setMaisAberto(false)} />
              <div className="absolute bottom-0 inset-x-0 bg-at-bg rounded-t-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-[sheetUp_.2s_ease-out]">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="font-display text-lg">Menu</span>
                  <button onClick={() => setMaisAberto(false)} className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-at-soft" aria-label="Fechar"><X className="w-5 h-5" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {gestao.map(({ to, label, icon: Icon }) => (
                    <NavLink key={to} to={to} className={({ isActive }) => cx('flex flex-col items-center gap-1.5 py-4 rounded-2xl border text-xs font-medium', isActive ? 'bg-at-blush border-at-nude text-at-wine' : 'bg-white border-at-line text-at-ink')}>
                      <Icon className="w-5 h-5" strokeWidth={1.8} />{label}
                    </NavLink>
                  ))}
                </div>
                <button onClick={() => sair(navigate)} className="mt-3 w-full h-11 rounded-xl text-sm text-at-muted flex items-center justify-center gap-2 hover:bg-at-soft">
                  <LogOut className="w-4 h-4" /> Sair
                </button>
              </div>
            </div>
          )}
        </DataProvider>
      </ToastProvider>
    </ShellCtx.Provider>
  );
}
