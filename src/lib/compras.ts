import { supabase } from './supabaseClient';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { safeSetItem } from './storageHelpers';

export type CompraItem = {
  id?: string;
  compra_id?: string;
  produto: string;
  tipo_material: string;
  quantidade: number;
  unidade: string;
  valor_unitario: number;
  valor_total: number;
};

export type Compra = {
  id?: string;
  data: string; // ISO date string
  fornecedor: string;
  valor_total: number;
  forma_pagamento: string;
  status: string; // 'pago' | 'pendente'
  observacoes?: string;
  created_at?: string;
  itens?: CompraItem[];
};

export async function listCompras() {
  const { data, error } = await supabase
    .from('compras')
    .select('*, compras_itens(*)')
    .order('data', { ascending: false });
  if (error) throw error;
  return data as Compra[];
}

export async function getCompra(id: string) {
  const { data, error } = await supabase
    .from('compras')
    .select('*, compras_itens(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Compra;
}

export async function createCompra(compra: Compra) {
  // Insert compra
  const { data: compraData, error: compraErr } = await supabase
    .from('compras')
    .insert([{ data: compra.data, fornecedor: compra.fornecedor, valor_total: compra.valor_total, forma_pagamento: compra.forma_pagamento, status: compra.status, observacoes: compra.observacoes }])
    .select()
    .single();
  if (compraErr) throw compraErr;

  const compraId = compraData.id;

  // Insert itens
  if (compra.itens && compra.itens.length) {
    const itensToInsert = compra.itens.map((it) => ({
      compra_id: compraId,
      produto: it.produto,
      tipo_material: it.tipo_material,
      quantidade: it.quantidade,
      unidade: it.unidade,
      valor_unitario: it.valor_unitario,
      valor_total: it.valor_total,
    }));
    const { error: itensErr } = await supabase.from('compras_itens').insert(itensToInsert);
    if (itensErr) throw itensErr;
  }

  // Create financial entry in fluxo_caixa linking via orderid
  try {
    const { data: _fcData, error: fcErr } = await supabase.from('fluxo_caixa').insert([{ date: compra.data, client: compra.fornecedor, service: 'Compra', value: compra.valor_total, status: compra.status, orderid: compraId, tipo: 'despesa' }]);
    if (fcErr) throw fcErr;
  } catch (e) {
    console.warn('Failed to create financial entry for compra, falling back to localStorage', e);
    try {
      const raw = localStorage.getItem('cashFlowDetails');
      let parsed: any = [];
      try { parsed = raw ? JSON.parse(raw) : []; } catch (ee) { parsed = []; }
      // unwrap __force payload if present
      if (parsed && parsed.__force === true && Array.isArray(parsed.payload)) parsed = parsed.payload;
      if (!Array.isArray(parsed)) parsed = [];
      const entry = { id: `compra-${compraId}`, orderId: compraId, date: compra.data, client: compra.fornecedor, service: 'Compra', value: compra.valor_total, status: compra.status, tipo: 'despesa' };
      parsed.unshift(entry);
      try { safeSetItem('cashFlowDetails', parsed, 'financeUpdated', 'Compras.createCompra'); } catch (ee) { try { localStorage.setItem('cashFlowDetails', JSON.stringify(parsed)); } catch(__){} }
    } catch (ee) { console.warn('fallback localStorage write failed', ee); }
  }

  // Notify finance page to refresh (frontend realtime/fallback)
  try {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try { window.dispatchEvent(new CustomEvent('financeUpdated')); } catch (_) {}
    }
  } catch (_) {}

  return compraData as Compra;
}

export async function updateCompra(id: string, compra: Partial<Compra>) {
  const { data, error } = await supabase.from('compras').update(compra).eq('id', id).select().single();
  if (error) throw error;

  // If items provided, replace items for simplicity
  if (compra.itens) {
    await supabase.from('compras_itens').delete().eq('compra_id', id);
    const itensToInsert = compra.itens.map((it) => ({ ...it, compra_id: id }));
    const { error: itensErr } = await supabase.from('compras_itens').insert(itensToInsert);
    if (itensErr) throw itensErr;
  }

  // Update linked financial entry
  try {
    const { data: _fcData, error: fcErr } = await supabase.from('fluxo_caixa').update({ date: compra.data, client: compra.fornecedor, value: compra.valor_total, status: compra.status, tipo: 'despesa' }).eq('orderid', id);
    if (fcErr) throw fcErr;
  } catch (e) {
    console.warn('Failed to update financial entry for compra, falling back to localStorage', e);
    try {
      const raw = localStorage.getItem('cashFlowDetails');
      let parsed: any = [];
      try { parsed = raw ? JSON.parse(raw) : []; } catch (ee) { parsed = []; }
      if (parsed && parsed.__force === true && Array.isArray(parsed.payload)) parsed = parsed.payload;
      if (!Array.isArray(parsed)) parsed = [];
      const idx = parsed.findIndex((p:any) => String(p.orderId || p.id) === String(id));
      const entry = { id: `compra-${id}`, orderId: id, date: compra.data, client: compra.fornecedor, service: 'Compra', value: compra.valor_total, status: compra.status, tipo: 'despesa' };
      if (idx >= 0) parsed[idx] = { ...parsed[idx], ...entry };
      else parsed.unshift(entry);
      try { safeSetItem('cashFlowDetails', parsed, 'financeUpdated', 'Compras.updateCompra'); } catch (ee) { try { localStorage.setItem('cashFlowDetails', JSON.stringify(parsed)); } catch(__){} }
    } catch (ee) { console.warn('fallback localStorage write failed', ee); }
  }

  return data as Compra;
}

export async function deleteCompra(id: string) {
  // Delete financial entry linked
  try {
    await supabase.from('fluxo_caixa').delete().eq('orderid', id);
  } catch (e) {
    console.warn('Failed to delete financial entry for compra', e);
  }

  // Delete itens then compra
  await supabase.from('compras_itens').delete().eq('compra_id', id);
  const { data, error } = await supabase.from('compras').delete().eq('id', id).select();
  if (error) throw error;
  return data;
}
