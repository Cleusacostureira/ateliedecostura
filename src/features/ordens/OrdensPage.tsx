import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, ClipboardList, RefreshCw } from 'lucide-react';
import { Button, EmptyState, IconButton, Input, Page, PageHeader, Spinner, cx } from '../../ui';
import { useDados } from '../../data/store';
import { atrasada, diasAte, dinheiro, ROTULO_STATUS, semAcento } from '../../data/formato';
import type { Ordem, StatusOrdem } from '../../data/types';
import OrdemCard, { ESTILO_ETAPA } from './OrdemCard';
import OrdemDetalheSheet from './OrdemDetalheSheet';

type Aba = 'abertas' | StatusOrdem;
type Filtro = 'todas' | 'atrasadas' | 'hoje' | 'receber';

const ABAS: Array<{ id: Aba; rotulo: string }> = [
  { id: 'abertas', rotulo: 'Em aberto' },
  { id: 'Recebido', rotulo: ROTULO_STATUS['Recebido'] + 's' },
  { id: 'Em costura', rotulo: ROTULO_STATUS['Em costura'] },
  { id: 'Pronto', rotulo: ROTULO_STATUS['Pronto'] + 's' },
  { id: 'Retirado', rotulo: ROTULO_STATUS['Retirado'] + 's' },
];

const POR_PAGINA = 60;

