import { useEffect, useMemo, useState } from 'react';
import { Check, Minus, Plus, Search, X } from 'lucide-react';
import { Button, Field, Input, Sheet, cx } from '../../ui';
import { useDados } from '../../data/store';
import { dinheiro, semAcento } from '../../data/formato';
import type { Peca, ServicoPeca } from '../../data/types';
import { PecaSvg } from '../../ui/PecaIcone';

export const CORES: Record<string, string> = {
  Preto: '#111111', Branco: '#FFFFFF', Cinza: '#9CA3AF', Azul: '#3B82F6', 'Azul marinho': '#1E3A8A', Jeans: '#5B7DB1',
  Vermelho: '#EF4444', Verde: '#10B981', Amarelo: '#F59E0B', Rosa: '#EC4899', Bege: '#F5DEB3', Marrom: '#8B4513',
  Vinho: '#7F1D1D', Roxo: '#7C3AED', Laranja: '#FB923C', Estampado: 'conic-gradient(#EC4899,#F59E0B,#10B981,#3B82F6,#EC4899)',
};

const novoId = () => `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Monta e edita uma peça: tipo, cor, modelo e serviços. */
export default function PecaSheet({ open, onClose, peca, onSalvar }: {
  open: boolean;
  onClose: () => void;
  peca?: Peca | null;
  onSalvar: (pecas: Peca[]) => void;
}) {
  const { pecasCatalogo, servicos, ordens } = useDados();
  const [tipo, setTipo] = useState('');
  const [icone, setIcone] = useState('🧵');
  const [cor, setCor] = useState('');
  const [modelo, setModelo] = useState('');
  const [servs, setServs] = useState<ServicoPeca[]>([]);
  const [qtd, setQtd] = useState(1);
  const [buscaTipo, setBuscaTipo] = useState('');
  const [buscaServ, setBuscaServ] = useState('');
  const [novoServ, setNovoServ] = useState({ nome: '', preco: '' });

  useEffect(() => {
    if (!open) return;
    setTipo(peca?.tipo || ''); setIcone(peca?.icone || '🧵'); setCor(peca?.cor || ''); setModelo(peca?.modelo || '');
    setServs(peca?.services ? peca.services.map(s => ({ ...s })) : []); setQtd(1);
    setBuscaTipo(''); setBuscaServ(''); setNovoServ({ nome: '', preco: '' });
  }, [open, peca]);

  // O que mais se usa no ateliê aparece primeiro
  const uso = useMemo(() => {
    const tipos = new Map<string, number>(), serv = new Map<string, { n: number; preco: Map<number, number> }>();
    ordens.forEach(o => o.pecas.forEach(p => {
      tipos.set(p.tipo, (tipos.get(p.tipo) || 0) + 1);
      p.services.forEach(s => {
        const k = semAcento(s.name.trim());
        const e = serv.get(k) || { n: 0, preco: new Map() };
        e.n += 1; e.preco.set(s.price, (e.preco.get(s.price) || 0) + 1);
        serv.set(k, e);
      });
    }));
    return { tipos, serv };
  }, [ordens]);

  const tiposOrdenados = useMemo(() => {
    const q = semAcento(buscaTipo.trim());
    return pecasCatalogo
      .filter(p => !q || semAcento(p.nome).includes(q))
      .sort((a, b) => (uso.tipos.get(b.nome) || 0) - (uso.tipos.get(a.nome) || 0) || a.nome.localeCompare(b.nome));
  }, [pecasCatalogo, uso, buscaTipo]);

  const servicosOrdenados = useMemo(() => {
    const vistos = new Set<string>();
    const q = semAcento(buscaServ.trim());
    return servicos
      .filter(s => { const k = semAcento(s.titulo); if (vistos.has(k)) return false; vistos.add(k); return !q || k.includes(q); })
      .map(s => {
        const u = uso.serv.get(semAcento(s.titulo));
        // preço mais usado na prática, senão o do cadastro
        const precoComum = u ? [...u.preco.entries()].sort((a, b) => b[1] - a[1])[0][0] : s.preco;
        return { ...s, n: u?.n || 0, precoSugerido: s.preco || precoComum };
      })
      .sort((a, b) => b.n - a.n || a.titulo.localeCompare(b.titulo));
  }, [servicos, uso, buscaServ]);

  const marcado = (titulo: string) => servs.some(s => semAcento(s.name.trim()) === semAcento(titulo));
  function alternarServ(s: { id: string; titulo: string; precoSugerido: number }) {
    setServs(l => marcado(s.titulo) ? l.filter(x => semAcento(x.name.trim()) !== semAcento(s.titulo)) : [...l, { id: s.id, name: s.titulo, price: s.precoSugerido }]);
  }
  function addServPersonalizado() {
    const nome = novoServ.nome.trim();
    if (!nome) return;
    setServs(l => [...l, { id: `s-${Date.now()}`, name: nome, price: Number(String(novoServ.preco).replace(',', '.')) || 0 }]);
    setNovoServ({ nome: '', preco: '' });
  }

  const subtotal = servs.reduce((a, s) => a + (Number(s.price) || 0), 0);
  const podeSalvar = !!tipo.trim() && servs.length > 0;

  function salvar() {
    if (!podeSalvar) return;
    const base: Omit<Peca, 'id'> = { tipo: tipo.trim(), cor: cor.trim(), icone, ...(modelo.trim() ? { modelo: modelo.trim() } : {}), services: servs.map(s => ({ ...s, price: Number(s.price) || 0 })) };
    if (peca) onSalvar([{ ...base, id: peca.id }]);
    else onSalvar(Array.from({ length: qtd }, () => ({ ...base, id: novoId(), services: base.services.map(s => ({ ...s })) })));
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} wide title={peca ? 'Editar peça' : 'Adicionar peça'} footer={
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm">
          <div className="text-at-muted text-xs">{!peca && qtd > 1 ? `${qtd} peças × ${dinheiro(subtotal)}` : 'Subtotal'}</div>
          <div className="font-semibold text-at-ink">{dinheiro(subtotal * (peca ? 1 : qtd))}</div>
        </div>
        <Button onClick={salvar} disabled={!podeSalvar}><Check className="w-4 h-4" /> {peca ? 'Salvar peça' : 'Adicionar'}</Button>
      </div>
    }>
      {/* 1. Tipo */}
      <Secao n={1} titulo="Qual peça?" valor={tipo || undefined} onLimpar={() => setTipo('')}>
        {!tipo && <>
          <div className="relative mb-2.5">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-at-muted" />
            <Input value={buscaTipo} onChange={e => setBuscaTipo(e.target.value)} placeholder="Buscar peça (ex.: calça, vestido)" className="pl-9 h-10" />
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-56 overflow-y-auto pr-1">
            {tiposOrdenados.map(p => (
              <button key={p.id} type="button" onClick={() => { setTipo(p.nome); setIcone(p.icone); }}
                className="flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl bg-white border border-at-line hover:border-at-rose hover:bg-at-blush/40 text-xs text-at-ink transition">
                <PecaSvg nome={p.nome} className="w-7 h-7 text-at-wine" /><span className="leading-tight text-center">{p.nome}</span>
              </button>
            ))}
            {buscaTipo.trim() && (
              <button type="button" onClick={() => { setTipo(buscaTipo.trim()); setIcone('🧵'); }}
                className="flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-xl border border-dashed border-at-rose text-xs text-at-wine">
                <Plus className="w-4 h-4" /> Usar “{buscaTipo.trim()}”
              </button>
            )}
          </div>
        </>}
      </Secao>

      {/* 2. Cor */}
      <Secao n={2} titulo="Cor" valor={cor || undefined} onLimpar={() => setCor('')} opcional>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(CORES).map(([nome, hex]) => (
            <button key={nome} type="button" onClick={() => setCor(nome === cor ? '' : nome)}
              className={cx('h-8 pl-1.5 pr-2.5 rounded-full border text-xs flex items-center gap-1.5 transition', cor === nome ? 'border-at-wine bg-at-blush text-at-wine' : 'border-at-line bg-white text-at-ink hover:border-at-nude')}>
              <span className="w-5 h-5 rounded-full border border-black/10" style={{ background: hex }} />{nome}
            </button>
          ))}
        </div>
        <Input value={CORES[cor] ? '' : cor} onChange={e => setCor(e.target.value)} placeholder="Outra cor..." className="mt-2 h-10" />
      </Secao>

      {/* 3. Serviços */}
      <Secao n={3} titulo="Serviços" valor={servs.length ? `${servs.length} selecionado${servs.length > 1 ? 's' : ''}` : undefined}>
        {servs.length > 0 && (
          <div className="rounded-xl bg-white border border-at-line divide-y divide-at-line mb-3">
            {servs.map((s, i) => (
              <div key={s.id + i} className="flex items-center gap-2 px-3 py-2">
                <span className="flex-1 text-sm text-at-ink">{s.name}</span>
                <span className="text-xs text-at-muted">R$</span>
                <input inputMode="decimal" value={String(s.price)} onChange={e => { const v = e.target.value.replace(',', '.'); setServs(l => l.map((x, j) => j === i ? { ...x, price: v as any /* texto enquanto digita; vira número ao salvar */ } : x)); }}
                  className="w-20 h-9 rounded-lg border border-at-line px-2 text-right text-sm focus:outline-none focus:border-at-rose" aria-label={`Preço de ${s.name}`} />
                <button type="button" onClick={() => setServs(l => l.filter((_, j) => j !== i))} className="w-8 h-8 flex items-center justify-center rounded-lg text-at-muted hover:text-red-700 hover:bg-red-50" aria-label="Remover serviço"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="relative mb-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-at-muted" />
          <Input value={buscaServ} onChange={e => setBuscaServ(e.target.value)} placeholder="Buscar serviço (ex.: barra, ajuste)" className="pl-9 h-10" />
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
          {servicosOrdenados.map(s => (
            <button key={s.id} type="button" onClick={() => alternarServ(s)}
              className={cx('h-9 px-3 rounded-full border text-xs flex items-center gap-1.5 transition', marcado(s.titulo) ? 'bg-at-wine border-at-wine text-white' : 'bg-white border-at-line text-at-ink hover:border-at-nude')}>
              {marcado(s.titulo) && <Check className="w-3.5 h-3.5" />}{s.titulo}<span className={marcado(s.titulo) ? 'text-white/70' : 'text-at-muted'}>{dinheiro(s.precoSugerido)}</span>
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <Input value={novoServ.nome} onChange={e => setNovoServ(v => ({ ...v, nome: e.target.value }))} placeholder="Outro serviço" className="h-10 flex-1 min-w-0" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addServPersonalizado(); } }} />
          <Input value={novoServ.preco} onChange={e => setNovoServ(v => ({ ...v, preco: e.target.value }))} placeholder="R$" inputMode="decimal" className="h-10 !w-24 shrink-0" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addServPersonalizado(); } }} />
          <Button type="button" variant="secondary" className="h-10" onClick={addServPersonalizado} disabled={!novoServ.nome.trim()}><Plus className="w-4 h-4" /></Button>
        </div>
      </Secao>

      {/* 4. Detalhes */}
      <Secao n={4} titulo="Modelo / observação da peça" opcional>
        <Input value={modelo} onChange={e => setModelo(e.target.value)} placeholder="Ex.: barra com 2 cm, manter barra original" className="h-10" />
        {!peca && (
          <Field label="Quantidade de peças iguais" className="mt-3">
            <div className="inline-flex items-center gap-1 rounded-xl border border-at-line bg-white p-1">
              <button type="button" onClick={() => setQtd(q => Math.max(1, q - 1))} className="w-9 h-9 rounded-lg hover:bg-at-soft flex items-center justify-center" aria-label="Menos"><Minus className="w-4 h-4" /></button>
              <span className="w-8 text-center font-semibold">{qtd}</span>
              <button type="button" onClick={() => setQtd(q => Math.min(30, q + 1))} className="w-9 h-9 rounded-lg hover:bg-at-soft flex items-center justify-center" aria-label="Mais"><Plus className="w-4 h-4" /></button>
            </div>
          </Field>
        )}
      </Secao>
    </Sheet>
  );
}

function Secao({ n, titulo, valor, onLimpar, opcional, children }: { n: number; titulo: string; valor?: string; onLimpar?: () => void; opcional?: boolean; children: React.ReactNode }) {
  return (
    <section className="mb-5 last:mb-1">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={cx('w-6 h-6 rounded-full text-xs font-semibold flex items-center justify-center', valor ? 'bg-at-wine text-white' : 'bg-at-soft text-at-muted')}>{valor ? <Check className="w-3.5 h-3.5" /> : n}</span>
          <span className="font-medium text-at-ink text-sm">{titulo}</span>
          {opcional && !valor && <span className="text-xs text-at-muted">(opcional)</span>}
        </div>
        {valor && (
          <span className="flex items-center gap-1.5 text-sm text-at-wine font-medium">
            {valor}
            {onLimpar && <button type="button" onClick={onLimpar} className="text-xs text-at-muted underline underline-offset-2 font-normal">trocar</button>}
          </span>
        )}
      </div>
      {children}
    </section>
  );
}
