import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { readOrdersFromStorage, safeSetItem } from '../../lib/storageHelpers';
import { supabase } from '../../lib/supabaseClient';

// Simple in-memory cache for fetched clientes to avoid repeated network requests
const CLIENTES_CACHE_TTL = 1000 * 60 * 5; // 5 minutes
function getClientesCache() {
  if (!(window as any).__clientesCache) (window as any).__clientesCache = { map: {}, ts: 0 };
  return (window as any).__clientesCache as { map: Record<string,string>, ts: number };
}
async function getClientesMap(clienteIds: string[]) {
  try {
    if (!Array.isArray(clienteIds) || clienteIds.length === 0) return {};
    const cache = getClientesCache();
    const now = Date.now();
    const missing = clienteIds.filter(id => !cache.map[String(id)] || (now - cache.ts) > CLIENTES_CACHE_TTL);
    if (missing.length > 0 && supabase && typeof supabase.from === 'function') {
      try {
        const cliRes = await supabase.from('clientes').select('id,nome').in('id', missing);
        if (!(cliRes as any).error && Array.isArray((cliRes as any).data)) {
          (cliRes as any).data.forEach((c:any) => { if (c && c.id) cache.map[String(c.id)] = c.nome || ''; });
          cache.ts = Date.now();
        }
      } catch (_) {}
    }
    return { ...cache.map };
  } catch (e) { return {}; }
}

