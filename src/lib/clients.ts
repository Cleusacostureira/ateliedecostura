import { supabase } from './supabaseClient';

export type Cliente = {
  id?: string;
  nome: string;
  telefone?: string;
  cpf?: string;
  endereco?: string;
  foto?: string;
  observacoes?: string;
  // optional analytics fields — may not exist in DB
  totalGasto?: number;
  servicosRealizados?: number;
  pontos?: number;
  status?: 'ativo' | 'inativo';
  createdAt?: string;
};

const CLIENTS_KEY = 'clientes';

function localLoadClients(): Cliente[] {
  try {
    const raw = localStorage.getItem(CLIENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) { return []; }
}

function localSaveClients(list: Cliente[]) {
  try { localStorage.setItem(CLIENTS_KEY, JSON.stringify(list)); } catch (e) {}
}

export async function loadClients(): Promise<Cliente[]> {
  try {
    if (supabase && typeof supabase.from === 'function') {
      const res = await supabase.from('clientes').select('*');
      if (!(res as any).error && Array.isArray((res as any).data)) {
        // map DB fields to UI shape
        return (res as any).data.map((r: any) => ({
          id: r.id,
          nome: r.nome,
          telefone: r.telefone,
          cpf: r.cpf_cnpj || r.cpf,
          endereco: r.endereco,
          observacoes: r.notas || r.observacoes || '',
        }));
      }
    }
  } catch (e) {
    console.warn('supabase loadClients failed', e);
  }
  // fallback to local
  return localLoadClients();
}

export async function getClientById(id: string) {
  try {
    if (supabase && typeof supabase.from === 'function') {
      const res = await supabase.from('clientes').select('*').eq('id', id).limit(1).single();
      if (!(res as any).error && (res as any).data) {
        const r = (res as any).data;
        return {
          id: r.id,
          nome: r.nome,
          telefone: r.telefone,
          cpf: r.cpf_cnpj || r.cpf,
          endereco: r.endereco,
          observacoes: r.notas || r.observacoes || '',
        };
      }
    }
  } catch (e) { console.warn('getClientById supabase failed', e); }
  // fallback
  return localLoadClients().find(c => String(c.id) === String(id));
}

export async function upsertClient(c: Cliente) {
  try {
    if (supabase && typeof supabase.from === 'function') {
      const payload = {
        nome: c.nome,
        telefone: c.telefone || null,
        cpf_cnpj: c.cpf || null,
        endereco: c.endereco || null,
        notas: c.observacoes || null,
      } as any;
      if (c.id) {
        const res = await supabase.from('clientes').update(payload).eq('id', c.id).select().limit(1).single();
        if (!(res as any).error && (res as any).data) {
          return { id: (res as any).data.id, ...payload };
        }
      } else {
        const res = await supabase.from('clientes').insert(payload).select().limit(1).single();
        if (!(res as any).error && (res as any).data) {
          return { id: (res as any).data.id, ...payload };
        }
      }
    }
  } catch (e) {
    console.warn('supabase upsertClient failed', e);
  }
  // fallback to local
  const clients = localLoadClients();
  const exists = clients.findIndex(x => String(x.id) === String(c.id));
  const now = new Date().toLocaleDateString('pt-BR');
  const toSave = { pontos: 0, totalGasto: 0, servicosRealizados: 0, status: 'ativo', createdAt: now, ...c } as Cliente;
  if (exists >= 0) {
    clients[exists] = { ...clients[exists], ...toSave };
  } else {
    // assign an id
    toSave.id = toSave.id || `local-${Date.now()}`;
    clients.push(toSave);
  }
  localSaveClients(clients);
  return toSave;
}

export async function deleteClient(id: string) {
  try {
    if (supabase && typeof supabase.from === 'function') {
      const res = await supabase.from('clientes').delete().eq('id', id);
      if (!(res as any).error) return true;
    }
  } catch (e) { console.warn('supabase deleteClient failed', e); }
  // fallback local
  const clients = localLoadClients().filter(c => String(c.id) !== String(id));
  localSaveClients(clients);
  return true;
}

// keep some helper functions using server when possible, else fallback to local
export async function adjustClientPoints(id: string | number, pointsDelta: number) {
  try {
    // try to update a numeric 'pontos' column if exists
    if (supabase && typeof supabase.from === 'function') {
      // read current (if field exists)
      const cur = await supabase.from('clientes').select('pontos').eq('id', String(id)).limit(1).single();
      if (!(cur as any).error && (cur as any).data) {
        const newVal = (Number((cur as any).data.pontos) || 0) + pointsDelta;
        await supabase.from('clientes').update({ pontos: newVal }).eq('id', String(id));
        return { id, pontos: newVal };
      }
    }
  } catch (e) { console.warn('adjustClientPoints supabase failed', e); }
  // fallback local
  const clients = localLoadClients();
  const idx = clients.findIndex(c => String(c.id) === String(id));
  if (idx === -1) return null;
  clients[idx].pontos = (clients[idx].pontos || 0) + pointsDelta;
  if (clients[idx].pontos! < 0) clients[idx].pontos = 0;
  localSaveClients(clients);
  return clients[idx];
}

export function clientsSummaryForMonth(month: number, year: number) {
  // This util still reads from localStorage orders; keep as-is for compatibility
  try {
    const raw = localStorage.getItem('orders');
    if (!raw) return [];
    const orders = JSON.parse(raw);
    const map: Record<string, { name: string; total: number; count: number }> = {};
    for (const o of orders) {
      if (!o.dateOut) continue;
      const parts = o.dateOut.split('/');
      if (parts.length !== 3) continue;
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const name = o.client || 'Desconhecido';
      const val = parseFloat(String(o.value || '0').replace(/[^0-9,\.]/g, '').replace(/\./g, '').replace(/,/g, '.')) || 0;
      if (!map[name]) map[name] = { name, total: 0, count: 0 };
      map[name].total += val;
      map[name].count += 1;
    }
    return Object.values(map).sort((a,b) => b.total - a.total);
  } catch (e) { return []; }
}
