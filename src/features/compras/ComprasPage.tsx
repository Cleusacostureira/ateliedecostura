import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, ShoppingBag, Trash2, Search, X } from 'lucide-react';
import { Badge, Button, Card, ConfirmSheet, EmptyState, Field, Input, Page, PageHeader, Select, Sheet, Spinner, Textarea, cx } from '../../ui';
import { useToast } from '../../ui/toast';
import { Indicador } from '../../ui/graficos';
import { carregarDespesas, excluirCompra, salvarCompra, type CompraForm, type Despesa } from '../../data/db';
import { dataCurta, dinheiro, hoje, semAcento } from '../../data/formato';
import { dentro, periodo } from '../../data/periodo';

const FORMAS = ['dinheiro', 'pix', 'cartão', 'prazo'];
const UNIDADES = ['unidade', 'metro', 'rolo', 'pacote', 'cone', 'caixa'];
const cap = (s: string) => (s || '').charAt(0).toUpperCase() + (s || '').slice(1);
const num = (s: string) => Number(String(s).replace(/\./g, '').replace(',', '.')) || 0;
type ItemTxt = { produto: string; tipo: string; quantidade: string; unidade: string; valor: string };
const itemVazio = (): ItemTxt => ({ produto: '', tipo: '', quantidade: '', unidade: 'unidade', valor: '' });

