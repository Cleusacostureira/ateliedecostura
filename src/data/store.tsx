import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { carregarCatalogo, carregarClientes, carregarOrdens } from './db';
import type { Cliente, Ordem, PecaCatalogo, ServicoCatalogo } from './types';

type Estado = {
  clientes: Cliente[];
  ordens: Ordem[];
  servicos: ServicoCatalogo[];
  pecasCatalogo: PecaCatalogo[];
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
  /** Atualiza a lista na tela depois de gravar no banco, sem precisar recarregar tudo. */
  guardarOrdem: (o: Ordem) => void;
  tirarOrdem: (id: string) => void;
  guardarCliente: (c: Cliente) => void;
  tirarCliente: (id: string) => void;
  clientePorId: Map<string, Cliente>;
};

const Ctx = createContext<Estado | null>(null);

/**
 * Fonte única dos dados das telas novas: tudo vem do banco (Supabase).
 * Nada é guardado no navegador, então não há cópias desencontradas entre aparelhos.
 */
export function DataProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [servicos, setServicos] = useState<ServicoCatalogo[]>([]);
  const [pecasCatalogo, setPecas] = useState<PecaCatalogo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const ultima = useRef(0);

  const recarregar = useCallback(async () => {
    ultima.current = Date.now();
    try {
      const [c, o, cat] = await Promise.all([carregarClientes(), carregarOrdens(), carregarCatalogo()]);
      setClientes(c);
      setOrdens(o);
      setServicos(cat.servicos);
      setPecas(cat.pecas);
      setErro(null);
    } catch (e: any) {
      setErro(e?.message || 'Falha ao carregar os dados');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  // Ao voltar para o app (outra aba/aparelho pode ter mudado algo), atualiza
  useEffect(() => {
    const aoVoltar = () => { if (document.visibilityState === 'visible' && Date.now() - ultima.current > 30_000) recarregar(); };
    document.addEventListener('visibilitychange', aoVoltar);
    return () => document.removeEventListener('visibilitychange', aoVoltar);
  }, [recarregar]);

  const guardarOrdem = useCallback((o: Ordem) => setOrdens(l => (l.some(x => x.id === o.id) ? l.map(x => (x.id === o.id ? o : x)) : [...l, o])), []);
  const tirarOrdem = useCallback((id: string) => setOrdens(l => l.filter(x => x.id !== id)), []);
  const guardarCliente = useCallback((c: Cliente) => setClientes(l => (l.some(x => x.id === c.id) ? l.map(x => (x.id === c.id ? c : x)) : [...l, c])), []);
  const tirarCliente = useCallback((id: string) => setClientes(l => l.filter(x => x.id !== id)), []);
  const clientePorId = useMemo(() => new Map(clientes.map(c => [c.id, c])), [clientes]);

  const valor = useMemo(() => ({
    clientes, ordens, servicos, pecasCatalogo, carregando, erro, recarregar, guardarOrdem, tirarOrdem, guardarCliente, tirarCliente, clientePorId,
  }), [clientes, ordens, servicos, pecasCatalogo, carregando, erro, recarregar, guardarOrdem, tirarOrdem, guardarCliente, tirarCliente, clientePorId]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useDados() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDados precisa estar dentro do DataProvider');
  return v;
}
