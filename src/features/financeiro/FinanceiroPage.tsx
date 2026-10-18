import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, TrendingUp, Wallet, ShoppingBag, PiggyBank, Clock, Search, MessageCircle, Check, ArrowDownLeft, ArrowUpRight, ChevronDown } from 'lucide-react';
import { Badge, Button, Card, ConfirmSheet, Input, Page, PageHeader, Segmented, Spinner, cx } from '../../ui';
import { useToast } from '../../ui/toast';
import { GraficoBarras, Indicador } from '../../ui/graficos';
import { useDados } from '../../data/store';
import { carregarDespesas, marcarPagamento, textoServicos, type Despesa } from '../../data/db';
import { dataCurta, dataLocal, dinheiro, iniciais, linkWhatsApp, semAcento } from '../../data/formato';
import { comparavel, dentro, fatias, periodo, type TipoPeriodo } from '../../data/periodo';
import type { Ordem } from '../../data/types';
import OrdemDetalheSheet from '../ordens/OrdemDetalheSheet';
import { PecasResumo } from '../ordens/OrdemCard';

type Aba = 'movimentacoes' | 'receber' | 'despesas';
type FiltroMov = 'todas' | 'entradas' | 'saidas' | 'pendentes';

const PIX = '\n\n*DADOS PARA PAGAMENTO PIX:*\n*Nome:* Cleusa Belani David\n*Telefone:* 45999126130\n*CPF:* 64166724053';

function mensagemCobranca(nome: string, ordens: Ordem[]) {
  const total = ordens.reduce((s, o) => s + o.total, 0);
  const linhas = ordens.map(o => `• OS ${o.numero} (${dataLocal(o.criadaEm)}): ${textoServicos(o.pecas)} — ${dinheiro(o.total)}`).join('\n');
  return `Olá ${nome.split(' ')[0]}! 😊\n\n*Cleusa Ateliê de Costura*\n\nEsperamos que suas peças tenham ficado perfeitas!\n\nGostaríamos de lembrar sobre ${ordens.length > 1 ? 'os pagamentos pendentes' : 'o pagamento pendente'}:\n\n${linhas}\n\n*Total:* ${dinheiro(total)}${PIX}\n\nQualquer dúvida, estamos à disposição! ✨`;
}