export default function ComprasPage() {
  const toast = useToast();
  const [lista, setLista] = useState<Despesa[] | null>(null);
  const [desloc, setDesloc] = useState(0);
  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Despesa | 'nova' | null>(null);
  const [apagar, setApagar] = useState<Despesa | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(() => carregarDespesas().then(setLista).catch(e => { toast(e.message, 'erro'); setLista([]); }), [toast]);
  useEffect(() => { carregar(); }, [carregar]);

  const p = periodo('mes', desloc);
  const doMes = useMemo(() => (lista || []).filter(d => dentro(d.data, p)).filter(d => !busca || semAcento(`${d.fornecedor} ${d.itens.map(i => `${i.produto} ${i.tipo}`).join(' ')}`).includes(semAcento(busca))).sort((a, b) => b.data.localeCompare(a.data)), [lista, desloc, busca]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = doMes.reduce((s, d) => s + d.valor, 0);
  const hojeTotal = (lista || []).filter(d => d.data === hoje()).reduce((s, d) => s + d.valor, 0);
  const anterior = (lista || []).filter(d => dentro(d.data, periodo('mes', desloc - 1))).reduce((s, d) => s + d.valor, 0);
  const nItens = doMes.reduce((s, d) => s + d.itens.length, 0);

  async function salvar(id: string | null, f: CompraForm) {
    setSalvando(true);
    try { await salvarCompra(id, f); toast('Compra salva'); setEditando(null); await carregar(); }
    catch (e: any) { toast(e.message, 'erro'); } finally { setSalvando(false); }
  }
  async function confirmarExclusao() {
    if (!apagar) return;
    setSalvando(true);
    try { await excluirCompra(apagar.id); toast('Compra excluída'); setApagar(null); await carregar(); }
    catch (e: any) { toast(e.message, 'erro'); } finally { setSalvando(false); }
  }

  return (
    <Page>
      <PageHeader title="Compras" subtitle="Materiais e despesas do ateliê" actions={<Button onClick={() => setEditando('nova')}><Plus className="w-4 h-4" /> Nova compra</Button>} />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="flex items-center gap-1 bg-white border border-at-line rounded-xl p-1">
          <button onClick={() => setDesloc(d => d - 1)} className="w-8 h-8 rounded-lg hover:bg-at-soft flex items-center justify-center" aria-label="Mês anterior"><ChevronLeft className="w-4 h-4" /></button>
          <span className="px-2 text-sm font-medium min-w-[150px] text-center">{p.rotulo}</span>
          <button onClick={() => setDesloc(d => Math.min(0, d + 1))} disabled={desloc === 0} className="w-8 h-8 rounded-lg hover:bg-at-soft flex items-center justify-center disabled:opacity-30" aria-label="Próximo mês"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <div className="relative w-full sm:w-64 sm:ml-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-at-muted" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar fornecedor ou produto" className="pl-9 h-10" />
        </div>
      </div>

      {lista === null ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <Indicador destaque rotulo="Total no mês" valor={total} anterior={anterior} inverso />
            <Indicador rotulo="Compras de hoje" valor={hojeTotal} />
            <Indicador rotulo="Compras no mês" valor={doMes.length} formato="num" rodape={<span className="text-at-muted">{nItens} itens</span>} />
            <Indicador rotulo="Ticket médio" valor={doMes.length ? total / doMes.length : 0} />
          </div>

          {doMes.length === 0 ? (
            <Card><EmptyState icon={<ShoppingBag className="w-6 h-6" />} title="Nenhuma compra neste mês" action={<Button onClick={() => setEditando('nova')}><Plus className="w-4 h-4" /> Lançar compra</Button>} /></Card>
          ) : (
            <Card className="divide-y divide-at-line overflow-hidden">
              {doMes.map(d => (
                <div key={d.id} className="flex items-center gap-3 px-4 py-3 hover:bg-at-soft/40 cursor-pointer" onClick={() => setEditando(d)}>
                  <div className="w-12 text-center shrink-0 rounded-lg bg-at-soft py-1">
                    <div className="font-display text-lg leading-none">{d.data.slice(8, 10)}</div>
                    <div className="text-[10px] uppercase text-at-muted">{new Date(d.data + 'T12:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-at-ink truncate">{d.fornecedor || 'Fornecedor não informado'}</div>
                    <div className="text-xs text-at-muted truncate">{d.itens.map(i => i.produto).filter(Boolean).join(', ') || 'sem itens detalhados'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold tabular-nums">{dinheiro(d.valor)}</div>
                    <div className="flex gap-1 justify-end mt-0.5">
                      {d.forma && <Badge tone="neutral">{cap(d.forma)}</Badge>}
                      <Badge tone={/pago/i.test(d.status) ? 'green' : 'amber'}>{/pago/i.test(d.status) ? 'Pago' : 'Pendente'}</Badge>
                    </div>
                  </div>
                  <button onClick={e => { e.stopPropagation(); setApagar(d); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-at-muted hover:bg-red-50 hover:text-red-700 shrink-0" aria-label="Excluir"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      <FormCompra aberto={editando} salvando={salvando} onClose={() => setEditando(null)} onSalvar={salvar} />
      <ConfirmSheet open={!!apagar} onClose={() => setApagar(null)} danger confirmLabel="Excluir" loading={salvando} onConfirm={confirmarExclusao}
        title="Excluir compra?" text={apagar && <>A compra de <b>{apagar.fornecedor || 'fornecedor'}</b> ({dinheiro(apagar.valor)}, {dataCurta(apagar.data)}) e o lançamento dela no financeiro serão apagados.</>} />
    </Page>
  );
}

function FormCompra({ aberto, salvando, onClose, onSalvar }: { aberto: Despesa | 'nova' | null; salvando: boolean; onClose: () => void; onSalvar: (id: string | null, f: CompraForm) => void }) {
  const [f, setF] = useState({ data: hoje(), fornecedor: '', forma: 'dinheiro', status: 'pago', observacoes: '' });
  const [itens, setItens] = useState<ItemTxt[]>([itemVazio()]);
  useEffect(() => {
    if (!aberto) return;
    if (aberto === 'nova') { setF({ data: hoje(), fornecedor: '', forma: 'dinheiro', status: 'pago', observacoes: '' }); setItens([itemVazio()]); return; }
    setF({ data: aberto.data, fornecedor: aberto.fornecedor, forma: aberto.forma || 'dinheiro', status: /pago/i.test(aberto.status) ? 'pago' : 'pendente', observacoes: aberto.observacoes || '' });
    setItens(aberto.itens.length ? aberto.itens.map(i => ({ produto: i.produto, tipo: i.tipo, quantidade: i.quantidade ? String(i.quantidade).replace('.', ',') : '', unidade: i.unidade || 'unidade', valor: String(i.valor).replace('.', ',') })) : [{ ...itemVazio(), produto: 'Compra', valor: String(aberto.valor).replace('.', ',') }]);
  }, [aberto]);
  const total = itens.reduce((s, i) => s + num(i.valor), 0);
  const setItem = (idx: number, k: keyof ItemTxt, v: string) => setItens(l => l.map((x, i) => (i === idx ? { ...x, [k]: v } : x)));
  const ok = total > 0 && !!f.data;
  return (
    <Sheet wide open={!!aberto} onClose={onClose} title={aberto && aberto !== 'nova' ? 'Editar compra' : 'Nova compra'} footer={
      <div className="flex items-center justify-between gap-3">
        <div><div className="text-xs text-at-muted">Total</div><div className="font-display text-xl text-at-ink">{dinheiro(total)}</div></div>
        <div className="flex gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button loading={salvando} disabled={!ok} onClick={() => onSalvar(aberto && aberto !== 'nova' ? aberto.id : null, { ...f, itens: itens.map(i => ({ produto: i.produto, tipo: i.tipo, quantidade: num(i.quantidade), unidade: i.unidade, valor: num(i.valor) })) })}>Salvar compra</Button></div>
      </div>
    }>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Fornecedor"><Input autoFocus value={f.fornecedor} onChange={e => setF({ ...f, fornecedor: e.target.value })} placeholder="Nome da loja ou fornecedor" /></Field>
          <Field label="Data"><Input type="date" value={f.data} onChange={e => setF({ ...f, data: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Forma de pagamento"><Select value={f.forma} onChange={e => setF({ ...f, forma: e.target.value })}>{[...new Set([...FORMAS, f.forma])].map(x => <option key={x} value={x}>{cap(x)}</option>)}</Select></Field>
          <Field label="Situação"><Select value={f.status} onChange={e => setF({ ...f, status: e.target.value })}><option value="pago">Pago</option><option value="pendente">Pendente</option></Select></Field>
        </div>
        <div>
          <div className="text-sm font-medium text-at-ink mb-2">Itens</div>
          <div className="space-y-2">
            {itens.map((it, i) => (
              <div key={i} className="rounded-xl border border-at-line bg-white p-2.5 grid grid-cols-6 gap-2">
                <Input className="col-span-6 sm:col-span-3 h-10" value={it.produto} onChange={e => setItem(i, 'produto', e.target.value)} placeholder="Produto (ex.: linha, zíper)" />
                <Input className="col-span-3 sm:col-span-3 h-10" value={it.tipo} onChange={e => setItem(i, 'tipo', e.target.value)} placeholder="Tipo / categoria" />
                <Input className="col-span-3 sm:col-span-1 h-10" inputMode="decimal" value={it.quantidade} onChange={e => setItem(i, 'quantidade', e.target.value)} placeholder="Qtd." />
                <Select className="col-span-3 sm:col-span-2 h-10" value={it.unidade} onChange={e => setItem(i, 'unidade', e.target.value)}>{[...new Set([...UNIDADES, it.unidade])].map(u => <option key={u} value={u}>{cap(u)}</option>)}</Select>
                <Input className="col-span-2 sm:col-span-2 h-10" inputMode="decimal" value={it.valor} onChange={e => setItem(i, 'valor', e.target.value)} placeholder="Valor R$" />
                <button onClick={() => setItens(l => (l.length > 1 ? l.filter((_, j) => j !== i) : [itemVazio()]))} className={cx('col-span-1 h-10 rounded-lg flex items-center justify-center text-at-muted hover:bg-red-50 hover:text-red-700')} aria-label="Remover item"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => setItens(l => [...l, itemVazio()])}><Plus className="w-4 h-4" /> Adicionar item</Button>
        </div>
        <Field label="Observações"><Textarea value={f.observacoes} onChange={e => setF({ ...f, observacoes: e.target.value })} className="min-h-[60px]" /></Field>
      </div>
    </Sheet>
  );
}
