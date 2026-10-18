import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, TrendingUp, ClipboardList, Shirt, Receipt, Users, UserPlus, Percent, PiggyBank } from 'lucide-react';
import { Button, Card, Page, PageHeader, Segmented, Spinner } from '../../ui';
import { useToast } from '../../ui/toast';
import { GraficoArea, GraficoBarras, Indicador, Ranking } from '../../ui/graficos';
import PecaIcone from '../../ui/PecaIcone';
import { useDados } from '../../data/store';
import { carregarDespesas, textoServicos, type Despesa } from '../../data/db';
import { atrasada, dataLocal, dinheiro, semAcento } from '../../data/formato';
import { comparavel, dentro, fatias, paraData, periodo, type Periodo, type TipoPeriodo } from '../../data/periodo';
import type { Ordem } from '../../data/types';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const FAIXAS: Array<[string, number, number]> = [['até R$ 25', 0, 25], ['R$ 26–50', 25.01, 50], ['R$ 51–100', 50.01, 100], ['R$ 101–200', 100.01, 200], ['acima de R$ 200', 200.01, Infinity]];

function Bloco({ titulo, subtitulo, children, acao, className }: { titulo: string; subtitulo?: string; children: React.ReactNode; acao?: React.ReactNode; className?: string }) {
  return (
    <Card className={'p-4 sm:p-5 ' + (className || '')}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-display text-lg text-at-ink">{titulo}</h2>
          {subtitulo && <p className="text-xs text-at-muted mt-0.5">{subtitulo}</p>}
        </div>
        {acao}
      </div>
      {children}
    </Card>
  );
}