export default function FinanceiroPage() {
  // runtime flag to avoid repeated failing requests when the `fluxo_caixa` table is missing
  const isFluxoAvailable = () => !((window as any).__fluxoCaixaMissing === true);
  const markFluxoMissing = () => { (window as any).__fluxoCaixaMissing = true; console.info('fluxo_caixa table missing — falling back to localStorage'); };
  const [selectedPeriod, setSelectedPeriod] = useState('mes');
  const [showPendingPayments, setShowPendingPayments] = useState(false);
  const [showCobrancaModal, setShowCobrancaModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showConfirmPaymentModal, setShowConfirmPaymentModal] = useState(false);
  const [fluxoStatus, setFluxoStatus] = useState('');
  const [showLocalEntries, setShowLocalEntries] = useState(false);
  const [localEntriesPreview, setLocalEntriesPreview] = useState<any[]>([]);

  // Dados de clientes com pagamentos pendentes (inicialmente vazio — carregado do Supabase)
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);

  // Fluxo de caixa detalhado por cliente e serviço
  const [cashFlowDetails, setCashFlowDetails] = useState<any[]>([]);

  // fetch financeiro data from Supabase on mount; fallback to localStorage
  useEffect(() => {
    let mounted = true;

    const normalizeEntries = (arr: any[]) => {
      return (arr || []).map((d:any) => {
        const rawVal = parseCurrency(d.value ?? d.valor ?? 0);
        const fixed = (Number.isInteger(rawVal) && Math.abs(rawVal) >= 1000 && Math.abs(rawVal) % 100 === 0) ? rawVal / 100 : rawVal;
        return { ...d, value: fixed };
      });
    };

    async function fetchFinanceiro() {
      try { setFluxoStatus('Carregando...'); } catch (e) {}
      try { console.debug('[financeiro] fetchFinanceiro start'); } catch(e){}
      try {
        if (isFluxoAvailable() && supabase && typeof supabase.from === 'function') {
          const res = await supabase.from('fluxo_caixa').select('*');
          if ((res as any).error) {
            if ((res as any).error.code === 'PGRST205') { markFluxoMissing(); }
            console.warn('Supabase fetch fluxo_caixa error', (res as any).error);
            try { setFluxoStatus('Erro servidor: ' + JSON.stringify((res as any).error)); } catch (e) {}
          }
          if (!(res as any).error && Array.isArray((res as any).data) && mounted) {
            let data = (res as any).data as any[];
            // build set of active orders (ids and numeros) to filter fluxo_caixa
            let activeSet = new Set<string>();
            // prefer server-side orders when available so we don't rely on possibly stale localStorage
            let serverOrders: any[] | null = null;
            try {
              const ordRes = await supabase.from('ordens').select('id,numero,cliente_id,total,status');
              if (!(ordRes as any).error && Array.isArray((ordRes as any).data)) {
                serverOrders = (ordRes as any).data as any[];
                // attach client names using cached helper to avoid repeated requests
                try {
                  const clienteIds = Array.from(new Set((serverOrders || []).map((o:any) => o && o.cliente_id).filter(Boolean)));
                  if (clienteIds.length > 0) {
                    try {
                      const cliMap = await getClientesMap(clienteIds as string[]);
                      serverOrders = (serverOrders || []).map((o:any) => ({ ...o, client: (o && o.cliente_id) ? (cliMap[String(o.cliente_id)] || o.client || o.nome || o.cliente || '') : (o.client || o.nome || o.cliente || '') }));
                    } catch (_) { /* ignore */ }
                  }
                } catch (ee) { /* ignore client attach failures, keep serverOrders as-is */ }
                serverOrders.forEach((o:any) => { if (o && (o.id || o.numero)) { if (o.id) activeSet.add(String(o.id)); if (o.numero) activeSet.add(String(o.numero)); } });
              }
            } catch (e) {
              const parsedOrders = readOrdersFromStorage();
              if (Array.isArray(parsedOrders)) parsedOrders.forEach((o:any) => { if (o && (o.id || o.numero)) { if (o.id) activeSet.add(String(o.id)); if (o.numero) activeSet.add(String(o.numero)); } });
            }
            if (activeSet.size > 0) {
              data = data.filter((d:any) => {
                try {
                  const oid = d.orderId || d.orderid;
                  const num = d.numero || d.id;
                  if (oid && activeSet.has(String(oid))) return true;
                  if (num && activeSet.has(String(num))) return true;
                  return false;
                } catch (e) { return false; }
              });
            } else {
              // no active orders -> clear any server fluxo entries to show zero
              data = [];
            }
            try { data = data.filter((d:any) => { const num = String(d.numero || '').toLowerCase(); const digits = String(d.numero || '').replace(/\D/g, ''); if (num === 'n000002') return false; if (digits === '2') return false; return true; }); } catch (e) {}
            try {
              const rawDel = localStorage.getItem('deletedOrders');
              const dels = rawDel ? JSON.parse(rawDel) : [];
              if (Array.isArray(dels) && dels.length > 0) data = data.filter((d:any) => !dels.includes(String(d.orderId) || String(d.id) || String(d.numero)));
            } catch (e) {}
            try {
              let normalized = normalizeEntries(data);
              // correlate with local orders to prefer local client names when available
              try {
                const orders = serverOrders && Array.isArray(serverOrders) && serverOrders.length > 0 ? serverOrders : readOrdersFromStorage();
                if (Array.isArray(orders) && orders.length > 0) {
                  normalized = normalized.map((d:any) => {
                    try {
                      const match = orders.find((o:any) => {
                        try {
                          if (o && o.id && String(o.id) === String(d.orderId || d.orderid)) return true;
                          const oNum = String(o.numero || '').replace(/\D/g, '');
                          const dNum = String(d.numero || '').replace(/\D/g, '');
                          if (oNum && dNum && oNum === dNum) return true;
                        } catch (ee) { /* ignore */ }
                        return false;
                      });
                      if (match && (match.client || match.nome || match.cliente)) {
                        return { ...d, client: match.client || match.nome || match.cliente };
                      }
                    } catch (e) {}
                    return d;
                  });
                }
              } catch (e) {}
              try { console.debug('[financeiro] reconciled entries count=', (reconciled||[]).length); } catch(e){}
              const reconciled = reconcileCashWithOrders(normalized);
              setCashFlowDetails(reconciled.map((dd:any)=> ({ ...dd, status: (dd.status === 'Pendente' ? 'Não pago' : dd.status) } )));
              try { console.debug('[financeiro] setting cashFlowDetails from server raw data count=', (data||[]).length); } catch(e){}
              setPendingPayments(reconciled.filter((d:any) => (d.status === 'Pendente' || d.status === 'Não pago')));
              try { setFluxoStatus(`Sincronizado ${normalized.length} entradas`); } catch (e) {}
              try { setLocalEntriesPreview((normalized || []).slice(0,50)); } catch (e) {}
            } catch (e) {
              setCashFlowDetails(data.map((dd:any)=> ({ ...dd, status: (dd.status === 'Pendente' ? 'Não pago' : dd.status) } )));
              setPendingPayments(data.filter((d:any) => (d.status === 'Pendente' || d.status === 'Não pago')));
            }
            return;
          }
        }
      } catch (e) {
        console.warn('fetchFinanceiro error', e);
        try { setFluxoStatus('Erro fetch: ' + (e && e.message ? e.message : String(e))); } catch (ee) {}
      }

      // fallback to localStorage
      try {
        const raw = localStorage.getItem('cashFlowDetails');
        if (raw) {
          let parsed = JSON.parse(raw) as any[];
          if (Array.isArray(parsed) && mounted) {
            try { parsed = parsed.filter((d:any) => { const num = String(d.numero||'').toLowerCase(); const digits = String(d.numero||'').replace(/\D/g,''); if (num === 'n000002') return false; if (digits === '2') return false; return true; }); } catch (e) {}
            try {
              // also ensure cash entries correspond to existing orders (local fallback)
              const parsedOrders = readOrdersFromStorage();
              const activeSetLocal = new Set<string>();
              if (Array.isArray(parsedOrders)) parsedOrders.forEach((o:any) => { if (o && (o.id || o.numero)) { if (o.id) activeSetLocal.add(String(o.id)); if (o.numero) activeSetLocal.add(String(o.numero)); } });
              const rawDel = localStorage.getItem('deletedOrders');
              const dels = rawDel ? JSON.parse(rawDel) : [];
              const filtered = Array.isArray(dels) && dels.length > 0 ? parsed.filter((p:any) => !dels.includes(String(p.orderId) || String(p.numero) || String(p.id))) : parsed;
              const finalFiltered = activeSetLocal.size > 0 ? filtered.filter((p:any) => activeSetLocal.has(String(p.orderId) || String(p.orderid) || String(p.numero) || String(p.id))) : [];
              let normalized = normalizeEntries(finalFiltered);
              try {
                const orders = readOrdersFromStorage();
                if (Array.isArray(orders) && orders.length > 0) {
                  normalized = normalized.map((d:any) => {
                    try {
                      const match = orders.find((o:any) => {
                        try {
                          if (o && o.id && String(o.id) === String(d.orderId || d.orderid)) return true;
                          const oNum = String(o.numero || '').replace(/\D/g, '');
                          const dNum = String(d.numero || '').replace(/\D/g, '');
                          if (oNum && dNum && oNum === dNum) return true;
                        } catch (ee) { /* ignore */ }
                        return false;
                      });
                      if (match && (match.client || match.nome || match.cliente)) {
                        return { ...d, client: match.client || match.nome || match.cliente };
                      }
                    } catch (e) {}
                    return d;
                  });
                }
              } catch (e) {}
              try { console.debug('[financeiro] fallback local reconciled count=', (reconciled||[]).length); } catch(e){}
              const reconciled = reconcileCashWithOrders(normalized);
              setCashFlowDetails(reconciled.map((dd:any)=> ({ ...dd, status: (dd.status === 'Pendente' ? 'Não pago' : dd.status) } )));
              setPendingPayments(reconciled.filter((d:any) => (d.status === 'Pendente' || d.status === 'Não pago')));
              try { setLocalEntriesPreview((normalized || []).slice(0,50)); } catch (e) {}
              return;
            } catch (e) { setCashFlowDetails(parsed); setPendingPayments(parsed.filter((d:any) => d.status === 'Pendente')); }
          }
        }
      } catch (e) { console.warn('localStorage parse failed', e); try { setFluxoStatus('Erro parse local: ' + String(e)); } catch (ee) {} }

      if (mounted) { try { setFluxoStatus('Nenhuma entrada'); } catch (e) {} }
    }
    fetchFinanceiro();

    // debounce scheduler to avoid firing many concurrent fetches when multiple events arrive
    let scheduledFetch: any = null;
    const scheduleFetch = () => {
      try {
        if (scheduledFetch) clearTimeout(scheduledFetch);
        scheduledFetch = setTimeout(() => { try { fetchFinanceiro(); } catch(e){} }, 300);
      } catch (e) {}
    };

    const onFinanceUpdated = () => {
      try {
        try {
          const raw = localStorage.getItem('cashFlowDetails');
          if (raw) {
            let parsed = JSON.parse(raw) as any[];
            if (Array.isArray(parsed)) {
              try { parsed = parsed.filter((d:any) => { const num = String(d.numero||'').toLowerCase(); const digits = String(d.numero||'').replace(/\D/g,''); if (num === 'n000002') return false; if (digits === '2') return false; return true; }); } catch(e) {}
              try {
                const rawDel = localStorage.getItem('deletedOrders');
                const dels = rawDel ? JSON.parse(rawDel) : [];
                const filtered = Array.isArray(dels) && dels.length > 0 ? parsed.filter((p:any) => !dels.includes(String(p.orderId) || String(p.numero) || String(p.id))) : parsed;
                const normalized = normalizeEntries(filtered);
                setCashFlowDetails(normalized);
                setPendingPayments(normalized.filter((d:any) => d.status === 'Pendente'));
                setLocalEntriesPreview((normalized || []).slice(0,50));
              } catch (e) { setCashFlowDetails(parsed); setPendingPayments(parsed.filter((d:any) => d.status === 'Pendente')); }
            }
          }
        } catch (e) { console.warn('onFinanceUpdated local read failed', e); }
        // schedule a single fetch instead of firing immediately to avoid duplicated requests
        scheduleFetch();
      } catch (e) { console.warn('onFinanceUpdated handler error', e); }
    };

    let ordersUpdateRetries = 0;
    const onOrdersUpdated = () => {
      try {
        // avoid reacting to transient empty orders state (causes flicker)
        try {
          const maybeOrders = readOrdersFromStorage();
          if (Array.isArray(maybeOrders) && maybeOrders.length === 0 && ordersUpdateRetries < 3) {
            ordersUpdateRetries += 1;
            setTimeout(() => { try { onOrdersUpdated(); } catch(_){} }, 250);
            return;
          }
          ordersUpdateRetries = 0;
        } catch (_) {}

        const raw = localStorage.getItem('cashFlowDetails');
        let parsed = raw ? JSON.parse(raw) : [];
        try { parsed = Array.isArray(parsed) ? parsed.filter((d:any) => { const num = String(d.numero||'').toLowerCase(); const digits = String(d.numero||'').replace(/\D/g,''); if (num === 'n000002') return false; if (digits === '2') return false; return true; }) : parsed; } catch(e) {}
        const rawDel = localStorage.getItem('deletedOrders');
        const dels = rawDel ? JSON.parse(rawDel) : [];
        const filtered = Array.isArray(dels) && dels.length > 0 ? (parsed || []).filter((p:any) => !dels.includes(String(p.orderId) || String(p.numero) || String(p.id))) : parsed;
        try {
          const normalized = normalizeEntries(filtered);
          setCashFlowDetails(normalized);
          setPendingPayments(normalized.filter((d:any) => d.status === 'Pendente'));
        } catch (e) {
          setCashFlowDetails(filtered);
          setPendingPayments(filtered.filter((d:any) => d.status === 'Pendente'));
        }
        // schedule a server refetch but debounce to avoid spikes
        scheduleFetch();
      } catch (e) {}
    };

    window.addEventListener('financeUpdated', onFinanceUpdated as EventListener);
    window.addEventListener('ordersUpdated', onOrdersUpdated as EventListener);
    const onRetryFluxo = () => {
      try { delete (window as any).__fluxoCaixaMissing; fetchFinanceiro(); } catch (e) { console.warn('retryFluxo failed', e); }
    };
    window.addEventListener('retryFluxo', onRetryFluxo as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener('financeUpdated', onFinanceUpdated as EventListener);
      window.removeEventListener('ordersUpdated', onOrdersUpdated as EventListener);
      window.removeEventListener('retryFluxo', onRetryFluxo as EventListener);
    };
  }, []);

  // Realtime subscription: trigger refresh when backend fluxo_caixa or ordens change
  useEffect(() => {
    if (!(supabase && typeof (supabase as any).channel === 'function')) return;
    let fluxoCh: any = null;
    let ordensCh: any = null;
    try {
      fluxoCh = (supabase as any).channel('realtime:fluxo_caixa')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'fluxo_caixa' }, () => { try { window.dispatchEvent(new CustomEvent('financeUpdated')); } catch(_){} })
        .subscribe();
      ordensCh = (supabase as any).channel('realtime:ordens')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ordens' }, () => { try { window.dispatchEvent(new CustomEvent('ordersUpdated')); window.dispatchEvent(new CustomEvent('financeUpdated')); } catch(_){} })
        .subscribe();
    } catch (e) { console.warn('realtime sub failed', e); }
    return () => {
      try { if (fluxoCh && typeof fluxoCh.unsubscribe === 'function') fluxoCh.unsubscribe(); } catch(_){}
      try { if (ordensCh && typeof ordensCh.unsubscribe === 'function') ordensCh.unsubscribe(); } catch(_){}
    };
  }, []);

  const handleCobranca = (client: any) => {
    const message = `Olá ${client.client}! 😊\n\n*Cleusa Ateliê de Costura*\n\nEsperamos que sua peça tenha ficado perfeita!\n\nGostaríamos de lembrá-lo(a) sobre o pagamento pendente do serviço realizado:\n\n*Serviço:* ${client.service}\n*Valor:* R$ ${parseCurrency(client.value ?? client.valor ?? 0).toFixed(2)}\n*Data:* ${client.date}\n\n*DADOS PARA PAGAMENTO PIX:*\n\n*Nome:* Cleusa Belani David\n*Telefone:* 45999126130\n*CPF:* 64166724053\n\nContamos com sua compreensão e aguardamos seu pagamento.\n\nQualquer dúvida, estamos à disposição! ✨`;
    
    setSelectedClient({ ...client, message });
    setShowCobrancaModal(true);
  };

  const handleConfirmPayment = (client: any) => {
    setSelectedClient(client);
    setShowConfirmPaymentModal(true);
  };

  const confirmPayment = () => {
    // Remove da lista de pendentes (UI)
    setPendingPayments(pendingPayments.filter(p => p.id !== selectedClient.id));

    // Atualiza no fluxo de caixa detalhado (UI)
    const updated = cashFlowDetails.map(item => 
      item.id === selectedClient.id ? { ...item, status: 'Pago' } : item
    );
    setCashFlowDetails(updated);

    // persist update to localStorage so other pages see it immediately
    try {
      const raw = localStorage.getItem('cashFlowDetails');
      const parsed = raw ? JSON.parse(raw) : [];
      const idx = (parsed || []).findIndex((c:any) => String(c.id) === String(selectedClient.id) || String(c.orderId || c.orderid) === String(selectedClient.orderId || selectedClient.orderid) || String(c.numero || '') === String(selectedClient.numero));
      if (idx >= 0) {
        parsed[idx] = { ...parsed[idx], ...updated.find((u:any)=>String(u.id)===String(parsed[idx].id)) , status: 'Pago' };
      } else {
        // if not found by id, try to append/update by numero
        parsed.unshift({ ...selectedClient, status: 'Pago' });
      }
      try { safeSetItem('cashFlowDetails', parsed, 'financeUpdated', 'FinanceiroPage'); } catch(e){}
      try { console.info('fluxo_caixa: local updated on confirmPayment, total', (parsed||[]).length); } catch(e){}
    } catch (e) { console.warn('failed to persist cashFlowDetails locally on confirmPayment', e); }

    // try to persist to Supabase
    (async () => {
          try {
        if (isFluxoAvailable() && supabase && typeof supabase.from === 'function') {
          const res = await supabase.from('fluxo_caixa').update({ status: 'Pago' }).eq('id', selectedClient.id);
          if ((res as any).error) {
            if ((res as any).error.code === 'PGRST205') { markFluxoMissing(); }
            console.warn('Supabase confirmPayment error', (res as any).error);
          }
        }
      } catch (e) { console.warn('confirmPayment persistence failed', e); }
    })();

    // also try to persist payment status to the ordens table (authoritative source)
    (async () => {
      try {
        if (supabase && typeof supabase.from === 'function') {
          // prefer order id, fall back to numero
          try {
            if (selectedClient.orderId || selectedClient.orderid) {
              const byId = await supabase.from('ordens').update({ paymentStatus: 'Pago' }).eq('id', selectedClient.orderId || selectedClient.orderid);
              if ((byId as any).error) {
                console.warn('Supabase ordens update by id error', (byId as any).error);
              } else {
                try { window.dispatchEvent(new CustomEvent('refetchOrdersFromServer')); } catch(e){}
              }
            } else if (selectedClient.numero) {
              const byNum = await supabase.from('ordens').update({ paymentStatus: 'Pago' }).eq('numero', selectedClient.numero);
              if ((byNum as any).error) {
                console.warn('Supabase ordens update by numero error', (byNum as any).error);
              } else {
                try { window.dispatchEvent(new CustomEvent('refetchOrdersFromServer')); } catch(e){}
              }
            }
          } catch (e) {
            console.warn('failed to persist paymentStatus to ordens', e);
          }
        }
      } catch (e) {
        console.warn('ordens persistence block failed', e);
      }
    })();

    // also mark related order as paid (local + try supabase)
    try {
      const ordersArr = readOrdersFromStorage();
      const idx = ordersArr.findIndex((o:any) => String(o.id) === String(selectedClient.orderId) || String(o.id) === String(selectedClient.orderid) || String(o.numero) === String(selectedClient.numero) || String(o.numero) === String(selectedClient.orderId));
      if (idx >= 0) {
        ordersArr[idx].paymentStatus = 'Pago';
      } else {
        // try to find by client+service+date as fallback
        const fallbackIdx = ordersArr.findIndex((o:any) => (o.client === selectedClient.client || o.client === selectedClient.client_name) && (String(o.value).includes(String(selectedClient.value)) || Number(o.value) === Number(selectedClient.value)));
        if (fallbackIdx >= 0) ordersArr[fallbackIdx].paymentStatus = 'Pago';
      }
      try { safeSetItem('orders', ordersArr, 'ordersUpdated', 'FinanceiroPage'); } catch(e){}
    } catch (e) { console.warn('failed to update orders locally on confirmPayment', e); }
    // Do NOT update `ordens` table with `paymentStatus` here — update is handled via `fluxo_caixa` and local merge.

    setShowConfirmPaymentModal(false);
    setSelectedClient(null);
  };

  const handleRowClick = (item: any) => {
    if (item.status === 'Pendente') {
      setSelectedClient(item);
      setShowConfirmPaymentModal(true);
      return;
    }
    if (item.status === 'Pago') {
      try {
        const ok = window.confirm('Marcar esta OS como NÃO PAGO?');
        if (!ok) return;
        markOrderNotPaid(item);
      } catch (e) { console.warn('mark not paid confirm failed', e); }
    }
  };

  const markOrderNotPaid = async (grp: any) => {
    try {
      const updated = (cashFlowDetails || []).map((c:any) => {
        try {
          const cid = String(c.orderId || c.orderid || c.numero || c.id || '');
          if (String(cid) === String(grp.orderId) || String(cid) === String(grp.numero) || String(cid) === String(grp.key)) {
            return { ...c, status: 'Não pago' };
          }
        } catch (_) {}
        return c;
      });
      setCashFlowDetails(updated);
      try { safeSetItem('cashFlowDetails', updated, 'financeUpdated', 'FinanceiroPage'); } catch(e){}
      if (supabase && typeof supabase.from === 'function') {
        try {
          if (grp.orderId) {
            await supabase.from('ordens').update({ paymentStatus: 'Não pago' }).eq('id', grp.orderId);
          } else if (grp.numero) {
            await supabase.from('ordens').update({ paymentStatus: 'Não pago' }).eq('numero', String(grp.numero));
          }
          try { window.dispatchEvent(new CustomEvent('refetchOrdersFromServer')); } catch(_){}
        } catch (e) { console.warn('supabase mark not paid failed', e); }
      }
    } catch (e) { console.warn('markOrderNotPaid failed', e); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Mensagem copiada!');
  };

  const openWhatsApp = () => {
    if (!selectedClient) return;
    const message = encodeURIComponent(selectedClient.message);
    const phone = selectedClient.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    setShowCobrancaModal(false);
  };

  // compute merged entries once and aggregate by OS so totals use canonical per-order totals
  const _mergedEntries = mergePaidOrdersIntoEntries(cashFlowDetails || []);
  const _aggregatedByOrder = aggregateByOrder(_mergedEntries || []);
  // pending sum computed from aggregated groups (A Receber)
  const totalPending = (_aggregatedByOrder || []).reduce((sum, g) => {
    const status = String(g.status || '').toLowerCase();
    if (status === 'pago') return sum;
    return sum + parseCurrency(g.total ?? 0);
  }, 0);

  const [showDebugModal, setShowDebugModal] = useState(false);
  const [debugData, setDebugData] = useState<any>({});
  const [filterPaid, setFilterPaid] = useState(false);

  // compute totals from cashFlowDetails
  function parseCurrency(raw: any) {
    try {
      if (raw === null || raw === undefined) return 0;
      if (typeof raw === 'number') return raw;
      let s = String(raw).trim();
      // remove currency symbol and spaces
      s = s.replace(/R\$/g, '').replace(/\s/g, '');
      // if contains both '.' and ',' assume '.' thousands and ',' decimals
      if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) {
        s = s.replace(/\./g, '').replace(/,/g, '.');
      } else if (s.indexOf(',') !== -1 && s.indexOf('.') === -1) {
        // only comma present as decimal separator
        s = s.replace(/,/g, '.');
      } else {
        // only dots or only digits: leave as-is
      }
      let n = parseFloat(s);
      if (isNaN(n)) {
        // fallback: extract digits and treat last two as cents
        const digits = String(raw).replace(/\D/g, '');
        if (!digits) return 0;
        if (digits.length <= 2) return parseFloat(digits) / 100;
        const reais = digits.slice(0, -2);
        const cents = digits.slice(-2);
        n = parseFloat(reais + '.' + cents);
      }
      return isNaN(n) ? 0 : n;
    } catch (e) { return 0; }
  };

  const reconcileCashWithOrders = (entries: any[]) => {
    try {
      if (!Array.isArray(entries)) return entries || [];
      const orders = readOrdersFromStorage();
      if (!Array.isArray(orders) || orders.length === 0) return entries;
      return (entries || []).map((e:any) => {
        try {
          const match = orders.find((o:any) => String(o.id) === String(e.orderId || e.orderid) || String(o.numero) === String(e.numero));
          if (match) {
            // if the order explicitly is not paid, prefer that and mark cash entry as not paid locally
            const orderPaid = String(match.paymentStatus || '').toLowerCase() === 'pago';
            if (!orderPaid) {
              return { ...e, status: 'Não pago' };
            }
          }
        } catch (err) {}
        return e;
      });
    } catch (err) { return entries || []; }
  };

  // Merge paid orders (from local orders storage) into fluxo entries when missing
  function mergePaidOrdersIntoEntries(entries: any[]) {
    try {
      const orders = readOrdersFromStorage();
      if (!Array.isArray(orders) || orders.length === 0) return entries || [];
      const existingKeys = new Set<string>();
      const normalizeKey = (s: any) => String(s || '').replace(/\D/g, '');
      (entries || []).forEach((e:any) => {
        try {
          const raw = String(e.numero || e.orderId || e.id || '');
          existingKeys.add(raw);
          const digits = normalizeKey(raw);
          if (digits) existingKeys.add(digits);
        } catch (e) {}
      });
      const result = (entries || []).slice();
      orders.forEach((o:any) => {
        try {
          const paid = String(o.paymentStatus || o.finalPaid || '').toLowerCase() === 'pago' || !!o.finalPaid;
          if (!paid) return;
          const rawKey = String(o.numero || o.id || '');
          const digitsKey = normalizeKey(rawKey);
          if (existingKeys.has(rawKey) || (digitsKey && existingKeys.has(digitsKey))) return;
          const value = parseCurrency(o.value ?? o.total ?? o.total_valor ?? 0);
          const synthetic = {
            id: `order-${o.id || rawKey}`,
            orderId: o.id,
            numero: o.numero,
            client: o.client || o.nome || o.cliente || '',
            service: '',
            pieces: o.pecas || o.pieces || [],
            value,
            status: 'Pago',
            date: o.date || o.data || o.created_at || ''
          };
          // attach a readable service summary if available
          try { synthetic.service = formatPiecesSummary(synthetic); } catch (e) {}
          result.push(synthetic);
        } catch (e) {}
      });
      return result;
    } catch (e) { return entries || []; }
  }

  // Aggregate entries by order (numero/orderId) producing lines and total per OS
  function aggregateByOrder(entries: any[]) {
    try {
      const map: Record<string, any> = {};
      (entries || []).forEach((e:any) => {
        try {
          const key = String(e.numero || e.orderId || e.id || 'unassigned');
          if (!map[key]) map[key] = { key, numero: e.numero, orderId: e.orderId, client: e.client || '', lines: [], total: 0, status: e.status || '', date: '' };
          // populate date if available (keep first non-empty)
          try {
            map[key].date = map[key].date || (e.date || e.data || e.data_entrega || e.dataEntrega || e.created_at || e.createdAt || e.dateOut || '');
          } catch (er) {}
          const serviceLabel = (e.service || e.servico || e.description || '').toString().trim();
          const v = parseCurrency(e.value ?? e.valor ?? e.total ?? 0);
          // build a combined label: pieces summary + service + status when available
          let builtLabel = '';
          try {
            const piecesSummary = formatPiecesSummary(e);
            if (piecesSummary && serviceLabel) {
              // extract service names present in piecesSummary parentheses
              const svcSet = new Set<string>();
              try {
                const re = /\(([^)]+)\)/g;
                let m;
                while ((m = re.exec(String(piecesSummary || ''))) !== null) {
                  const parts = (m[1] || '').split(/[,;|]/).map((s:any)=>String(s).trim().toLowerCase()).filter(Boolean);
                  parts.forEach((p:any)=>svcSet.add(p));
                }
              } catch(e) {}
              // split serviceLabel into parts
              const svcParts = String(serviceLabel || '').split(/[,;|]/).map((s:any)=>String(s).trim()).filter(Boolean);
              const remaining = svcParts.filter((p:any)=> !svcSet.has(String(p).toLowerCase()));
              if (remaining.length > 0) {
                builtLabel = `${piecesSummary} - ${remaining.join(', ')}`;
              } else {
                builtLabel = piecesSummary;
              }
            } else if (piecesSummary) builtLabel = piecesSummary;
            else if (serviceLabel) builtLabel = `${serviceLabel}`;
            else builtLabel = 'Serviço';
          } catch (er) { builtLabel = serviceLabel || 'Serviço'; }
          map[key].lines.push({ label: builtLabel, value: v });
          map[key].total += v;
          if ((String(e.status || '').toLowerCase() === 'pago')) map[key].status = 'Pago';
        } catch (e) {}
      });
      // if group date missing, try to populate from local orders
      try {
        const orders = readOrdersFromStorage();
        if (Array.isArray(orders) && orders.length > 0) {
          Object.keys(map).forEach(k => {
            try {
              if (map[k].date) return;
              const keyNum = String(map[k].numero || map[k].orderId || '');
              const match = orders.find((o:any) => String(o.id) === String(map[k].orderId) || String(o.numero) === String(map[k].numero) || String(o.numero) === String(keyNum));
              if (match) map[k].date = match.data || match.date || match.created_at || match.createdAt || match.data_entrega || match.dataEntrega || '';
            } catch (e) {}
          });
        }
      } catch (e) {}

      // dedupe lines inside each group (case-insensitive)
      Object.keys(map).forEach(k => {
        try {
          const seen = new Set<string>();
          const uniqLines: any[] = [];
          (map[k].lines || []).forEach((ln:any) => {
            const keyLabel = String(ln.label || '').trim().toLowerCase();
            if (!seen.has(keyLabel)) { seen.add(keyLabel); uniqLines.push(ln); }
          });
          map[k].lines = uniqLines;
        } catch (er) {}
      });
      const arr = Object.values(map);
      // prefer canonical order total from local `orders` when available to avoid summing duplicated cash rows
      try {
        const orders = readOrdersFromStorage();
        if (Array.isArray(orders) && orders.length > 0) {
          arr.forEach((g:any) => {
            try {
              const keyNum = String(g.numero || g.orderId || '').replace(/\D/g,'');
              const match = orders.find((o:any) => String(o.id) === String(g.orderId) || String((o.numero||'')).replace(/\D/g,'') === keyNum || String(o.numero) === String(g.numero));
              if (match) {
                    const ot = parseCurrency(match.total ?? match.value ?? match.valor ?? match.total_valor ?? 0);
                    if (ot && ot > 0) {
                      // prefer canonical order total and use order's service summary
                      g.total = ot;
                      try {
                        const svcLabel = formatPiecesSummary(match) || (match.service || match.servico || match.description || '');
                        const lineLabel = svcLabel || 'Serviço';
                        // replace aggregated lines with a canonical single-line summary from the order
                        g.lines = [{ label: lineLabel, value: ot }];
                        g.client = match.client || match.nome || match.cliente || g.client;
                        g.status = (String(match.paymentStatus || '').toLowerCase() === 'pago') ? 'Pago' : (g.status || '');
                      } catch (e) { /* keep existing lines on failure */ }
                    }
                  }
            } catch (e) {}
          });
        }
      } catch (e) {}
      // sort by numeric OS number when available
      arr.sort((a:any,b:any) => {
        const an = Number(String(a.numero || a.orderId || '').replace(/\D/g,'')) || 0;
        const bn = Number(String(b.numero || b.orderId || '').replace(/\D/g,'')) || 0;
        return an - bn;
      });
      return arr;
    } catch (e) { return entries || []; }
  }

  // include merged paid orders when computing receitas/recebido so totals align with orders-based reports
  // compute receitas/recebido from aggregated per-order totals to avoid double-counting
  const receitas = (_aggregatedByOrder || []).reduce((sum, g) => {
    const v = parseCurrency(g.total ?? 0);
    return sum + (v > 0 ? v : 0);
  }, 0);
  const recebido = (_aggregatedByOrder || []).reduce((sum, g) => {
    if (String(g.status || '').toLowerCase() === 'pago') return sum + parseCurrency(g.total ?? 0);
    return sum;
  }, 0);
  // despesas still computed from merged entries (fluxo) where tipo is 'despesa' or negative values
  const despesas = (_mergedEntries || []).reduce((sum, it) => {
    const v = parseCurrency(it.value ?? it.valor ?? 0);
    const tipo = (it.tipo || it.type || '').toString().toLowerCase();
    if (tipo === 'despesa' || v < 0) return sum + Math.abs(v);
    return sum;
  }, 0);
  const lucro = receitas - despesas;

  function formatPiecesSummary(item: any) {
    try {
      const p = item.pecas || item.pieces || [];
      if (!Array.isArray(p) || p.length === 0) return '';
      const map: Record<string, { count: number; services: Set<string> }> = {};
      (p || []).forEach((x: any) => {
        const tipo = String(x.tipo || x.nome || x.name || '').trim() || 'Peça';
        if (!map[tipo]) map[tipo] = { count: 0, services: new Set() };
        map[tipo].count += 1;
        const svcArr = x.services || x.servicos || [];
        (svcArr || []).forEach((s: any) => {
          const name = String(s?.name || s?.nome || s?.titulo || s).trim();
          if (name) map[tipo].services.add(name);
        });
      });
      const parts = Object.entries(map).map(([tipo, info]) => {
        const svc = Array.from(info.services).join(', ');
        return `${info.count} ${tipo}${svc ? ' (' + svc + ')' : ''}`;
      });
      return parts.join(', ');
    } catch (e) { return ''; }
  }

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar />
      
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0">
        <div className="p-3 lg:p-8 max-w-screen-xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 lg:mb-6 gap-2">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg lg:text-2xl font-bold text-gray-900 mb-0.5 lg:mb-1">Financeiro</h1>
                {/* fluxoStatus hidden near title per UX request */}
              </div>
              <p className="text-xs lg:text-sm text-gray-600">Controle suas receitas e despesas</p>
              
            </div>
            {/* Botões de teste: mobile e desktop */}
              <div className="flex items-center gap-2">
              
              {typeof window !== 'undefined' && window.location.search.includes('debug') && (
                <div className="hidden lg:flex items-center gap-2">
                  <button onClick={() => { try { const localRaw = localStorage.getItem('cashFlowDetails'); const local = localRaw ? JSON.parse(localRaw) : []; const orders = readOrdersFromStorage(); const correlations = (cashFlowDetails||[]).map((d:any)=> ({ entry: d, matchedOrder: (orders||[]).find((o:any)=> String(o.id) === String(d.orderId || d.orderid) || String(o.numero) === String(d.numero)) || null })); setDebugData({ cashFlowDetails, localStorageEntries: local, orders, correlations }); setShowDebugModal(true); } catch(e){ console.warn('show debug failed', e); } }} className="ml-2 px-2 py-1 text-xs bg-gray-100 text-gray-800 border rounded">Mostrar dados (debug)</button>
                  <button onClick={() => {
                      try {
                        const orders = readOrdersFromStorage();
                        const cashLocalRaw = localStorage.getItem('cashFlowDetails');
                        const cashLocal = cashLocalRaw ? JSON.parse(cashLocalRaw) : [];
                        const runtimeCash = cashFlowDetails || [];
                        const mergedFromLocal = mergePaidOrdersIntoEntries(cashLocal || []);
                        const mergedFromState = mergePaidOrdersIntoEntries(runtimeCash || []);
                        const sumOrders = (orders||[]).reduce((s:any,o:any)=> s + (Number(o.total || o.value || o.valor || 0) || 0), 0);
                        const sumMergedLocal = (mergedFromLocal||[]).reduce((s:any,e:any)=> s + (parseCurrency(e.value ?? e.valor ?? e.total ?? 0) || 0), 0);
                        const sumMergedState = (mergedFromState||[]).reduce((s:any,e:any)=> s + (parseCurrency(e.value ?? e.valor ?? e.total ?? 0) || 0), 0);
                        const payload = { orders, cashLocal, runtimeCash, mergedLocal: mergedFromLocal, mergedState: mergedFromState, totals: { sumOrders, sumMergedLocal, sumMergedState, receitas: sumMergedState || 0, recebido: recebido || 0, despesas: despesas || 0, totalPending } };
                        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `financeiro-debug-${Date.now()}.json`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } catch (e) { console.warn('export debug failed', e); alert('Export failed: ' + String(e)); }
                    }} className="ml-2 px-2 py-1 text-xs bg-blue-50 text-blue-700 border rounded">Exportar debug</button>
                </div>
              )}
            </div>
            <div className="flex gap-1.5 lg:gap-2">
              <button
                onClick={() => setSelectedPeriod('semana')}
                className={`px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedPeriod === 'semana'
                    ? 'bg-rose-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setSelectedPeriod('mes')}
                className={`px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedPeriod === 'mes'
                    ? 'bg-rose-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Mês
              </button>
              <button
                onClick={() => setSelectedPeriod('ano')}
                className={`px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedPeriod === 'ano'
                    ? 'bg-rose-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Ano
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2 lg:gap-6 mb-3 lg:mb-6">
            <div className="bg-white rounded-lg p-2.5 lg:p-6 border border-gray-200">
                <div className="flex flex-col gap-1.5 lg:gap-2">
                <div className="w-7 h-7 lg:w-10 lg:h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <i className="ri-arrow-up-line text-base lg:text-xl text-green-600 w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center"></i>
                  </div>
                <div>
                  <p className="text-sm lg:text-sm text-gray-600 mb-0.5">Receitas</p>
                  <p className="text-sm lg:text-2xl font-bold text-gray-900">R$ {receitas.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setFilterPaid(!filterPaid)}
              className={`rounded-lg p-2.5 lg:p-6 border ${filterPaid ? 'border-indigo-400 ring-1 ring-indigo-200' : 'border-gray-200'} bg-white cursor-pointer text-left`}
            >
              <div className="flex flex-col gap-1.5 lg:gap-2">
                <div className="w-7 h-7 lg:w-10 lg:h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <i className="ri-checkbox-circle-line text-base lg:text-xl text-indigo-600 w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-sm lg:text-sm text-gray-600 mb-0.5">Recebido</p>
                  <p className={`text-sm lg:text-2xl font-bold ${filterPaid ? 'text-indigo-600' : 'text-gray-900'}`}>R$ {recebido.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </button>

            <div className="bg-white rounded-lg p-2.5 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-1.5 lg:gap-2">
                <div className="w-7 h-7 lg:w-10 lg:h-10 bg-red-100 rounded-lg flex items-center justify-center">
                  <i className="ri-arrow-down-line text-base lg:text-xl text-red-600 w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-sm lg:text-sm text-gray-600 mb-0.5">Despesas</p>
                  <p className="text-sm lg:text-2xl font-bold text-gray-900">R$ {despesas.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-2.5 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-1.5 lg:gap-2">
                <div className="w-7 h-7 lg:w-10 lg:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-wallet-line text-sm lg:text-xl text-blue-600 w-3.5 h-3.5 lg:w-5 lg:h-5 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-[9px] lg:text-sm text-gray-600 mb-0.5">Lucro</p>
                  <p className="text-xs lg:text-2xl font-bold text-gray-900">R$ {lucro.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPendingPayments(!showPendingPayments)}
              className="bg-white rounded-lg p-2.5 lg:p-6 border-2 border-amber-200 hover:border-amber-300 transition-all cursor-pointer text-left"
            >
              <div className="flex flex-col gap-1.5 lg:gap-2">
                <div className="w-7 h-7 lg:w-12 lg:h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <i className="ri-time-line text-sm lg:text-2xl text-amber-600 w-3.5 h-3.5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-[9px] lg:text-sm text-gray-600 mb-0.5">A Receber</p>
                  <p className="text-xs lg:text-2xl font-bold text-gray-900">R$ {totalPending.toFixed(2)}</p>
                  <p className="text-[8px] lg:text-xs text-amber-600 font-medium mt-0.5">
                    {pendingPayments.length} {pendingPayments.length === 1 ? 'cliente' : 'clientes'}
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Lista de Pagamentos Pendentes */}
          {showPendingPayments && (
            <div className="bg-white rounded-lg border-2 border-amber-200 mb-3 lg:mb-6 animate-fadeIn">
              <div className="p-3 lg:p-6 border-b border-amber-200 bg-amber-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm lg:text-lg font-bold text-gray-900">Pagamentos Pendentes</h2>
                    <p className="text-xs lg:text-sm text-gray-600 mt-0.5">Clientes com valores em aberto</p>
                  </div>
                  <button
                    onClick={() => setShowPendingPayments(false)}
                    className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                  >
                    <i className="ri-close-line text-lg lg:text-xl w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center"></i>
                  </button>
                </div>
              </div>
              <div className="p-3 lg:p-6 space-y-2 lg:space-y-3">
                {pendingPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 lg:p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs lg:text-sm font-bold text-gray-900">{payment.client}</p>
                        {payment.daysLate > 5 && (
                          <span className="px-1.5 lg:px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[8px] lg:text-xs font-bold whitespace-nowrap">
                            {payment.daysLate} dias
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] lg:text-sm text-gray-700"><strong>{payment.service}</strong></p>
                      <p className="text-[9px] lg:text-xs text-gray-500">Vencimento: {payment.date}</p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-xs lg:text-base font-bold text-amber-700 mb-2">R$ {parseCurrency(payment.value).toFixed(2)}</p>
                      <div className="flex gap-1.5 lg:gap-2">
                        <button
                          onClick={() => handleCobranca(payment)}
                          className="px-2 lg:px-3 py-1 lg:py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all text-[9px] lg:text-xs font-medium whitespace-nowrap cursor-pointer flex items-center gap-1"
                        >
                          <i className="ri-message-3-line text-xs lg:text-sm w-3 h-3 lg:w-4 lg:h-4 flex items-center justify-center"></i>
                          Cobrar
                        </button>
                        <button
                          onClick={() => handleConfirmPayment(payment)}
                          className="px-2 lg:px-3 py-1 lg:py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-[9px] lg:text-xs font-medium whitespace-nowrap cursor-pointer flex items-center gap-1"
                        >
                          <i className="ri-check-line text-xs lg:text-sm w-3 h-3 lg:w-4 lg:h-4 flex items-center justify-center"></i>
                          Pago
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recentes: removido por solicitação do usuário */}
          <div className="mb-3" />

          {/* Fluxo de Caixa Detalhado */}
          <div className="bg-white rounded-lg border border-gray-200 mb-3 lg:mb-6">
            <div className="p-2.5 lg:p-6 border-b border-gray-200">
              <h2 className="text-sm lg:text-lg font-bold text-gray-900">Fluxo de Caixa Detalhado</h2>
              <p className="text-xs lg:text-sm text-gray-600 mt-0.5">Movimentações por cliente e serviço - Clique nos pendentes para marcar como pago</p>
            </div>
            {/* Mobile: stacked list for cash flow */}
            <div className="sm:hidden p-2.5 space-y-2">
              {(() => {
                const merged = mergePaidOrdersIntoEntries(cashFlowDetails || []);
                const sorted = (merged || []).slice().sort((a:any,b:any) => {
                  const ad = String(a.numero||a.orderId||'').replace(/\D/g,'');
                  const bd = String(b.numero||b.orderId||'').replace(/\D/g,'');
                  return (Number(ad) || 0) - (Number(bd) || 0);
                });
                const aggregated = aggregateByOrder(sorted || []);
                const filtered = filterPaid ? (aggregated || []).filter((g:any) => String(g.status || '').toLowerCase() === 'pago') : aggregated;
                return filtered.map((grp:any) => (
                  <div key={grp.key} className="bg-white p-3 rounded-lg border">
                    <div className="flex flex-col">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">{grp.client}</p>
                        <div className="text-sm text-gray-600 space-y-0.5 break-words">
                          {grp.lines.map((l:any, idx:number) => (
                            <div key={idx}>
                              <span className="font-semibold text-sm text-gray-800 break-words">{l.label}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-[10px] text-gray-500">
                          {grp.numero && <span className="block">OS <span className="text-blue-600 font-semibold">N{String(grp.numero).replace(/\D/g,'').padStart(6,'0')}</span></span>}
                          <span className="block">{grp.date || ''}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div />
                        <div className="text-right ml-3">
                          <p className="text-sm font-bold text-green-600">R$ {Number(grp.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                          <span
                            onClick={(e) => {
                              try { e.stopPropagation(); } catch(_){}
                              try {
                                if (String(grp.status || '').toLowerCase() === 'pago') {
                                  const ok = window.confirm('Marcar esta OS como NÃO PAGO?');
                                  if (!ok) return;
                                  markOrderNotPaid(grp);
                                }
                              } catch (e) { console.warn(e); }
                            }}
                            className={`text-[10px] px-1.5 py-0.5 rounded-full ${grp.status === 'Pago' ? 'bg-green-100 text-green-700 cursor-pointer' : 'bg-amber-100 text-amber-700'}`}
                          >
                            {grp.status || ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Desktop/table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-[9px] lg:text-xs font-medium text-gray-600 uppercase tracking-wider">Data</th>
                    <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-[9px] lg:text-xs font-medium text-gray-600 uppercase tracking-wider">Cliente</th>
                    <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-[9px] lg:text-xs font-medium text-gray-600 uppercase tracking-wider">Serviço</th>
                    <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-[9px] lg:text-xs font-medium text-gray-600 uppercase tracking-wider">Valor</th>
                    <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-[9px] lg:text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    const sorted = (cashFlowDetails || []).slice().sort((a:any,b:any) => {
                      const ad = String(a.numero||a.orderId||'').replace(/\D/g,'');
                      const bd = String(b.numero||b.orderId||'').replace(/\D/g,'');
                      return (Number(ad) || 0) - (Number(bd) || 0);
                    });
                    const merged = mergePaidOrdersIntoEntries(cashFlowDetails || []);
                    const sortedAgg = (merged || []).slice().sort((a:any,b:any) => {
                      const ad = String(a.numero||a.orderId||'').replace(/\D/g,'');
                      const bd = String(b.numero||b.orderId||'').replace(/\D/g,'');
                      return (Number(ad) || 0) - (Number(bd) || 0);
                    });
                    const aggregated = aggregateByOrder(sortedAgg || []);
                    const filtered = filterPaid ? (aggregated || []).filter((g:any) => String(g.status || '').toLowerCase() === 'pago') : aggregated;
                    return filtered.map((grp:any) => (
                          <tr 
                            key={grp.key}
                            onClick={() => handleRowClick(grp)}
                            className={`transition-colors ${
                              grp.status === 'Pendente' 
                                ? 'hover:bg-amber-50 cursor-pointer' 
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-3 lg:px-6 py-2 lg:py-4 whitespace-nowrap text-[9px] lg:text-sm text-gray-600">{grp.date || ''}</td>
                            <td className="px-3 lg:px-6 py-2 lg:py-4 text-[10px] lg:text-sm font-medium text-gray-900 max-w-[180px] truncate">{grp.client}</td>
                            <td className="px-3 lg:px-6 py-2 lg:py-4 text-[9px] lg:text-sm text-gray-700 max-w-[360px] break-words">
                              <div className="flex flex-col">
                                <div className="truncate space-y-0.5">
                                  {grp.lines.map((l:any, idx:number) => (
                                    <div key={idx} className="text-[10px] text-gray-800"><span className="font-semibold">{l.label}</span></div>
                                  ))}
                                </div>
                                {grp.numero && <span className="text-[9px] text-gray-500">OS <span className="text-blue-600 font-semibold"><span className="text-sm align-middle">N</span>{` ${String(grp.numero).replace(/\D/g,'').padStart(6,'0')}`}</span></span>}
                              </div>
                            </td>
                            <td className="px-3 lg:px-6 py-2 lg:py-4 text-[10px] lg:text-sm font-bold text-green-600">
                              R$ {(Number(grp.total) || 0).toFixed(2)}
                            </td>
                            <td className="px-3 lg:px-6 py-2 lg:py-4 whitespace-nowrap">
                              <span className={`px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full text-[8px] lg:text-xs font-medium whitespace-nowrap ${
                                grp.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {grp.status}
                              </span>
                            </td>
                          </tr>
                        ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Cobrança */}
      {showCobrancaModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 lg:p-6">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-message-3-line text-2xl text-amber-600 w-6 h-6 flex items-center justify-center"></i>
              </div>
              <h2 className="text-base lg:text-xl font-bold text-gray-900 text-center mb-2">Mensagem de Cobrança</h2>
              <p className="text-xs text-gray-600 text-center mb-3">
                Envie uma mensagem respeitosa de cobrança via WhatsApp
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-[40vh] overflow-y-auto">
                <p className="text-xs lg:text-sm text-gray-900 whitespace-pre-line">{selectedClient.message}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCobrancaModal(false)}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-xs lg:text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => copyToClipboard(selectedClient.message)}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-xs lg:text-sm font-medium whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="ri-file-copy-line text-base lg:text-lg w-4 h-4 flex items-center justify-center"></i>
                  Copiar
                </button>
                {/* WhatsApp button removed */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Pagamento */}
      {showConfirmPaymentModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 lg:p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-check-double-line text-2xl text-green-600 w-6 h-6 flex items-center justify-center"></i>
              </div>
              <h2 className="text-base lg:text-xl font-bold text-gray-900 text-center mb-2">Confirmar Pagamento</h2>
              <p className="text-xs text-gray-600 text-center mb-4">
                Confirmar que o pagamento foi recebido?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Cliente:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedClient.client}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Serviço:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedClient.service}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Valor:</span>
                  <span className="text-sm font-bold text-green-600">R$ {Number(selectedClient.value ?? selectedClient.valor ?? 0).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmPayment}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug modal: mostrar cashFlowDetails em localStorage */}
      {showDebugModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold">Debug - cashFlowDetails</h3>
              <button onClick={()=>setShowDebugModal(false)} className="px-2 py-1 border rounded">Fechar</button>
            </div>
            <div className="text-sm text-gray-700 mb-2">Total: {Array.isArray(debugData?.cashFlowDetails) ? debugData.cashFlowDetails.length : 0} registros</div>
            <div className="mb-3">
              <div className="text-xs font-medium">Correlações (entry → matchedOrder.numero)</div>
              <div className="text-xs text-gray-600 mb-2">{(debugData?.correlations || []).map((c:any)=> (`${c.entry.numero || c.entry.id} → ${c.matchedOrder ? (c.matchedOrder.numero || c.matchedOrder.id) : '—'}`)).join(', ')}</div>
            </div>
            <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">{JSON.stringify(debugData, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
