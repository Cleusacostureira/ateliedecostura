import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Trash2, Scissors, Shirt, Package } from 'lucide-react';
import { Button, Card, ConfirmSheet, EmptyState, Field, Input, Page, PageHeader, Select, Sheet, Spinner, cx } from '../../ui';
import { useToast } from '../../ui/toast';
import PecaIcone from '../../ui/PecaIcone';
import { useDados } from '../../data/store';
import { excluirMaterial, excluirPeca, excluirServico, listarMateriais, listarServicos, salvarMaterial, salvarPeca, salvarServico, type Material, type ServicoCadastro } from '../../data/db';
import { dinheiro, semAcento } from '../../data/formato';
import type { PecaCatalogo } from '../../data/types';

type Aba = 'servicos' | 'pecas' | 'materiais';
const UNIDADES = ['unidade', 'metro', 'rolo', 'pacote', 'folha', 'litro', 'cone', 'caixa'];
const cap = (s: string) => (s || '').charAt(0).toUpperCase() + (s || '').slice(1).toLowerCase();
const num = (s: string) => Number(String(s).replace(/\./g, '').replace(',', '.')) || 0;
const numTxt = (n: number) => (n ? String(n).replace('.', ',') : '');

export default function ServicosPage() {
  const { ordens, pecasCatalogo, recarregar } = useDados();
  const toast = useToast();
  const [aba, setAba] = useState<Aba>('servicos');
  const [busca, setBusca] = useState('');
  const [servicos, setServicos] = useState<ServicoCadastro[] | null>(null);
  const [materiais, setMateriais] = useState<Material[] | null>(null);
  const [editServ, setEditServ] = useState<Partial<ServicoCadastro> | null>(null);
  const [editPeca, setEditPeca] = useState<Partial<PecaCatalogo> | null>(null);
  const [editMat, setEditMat] = useState<Partial<Material> | null>(null);
  const [apagar, setApagar] = useState<{ tipo: Aba; id: string; nome: string } | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [s, m] = await Promise.all([listarServicos(), listarMateriais()]);
      setServicos(s); setMateriais(m);
    } catch (e: any) { toast(e.message, 'erro'); setServicos([]); setMateriais([]); }
  }, [toast]);
  useEffect(() => { carregar(); }, [carregar]);

  // uso real de cada serviço e peça nas ordens
  const uso = useMemo(() => {
    const serv = new Map<string, { n: number; valor: number }>(), pec = new Map<string, number>();
    ordens.forEach(o => o.pecas.forEach(p => {
      pec.set(semAcento(p.tipo), (pec.get(semAcento(p.tipo)) || 0) + 1);
      p.services.forEach(s => { const k = semAcento(s.name.trim()); const e = serv.get(k) || { n: 0, valor: 0 }; e.n += 1; e.valor += s.price; serv.set(k, e); });
    }));
    return { serv, pec };
  }, [ordens]);

  const q = semAcento(busca.trim());
  const categorias = useMemo(() => [...new Set((servicos || []).map(s => s.categoria).filter(Boolean))].sort(), [servicos]);
  const gruposServ = useMemo(() => {
    const l = (servicos || []).filter(s => !q || semAcento(s.titulo).includes(q)).sort((a, b) => (uso.serv.get(semAcento(b.titulo))?.n || 0) - (uso.serv.get(semAcento(a.titulo))?.n || 0));
    const m = new Map<string, ServicoCadastro[]>();
    l.forEach(s => { const k = s.categoria || 'outros'; m.set(k, [...(m.get(k) || []), s]); });
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [servicos, q, uso]);
  const gruposPecas = useMemo(() => {
    const m = new Map<string, PecaCatalogo[]>();
    pecasCatalogo.filter(p => !q || semAcento(p.nome).includes(q)).sort((a, b) => a.nome.localeCompare(b.nome)).forEach(p => m.set(p.categoria, [...(m.get(p.categoria) || []), p]));
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [pecasCatalogo, q]);
  const matsFiltrados = (materiais || []).filter(m => !q || semAcento(m.nome).includes(q)).sort((a, b) => a.nome.localeCompare(b.nome));

  async function executar(fn: () => Promise<void>, ok: string, depois: () => void) {
    setSalvando(true);
    try { await fn(); toast(ok); depois(); await Promise.all([carregar(), recarregar()]); }
    catch (e: any) { toast(e.message, 'erro'); }
    finally { setSalvando(false); }
  }

  const novo = () => aba === 'servicos' ? setEditServ({ titulo: '', preco: 0, categoria: '', duracao: null }) : aba === 'pecas' ? setEditPeca({ nome: '', categoria: '' }) : setEditMat({ nome: '', unidade: 'unidade', preco: 0, estoque: 0 });

  return (
    <Page>
      <PageHeader title="Serviços e catálogo" subtitle="Serviços com preço, tipos de peça e materiais"
        actions={<Button onClick={novo}><Plus className="w-4 h-4" /> {aba === 'servicos' ? 'Novo serviço' : aba === 'pecas' ? 'Nova peça' : 'Novo material'}</Button>} />

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {([['servicos', 'Serviços', Scissors, servicos?.length], ['pecas', 'Tipos de peça', Shirt, pecasCatalogo.length], ['materiais', 'Materiais', Package, materiais?.length]] as const).map(([id, r, Ic, n]) => (
          <button key={id} onClick={() => setAba(id)} className={cx('h-9 px-3.5 rounded-full text-sm font-medium border transition inline-flex items-center gap-1.5', aba === id ? 'bg-at-wine border-at-wine text-white' : 'bg-white border-at-line text-at-ink hover:border-at-nude')}>
            <Ic className="w-4 h-4" />{r}<span className={cx('text-xs rounded-full px-1.5', aba === id ? 'bg-white/20' : 'bg-at-soft text-at-muted')}>{n ?? '…'}</span>
          </button>
        ))}
        <div className="relative w-full sm:w-64 sm:ml-auto">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-at-muted" />
          <Input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar..." className="pl-9 h-10" />
        </div>
      </div>

      {servicos === null ? <Spinner /> : aba === 'servicos' ? (
        gruposServ.length === 0 ? <EmptyState icon={<Scissors className="w-6 h-6" />} title="Nenhum serviço encontrado" /> : (
          <div className="space-y-5">
            {gruposServ.map(([cat, l]) => (
              <div key={cat}>
                <h2 className="text-xs uppercase tracking-wider text-at-muted mb-2 px-1">{cap(cat)} · {l.length}</h2>
                <Card className="divide-y divide-at-line overflow-hidden">
                  {l.map(s => {
                    const u = uso.serv.get(semAcento(s.titulo));
                    return (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-at-ink truncate">{s.titulo}</div>
                          <div className="text-xs text-at-muted">{u ? `${u.n}× realizado · ${dinheiro(u.valor)}` : 'ainda não usado'}{s.duracao ? ` · ~${s.duracao} min` : ''}</div>
                        </div>
                        <div className="text-sm font-semibold text-at-ink tabular-nums">{dinheiro(s.preco)}</div>
                        <button onClick={() => setEditServ(s)} className="w-8 h-8 rounded-lg flex items-center justify-center text-at-muted hover:bg-at-soft hover:text-at-ink" aria-label="Editar"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => setApagar({ tipo: 'servicos', id: s.id, nome: s.titulo })} className="w-8 h-8 rounded-lg flex items-center justify-center text-at-muted hover:bg-red-50 hover:text-red-700" aria-label="Excluir"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    );
                  })}
                </Card>
              </div>
            ))}
          </div>
        )
      ) : aba === 'pecas' ? (
        <div className="space-y-5">
          {gruposPecas.map(([cat, l]) => (
            <div key={cat}>
              <h2 className="text-xs uppercase tracking-wider text-at-muted mb-2 px-1">{cap(cat)} · {l.length}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {l.map(p => (
                  <div key={p.id} className="group bg-white rounded-xl border border-at-line p-3 flex items-center gap-3">
                    <PecaIcone nome={p.nome} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-at-ink truncate">{p.nome}</div>
                      <div className="text-xs text-at-muted">{uso.pec.get(semAcento(p.nome)) || 0} atendidas</div>
                    </div>
                    <div className="flex flex-col sm:opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => setEditPeca(p)} className="w-7 h-7 rounded-lg flex items-center justify-center text-at-muted hover:bg-at-soft" aria-label="Editar"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setApagar({ tipo: 'pecas', id: p.id, nome: p.nome })} className="w-7 h-7 rounded-lg flex items-center justify-center text-at-muted hover:bg-red-50 hover:text-red-700" aria-label="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="divide-y divide-at-line overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_110px_110px_100px_72px] gap-3 px-4 py-2.5 text-[11px] uppercase tracking-wider text-at-muted bg-at-soft/60">
            <span>Material</span><span>Unidade</span><span className="text-right">Valor unit.</span><span className="text-right">Estoque</span><span />
          </div>
          {matsFiltrados.map(m => (
            <div key={m.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_110px_110px_100px_72px] gap-3 px-4 py-3 items-center">
              <div className="min-w-0"><div className="text-sm font-medium text-at-ink truncate">{m.nome}</div><div className="sm:hidden text-xs text-at-muted">{dinheiro(m.preco)} / {m.unidade} · estoque {m.estoque.toLocaleString('pt-BR')}</div></div>
              <span className="hidden sm:block text-sm text-at-muted">{cap(m.unidade)}</span>
              <span className="hidden sm:block text-sm text-right tabular-nums">{dinheiro(m.preco)}</span>
              <span className={cx('hidden sm:block text-sm text-right tabular-nums', m.estoque <= 0 && 'text-at-muted')}>{m.estoque.toLocaleString('pt-BR')}</span>
              <span className="flex justify-end">
                <button onClick={() => setEditMat(m)} className="w-8 h-8 rounded-lg flex items-center justify-center text-at-muted hover:bg-at-soft" aria-label="Editar"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => setApagar({ tipo: 'materiais', id: m.id, nome: m.nome })} className="w-8 h-8 rounded-lg flex items-center justify-center text-at-muted hover:bg-red-50 hover:text-red-700" aria-label="Excluir"><Trash2 className="w-4 h-4" /></button>
              </span>
            </div>
          ))}
        </Card>
      )}

      {/* formulário de serviço */}
      <FormServico valor={editServ} categorias={categorias} salvando={salvando} onClose={() => setEditServ(null)}
        onSalvar={v => executar(() => salvarServico(v as any), 'Serviço salvo', () => setEditServ(null))} />
      {/* formulário de peça */}
      <FormSimples aberto={!!editPeca} titulo={editPeca?.id ? 'Editar tipo de peça' : 'Novo tipo de peça'} salvando={salvando} onClose={() => setEditPeca(null)}
        campos={[{ k: 'nome', rotulo: 'Nome *', valor: editPeca?.nome || '' }, { k: 'categoria', rotulo: 'Categoria', valor: editPeca?.categoria || '', sugestoes: [...new Set(pecasCatalogo.map(p => p.categoria))] }]}
        onSalvar={v => executar(() => salvarPeca({ id: editPeca?.id, nome: v.nome, categoria: v.categoria, icone: editPeca?.icone }), 'Peça salva', () => setEditPeca(null))} />
      {/* formulário de material */}
      <FormMaterial valor={editMat} salvando={salvando} onClose={() => setEditMat(null)}
        onSalvar={v => executar(() => salvarMaterial(v), 'Material salvo', () => setEditMat(null))} />

      <ConfirmSheet open={!!apagar} onClose={() => setApagar(null)} danger confirmLabel="Excluir" loading={salvando}
        title={`Excluir “${apagar?.nome}”?`}
        text="Ele deixa de aparecer nas opções. Ordens antigas que já usaram este item não mudam."
        onConfirm={() => apagar && executar(() => apagar.tipo === 'servicos' ? excluirServico(apagar.id) : apagar.tipo === 'pecas' ? excluirPeca(apagar.id) : excluirMaterial(apagar.id), 'Excluído', () => setApagar(null))} />
    </Page>
  );
}

function FormServico({ valor, categorias, salvando, onClose, onSalvar }: { valor: Partial<ServicoCadastro> | null; categorias: string[]; salvando: boolean; onClose: () => void; onSalvar: (v: Partial<ServicoCadastro>) => void }) {
  const [f, setF] = useState({ titulo: '', preco: '', categoria: '', nova: '', duracao: '' });
  useEffect(() => { if (valor) setF({ titulo: valor.titulo || '', preco: numTxt(valor.preco || 0), categoria: valor.categoria || '', nova: '', duracao: valor.duracao ? String(valor.duracao) : '' }); }, [valor]);
  const salvar = () => {
    if (!f.titulo.trim()) return;
    onSalvar({ id: valor?.id, titulo: f.titulo, preco: num(f.preco), categoria: (f.categoria === '__nova' ? f.nova : f.categoria).trim().toLowerCase(), duracao: f.duracao ? Number(f.duracao) : null, descricaoBruta: valor?.descricaoBruta ?? null });
  };
  return (
    <Sheet open={!!valor} onClose={onClose} title={valor?.id ? 'Editar serviço' : 'Novo serviço'} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={salvar} loading={salvando} disabled={!f.titulo.trim()}>Salvar</Button></div>}>
      <div className="space-y-4">
        <Field label="Nome do serviço *"><Input autoFocus value={f.titulo} onChange={e => setF({ ...f, titulo: e.target.value })} placeholder="Ex.: Barra de calça" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Preço padrão (R$)"><Input inputMode="decimal" value={f.preco} onChange={e => setF({ ...f, preco: e.target.value })} placeholder="0,00" /></Field>
          <Field label="Tempo médio (min)"><Input inputMode="numeric" value={f.duracao} onChange={e => setF({ ...f, duracao: e.target.value.replace(/\D/g, '') })} placeholder="30" /></Field>
        </div>
        <Field label="Categoria">
          <Select value={f.categoria} onChange={e => setF({ ...f, categoria: e.target.value })}>
            <option value="">Sem categoria</option>
            {categorias.map(c => <option key={c} value={c}>{cap(c)}</option>)}
            <option value="__nova">+ Nova categoria…</option>
          </Select>
        </Field>
        {f.categoria === '__nova' && <Field label="Nome da nova categoria"><Input value={f.nova} onChange={e => setF({ ...f, nova: e.target.value })} /></Field>}
      </div>
    </Sheet>
  );
}

function FormMaterial({ valor, salvando, onClose, onSalvar }: { valor: Partial<Material> | null; salvando: boolean; onClose: () => void; onSalvar: (v: { id?: string; nome: string; unidade: string; preco: number; estoque: number }) => void }) {
  const [f, setF] = useState({ nome: '', unidade: 'unidade', preco: '', estoque: '' });
  useEffect(() => { if (valor) setF({ nome: valor.nome || '', unidade: valor.unidade || 'unidade', preco: numTxt(valor.preco || 0), estoque: valor.estoque ? String(valor.estoque).replace('.', ',') : '' }); }, [valor]);
  return (
    <Sheet open={!!valor} onClose={onClose} title={valor?.id ? 'Editar material' : 'Novo material'} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={salvando} disabled={!f.nome.trim()} onClick={() => onSalvar({ id: valor?.id, nome: f.nome, unidade: f.unidade, preco: num(f.preco), estoque: num(f.estoque) })}>Salvar</Button></div>}>
      <div className="space-y-4">
        <Field label="Nome do material *"><Input autoFocus value={f.nome} onChange={e => setF({ ...f, nome: e.target.value })} placeholder="Ex.: Linha branca" /></Field>
        <Field label="Unidade"><Select value={f.unidade} onChange={e => setF({ ...f, unidade: e.target.value })}>{[...new Set([...UNIDADES, f.unidade])].map(u => <option key={u} value={u}>{cap(u)}</option>)}</Select></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Valor por unidade (R$)"><Input inputMode="decimal" value={f.preco} onChange={e => setF({ ...f, preco: e.target.value })} placeholder="0,00" /></Field>
          <Field label="Estoque"><Input inputMode="decimal" value={f.estoque} onChange={e => setF({ ...f, estoque: e.target.value })} placeholder="0" /></Field>
        </div>
      </div>
    </Sheet>
  );
}

function FormSimples({ aberto, titulo, campos, salvando, onClose, onSalvar }: { aberto: boolean; titulo: string; campos: Array<{ k: string; rotulo: string; valor: string; sugestoes?: string[] }>; salvando: boolean; onClose: () => void; onSalvar: (v: Record<string, string>) => void }) {
  const [v, setV] = useState<Record<string, string>>({});
  useEffect(() => { if (aberto) setV(Object.fromEntries(campos.map(c => [c.k, c.valor]))); }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps
  const ok = !!(v[campos[0].k] || '').trim();
  return (
    <Sheet open={aberto} onClose={onClose} title={titulo} footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button loading={salvando} disabled={!ok} onClick={() => onSalvar(v)}>Salvar</Button></div>}>
      <div className="space-y-4">
        {campos.map((c, i) => (
          <Field key={c.k} label={c.rotulo}>
            <Input autoFocus={i === 0} value={v[c.k] || ''} onChange={e => setV({ ...v, [c.k]: e.target.value })} list={c.sugestoes ? `sug-${c.k}` : undefined} />
            {c.sugestoes && <datalist id={`sug-${c.k}`}>{c.sugestoes.map(s => <option key={s} value={s} />)}</datalist>}
          </Field>
        ))}
        {campos[0].k === 'nome' && (v.nome || '').trim() && <div className="flex items-center gap-2 text-sm text-at-muted"><PecaIcone nome={v.nome} /> Ícone que vai aparecer</div>}
      </div>
    </Sheet>
  );
}
