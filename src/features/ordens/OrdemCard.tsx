import { ChevronRight } from 'lucide-react';
import { Badge, cx } from '../../ui';
import { dinheiro, prazo, ROTULO_STATUS, STATUS_VISUAL } from '../../data/formato';
import type { Ordem } from '../../data/types';

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

export function resumoPecas(o: Ordem) {
  if (o.pecas.length === 0) return 'Sem peças';
  const grupos = new Map<string, { n: number; icone?: string }>();
  o.pecas.forEach(p => {
    const g = grupos.get(p.tipo) || { n: 0, icone: p.icone };
    g.n += 1;
    grupos.set(p.tipo, g);
  });
  return [...grupos.entries()].map(([tipo, g]) => `${g.icone || ''} ${g.n > 1 ? g.n + '× ' : ''}${tipo}`.trim()).join(' · ');
}

export default function OrdemCard({ ordem, nomeCliente, onClick, extra }: { ordem: Ordem; nomeCliente?: string; onClick: () => void; extra?: React.ReactNode }) {
  const p = prazo(ordem);
  return (
    <div onClick={onClick} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onClick(); }}
      className="group bg-white rounded-2xl border border-at-line shadow-soft hover:border-at-nude hover:shadow-lift transition-all cursor-pointer p-4 flex gap-3 items-start">
      <div className="shrink-0 w-14 text-center">
        <div className="text-[10px] uppercase tracking-wider text-at-muted">OS</div>
        <div className="font-display text-lg text-at-wine leading-tight">{ordem.numero}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {nomeCliente !== undefined && <div className="font-medium text-at-ink truncate">{nomeCliente || 'Cliente não informada'}</div>}
            <div className="text-sm text-at-muted truncate">{resumoPecas(ordem)}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-semibold text-at-ink">{dinheiro(ordem.total)}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
          <StatusBadge status={ordem.status} />
          <PagamentoBadge pago={ordem.pago} />
          <Badge tone={p.tom}>{p.texto}</Badge>
          {extra}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-at-muted/50 group-hover:text-at-wine self-center shrink-0 hidden sm:block" />
    </div>
  );
}
