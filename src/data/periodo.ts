export type TipoPeriodo = 'semana' | 'mes' | 'trimestre' | 'ano';

export type Periodo = { inicio: Date; fim: Date; rotulo: string; tipo: TipoPeriodo };

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Período atual (deslocamento 0) ou anteriores (-1, -2...). Fim é exclusivo. */
export function periodo(tipo: TipoPeriodo, desloc = 0): Periodo {
  const h = new Date(); h.setHours(0, 0, 0, 0);
  if (tipo === 'semana') {
    const i = new Date(h); i.setDate(h.getDate() - ((h.getDay() + 6) % 7) + desloc * 7);
    const f = new Date(i); f.setDate(i.getDate() + 7);
    const ult = new Date(f.getTime() - 86_400_000);
    return { tipo, inicio: i, fim: f, rotulo: `${i.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${ult.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}` };
  }
  if (tipo === 'mes') {
    const i = new Date(h.getFullYear(), h.getMonth() + desloc, 1);
    return { tipo, inicio: i, fim: new Date(i.getFullYear(), i.getMonth() + 1, 1), rotulo: `${cap(MESES[i.getMonth()])} de ${i.getFullYear()}` };
  }
  if (tipo === 'trimestre') {
    const q = Math.floor(h.getMonth() / 3) + desloc;
    const i = new Date(h.getFullYear(), q * 3, 1);
    return { tipo, inicio: i, fim: new Date(i.getFullYear(), i.getMonth() + 3, 1), rotulo: `${Math.floor(i.getMonth() / 3) + 1}º trimestre de ${i.getFullYear()}` };
  }
  const i = new Date(h.getFullYear() + desloc, 0, 1);
  return { tipo, inicio: i, fim: new Date(i.getFullYear() + 1, 0, 1), rotulo: `Ano de ${i.getFullYear()}` };
}

/** Converte "AAAA-MM-DD", ISO com hora ou "DD/MM/AAAA" em data local. */
export function paraData(raw: string | null | undefined): Date | null {
  const t = String(raw || '').trim();
  if (!t) return null;
  let m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  if (/T\d{2}:\d{2}/.test(t)) { const d = new Date(t); if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
  m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return null;
}

export const dentro = (raw: string | null | undefined, p: Periodo) => {
  const d = paraData(raw);
  return !!d && d >= p.inicio && d < p.fim;
};

/** Fatias do período para gráficos: dias (semana/mês) ou meses (trimestre/ano). */
export function fatias(p: Periodo): Array<{ chave: string; rotulo: string; inicio: Date; fim: Date }> {
  const out: Array<{ chave: string; rotulo: string; inicio: Date; fim: Date }> = [];
  if (p.tipo === 'semana' || p.tipo === 'mes') {
    for (let d = new Date(p.inicio); d < p.fim; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const f = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      out.push({ chave: d.toISOString().slice(0, 10), rotulo: p.tipo === 'semana' ? d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }).replace('.', '') : String(d.getDate()), inicio: d, fim: f });
    }
  } else {
    for (let d = new Date(p.inicio); d < p.fim; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      out.push({ chave: `${d.getFullYear()}-${d.getMonth() + 1}`, rotulo: cap(MESES[d.getMonth()].slice(0, 3)), inicio: d, fim: new Date(d.getFullYear(), d.getMonth() + 1, 1) });
    }
  }
  return out;
}

/**
 * Período anterior "justo" para comparação: se o atual ainda não terminou,
 * corta o anterior no mesmo ponto (ex.: 1–17/out compara com 1–17/set).
 */
export function comparavel(atual: Periodo, anterior: Periodo): Periodo {
  const agora = new Date(); agora.setHours(0, 0, 0, 0);
  if (agora >= atual.fim) return anterior;
  const dias = Math.round((agora.getTime() - atual.inicio.getTime()) / 86_400_000) + 1;
  const fim = new Date(anterior.inicio.getFullYear(), anterior.inicio.getMonth(), anterior.inicio.getDate() + dias);
  return { ...anterior, fim: fim < anterior.fim ? fim : anterior.fim };
}
