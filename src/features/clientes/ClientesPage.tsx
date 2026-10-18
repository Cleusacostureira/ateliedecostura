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
  const [ord, setOrd] = useState<Ordenacao>('recentes');
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
          { value: 'recentes', label: 'Recentes' },
          { value: 'nome', label: 'A–Z' },
          { value: 'gasto', label: 'Mais fiéis' },
        ]} />
      </div>

      {erro && <div className="mb-4 rounded-xl bg-red-50 text-red-700 text-sm px-4 py-3">{erro}</div>}

      {carregando ? <Spinner /> : lista.length === 0 ? (
        <EmptyState icon={<Users className="w-6 h-6" />} title={busca ? 'Nenhuma cliente encontrada' : 'Nenhuma cliente ainda'}
          text={busca ? 'Confira a grafia ou cadastre uma nova cliente.' : 'Cadastre sua primeira cliente.'}
          action={<Button onClick={() => setNovo(true)}><UserPlus className="w-4 h-4" /> Nova cliente</Button>} />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {lista.slice(0, 300).map(c => {
            const r = resumo.get(c.id);
            return (
              <button key={c.id} onClick={() => navigate(`/clientes/${c.id}`)}
                className="text-left bg-white rounded-2xl border border-at-line shadow-soft hover:border-at-nude hover:shadow-lift transition-all p-4 flex gap-3 items-center">
                <div className="w-11 h-11 rounded-full bg-at-blush text-at-wine flex items-center justify-center font-semibold text-sm shrink-0">{iniciais(c.nome)}</div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-at-ink truncate">{c.nome}</div>
                  <div className="text-xs text-at-muted flex items-center gap-1 truncate">
                    {c.telefone ? <><Phone className="w-3 h-3" /> {telefoneBonito(c.telefone)}</> : 'Sem telefone'}
                  </div>
                  <div className="text-xs text-at-muted mt-1">
                    {r ? <>{r.ordens} {r.ordens === 1 ? 'ordem' : 'ordens'} · {dinheiro(r.gasto)} · última {dataLocal(r.ultima)}</> : 'Nenhuma ordem ainda'}
                  </div>
                </div>
                {r && r.abertas > 0 && <span className="text-[11px] font-medium bg-amber-50 text-amber-700 rounded-full px-2 py-0.5 shrink-0">{r.abertas} em aberto</span>}
              </button>
            );
          })}
        </div>
      )}
      {lista.length > 300 && <p className="text-center text-sm text-at-muted mt-4">Mostrando 300 de {lista.length}. Use a busca para encontrar outras.</p>}

      <ClienteFormSheet open={novo} onClose={() => setNovo(false)} nomeInicial={/\d/.test(busca) ? '' : busca.trim()} onSalvo={c => navigate(`/clientes/${c.id}`)} />
    </Page>
  );
}