export default function RelatoriosPage() {
  const { ordens, clientes, clientePorId, carregando } = useDados();
  const toast = useToast();
  const [tipo, setTipo] = useState<TipoPeriodo>('mes');
  const [desloc, setDesloc] = useState(0);
  const [servPor, setServPor] = useState<'qtd' | 'valor'>('qtd');
  const [despesas, setDespesas] = useState<Despesa[] | null>(null);

  useEffect(() => { carregarDespesas().then(setDespesas).catch(e => { setDespesas([]); toast('Despesas: ' + e.message, 'erro'); }); }, [toast]);

  const p = periodo(tipo, desloc);
  const pAnt = comparavel(p, periodo(tipo, desloc - 1));

  // primeira ordem de cada cliente (para saber quem é nova)
  const primeiraOrdem = useMemo(() => {
    const m = new Map<string, string>();
    ordens.forEach(o => { if (o.clienteId && (!m.has(o.clienteId) || o.criadaEm < m.get(o.clienteId)!)) m.set(o.clienteId, o.criadaEm); });
    return m;
  }, [ordens]);

  const resumo = (per: Periodo) => {
    const os = ordens.filter(o => dentro(o.criadaEm, per));
    const ds = (despesas || []).filter(d => dentro(d.data, per));
    const fat = os.reduce((s, o) => s + o.total, 0);
    const rec = os.filter(o => o.pago).reduce((s, o) => s + o.total, 0);
    const pecas = os.reduce((s, o) => s + o.pecas.length, 0);
    const cli = new Set(os.map(o => o.clienteId).filter(Boolean) as string[]);
    const novas = [...cli].filter(id => dentro(primeiraOrdem.get(id), per)).length;
    const gastos = ds.reduce((s, d) => s + d.valor, 0);
    return { os, ds, fat, rec, pecas, cli: cli.size, novas, gastos, ticket: os.length ? fat / os.length : 0, pctRec: fat ? rec / fat : 0, lucro: fat - gastos };
  };
  const a = useMemo(() => resumo(p), [ordens, despesas, tipo, desloc, primeiraOrdem]); // eslint-disable-line react-hooks/exhaustive-deps
  const b = useMemo(() => resumo(pAnt), [ordens, despesas, tipo, desloc, primeiraOrdem]); // eslint-disable-line react-hooks/exhaustive-deps

  const evolucao = useMemo(() => fatias(p).filter(f => f.inicio <= new Date()).map(f => {
    const per = { ...p, inicio: f.inicio, fim: f.fim };
    const os = a.os.filter(o => dentro(o.criadaEm, per));
    return { rotulo: f.rotulo, faturamento: os.reduce((s, o) => s + o.total, 0), ordens: os.length };
  }), [a, tipo, desloc]); // eslint-disable-line react-hooks/exhaustive-deps

  const ultimos12 = useMemo(() => Array.from({ length: 12 }, (_, i) => {
    const per = periodo('mes', i - 11);
    const os = ordens.filter(o => dentro(o.criadaEm, per));
    const recebido = os.filter(o => o.pago).reduce((s, o) => s + o.total, 0);
    const total = os.reduce((s, o) => s + o.total, 0);
    return { rotulo: per.rotulo.slice(0, 3) + '/' + String(per.inicio.getFullYear()).slice(2), recebido, aReceber: total - recebido };
  }), [ordens]);

  const servicos = useMemo(() => {
    const m = new Map<string, { nome: string; qtd: number; valor: number }>();
    a.os.forEach(o => o.pecas.forEach(pc => pc.services.forEach(s => {
      const k = semAcento(s.name.trim());
      if (!k) return;
      const e = m.get(k) || { nome: s.name.trim().replace(/^./, c => c.toUpperCase()), qtd: 0, valor: 0 };
      e.qtd += 1; e.valor += Number(s.price || 0); m.set(k, e);
    })));
    return [...m.values()].sort((x, y) => (servPor === 'qtd' ? y.qtd - x.qtd : y.valor - x.valor)).slice(0, 10);
  }, [a, servPor]);

  const pecas = useMemo(() => {
    const m = new Map<string, number>();
    a.os.forEach(o => o.pecas.forEach(pc => m.set(pc.tipo, (m.get(pc.tipo) || 0) + 1)));
    return [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8);
  }, [a]);

  const melhores = useMemo(() => {
    const m = new Map<string, { valor: number; n: number }>();
    a.os.forEach(o => { if (!o.clienteId) return; const e = m.get(o.clienteId) || { valor: 0, n: 0 }; e.valor += o.total; e.n += 1; m.set(o.clienteId, e); });
    return [...m.entries()].sort((x, y) => y[1].valor - x[1].valor).slice(0, 8);
  }, [a]);

  const porDiaSemana = useMemo(() => {
    const c = Array(7).fill(0);
    a.os.forEach(o => { const d = paraData(o.criadaEm); if (d) c[d.getDay()] += 1; });
    return [1, 2, 3, 4, 5, 6, 0].map(i => ({ rotulo: DIAS[i], ordens: c[i] }));
  }, [a]);

  const faixas = useMemo(() => FAIXAS.map(([rotulo, min, max]) => ({ rotulo, ordens: a.os.filter(o => o.total >= min && o.total <= max).length })), [a]);

  const materiais = useMemo(() => {
    const m = new Map<string, number>();
    a.ds.forEach(d => {
      if (d.itens.length === 0) { m.set('Outros', (m.get('Outros') || 0) + d.valor); return; }
      d.itens.forEach(i => { const k = (i.tipo || i.produto || 'Outros').trim().replace(/^./, c => c.toUpperCase()); m.set(k, (m.get(k) || 0) + i.valor); });
    });
    return [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8);
  }, [a]);

  const prazoMedio = useMemo(() => {
    const ds = a.os.map(o => { const i = paraData(o.criadaEm), f = paraData(o.entrega); return i && f ? Math.round((f.getTime() - i.getTime()) / 86_400_000) : null; }).filter((x): x is number => x !== null && x >= 0 && x < 120);
    return ds.length ? ds.reduce((s, x) => s + x, 0) / ds.length : 0;
  }, [a]);
  const atrasadasAgora = ordens.filter(atrasada).length;
  const recorrentes = a.cli - a.novas;

  function exportar() {
    const linhas = [['OS', 'Data', 'Cliente', 'Telefone', 'Peças', 'Serviços', 'Total', 'Pagamento', 'Status', 'Entrega']];
    [...a.os].sort((x, y) => x.numero - y.numero).forEach((o: Ordem) => {
      const c = o.clienteId ? clientePorId.get(o.clienteId) : undefined;
      linhas.push([String(o.numero), dataLocal(o.criadaEm), c?.nome || '', c?.telefone || '', o.pecas.map(pc => pc.tipo).join(', '), textoServicos(o.pecas), o.total.toFixed(2).replace('.', ','), o.pago ? 'Pago' : 'A receber', o.status, o.entrega || '']);
    });
    const csv = '﻿' + linhas.map(l => l.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const el = document.createElement('a'); el.href = url; el.download = `ordens-${p.rotulo.replace(/\s+/g, '-').toLowerCase()}.csv`; el.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <Page>
      <PageHeader title="Relatórios" subtitle="Análise do ateliê por período" actions={
        <Button variant="secondary" onClick={exportar} disabled={!a.os.length}><Download className="w-4 h-4" /><span className="hidden sm:inline">Exportar planilha</span></Button>
      } />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Segmented<TipoPeriodo> value={tipo} onChange={v => { setTipo(v); setDesloc(0); }} options={[
          { value: 'mes', label: 'Mês' }, { value: 'trimestre', label: 'Trimestre' }, { value: 'ano', label: 'Ano' },
        ]} />
        <div className="flex items-center gap-1 bg-white border border-at-line rounded-xl p-1">
          <button onClick={() => setDesloc(d => d - 1)} className="w-8 h-8 rounded-lg hover:bg-at-soft flex items-center justify-center" aria-label="Período anterior"><ChevronLeft className="w-4 h-4" /></button>
          <span className="px-2 text-sm font-medium text-at-ink min-w-[160px] text-center">{p.rotulo}</span>
          <button onClick={() => setDesloc(d => Math.min(0, d + 1))} disabled={desloc === 0} className="w-8 h-8 rounded-lg hover:bg-at-soft flex items-center justify-center disabled:opacity-30" aria-label="Próximo período"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <span className="text-xs text-at-muted">Comparação com o mesmo trecho do período anterior</span>
      </div>

      {carregando || despesas === null ? <Spinner label="Montando relatórios..." /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Indicador destaque rotulo="Faturamento" valor={a.fat} anterior={b.fat} icone={<TrendingUp className="w-4 h-4" />} />
            <Indicador rotulo="Ordens" valor={a.os.length} anterior={b.os.length} formato="num" icone={<ClipboardList className="w-4 h-4" />} />
            <Indicador rotulo="Peças atendidas" valor={a.pecas} anterior={b.pecas} formato="num" icone={<Shirt className="w-4 h-4" />} />
            <Indicador rotulo="Ticket médio" valor={a.ticket} anterior={b.ticket} icone={<Receipt className="w-4 h-4" />} />
            <Indicador rotulo="Clientes atendidas" valor={a.cli} anterior={b.cli} formato="num" icone={<Users className="w-4 h-4" />} rodape={<span className="text-at-muted">{recorrentes} voltaram</span>} />
            <Indicador rotulo="Clientes novas" valor={a.novas} anterior={b.novas} formato="num" icone={<UserPlus className="w-4 h-4" />} rodape={<span className="text-at-muted">de {clientes.length} cadastradas</span>} />
            <Indicador rotulo="Recebido do faturado" valor={a.pctRec} anterior={b.pctRec} formato="pct" icone={<Percent className="w-4 h-4" />} rodape={<span className="text-at-muted">{dinheiro(a.rec)}</span>} />
            <Indicador rotulo="Lucro" valor={a.lucro} anterior={b.lucro} icone={<PiggyBank className="w-4 h-4" />} rodape={<span className="text-at-muted">despesas {dinheiro(a.gastos)}</span>} />
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <Bloco titulo="Evolução do faturamento" subtitulo={tipo === 'mes' ? 'Por dia' : 'Por mês'} className="lg:col-span-2">
              <GraficoArea dados={evolucao} series={[{ chave: 'faturamento', nome: 'Faturamento' }]} />
            </Bloco>
            <Bloco titulo="Prazos" subtitulo="Prometido na abertura da OS">
              <div className="space-y-4">
                <div><div className="text-xs text-at-muted">Prazo médio prometido</div><div className="font-display text-3xl text-at-ink">{prazoMedio.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} <span className="text-base text-at-muted">dias</span></div></div>
                <div><div className="text-xs text-at-muted">Ordens atrasadas agora</div><div className={'font-display text-3xl ' + (atrasadasAgora ? 'text-red-700' : 'text-at-ink')}>{atrasadasAgora}</div></div>
                <div><div className="text-xs text-at-muted">Peças por ordem (média)</div><div className="font-display text-3xl text-at-ink">{a.os.length ? (a.pecas / a.os.length).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '0'}</div></div>
              </div>
            </Bloco>
          </div>

          <Bloco titulo="Últimos 12 meses" subtitulo="Faturamento de cada mês, separado entre recebido e a receber">
            <GraficoBarras dados={ultimos12} empilhado series={[{ chave: 'recebido', nome: 'Recebido' }, { chave: 'aReceber', nome: 'A receber', cor: '#B07A1E' }]} altura={260} />
          </Bloco>

          <div className="grid lg:grid-cols-2 gap-5">
            <Bloco titulo="Serviços mais realizados" subtitulo="Top 10 do período" acao={
              <Segmented<'qtd' | 'valor'> value={servPor} onChange={setServPor} options={[{ value: 'qtd', label: 'Qtd.' }, { value: 'valor', label: 'R$' }]} />
            }>
              <Ranking formato={servPor === 'qtd' ? 'num' : 'brl'} itens={servicos.map(s => ({ chave: s.nome, nome: s.nome, valor: servPor === 'qtd' ? s.qtd : s.valor, detalhe: servPor === 'qtd' ? dinheiro(s.valor) : `${s.qtd}×` }))} />
            </Bloco>
            <Bloco titulo="Peças mais atendidas" subtitulo="Quantidade de peças no período">
              <Ranking itens={pecas.map(([tipoPeca, n]) => ({ chave: tipoPeca, nome: <span className="inline-flex items-center gap-2"><PecaIcone nome={tipoPeca} tamanho="sm" />{tipoPeca}</span>, valor: n }))} />
            </Bloco>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <Bloco titulo="Melhores clientes" subtitulo="Por valor no período">
              <Ranking formato="brl" itens={melhores.map(([id, e]) => ({ chave: id, nome: clientePorId.get(id)?.nome || 'Cliente', valor: e.valor, detalhe: `${e.n} OS` }))} />
            </Bloco>
            <Bloco titulo="Clientes novas × que voltaram" subtitulo="Entre as clientes atendidas no período">
              <div className="flex items-end gap-6 mb-4">
                <div><div className="font-display text-3xl text-[#9B2C3E]">{a.novas}</div><div className="text-xs text-at-muted">novas</div></div>
                <div><div className="font-display text-3xl text-[#1F7FB8]">{recorrentes}</div><div className="text-xs text-at-muted">voltaram</div></div>
              </div>
              <div className="h-3 rounded-full overflow-hidden flex gap-0.5 bg-at-soft">
                {a.cli > 0 && <div className="bg-[#9B2C3E]" style={{ width: `${(a.novas / a.cli) * 100}%` }} />}
                {a.cli > 0 && <div className="bg-[#1F7FB8]" style={{ width: `${(recorrentes / a.cli) * 100}%` }} />}
              </div>
              <p className="text-xs text-at-muted mt-3">{a.cli ? `${Math.round((recorrentes / a.cli) * 100)}% das clientes do período já tinham vindo antes.` : 'Sem clientes no período.'}</p>
            </Bloco>
          </div>

          <div className="grid lg:grid-cols-2 gap-5">
            <Bloco titulo="Movimento por dia da semana" subtitulo="Ordens abertas em cada dia">
              <GraficoBarras dados={porDiaSemana} series={[{ chave: 'ordens', nome: 'Ordens' }]} formato="num" altura={200} />
            </Bloco>
            <Bloco titulo="Faixas de valor das ordens" subtitulo="Quantas ordens em cada faixa">
              <GraficoBarras dados={faixas} series={[{ chave: 'ordens', nome: 'Ordens' }]} formato="num" altura={200} />
            </Bloco>
          </div>

          <Bloco titulo="Gastos com materiais" subtitulo={`Compras no período: ${dinheiro(a.gastos)}`}>
            <Ranking formato="brl" vazio="Nenhuma compra no período" itens={materiais.map(([k, v]) => ({ chave: k, nome: k, valor: v }))} />
          </Bloco>
        </div>
      )}
    </Page>
  );
}
