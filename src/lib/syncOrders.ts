import { supabase } from './supabaseClient';
/* eslint-disable @typescript-eslint/no-unused-vars */
import { safeSetItem } from './storageHelpers';

const ORDERS_KEY = 'orders';

async function postOrderToServer(localOrder: any) {
  const payload: any = {
    cliente_id: localOrder.cliente_id || null,
    notas: localOrder.notas || (localOrder.pieces ? { pieces: localOrder.pieces } : null),
    total: localOrder.total || localOrder.paidAmount || 0,
    // normalize delivery date: accept ISO or convert from dd/mm/yyyy -> ISO
    data_entrega: (() => {
      try {
        const d = localOrder.dateOut;
        if (!d) return null;
        const s = String(d);
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
          const [day, month, year] = s.split('/');
          return new Date(`${year}-${month}-${day}`).toISOString();
        }
        return s;
      } catch (e) { return null; }
    })(),
    // ensure a sensible default status on server
    status: localOrder.status || 'Recebido'
  };
  // sanitize `numero` — server expects a numeric bigint, so strip non-digits and send Number only when valid
  try {
    const rawNum = (localOrder.numero || localOrder.displayNumero || '') + '';
    const digits = rawNum.replace(/\D/g, '');
    if (digits && digits.length > 0) {
      // parse as integer (strip leading zeros but still numeric)
      const n = Number(parseInt(digits, 10));
      if (!isNaN(n)) payload.numero = n;
    }
  } catch (e) { /* ignore malformed numero */ }
  // avoid adding UI-only/payment fields that may not exist in every schema
  const res = await supabase.from('ordens').insert([payload]).select();
  return res;
}

export default async function syncOrders(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    try { localStorage.setItem('lastServerError', JSON.stringify({ message: 'offline', hint: 'navigator.onLine === false' })); } catch(_){}
    return;
  }
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    let arr = raw ? JSON.parse(raw) : [];
    if (Array.isArray(arr) && arr.length > 0) {
      let changed = false;
      for (let i = 0; i < arr.length; i++) {
        const o = arr[i];
        if (!o || o._unsynced !== true) continue;
        try {
            const { data, error } = await postOrderToServer(o) as any;
            if (error) {
              try { localStorage.setItem('lastServerError', JSON.stringify({ data, error, localOrder: { id: o.id, numero: o.numero } })); } catch(_){ }
              continue;
            }
          if (Array.isArray(data) && data[0]) {
            const serverRow = data[0];
            const merged = { ...o, ...serverRow, _local: false, _unsynced: false };
            arr[i] = merged;
            changed = true;
          }
        } catch (e) {
            try { localStorage.setItem('lastServerError', JSON.stringify({ message: String(e), stack: (e && e.stack) ? e.stack : null })); } catch(_){ }
          }
        }
        if (changed) {
          try {
            // cleanup duplicates by `numero`: prefer server rows (non-local) over local temp rows
            const byNumero: Record<string, any> = {};
            const result: any[] = [];
            for (const row of arr) {
              try {
                const num = String(row.numero || '');
                if (!num) { result.push(row); continue; }
                if (!byNumero[num]) {
                  byNumero[num] = row;
                  result.push(row);
                } else {
                  const existing = byNumero[num];
                  // prefer server row (not _local)
                  if ((existing._local === true || String(existing.id || '').startsWith('local-')) && !(row._local === true || String(row.id || '').startsWith('local-'))) {
                    const idx = result.indexOf(existing);
                    if (idx !== -1) result[idx] = row;
                    byNumero[num] = row;
                  }
                  // otherwise keep existing
                }
              } catch (e) { result.push(row); }
            }
            arr = result;
            try { safeSetItem(ORDERS_KEY, arr, 'ordersUpdated', 'syncOrders'); } catch(_) { try { safeSetItem(ORDERS_KEY, arr, 'ordersUpdated', 'syncOrders'); } catch(__){} }
          } catch(_){ try { localStorage.setItem(ORDERS_KEY, JSON.stringify(arr)); } catch(__){} }
          try { window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch(_){ }
        }
      }

    // sync cashFlowDetails
    try {
      const rawCash = localStorage.getItem('cashFlowDetails');
      const cashArr = rawCash ? JSON.parse(rawCash) : [];
      if (Array.isArray(cashArr) && cashArr.length > 0) {
        let cashChanged = false;
        for (let i = 0; i < cashArr.length; i++) {
          const c = cashArr[i];
          const needsSync = c && (c._unsynced === true || !c.id || String(c.id).startsWith('cash-'));
          if (!needsSync) continue;
          try {
            const payload: any = {
              date: c.date,
              client: c.client || c.cliente || '',
              service: c.service || '',
              value: Number(Number(c.value || c.valor || 0).toFixed(2)),
              status: c.status || c.estado || 'Pendente',
              numero: c.numero || null,
              pecas: c.pecas || c.pieces || null
            };
            if (c.orderId) payload.orderid = c.orderId;
            if (c.orderid) payload.orderid = c.orderid;
            const res = await (supabase as any).from('fluxo_caixa').insert([payload]).select();
            if (res && (res as any).error) {
              try { localStorage.setItem('lastServerError', JSON.stringify({ data: (res as any).data, error: (res as any).error })); } catch(_){}
              continue;
            }
            if (res && Array.isArray((res as any).data) && (res as any).data[0]) {
              cashArr[i] = { ...c, ...((res as any).data[0]), _unsynced: false };
              cashChanged = true;
            }
          } catch (e) {
            try { localStorage.setItem('lastServerError', JSON.stringify({ message: String(e) })); } catch(_){}
          }
        }
        if (cashChanged) {
          try { safeSetItem('cashFlowDetails', cashArr, 'financeUpdated', 'syncOrders'); } catch(_){ try { safeSetItem('cashFlowDetails', cashArr, 'financeUpdated', 'syncOrders'); } catch(__){} }
        }
      }
    } catch (e) { try { localStorage.setItem('lastServerError', JSON.stringify({ message: String(e) })); } catch(_){} }
  } catch (e) {
    try { localStorage.setItem('lastServerError', JSON.stringify({ message: String(e) })); } catch(_){}
  }
}
