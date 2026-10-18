import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, AlertTriangle, CalendarClock, PackageCheck, Scissors, Wallet, TrendingUp, ClipboardList, ChevronRight } from 'lucide-react';
import { Button, Card, Page, Spinner, cx } from '../../ui';
import { GraficoBarras, Indicador, Ranking } from '../../ui/graficos';
import { useDados } from '../../data/store';
import { atrasada, dataCurta, diasAte, dinheiro, semAcento } from '../../data/formato';
import { comparavel, dentro, periodo } from '../../data/periodo';
import type { Ordem } from '../../data/types';
import OrdemCard from '../ordens/OrdemCard';
import OrdemDetalheSheet from '../ordens/OrdemDetalheSheet';

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}

export default function InicioPage() {
  const { ordens, clientePorId, carregando } = useDados();
  const navigate = useNavigate();
  const [aberta, setAberta] = useState<string | null>(null);
  const nome = (o: Ordem) => (o.clienteId ? clientePorId.get(o.clienteId)?.nome : '') || '';

  const mes = periodo('mes', 0);
  const mesAnt = comparavel(mes, periodo('mes', -1));

  const d = useMemo(() => {
    const abertas = ordens.filter(o => o.status !== 'Retirado');
    const late = ordens.filter(atrasada);
    const hojeL = abertas.filter(o => o.entrega && diasAte(o.entrega) === 0);
    const amanha = abertas.filter(o => o.entrega && diasAte(o.entrega) === 1 && o.status !== 'Pronto');
    const prontas = abertas.filter(o => o.status === 'Pronto');
    const costura = abertas.filter(o => o.status === 'Em costura');
    const recebidas = abertas.filter(o => o.status === 'Recebido');
    const doMes = ordens.filter(o => dentro(o.criadaEm, mes));
    const doMesAnt = ordens.filter(o => dentro(o.criadaEm, mesAnt));
    const fat = doMes.reduce((s, o) => s + o.total, 0);
    const fatAnt = doMesAnt.reduce((s, o) => s + o.total, 0);
    const aReceber = ordens.filter(o => !o.pago).reduce((s, o) => s + o.total, 0);
    const proximas = abertas.filter(o => o.entrega && o.status !== 'Pronto').sort((a, b) => String(a.entrega).localeCompare(String(b.entrega))).slice(0, 6);
    const serv = new Map<string, { nome: string; n: number }>();
    doMes.forEach(o => o.pecas.forEach(p => p.services.forEach(s => {
      const k = semAcento(s.name.trim()); if (!k) return;
      const e = serv.get(k) || { nome: s.name.trim().replace(/^./, c => c.toUpperCase()), n: 0 }; e.n += 1; serv.set(k, e);
    })));
    const h0 = new Date(); h0.setHours(0, 0, 0, 0);
    const ultimos = Array.from({ length: 14 }, (_, i) => {
      const inicio = new Date(h0.getFullYear(), h0.getMonth(), h0.getDate() - 13 + i);
      const fim = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + 1);
      return { rotulo: inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), faturamento: ordens.filter(o => dentro(o.criadaEm, { ...mes, inicio, fim })).reduce((s, o) => s + o.total, 0) };
    });
    return { abertas, late, hojeL, amanha, prontas, costura, recebidas, doMes, doMesAnt, fat, fatAnt, aReceber, proximas, servicos: [...serv.values()].sort((a, b) => b.n - a.n).slice(0, 5), ultimos };
  }, [ordens]); // eslint-disable-line react-hooks/exhaustive-deps

  if (carregando) return <Page><Spinner /></Page>;

  const atalhos = [
    { rotulo: 'Atrasadas', n: d.late.length, icone: AlertTriangle, cor: 'text-red-700 bg-red-50', ir: '/ordens' },
    { rotulo: 'Entregas hoje', n: d.hojeL.length, icone: CalendarClock, cor: 'text-amber-700 bg-amber-50', ir: '/ordens' },
    { rotulo: 'Em costura', n: d.costura.length, icone: Scissors, cor: 'text-amber-700 bg-amber-50', ir: '/ordens?aba=Em%20costura' },
    { rotulo: 'Prontas p/ retirar', n: d.prontas.length, icone: PackageCheck, cor: 'text-emerald-700 bg-emerald-50', ir: '/ordens?aba=Pronto' },
  ];

  const prioridade = [...d.late, ...d.hojeL.filter(o => !d.late.includes(o) && o.status !== 'Pronto'), ...d.amanha];

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <p className="text-sm text-at-muted">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, c => c.toUpperCase())}</p>
          <h1 className="font-display text-3xl text-at-ink">{saudacao()}, Cleusa ✂️</h1>
        </div>
        <Button onClick={() => navigate('/ordens/nova')} className="hidden sm:inline-flex"><Plus className="w-4 h-4" /> Nova ordem</Button>
      </div>

      {/* situação do dia */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {atalhos.map(a => (
          <button key={a.rotulo} onClick={() => navigate(a.ir)} className="text-left bg-white rounded-2xl border border-at-line shadow-soft hover:shadow-lift transition p-4 flex items-center gap-3">
            <span className={cx('w-11 h-11 rounded-xl flex items-center justify-center shrink-0', a.cor)}><a.icone className="w-5 h-5" /></span>
            <span><span className="block font-display text-2xl text-at-ink leading-none">{a.n}</span><span className="block text-xs text-at-muted mt-1">{a.rotulo}</span></span>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display text-lg text-at-ink">Prioridades</h2>
              <span className="text-xs text-at-muted">atrasadas, hoje e amanhã</span>
            </div>
            {prioridade.length === 0 ? (
              <p className="text-sm text-at-muted py-6 text-center">Nada urgente. Tudo em dia! 🎉</p>
            ) : (
              <div className="space-y-2.5">{prioridade.slice(0, 6).map(o => <OrdemCard key={o.id} ordem={o} nomeCliente={nome(o)} onClick={() => setAberta(o.id)} />)}</div>
            )}
          </Card>

          {d.prontas.length > 0 && (
            <Card className="p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display text-lg text-at-ink">Prontas aguardando retirada</h2>
                <button onClick={() => navigate('/ordens?aba=Pronto')} className="text-xs text-at-wine inline-flex items-center gap-0.5">ver todas <ChevronRight className="w-3 h-3" /></button>
              </div>
              <div className="divide-y divide-at-line">
                {d.prontas.slice(0, 6).map(o => (
                  <button key={o.id} onClick={() => setAberta(o.id)} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-at-soft/40 px-1 rounded-lg">
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg px-2 py-1 shrink-0">OS {o.numero}</span>
                    <span className="text-sm text-at-ink truncate flex-1">{nome(o) || 'Cliente'}</span>
                    <span className="text-xs text-at-muted shrink-0">desde {dataCurta(o.entrega)}</span>
                    <span className="text-sm font-medium tabular-nums shrink-0">{dinheiro(o.total)}</span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Indicador destaque rotulo={`Faturamento de ${mes.rotulo.split(' ')[0].toLowerCase()}`} valor={d.fat} anterior={d.fatAnt} icone={<TrendingUp className="w-4 h-4" />} rodape={`${d.doMes.length} ordens`} />
          <Indicador rotulo="A receber" valor={d.aReceber} icone={<Wallet className="w-4 h-4" />} rodape={<span className="text-at-muted">todo o período</span>} onClick={() => navigate('/financeiro')} />
          <Indicador rotulo="Ordens em aberto" valor={d.abertas.length} formato="num" icone={<ClipboardList className="w-4 h-4" />} rodape={<span className="text-at-muted">{d.recebidas.length} recebidas · {d.costura.length} em costura · {d.prontas.length} prontas</span>} onClick={() => navigate('/ordens')} />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-5">
        <Card className="p-4 sm:p-5 lg:col-span-2">
          <h2 className="font-display text-lg text-at-ink mb-3">Últimos 14 dias</h2>
          <GraficoBarras dados={d.ultimos} series={[{ chave: 'faturamento', nome: 'Faturamento' }]} altura={200} />
        </Card>
        <Card className="p-4 sm:p-5">
          <h2 className="font-display text-lg text-at-ink mb-3">Serviços do mês</h2>
          <Ranking itens={d.servicos.map(s => ({ chave: s.nome, nome: s.nome, valor: s.n }))} vazio="Nenhum serviço neste mês ainda" />
        </Card>
      </div>

      {d.proximas.length > 0 && (
        <Card className="p-4 sm:p-5 mt-5">
          <h2 className="font-display text-lg text-at-ink mb-3">Próximas entregas</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {d.proximas.map(o => {
              const n = o.entrega ? diasAte(o.entrega) : 0;
              return (
                <button key={o.id} onClick={() => setAberta(o.id)} className="flex items-center gap-3 rounded-xl border border-at-line p-3 text-left hover:bg-at-soft/40">
                  <span className={cx('w-12 text-center rounded-lg py-1 shrink-0', n < 0 ? 'bg-red-50 text-red-700' : n === 0 ? 'bg-amber-50 text-amber-700' : 'bg-at-soft text-at-ink')}>
                    <span className="block font-display text-lg leading-none">{o.entrega?.slice(8, 10)}</span>
                    <span className="block text-[10px] uppercase">{new Date(o.entrega + 'T12:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-at-ink truncate">{nome(o) || 'Cliente'}</span>
                    <span className="block text-xs text-at-muted">OS {o.numero} · {o.pecas.length} {o.pecas.length === 1 ? 'peça' : 'peças'}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      <OrdemDetalheSheet ordemId={aberta} onClose={() => setAberta(null)} />
    </Page>
  );
}
