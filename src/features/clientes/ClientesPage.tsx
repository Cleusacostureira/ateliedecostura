import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, Users, Phone } from 'lucide-react';
import { Button, EmptyState, Input, Page, PageHeader, Segmented, Spinner } from '../../ui';
import { useDados } from '../../data/store';
import { dataLocal, dinheiro, iniciais, semAcento, telefoneBonito } from '../../data/formato';
import ClienteFormSheet from './ClienteFormSheet';
import type { Cliente } from '../../data/types';

export type ResumoCliente = { ordens: number; gasto: number; ultima: string | null; abertas: number };

export function useResumoClientes() {
  const { ordens } = useDados();
  return useMemo(() => {
    const m = new Map<string, ResumoCliente>();
    ordens.forEach(o => {
      if (!o.clienteId) return;
      const r = m.get(o.clienteId) || { ordens: 0, gasto: 0, ultima: null, abertas: 0 };
      r.ordens += 1;
      r.gasto += o.total;
      if (o.status !== 'Retirado') r.abertas += 1;
      if (!r.ultima || o.criadaEm > r.ultima) r.ultima = o.criadaEm;
      m.set(o.clienteId, r);
    });
    return m;
  }, [ordens]);
}

type Ordenacao = 'recentes' | 'nome' | 'gasto';

export default function ClientesPage() {
  const { clientes, carregando, erro } = useDados();
  const resumo = useResumoClientes();
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');
  const [ord, setOrd] = useState<Ordenacao>('nome');
  const [novo, setNovo] = useState(false);

  const lista = useMemo(() => {
    const q = semAcento(busca.trim());
    const qDig = busca.replace(/\D/g, '');
    let l = clientes.filter(c => !q || semAcento(c.nome).includes(q) || (qDig.length >= 3 && String(c.telefone || '').includes(qDig)));
    const r = (c: Cliente) => resumo.get(c.id);
    l = [...l].sort((a, b) => {
      if (ord === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR');
      if (ord === 'gasto') return (r(b)?.gasto || 0) - (r(a)?.gasto || 0);
      return String(r(b)?.ultima || b.created_at).localeCompare(String(r(a)?.ultima || a.created_at));
    });
    return l;
  }, [clientes, busca, ord, resumo]);

  return (
    <Page>
      <PageHeader
        title="Clientes"
        subtitle={carregando ? 'Carregando...' : `${clientes.length} clientes cadastradas`}
        actions={<Button onClick={() => setNovo(true)}><UserPlus className="w-4 h-4" /> <span className="hidden sm:inline">Nova cliente</span><span className="sm:hidden">Nova</span></Button>}
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-at-muted" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar por nome ou telefone" className="pl-10" />
        </div>
        <Segmented<Ordenacao> value={ord} onChange={setOrd} options={[
          { value: 'nome', label: 'A–Z' },
          { value: 'recentes', label: 'Recentes' },
          { value: 'gasto', label: 'Mais fiéis' },
        ]} />
      </div>

      {erro && <div className="mb-4 rounded-xl bg-red-50 text-red-700 text-sm px-4 py-3">{erro}</div>}

      {carregando ? <Spinner /> : lista.length === 0 ? (
        <EmptyState icon={<Users className="w-6 h-6" />} title={busca ? 'Nenhuma cliente encontrada' : 'Nenhuma cliente ainda'}
          text={busca ? 'Confira a grafia ou cadastre uma nova cliente.' : 'Cadastre sua primeira cliente.'}
          action={<Button onClick={() => setNovo(true)}><UserPlus className="w-4 h-4" /> Nova cliente</Button>} />
      ) : (
        <div className="bg-white rounded-2xl border border-at-line shadow-soft overflow-hidden">
          {/* cabeçalho das colunas (computador) */}
          <div className="hidden md:grid grid-cols-[minmax(0,2fr)_150px_90px_120px_110px] gap-3 px-4 py-2.5 text-[11px] uppercase tracking-wider text-at-muted bg-at-soft/60 border-b border-at-line">
            <span>Cliente</span><span>Telefone</span><span className="text-right">Ordens</span><span className="text-right">Total gasto</span><span className="text-right">Última</span>
          </div>
          {lista.map((c, i) => {
            const r = resumo.get(c.id);
            const letra = (semAcento(c.nome.trim())[0] || '#').toUpperCase();
            const letraAnterior = i > 0 ? (semAcento(lista[i - 1].nome.trim())[0] || '#').toUpperCase() : '';
            return (
              <div key={c.id}>
                {ord === 'nome' && !busca && letra !== letraAnterior && (
                  <div className="px-4 py-1 text-xs font-semibold text-at-wine bg-at-blush/50 border-y border-at-line/70 first:border-t-0">{letra}</div>
                )}
                <button onClick={() => navigate(`/clientes/${c.id}`)}
                  className="w-full text-left px-4 py-3 hover:bg-at-soft/60 transition grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2fr)_150px_90px_120px_110px] gap-3 items-center border-b border-at-line/70 last:border-b-0">
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-at-blush text-at-wine flex items-center justify-center font-semibold text-xs shrink-0">{iniciais(c.nome)}</span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="font-medium text-at-ink truncate">{c.nome}</span>
                        {r && r.abertas > 0 && <span className="text-[10px] font-medium bg-amber-50 text-amber-700 rounded-full px-1.5 py-0.5 shrink-0">{r.abertas} em aberto</span>}
                      </span>
                      <span className="md:hidden block text-xs text-at-muted truncate">{c.telefone ? telefoneBonito(c.telefone) : 'Sem telefone'}{r ? ` · ${r.ordens} ${r.ordens === 1 ? 'ordem' : 'ordens'}` : ''}</span>
                    </span>
                  </span>
                  <span className="hidden md:flex items-center gap-1 text-sm text-at-muted truncate">{c.telefone ? <><Phone className="w-3 h-3" /> {telefoneBonito(c.telefone)}</> : '—'}</span>
                  <span className="hidden md:block text-sm text-at-ink text-right">{r?.ordens || 0}</span>
                  <span className="text-sm font-medium text-at-ink text-right">{r ? dinheiro(r.gasto) : '—'}</span>
                  <span className="hidden md:block text-sm text-at-muted text-right">{r ? dataLocal(r.ultima) : '—'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <ClienteFormSheet open={novo} onClose={() => setNovo(false)} nomeInicial={/\d/.test(busca) ? '' : busca.trim()} onSalvo={c => navigate(`/clientes/${c.id}`)} />
    </Page>
  );
}
