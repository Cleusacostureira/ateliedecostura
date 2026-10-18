import { supabase } from '../lib/supabaseClient';
import type { Cliente, Ordem, OrdemRow, Peca, PecaCatalogo, ServicoCatalogo, StatusOrdem } from './types';
import { STATUS } from './types';

const PAGINA = 1000;

/** Lê a tabela inteira em páginas (o Supabase devolve no máximo 1000 linhas por vez). */
export async function lerTudo<T>(tabela: string, colunas = '*', ordem = 'id'): Promise<T[]> {
  const todos: T[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await supabase.from(tabela).select(colunas).order(ordem, { ascending: true }).range(de, de + PAGINA - 1);
    if (error) throw new Error(`Não foi possível ler ${tabela}: ${error.message}`);
    todos.push(...((data || []) as T[]));
    if (!data || data.length < PAGINA) break;
  }
  return todos;
}

function falha(acao: string, error: any): never {
  throw new Error(`${acao}: ${error?.message || 'erro desconhecido'}`);
}

// ---------- conversões ----------

export const estaPago = (s: string | null | undefined) => {
  const v = String(s || '').toLowerCase();
  return v.includes('pago') && !v.includes('não') && !v.includes('nao');
};

function normalizaStatus(s: string): StatusOrdem {
  const v = String(s || '').toLowerCase();
  return STATUS.find(x => x.toLowerCase() === v) || (v.includes('costura') ? 'Em costura' : v.includes('pront') ? 'Pronto' : v.includes('retir') || v.includes('entreg') ? 'Retirado' : 'Recebido');
}

function lerNotas(notas: string | null): { pecas: Peca[]; observacoes: string } {
  if (!notas) return { pecas: [], observacoes: '' };
  try {
    const j = typeof notas === 'string' ? JSON.parse(notas) : notas;
    const pecas = Array.isArray(j?.pieces) ? j.pieces.map((p: any) => ({
      id: String(p.id || crypto.randomUUID()),
      tipo: p.tipo || 'Peça',
      cor: p.cor || '',
      icone: p.icone,
      modelo: p.modelo,
      services: Array.isArray(p.services) ? p.services.map((s: any) => ({ id: String(s.id || ''), name: s.name || s.titulo || 'Serviço', price: Number(s.price || 0) })) : [],
    })) : [];
    return { pecas, observacoes: typeof j?.observacoes === 'string' ? j.observacoes : '' };
  } catch {
    return { pecas: [], observacoes: String(notas) };
  }
}

function montarNotas(pecas: Peca[], observacoes: string) {
  const j: any = { pieces: pecas };
  if (observacoes.trim()) j.observacoes = observacoes.trim();
  return JSON.stringify(j);
}

export function deRow(r: OrdemRow): Ordem {
  const { pecas, observacoes } = lerNotas(r.notas);
  return {
    id: r.id,
    numero: Number(r.numero),
    clienteId: r.cliente_id,
    status: normalizaStatus(r.status),
    total: Number(r.total || 0),
    criadaEm: r.data_criacao || r.created_at,
    entrega: r.data_entrega ? String(r.data_entrega).slice(0, 10) : null,
    pecas,
    observacoes,
    pago: estaPago(r.paymentStatus),
    atualizadaEm: r.updated_at,
  };
}

export const totalDasPecas = (pecas: Peca[]) =>
  Math.round(pecas.reduce((s, p) => s + p.services.reduce((a, x) => a + Number(x.price || 0), 0), 0) * 100) / 100;

export const textoServicos = (pecas: Peca[]) =>
  pecas.flatMap(p => p.services.map(s => s.name.trim())).filter(Boolean).join(', ') || 'OS';

const numeroFormatado = (n: number) => 'N' + String(n).padStart(5, '0');
const hojeISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ---------- leitura ----------

export async function carregarClientes(): Promise<Cliente[]> {
  return lerTudo<Cliente>('clientes');
}

export async function carregarOrdens(): Promise<Ordem[]> {
  const rows = await lerTudo<OrdemRow>('ordens', '*', 'numero');
  return rows.map(deRow);
}

