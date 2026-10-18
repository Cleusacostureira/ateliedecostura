import type { ReactNode } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from 'recharts';
import { cx } from './index';

/** Paleta validada (daltonismo e contraste): vinho, azul, ocre — sempre nesta ordem. */
export const CORES_GRAFICO = ['#9B2C3E', '#1F7FB8', '#B07A1E'];

const brl = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCurto = (v: number) => {
  const n = Number(v) || 0;
  if (Math.abs(n) >= 1000) return 'R$ ' + (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mil';
  return 'R$ ' + n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
};

export type Serie = { chave: string; nome: string; cor?: string };

function Dica({ active, payload, label, series, formato }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white/95 backdrop-blur border border-at-line rounded-xl shadow-lift px-3 py-2 text-xs">
      <div className="font-medium text-at-ink mb-1">{label}</div>
      {payload.map((p: any) => {
        const s = (series as Serie[]).find(x => x.chave === p.dataKey);
        return (
          <div key={p.dataKey} className="flex items-center gap-2 text-at-ink">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ background: p.color }} />
            <span className="text-at-muted">{s?.nome || p.dataKey}</span>
            <span className="ml-auto font-medium tabular-nums">{formato === 'num' ? p.value : brl(p.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

function Legenda({ series }: { series: Serie[] }) {
  if (series.length < 2) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-at-muted mb-2">
      {series.map((s, i) => (
        <span key={s.chave} className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.cor || CORES_GRAFICO[i] }} />{s.nome}
        </span>
      ))}
    </div>
  );
}

export function GraficoBarras({ dados, series, eixoX = 'rotulo', altura = 240, formato = 'brl', empilhado }: {
  dados: any[]; series: Serie[]; eixoX?: string; altura?: number; formato?: 'brl' | 'num'; empilhado?: boolean;
}) {
  return (
    <div>
      <Legenda series={series} />
      <div style={{ height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="22%" barGap={2}>
            <CartesianGrid vertical={false} stroke="#ECE3DA" strokeDasharray="0" />
            <XAxis dataKey={eixoX} tickLine={false} axisLine={false} tick={{ fill: '#8C7B7F', fontSize: 11 }} interval="preserveStartEnd" minTickGap={8} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#8C7B7F', fontSize: 11 }} width={formato === 'num' ? 32 : 64} tickFormatter={formato === 'num' ? undefined : brlCurto} allowDecimals={formato !== 'num'} />
            <Tooltip cursor={{ fill: 'rgba(155,44,62,0.06)' }} content={<Dica series={series} formato={formato} />} />
            {series.map((s, i) => (
              <Bar key={s.chave} dataKey={s.chave} name={s.nome} fill={s.cor || CORES_GRAFICO[i]} stackId={empilhado ? 'a' : undefined}
                radius={empilhado && i < series.length - 1 ? [0, 0, 0, 0] : [4, 4, 0, 0]} maxBarSize={36} stroke={empilhado ? '#fff' : undefined} strokeWidth={empilhado ? 1 : 0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function GraficoArea({ dados, series, eixoX = 'rotulo', altura = 240, formato = 'brl' }: {
  dados: any[]; series: Serie[]; eixoX?: string; altura?: number; formato?: 'brl' | 'num';
}) {
  return (
    <div>
      <Legenda series={series} />
      <div style={{ height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={dados} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              {series.map((s, i) => (
                <linearGradient key={s.chave} id={`g-${s.chave}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.cor || CORES_GRAFICO[i]} stopOpacity={0.22} />
                  <stop offset="100%" stopColor={s.cor || CORES_GRAFICO[i]} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} stroke="#ECE3DA" />
            <XAxis dataKey={eixoX} tickLine={false} axisLine={false} tick={{ fill: '#8C7B7F', fontSize: 11 }} interval="preserveStartEnd" minTickGap={8} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#8C7B7F', fontSize: 11 }} width={formato === 'num' ? 32 : 64} tickFormatter={formato === 'num' ? undefined : brlCurto} />
            <Tooltip cursor={{ stroke: '#C9767F', strokeWidth: 1 }} content={<Dica series={series} formato={formato} />} />
            {series.map((s, i) => (
              <Area key={s.chave} type="monotone" dataKey={s.chave} name={s.nome} stroke={s.cor || CORES_GRAFICO[i]} strokeWidth={2}
                fill={`url(#g-${s.chave})`} dot={false} activeDot={{ r: 4, stroke: '#fff', strokeWidth: 2 }} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Lista com barra horizontal (ranking). */
export function Ranking({ itens, formato = 'num', vazio = 'Sem dados no período' }: {
  itens: Array<{ nome: ReactNode; valor: number; detalhe?: ReactNode; chave: string }>; formato?: 'brl' | 'num'; vazio?: string;
}) {
  if (!itens.length) return <p className="text-sm text-at-muted py-6 text-center">{vazio}</p>;
  const max = Math.max(...itens.map(i => i.valor), 1);
  return (
    <div className="space-y-3">
      {itens.map((it, i) => (
        <div key={it.chave}>
          <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
            <span className="text-at-ink truncate"><span className="text-at-muted tabular-nums mr-1.5">{i + 1}.</span>{it.nome}</span>
            <span className="shrink-0 font-medium text-at-ink tabular-nums">{formato === 'brl' ? brl(it.valor) : it.valor.toLocaleString('pt-BR')}{it.detalhe && <span className="text-at-muted font-normal ml-1.5">{it.detalhe}</span>}</span>
          </div>
          <div className="h-1.5 rounded-full bg-at-soft overflow-hidden">
            <div className="h-full rounded-full bg-[#9B2C3E]" style={{ width: `${Math.max(2, (it.valor / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Cartão de indicador com variação contra o período anterior. */
export function Indicador({ rotulo, valor, anterior, formato = 'brl', icone, destaque, inverso, rodape, onClick, ativo }: {
  rotulo: string; valor: number; anterior?: number; formato?: 'brl' | 'num' | 'pct'; icone?: ReactNode; destaque?: boolean;
  inverso?: boolean; rodape?: ReactNode; onClick?: () => void; ativo?: boolean;
}) {
  const fmt = (v: number) => formato === 'brl' ? brl(v) : formato === 'pct' ? `${(v * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%` : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
  let variacao: ReactNode = null;
  if (anterior !== undefined) {
    if (anterior === 0 && valor === 0) variacao = <span className="text-at-muted">sem movimento</span>;
    else if (anterior === 0) variacao = <span className="text-at-muted">sem base anterior</span>;
    else {
      const pct = (valor - anterior) / Math.abs(anterior);
      const bom = inverso ? pct <= 0 : pct >= 0;
      variacao = <span className={bom ? 'text-emerald-700' : 'text-red-700'}>{pct >= 0 ? '▲' : '▼'} {Math.abs(pct * 100).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}% <span className="text-at-muted">vs. mesmo trecho anterior</span></span>;
    }
  }
  const Tag: any = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={cx('w-full text-left rounded-2xl border p-4 transition-all', destaque ? 'bg-at-wine border-at-wine text-white shadow-lift' : 'bg-white border-at-line shadow-soft', onClick && 'hover:shadow-lift cursor-pointer', ativo && !destaque && 'ring-2 ring-at-rose')}>
      <div className={cx('flex items-center gap-2 text-xs font-medium', destaque ? 'text-white/80' : 'text-at-muted')}>{icone}{rotulo}</div>
      <div className={cx('font-display text-2xl mt-1.5 tabular-nums', destaque ? 'text-white' : 'text-at-ink')}>{fmt(valor)}</div>
      {(variacao || rodape) && <div className={cx('text-xs mt-1', destaque && '[&_*]:!text-white/85 text-white/85')}>{variacao}{variacao && rodape ? ' · ' : ''}{rodape}</div>}
    </Tag>
  );
}