export default function OrdensPage() {
  const { ordens, clientePorId, carregando, erro, recarregar } = useDados();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const aba = (params.get('aba') as Aba) || 'abertas';
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [busca, setBusca] = useState('');
  const [limite, setLimite] = useState(POR_PAGINA);
  const [aberta, setAberta] = useState<string | null>(params.get('os'));
  const [atualizando, setAtualizando] = useState(false);

  const nome = (o: Ordem) => (o.clienteId ? clientePorId.get(o.clienteId)?.nome : '') || '';

  const contagem = useMemo(() => {
    const c: Record<string, number> = { abertas: 0, Recebido: 0, 'Em costura': 0, Pronto: 0, Retirado: 0 };
    ordens.forEach(o => { c[o.status] += 1; if (o.status !== 'Retirado') c.abertas += 1; });
    return c;
  }, [ordens]);

  const lista = useMemo(() => {
    const q = semAcento(busca.trim());
    // A busca procura em todas as ordens, independente da aba
    let l = q
      ? ordens.filter(o => String(o.numero) === q.replace(/\D/g, '') || semAcento(nome(o)).includes(q) || o.pecas.some(p => semAcento(`${p.tipo} ${p.cor} ${p.services.map(s => s.name).join(' ')}`).includes(q)))
      : ordens.filter(o => (aba === 'abertas' ? o.status !== 'Retirado' : o.status === aba));
    if (filtro === 'atrasadas') l = l.filter(atrasada);
    if (filtro === 'hoje') l = l.filter(o => o.entrega && diasAte(o.entrega) === 0 && o.status !== 'Retirado');
    if (filtro === 'receber') l = l.filter(o => !o.pago);
    const fechadas = aba === 'Retirado' || !!q;
    return [...l].sort((a, b) => {
      if (fechadas) return b.numero - a.numero;
      // em aberto: primeiro as de prazo mais próximo
      const pa = a.entrega || '9999', pb = b.entrega || '9999';
      return pa === pb ? a.numero - b.numero : pa.localeCompare(pb);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordens, aba, filtro, busca, clientePorId]);

  const totalLista = lista.reduce((s, o) => s + o.total, 0);
  const nAtrasadas = ordens.filter(atrasada).length;
  const nHoje = ordens.filter(o => o.entrega && diasAte(o.entrega) === 0 && o.status !== 'Retirado').length;
  const nReceber = ordens.filter(o => !o.pago).length;

  function trocarAba(a: Aba) {
    const p = new URLSearchParams(params);
    p.set('aba', a);
    setParams(p, { replace: true });
    setLimite(POR_PAGINA);
  }

  function abrir(id: string | null) {
    setAberta(id);
    const p = new URLSearchParams(params);
    if (id) p.set('os', id); else p.delete('os');
    setParams(p, { replace: true });
  }

  return (
    <Page>
      <PageHeader
        title="Ordens de serviço"
        subtitle={carregando ? 'Carregando...' : `${contagem.abertas} em aberto · ${ordens.length} no total`}
        actions={<>
          <IconButton label="Atualizar" onClick={async () => { setAtualizando(true); await recarregar(); setAtualizando(false); }}>
            <RefreshCw className={cx('w-4 h-4', atualizando && 'animate-spin')} />
          </IconButton>
          <Button onClick={() => navigate('/ordens/nova')} className="hidden sm:inline-flex"><Plus className="w-4 h-4" /> Nova ordem</Button>
        </>}
      />

      <div className="relative mb-4">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-at-muted" />
        <Input value={busca} onChange={e => { setBusca(e.target.value); setLimite(POR_PAGINA); }} placeholder="Buscar por nº da OS, cliente, peça ou serviço" className="pl-10" />
      </div>

      {!busca && (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 mb-3">
          {ABAS.map(a => (
            <button key={a.id} onClick={() => trocarAba(a.id)}
              className={cx('shrink-0 h-9 px-3.5 rounded-full text-sm font-medium border transition flex items-center gap-1.5',
                aba === a.id ? 'bg-at-wine border-at-wine text-white' : 'bg-white border-at-line text-at-ink hover:border-at-nude')}>
              {a.rotulo}
              <span className={cx('text-xs rounded-full px-1.5', aba === a.id ? 'bg-white/20' : 'bg-at-soft text-at-muted')}>{contagem[a.id]}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 mb-4">
        <Chip ativo={filtro === 'todas'} onClick={() => setFiltro('todas')}>Todas</Chip>
        <Chip ativo={filtro === 'atrasadas'} onClick={() => setFiltro('atrasadas')} tom="red">Atrasadas {nAtrasadas > 0 && `(${nAtrasadas})`}</Chip>
        <Chip ativo={filtro === 'hoje'} onClick={() => setFiltro('hoje')} tom="amber">Entrega hoje {nHoje > 0 && `(${nHoje})`}</Chip>
        <Chip ativo={filtro === 'receber'} onClick={() => setFiltro('receber')} tom="wine">A receber {nReceber > 0 && `(${nReceber})`}</Chip>
      </div>

      {erro && <div className="mb-4 rounded-xl bg-red-50 text-red-700 text-sm px-4 py-3">{erro}</div>}

      {carregando ? <Spinner label="Carregando ordens..." /> : lista.length === 0 ? (
        <EmptyState icon={<ClipboardList className="w-6 h-6" />} title={busca ? 'Nada encontrado' : 'Nenhuma ordem aqui'}
          text={busca ? 'Tente buscar pelo número da OS ou nome da cliente.' : 'Quando houver ordens nesta etapa, elas aparecem aqui.'}
          action={<Button onClick={() => navigate('/ordens/nova')}><Plus className="w-4 h-4" /> Nova ordem</Button>} />
      ) : (
        <>
          <div className="text-xs text-at-muted mb-2">{lista.length} {lista.length === 1 ? 'ordem' : 'ordens'} · {dinheiro(totalLista)}</div>
          {aba === 'abertas' && !busca ? (
            // Em aberto: separado por etapa, na ordem do trabalho
            <div className="space-y-6">
              {(['Em costura', 'Recebido', 'Pronto'] as StatusOrdem[]).map(s => {
                const grupo = lista.filter(o => o.status === s);
                if (grupo.length === 0) return null;
                const e = ESTILO_ETAPA[s];
                const Icone = e.icone;
                return (
                  <section key={s}>
                    <div className="flex items-center gap-2 mb-2.5">
                      <span className={cx('w-7 h-7 rounded-lg flex items-center justify-center', e.bloco)}><Icone className={cx('w-4 h-4', e.texto)} /></span>
                      <h2 className="font-display text-lg text-at-ink">{e.titulo}</h2>
                      <span className={cx('text-xs font-semibold rounded-full px-2 py-0.5', e.bloco, e.texto)}>{grupo.length}</span>
                      <span className="text-xs text-at-muted ml-auto">{dinheiro(grupo.reduce((t, o) => t + o.total, 0))}</span>
                    </div>
                    <div className="grid lg:grid-cols-2 gap-2.5">
                      {grupo.map(o => <OrdemCard key={o.id} ordem={o} nomeCliente={nome(o)} onClick={() => abrir(o.id)} />)}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="grid lg:grid-cols-2 gap-2.5">
              {lista.slice(0, limite).map(o => <OrdemCard key={o.id} ordem={o} nomeCliente={nome(o)} onClick={() => abrir(o.id)} />)}
            </div>
          )}
          {lista.length > limite && (
            <div className="text-center mt-5">
              <Button variant="secondary" onClick={() => setLimite(l => l + POR_PAGINA)}>Mostrar mais ({lista.length - limite} restantes)</Button>
            </div>
          )}
        </>
      )}

      <OrdemDetalheSheet ordemId={aberta} onClose={() => abrir(null)} />
    </Page>
  );
}

function Chip({ ativo, onClick, children, tom }: { ativo: boolean; onClick: () => void; children: React.ReactNode; tom?: 'red' | 'amber' | 'wine' }) {
  const ativos = { red: 'bg-red-50 border-red-200 text-red-700', amber: 'bg-amber-50 border-amber-200 text-amber-800', wine: 'bg-at-blush border-at-nude text-at-wine' };
  return (
    <button onClick={onClick} className={cx('shrink-0 h-8 px-3 rounded-full text-xs font-medium border transition',
      ativo ? (tom ? ativos[tom] : 'bg-at-ink border-at-ink text-white') : 'bg-transparent border-at-line text-at-muted hover:text-at-ink')}>
      {children}
    </button>
  );
}