export async function carregarCatalogo(): Promise<{ servicos: ServicoCatalogo[]; pecas: PecaCatalogo[] }> {
  const [s, p] = await Promise.all([
    lerTudo<any>('servicos'),
    lerTudo<any>('pecas'),
  ]);
  return {
    servicos: s.map(x => {
      let categoria = '';
      try { categoria = JSON.parse(x.descricao || '{}').category || ''; } catch { /* descrição em texto */ }
      return { id: x.id, titulo: String(x.titulo || '').trim(), preco: Number(x.preco || 0), categoria };
    }).filter(x => x.titulo),
    pecas: p.map(x => ({ id: x.id, nome: x.nome, categoria: x.categoria || 'OUTRAS', icone: x.icone || '🧵' })),
  };
}

// ---------- clientes ----------

export type ClienteForm = { nome: string; telefone: string; email: string; cpf_cnpj: string; endereco: string; notas: string };

const limpaCliente = (f: ClienteForm) => ({
  nome: f.nome.trim(),
  telefone: f.telefone.replace(/\D/g, '') || null,
  email: f.email.trim() || null,
  cpf_cnpj: f.cpf_cnpj.trim() || null,
  endereco: f.endereco.trim() || null,
  notas: f.notas.trim() || null,
});

export async function criarCliente(f: ClienteForm): Promise<Cliente> {
  const { data, error } = await supabase.from('clientes').insert(limpaCliente(f)).select().single();
  if (error) falha('Não foi possível cadastrar a cliente', error);
  return data as Cliente;
}

