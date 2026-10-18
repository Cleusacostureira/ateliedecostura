import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, MessageCircle, Pencil, Plus, Printer, Search, Trash2, UserPlus, PartyPopper } from 'lucide-react';
import { Button, Card, Field, Input, Page, Spinner, Textarea, cx } from '../../ui';
import { useToast } from '../../ui/toast';
import { useDados } from '../../data/store';
import { criarOrdem, editarOrdem, totalDasPecas } from '../../data/db';
import { dataCurta, dinheiro, hoje, iniciais, linkWhatsApp, semAcento, somarDias, telefoneBonito } from '../../data/formato';
import { mensagemNovaOrdem } from '../../data/mensagens';
import type { Cliente, Ordem, Peca } from '../../data/types';
import ClienteFormSheet from '../clientes/ClienteFormSheet';
import PecaSheet from './PecaSheet';
import Comprovante from './Comprovante';
import PecaIcone from '../../ui/PecaIcone';

export default function NovaOrdemPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { clientes, clientePorId, ordens, carregando, guardarOrdem } = useDados();
  const editando = id ? ordens.find(o => o.id === id) : undefined;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [entrega, setEntrega] = useState(somarDias(hoje(), 7));
  const [pago, setPago] = useState(false);
  const [obs, setObs] = useState('');
  const [busca, setBusca] = useState('');
  const [novaCliente, setNovaCliente] = useState(false);
  const [pecaAberta, setPecaAberta] = useState<{ peca: Peca | null } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [criada, setCriada] = useState<Ordem | null>(null);
  const [iniciou, setIniciou] = useState(false);

  // Preenche ao editar ou quando vem da ficha da cliente
  useEffect(() => {
    if (carregando || iniciou) return;
    if (id) {
      if (!editando) return;
      setCliente(editando.clienteId ? clientePorId.get(editando.clienteId) || null : null);
      setPecas(editando.pecas.map(p => ({ ...p, services: p.services.map(s => ({ ...s })) })));
      setEntrega(editando.entrega || '');
      setPago(editando.pago);
      setObs(editando.observacoes);
    } else {
      const cid = params.get('cliente');
      if (cid && clientePorId.get(cid)) setCliente(clientePorId.get(cid)!);
    }
    setIniciou(true);
  }, [carregando, iniciou, id, editando, clientePorId, params]);

  const sugestoes = useMemo(() => {
    const q = semAcento(busca.trim());
    const dig = busca.replace(/\D/g, '');
    if (!q) {
      // clientes das últimas ordens
      const vistos = new Set<string>(); const l: Cliente[] = [];
      [...ordens].sort((a, b) => b.numero - a.numero).forEach(o => {
        if (l.length < 6 && o.clienteId && !vistos.has(o.clienteId)) { vistos.add(o.clienteId); const c = clientePorId.get(o.clienteId); if (c) l.push(c); }
      });
      return l;
    }
    return clientes.filter(c => semAcento(c.nome).includes(q) || (dig.length >= 3 && String(c.telefone || '').includes(dig))).slice(0, 8);
  }, [busca, clientes, ordens, clientePorId]);

  const total = totalDasPecas(pecas);
  const falta = !cliente ? 'Escolha a cliente' : pecas.length === 0 ? 'Adicione ao menos uma peça' : null;

  async function salvar() {
    if (falta || !cliente) { toast(falta || 'Confira os dados', 'erro'); return; }
    setSalvando(true);
    try {
      const form = { clienteId: cliente.id, clienteNome: cliente.nome, pecas, entrega, observacoes: obs, pago };
      if (editando) {
        const o = await editarOrdem(editando, form);
        guardarOrdem(o);
        toast(`OS ${o.numero} atualizada`);
        navigate(`/ordens?os=${o.id}`, { replace: true });
      } else {
        const o = await criarOrdem(form);
        guardarOrdem(o);
        setCriada(o);
        window.scrollTo({ top: 0 });
      }
    } catch (e: any) {
      toast(e.message, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  if (carregando || (id && !iniciou)) return <Page><Spinner /></Page>;
  if (id && !editando) return <Page><p className="text-at-muted">Ordem não encontrada.</p></Page>;

  // ---------- Tela de sucesso ----------
  if (criada && cliente) {
    const msg = mensagemNovaOrdem(criada, cliente.nome);
    const wa = linkWhatsApp(cliente.telefone, msg);
    return (
      <Page>
        <div className="max-w-lg mx-auto text-center pt-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4"><PartyPopper className="w-8 h-8" /></div>
          <h1 className="font-display text-3xl text-at-ink">OS {criada.numero} criada!</h1>
          <p className="text-at-muted mt-1">{cliente.nome} · {criada.pecas.length} {criada.pecas.length === 1 ? 'peça' : 'peças'} · {dinheiro(criada.total)}</p>
          <Card className="text-left p-4 mt-6">
            <div className="text-xs text-at-muted mb-2">Mensagem para a cliente</div>
            <pre className="whitespace-pre-wrap font-sans text-sm text-at-ink">{msg}</pre>
          </Card>
          <div className="grid gap-2 mt-4">
            <Button variant="whatsapp" size="lg" disabled={!wa} onClick={() => wa && window.open(wa, '_blank')}><MessageCircle className="w-5 h-5" /> {wa ? 'Enviar no WhatsApp' : 'Cliente sem WhatsApp cadastrado'}</Button>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => window.print()}><Printer className="w-4 h-4" /> Imprimir</Button>
              <Button variant="secondary" onClick={() => { navigator.clipboard?.writeText(msg); toast('Mensagem copiada'); }}><Copy className="w-4 h-4" /> Copiar texto</Button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button variant="ghost" onClick={() => navigate(`/ordens?os=${criada.id}`)}>Ver a ordem</Button>
              <Button variant="ghost" onClick={() => { setCriada(null); setCliente(null); setPecas([]); setObs(''); setPago(false); setEntrega(somarDias(hoje(), 7)); setBusca(''); }}><Plus className="w-4 h-4" /> Nova ordem</Button>
            </div>
          </div>
        </div>
        <Comprovante ordem={criada} cliente={cliente} />
      </Page>
    );
  }

  const atalhos = [
    { rotulo: 'Hoje', d: 0 }, { rotulo: 'Amanhã', d: 1 }, { rotulo: '3 dias', d: 3 }, { rotulo: '1 semana', d: 7 }, { rotulo: '15 dias', d: 15 },
  ];

  return (
    <Page>
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-at-muted hover:text-at-wine mb-3">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>
      <h1 className="font-display text-2xl sm:text-3xl text-at-ink mb-5">{editando ? `Editar OS ${editando.numero}` : 'Nova ordem de serviço'}</h1>

      <div className="grid lg:grid-cols-[1fr_320px] gap-5 items-start">
        <div className="space-y-4">
          {/* 1. Cliente */}
          <Card className="p-4 sm:p-5">
            <Etapa n={1} titulo="Cliente" ok={!!cliente} />
            {cliente ? (
              <div className="flex items-center gap-3 rounded-xl bg-at-blush/50 border border-at-blush p-3">
                <div className="w-10 h-10 rounded-full bg-white text-at-wine flex items-center justify-center font-semibold text-sm">{iniciais(cliente.nome)}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-at-ink truncate">{cliente.nome}</div>
                  <div className="text-xs text-at-muted">{cliente.telefone ? telefoneBonito(cliente.telefone) : 'Sem telefone'}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setCliente(null)}>Trocar</Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-at-muted" />
                  <Input autoFocus value={busca} onChange={e => setBusca(e.target.value)} placeholder="Digite o nome ou telefone" className="pl-10" />
                </div>
                {!busca && sugestoes.length > 0 && <div className="text-xs text-at-muted mt-3 mb-1.5">Atendidas recentemente</div>}
                <div className="mt-2 space-y-1">
                  {sugestoes.map(c => (
                    <button key={c.id} onClick={() => { setCliente(c); setBusca(''); }} className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl hover:bg-at-soft text-left">
                      <span className="w-8 h-8 rounded-full bg-at-blush text-at-wine flex items-center justify-center text-xs font-semibold shrink-0">{iniciais(c.nome)}</span>
                      <span className="flex-1 min-w-0 text-sm"><span className="text-at-ink">{c.nome}</span> <span className="text-at-muted text-xs">{telefoneBonito(c.telefone)}</span></span>
                    </button>
                  ))}
                  {busca && sugestoes.length === 0 && <p className="text-sm text-at-muted px-1 py-2">Nenhuma cliente com esse nome.</p>}
                </div>
                <Button variant="secondary" className="mt-3 w-full" onClick={() => setNovaCliente(true)}>
                  <UserPlus className="w-4 h-4" /> Cadastrar {busca && !/\d/.test(busca) ? `“${busca.trim()}”` : 'nova cliente'}
                </Button>
              </>
            )}
          </Card>

          {/* 2. Peças */}
          <Card className="p-4 sm:p-5">
            <Etapa n={2} titulo="Peças e serviços" ok={pecas.length > 0} />
            {pecas.length > 0 && (
              <div className="rounded-xl border border-at-line divide-y divide-at-line mb-3">
                {pecas.map((p, i) => (
                  <div key={p.id} className="flex items-start gap-3 p-3">
                    <PecaIcone nome={p.tipo} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-at-ink text-sm">{p.tipo}{p.cor && <span className="text-at-muted font-normal"> · {p.cor}</span>}</div>
                      <div className="text-xs text-at-muted truncate">{p.services.map(s => `${s.name} ${dinheiro(s.price)}`).join(' · ')}</div>
                      {p.modelo && <div className="text-xs text-at-muted italic truncate">{p.modelo}</div>}
                    </div>
                    <div className="text-sm font-medium text-at-ink shrink-0">{dinheiro(p.services.reduce((a, s) => a + s.price, 0))}</div>
                    <div className="flex shrink-0 -mr-1">
                      <button onClick={() => setPecaAberta({ peca: p })} className="w-8 h-8 rounded-lg flex items-center justify-center text-at-muted hover:bg-at-soft hover:text-at-ink" aria-label="Editar peça"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => setPecas(l => l.filter((_, j) => j !== i))} className="w-8 h-8 rounded-lg flex items-center justify-center text-at-muted hover:bg-red-50 hover:text-red-700" aria-label="Remover peça"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setPecaAberta({ peca: null })}
              className="w-full h-14 rounded-xl border-2 border-dashed border-at-nude text-at-wine font-medium text-sm flex items-center justify-center gap-2 hover:bg-at-blush/40 transition">
              <Plus className="w-5 h-5" /> {pecas.length ? 'Adicionar outra peça' : 'Adicionar peça'}
            </button>
          </Card>

          {/* 3. Prazo e pagamento */}
          <Card className="p-4 sm:p-5">
            <Etapa n={3} titulo="Entrega e pagamento" ok={!!entrega} />
            <Field label="Previsão de entrega">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {atalhos.map(a => {
                  const d = somarDias(hoje(), a.d);
                  return (
                    <button key={a.rotulo} type="button" onClick={() => setEntrega(d)}
                      className={cx('h-8 px-3 rounded-full border text-xs font-medium transition', entrega === d ? 'bg-at-wine border-at-wine text-white' : 'bg-white border-at-line text-at-ink hover:border-at-nude')}>
                      {a.rotulo}
                    </button>
                  );
                })}
              </div>
              <Input type="date" value={entrega} onChange={e => setEntrega(e.target.value)} className="sm:max-w-[220px]" />
            </Field>
            <div className="mt-4">
              <span className="block text-sm font-medium text-at-ink mb-1.5">Pagamento</span>
              <div className="grid grid-cols-2 gap-2 sm:max-w-sm">
                <button type="button" onClick={() => setPago(false)} className={cx('h-11 rounded-xl border text-sm font-medium transition', !pago ? 'bg-at-blush border-at-nude text-at-wine' : 'bg-white border-at-line text-at-muted')}>Paga na retirada</button>
                <button type="button" onClick={() => setPago(true)} className={cx('h-11 rounded-xl border text-sm font-medium transition flex items-center justify-center gap-1.5', pago ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-at-line text-at-muted')}>{pago && <Check className="w-4 h-4" />}Já pagou</button>
              </div>
            </div>
            <Field label="Observações da ordem" className="mt-4">
              <Textarea value={obs} onChange={e => setObs(e.target.value)} placeholder="Ex.: urgente, cliente vai provar na sexta..." className="min-h-[70px]" />
            </Field>
          </Card>
        </div>

        {/* Resumo */}
        <div className="lg:sticky lg:top-8">
          <Card className="p-5 hidden lg:block">
            <div className="text-xs uppercase tracking-wider text-at-muted">Resumo</div>
            <div className="mt-3 space-y-2 text-sm">
              <Linha rotulo="Cliente" valor={cliente?.nome || '—'} />
              <Linha rotulo="Peças" valor={String(pecas.length)} />
              <Linha rotulo="Entrega" valor={dataCurta(entrega)} />
              <Linha rotulo="Pagamento" valor={pago ? 'Pago' : 'Na retirada'} />
            </div>
            <div className="border-t border-at-line mt-4 pt-4 flex items-baseline justify-between">
              <span className="text-at-muted text-sm">Total</span>
              <span className="font-display text-3xl text-at-wine">{dinheiro(total)}</span>
            </div>
            <Button size="lg" className="w-full mt-4" onClick={salvar} loading={salvando} disabled={!!falta}>
              <Check className="w-5 h-5" /> {editando ? 'Salvar alterações' : 'Criar ordem'}
            </Button>
            {falta && <p className="text-xs text-at-muted text-center mt-2">{falta}</p>}
          </Card>
        </div>
      </div>

      {/* Barra fixa (celular) */}
      <div className="lg:hidden fixed inset-x-0 bottom-16 z-30 px-3 pb-[env(safe-area-inset-bottom)]">
        <div className="bg-white rounded-2xl shadow-lift border border-at-line p-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-at-muted truncate">{falta || `${cliente?.nome} · ${pecas.length} ${pecas.length === 1 ? 'peça' : 'peças'}`}</div>
            <div className="font-semibold text-at-ink text-lg leading-tight">{dinheiro(total)}</div>
          </div>
          <Button onClick={salvar} loading={salvando} disabled={!!falta}><Check className="w-4 h-4" /> {editando ? 'Salvar' : 'Criar ordem'}</Button>
        </div>
      </div>
      <div className="h-20 lg:hidden" />

      <ClienteFormSheet open={novaCliente} onClose={() => setNovaCliente(false)} nomeInicial={/\d/.test(busca) ? '' : busca.trim()} onSalvo={c => { setCliente(c); setBusca(''); }} />
      <PecaSheet open={!!pecaAberta} peca={pecaAberta?.peca} onClose={() => setPecaAberta(null)}
        onSalvar={novas => setPecas(l => pecaAberta?.peca ? l.map(p => (p.id === pecaAberta.peca!.id ? novas[0] : p)) : [...l, ...novas])} />
    </Page>
  );
}

function Etapa({ n, titulo, ok }: { n: number; titulo: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className={cx('w-7 h-7 rounded-full text-sm font-semibold flex items-center justify-center', ok ? 'bg-at-wine text-white' : 'bg-at-soft text-at-muted')}>{ok ? <Check className="w-4 h-4" /> : n}</span>
      <h2 className="font-display text-lg text-at-ink">{titulo}</h2>
    </div>
  );
}

function Linha({ rotulo, valor }: { rotulo: string; valor: string }) {
  return <div className="flex justify-between gap-3"><span className="text-at-muted">{rotulo}</span><span className="text-at-ink font-medium text-right truncate">{valor}</span></div>;
}

