import type { Ordem, StatusOrdem } from './types';

export const dinheiro = (v: number) => (Number(v) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function somarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number);
  const dt = new Date(a, m - 1, d + dias);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}

export function dataCurta(iso: string | null | undefined): string {
  if (!iso) return '—';
  const s = String(iso).slice(0, 10);
  const [a, m, d] = s.split('-');
  if (!a || !m || !d) return String(iso);
  return `${d}/${m}/${a}`;
}

/** Data local (para datas com hora, como created_at). */
export function dataLocal(iso: string | null | undefined): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (isNaN(dt.getTime())) return dataCurta(iso);
  return dt.toLocaleDateString('pt-BR');
}

export function diasAte(iso: string): number {
  const [a, m, d] = iso.split('-').map(Number);
  const alvo = new Date(a, m - 1, d).getTime();
  const [ha, hm, hd] = hoje().split('-').map(Number);
  return Math.round((alvo - new Date(ha, hm - 1, hd).getTime()) / 86_400_000);
}

export const emAberto = (o: Ordem) => o.status !== 'Retirado';
export const atrasada = (o: Ordem) => !!o.entrega && (o.status === 'Recebido' || o.status === 'Em costura') && diasAte(o.entrega) < 0;

export function prazo(o: Ordem): { texto: string; tom: 'red' | 'amber' | 'blue' | 'gray' } {
  if (!o.entrega) return { texto: 'Sem prazo', tom: 'gray' };
  if (o.status === 'Retirado') return { texto: dataCurta(o.entrega), tom: 'gray' };
  const n = diasAte(o.entrega);
  if (o.status === 'Pronto') return { texto: n < 0 ? `Pronta desde ${dataCurta(o.entrega)}` : `Entrega ${dataCurta(o.entrega)}`, tom: 'gray' };
  if (n < 0) return { texto: n === -1 ? 'Atrasada 1 dia' : `Atrasada ${-n} dias`, tom: 'red' };
  if (n === 0) return { texto: 'Entrega hoje', tom: 'amber' };
  if (n === 1) return { texto: 'Entrega amanhã', tom: 'blue' };
  return { texto: `Entrega ${dataCurta(o.entrega)}`, tom: 'gray' };
}

export const STATUS_VISUAL: Record<StatusOrdem, { tom: 'blue' | 'amber' | 'green' | 'gray'; ponto: string; acao: string | null }> = {
  'Recebido': { tom: 'blue', ponto: 'bg-sky-500', acao: 'Começar costura' },
  'Em costura': { tom: 'amber', ponto: 'bg-amber-500', acao: 'Marcar como pronta' },
  'Pronto': { tom: 'green', ponto: 'bg-emerald-500', acao: 'Entregar' },
  'Retirado': { tom: 'gray', ponto: 'bg-stone-400', acao: null },
};

export const ROTULO_STATUS: Record<StatusOrdem, string> = {
  'Recebido': 'Recebida',
  'Em costura': 'Em costura',
  'Pronto': 'Pronta',
  'Retirado': 'Entregue',
};

export const proximoStatus = (s: StatusOrdem): StatusOrdem | null =>
  s === 'Recebido' ? 'Em costura' : s === 'Em costura' ? 'Pronto' : s === 'Pronto' ? 'Retirado' : null;

export function telefoneBonito(t: string | null | undefined): string {
  const d = String(t || '').replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return t || '';
}

export function linkWhatsApp(telefone: string | null | undefined, texto: string): string | null {
  let d = String(telefone || '').replace(/\D/g, '');
  if (d.length < 10) return null;
  if (!d.startsWith('55') || d.length <= 11) d = '55' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
}

export const iniciais = (nome: string) =>
  nome.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase() || '').join('') || '?';

export const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
