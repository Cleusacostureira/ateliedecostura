import { ChevronRight, Inbox, Scissors, PackageCheck, CheckCheck, AlertTriangle } from 'lucide-react';
import { Badge, cx } from '../../ui';
import { atrasada, dinheiro, prazo, ROTULO_STATUS, STATUS_VISUAL } from '../../data/formato';
import type { Ordem, StatusOrdem } from '../../data/types';
import PecaIcone from '../../ui/PecaIcone';

/** Aparência de cada etapa: cor da faixa, do bloco do número e ícone. */
export const ESTILO_ETAPA: Record<StatusOrdem, { faixa: string; bloco: string; texto: string; icone: typeof Inbox; titulo: string }> = {
  'Recebido':   { faixa: 'bg-sky-400',     bloco: 'bg-sky-50',     texto: 'text-sky-700',     icone: Inbox,        titulo: 'Recebidas — aguardando costura' },
  'Em costura': { faixa: 'bg-amber-400',   bloco: 'bg-amber-50',   texto: 'text-amber-700',   icone: Scissors,     titulo: 'Em costura' },
  'Pronto':     { faixa: 'bg-emerald-500', bloco: 'bg-emerald-50', texto: 'text-emerald-700', icone: PackageCheck, titulo: 'Prontas — aguardando retirada' },
  'Retirado':   { faixa: 'bg-stone-300',   bloco: 'bg-stone-100',  texto: 'text-stone-500',   icone: CheckCheck,   titulo: 'Entregues' },
};

export function StatusBadge({ status }: { status: Ordem['status'] }) {
  const v = STATUS_VISUAL[status];
  return (
    <Badge tone={v.tom}>
      <span className={cx('w-1.5 h-1.5 rounded-full', v.ponto)} />
      {ROTULO_STATUS[status]}
    </Badge>
  );
}

export function PagamentoBadge({ pago }: { pago: boolean }) {
  return pago ? <Badge tone="green">Pago</Badge> : <Badge tone="wine">A receber</Badge>;
}

function gruposDePecas(o: Ordem) {
  const grupos = new Map<string, number>();
  o.pecas.forEach(p => grupos.set(p.tipo, (grupos.get(p.tipo) || 0) + 1));
  return [...grupos.entries()];
}

export function resumoPecas(o: Ordem) {
  if (o.pecas.length === 0) return 'Sem peças';
  return gruposDePecas(o).map(([tipo, n]) => `${n > 1 ? n + '× ' : ''}${tipo}`).join(' · ');
}

/** Ícones das peças (até 3) + resumo em texto. */
export function PecasResumo({ ordem }: { ordem: Ordem }) {
  const g = gruposDePecas(ordem);
  return (
    <div className="flex items-center gap-2 min-w-0 mt-1">
      {g.length > 0 && (
        <div className="flex -space-x-1.5 shrink-0">
          {g.slice(0, 3).map(([tipo]) => <PecaIcone key={tipo} nome={tipo} tamanho="sm" className="ring-2 ring-white" />)}
        </div>
      )}
      <span className="text-sm text-at-muted truncate">{resumoPecas(ordem)}</span>
    </div>
  );
}

export default function OrdemCard({ ordem, nomeCliente, onClick, extra }: { ordem: Ordem; nomeCliente?: string; onClick: () => void; extra?: React.ReactNode }) {
  const p = prazo(ordem);
  const e = ESTILO_ETAPA[ordem.status];
  const Icone = e.icone;
  const late = atrasada(ordem);
  const entregue = ordem.status === 'Retirado';
  return (
    <div onClick={onClick} role="button" tabIndex={0} onKeyDown={ev => { if (ev.key === 'Enter') onClick(); }}
      className={cx(
        'group relative overflow-hidden rounded-2xl border shadow-soft hover:shadow-lift transition-all cursor-pointer flex items-stretch',
        entregue ? 'bg-white/70 border-at-line' : 'bg-white border-at-line hover:border-at-nude',
        late && 'ring-2 ring-red-300 border-red-200',
      )}>
      {/* faixa colorida da etapa */}
      <span className={cx('w-1.5 shrink-0', late ? 'bg-red-500' : e.faixa)} aria-hidden />

      {/* bloco do número com ícone da etapa */}
      <div className={cx('shrink-0 w-16 flex flex-col items-center justify-center gap-1 py-3', e.bloco)}>
        <Icone className={cx('w-4 h-4', e.texto)} strokeWidth={2} />
        <div className={cx('font-display text-lg leading-none', entregue ? 'text-stone-500' : 'text-at-wine')}>{ordem.numero}</div>
        <div className={cx('text-[9px] font-semibold uppercase tracking-wide', e.texto)}>{ROTULO_STATUS[ordem.status]}</div>
      </div>

      <div className="min-w-0 flex-1 p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {nomeCliente !== undefined && <div className={cx('font-medium truncate', entregue ? 'text-at-ink/70' : 'text-at-ink')}>{nomeCliente || 'Cliente não informada'}</div>}
            <PecasResumo ordem={ordem} />
          </div>
          <div className={cx('font-semibold shrink-0', entregue ? 'text-at-ink/70' : 'text-at-ink')}>{dinheiro(ordem.total)}</div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          {late && <Badge tone="red"><AlertTriangle className="w-3 h-3" />{p.texto}</Badge>}
          {!late && <Badge tone={p.tom}>{p.texto}</Badge>}
          <PagamentoBadge pago={ordem.pago} />
          {extra}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-at-muted/50 group-hover:text-at-wine self-center shrink-0 hidden sm:block mr-3" />
    </div>
  );
}
