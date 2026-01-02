export type Cliente = {
  id: number | string;
  nome: string;
  telefone?: string;
  cpf?: string;
  endereco?: string;
  foto?: string;
  observacoes?: string;
  totalGasto?: number;
  servicosRealizados?: number;
  pontos?: number;
  pontosMeta?: number;
  status?: 'ativo' | 'inativo';
  createdAt?: string;
};

const CLIENTS_KEY = 'clientes';

export function loadClients(): Cliente[] {
  try {
    const raw = localStorage.getItem(CLIENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) { return []; }
}

export function saveClients(list: Cliente[]) {
  try { localStorage.setItem(CLIENTS_KEY, JSON.stringify(list)); } catch (e) {}
}

export function getClientById(id: string | number) {
  const clients = loadClients();
  return clients.find(c => String(c.id) === String(id));
}

export function upsertClient(c: Cliente) {
  const clients = loadClients();
  const exists = clients.findIndex(x => String(x.id) === String(c.id));
  const now = new Date().toLocaleDateString('pt-BR');
  const toSave = { pontos: 0, pontosMeta: 10, totalGasto: 0, servicosRealizados: 0, status: 'ativo', createdAt: now, ...c } as Cliente;
  if (exists >= 0) {
    clients[exists] = { ...clients[exists], ...toSave };
  } else {
    clients.push(toSave);
  }
  saveClients(clients);
  return toSave;
}

function parseValue(value: string) {
  if (!value) return 0;
  // expect formats like 'R$ 35,00' or '35.00' etc
  const cleaned = String(value).replace(/[^0-9,\.]/g, '').replace(/\./g, '').replace(/,/g, '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

export function addPointsForOrder(order: any) {
  try {
    if (!order) return;
    // only count if paid and retirado
    if (order.status !== 'Retirado') return;
    if (order.paymentStatus !== 'Pago') return;
    const clients = loadClients();
    // match by phone or name
    const match = clients.find(c => (c.telefone && order.phone && c.telefone.replace(/\D/g,'') === String(order.phone).replace(/\D/g,'')) || (c.nome && order.client && c.nome === order.client));
    if (!match) return;
    const amount = parseValue(order.value || order.total || '0');
    match.totalGasto = (match.totalGasto || 0) + amount;
    match.servicosRealizados = (match.servicosRealizados || 0) + 1;
    const earned = Math.floor(amount / 100);
    match.pontos = (match.pontos || 0) + earned;
    saveClients(clients);
    return match;
  } catch (e) { return; }
}

export function adjustClientPoints(id: string | number, pointsDelta: number) {
  const clients = loadClients();
  const idx = clients.findIndex(c => String(c.id) === String(id));
  if (idx === -1) return null;
  clients[idx].pontos = (clients[idx].pontos || 0) + pointsDelta;
  if (clients[idx].pontos! < 0) clients[idx].pontos = 0;
  saveClients(clients);
  return clients[idx];
}

export function clientsSummaryForMonth(month: number, year: number) {
  // compute totals per client for orders in localStorage for the given month/year
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