export default function FinanceiroPage() {
  const { ordens, clientePorId, carregando, guardarOrdem } = useDados();
  const toast = useToast();
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<TipoPeriodo>('mes');
  const [desloc, setDesloc] = useState(0);
  const [aba, setAba] = useState<Aba>('movimentacoes');
  const [filtro, setFiltro] = useState<FiltroMov>('todas');
  const [busca, setBusca] = useState('');
  const [despesas, setDespesas] = useState<Despesa[] | null>(null);
  const [aberta, setAberta] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<Ordem | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [expandido, setExpandido] = useState<string | null>(null);

  useEffect(() => { carregarDespesas().then(setDespesas).catch(e => { setDespesas([]); toast('Despesas: ' + e.message, 'erro'); }); }, [toast]);

  const p = periodo(tipo, desloc);
  const pAnt = comparavel(p, periodo(tipo, desloc - 1));
  const nome = (o: Ordem) => (o.clienteId ? clientePorId.get(o.clienteId)?.nome : '') || 'Cliente não informada';

  const calc = (per: typeof p) => {
    const os = ordens.filter(o => dentro(o.criadaEm, per));
    const ds = (despesas || []).filter(d => dentro(d.data, per));
    const receitas = os.reduce((s, o) => s + o.total, 0);
    const recebido = os.filter(o => o.pago).reduce((s, o) => s + o.total, 0);
    const gastos = ds.reduce((s, d) => s + d.valor, 0);
    return { os, ds, receitas, recebido, gastos, lucro: receitas - gastos };
  };
  const atual = useMemo(() => calc(p), [ordens, despesas, tipo, desloc]); // eslint-disable-line react-hooks/exhaustive-deps
  const ant = useMemo(() => calc(pAnt), [ordens, despesas, tipo, desloc]); // eslint-disable-line react-hooks/exhaustive-deps

  const pendentes = useMemo(() => ordens.filter(o => !o.pago), [ordens]);
  const totalReceber = pendentes.reduce((s, o) => s + o.total, 0);
  const devedores = useMemo(() => {
    const m = new Map<string, Ordem[]>();
    pendentes.forEach(o => { const k = o.clienteId || 'sem'; m.set(k, [...(m.get(k) || []), o]); });
    return [...m.entries()].map(([id, os]) => ({
      id, os: os.sort((a, b) => a.numero - b.numero), total: os.reduce((s, o) => s + o.total, 0),
      nome: id === 'sem' ? 'Cliente não informada' : (clientePorId.get(id)?.nome || 'Cliente'), telefone: clientePorId.get(id)?.telefone || null,
      maisAntiga: os.reduce((m2, o) => (o.criadaEm < m2 ? o.criadaEm : m2), os[0].criadaEm),
    })).filter(d => !busca || semAcento(d.nome).includes(semAcento(busca))).sort((a, b) => a.maisAntiga.localeCompare(b.maisAntiga));
  }, [pendentes, clientePorId, busca]);

  const grafico = useMemo(() => fatias(p).map(f => {
    const per = { ...p, inicio: f.inicio, fim: f.fim };
    return {
      rotulo: f.rotulo,
      faturamento: atual.os.filter(o => dentro(o.criadaEm, per)).reduce((s, o) => s + o.total, 0),
      despesas: atual.ds.filter(d => dentro(d.data, per)).reduce((s, d) => s + d.valor, 0),
    };
  }), [atual, tipo, desloc]); // eslint-disable-line react-hooks/exhaustive-deps

  type Mov = { tipo: 'entrada'; data: string; ordem: Ordem } | { tipo: 'saida'; data: string; despesa: Despesa };
  const movimentos = useMemo(() => {
    const q = semAcento(busca.trim());
    let l: Mov[] = [
      ...atual.os.map(o => ({ tipo: 'entrada' as const, data: o.criadaEm, ordem: o })),
      ...atual.ds.map(d => ({ tipo: 'saida' as const, data: d.data + 'T12:00:00', despesa: d })),
    ];
    if (filtro === 'entradas') l = l.filter(m => m.tipo === 'entrada');
    if (filtro === 'saidas') l = l.filter(m => m.tipo === 'saida');
    if (filtro === 'pendentes') l = l.filter(m => m.tipo === 'entrada' && !m.ordem.pago);
    if (q) l = l.filter(m => m.tipo === 'entrada'
      ? semAcento(`${nome(m.ordem)} ${m.ordem.numero} ${textoServicos(m.ordem.pecas)}`).includes(q)
      : semAcento(`${m.despesa.fornecedor} ${m.despesa.itens.map(i => i.produto).join(' ')}`).includes(q));
    return l.sort((a, b) => b.data.localeCompare(a.data));
  }, [atual, filtro, busca]); // eslint-disable-line react-hooks/exhaustive-deps

  // agrupa por dia para a lista
  const porDia = useMemo(() => {
    const m = new Map<string, Mov[]>();
    movimentos.forEach(x => { const k = dataLocal(x.data); m.set(k, [...(m.get(k) || []), x]); });
    return [...m.entries()];
  }, [movimentos]);

  async function alternarPago(o: Ordem) {
    setSalvando(true);
    try {
      const nova = await marcarPagamento(o, !o.pago, nome(o));
      guardarOrdem(nova);
      toast(nova.pago ? `OS ${o.numero}: pagamento registrado` : `OS ${o.numero}: voltou para a receber`);
      setConfirmar(null);
    } catch (e: any) { toast(e.message, 'erro'); } finally { setSalvando(false); }
  }

  const carregandoTudo = carregando || despesas === null;
  const pctRecebido = atual.receitas > 0 ? atual.recebido / atual.receitas : 0;

  return (
    <Page>
      <PageHeader title="Financeiro" subtitle="Entradas, despesas e valores a receber" />

      {/* período */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Segmented<TipoPeriodo> value={tipo} onChange={v => { setTipo(v); setDesloc(0); }} options={[
          { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mês' }, { value: 'ano', label: 'Ano' },
        ]} />
        <div className="flex items-center gap-1 bg-white border border-at-line rounded-xl p-1">
          <button onClick={() => setDesloc(d => d - 1)} className="w-8 h-8 rounded-lg hover:bg-at-soft flex items-center justify-center" aria-label="Período anterior"><ChevronLeft className="w-4 h-4" /></button>
          <span className="px-2 text-sm font-medium text-at-ink min-w-[150px] text-center">{p.rotulo}</span>
          <button onClick={() => setDesloc(d => Math.min(0, d + 1))} disabled={desloc === 0} className="w-8 h-8 rounded-lg hover:bg-at-soft flex items-center justify-center disabled:opacity-30" aria-label="Próximo período"><ChevronRight className="w-4 h-4" /></button>
        </div>
        {desloc !== 0 && <button onClick={() => setDesloc(0)} className="text-xs text-at-wine underline underline-offset-2">voltar para o atual</button>}
      </div>

      {carregandoTudo ? <Spinner label="Carregando financeiro..." /> : (
        <>
          {/* indicadores */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
            <Indicador destaque rotulo="Faturamento" valor={atual.receitas} anterior={ant.receitas} icone={<TrendingUp className="w-4 h-4" />} rodape={`${atual.os.length} ordens`} />
            <Indicador rotulo="Recebido" valor={atual.recebido} anterior={ant.recebido} icone={<Wallet className="w-4 h-4" />}
              rodape={<span className="text-at-muted">{Math.round(pctRecebido * 100)}% do faturado</span>}
              onClick={() => { setAba('movimentacoes'); setFiltro('entradas'); }} />
            <Indicador rotulo="Despesas" valor={atual.gastos} anterior={ant.gastos} inverso icone={<ShoppingBag className="w-4 h-4" />}
              onClick={() => setAba('despesas')} ativo={aba === 'despesas'} />
            <Indicador rotulo="Lucro" valor={atual.lucro} anterior={ant.lucro} icone={<PiggyBank className="w-4 h-4" />} rodape={<span className="text-at-muted">faturamento − despesas</span>} />
            <Indicador rotulo="A receber (total)" valor={totalReceber} icone={<Clock className="w-4 h-4" />}
              rodape={<span className="text-at-muted">{devedores.length} clientes · todo o período</span>}
              onClick={() => setAba('receber')} ativo={aba === 'receber'} />
          </div>

          {/* barra de recebimento */}
          <Card className="p-4 mb-5">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-at-ink font-medium">Recebido no período</span>
              <span className="text-at-muted">{dinheiro(atual.recebido)} de {dinheiro(atual.receitas)}</span>
            </div>
            <div className="h-2.5 rounded-full bg-at-soft overflow-hidden"><div className="h-full rounded-full bg-[#9B2C3E] transition-all" style={{ width: `${pctRecebido * 100}%` }} /></div>
          </Card>

          {/* gráfico */}
          <Card className="p-4 sm:p-5 mb-5">
            <h2 className="font-display text-lg text-at-ink mb-3">Faturamento × despesas</h2>
            <GraficoBarras dados={grafico} series={[{ chave: 'faturamento', nome: 'Faturamento' }, { chave: 'despesas', nome: 'Despesas', cor: '#B07A1E' }]} altura={tipo === 'mes' ? 220 : 240} />
          </Card>

          {/* abas */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {([['movimentacoes', 'Movimentações'], ['receber', `A receber (${devedores.length})`], ['despesas', 'Despesas']] as Array<[Aba, string]>).map(([id, r]) => (
              <button key={id} onClick={() => setAba(id)} className={cx('h-9 px-3.5 rounded-full text-sm font-medium border transition', aba === id ? 'bg-at-wine border-at-wine text-white' : 'bg-white border-at-line text-at-ink hover:border-at-nude')}>{r}</button>
            ))}
            <div className="relative ml-auto w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-at-muted" />
              <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar cliente, OS ou fornecedor" className="pl-9 h-10" />
            </div>
          </div>

          {aba === 'movimentacoes' && (
            <>
              <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar">
                {([['todas', 'Todas'], ['entradas', 'Entradas'], ['saidas', 'Saídas'], ['pendentes', 'Não pagas']] as Array<[FiltroMov, string]>).map(([id, r]) => (
                  <button key={id} onClick={() => setFiltro(id)} className={cx('shrink-0 h-8 px-3 rounded-full text-xs font-medium border', filtro === id ? 'bg-at-ink border-at-ink text-white' : 'border-at-line text-at-muted hover:text-at-ink')}>{r}</button>
                ))}
              </div>
              {porDia.length === 0 ? <Card className="p-8 text-center text-sm text-at-muted">Nenhuma movimentação neste período.</Card> : (
                <div className="space-y-4">
                  {porDia.map(([dia, itens]) => (
                    <div key={dia}>
                      <div className="flex items-center justify-between text-xs text-at-muted mb-1.5 px-1">
                        <span className="font-medium">{dia}</span>
                        <span className="tabular-nums">{dinheiro(itens.reduce((s, m) => s + (m.tipo === 'entrada' ? m.ordem.total : -m.despesa.valor), 0))}</span>
                      </div>
                      <Card className="divide-y divide-at-line overflow-hidden">
                        {itens.map(m => m.tipo === 'entrada' ? (
                          <div key={m.ordem.id} className="flex items-center gap-3 px-4 py-3 hover:bg-at-soft/50 cursor-pointer" onClick={() => setAberta(m.ordem.id)}>
                            <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0"><ArrowDownLeft className="w-4 h-4" /></span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-at-ink truncate">{nome(m.ordem)} <span className="text-at-muted font-normal">· OS {m.ordem.numero}</span></div>
                              <PecasResumo ordem={m.ordem} />
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-semibold text-emerald-700 tabular-nums">+ {dinheiro(m.ordem.total)}</div>
                              <button onClick={e => { e.stopPropagation(); setConfirmar(m.ordem); }} className="mt-1">
                                {m.ordem.pago ? <Badge tone="green"><Check className="w-3 h-3" />Pago</Badge> : <Badge tone="wine">A receber · marcar pago</Badge>}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div key={m.despesa.id} className="flex items-center gap-3 px-4 py-3">
                            <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0"><ArrowUpRight className="w-4 h-4" /></span>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-at-ink truncate">{m.despesa.fornecedor || 'Compra'} <span className="text-at-muted font-normal">· despesa</span></div>
                              <div className="text-xs text-at-muted truncate">{m.despesa.itens.map(i => i.produto).filter(Boolean).join(', ') || 'Compra de material'}{m.despesa.forma ? ` · ${m.despesa.forma}` : ''}</div>
                            </div>
                            <div className="text-sm font-semibold text-at-ink tabular-nums shrink-0">− {dinheiro(m.despesa.valor)}</div>
                          </div>
                        ))}
                      </Card>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {aba === 'receber' && (
            devedores.length === 0 ? <Card className="p-8 text-center text-sm text-at-muted">Nenhum valor a receber. 🎉</Card> : (
              <Card className="divide-y divide-at-line overflow-hidden">
                {devedores.map(d => {
                  const dias = Math.floor((Date.now() - new Date(d.maisAntiga).getTime()) / 86_400_000);
                  const wa = linkWhatsApp(d.telefone, mensagemCobranca(d.nome, d.os));
                  const aberto = expandido === d.id;
                  return (
                    <div key={d.id}>
                      <div className="flex items-center gap-3 px-4 py-3">
                        <button onClick={() => setExpandido(aberto ? null : d.id)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                          <span className="w-9 h-9 rounded-full bg-at-blush text-at-wine flex items-center justify-center text-xs font-semibold shrink-0">{iniciais(d.nome)}</span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-at-ink truncate">{d.nome}</span>
                            <span className="block text-xs text-at-muted">{d.os.length} {d.os.length === 1 ? 'ordem' : 'ordens'} · desde {dataLocal(d.maisAntiga)}</span>
                          </span>
                          {dias > 30 && <Badge tone="red" className="shrink-0">{dias} dias</Badge>}
                          <ChevronDown className={cx('w-4 h-4 text-at-muted transition shrink-0', aberto && 'rotate-180')} />
                        </button>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-semibold text-at-wine tabular-nums">{dinheiro(d.total)}</div>
                        </div>
                        <Button size="sm" variant="whatsapp" disabled={!wa} onClick={() => wa && window.open(wa, '_blank')} className="shrink-0"><MessageCircle className="w-4 h-4" /><span className="hidden sm:inline">Cobrar</span></Button>
                      </div>
                      {aberto && (
                        <div className="bg-at-soft/40 px-4 py-2 space-y-1.5">
                          {d.os.map(o => (
                            <div key={o.id} className="flex items-center gap-3 text-sm">
                              <button onClick={() => setAberta(o.id)} className="text-at-wine font-medium underline-offset-2 hover:underline shrink-0">OS {o.numero}</button>
                              <span className="text-xs text-at-muted shrink-0">{dataLocal(o.criadaEm)}</span>
                              <span className="text-xs text-at-muted truncate flex-1">{textoServicos(o.pecas)}</span>
                              <span className="tabular-nums shrink-0">{dinheiro(o.total)}</span>
                              <Button size="sm" variant="secondary" onClick={() => setConfirmar(o)} className="shrink-0 h-8"><Check className="w-3.5 h-3.5" />Recebi</Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </Card>
            )
          )}

          {aba === 'despesas' && (
            atual.ds.length === 0 ? <Card className="p-8 text-center text-sm text-at-muted">Nenhuma despesa neste período. <button className="text-at-wine underline" onClick={() => navigate('/compras')}>Lançar compra</button></Card> : (
              <Card className="divide-y divide-at-line overflow-hidden">
                {[...atual.ds].filter(d => !busca || semAcento(d.fornecedor + d.itens.map(i => i.produto).join(' ')).includes(semAcento(busca))).sort((a, b) => b.data.localeCompare(a.data)).map(d => (
                  <div key={d.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center shrink-0"><ShoppingBag className="w-4 h-4" /></span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-at-ink truncate">{d.fornecedor || 'Compra'}</div>
                      <div className="text-xs text-at-muted truncate">{dataCurta(d.data)} · {d.itens.map(i => `${i.produto}${i.quantidade ? ` (${i.quantidade.toLocaleString('pt-BR')} ${i.unidade})` : ''}`).join(', ') || 'sem itens detalhados'}</div>
                    </div>
                    <div className="text-sm font-semibold text-at-ink tabular-nums">{dinheiro(d.valor)}</div>
                  </div>
                ))}
              </Card>
            )
          )}
        </>
      )}

      <OrdemDetalheSheet ordemId={aberta} onClose={() => setAberta(null)} />
      <ConfirmSheet open={!!confirmar} onClose={() => setConfirmar(null)} loading={salvando}
        title={confirmar?.pago ? 'Desfazer pagamento?' : 'Registrar pagamento?'}
        confirmLabel={confirmar?.pago ? 'Voltar para a receber' : `Sim, recebi ${confirmar ? dinheiro(confirmar.total) : ''}`}
        danger={!!confirmar?.pago}
        onConfirm={() => confirmar && alternarPago(confirmar)}
        text={confirmar && <>OS <b>{confirmar.numero}</b> de <b>{nome(confirmar)}</b> — {dinheiro(confirmar.total)}.{confirmar.pago ? ' Ela voltará para a lista de valores a receber.' : ' Ela sai da lista de valores a receber.'}</>} />
    </Page>
  );
}
