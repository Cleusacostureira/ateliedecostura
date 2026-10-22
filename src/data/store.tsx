import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { carregarCatalogo, carregarClientes, carregarOrdens, completarLancamentos } from './db';
import type { Cliente, Ordem, PecaCatalogo, ServicoCatalogo } from './types';
import { readOrdersFromStorage, safeSetItem } from '../lib/storageHelpers';
import { dataCurta } from './formato';
import { sincronizarConfig } from './config';

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
      // conserta ordens que ficaram sem lançamento no financeiro (uma vez por carga)
      const nomes = new Map(c.map(x => [x.id, x.nome]));
      completarLancamentos(o, id => (id ? nomes.get(id) || '' : '')).then(n => { if (n) { console.info(`[financeiro] ${n} lançamento(s) completado(s)`); window.dispatchEvent(new CustomEvent('financeUpdated')); } }).catch(() => {});
      setServicos(cat.servicos);
      setPecas(cat.pecas);
      setErro(null);
    } catch (e: any) {
      setErro(e?.message || 'Falha ao carregar os dados');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { recarregar(); sincronizarConfig(); }, [recarregar]);

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

  // Ponte para as telas antigas (Financeiro, Agenda...), que ainda leem a cópia do navegador.
  // Ela é sempre reescrita a partir do banco, nunca o contrário.
  useEffect(() => {
    if (carregando || erro || ordens.length === 0) return;
    atualizarCopiaAntiga(ordens, clientes, clientePorId);
  }, [ordens, clientes, clientePorId, carregando, erro]);

  const valor = useMemo(() => ({
    clientes, ordens, servicos, pecasCatalogo, carregando, erro, recarregar, guardarOrdem, tirarOrdem, guardarCliente, tirarCliente, clientePorId,
  }), [clientes, ordens, servicos, pecasCatalogo, carregando, erro, recarregar, guardarOrdem, tirarOrdem, guardarCliente, tirarCliente, clientePorId]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

function atualizarCopiaAntiga(ordens: Ordem[], clientes: Cliente[], porId: Map<string, Cliente>) {
  try {
    const legado = [...ordens].sort((a, b) => b.numero - a.numero).map(o => {
      const c = o.clienteId ? porId.get(o.clienteId) : undefined;
      const notas: any = { pieces: o.pecas };
      if (o.observacoes) notas.observacoes = o.observacoes;
      return {
        id: o.id,
        numero: o.numero,
        cliente_id: o.clienteId,
        status: o.status,
        total: o.total,
        value: o.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        data_criacao: o.criadaEm,
        created_at: o.criadaEm,
        updated_at: o.atualizadaEm,
        data_entrega: o.entrega,
        dateOut: dataCurta(o.entrega) === '—' ? '' : dataCurta(o.entrega),
        notas: JSON.stringify(notas),
        pieces: o.pecas,
        services: [],
        service: o.pecas.map(p => p.tipo).join(', '),
        client: c?.nome || '',
        phone: c?.telefone || '',
        paymentStatus: o.pago ? 'Pago' : null,
      };
    });
    // nunca descarta ordens que ainda só existem neste aparelho (não subiram para o banco)
    const idsBanco = new Set(legado.map(o => String(o.id)));
    const numsBanco = new Set(legado.map(o => String(o.numero)));
    const soLocais = readOrdersFromStorage().filter((o: any) =>
      o && (o._unsynced === true || o._local === true || String(o.id || '').startsWith('local-')) &&
      !idsBanco.has(String(o.id)) && !(o.numero && numsBanco.has(String(o.numero).replace(/\D/g, '').replace(/^0+/, ''))));
    safeSetItem('orders', [...soLocais, ...legado], 'ordersUpdated', 'DataProvider');
    // as telas antigas leem `clientes` como lista simples
    const txt = JSON.stringify(clientes);
    if (localStorage.getItem('clientes') !== txt) {
      localStorage.setItem('clientes', txt);
      window.dispatchEvent(new CustomEvent('clientsUpdated'));
    }
  } catch { /* a cópia é só conveniência para telas antigas */ }
}

export function useDados() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDados precisa estar dentro do DataProvider');
  return v;
}