export async function salvarCliente(id: string, f: ClienteForm): Promise<Cliente> {
  const { data, error } = await supabase.from('clientes').update({ ...limpaCliente(f), updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) falha('Não foi possível salvar a cliente', error);
  return data as Cliente;
}

export async function excluirCliente(id: string) {
  const { error } = await supabase.from('clientes').delete().eq('id', id);
  if (error) falha('Não foi possível excluir a cliente', error);
}

// ---------- ordens ----------

export type OrdemForm = { clienteId: string; clienteNome: string; pecas: Peca[]; entrega: string; observacoes: string; pago: boolean };

/**
 * Cria a ordem e o lançamento no financeiro (tabela fluxo_caixa), no mesmo formato
 * que as telas antigas usam — assim Financeiro, Início e Relatórios continuam funcionando.
 */
export async function criarOrdem(f: OrdemForm): Promise<Ordem> {
  const total = totalDasPecas(f.pecas);
  const { data, error } = await supabase.from('ordens').insert({
    cliente_id: f.clienteId,
    notas: montarNotas(f.pecas, f.observacoes),
    total,
    data_entrega: f.entrega || null,
    status: 'Recebido',
    paymentStatus: f.pago ? 'Pago' : 'Pendente',
  }).select().single();
  if (error) falha('Não foi possível criar a ordem', error);
  const ordem = deRow(data as OrdemRow);

  const fx = await supabase.from('fluxo_caixa').insert({
    date: hojeISO(),
    client: f.clienteNome,
    service: `${textoServicos(f.pecas)} — ${numeroFormatado(ordem.numero)}`,
    value: total,
    status: f.pago ? 'Pago' : 'Não pago',
    orderid: ordem.id,
    numero: String(ordem.numero),
    pecas: f.pecas,
  });
  if (fx.error) console.warn('Lançamento financeiro não criado', fx.error);
  return ordem;
}

/** Mantém o lançamento do financeiro igual à ordem (cria se não existir). */
async function sincronizarFinanceiro(o: Ordem, clienteNome: string) {
  const campos = {
    client: clienteNome,
    service: `${textoServicos(o.pecas)} — ${numeroFormatado(o.numero)}`,
    value: o.total,
    status: o.pago ? 'Pago' : 'Não pago',
    numero: String(o.numero),
    pecas: o.pecas,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase.from('fluxo_caixa').update(campos).eq('orderid', o.id).select('id');
  if (error) { console.warn('Financeiro não atualizado', error); return; }
  if (!data || data.length === 0) {
    // lançamentos antigos às vezes ficaram ligados só pelo número da OS
    const porNumero = await supabase.from('fluxo_caixa').update({ ...campos, orderid: o.id }).eq('numero', String(o.numero)).is('tipo', null).select('id');
    if (!porNumero.error && porNumero.data && porNumero.data.length > 0) return;
    const ins = await supabase.from('fluxo_caixa').insert({ ...campos, date: String(o.criadaEm).slice(0, 10), orderid: o.id });
    if (ins.error) console.warn('Lançamento financeiro não criado', ins.error);
  }
}

export async function editarOrdem(o: Ordem, f: OrdemForm): Promise<Ordem> {
  const total = totalDasPecas(f.pecas);
  const { data, error } = await supabase.from('ordens').update({
    cliente_id: f.clienteId,
    notas: montarNotas(f.pecas, f.observacoes),
    total,
    data_entrega: f.entrega || null,
    paymentStatus: f.pago ? 'Pago' : 'Pendente',
    updated_at: new Date().toISOString(),
  }).eq('id', o.id).select().single();
  if (error) falha('Não foi possível salvar a ordem', error);
  const nova = deRow(data as OrdemRow);
  await sincronizarFinanceiro(nova, f.clienteNome);
  return nova;
}

export async function mudarStatus(o: Ordem, status: StatusOrdem): Promise<Ordem> {
  const { data, error } = await supabase.from('ordens').update({ status, updated_at: new Date().toISOString() }).eq('id', o.id).select().single();
  if (error) falha('Não foi possível mudar o status', error);
  return deRow(data as OrdemRow);
}

export async function marcarPagamento(o: Ordem, pago: boolean, clienteNome: string): Promise<Ordem> {
  const { data, error } = await supabase.from('ordens').update({ paymentStatus: pago ? 'Pago' : 'Pendente', updated_at: new Date().toISOString() }).eq('id', o.id).select().single();
  if (error) falha('Não foi possível registrar o pagamento', error);
  const nova = deRow(data as OrdemRow);
  await sincronizarFinanceiro(nova, clienteNome);
  return nova;
}

/** Exclui só esta ordem (pelo id) e o lançamento financeiro ligado a ela. */
export async function excluirOrdem(o: Ordem) {
  const { data, error } = await supabase.from('ordens').delete().eq('id', o.id).select('id');
  if (error) falha('Não foi possível excluir a ordem', error);
  if (!data || data.length === 0) throw new Error('A ordem não foi encontrada no banco.');
  const fx = await supabase.from('fluxo_caixa').delete().eq('orderid', o.id);
  if (fx.error) console.warn('Lançamento financeiro não excluído', fx.error);
}

// ---------- despesas (compras) ----------

export type Despesa = {
  id: string;
  data: string;            // AAAA-MM-DD
  fornecedor: string;
  valor: number;
  forma: string;
  status: string;
  itens: Array<{ produto: string; tipo: string; quantidade: number; unidade: string; valor: number }>;
};

/** Compras + lançamentos de despesa do financeiro que não vieram de uma compra. */
export async function carregarDespesas(): Promise<Despesa[]> {
  const [compras, itens, fluxo] = await Promise.all([
    lerTudo<any>('compras'),
    lerTudo<any>('compras_itens'),
    lerTudo<any>('fluxo_caixa').then(l => l.filter(x => String(x.tipo || '').toLowerCase() === 'despesa')),
  ]);
  const porCompra = new Map<string, Despesa['itens']>();
  itens.forEach(i => {
    const l = porCompra.get(i.compra_id) || [];
    l.push({ produto: i.produto || '', tipo: i.tipo_material || '', quantidade: Number(i.quantidade || 0), unidade: i.unidade || '', valor: Number(i.valor_total || 0) });
    porCompra.set(i.compra_id, l);
  });
  const ids = new Set(compras.map(c => c.id));
  return [
    ...compras.map(c => ({
      id: c.id, data: String(c.data || c.created_at || '').slice(0, 10), fornecedor: String(c.fornecedor || '').trim(),
      valor: Number(c.valor_total || 0), forma: c.forma_pagamento || '', status: c.status || '', itens: porCompra.get(c.id) || [],
    })),
    ...fluxo.filter(f => !ids.has(f.orderid)).map(f => ({
      id: f.id, data: String(f.date || f.created_at || '').slice(0, 10), fornecedor: String(f.client || '').trim(),
      valor: Math.abs(Number(f.value || 0)), forma: '', status: f.status || '', itens: [],
    })),
  ];
}
