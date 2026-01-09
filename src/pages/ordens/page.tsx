import { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import NewOsWizard from './NewOsWizard';
import { addPointsForOrder, loadClients, upsertClient, getClientById } from '../../lib/clients';
import { formatMessageForStatus } from '../../lib/messages';
import { supabase } from '../../lib/supabaseClient';
import { debugLog } from '../../lib/debugLogger';

// small constants used by the piece/color pickers when DB lists are missing
const COLORS = ['Preta','Branca','Azul','Vermelha','Verde','Amarela','Rosa','Bege','Cinza','Marrom'];
const DEFAULT_PECAS = [
  { id: 'calca', nome: 'Calça', icone: '👖', categoria: 'calcas' },
  { id: 'camisa', nome: 'Camisa', icone: '👕', categoria: 'camisas' },
  { id: 'vestido', nome: 'Vestido', icone: '👗', categoria: 'vestidos' },
];

// runtime flag to avoid repeated failing requests when the `fluxo_caixa` table is missing
const isFluxoAvailable = () => !((window as any).__fluxoCaixaMissing === true);
const markFluxoMissing = () => { (window as any).__fluxoCaixaMissing = true; console.info('fluxo_caixa table missing — falling back to localStorage'); };

// Normalize various status representations into canonical display strings
const normalizeStatus = (s: any) => {
  try {
    if (s === null || s === undefined) return 'Recebido';
    const str = String(s).trim().toLowerCase();
    if (!str) return 'Recebido';
    if (str === 'draft' || str === 'r' || str === 'recebido') return 'Recebido';
    if (str.includes('costura')) return 'Em costura';
    if (str.includes('prova')) return 'Aguardando prova';
    if (str.includes('ajuste')) return 'Ajuste final';
    if (str.includes('pronto')) return 'Pronto';
    if (str.includes('retir')) return 'Retirado';
    if (str.includes('cancel')) return 'Cancelado';
    return String(s);
  } catch (e) { return String(s || 'Recebido'); }
};

// Aggregate pieces into a compact description like "4 Camiseta (Abrir uma fenda)"
const formatPiecesSummary = (pieces: any[]) => {
  try {
    if (!Array.isArray(pieces) || pieces.length === 0) return '';
    const map: Record<string, { count: number; services: Set<string> }> = {};
    (pieces || []).forEach((p: any) => {
      const tipo = String(p?.tipo || p?.nome || p?.tipo_nome || '').trim() || 'Peça';
      if (!map[tipo]) map[tipo] = { count: 0, services: new Set() };
      map[tipo].count += 1;
      const svcArr = p?.services || p?.servicos || [];
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
};

// build a map of cashFlowDetails by order id/numero, ignoring locally deleted tombstones
const getCashMap = () => {
  try {
    const raw = localStorage.getItem('cashFlowDetails');
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return {};

    let deletedSet = new Set<string>();
    try {
      const deletedRaw = localStorage.getItem('deletedOrders');
      const deletedList = deletedRaw ? JSON.parse(deletedRaw) : [];
      deletedSet = new Set(Array.isArray(deletedList) ? deletedList.map((x:any) => String(x)) : []);
    } catch (e) { /* ignore */ }

    const map: Record<string, any> = {};
    (parsed || []).forEach((c: any) => {
      try {
        const oid = c.orderId || c.orderid;
        const num = c.numero;
        if (oid && deletedSet.has(String(oid))) return;
        if (num && deletedSet.has(String(num))) return;
        if (oid) map[String(oid)] = c;
        if (num) map[String(num)] = c;
      } catch (e) { /* ignore entry */ }
    });
    return map;
  } catch (e) { return {}; }
};

// parse currency helper (similar to Financeiro) to normalize amounts
function parseCurrency(raw: any) {
  try {
    if (raw === null || raw === undefined) return 0;
    if (typeof raw === 'number') return raw;
    let s = String(raw).trim();
    s = s.replace(/R\$/g, '').replace(/\s/g, '');
    if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) {
      s = s.replace(/\./g, '').replace(/,/g, '.');
    } else if (s.indexOf(',') !== -1 && s.indexOf('.') === -1) {
      s = s.replace(/,/g, '.');
    }
    let n = parseFloat(s);
    if (isNaN(n)) {
      const digits = String(raw).replace(/\D/g, '');
      if (!digits) return 0;
      if (digits.length <= 2) return parseFloat(digits) / 100;
      const reais = digits.slice(0, -2);
      const cents = digits.slice(-2);
      n = parseFloat(reais + '.' + cents);
    }
    return isNaN(n) ? 0 : n;
  } catch (e) { return 0; }
}

// safely read `orders` from localStorage; supports forced write shape { __force: true, payload: [...] }
const readOrdersFromStorage = (rawStr?: string) => {
  try {
    const raw = rawStr !== undefined ? rawStr : localStorage.getItem('orders');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && parsed.__force === true && Array.isArray(parsed.payload)) return parsed.payload;
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (e) { return []; }
};

export default function OrdensPage() {
  // small utility for printing tickets during development
  const printTicket = (order: any) => {
    try {
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write('<pre>' + JSON.stringify(order, null, 2) + '</pre>');
      w.document.close();
      w.print();
    } catch (e) { console.warn('print failed', e); }
  };
  
    // component state
    const [orders, setOrders] = useState<any[]>([]);
    const ordersRef = useRef<any[]>([]);
      const ignoreLocalSaveRef = useRef(false);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [orderServices, setOrderServices] = useState<any[]>([]);
    const [clientes, setClientes] = useState<any[]>([]);
    const [availablePieces, setAvailablePieces] = useState<any[]>([]);
    const [debugInfo, setDebugInfo] = useState<any>(null);
    const [debugOpen, setDebugOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // various modal / UI flags used across the component
    const [showStoragePanel, setShowStoragePanel] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showMaterialsModal, setShowMaterialsModal] = useState(false);
    const [showDeliverModal, setShowDeliverModal] = useState(false);
    const [showAdvancePaymentModal, setShowAdvancePaymentModal] = useState(false);
    const [showFidelizacaoModal, setShowFidelizacaoModal] = useState(false);
    const [showStatusMessageOptions, setShowStatusMessageOptions] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showDebugOverlay, setShowDebugOverlay] = useState(true);
    const [showSavedSummary, setShowSavedSummary] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showStatusOnlyModal, setShowStatusOnlyModal] = useState(false);
    const [showConfirmDeliverPrompt, setShowConfirmDeliverPrompt] = useState(false);
    const [showPrintOptions, setShowPrintOptions] = useState(false);
    const [showPecasModal, setShowPecasModal] = useState(false);
    const [showCorModal, setShowCorModal] = useState(false);
    const [showNewClientModal, setShowNewClientModal] = useState(false);
    const [storageImportText, setStorageImportText] = useState('');

    // small UI inputs
    const [statusFilter, setStatusFilter] = useState('Todos');
    const [statusSelection, setStatusSelection] = useState<any>(null);
    const [selectedMaterialId, setSelectedMaterialId] = useState<any>(null);
    const [materialPrice, setMaterialPrice] = useState('');
    const [fidelizacaoMessage, setFidelizacaoMessage] = useState('');
    const [clientePhone, setClientePhone] = useState('');
    const [statusChangeMessage, setStatusChangeMessage] = useState('');
    const [pecasSearch, setPecasSearch] = useState('');
    const [pieceTipo, setPieceTipo] = useState('');
    const [pieceCor, setPieceCor] = useState('');

    // edit modal inputs (added to fix non-opening Edit modal)
    const [editClient, setEditClient] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editServiceName, setEditServiceName] = useState('');
    const [editValue, setEditValue] = useState('');
    const [editStatus, setEditStatus] = useState('Recebido');
    // prevent duplicate quick-status changes while a previous change is in-flight
    const pendingStatusRef = useRef<Set<string>>(new Set());
    const [pendingIds, setPendingIds] = useState<string[]>([]);
    const [toast, setToast] = useState<string | null>(null);
    const [quickTapDebug, setQuickTapDebug] = useState<any>(null);
    const [debugBanner, setDebugBanner] = useState<string | null>(null);
    const APP_VERSION = '332b310';
    const debugMode = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).has('dbg') : false;

    const exportLocalDebug = async () => {
      try {
        const ordersRaw = localStorage.getItem('orders');
        const cashRaw = localStorage.getItem('cashFlowDetails');
        const tapsRaw = localStorage.getItem('retiradoTaps');
        const payload = { orders: ordersRaw ? JSON.parse(ordersRaw) : null, cashFlowDetails: cashRaw ? JSON.parse(cashRaw) : null, retiradoTaps: tapsRaw ? JSON.parse(tapsRaw) : null };
        const txt = JSON.stringify(payload, null, 2);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(txt);
          alert('Debug copiado para a área de transferência. Cole aqui a mensagem.');
        } else {
          // fallback: open new window with the JSON so user can long-press to copy on mobile
          const w = window.open('', '_blank');
          if (w) { w.document.write('<pre>' + txt.replace(/</g, '&lt;') + '</pre>'); w.document.close(); }
          alert('Abra a nova aba e copie o JSON.');
        }
      } catch (e) { alert('Falha ao exportar debug: ' + String(e)); }
    };

    const showToast = (msg: string, ms = 1800) => {
      try { setToast(msg); } catch(_){}
      try { setTimeout(() => setToast(null), ms); } catch(_){}
    };

    const addPendingId = (id: string) => setPendingIds((p) => (p.includes(id) ? p : [...p, id]));
    const removePendingId = (id: string) => setPendingIds((p) => p.filter(x => x !== id));

    const handleQuickTap = async (order: any, newStatus: string, e?: React.MouseEvent) => {
      try { if (e && (e as any).stopPropagation) (e as any).stopPropagation(); } catch(_){}
      try { if (e && (e as any).preventDefault) (e as any).preventDefault(); } catch(_){}
      try { console.debug('[handleQuickTap] start', { id: order && order.id, newStatus }); } catch(_){ }
      try { if (typeof window !== 'undefined') { try { alert('DEBUG: Retirado handler invoked for OS ' + (order && (order.numero || order.id) || 'unknown')); } catch(_){} } } catch(_){ }
      try {
        const existing = localStorage.getItem('retiradoTaps');
        const arr = existing ? JSON.parse(existing) : [];
        const entry = { id: order && order.id, numero: order && order.numero, newStatus, ts: Date.now(), source: 'handleQuickTap', userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null };
        arr.unshift(entry);
        try { localStorage.setItem('retiradoTaps', JSON.stringify(arr.slice(0,200))); } catch(_){}
      } catch (ee) { /* ignore */ }
      try { showToast('Operação enviada'); } catch(_){ }
      try { if (newStatus === 'Retirado') showToast('Solicitado: marcar como Retirado'); } catch(_){}
      try { setQuickTapDebug({ id: order && order.id, newStatus, ts: Date.now() }); localStorage.setItem('lastQuickTap', JSON.stringify({ id: order && order.id, newStatus, ts: Date.now() })); } catch(e) {}
      try { setDebugBanner(`HANDLER: ${newStatus} ${order && order.id ? order.id.slice(0,6) : ''}`); setTimeout(()=>setDebugBanner(null), 2500); } catch(e) {}
      // no optimistic marking here; unpaid deliveries require confirmation
      if (!order || !order.id) return;
      if (pendingIds.includes(order.id) || pendingStatusRef.current.has(order.id)) return;
      addPendingId(order.id);
      try {
        await applyQuickStatus(order, newStatus);
      } catch (err) {
        try { console.warn('handleQuickTap error', err); } catch(_){}
      } finally {
        removePendingId(order.id);
      }
    };
    const [editDateIn, setEditDateIn] = useState('');
    const [editDateOut, setEditDateOut] = useState('');
    const [editObservation, setEditObservation] = useState('');

    // NOTE: removed temporary forced import data to avoid injecting fake records
    // (this block previously added sample orders N00024 and N00025).

  // Initial server fetch: if Supabase is available, try to load canonical orders
  useEffect(() => {
    (async () => {
      try {
        // expose client for manual debugging in browser console
        try { (window as any).supabase = supabase; } catch(e){}
        if (!(supabase && typeof supabase.from === 'function')) return;
        const r = await supabase.from('ordens').select('*').order('numero', { ascending: false });
        console.debug('initial fetch supabase ordens response', r);
        if ((r as any).error) {
          // store debug info so dev can inspect in UI
          try { setDebugInfo((prev:any) => ({ ...(prev||{}), initialFetchError: (r as any).error })); } catch(e){}
          return;
        }
        const raw = (r as any).data || [];
        // Enrich server rows into display-friendly objects before writing to localStorage.
        // This prevents UI reading incomplete raw rows and losing display fields.
        try {
          if (Array.isArray(raw) && raw.length > 0) {
            // build clients map
            let clientsMap: Record<string, any> = {};
            try {
              const clientsList = await loadClients();
              (clientsList || []).forEach((c:any) => { if (c && c.id) clientsMap[String(c.id)] = c; });
            } catch (e) { /* ignore */ }

            const cashMap = getCashMap();
            const formatIsoToBR = (iso:any) => {
              try {
                if (!iso) return '';
                const s = String(iso);
                if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)) return s;
                if (/\d{4}-\d{2}-\d{2}/.test(s)) {
                  const d = new Date(s);
                  if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
                }
                const d2 = new Date(s);
                if (!isNaN(d2.getTime())) return d2.toLocaleDateString('pt-BR');
                return s;
              } catch (e) { return String(iso||''); }
            };

            const enriched: any[] = [];
            // preserve local overrides (like paymentStatus) when enriching server rows
            const localExisting = readOrdersFromStorage();
            const localMapById: Record<string, any> = {};
            const localMapByNumero: Record<string, any> = {};
            if (Array.isArray(localExisting)) {
              localExisting.forEach((l:any) => {
                try { if (l && l.id) localMapById[String(l.id)] = l; } catch(e){}
                try { if (l && l.numero) localMapByNumero[String(l.numero)] = l; } catch(e){}
              });
            }
            for (const o of raw) {
              try {
                let client = o.cliente_id ? clientsMap[String(o.cliente_id)] : null;
                if (!client && o.cliente_id) {
                  try { client = await getClientById(String(o.cliente_id)); } catch(e) { client = null; }
                }
                let parsedNotas: any = {};
                try { parsedNotas = o.notas ? (typeof o.notas === 'string' ? JSON.parse(o.notas) : o.notas) : {}; } catch (e) { parsedNotas = {}; }
                const pieces = parsedNotas.pieces || parsedNotas.pecas || [];
                const services = parsedNotas.services || parsedNotas.servicos || [];
                const servicesText = (services || []).flatMap((s:any) => [s.name || s.titulo || s.title || s.nome || String(s)]).join(', ').trim();
                const pieceSummary = formatPiecesSummary(pieces);

                const cash = cashMap[String(o.id)] || cashMap[String(o.numero)] || null;
                const currentPaid = String(o.paymentStatus || '').toLowerCase() === 'pago';
                const cashPaid = !!(cash && String(cash.status || '').toLowerCase() === 'pago');
                const localOverride = localMapById[String(o.id)] || localMapByNumero[String(o.numero)];
                let finalPaid = false;
                if (localOverride && Object.prototype.hasOwnProperty.call(localOverride, 'paymentStatus')) {
                  finalPaid = String((localOverride.paymentStatus || '')).toLowerCase() === 'pago';
                } else {
                  finalPaid = currentPaid || cashPaid;
                }

                const rawValue = o.value ?? o.total ?? o.total_valor ?? (cash && (cash.value || cash.valor)) ?? null;
                const numericVal = Number(String(rawValue).replace(/[^0-9.-]/g, '').replace(',', '.')) || 0;
                const displayValue = numericVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                const clientName = client?.nome || o.client || o.cliente || o.cliente_nome || o.nome || '';
                const phoneVal = client?.telefone || o.phone || o.telefone || o.celular || '';
                const clientFoto = client?.foto || o.client_foto || o.foto || null;
                const serviceField = pieceSummary || servicesText || o.service || o.servico || o.servicos || o.serviceText || '';
                const dateOutField = formatIsoToBR(o.data_entrega || o.dateOut || o.date_out || o.previsao || o.dataPrevista || o.delivery) || o.dateOut || '';

                // apply local overrides if present (do not lose local paymentStatus)
                const local = (o && String(o.id) && localMapById[String(o.id)]) || (o && String(o.numero) && localMapByNumero[String(o.numero)]) || {};
                enriched.push({
                  ...o,
                  status: normalizeStatus(o.status),
                  client: clientName,
                  phone: phoneVal,
                  client_foto: clientFoto,
                  pieces,
                  services,
                  service: serviceField,
                  dateOut: dateOutField,
                  paymentStatus: (local && local.paymentStatus !== undefined) ? local.paymentStatus : (finalPaid ? 'Pago' : (o.paymentStatus || null)),
                  value: displayValue,
                });
              } catch (e) { enriched.push({ ...o, status: normalizeStatus(o.status) }); }
            }

            // Preserve explicit local paymentStatus values (including null) to avoid
            // server/cash entries from overwriting user's local choice when reloading.
            try {
              const localExistingForMerge = readOrdersFromStorage();
              if (Array.isArray(localExistingForMerge) && localExistingForMerge.length > 0) {
                const localMap: Record<string, any> = {};
                const localMapNum: Record<string, any> = {};
                localExistingForMerge.forEach((l:any) => {
                  try { if (l && l.id) localMap[String(l.id)] = l; } catch(_){}
                  try { if (l && l.numero) localMapNum[String(l.numero)] = l; } catch(_){}
                });
                enriched.forEach((s:any, idx:number) => {
                  try {
                    const local = (s && s.id && localMap[String(s.id)]) || (s && s.numero && localMapNum[String(s.numero)]) || null;
                    if (local && Object.prototype.hasOwnProperty.call(local, 'paymentStatus')) {
                      enriched[idx].paymentStatus = local.paymentStatus;
                    }
                  } catch(_){}
                });
              }
            } catch (e) { /* ignore merge errors */ }
            const forced = { __force: true, payload: enriched };
            localStorage.setItem('orders', JSON.stringify(forced));
            try { window.dispatchEvent(new CustomEvent('refetchOrdersFromServer')); } catch(e){}
          } else {
            try { setDebugInfo((prev:any)=>({ ...(prev||{}), initialFetchInfo: 'server returned no orders; preserving local storage' })); } catch(e){}
          }
        } catch (e) {
          // fallback: if forced write fails, only write raw when local is empty
          try {
              const existingArr = readOrdersFromStorage();
              if (!existingArr || existingArr.length === 0) { localStorage.setItem('orders', JSON.stringify(raw)); try { window.dispatchEvent(new CustomEvent('refetchOrdersFromServer')); } catch(e){} }
          } catch (_) {}
        }
        // initial load saved; enrichment will run via `refetchOrdersFromServer` handler
      } catch (e) { console.warn('initial server fetch failed', e); try { setDebugInfo((prev:any)=>({ ...(prev||{}), initialFetchError: String(e) })); } catch(_){} }
    })();
  }, []);

  // TEMP: remover ordens locais que não existem no banco (manter apenas 22 e 23)
  useEffect(() => {
    const handler = async () => {
      try {
        const parsedRaw: any = readOrdersFromStorage();
        if (!Array.isArray(parsedRaw) || parsedRaw.length === 0) return;

        // tombstones (deletedOrders)
        let deletedArr: string[] = [];
        try { const rawDeletedLocal = localStorage.getItem('deletedOrders'); const parsedDeleted = rawDeletedLocal ? JSON.parse(rawDeletedLocal) : []; deletedArr = Array.isArray(parsedDeleted) ? parsedDeleted.map((x:any)=>String(x)) : []; } catch(e) { deletedArr = []; }

        const serverIdSet = new Set<string>(parsedRaw.map((r:any) => String(r.id)).filter(Boolean));
        const serverNumSet = new Set<string>(parsedRaw.map((r:any) => String(r.numero || '').replace(/\D/g,'')).filter(Boolean));
        const cleaned = deletedArr.filter((d:string) => { const dClean = String(d||''); if (serverIdSet.has(dClean)) return false; if (serverNumSet.has(dClean.replace(/\D/g,''))) return false; return true; });
        if (cleaned.length !== deletedArr.length) { try { localStorage.setItem('deletedOrders', JSON.stringify(cleaned)); } catch(e){} }

        const deletedSet = new Set<string>(cleaned);
        const rawFiltered = deletedSet.size > 0 ? parsedRaw.filter((o:any) => !deletedSet.has(String(o.id)) && !deletedSet.has(String(o.numero))) : parsedRaw;

        // load clients map
        let clientsMap: Record<string, any> = {};
        try { const clientsList = await loadClients(); (clientsList||[]).forEach((c:any) => { if (c && c.id) clientsMap[String(c.id)] = c; }); } catch(e) { /* ignore */ }

        const cashMap = getCashMap();

        const formatIsoToBR = (iso:any) => {
          try {
            if (!iso) return '';
            const s = String(iso);
            if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)) return s;
            if (/\d{4}-\d{2}-\d{2}/.test(s)) { const d = new Date(s); if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR'); }
            const d2 = new Date(s); if (!isNaN(d2.getTime())) return d2.toLocaleDateString('pt-BR');
            return s;
          } catch (e) { return String(iso||''); }
        };

        const data: any[] = rawFiltered.map((o:any) => {
          try {
            let client: any = o.cliente_id ? clientsMap[String(o.cliente_id)] : null;
            // best-effort: keep existing client object if already present
            if (!client && o.cliente_id) { try { /* attempt server fetch */ } catch(e) { /* ignore */ } }
            let parsedNotas: any = {};
            try { parsedNotas = o.notas ? (typeof o.notas === 'string' ? JSON.parse(o.notas) : o.notas) : {}; } catch(e) { parsedNotas = {}; }
            const pieces = parsedNotas.pieces || parsedNotas.pecas || o.pieces || [];
            const services = parsedNotas.services || parsedNotas.servicos || (pieces||[]).flatMap((p:any) => p.services || []);
            const servicesText = (services || []).flatMap((s:any) => [s.name || s.titulo || s.title || s.nome || String(s)]).join(', ').trim();
            const pieceSummary = formatPiecesSummary(pieces);

              const cash = cashMap[String(o.id)] || cashMap[String(o.numero)] || null;
              const currentPaid = String(o.paymentStatus || '').toLowerCase() === 'pago';
              const cashPaid = !!(cash && String(cash.status || '').toLowerCase() === 'pago');
              const localOverride = localMapById[String(o.id)] || localMapByNumero[String(o.numero)];
              let finalPaid = false;
              if (localOverride && Object.prototype.hasOwnProperty.call(localOverride, 'paymentStatus')) {
                finalPaid = String((localOverride.paymentStatus || '')).toLowerCase() === 'pago';
              } else {
                finalPaid = currentPaid || cashPaid;
              }

            const rawValue = o.value ?? o.total ?? o.total_valor ?? (cash && (cash.value || cash.valor)) ?? null;
            const numericVal = Number(String(rawValue || '').replace(/[^0-9.-]/g, '').replace(',', '.')) || 0;
            const displayValue = numericVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

            const clientName = (client && (client.nome || client.name)) || o.client || o.cliente || o.cliente_nome || o.nome || '';
            const phoneVal = (client && (client.telefone || client.phone)) || o.phone || o.telefone || o.celular || '';
            const clientFoto = (client && client.foto) || o.client_foto || o.foto || null;
            const serviceField = pieceSummary || servicesText || o.service || o.servico || o.servicos || o.serviceText || '';
            const dateOutField = formatIsoToBR(o.data_entrega || o.dateOut || o.date_out || o.previsao || o.dataPrevista || o.delivery) || o.dateOut || '';

            return {
              ...o,
              status: normalizeStatus(o.status),
              client: clientName,
              phone: phoneVal,
              client_foto: clientFoto,
              pieces,
              services,
              service: serviceField,
              dateOut: dateOutField,
              paymentStatus: finalPaid ? 'Pago' : (o.paymentStatus || null),
              value: displayValue,
            };
          } catch (e) { return { ...o, status: normalizeStatus(o.status) }; }
        });

        // merge local overrides (local edits should take precedence)
        let merged = data;
        try {
          const parsedLocal = readOrdersFromStorage();
          if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
            const parsedLocalFiltered = parsedLocal.filter((lo:any) => !(deletedSet && (deletedSet.has(String(lo.id)) || deletedSet.has(String(lo.numero)))));
            const localMap: Record<string, any> = {};
            parsedLocalFiltered.forEach((lo:any) => { if (lo && lo.id) localMap[String(lo.id)] = lo; });
            const formatLocalValue = (v:any, serverVal:any) => {
              try {
                if (v === undefined || v === null) return serverVal || '';
                const s = String(v).trim();
                if (!s) return serverVal || '';
                if (/R\$|\$|BRL|,\d{2}/i.test(s)) return s;
                const n = Number(s.replace(/[^0-9.-]/g, '').replace(',', '.'));
                if (!isNaN(n)) return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                return s;
              } catch (e) { return serverVal || ''; }
            };
            merged = data.map((o:any) => {
              const local = localMap[String(o.id)] || {};
              const serverService = o.service || '';
              const serverDateOut = o.dateOut || '';
              const serverValue = o.value || '';
              const chosenService = (local.service && String(local.service).trim()) ? local.service : serverService;
              const chosenDateOut = (local.dateOut && String(local.dateOut).trim()) ? local.dateOut : serverDateOut;
              const chosenValue = formatLocalValue(local.value !== undefined ? local.value : serverValue, serverValue);
              const cash = cashMap[String(o.id)] || cashMap[String(o.numero)] || null;
              const cashPaid = !!(cash && String(cash.status || '').toLowerCase() === 'pago');
              return {
                ...o,
                paymentStatus: (local.paymentStatus !== undefined ? local.paymentStatus : (cashPaid ? 'Pago' : o.paymentStatus)),
                status: (local.status !== undefined ? normalizeStatus(local.status) : o.status),
                service: chosenService,
                dateOut: chosenDateOut,
                value: chosenValue,
              };
            });
            try {
              // ensure explicit local paymentStatus values survive this merge as well
              const localExistingForMerge2 = readOrdersFromStorage();
              if (Array.isArray(localExistingForMerge2) && localExistingForMerge2.length > 0) {
                const lmById: Record<string, any> = {};
                const lmByNum: Record<string, any> = {};
                localExistingForMerge2.forEach((l:any) => {
                  try { if (l && l.id) lmById[String(l.id)] = l; } catch(_){}
                  try { if (l && l.numero) lmByNum[String(l.numero)] = l; } catch(_){}
                });
                merged = merged.map((s:any) => {
                  try {
                    const local = (s && s.id && lmById[String(s.id)]) || (s && s.numero && lmByNum[String(s.numero)]) || null;
                    if (local && Object.prototype.hasOwnProperty.call(local, 'paymentStatus')) {
                      return { ...s, paymentStatus: local.paymentStatus };
                    }
                  } catch(_){}
                  return s;
                });
              }
            } catch (eee) {}
            try { localStorage.setItem('orders', JSON.stringify(merged)); } catch(e){}
            try { setOrders(merged); } catch(e){}
            try { window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch(e){}
          }
        } catch(e) { /* ignore persist errors */ }

      } catch (e) { console.warn('refetchOrdersFromServer failed', e); }
    };
    window.addEventListener('refetchOrdersFromServer', handler as any);
    return () => { window.removeEventListener('refetchOrdersFromServer', handler as any); };
  }, []);

  // Debug helper: reconcile a single order from server into localStorage (useful when console is blocked)
  const reconcileOrderFromServer = async (numeroPattern: string) => {
    try {
      if (!(supabase && typeof supabase.from === 'function')) { alert('Supabase não disponível'); return; }
      const norm = String(numeroPattern || '').replace(/\D/g,'');
      // try multiple strategies: by numeric numero, by raw match, by local client name
      let server: any = null;
      let attemptMsg = '';
      if (norm) {
        attemptMsg = 'busca por numero numerico';
        const q = await supabase.from('ordens').select('*').eq('numero', norm).limit(1).maybeSingle();
        if (!(q as any).error && (q as any).data) server = (q as any).data;
      }
      if (!server) {
        attemptMsg = 'busca por numero parcial';
        const q2 = await supabase.from('ordens').select('*').ilike('numero', `%${numeroPattern}%`).limit(1).maybeSingle();
        if (!(q2 as any).error && (q2 as any).data) server = (q2 as any).data;
      }
      if (!server) {
        // try to find local order to extract client name and try searching by client
        try {
          const arr = readOrdersFromStorage();
          const local = (arr||[]).find((o:any) => String(o.numero||'').replace(/\D/g,'') === norm || String(o.numero||'').toUpperCase().includes(String(numeroPattern||'').toUpperCase()));
          if (local && (local.client || local.cliente)) {
            const clientName = local.client || local.cliente;
            attemptMsg = `busca por cliente '${clientName}'`;
            const q3 = await supabase.from('ordens').select('*').ilike('client', `%${clientName}%`).limit(1).maybeSingle();
            if (!(q3 as any).error && (q3 as any).data) server = (q3 as any).data;
          }
        } catch (e) { /* ignore */ }
      }

      if (!server) {
        alert('Registro não encontrado no servidor (tentativa: ' + attemptMsg + ')');
        return;
      }
      const arr = readOrdersFromStorage();
      const serverNum = String(server.numero || '').replace(/\D/g,'');
      const idx = arr.findIndex((o:any) => String(o.id) === String(server.id) || String(o.numero || '').replace(/\D/g,'') === serverNum);
      const existing = idx >= 0 ? arr[idx] : {};
      // determine numeric value from server or existing cash
      const valCandidate = server.value ?? server.total ?? existing.value ?? existing.total ?? 0;
      const valNum = Number(String(valCandidate).replace(/[^0-9.-]/g,'').replace(',', '.')) || 0;
      const merged = { ...existing, ...server, _local: false, _unsynced: false, value: valNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) };
      if (idx >= 0) arr[idx] = merged; else arr.unshift(merged);
      localStorage.setItem('orders', JSON.stringify(arr));
      window.dispatchEvent(new CustomEvent('ordersUpdated'));
      window.dispatchEvent(new CustomEvent('financeUpdated'));
      alert('Ordem reconciliada: ' + (server.numero || server.id));
    } catch (e) { console.warn('reconcileOrderFromServer error', e); alert('Erro: ' + String(e)); }
  };

  // Force reconciliation: compare local orders' ids/numeros against server and remove local-only test records
  useEffect(() => {
    let cancelled = false;
    const reconcile = async () => {
      try {
        const parsedLocal = readOrdersFromStorage();
        if (!Array.isArray(parsedLocal) || parsedLocal.length === 0) return;

        // collect candidate ids and numeros from local storage
        const ids: string[] = [];
        const numeros: string[] = [];
        parsedLocal.forEach((o:any) => {
          try {
            if (!o) return;
            if (o.id && !String(o.id).startsWith('local-')) ids.push(String(o.id));
            const num = String(o.numero || '').replace(/\D/g, '');
            if (num) numeros.push(num);
          } catch (e) {}
        });

        if ((!ids || ids.length === 0) && (!numeros || numeros.length === 0)) return;
        if (!(supabase && typeof supabase.from === 'function')) return;

        const serverRows: any[] = [];
        try {
          if (ids.length > 0) {
            const r = await supabase.from('ordens').select('id,numero').in('id', ids);
            if (!(r as any).error && Array.isArray((r as any).data)) serverRows.push(...(r as any).data);
          }
        } catch (e) { /* ignore */ }
        try {
          if (numeros.length > 0) {
            // query by numeric numero values
            const r2 = await supabase.from('ordens').select('id,numero').in('numero', numeros);
            if (!(r2 as any).error && Array.isArray((r2 as any).data)) serverRows.push(...(r2 as any).data);
          }
        } catch (e) { /* ignore */ }

        if (cancelled) return;

        const serverIdSet = new Set<string>((serverRows || []).map((s:any) => String(s.id)).filter(Boolean));
        const serverNumSet = new Set<string>((serverRows || []).map((s:any) => String(s.numero || '').replace(/\D/g,'')).filter(Boolean));

        const toRemove: string[] = [];
        const filtered = (parsedLocal || []).filter((o:any) => {
          try {
            if (!o) return false;
            const oid = String(o.id || '');
            const onum = String(o.numero || '').replace(/\D/g,'');
            const keep = (oid && serverIdSet.has(oid)) || (onum && serverNumSet.has(onum));
            if (!keep) toRemove.push(oid || o.numero || String(o));
            return keep;
          } catch (e) { return false; }
        });

        if (toRemove.length > 0) {
                  try { localStorage.setItem('orders', JSON.stringify(filtered)); } catch (e) {}
          try {
            const rawDeleted = localStorage.getItem('deletedOrders');
            const deletedList = rawDeleted ? JSON.parse(rawDeleted) : [];
            const set = new Set(Array.isArray(deletedList) ? deletedList.map((x:any)=>String(x)) : []);
            toRemove.forEach(r => { if (r) set.add(String(r)); });
            localStorage.setItem('deletedOrders', JSON.stringify(Array.from(set)));
          } catch (e) {}

          // clean cashFlowDetails unrelated to server
          try {
            const rawC = localStorage.getItem('cashFlowDetails');
            const parsedC = rawC ? JSON.parse(rawC) : [];
            const filteredC = (parsedC || []).filter((c:any) => {
              try {
                const oid = String(c.orderId || c.orderid || '');
                const num = String(c.numero || '').replace(/\D/g,'');
                if (oid && serverIdSet.has(oid)) return true;
                if (num && serverNumSet.has(num)) return true;
                return false;
              } catch (e) { return false; }
            });
            localStorage.setItem('cashFlowDetails', JSON.stringify(filteredC));
            try { window.dispatchEvent(new CustomEvent('financeUpdated')); } catch(e){}
          } catch (e) {}
        }
      } catch (e) {
        console.warn('reconcile with server failed', e);
      }
    };
    // run shortly after mount to allow initial fetch to complete
    const t = setTimeout(() => { reconcile(); }, 1200);
    return () => { cancelled = true; clearTimeout(t); };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const c = await loadClients();
        if (mounted) setClientes(c || []);
        // carregar peças pré-cadastradas do banco
        try {
          if (supabase && typeof supabase.from === 'function') {
            const r = await supabase.from('pecas').select('*').order('nome', { ascending: true });
            if (!(r as any).error && Array.isArray((r as any).data) && (r as any).data.length > 0) {
              if (mounted) setAvailablePieces((r as any).data || []);
            } else {
              // fallback para lista local quando tabela não existe ou está vazia
              if (mounted) setAvailablePieces(DEFAULT_PECAS);
            }
          } else {
            if (mounted) setAvailablePieces(DEFAULT_PECAS);
          }
        } catch (e) { console.warn('failed to load pecas', e); if (mounted) setAvailablePieces(DEFAULT_PECAS); }
      } catch (e) { console.warn('load clients failed', e); }
    })();
    return () => { mounted = false; };
  }, []);

  const servicosDisponiveis = [
    { id: 1, name: 'Barra simples de calça', category: 'barras', price: 35 },
    { id: 2, name: 'Barra italiana', category: 'barras', price: 45 },
    { id: 3, name: 'Barra original (jeans)', category: 'barras', price: 50 },
    { id: 4, name: 'Barra de saia', category: 'barras', price: 30 },
    { id: 5, name: 'Barra de vestido', category: 'barras', price: 40 },
    { id: 6, name: 'Barra de cortina', category: 'barras', price: 25 },

    { id: 7, name: 'Ajuste de cintura', category: 'ajustes', price: 45 },
    { id: 8, name: 'Ajuste de quadril', category: 'ajustes', price: 50 },
    { id: 9, name: 'Ajuste de lateral', category: 'ajustes', price: 55 },
    { id: 10, name: 'Ajuste de comprimento', category: 'ajustes', price: 40 },
    { id: 11, name: 'Ajuste de manga', category: 'ajustes', price: 35 },

    { id: 14, name: 'Ajuste de camisa social', category: 'camisas', price: 50 },
    { id: 15, name: 'Encurtar manga', category: 'camisas', price: 30 },

    { id: 19, name: 'Ajuste de vestido', category: 'vestidos', price: 80 },
    { id: 20, name: 'Ajuste de alça', category: 'vestidos', price: 30 },

    { id: 25, name: 'Ajuste de saia', category: 'saia-short', price: 40 },

    { id: 30, name: 'Ajuste de calça social', category: 'calcas', price: 50 },

    { id: 36, name: 'Ajuste de jaqueta', category: 'casacos', price: 70 },

    { id: 41, name: 'Troca de zíper', category: 'consertos', price: 45 },
    { id: 42, name: 'Troca de botão', category: 'consertos', price: 15 },
    { id: 43, name: 'Aplicação de botão', category: 'consertos', price: 20 },

    { id: 49, name: 'Ajuste de terno', category: 'sociais', price: 120 },

    { id: 54, name: 'Ajuste de roupa infantil', category: 'infantis', price: 30 },

    { id: 57, name: 'Barra de cortina', category: 'domestica', price: 25 },

    { id: 61, name: 'Reforma completa de roupa', category: 'especiais', price: 150 },
  ];

  // tornar a lista de serviços editável dentro do modal (para permitir cadastro rápido)
  const [servicosDisponiveisState, setServicosDisponiveisState] = useState(servicosDisponiveis);


  const handleEdit = (order: any) => {
    try { debugLog('[handleEdit] called', { id: order && order.id }); } catch(_){}
    setSelectedOrder(order);
    // initialize edit fields
    setEditClient(order.client || '');
    setEditCategory(serviceCategories.find(c => c.name === order.category)?.id || '');
    setEditServiceName(order.service || '');
    // normalize edit value to a plain number with 2 decimals (no thousands separators)
    try {
      const normalized = parseCurrency(order.value).toFixed(2);
      setEditValue(normalized);
    } catch (e) {
      setEditValue((order.value || '').toString().replace(/^R\$\s?/, ''));
    }
    setEditStatus(order.status || 'Recebido');
    try {
      setEditDateIn(order.dateIn.split('/').reverse().join('-'));
      setEditDateOut(order.dateOut.split('/').reverse().join('-'));
    } catch (e) {
      setEditDateIn('');
      setEditDateOut('');
    }
    setEditObservation(order.observation || '');
    setShowEditModal(true);
  };

  const handleDelete = (order: any) => {
    setSelectedOrder(order);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    const idToDelete = selectedOrder?.id;
    const numeroToDelete = selectedOrder?.numero || orderRef(selectedOrder) || null;
    // remove any local entries that match by id or numero to avoid duplicates remaining
    const next = (orders || []).filter(o => {
      try {
        if (!o) return false;
        if (idToDelete && String(o.id) === String(idToDelete)) return false;
        if (numeroToDelete && String(o.numero) === String(numeroToDelete)) return false;
        return true;
      } catch (e) { return true; }
    });
    setOrders(next);
    try { localStorage.setItem('orders', JSON.stringify({ __force: true, payload: next })); } catch (e) {}
    setShowDeleteModal(false);
    setSelectedOrder(null);
    const isLocalId = (id: any) => {
      try {
        if (!id && id !== 0) return true;
        const s = String(id);
        return s.startsWith('local-') || s.startsWith('OS-') || s.startsWith('_local');
      } catch (e) { return true; }
    };
    const isUuid = (s: any) => {
      try { return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); } catch (e) { return false; }
    };
    const isNumeric = (s: any) => { try { return /^[0-9]+$/.test(String(s)); } catch (e) { return false; } };

    (async () => {
      try {
        // Attempt server deletion. Prefer deletion by id for server-generated ids.
        if (supabase && typeof supabase.from === 'function') {
          let deletedOnServer = false;
          if (idToDelete && !isLocalId(idToDelete) && (isNumeric(idToDelete) || isUuid(idToDelete))) {
            const res = await supabase.from('ordens').delete().eq('id', idToDelete);
            if ((res as any).error) {
              console.warn('supabase delete error by id', res);
            } else {
              deletedOnServer = true;
            }
          }
          if (!deletedOnServer && numeroToDelete) {
            const numDigits = String(numeroToDelete).replace(/\D/g, '');
            if (numDigits) {
              const res2 = await supabase.from('ordens').delete().eq('numero', Number(numDigits));
              if ((res2 as any).error) {
                console.warn('supabase delete error by numero', res2);
              } else {
                deletedOnServer = true;
              }
            }
          }
          if (!deletedOnServer) {
            // try a best-effort fallback: delete rows that match cliente+data_entrega+total
            try {
              const maybe = await supabase.from('ordens').select('*').ilike('cliente', String(selectedOrder?.client || selectedOrder?.cliente || '')).limit(5);
              if (!(maybe as any).error && Array.isArray((maybe as any).data)) {
                const candidates = (maybe as any).data;
                for (const c of candidates) {
                  try {
                    const sameDate = selectedOrder?.dateOut && (String(c.data_entrega || c.dateOut || c.data_entrega).startsWith(String(selectedOrder.dateOut)));
                    const sameTotal = Math.abs(Number(c.total || c.valor || 0) - Number(selectedOrder?.total || selectedOrder?.valor || 0)) < 0.01;
                    if (sameDate && sameTotal) {
                      const r = await supabase.from('ordens').delete().eq('id', c.id);
                      if (!(r as any).error) { deletedOnServer = true; break; }
                    }
                  } catch (ee) {}
                }
              }
            } catch (_) {}
          }
          // if deleted on server, also remove any tombstone locally for id/numero
          if (deletedOnServer) {
            try {
              const raw = localStorage.getItem('deletedOrders');
              const list = raw ? JSON.parse(raw) : [];
              const filtered = (list || []).filter((x:any) => String(x) !== String(idToDelete) && String(x) !== String(numeroToDelete));
              localStorage.setItem('deletedOrders', JSON.stringify(filtered));
            } catch (e) {}
          }
          // tentar remover lançamentos financeiros relacionados (por orderId e por numero)
          try {
            if (isFluxoAvailable() && supabase && typeof supabase.from === 'function') {
              const del1 = await supabase.from('fluxo_caixa').delete().eq('orderid', idToDelete);
              if (del1 && (del1 as any).error && (del1 as any).error.code === 'PGRST205') { markFluxoMissing(); }
              if (numeroToDelete) {
                const del2 = await supabase.from('fluxo_caixa').delete().eq('numero', numeroToDelete);
                if (del2 && (del2 as any).error && (del2 as any).error.code === 'PGRST205') { markFluxoMissing(); }
              }
            }
          } catch (ee) { console.warn('failed to delete fluxo_caixa for order on server', ee); }
          try { window.dispatchEvent(new CustomEvent('financeUpdated')); } catch(e){}
        }
      } catch (e) {
        // persist tombstone locally so it doesn't reappear when fetching from Supabase
        try {
          const raw = localStorage.getItem('deletedOrders');
          const list = raw ? JSON.parse(raw) : [];
          const set = new Set(Array.isArray(list) ? list.map((x:any)=>String(x)) : []);
          if (idToDelete) set.add(String(idToDelete));
          if (numeroToDelete) set.add(String(numeroToDelete));
          localStorage.setItem('deletedOrders', JSON.stringify(Array.from(set)));
        } catch (ee) { }
        // also remove local cash entries related to this OS
        try {
          const rawC = localStorage.getItem('cashFlowDetails');
          const parsed = rawC ? JSON.parse(rawC) : [];
          const filtered = (parsed || []).filter((c:any) => {
            try {
              if (idToDelete && String(c.orderId || c.orderid) === String(idToDelete)) return false;
              if (numeroToDelete && String(c.numero || '') === String(numeroToDelete)) return false;
              return true;
            } catch (e) { return true; }
          });
          localStorage.setItem('cashFlowDetails', JSON.stringify(filtered));
          window.dispatchEvent(new CustomEvent('financeUpdated'));
        } catch (eee) {}
      }
    })();
  };

  const handleAddMaterials = (order: any) => {
    setSelectedOrder(order);
    setShowMaterialsModal(true);
  };

  const handleDeliver = (order: any) => {
    setSelectedOrder(order);
    setShowDeliverModal(true);
  };

  const handleAdvancePayment = (order: any) => {
    setSelectedOrder(order);
    setShowAdvancePaymentModal(true);
  };

  const confirmAdvancePayment = () => {
    const next = orders.map(o => o.id === selectedOrder.id ? { ...o, paymentStatus: 'Pago' } : o);
    setOrders(next);
    try { localStorage.setItem('orders', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}
    (async () => {
      try {
        if (supabase && typeof supabase.from === 'function') {
          await supabase.from('ordens').update({ paymentStatus: 'Pago' }).eq('id', selectedOrder.id);
        }
      } catch (e) { console.warn('Failed to persist advance payment to Supabase', e); }

      // atualizar cartão do cliente (local + supabase) ao marcar como pago
      try {
        const amount = parseCurrency(selectedOrder.value ?? selectedOrder.valor ?? 0);
        const phoneNormalized = (selectedOrder.phone || '').toString().replace(/\D/g,'');
        const clientName = selectedOrder.client || '';
        // try supabase update
        if (supabase && typeof supabase.from === 'function') {
          let clientRes: any = null;
          if (phoneNormalized) {
            const r = await supabase.from('clientes').select('*').ilike('telefone', `%${phoneNormalized}%`).limit(1).maybeSingle();
            if (!(r as any).error && (r as any).data) clientRes = (r as any).data;
          }
          if (!clientRes && clientName) {
            const r2 = await supabase.from('clientes').select('*').ilike('nome', clientName).limit(1).maybeSingle();
            if (!(r2 as any).error && (r2 as any).data) clientRes = (r2 as any).data;
          }
          // update client analytics locally only (avoid remote update to prevent 400 when DB schema lacks these columns)
          if (clientRes) {
            try {
              const rawClients = localStorage.getItem('clientes');
              const clients = rawClients ? JSON.parse(rawClients) : [];
              const idx = clients.findIndex((c:any) => String(c.id) === String(clientRes.id));
              const amt = amount || 0;
              if (idx >= 0) {
                clients[idx].totalGasto = (clients[idx].totalGasto || 0) + amt;
                clients[idx].servicosRealizados = (clients[idx].servicosRealizados || 0) + 1;
                localStorage.setItem('clientes', JSON.stringify(clients));
                window.dispatchEvent(new CustomEvent('clientsUpdated'));
              }
            } catch (ee) { /* ignore local update errors */ }
          }
        }
      } catch (e) {
        try {
          const raw = localStorage.getItem('clientes');
          const clients = raw ? JSON.parse(raw) : [];
          const match = clients.find((c:any) => (c.telefone && selectedOrder.phone && c.telefone.replace(/\D/g,'') === String(selectedOrder.phone).replace(/\D/g,'')) || (c.nome && selectedOrder.client && c.nome === selectedOrder.client));
          const amount = parseCurrency(selectedOrder.value ?? selectedOrder.valor ?? 0);
          if (match) {
            match.totalGasto = (match.totalGasto || 0) + amount;
            match.servicosRealizados = (match.servicosRealizados || 0) + 1;
            const earned = Math.floor(amount / 100);
            match.pontos = (match.pontos || 0) + earned;
            localStorage.setItem('clientes', JSON.stringify(clients));
            window.dispatchEvent(new CustomEvent('clientsUpdated'));
          }
        } catch (ee) { console.warn('failed to update local client card', ee); }
      }

    })();

    // garantir que o fluxo de caixa reflita o pagamento (server/local)
    (async () => {
      try {
        const order = selectedOrder;
        const pieces = order.pieces || order.pecas || [];
        const numero = order.numero || order.id || '';
        const orderIdVal = order.id || null;
        const cashEntry: any = {
          date: new Date().toLocaleDateString('pt-BR'),
          client: order.client || '',
          service: order.service || '',
          value: parseCurrency(order.value ?? order.valor ?? 0),
          status: 'Pago',
          orderId: orderIdVal,
          numero,
          pecas: pieces,
        };

        if (isFluxoAvailable() && supabase && typeof supabase.from === 'function') {
          try {
            // tentar localizar por orderid (lowercase) primeiro
            const q = await supabase.from('fluxo_caixa').select('*').eq('orderid', orderIdVal).limit(1).maybeSingle();
            if ((q as any).data) {
              const serverUpdate = { ...cashEntry } as any;
              if (serverUpdate.orderId) serverUpdate.orderid = serverUpdate.orderId;
              delete serverUpdate.orderId; delete serverUpdate.id;
              await supabase.from('fluxo_caixa').update(serverUpdate).eq('id', (q as any).data.id);
              window.dispatchEvent(new CustomEvent('financeUpdated'));
            } else if (numero) {
              const q2 = await supabase.from('fluxo_caixa').select('*').eq('numero', numero).limit(1).maybeSingle();
              if ((q2 as any).data) {
                const serverUpdate2 = { ...cashEntry } as any;
                if (serverUpdate2.orderId) serverUpdate2.orderid = serverUpdate2.orderId;
                delete serverUpdate2.orderId; delete serverUpdate2.id;
                await supabase.from('fluxo_caixa').update(serverUpdate2).eq('id', (q2 as any).data.id);
                window.dispatchEvent(new CustomEvent('financeUpdated'));
              } else {
                const serverEntry = { ...cashEntry } as any;
                if (orderIdVal) serverEntry.orderid = orderIdVal;
                delete serverEntry.orderId;
                const rInsert = await supabase.from('fluxo_caixa').insert(serverEntry);
                if (!(rInsert as any).error) {
                  try {
                    const respRow = (rInsert as any).data && (rInsert as any).data[0] ? (rInsert as any).data[0] : serverEntry;
                    const raw2 = localStorage.getItem('cashFlowDetails');
                    const parsed2 = raw2 ? JSON.parse(raw2) : [];
                    parsed2.unshift(respRow);
                    localStorage.setItem('cashFlowDetails', JSON.stringify(parsed2));
                  } catch (ee) { /* ignore local save errors */ }
                }
                window.dispatchEvent(new CustomEvent('financeUpdated'));
              }
            }
          } catch (e) { console.warn('failed to sync fluxo_caixa on advance payment', e); }
        } else {
          try {
            const raw = localStorage.getItem('cashFlowDetails');
            const parsed = raw ? JSON.parse(raw) : [];
            const idx = (parsed || []).findIndex((c:any) => String(c.orderId || c.orderid) === String(orderIdVal) || (numero && String(c.numero) === String(numero)));
            if (idx >= 0) {
              parsed[idx] = { ...parsed[idx], ...cashEntry, id: parsed[idx].id || (`cash-${Date.now()}`) };
            } else {
              parsed.unshift({ ...cashEntry, id: `cash-${Date.now()}` });
            }
            localStorage.setItem('cashFlowDetails', JSON.stringify(parsed));
            window.dispatchEvent(new CustomEvent('financeUpdated'));
          } catch (ee) { console.warn('failed to save cash entry locally on advance payment', ee); }
        }
      } catch (e) { console.warn('ensure fluxo_caixa payment sync failed', e); }
    })();

    // trigger a server refetch so other pages (and this list) pick up canonical server rows
    try { window.dispatchEvent(new CustomEvent('refetchOrdersFromServer')); } catch(e) {}

    setShowAdvancePaymentModal(false);
    setSelectedOrder(null);
  };

  const confirmDeliver = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const updatedOrder = { ...selectedOrder, status: 'Pronto', deliveryDate: dateStr, deliveryTime: timeStr };
    const next = orders.map(o => o.id === selectedOrder.id ? updatedOrder : o);
    setOrders(next);
    try { localStorage.setItem('orders', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}
    (async () => {
      try {
        if (supabase && typeof supabase.from === 'function') {
          await supabase.from('ordens').update({ status: updatedOrder.status, deliveryDate: updatedOrder.deliveryDate, deliveryTime: updatedOrder.deliveryTime }).eq('id', updatedOrder.id);
        }
      } catch (e) { console.warn('Failed to persist delivery to Supabase', e); }
    })();
    
    // Mensagem de fidelização - Peça pronta para retirada
    // Se já foi pago, não inclui dados do PIX
    const isPaid = selectedOrder.paymentStatus === 'Pago';
    
    const paymentInfo = isPaid 
      ? '\n✅ *Pagamento já realizado!*\n\nAguardamos você! ✨'
      : `\n\n*DADOS PARA PAGAMENTO PIX:*\n\n*Nome:* Cleusa Belani David\n*Telefone:* 45999126130\n*CPF:* 64166724053\n\nAguardamos você! ✨`;
    
    const clientNameMsg = getOrderField(selectedOrder, 'client', 'cliente', 'client_name', 'nome');
    const piecesText = formatPiecesAndServicesForMessage(selectedOrder);
    const serviceLine = getOrderField(selectedOrder, 'service', 'servico', 'servicos', 'serviceText');
    const dateOutMsg = getOrderField(selectedOrder, 'dateOut', 'data_entrega', 'previsao');
    const valueMsg = getOrderField(selectedOrder, 'value', 'valor', 'total');
    const header = `Olá ${clientNameMsg || selectedOrder.client || '-'}! 🎉\n\n*Cleusa Ateliê de Costura*\n\nSua(s) peça(s) da OS ${orderRef(selectedOrder)} está(ão) pronta(s).`;
    const details = `${serviceLine ? `\n\n🧾 Serviço(s): ${serviceLine}` : ''}\n${valueMsg ? `\n💰 Valor: ${valueMsg}` : ''}\n${dateOutMsg ? `\n\n📅 Previsão de retirada: ${dateOutMsg}` : ''}`;
    setFidelizacaoMessage(`${header}\n\n${piecesText || ''}${details}\n\n${paymentInfo}`);
    setClientePhone(selectedOrder.phone);
    setShowFidelizacaoModal(true);
    
    setShowDeliverModal(false);
    // preparar mensagem para envio (não enviar automaticamente)
    setSelectedOrder(updatedOrder);
    const msg = formatMessageForStatus(updatedOrder, 'Pronto');
    setStatusChangeMessage(msg);
    setFidelizacaoMessage(msg);
    setShowStatusMessageOptions(true);
    setShowFidelizacaoModal(true);
  };

  const handleMaterialSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const materialId = e.target.value;
    setSelectedMaterialId(materialId);
    
    if (materialId) {
      const material = availableMaterials.find(m => m.id === parseInt(materialId));
      if (material) {
        setMaterialPrice(material.price.toFixed(2));
      }
    } else {
      setMaterialPrice('');
    }
  };

  const addMaterial = () => {
    if (!selectedMaterialId || !materialQuantity || parseFloat(materialQuantity) <= 0) {
      alert('Por favor, selecione um material e informe a quantidade');
      return;
    }

    const material = availableMaterials.find(m => m.id === parseInt(selectedMaterialId));
    if (!material) return;

    const quantity = parseFloat(materialQuantity);
    const price = parseFloat(materialPrice);
    const total = quantity * price;

    const newMaterial = {
      id: Date.now(),
      materialId: material.id,
      name: material.name,
      unit: material.unit,
      quantity: quantity,
      unitPrice: price,
      total: total
    };

    setOrderMaterials([...orderMaterials, newMaterial]);
    
    // Limpar campos
    setSelectedMaterialId('');
    setMaterialQuantity('1');
    setMaterialPrice('');
  };

  const removeMaterial = (id: number) => {
    setOrderMaterials(orderMaterials.filter(m => m.id !== id));
  };

  const getTotalMaterials = () => {
    return orderMaterials.reduce((sum, m) => sum + m.total, 0);
  };

  const handleServiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = e.target.value;
    setSelectedServiceId(serviceId);
    
    if (serviceId) {
      const service = servicosDisponiveisState.find(s => s.id === parseInt(serviceId));
      if (service) {
        setServiceValue(service.price.toFixed(2));
      }
    } else {
      setServiceValue('');
    }
  };

  const addService = () => {
    if (!selectedServiceId || !serviceValue || parseFloat(serviceValue) <= 0) {
      alert('Por favor, selecione um serviço e informe o valor');
      return;
    }

    const service = servicosDisponiveisState.find(s => s.id === parseInt(selectedServiceId));
    if (!service) return;

    if (!selectedPieceForService) {
      alert('Selecione a peça à qual este serviço será vinculado');
      return;
    }

    const newService = {
      id: Date.now(),
      serviceId: service.id,
      name: service.name,
      pieceId: selectedPieceForService,
      category: serviceCategories.find(c => c.id === service.category)?.name || service.category,
      value: parseFloat(serviceValue),
      observation: serviceObservation
    };

    setOrderServices([...orderServices, newService]);
    // attach to pieces list for summary convenience
    setPieces(pieces.map(p => p.id === selectedPieceForService ? { ...p, services: [...(p.services||[]), newService] } : p));
    
    // Limpar campos
    setSelectedServiceId('');
    setServiceValue('');
    setServiceObservation('');
  };

  const removeService = (id: number) => {
    setOrderServices(orderServices.filter(s => s.id !== id));
  };

  const getTotalServices = () => {
    return orderServices.reduce((sum, s) => sum + s.value, 0);
  };

  const isOrderLate = (dateOut: string, status: string) => {
    if (!dateOut) return false;
    if (status === 'Pronto' || status === 'Retirado' || status === 'Cancelado') return false;

    const [day, month, year] = dateOut.split('/');
    if (!day || !month || !year) return false;
    const deliveryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return deliveryDate < today;
  };

  const deliveryIndicator = (dateOut: string) => {
    if (!dateOut) return 'none';
    const [day, month, year] = dateOut.split('/');
    if (!day || !month || !year) return 'none';
    const deliveryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    today.setHours(0,0,0,0);
    if (deliveryDate < today) return 'late';
    if (deliveryDate.getTime() === today.getTime()) return 'today';
    return 'ok';
  };

  const daysUntil = (dateOut: string) => {
    if (!dateOut) return null;
    const parts = dateOut.split('/');
    if (parts.length !== 3) return null;
    const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffMs = d.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const serviceDisplayFor = (order: any) => {
    try {
      // prefer aggregated pieces summary (quantity + services)
      const notasPieces = order.pieces || order.pecas || [];
      const pieceSummary = formatPiecesSummary(notasPieces);
      if (pieceSummary) return pieceSummary;
      const servicesWithPiece = (notasPieces || []).flatMap((p:any) => (p.services || []).map((s:any) => ({ ...s, pieceTipo: p.tipo })));
      return (servicesWithPiece && servicesWithPiece.length > 0)
        ? servicesWithPiece.map((s:any) => `${s.name || s.nome || s.title || ''}${s.pieceTipo ? ` (${s.pieceTipo})` : ''}`).join(', ')
        : (order.service || '');
    } catch (e) { return order.service || ''; }
  };

  const createNewOrder = async () => {
    // Validations: must have pieces and at least one service linked
    if (pieces.length === 0) {
      alert('Adicione pelo menos uma peça antes de salvar a OS');
      return;
    }
    const piecesWithoutServices = pieces.filter(p => !(p.services && p.services.length > 0));
    if (piecesWithoutServices.length > 0) {
      alert('Cada peça deve ter pelo menos um serviço vinculado. Verifique as peças sem serviços.');
      return;
    }

    if (!newOrderDate) {
      alert('Por favor informe a data prevista de entrega');
      return;
    }

    const totalValue = getTotalServices();
    const servicesText = orderServices.map(s => s.name).join(', ');
    
    const formatDate = (iso: string) => {
      try {
        const parts = iso.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      } catch (e) { return '' }
    };

    const clientObj = clientes.find((c: any) => String(c.id) === String(newOrderClientId));
    const clientName = clientObj?.nome || 'Novo Cliente';
    const clientPhone = clientObj?.telefone || clientObj?.phone || '11999999999';
    const clientFoto = clientObj?.foto || null;

    // helper: format 6-digit number
    const formatOrderNumber = (n: number|string) => String(n).toString().padStart(6, '0');
    // try to get next number from server later; fallback to local counter
    const getLocalNextNumber = () => {
      try {
        const raw = localStorage.getItem('os_counter');
        const cur = raw ? Number(raw) : 0;
        const next = cur + 1;
        localStorage.setItem('os_counter', String(next));
        return next;
      } catch (e) { return Date.now() % 1000000; }
    };

    // try persist to Supabase (store pieces/services denormalized in notas as JSON)
    let savedId: string | undefined = undefined;
    let savedNumero: number | undefined = undefined;
    try {
      if (supabase && typeof supabase.from === 'function') {
        const payload: any = {
          cliente_id: clientObj?.id || null,
          status: newOrderStatus || 'Recebido',
          total: totalValue,
          data_entrega: newOrderDate ? new Date(newOrderDate).toISOString() : null,
          notas: JSON.stringify({ obs: newOrderObservacoes || null, pieces, services: orderServices })
        };
        const res = await supabase.from('ordens').insert(payload).select().limit(1).single();
        if (!(res as any).error && (res as any).data) {
          savedId = (res as any).data.id;
          // if backend exposes a numeric sequence 'numero', capture it
          if ((res as any).data.numero) savedNumero = Number((res as any).data.numero);
        } else {
          console.warn('Supabase insert ordens error', (res as any).error);
        }
      }
    } catch (e) {
      console.warn('Failed to persist new order to Supabase', e);
    }

    // determine display number
    const localNum = getLocalNextNumber();
    const displayNumber = savedNumero ? formatOrderNumber(savedNumero) : formatOrderNumber(localNum);

    const serviceFieldForNew = formatPiecesSummary(pieces) || servicesText || '';

    const newOrder = {
      id: savedId || `OS-${1242 + orders.length}`,
      numero: displayNumber,
      client: clientName,
      phone: clientPhone,
      client_foto: clientFoto,
      category: orderServices[0].category,
      service: serviceFieldForNew,
      pieces,
      value: `R$ ${totalValue.toFixed(2)}`,
      status: newOrderStatus || 'Recebido',
      paymentStatus: newOrderPaymentStatus || null,
      dateIn: new Date().toLocaleDateString('pt-BR'),
      dateOut: formatDate(newOrderDate),
      priority: 'normal'
    };

    const newOrdersList = [...orders, newOrder];
    setOrders(newOrdersList);
    try { localStorage.setItem('orders', JSON.stringify(newOrdersList)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}

    // --- Adicionar entrada no histórico financeiro (fluxo_caixa) ---
    const cashEntry: any = {
      id: savedId || `cash-${Date.now()}`,
      date: new Date().toLocaleDateString('pt-BR'),
      client: clientName,
      service: servicesText,
      value: totalValue,
      status: newOrderPaymentStatus === 'Pago' ? 'Pago' : 'Pendente',
      orderId: savedId || (newOrder && newOrder.id),
      numero: displayNumber,
      pecas: pieces,
    };

    const isUuid = (s: any) => {
      try { return typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s); } catch (e) { return false; }
    };

    try {
      if (isFluxoAvailable() && supabase && typeof supabase.from === 'function') {
        // don't send invalid UUIDs to the server — let DB generate defaults
        const serverCashEntry = { ...cashEntry } as any;
        if (!isUuid(serverCashEntry.id)) delete serverCashEntry.id;
        if (isUuid(serverCashEntry.orderId)) { serverCashEntry.orderid = serverCashEntry.orderId; }
        // always remove camelCase key to avoid PostgREST schema mismatch
        delete serverCashEntry.orderId;
        try {
          console.info('fluxo_caixa: inserting to server', serverCashEntry);
        } catch (e) {}
        const r = await supabase.from('fluxo_caixa').insert(serverCashEntry);
        try { console.info('fluxo_caixa: server response', r); } catch (e) {}
        if ((r as any).error) {
          // if table missing, mark and fallback locally
          try { console.error('fluxo_caixa server error detail', (r as any).error); } catch(e) {}
          try { alert('Erro ao salvar no servidor: ' + JSON.stringify((r as any).error)); } catch (ee) {}
          if ((r as any).error && (r as any).error.code === 'PGRST205') { markFluxoMissing(); }
          throw (r as any).error;
        }
        // persist locally for immediate UI reflection, then notify financeiro
        try {
          if (!(r as any).error) {
            try {
              const resp = (r as any).data && (r as any).data[0] ? (r as any).data[0] : serverCashEntry;
              const rawLocal = localStorage.getItem('cashFlowDetails');
              const parsedLocal = rawLocal ? JSON.parse(rawLocal) : [];
              parsedLocal.unshift(resp);
              localStorage.setItem('cashFlowDetails', JSON.stringify(parsedLocal));
            } catch (ee) {}
          }
        } catch (eee) {}
        try { window.dispatchEvent(new CustomEvent('financeUpdated')); } catch (e) {}
      } else {
        throw new Error('no-supabase-or-fluxo-missing');
      }
    } catch (e) {
      try {
        const raw = localStorage.getItem('cashFlowDetails');
        const parsed = raw ? JSON.parse(raw) : [];
        const existsIdx = (parsed || []).findIndex((c:any) => String(c.orderId || c.orderid) === String(cashEntry.orderId || cashEntry.orderid) || String(c.numero || '') === String(displayNumber));
        if (existsIdx >= 0) {
          parsed[existsIdx] = { ...parsed[existsIdx], ...cashEntry, id: parsed[existsIdx].id || (`cash-${Date.now()}`) };
        } else {
          parsed.unshift(cashEntry);
        }
        localStorage.setItem('cashFlowDetails', JSON.stringify(parsed));
        try { console.info('fluxo_caixa: saved locally, total entries', (parsed || []).length); } catch (ee) {}
        window.dispatchEvent(new CustomEvent('financeUpdated'));
      } catch (ee) { console.warn('failed to save cash entry locally', ee); }
    }

    // --- Atualizar cartão do cliente (localStorage) ---
    try {
      const clientsRaw = localStorage.getItem('clientes');
      const clients = clientsRaw ? JSON.parse(clientsRaw) : [];
      const idx = clients.findIndex((c:any) => String(c.id) === String(clientObj?.id));
      const amount = Number(totalValue) || 0;
      const earned = Math.floor(amount / 100);
      if (idx >= 0) {
        clients[idx].totalGasto = (clients[idx].totalGasto || 0) + amount;
        clients[idx].servicosRealizados = (clients[idx].servicosRealizados || 0) + 1;
        clients[idx].pontos = (clients[idx].pontos || 0) + earned;
        localStorage.setItem('clientes', JSON.stringify(clients));
        window.dispatchEvent(new CustomEvent('clientsUpdated'));
      }
      // skip remote update to avoid 400 when DB schema doesn't include analytic columns
    } catch (e) { console.warn('failed to update client card locally', e); }

    // Mostrar resumo salvo
    setSelectedOrder(newOrder);
    setShowSavedSummary(true);

      // não enviar WhatsApp automaticamente — mostrar mensagem de finalização para opção do usuário

    // Mensagem de fidelização - Serviço recebido
    const clientNameNew = getOrderField(newOrder, 'client', 'cliente', 'client_name', 'nome') || newOrder.client;
    const piecesTextNew = formatPiecesAndServicesForMessage(newOrder);
    const serviceLineNew = getOrderField(newOrder, 'service', 'servico', 'servicos', 'serviceText');
    const dateOutNew = getOrderField(newOrder, 'dateOut', 'data_entrega', 'previsao') || newOrder.dateOut;
    const valueNew = `R$ ${totalValue.toFixed(2)}`;
    setFidelizacaoMessage(`Olá ${clientNameNew}! 😊\n\n*Cleusa Ateliê de Costura*\n\nSua ordem foi registrada com sucesso!\n\n${piecesTextNew}\n${serviceLineNew ? `Serviço(s): ${serviceLineNew}\n` : ''}Prazo de entrega: ${dateOutNew}\nValor: ${valueNew}\n\nObrigada pela confiança! ✨`);
    setClientePhone(newOrder.phone);
    // abrir apenas a mensagem de fidelização — a opção de impressão será exibida
    // quando o usuário fechar a mensagem (via copiar/enviar/fechar)
    setShowFidelizacaoModal(true);

    setShowModal(false);
    setOrderServices([]);
    setNewOrderClientId(null);
    setNewOrderObservacoes('');
    setPieces([]);
  };

  const markAsDelivered = (order: any) => {
    // Se já foi pago antecipadamente, marca direto como entregue
    if (order.paymentStatus === 'Pago') {
      const updatedOrder = { ...order, status: 'Retirado' };
      const next = orders.map(o => o.id === order.id ? updatedOrder : o);
      setOrders(next);
      try { localStorage.setItem('orders', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}
      (async () => {
        try {
          if (supabase && typeof supabase.from === 'function') {
            await supabase.from('ordens').update({ status: updatedOrder.status }).eq('id', updatedOrder.id);
          }
        } catch (e) { console.warn('Failed to persist order status to Supabase', e); }
      })();
      // Mensagem de agradecimento sem cobrança
      setFidelizacaoMessage(`Olá ${order.client}! 💝\n\n*Cleusa Ateliê de Costura*\n\nObrigada por retirar sua peça!\n\n✅ *Pagamento já realizado!*\n\nEsperamos que tenha ficado perfeita! Conte sempre conosco para seus ajustes e costuras.\n\nAté a próxima! ✨`);
      setClientePhone(order.phone);
      setShowFidelizacaoModal(true);
      // enviar notificação automática de retirada
      sendStatusWhatsApp(updatedOrder, 'Retirado');
      // atualizar pontos/total do cliente se pago
      if (updatedOrder.paymentStatus === 'Pago') {
        try { addPointsForOrder(updatedOrder); window.dispatchEvent(new CustomEvent('clientsUpdated')); } catch (e) {}
      }
    } else {
      // Se não foi pago, ainda permite entregar; marca como Retirado e exibe dados PIX na fidelização
      const updatedOrder = { ...order, status: 'Retirado', paymentStatus: order.paymentStatus || 'Pendente' };
      const next = orders.map(o => o.id === order.id ? updatedOrder : o);
      setOrders(next);
      try { localStorage.setItem('orders', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}
      (async () => {
        try {
          if (supabase && typeof supabase.from === 'function') {
            await supabase.from('ordens').update({ status: updatedOrder.status, paymentStatus: updatedOrder.paymentStatus }).eq('id', updatedOrder.id);
          }
        } catch (e) { console.warn('Failed to persist order status to Supabase', e); }
      })();

      const paymentText = `Pagamento pendente - Aguardamos seu pagamento. 💰\n\n*DADOS PARA PAGAMENTO PIX:*\n\n*Nome:* Cleusa Belani David\n*Telefone:* 45999126130\n*CPF:* 64166724053\n\n⚠️ *Ao realizar o pagamento, por favor envie o comprovante.*`;
      setFidelizacaoMessage(`Olá ${order.client}! 💝\n\n*Cleusa Ateliê de Costura*\n\nObrigada por retirar sua peça!\n\n${paymentText}\n\nEsperamos que tenha ficado perfeita! Conte sempre conosco para seus ajustes e costuras.\n\nAté a próxima! ✨`);
      setClientePhone(order.phone);
      setShowFidelizacaoModal(true);
      // enviar notificação automática de retirada
      sendStatusWhatsApp(updatedOrder, 'Retirado');
      // preparar mensagem de retirada para envio (não enviar automaticamente)
      setSelectedOrder(updatedOrder);
      const msg = formatMessageForStatus(updatedOrder, 'Retirado');
      setStatusChangeMessage(msg);
      setShowStatusMessageOptions(true);
    }
  };

  const confirmDeliveryWithPayment = (isPaid: boolean) => {
    const updatedOrder = { ...selectedOrder, status: 'Retirado', paymentStatus: isPaid ? 'Pago' : 'Pendente' };
    const next = orders.map(o => o.id === selectedOrder.id ? updatedOrder : o);
    setOrders(next);
    try { localStorage.setItem('orders', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}
    (async () => {
      try {
        if (supabase && typeof supabase.from === 'function') {
          await supabase.from('ordens').update({ status: updatedOrder.status, paymentStatus: updatedOrder.paymentStatus }).eq('id', updatedOrder.id);
        }
      } catch (e) { console.warn('Failed to persist delivery/payment to Supabase', e); }
    })();

    // Mensagem de fidelização - Agradecimento pela retirada
    const paymentText = isPaid 
      ? 'Pagamento confirmado! ✅' 
      : `Pagamento pendente - Aguardamos seu pagamento. 💰\n\n*DADOS PARA PAGAMENTO PIX:*\n\n*Nome:* Cleusa Belani David\n*Telefone:* 45999126130\n*CPF:* 64166724053\n\n⚠️ *Ao realizar o pagamento, por favor envie o comprovante.*`;
    
    setFidelizacaoMessage(`Olá ${selectedOrder.client}! 💝\n\n*Cleusa Ateliê de Costura*\n\nObrigada por retirar sua peça!\n\n${paymentText}\n\nEsperamos que tenha ficado perfeita! Conte sempre conosco para seus ajustes e costuras.\n\nAté a próxima! ✨`);
    setClientePhone(selectedOrder.phone);
    setShowFidelizacaoModal(true);
    
    setShowPaymentModal(false);
    setSelectedOrder(null);
    // preparar mensagem de retirada para envio (não enviar automaticamente)
    setSelectedOrder(updatedOrder);
    const msg = formatMessageForStatus(updatedOrder, 'Retirado');
    setStatusChangeMessage(msg);
    setFidelizacaoMessage(msg);
    setShowStatusMessageOptions(true);
    setShowFidelizacaoModal(true);
    // atualizar pontos/total do cliente se pago
    if (updatedOrder.paymentStatus === 'Pago') {
      try { addPointsForOrder(updatedOrder); window.dispatchEvent(new CustomEvent('clientsUpdated')); } catch (e) {}
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Mensagem copiada!');
    setShowFidelizacaoModal(false);
  };

  const formatPiecesAndServicesForMessage = (order: any) => {
    try {
      const pieces = order.pieces || order.pecas || [];
      let out = '';
      let total = 0;
      // If pieces present, list each piece and its services
      if (Array.isArray(pieces) && pieces.length > 0) {
        for (const p of pieces) {
          const tipo = p.tipo || p.nome || p.nomePeca || p.name || 'Peça';
          const cor = p.cor || p.color || p.corEscolhida || '';
          out += `- ${tipo}${cor ? ` (${cor})` : ''}\n`;
          const svcs = p.services || p.servicos || p.servicos_vinculados || [];
          if (Array.isArray(svcs) && svcs.length > 0) {
            for (const s of svcs) {
              const n = s.name || s.titulo || s.nome || String(s || '');
              const v = Number(s.price || s.preco || s.valor || s.valor_servico || 0) || 0;
              total += v;
              out += `  • ${n} — R$ ${v.toFixed(2)}\n`;
            }
          }
        }
        out += `\nSubtotal: R$ ${total.toFixed(2)}`;
        return out;
      }

      // No pieces: try grouping order-level services by pieceTipo if available
      const rootServices = order.services || order.servicos || [];
      if (Array.isArray(rootServices) && rootServices.length > 0) {
        const grouped: Record<string, any[]> = {};
        for (const s of rootServices) {
          const pieceTipo = s.pieceTipo || s.peca || s.peca_tipo || s.piece || s.piece_name || 'Geral';
          const key = pieceTipo || 'Geral';
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(s);
        }
        for (const k of Object.keys(grouped)) {
          out += `- ${k}\n`;
          for (const s of grouped[k]) {
            const n = s.name || s.titulo || s.nome || String(s || '');
            const v = Number(s.price || s.preco || s.valor || 0) || 0;
            total += v;
            out += `  • ${n} — R$ ${v.toFixed(2)}\n`;
          }
        }
        out += `\nSubtotal: R$ ${total.toFixed(2)}`;
        return out;
      }

      // Fallback: show single-line service text or empty
      return order.service || '';
    } catch (e) { return order.service || ''; }
  }

  const getOrderField = (order: any, ...keys: string[]) => {
    try {
      if (!order) return '';
      for (const k of keys) {
        const v = order[k];
        if (v !== undefined && v !== null && String(v).toString().trim() !== '') return v;
      }
      return '';
    } catch (e) { return ''; }
  }

  const openWhatsApp = () => {
    const message = encodeURIComponent(fidelizacaoMessage);
    const phone = clientePhone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    try { if (selectedOrder) markMessageSent(selectedOrder.id, selectedOrder.status); } catch (e) {}
    setShowFidelizacaoModal(false);
    setShowPrintOptions(true);
  };

  const copyFidelizacao = () => {
    try { navigator.clipboard.writeText(fidelizacaoMessage); alert('Mensagem copiada!'); } catch (e) { alert('Não foi possível copiar'); }
    setShowFidelizacaoModal(false);
    setShowPrintOptions(true);
  };

  const composeStatusMessage = (order: any, newStatus: string) => {
    if (!order) return '';
    switch (newStatus) {
      case 'Recebido':
        return `Olá ${order.client}! 😊\n\nSua ordem ${orderRef(order)} foi *recebida* e está sendo processada.`;
      case 'Em costura':
        return `Olá ${order.client}! 👗\n\nIniciamos a costura da sua peça (OS ${orderRef(order)}). Em breve atualizamos o andamento.`;
      case 'Aguardando prova':
        return `Olá ${order.client}! 👀\n\nSua peça (OS ${orderRef(order)}) está pronta para prova. Aguardo sua visita.`;
      case 'Ajuste final':
        return `Olá ${order.client}! ✂️\n\nEstamos nos ajustes finais da sua peça (OS ${orderRef(order)}). Em breve avisamos quando estiver pronta.`;
      case 'Pronto':
        return `Olá ${order.client}! 🎉\n\nSua peça (OS ${orderRef(order)}) está *pronta para retirada*. Obrigada pela preferência!`;
      case 'Retirado':
        return `Olá ${order.client}! 💝\n\nObrigado por retirar sua peça (OS ${orderRef(order)}). Esperamos que tenha gostado!`;
      case 'Cancelado':
        return `Olá ${order.client}, informamos que a OS ${orderRef(order)} foi cancelada. Se houver dúvidas, entre em contato.`;
      default:
        return `Olá ${order.client}, sua ordem ${orderRef(order)} está com o status: ${newStatus}.`;
    }
  };

  const sendStatusWhatsApp = (order: any, newStatus: string) => {
    if (!order || !order.phone) return;
    const msg = composeStatusMessage(order, newStatus);
    const phone = (order.phone || '').replace(/\D/g, '');
    try {
      window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (e) {}
  };

  const getFormattedMessage = (order: any, status: string) => {
    try { return formatMessageForStatus(order, status); } catch (e) { return composeStatusMessage(order, status); }
  };

  const markMessageSent = (orderId: string, status: string) => {
    const next = orders.map(o => {
      if (o.id !== orderId) return o;
      const sent = { ...(o.sentMessages || {}) };
      sent[status] = 'sent';
      return { ...o, sentMessages: sent };
    });
    setOrders(next);
    try { localStorage.setItem('orders', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}
  };

  const sendMessageManual = (order: any, status: string) => {
    if (!order || !order.phone) return alert('Cliente sem WhatsApp');
    const message = getFormattedMessage(order, status);
    const phone = (order.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
    markMessageSent(order.id, status);
  };

  const copyMessageManual = (order: any, status: string) => {
    const message = getFormattedMessage(order, status);
    try { navigator.clipboard.writeText(message); alert('Mensagem copiada!'); } catch (e) { alert('Não foi possível copiar'); }
  };

  const applyQuickStatus = async (order: any, newStatus: string) => {
    try { debugLog('[applyQuickStatus] called', { id: order && order.id }, newStatus); } catch(_){ }
    if (!order || !order.id) return;
    if (pendingStatusRef.current.has(order.id)) {
      try { debugLog('[applyQuickStatus] ignored duplicate', { id: order.id }, newStatus); } catch(_){}
      return;
    }
    pendingStatusRef.current.add(order.id);
    try {
      // If marking as Retirado, handle payment confirmation and marking
      if (newStatus === 'Retirado') {
      const isPaid = String(order.paymentStatus || '').trim().toLowerCase() === 'pago';
      try { if (isPaid) showToast('Ordem paga — marcando como Retirado'); else showToast('Ordem NÃO paga — abrindo confirmação'); } catch(_){}
      if (isPaid) {
        const updatedOrder = { ...order, status: 'Retirado' };
        const next = orders.map(o => o.id === order.id ? updatedOrder : o);
        setOrders(next);
        try { localStorage.setItem('orders', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}
        (async () => { try { if (supabase && typeof supabase.from === 'function') await supabase.from('ordens').update({ status: updatedOrder.status }).eq('id', updatedOrder.id); } catch(e){console.warn('Failed to persist quick status to Supabase', e);} })();
        // mensagem de agradecimento e pontos
        setFidelizacaoMessage(`Olá ${order.client}! 💝\n\n*Cleusa Ateliê de Costura*\n\nObrigada por retirar sua peça!\n\n✅ *Pagamento já realizado!*\n\nEsperamos que tenha ficado perfeita!`);
        setClientePhone(order.phone);
        setShowFidelizacaoModal(true);
        try { addPointsForOrder(updatedOrder); window.dispatchEvent(new CustomEvent('clientsUpdated')); } catch (e) {}
        setSelectedOrder(updatedOrder);
        const msg = composeStatusMessage(updatedOrder, 'Retirado');
        setStatusChangeMessage(msg);
        setFidelizacaoMessage(msg);
        setShowStatusMessageOptions(true);
        setShowStatusOnlyModal(true);
        return;
      }

      // use native confirm dialog to avoid modal rendering issues on some mobiles
      try { setSelectedOrder(order); } catch(_){}
      try {
        const confirmed = typeof window !== 'undefined' ? window.confirm('Cliente ainda não pagou. Deseja confirmar entrega mesmo assim?') : false;
        if (confirmed) {
          try { confirmDeliveryWithPayment(false); } catch(e){ console.warn('confirmDeliveryWithPayment failed', e); }
        } else {
          try { showToast('Entrega cancelada'); } catch(_){ }
        }
      } catch (e) { try { console.warn('native confirm failed', e); } catch(_){} }
      return;
    }

    const updatedOrder = { ...order, status: newStatus };
    const next = orders.map(o => o.id === order.id ? updatedOrder : o);
    setOrders(next);
    try { localStorage.setItem('orders', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}
    (async () => {
      try {
        if (supabase && typeof supabase.from === 'function') {
          const resp = await supabase.from('ordens').update({ status: updatedOrder.status }).eq('id', updatedOrder.id);
          try {
            const existing = localStorage.getItem('retiradoTaps');
            const arr = existing ? JSON.parse(existing) : [];
            arr.unshift({ id: updatedOrder.id, numero: updatedOrder.numero, newStatus: updatedOrder.status, ts: Date.now(), source: 'applyQuickStatus.persist', supabaseResponse: resp && (resp.error ? String(resp.error) : 'ok') });
            try { localStorage.setItem('retiradoTaps', JSON.stringify(arr.slice(0,200))); } catch(_){}
          } catch(_){}
        }
      } catch (e) { console.warn('Failed to persist order status to Supabase', e); }
    })();
    setSelectedOrder(updatedOrder);
    setStatusChangeMessage(composeStatusMessage(updatedOrder, newStatus));
    setShowStatusMessageOptions(true);
    if (newStatus !== 'Pronto') setShowStatusOnlyModal(true);

    // When marking as Pronto, open the fidelização message so the user can copy/send it
    if (newStatus === 'Pronto') {
      try {
        const isPaid = updatedOrder.paymentStatus === 'Pago';
        const paymentInfo = isPaid
          ? '\n✅ *Pagamento já realizado!*\n\nAguardamos você! ✨'
          : `\n\n*DADOS PARA PAGAMENTO PIX:*\n\n*Nome:* Cleusa Belani David\n*Telefone:* 45999126130\n*CPF:* 64166724053\n\nAguardamos você! ✨`;

        const clientNameMsg = getOrderField(updatedOrder, 'client', 'cliente', 'client_name', 'nome');
        const piecesText = formatPiecesAndServicesForMessage(updatedOrder);
        const serviceLine = getOrderField(updatedOrder, 'service', 'servico', 'servicos', 'serviceText');
        const dateOutMsg = getOrderField(updatedOrder, 'dateOut', 'data_entrega', 'previsao');
        const valueMsg = getOrderField(updatedOrder, 'value', 'valor', 'total');
        const header = `Olá ${clientNameMsg || updatedOrder.client || '-'}! 🎉\n\n*Cleusa Ateliê de Costura*\n\nSua(s) peça(s) da OS ${orderRef(updatedOrder)} está(ão) pronta(s).`;
        const details = `${serviceLine ? `\n\n🧾 Serviço(s): ${serviceLine}` : ''}\n${valueMsg ? `\n💰 Valor: ${valueMsg}` : ''}\n${dateOutMsg ? `\n\n📅 Previsão de retirada: ${dateOutMsg}` : ''}`;

        setFidelizacaoMessage(`${header}\n\n${piecesText || ''}${details}\n\n${paymentInfo}`);
        setClientePhone(updatedOrder.phone);
        setShowFidelizacaoModal(true);
      } catch (e) { console.warn('failed to build fidelizacao message for quick finalize', e); }
    }
    } finally {
      try { pendingStatusRef.current.delete(order.id); } catch(_){}
    }
  };

  const togglePaymentStatus = async (order: any) => {
    // Disallow changing payment status from the Ordens UI to avoid conflicts.
    try { showToast('Marcação de pagamento só pelo Financeiro'); } catch (e) {}
    return;

    // --- sincronizar fluxo_caixa ---
    try {
      const orderId = order.id;
      const numero = order.numero || orderRef(order) || '';
      const pieces = order.pieces || order.pecas || [];
      const amount = parseCurrency(order.value ?? order.valor ?? 0);

      if (newStatus === 'Pago') {
        // try to update existing fluxo_caixa entry for this order, else insert
        const cashEntry: any = {
          date: new Date().toLocaleDateString('pt-BR'),
          client: order.client || '',
          service: order.service || '',
          value: amount,
          status: 'Pago',
          orderId,
          numero,
          pecas: pieces
        };
        try {
          if (isFluxoAvailable() && supabase && typeof supabase.from === 'function') {
            // try by orderId
            let found: any = null;
            try {
              const q = await supabase.from('fluxo_caixa').select('*').eq('orderid', orderId).limit(1).maybeSingle();
              if ((q as any).error) {
                if ((q as any).error.code === 'PGRST205') { markFluxoMissing(); }
              } else if ((q as any).data) {
                found = (q as any).data;
              }
            } catch (e) {}
            // if not found, try by numero
            if (!found && numero) {
              try {
                const q2 = await supabase.from('fluxo_caixa').select('*').eq('numero', numero).limit(1).maybeSingle();
                if ((q2 as any).error) {
                  if ((q2 as any).error.code === 'PGRST205') { markFluxoMissing(); }
                } else if ((q2 as any).data) {
                  found = (q2 as any).data;
                }
              } catch (e) {}
            }

            if (found && found.id) {
              const serverUpdate: any = { ...cashEntry };
              // normalize keys for PostgREST
              if (serverUpdate.orderId) { serverUpdate.orderid = serverUpdate.orderId; }
              delete serverUpdate.orderId;
              delete serverUpdate.id;
              const r = await supabase.from('fluxo_caixa').update(serverUpdate).eq('id', found.id);
              if ((r as any).error) {
                if ((r as any).error.code === 'PGRST205') { markFluxoMissing(); }
                throw (r as any).error;
              }
            } else {
              const serverInsert: any = { ...cashEntry };
              if (serverInsert.orderId) { serverInsert.orderid = serverInsert.orderId; }
              delete serverInsert.orderId;
              delete serverInsert.id;
              const r = await supabase.from('fluxo_caixa').insert(serverInsert);
              if ((r as any).error) {
                if ((r as any).error.code === 'PGRST205') { markFluxoMissing(); }
                throw (r as any).error;
              }
              try {
                const resp = (r as any).data && (r as any).data[0] ? (r as any).data[0] : serverInsert;
                const rawLocal2 = localStorage.getItem('cashFlowDetails');
                const parsedLocal2 = rawLocal2 ? JSON.parse(rawLocal2) : [];
                parsedLocal2.unshift(resp);
                localStorage.setItem('cashFlowDetails', JSON.stringify(parsedLocal2));
              } catch (ee) {}
            }
            window.dispatchEvent(new CustomEvent('financeUpdated'));
          } else {
            throw new Error('no-supabase-or-fluxo-missing');
          }
        } catch (e) {
          // local fallback: update existing local entry or prepend
          try {
            const raw = localStorage.getItem('cashFlowDetails');
            const parsed = raw ? JSON.parse(raw) : [];
            const idx = (parsed || []).findIndex((c:any) => String(c.orderId || c.orderid) === String(orderId) || (numero && String(c.numero) === String(numero)));
            if (idx >= 0) {
              parsed[idx] = { ...parsed[idx], ...cashEntry, id: parsed[idx].id || (`cash-${Date.now()}`) };
            } else {
              parsed.unshift({ ...cashEntry, id: `cash-${Date.now()}` });
            }
            localStorage.setItem('cashFlowDetails', JSON.stringify(parsed));
            window.dispatchEvent(new CustomEvent('financeUpdated'));
          } catch (ee) { console.warn('failed to save cash entry locally', ee); }
        }
          // ensure ordens.paymentStatus is updated to 'Não pago' when unmarking
          try {
            if (supabase && typeof supabase.from === 'function') {
              try {
                if (orderId) {
                  const up = await supabase.from('ordens').update({ paymentStatus: 'Não pago' }).eq('id', orderId);
                  if ((up as any).error) console.warn('failed to update ordens paymentStatus by id', (up as any).error);
                } else if (numero) {
                  const numeroClean = String(numero).replace(/\D/g,'');
                  let up2 = null;
                  if (numeroClean) {
                    up2 = await supabase.from('ordens').update({ paymentStatus: 'Não pago' }).eq('numero', numeroClean);
                    if ((up2 as any).error) { console.warn('update ordens by numeric numero failed', (up2 as any).error); up2 = null; }
                  }
                  if (!up2) {
                    const up3 = await supabase.from('ordens').update({ paymentStatus: 'Não pago' }).eq('numero', numero);
                    if ((up3 as any).error) console.warn('update ordens by raw numero failed', (up3 as any).error);
                  }
                }
              } catch (ee) { console.warn('error updating ordens paymentStatus to Não pago', ee); }
              try { window.dispatchEvent(new CustomEvent('refetchOrdersFromServer')); } catch(e){}
            }
          } catch (ee) { /* ignore */ }

      // Try to persist paymentStatus to ordens table so state is canonical
      (async () => {
        try {
          if (supabase && typeof supabase.from === 'function') {
            try {
              if (orderId) {
                const up = await supabase.from('ordens').update({ paymentStatus: newStatus === 'Pago' ? 'Pago' : 'Não pago' }).eq('id', orderId);
                if ((up as any).error) {
                  if ((up as any).error.code === 'PGRST205') { markFluxoMissing(); }
                  console.warn('Supabase ordens paymentStatus update error', (up as any).error);
                  try { showToast('Falha ao atualizar servidor: ' + String((up as any).error.message || (up as any).error)); } catch(_){}
                } else {
                  try { window.dispatchEvent(new CustomEvent('refetchOrdersFromServer')); } catch(e){}
                }
              } else if (numero) {
                const up2 = await supabase.from('ordens').update({ paymentStatus: newStatus === 'Pago' ? 'Pago' : 'Não pago' }).eq('numero', numero);
                if ((up2 as any).error) {
                  console.warn('Supabase ordens paymentStatus update by numero error', (up2 as any).error);
                  try { showToast('Falha ao atualizar servidor: ' + String((up2 as any).error.message || (up2 as any).error)); } catch(_){}
                } else {
                  try { window.dispatchEvent(new CustomEvent('refetchOrdersFromServer')); } catch(e){}
                }
              }
            } catch (e) { console.warn('error updating ordens paymentStatus', e); }
          }
        } catch (e) { console.warn('ordens paymentStatus persistence failed', e); }
      })();
      } else {
        // marca como pendente/Não pago em vez de remover entradas
        try {
          if (isFluxoAvailable() && supabase && typeof supabase.from === 'function') {
            // try update by orderid then by numero
            try {
              if (orderId) {
                const up = await supabase.from('fluxo_caixa').update({ status: 'Não pago' }).eq('orderid', orderId);
                if ((up as any).error && (up as any).error.code === 'PGRST205') { markFluxoMissing(); }
              }
            } catch (e) { /* ignore */ }
            try {
              if (numero) {
                const up2 = await supabase.from('fluxo_caixa').update({ status: 'Não pago' }).eq('numero', numero);
                if ((up2 as any).error && (up2 as any).error.code === 'PGRST205') { markFluxoMissing(); }
              }
            } catch (e) { /* ignore */ }
            window.dispatchEvent(new CustomEvent('financeUpdated'));
          } else {
            throw new Error('no-supabase-or-fluxo-missing');
          }
        } catch (e) {
          try {
            const raw = localStorage.getItem('cashFlowDetails');
            const parsed = raw ? JSON.parse(raw) : [];
            // update local entries to status 'Não pago' instead of removing
            const updated = (parsed || []).map((c:any) => {
              try {
                if (orderId && String(c.orderId || c.orderid) === String(orderId)) return { ...c, status: 'Não pago' };
                if (numero && String(c.numero || '') === String(numero)) return { ...c, status: 'Não pago' };
              } catch (err) {}
              return c;
            });
            localStorage.setItem('cashFlowDetails', JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('financeUpdated'));
          } catch (ee) { console.warn('failed to mark local cash entries as unpaid', ee); }
        }
      }
    } catch (e) {
      console.warn('fluxo_caixa sync error', e);
    }

    // se marcado como pago, atualizar cartão do cliente (local + supabase)
    if (newStatus === 'Pago') {
      (async () => {
        try {
          const amount = parseCurrency(order.value ?? order.valor ?? 0);
          const phoneNormalized = (order.phone || '').toString().replace(/\D/g,'');
          const clientName = order.client || '';
          if (supabase && typeof supabase.from === 'function') {
            let clientRes: any = null;
            if (phoneNormalized) {
              const r = await supabase.from('clientes').select('*').ilike('telefone', `%${phoneNormalized}%`).limit(1).maybeSingle();
              if (!(r as any).error && (r as any).data) clientRes = (r as any).data;
            }
            if (!clientRes && clientName) {
              const r2 = await supabase.from('clientes').select('*').ilike('nome', clientName).limit(1).maybeSingle();
              if (!(r2 as any).error && (r2 as any).data) clientRes = (r2 as any).data;
            }
            if (clientRes) {
              try {
                const rawClients = localStorage.getItem('clientes');
                const clients = rawClients ? JSON.parse(rawClients) : [];
                const idx = clients.findIndex((c:any) => String(c.id) === String(clientRes.id));
                const amt = amount || 0;
                if (idx >= 0) {
                  clients[idx].totalGasto = (clients[idx].totalGasto || 0) + amt;
                  clients[idx].servicosRealizados = (clients[idx].servicosRealizados || 0) + 1;
                  localStorage.setItem('clientes', JSON.stringify(clients));
                  window.dispatchEvent(new CustomEvent('clientsUpdated'));
                }
              } catch (ee) { /* ignore */ }
              return;
            }
          }
        } catch (e) {
          console.warn('Failed to update client card on payment via supabase', e);
        }
        try {
          const raw = localStorage.getItem('clientes');
          const clients = raw ? JSON.parse(raw) : [];
          const match = clients.find((c:any) => (c.telefone && order.phone && c.telefone.replace(/\D/g,'') === String(order.phone).replace(/\D/g,'')) || (c.nome && order.client && c.nome === order.client));
          const amount = parseCurrency(order.value ?? order.valor ?? 0);
          if (match) {
            match.totalGasto = (match.totalGasto || 0) + amount;
            match.servicosRealizados = (match.servicosRealizados || 0) + 1;
            const earned = Math.floor(amount / 100);
            match.pontos = (match.pontos || 0) + earned;
            localStorage.setItem('clientes', JSON.stringify(clients));
            window.dispatchEvent(new CustomEvent('clientsUpdated'));
          }
        } catch (e) { console.warn('failed to update local client card on payment', e); }
      })();
    }
  };

  const filteredOrders = orders.filter(order => {
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch = !term || order.client.toLowerCase().includes(term) || order.service.toLowerCase().includes(term) || order.id.toLowerCase().includes(term);
    // Por padrão (Todos) não exibimos ordens já retiradas — elas ficam na página de entregues
    const matchesStatus = statusFilter === 'Todos' ? order.status !== 'Retirado' : order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // sort: open orders first, then finalized, then delivered. Within each group, urgent first, then overdue, then by entry date (older first)
  const sortStatusRank = (status: string) => {
    if (status === 'Recebido' || status === 'Em costura') return 0;
    if (status === 'Pronto' || status === 'Aguardando prova' || status === 'Ajuste final') return 1;
    return 2; // Retirado, Cancelado or others
  };

  const parseDate = (d?: string | null) => {
    if (!d || typeof d !== 'string') return new Date(0);
    const parts = d.split('/');
    if (parts.length !== 3) return new Date(0);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  };

  const orderRef = (order: any) => {
    if (!order) return '';
    const rawNum = String(order.numero || '');
    // if numero already contains digits, extract and pad to 6 digits and prefix with 'N'
    const digits = rawNum.replace(/\D/g, '');
    if (digits) return `N${digits.padStart(6, '0')}`;
    // if no numeric numero, try id fallback
    const idFallback = String(order.id || '').replace(/^OS-/, '');
    const idDigits = idFallback.replace(/\D/g, '');
    if (idDigits) return `N${idDigits.padStart(6, '0')}`;
    return String(order.numero || order.id || '');
  };

  const sortedOrders = filteredOrders.slice().sort((a, b) => {
    const sa = sortStatusRank(a.status);
    const sb = sortStatusRank(b.status);
    if (sa !== sb) return sa - sb;

    // urgent first
    const pa = a.priority === 'urgente' ? 0 : 1;
    const pb = b.priority === 'urgente' ? 0 : 1;
    if (pa !== pb) return pa - pb;

    // overdue first
    const lateA = isOrderLate(a.dateOut, a.status) ? 0 : 1;
    const lateB = isOrderLate(b.dateOut, b.status) ? 0 : 1;
    if (lateA !== lateB) return lateA - lateB;

    // older entry first
    return parseDate(a.dateIn).getTime() - parseDate(b.dateIn).getTime();
  });

  // persist orders to localStorage and notify dashboard
  useEffect(() => {
    try { console.debug('[OrdensPage] orders state changed — count:', (orders||[]).length, (orders||[]).slice(0,3)); } catch(e) {}
    try {
      if (ignoreLocalSaveRef.current) { ignoreLocalSaveRef.current = false; return; }
      localStorage.setItem('orders', JSON.stringify(orders));
      // `localStorage.setItem` is wrapped in `src/main.tsx` which already
      // dispatches the `ordersUpdated` event. Do not re-dispatch here to
      // avoid update loops between components.
    } catch (e) {}
  }, [orders]);

  // keep a Ref copy of the current orders to allow stable comparisons
  useEffect(() => { ordersRef.current = orders; }, [orders]);

  // Listen for external ordersUpdated events (e.g., from Financeiro) and reload local orders
  useEffect(() => {
    const onOrdersUpdated = () => {
      try {
        const parsed = readOrdersFromStorage();
        if (!Array.isArray(parsed)) return;
        const cashMap = getCashMap();
        const normalized = parsed.map((o:any) => {
          try {
            const cash = cashMap[String(o.id)] || cashMap[String(o.numero)];
            const currentPaid = String(o.paymentStatus || '').toLowerCase() === 'pago';
            const cashPaid = !!(cash && String(cash.status || '').toLowerCase() === 'pago');
            const finalPaid = currentPaid || cashPaid;
            return {
              ...o,
              status: normalizeStatus(o.status),
              paymentStatus: finalPaid ? 'Pago' : (o.paymentStatus || null),
              value: o.value || (cash ? `R$ ${Number(cash.value || cash.valor || 0).toFixed(2)}` : o.value)
            };
          } catch (err) {
            return { ...o, status: normalizeStatus(o.status), paymentStatus: (o.paymentStatus || null), value: o.value };
          }
        });

        const currJson = JSON.stringify(ordersRef.current || []);
        const newJson = JSON.stringify(normalized || []);
        if (currJson !== newJson) {
          if (Array.isArray(normalized) && normalized.length === 0 && Array.isArray(ordersRef.current) && ordersRef.current.length > 0) {
            try { setDebugInfo((prev:any)=>({ ...(prev||{}), skippedClearFromRefetch: true })); } catch(e){}
          } else {
            ignoreLocalSaveRef.current = true;
            setOrders(normalized);
          }
        }
      } catch (e) {
        // ignore listener errors
      }
    };
    window.addEventListener('ordersUpdated', onOrdersUpdated as EventListener);
    return () => { window.removeEventListener('ordersUpdated', onOrdersUpdated as EventListener); };
  }, []);

  const statusCounts = {
    Todos: orders.length,
    'Recebido': orders.filter(o => o.status === 'Recebido').length,
    'Em costura': orders.filter(o => o.status === 'Em costura').length,
    'Aguardando prova': orders.filter(o => o.status === 'Aguardando prova').length,
    'Ajuste final': orders.filter(o => o.status === 'Ajuste final').length,
    'Pronto': orders.filter(o => o.status === 'Pronto').length,
    'Retirado': orders.filter(o => o.status === 'Retirado').length,
    'Cancelado': orders.filter(o => o.status === 'Cancelado').length,
  };

  const serviceCategories = [
    { id: 'barras', name: '👖 Barras' },
    { id: 'ajustes', name: '✂️ Ajustes e Modelagem' },
    { id: 'camisas', name: '👕 Camisas / Blusas' },
    { id: 'vestidos', name: '👗 Vestidos' },
    { id: 'saia-short', name: '👔 Saia / Short / Bermuda' },
    { id: 'calcas', name: '👖 Calça / Jeans' },
    { id: 'casacos', name: '🧥 Casacos / Jaquetas' },
    { id: 'consertos', name: '🧵 Consertos Gerais' },
    { id: 'sociais', name: '👔 Roupas Sociais' },
    { id: 'infantis', name: '👶 Roupas Infantis' },
    { id: 'domestica', name: '🛋️ Costura Doméstica' },
    { id: 'especiais', name: '🎨 Serviços Especiais' },
  ];

  const statusOptions = [
    { id: 'Recebido', label: 'Recebido', color: 'bg-gray-400 text-white' },
    { id: 'Em costura', label: 'Em costura', color: 'bg-blue-500 text-white' },
    { id: 'Aguardando prova', label: 'Aguardando prova', color: 'bg-yellow-400 text-black' },
    { id: 'Ajuste final', label: 'Ajuste final', color: 'bg-purple-600 text-white' },
    { id: 'Pronto', label: 'Pronto', color: 'bg-green-500 text-white' },
    { id: 'Retirado', label: 'Retirado', color: 'bg-green-800 text-white' },
    { id: 'Cancelado', label: 'Cancelado', color: 'bg-red-600 text-white' },
  ];

  const statusIcons: Record<string, string> = {
    'Todos': 'ri-list-check-line',
    'Recebido': 'ri-inbox-line',
    'Em costura': 'ri-scissors-line',
    'Aguardando prova': 'ri-eye-line',
    'Ajuste final': 'ri-tools-line',
    'Pronto': 'ri-flag-line',
    'Retirado': 'ri-hand-heart-line',
    'Cancelado': 'ri-close-circle-line',
  };

  // Lista de materiais disponíveis
  const availableMaterials = [
    // Linhas
    { id: 1, name: 'Linha de costura poliéster', unit: 'metro', price: 0.50 },
    { id: 2, name: 'Linha de algodão', unit: 'metro', price: 0.60 },
    { id: 3, name: 'Linha para jeans', unit: 'metro', price: 0.80 },
    { id: 4, name: 'Linha para overlock', unit: 'metro', price: 0.70 },
    { id: 5, name: 'Linha invisível (nylon)', unit: 'metro', price: 1.00 },
    { id: 6, name: 'Linha encerada', unit: 'metro', price: 0.90 },
    { id: 7, name: 'Linha para bordado', unit: 'metro', price: 1.20 },
    
    // Agulhas
    { id: 8, name: 'Agulha de máquina doméstica', unit: 'unidade', price: 2.00 },
    { id: 9, name: 'Agulha de máquina industrial', unit: 'unidade', price: 3.00 },
    { id: 10, name: 'Agulha para jeans', unit: 'unidade', price: 2.50 },
    { id: 11, name: 'Agulha para malha', unit: 'unidade', price: 2.50 },
    { id: 12, name: 'Agulha para tecidos finos', unit: 'unidade', price: 2.00 },
    { id: 13, name: 'Agulha de mão', unit: 'unidade', price: 1.00 },
    { id: 14, name: 'Agulha curva', unit: 'unidade', price: 3.50 },
    
    // Botões e Fechamentos
    { id: 15, name: 'Botão comum', unit: 'unidade', price: 0.50 },
    { id: 16, name: 'Botão de pressão', unit: 'unidade', price: 1.00 },
    { id: 17, name: 'Botão de jeans', unit: 'unidade', price: 1.50 },
    { id: 18, name: 'Botão forrado', unit: 'unidade', price: 2.00 },
    { id: 19, name: 'Colchete', unit: 'unidade', price: 0.80 },
    { id: 20, name: 'Gancho', unit: 'unidade', price: 0.80 },
    { id: 21, name: 'Ilhós', unit: 'unidade', price: 0.60 },
    { id: 22, name: 'Fecho de metal', unit: 'unidade', price: 1.50 },
    { id: 23, name: 'Fecho plástico', unit: 'unidade', price: 1.00 },
    
    // Zíperes
    { id: 24, name: 'Zíper comum', unit: 'unidade', price: 5.00 },
    { id: 25, name: 'Zíper invisível', unit: 'unidade', price: 7.00 },
    { id: 26, name: 'Zíper de metal', unit: 'unidade', price: 8.00 },
    { id: 27, name: 'Zíper de nylon', unit: 'unidade', price: 6.00 },
    { id: 28, name: 'Zíper destacável (jaquetas)', unit: 'unidade', price: 10.00 },
    { id: 29, name: 'Cursor de zíper (puxador)', unit: 'unidade', price: 2.00 },
    
    // Elásticos
    { id: 30, name: 'Elástico comum', unit: 'metro', price: 1.50 },
    { id: 31, name: 'Elástico roliço', unit: 'metro', price: 2.00 },
    { id: 32, name: 'Elástico largo', unit: 'metro', price: 3.00 },
    { id: 33, name: 'Elástico para cintura', unit: 'metro', price: 2.50 },
    { id: 34, name: 'Elástico para punho', unit: 'metro', price: 1.80 },
    
    // Tecidos e Aviamentos
    { id: 35, name: 'Tecido para remendo', unit: 'metro', price: 10.00 },
    { id: 36, name: 'Forro', unit: 'metro', price: 8.00 },
    { id: 37, name: 'Entretela', unit: 'metro', price: 6.00 },
    { id: 38, name: 'Viés', unit: 'metro', price: 2.00 },
    { id: 39, name: 'Renda', unit: 'metro', price: 5.00 },
    { id: 40, name: 'Fita de cetim', unit: 'metro', price: 1.50 },
    { id: 41, name: 'Fita de gorgurão', unit: 'metro', price: 2.00 },
    { id: 42, name: 'Passamanaria', unit: 'metro', price: 3.00 },
    
    // Ferramentas Básicas
    { id: 43, name: 'Tesoura de tecido', unit: 'unidade', price: 25.00 },
    { id: 44, name: 'Tesoura de arremate', unit: 'unidade', price: 15.00 },
    { id: 45, name: 'Abridor de casas', unit: 'unidade', price: 8.00 },
    { id: 46, name: 'Alfinetes', unit: 'pacote', price: 5.00 },
    { id: 47, name: 'Alfinete de segurança', unit: 'pacote', price: 4.00 },
    { id: 48, name: 'Dedal', unit: 'unidade', price: 3.00 },
    { id: 49, name: 'Fita métrica', unit: 'unidade', price: 5.00 },
    { id: 50, name: 'Giz de alfaiate', unit: 'unidade', price: 3.00 },
    { id: 51, name: 'Marcador de tecido', unit: 'unidade', price: 6.00 },
    { id: 52, name: 'Descosedor', unit: 'unidade', price: 4.00 },
    
    // Produtos Auxiliares
    { id: 53, name: 'Cola para tecido', unit: 'unidade', price: 8.00 },
    { id: 54, name: 'Spray fixador', unit: 'unidade', price: 12.00 },
    { id: 55, name: 'Amaciante de costura', unit: 'litro', price: 10.00 },
    { id: 56, name: 'Ferro de passar', unit: 'unidade', price: 80.00 },
    { id: 57, name: 'Papel para molde', unit: 'metro', price: 2.00 },
    { id: 58, name: 'Papel carbono para costura', unit: 'folha', price: 1.50 },
    
    // Acabamento
    { id: 59, name: 'Bainha termocolante', unit: 'metro', price: 3.00 },
    { id: 60, name: 'Fita termocolante', unit: 'metro', price: 2.50 },
    { id: 61, name: 'Linha para acabamento fino', unit: 'metro', price: 1.00 },
    { id: 62, name: 'Entretela termocolante', unit: 'metro', price: 7.00 },
    
    // Embalagem e Entrega
    { id: 63, name: 'Saco plástico para roupa', unit: 'unidade', price: 0.50 },
    { id: 64, name: 'Capa protetora', unit: 'unidade', price: 2.00 },
    { id: 65, name: 'Etiqueta de identificação', unit: 'unidade', price: 0.30 },
    { id: 66, name: 'Tag de cliente', unit: 'unidade', price: 0.40 },
  ];

  // helper to run a manual server fetch from the UI (useful when console paste is unavailable)
  const runServerFetch = async () => {
    try {
      if (!(supabase && typeof supabase.from === 'function')) {
        try { setDebugInfo((prev:any) => ({ ...(prev||{}), runFetch: 'supabase-not-available' })); } catch(e){}
        return;
      }
      const r = await supabase.from('ordens').select('*').order('numero', { ascending: false });
      try { setDebugInfo((prev:any) => ({ ...(prev||{}), runFetch: r })); } catch(e){}
      if (!(r as any).error && Array.isArray((r as any).data)) {
        const raw = (r as any).data;
        // enrich server rows with client/service defaults to avoid runtime errors in render
        const enriched = (raw||[]).map((o:any) => ({
          ...o,
          client: o.client || o.cliente || '',
          service: o.service || o.servico || '',
          client_foto: o.client_foto || o.foto || null,
          phone: o.phone || o.telefone || '',
          status: normalizeStatus(o.status),
        }));
        try { localStorage.setItem('orders', JSON.stringify(enriched)); } catch(e){}
        try { setOrders(enriched); } catch(e){}
        try { window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch(e){}
      }
    } catch (e) {
      try { setDebugInfo((prev:any) => ({ ...(prev||{}), runFetchError: String(e) })); } catch(e){}
    }
  };

  const cleanTombstones = () => {
    try {
      const rawDeleted = localStorage.getItem('deletedOrders') || '[]';
      const deletedArr = JSON.parse(rawDeleted || '[]');
      const serverRows = (debugInfo && debugInfo.runFetch && debugInfo.runFetch.data) ? debugInfo.runFetch.data : [];
      const serverIdSet = new Set((serverRows||[]).map((s:any)=>String(s.id)).filter(Boolean));
      const serverNumSet = new Set((serverRows||[]).map((s:any)=>String(s.numero||'').replace(/\D/g,'')).filter(Boolean));
      const cleaned = (deletedArr||[]).filter((d:any) => {
        try {
          const dStr = String(d || '');
          if (serverIdSet.has(dStr)) return false;
          if (serverNumSet.has(String(dStr).replace(/\D/g,''))) return false;
          return true;
        } catch (e) { return true; }
      });
      localStorage.setItem('deletedOrders', JSON.stringify(cleaned));
      try { setDebugInfo((p:any) => ({ ...(p||{}), cleanedTombstones: { before: (deletedArr||[]).length, after: (cleaned||[]).length, removed: (deletedArr||[]).filter((x:any)=> !(cleaned||[]).includes(x)) } })); } catch(e){}
      try { window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch(e){}
    } catch (e) {
      try { setDebugInfo((p:any) => ({ ...(p||{}), cleanTombstonesError: String(e) })); } catch(e){}
    }
  };

  const clearDeletedTombstones = () => {
    try {
      localStorage.setItem('deletedOrders', JSON.stringify([]));
      try { setDebugInfo((p:any) => ({ ...(p||{}), clearedDeleted: true })); } catch(e){}
      try { window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch(e){}
    } catch (e) {
      try { setDebugInfo((p:any) => ({ ...(p||{}), clearDeletedError: String(e) })); } catch(e){}
    }
  };

  const localOrdersCount = (() => {
    try { return readOrdersFromStorage().length; } catch (e) { return 'n/a'; }
  })();

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar />
      
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0 min-w-0">
        <div className="p-4 lg:p-8 min-w-0">
          <style>{`
            /* Blink only the "ATRASADO" badge as a slow alert */
            .late-blink { animation: lateBlink 2.0s ease-in-out infinite; }
            @keyframes lateBlink { 0% { opacity: 1; transform: translateY(0); } 50% { opacity: 0.28; transform: translateY(-1px); } 100% { opacity: 1; transform: translateY(0); } }
          `}</style>
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 gap-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">Ordens de Serviço</h1>
              <p className="text-sm lg:text-base text-gray-600">Gerencie sua fila de costuras</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all whitespace-nowrap cursor-pointer font-medium"
            >
              <i className="ri-add-line text-xl w-5 h-5 flex items-center justify-center"></i>
              Nova Ordem
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-6 items-center">
            {Object.entries(statusCounts).map(([status, count]) => {
              const icon = statusIcons[status] || 'ri-checkbox-blank-line';
              const color = statusOptions.find(s => s.id === status)?.color || 'bg-gray-100 text-gray-800';
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs cursor-pointer ${
                    statusFilter === status
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded ${color}`}>
                    <i className={`${icon} text-sm`}></i>
                  </span>
                  <div className="flex flex-col leading-none text-left">
                    <span className="font-bold text-sm text-gray-900">{count}</span>
                    <span className="text-[11px] text-gray-600">{status}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg w-5 h-5 flex items-center justify-center"></i>
                <input
                  type="text"
                  placeholder="Buscar por cliente ou ID da ordem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Lista: tabela responsiva com filtros rápidos */}
            <div className="p-4">
              {showStoragePanel && (
                <div className="mb-4 p-3 bg-gray-50 border border-dashed rounded text-sm text-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <strong>localStorage snapshot</strong>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          try {
                            const blob = new Blob([JSON.stringify({ orders: readOrdersFromStorage(), deletedOrders: JSON.parse(localStorage.getItem('deletedOrders') || '[]') }, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = 'orders-storage-backup.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
                          } catch (e) { alert('Falha ao gerar download: ' + String(e)); }
                        }}
                        className="px-2 py-1 bg-rose-50 text-rose-700 rounded"
                      >
                        Download JSON
                      </button>
                      <button
                        onClick={() => {
                          try {
                            const backup = localStorage.getItem('orders_backup_pre_refetch') || null;
                            if (!backup) { alert('Nenhum backup encontrado'); return; }
                            localStorage.setItem('orders', backup);
                            window.dispatchEvent(new CustomEvent('ordersUpdated'));
                            alert('Restaurado a partir de orders_backup_pre_refetch');
                          } catch (e) { alert('Falha ao restaurar: ' + String(e)); }
                        }}
                        className="px-2 py-1 bg-gray-100 text-gray-800 rounded"
                      >
                        Restaurar backup
                      </button>
                      <button
                        onClick={() => {
                          try {
                            if (!confirm('Confirma aplicar limpeza forçada com o anexo fornecido? Isso sobrescreverá o localStorage.orders e localStorage.deletedOrders.')) return;
                            const attached = {
                              orders: [
                                {
                                  id: 'c0d68c80-6754-46c0-8a3d-0a071120f49d',
                                  cliente_id: '0deed1ad-0765-4651-bd3f-429af90a5d64',
                                  usuario_id: null,
                                  status: 'Recebido',
                                  total: 25,
                                  data_criacao: '2026-01-07T14:00:13.226502+00:00',
                                  data_entrega: '2026-01-12T00:00:00+00:00',
                                  notas: `{"obs":null,"pieces":[{"id":"P-1767794285620","tipo":"Blazer","cor":"Azul","modelo":"Social ","services":[{"id":1767794401303,"serviceId":36,"name":"Ajuste de jaqueta","pieceId":"P-1767794285620","category":"🧥 Casacos / Jaquetas","value":25,"observation":"Revisão de costura "}]}],"services":[{"id":1767794401303,"serviceId":36,"name":"Ajuste de jaqueta","pieceId":"P-1767794285620","category":"🧥 Casacos / Jaquetas","value":25,"observation":"Revisão de costura "}]}`,
                                  created_at: '2026-01-07T14:00:13.226502+00:00',
                                  updated_at: '2026-01-07T14:00:13.226502+00:00',
                                  numero: 23,
                                  paymentStatus: null,
                                  client: 'Gladys',
                                  pieces: [
                                    {
                                      id: 'P-1767794285620',
                                      tipo: 'Blazer',
                                      cor: 'Azul',
                                      modelo: 'Social ',
                                      services: [
                                        {
                                          id: 1767794401303,
                                          serviceId: 36,
                                          name: 'Ajuste de jaqueta',
                                          pieceId: 'P-1767794285620',
                                          category: '🧥 Casacos / Jaquetas',
                                          value: 25,
                                          observation: 'Revisão de costura '
                                        }
                                      ]
                                    }
                                  ],
                                  services: [
                                    {
                                      id: 1767794401303,
                                      serviceId: 36,
                                      name: 'Ajuste de jaqueta',
                                      pieceId: 'P-1767794285620',
                                      category: '🧥 Casacos / Jaquetas',
                                      value: 25,
                                      observation: 'Revisão de costura '
                                    }
                                  ],
                                  service: 'Ajuste de jaqueta',
                                  dateOut: '11/01/2026',
                                  value: 'R$ 25,00',
                                  phone: '4599471106',
                                  client_foto: null
                                },
                                {
                                  id: 'ea4f8070-3bcb-4844-b92c-e29d1151a66b',
                                  cliente_id: '5f679511-77f4-45a5-b0fb-b5ba7a7b1e77',
                                  usuario_id: null,
                                  status: 'Pronto',
                                  total: 40,
                                  data_criacao: '2026-01-07T12:04:52.09225+00:00',
                                  data_entrega: '2026-01-08T00:00:00+00:00',
                                  notas: `{"obs":null,"pieces":[{"id":"P-1767785765147","tipo":"Cropped","cor":"","modelo":"","services":[{"id":1767787431585,"serviceId":1767787425661,"name":"Encurtar Alça","pieceId":"P-1767785765147","category":"👕 Camisas / Blusas","value":20,"observation":""}]},{"id":"P-1767785775826","tipo":"Casaco","cor":"","modelo":"","services":[{"id":1767787489017,"serviceId":11,"name":"Ajuste de manga","pieceId":"P-1767785775826","category":"✂️ Ajustes e Modelagem","value":20,"observation":""}]}],"services":[{"id":1767787431585,"serviceId":1767787425661,"name":"Encurtar Alça","pieceId":"P-1767785765147","category":"👕 Camisas / Blusas","value":20,"observation":""},{"id":1767787489017,"serviceId":11,"name":"Ajuste de manga","pieceId":"P-1767785775826","category":"✂️ Ajustes e Modelagem","value":20,"observation":""}]}`,
                                  created_at: '2026-01-07T12:04:52.09225+00:00',
                                  updated_at: '2026-01-07T17:47:55.353265+00:00',
                                  numero: 22,
                                  paymentStatus: null,
                                  client: 'Juliana bordiao',
                                  pieces: [
                                    {
                                      id: 'P-1767785765147',
                                      tipo: 'Cropped',
                                      cor: '',
                                      modelo: '',
                                      services: [
                                        {
                                          id: 1767787431585,
                                          serviceId: 1767787425661,
                                          name: 'Encurtar Alça',
                                          pieceId: 'P-1767785765147',
                                          category: '👕 Camisas / Blusas',
                                          value: 20,
                                          observation: ''
                                        }
                                      ]
                                    },
                                    {
                                      id: 'P-1767785775826',
                                      tipo: 'Casaco',
                                      cor: '',
                                      modelo: '',
                                      services: [
                                        {
                                          id: 1767787489017,
                                          serviceId: 11,
                                          name: 'Ajuste de manga',
                                          pieceId: 'P-1767785775826',
                                          category: '✂️ Ajustes e Modelagem',
                                          value: 20,
                                          observation: ''
                                        }
                                      ]
                                    }
                                  ],
                                  services: [
                                    {
                                      id: 1767787431585,
                                      serviceId: 1767787425661,
                                      name: 'Encurtar Alça',
                                      pieceId: 'P-1767785765147',
                                      category: '👕 Camisas / Blusas',
                                      value: 20,
                                      observation: ''
                                    },
                                    {
                                      id: 1767787489017,
                                      serviceId: 11,
                                      name: 'Ajuste de manga',
                                      pieceId: 'P-1767785775826',
                                      category: '✂️ Ajustes e Modelagem',
                                      value: 20,
                                      observation: ''
                                    }
                                  ],
                                  service: 'Encurtar Alça, Ajuste de manga',
                                  dateOut: '07/01/2026',
                                  value: 'R$ 40,00',
                                  phone: '4599368718',
                                  client_foto: null
                                },
                                {
                                  id: 'cc3b589a-6927-45ab-a93d-e826157cadb0',
                                  cliente_id: '5a961bca-47b0-4441-8abf-61d588061e32',
                                  usuario_id: null,
                                  status: 'Recebido',
                                  total: 25,
                                  data_criacao: '2026-01-07T19:24:34.787024+00:00',
                                  data_entrega: '2026-01-08T00:00:00+00:00',
                                  notas: `{"pieces":[{"id":"local-1767812424919-nwmdaw","tipo":"Camisa","cor":"Marrom","services":[{"id":"local-s-1767812408988","name":"Barra","price":25}],"icone":"👔"}]}`,
                                  created_at: '2026-01-07T19:24:34.787024+00:00',
                                  updated_at: '2026-01-07T19:24:34.787024+00:00',
                                  numero: 24,
                                  paymentStatus: null,
                                  client: 'Andressa guizzo',
                                  phone: '4599469181',
                                  client_foto: null,
                                  pieces: [
                                    {
                                      id: 'local-1767812424919-nwmdaw',
                                      tipo: 'Camisa',
                                      cor: 'Marrom',
                                      services: [
                                        {
                                          id: 'local-s-1767812408988',
                                          name: 'Barra',
                                          price: 25
                                        }
                                      ],
                                      icone: '👔'
                                    }
                                  ],
                                  services: [],
                                  service: '',
                                  dateOut: '07/01/2026',
                                  value: 'R$ 25,00'
                                },
                                {
                                  id: 'ea733f0f-a1a3-4884-8541-d10cf90a33e2',
                                  cliente_id: 'f9342fb0-bb7f-47d8-8c52-9d215acd853e',
                                  usuario_id: null,
                                  status: 'Recebido',
                                  total: 20,
                                  data_criacao: '2026-01-07T19:31:09.569904+00:00',
                                  data_entrega: '2026-01-10T00:00:00+00:00',
                                  notas: `{"pieces":[{"id":"local-1767814195525-j298oh","tipo":"Regata","cor":"Marrom","services":[{"id":"3bca20e7-f302-485a-a3d3-8a6ea9d236f1","name":"Ajuste de alça ","price":20}],"icone":"👕"}]}`,
                                  created_at: '2026-01-07T19:31:09.569904+00:00',
                                  updated_at: '2026-01-07T19:31:09.569904+00:00',
                                  numero: 25,
                                  paymentStatus: null,
                                  client: 'Denise',
                                  phone: '4599278580',
                                  client_foto: null,
                                  pieces: [
                                    {
                                      id: 'local-1767814195525-j298oh',
                                      tipo: 'Regata',
                                      cor: 'Marrom',
                                      services: [
                                        {
                                          id: '3bca20e7-f302-485a-a3d3-8a6ea9d236f1',
                                          name: 'Ajuste de alça ',
                                          price: 20
                                        }
                                      ],
                                      icone: '👕'
                                    }
                                  ],
                                  services: [],
                                  service: '',
                                  dateOut: '09/01/2026',
                                  value: 'R$ 20,00'
                                },
                                {
                                  id: '8609f3a9-d9a6-40e1-9ca7-b1ed530d5b28',
                                  cliente_id: '23b71f3b-85d1-42f1-b4cb-47460b195550',
                                  usuario_id: null,
                                  status: 'Recebido',
                                  total: 45,
                                  data_criacao: '2026-01-07T19:40:50.155432+00:00',
                                  data_entrega: '2026-01-10T00:00:00+00:00',
                                  notas: `{"pieces":[{"id":"local-1767814656378-kjcbjj","tipo":"Blusa","cor":"Marrom","services":[{"id":"79344e96-ffb8-4688-bf39-a08e3a781171","name":"Reforço de costura","price":25}],"icone":"👕"},{"id":"local-1767814673358-zovntu","tipo":"Blusa","cor":"Verde","services":[{"id":"e4039793-795a-4e07-b007-cfc8f1d4a208","name":"Reparo ","price":20}],"icone":"👕"}]}`,
                                  created_at: '2026-01-07T19:40:50.155432+00:00',
                                  updated_at: '2026-01-07T19:40:50.155432+00:00',
                                  numero: 26,
                                  client: 'Sabini medina',
                                  phone: '4598437907',
                                  client_foto: null,
                                  pieces: [
                                    {
                                      id: 'local-1767814656378-kjcbjj',
                                      tipo: 'Blusa',
                                      cor: 'Marrom',
                                      services: [
                                        {
                                          id: '79344e96-ffb8-4688-bf39-a08e3a781171',
                                          name: 'Reforço de costura',
                                          price: 25
                                        }
                                      ],
                                      icone: '👕'
                                    },
                                    {
                                      id: 'local-1767814673358-zovntu',
                                      tipo: 'Blusa',
                                      cor: 'Verde',
                                      services: [
                                        {
                                          id: 'e4039793-795a-4e07-b007-cfc8f1d4a208',
                                          name: 'Reparo ',
                                          price: 20
                                        }
                                      ],
                                      icone: '👕'
                                    }
                                  ],
                                  services: [],
                                  service: '',
                                  dateOut: '09/01/2026',
                                  paymentStatus: null,
                                  value: 'R$ 45,00'
                                }
                              ],
                              deletedOrders: [
                                '1f55e98b-e833-4212-b240-92ec4eb92355',
                                'c9530c55-b51e-4e9b-ae9d-24658f1d7930',
                                'd946bf24-5952-4bfe-9133-415438ef7194',
                                'afcda96d-a45d-4cc4-8b6b-86b57450aa8d',
                                'c263969b-608c-4804-9445-7253b4ae3816',
                                'c454b92d-92fb-4065-8dd0-55b4cc674784',
                                'b5058fd0-c4f1-439e-83f3-424d74a15588',
                                'ad67da03-218a-4e1b-9a09-e84120c32de4',
                                '79b3ae7b-64b1-407f-8fa5-ef898a7606ab',
                                '9af922b2-d68e-46c4-9538-f074d960d94a',
                                '98d7698b-d4d2-48d1-bf45-82bf1fbd280a',
                                '7394ec6d-c186-4af1-a034-e61f19f71f8f',
                                '25196547-14eb-40ab-931d-83630af9b529',
                                '778531ee-3729-4321-87ae-9309adf172a0',
                                'aca0c87e-61ec-45be-a7e3-6390bd8dc66c',
                                '47e7bb5f-5b74-4d4f-bc8a-b3172dce9fcd',
                                'local-1767812487132-l0b3p9',
                                'cc3b589a-6927-45ab-a93d-e826157cadb0',
                                'ea733f0f-a1a3-4884-8541-d10cf90a33e2',
                                '8609f3a9-d9a6-40e1-9ca7-b1ed530d5b28'
                              ]
                            };
                            // Use the global wrapper's forced-write format to replace (not merge) orders
                            localStorage.setItem('orders', JSON.stringify({ __force: true, payload: attached.orders }));
                            localStorage.setItem('deletedOrders', JSON.stringify(attached.deletedOrders));
                            localStorage.setItem('orders_forced_by_agent', '1');
                            try { window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}
                            try { window.dispatchEvent(new CustomEvent('financeUpdated')); } catch (e) {}
                            alert('Anexo aplicado com sucesso. Recarregue a página.');
                          } catch (e) { alert('Falha ao aplicar anexo: ' + String(e)); }
                        }}
                        className="px-2 py-1 bg-red-50 text-red-700 rounded"
                      >
                        Aplicar anexo (limpeza forçada)
                      </button>
                    </div>
                  </div>
                  <div className="mb-2">
                    <textarea
                      value={storageImportText}
                      onChange={(e) => setStorageImportText(e.target.value)}
                      placeholder='Cole aqui o JSON com {"orders":[...], "deletedOrders":[...]} e clique em Importar'
                      className="w-full h-32 p-2 text-xs border rounded mb-2"
                    />
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => {
                          try {
                            const obj = storageImportText ? JSON.parse(storageImportText) : null;
                            if (!obj || typeof obj !== 'object') { alert('JSON inválido'); return; }
                            if (obj.orders) localStorage.setItem('orders', JSON.stringify(obj.orders));
                            if (obj.deletedOrders) localStorage.setItem('deletedOrders', JSON.stringify(obj.deletedOrders));
                            window.dispatchEvent(new CustomEvent('ordersUpdated'));
                            window.dispatchEvent(new CustomEvent('financeUpdated'));
                            alert('Importação concluída');
                          } catch (e) { alert('Falha ao importar JSON: ' + String(e)); }
                        }}
                        className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded"
                      >
                        Importar JSON
                      </button>
                      <button
                        onClick={async () => {
                          try {
                            let arr = readOrdersFromStorage();
                            if (!Array.isArray(arr)) { alert('Não foi possível ler localStorage.orders'); return; }
                            if (!Array.isArray(arr) || arr.length === 0) { alert('Nenhuma ordem local encontrada para enriquecer'); return; }
                            // load clients to enrich names
                            let clientsMap: Record<string, any> = {};
                            try { const cls = await loadClients(); (cls||[]).forEach((c:any) => { if (c && c.id) clientsMap[String(c.id)] = c; }); } catch(e) { /* ignore */ }
                            const enriched = (arr||[]).map((o:any) => {
                              try {
                                const client = o.client || o.cliente || (o.cliente_id ? (clientsMap[String(o.cliente_id)]?.nome || '') : '') || '';
                                let parsedNotas: any = {};
                                try { parsedNotas = o.notas ? (typeof o.notas === 'string' ? JSON.parse(o.notas) : o.notas) : {}; } catch(e) { parsedNotas = {}; }
                                const pieces = parsedNotas.pieces || parsedNotas.pecas || o.pieces || [];
                                const services = parsedNotas.services || parsedNotas.servicos || (pieces || []).flatMap((p:any) => p.services || []);
                                const servicesText = (services || []).flatMap((s:any) => [s.name || s.nome || s.title || String(s)]).join(', ').trim();
                                const dateOutRaw = o.data_entrega || o.previsao || o.dateOut || o.date_out || o.dataEntrega || '';
                                let dateOut = '';
                                try { if (dateOutRaw) { const d = new Date(String(dateOutRaw)); if (!isNaN(d.getTime())) dateOut = d.toLocaleDateString('pt-BR'); else dateOut = String(dateOutRaw); } } catch(e) { dateOut = String(dateOutRaw||''); }
                                const rawValue = o.total ?? o.value ?? o.total_valor ?? 0;
                                let value = '';
                                try { const n = Number(String(rawValue).replace(/[^0-9.-]/g,'').replace(',', '.')) || 0; value = n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }); } catch(e) { value = String(rawValue || ''); }
                                return { ...o, client, pieces, services, service: servicesText, dateOut, value, status: normalizeStatus(o.status) };
                              } catch (e) { return o; }
                            });
                            // forced write to replace existing orders fully
                            try { localStorage.setItem('orders', JSON.stringify({ __force: true, payload: enriched })); } catch(e){ alert('Falha ao escrever orders: '+String(e)); return; }
                            try { localStorage.setItem('orders_sanitized_by_agent', '1'); } catch(e){}
                            try { window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch(e){}
                            try { window.dispatchEvent(new CustomEvent('financeUpdated')); } catch(e){}
                            alert('Enriquecimento concluído — recarregue a página.');
                          } catch (e) { console.warn('enrich failed', e); alert('Falha ao enriquecer: ' + String(e)); }
                        }}
                        className="px-2 py-1 bg-blue-50 text-blue-700 rounded"
                      >
                        Enriquecer ordens
                      </button>
                      {/* Preencher com storage atual removed per UX request */}
                      <button
                        onClick={() => { setStorageImportText(''); }}
                        className="px-2 py-1 bg-white text-gray-700 border rounded"
                      >
                        Limpar
                      </button>
                    </div>
                  </div>
                  <pre className="max-h-56 overflow-auto text-xs p-2 bg-white border rounded">{(() => {
                    try { return JSON.stringify({ orders: readOrdersFromStorage(), deletedOrders: JSON.parse(localStorage.getItem('deletedOrders') || '[]') }, null, 2); } catch (e) { return String(e); }
                  })()}</pre>
                </div>
              )}
              <div className="mb-2" />
              {/* Debug button removed in production */}

              {/* Debug panel (visible when ?debug=1 is present in URL) */}
              {typeof window !== 'undefined' && window.location.search.includes('debug') && (
                <div className="p-3 bg-yellow-50 rounded-lg mb-4 border border-yellow-200">
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => { fetchDebugInfo(); setDebugOpen(true); }} className="px-3 py-1 bg-yellow-400 text-white rounded">Fetch Server/Local</button>
                    {/* Force Refetch button removed per UX request */}
                    <button onClick={() => { setDebugOpen(d => !d); }} className="px-3 py-1 border rounded">Toggle</button>
                  </div>
                  {debugOpen && debugInfo && (
                    <div className="text-xs text-gray-700">
                      <div className="mb-2">Server count: <strong>{debugInfo.serverCount}</strong></div>
                      <div className="mb-2">Local count: <strong>{debugInfo.localCount}</strong></div>
                      <div className="mb-2">Deleted tombstones: <strong>{(debugInfo.deleted||[]).length}</strong></div>
                      <div className="mb-2">Server sample:</div>
                      <div className="space-y-1 mb-2">
                        {(debugInfo.serverSample||[]).map((s:any,i:number) => (
                          <div key={i} className="text-[11px] text-gray-800">#{String(s.numero||s.id)} — {String(s.client||s.client_name||s.client||s.cliente||'—')}</div>
                        ))}
                      </div>
                      <div className="mb-2">Local sample:</div>
                      <div className="space-y-1">
                        {(debugInfo.localSample||[]).map((s:any,i:number) => (
                          <div key={i} className="text-[11px] text-gray-800">#{String(s.numero||s.id)} — {String(s.client||s.client_name||s.cliente||'—')}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Mobile stacked list */}
              <div className="sm:hidden space-y-3">
                {sortedOrders.map(order => (
                  <div key={order.id} className="bg-white p-3 rounded-lg border w-full">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 w-full">
                          <div className="flex items-center gap-2">
                          {order.client_foto ? (
                            <img src={order.client_foto} alt={order.client || 'cliente'} className="w-8 h-8 rounded-full object-cover" />
                          ) : null}
                          <div className="font-medium text-sm text-gray-900 truncate">{order.client}</div>
                          <div className="mt-0">
                            <button
                              onClick={() => { setSelectedOrder(order); setStatusSelection(order.status); setShowStatusOnlyModal(true); setShowStatusMessageOptions(false); }}
                              title="Clique para alterar o status"
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${statusOptions.find(s=>s.id===order.status)?.color || 'bg-gray-100 text-gray-800'}`}
                            >
                              {order.status}
                            </button>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 break-words"><span className="text-blue-600 font-semibold">{orderRef(order)}</span> · <span className={order.status === 'Em costura' ? 'font-bold' : ''}>{serviceDisplayFor(order)}</span></div>
                        <div className="text-xs text-gray-600 mt-1">Prazo: {order.dateOut || '—'}</div>
                      </div>
                      <div className="text-right ml-3">
                                <div className="font-bold text-sm text-green-600 truncate">{order.value}</div>
                                <div className="text-xs mt-1">
                                  <div className="text-[12px] px-2 py-1 rounded inline-flex items-center justify-center bg-red-50 text-red-600">Não Pago</div>
                                </div>
                      </div>
                    </div>
                      <div className="mt-3 flex items-center gap-2">
                              {order.status !== 'Em costura' && order.status !== 'Pronto' && order.status !== 'Retirado' && (
                                <button
                                  type="button"
                                  onTouchStart={(e) => handleQuickTap(order, 'Em costura', e)}
                                  onClick={(e) => handleQuickTap(order, 'Em costura', e)}
                                  title="Iniciar"
                                  disabled={pendingIds.includes(order.id)}
                                  className={"w-10 h-10 flex items-center justify-center text-white bg-blue-600 rounded text-lg " + (pendingIds.includes(order.id) ? 'opacity-50 cursor-not-allowed' : '')}
                                ><i className="ri-play-line"></i></button>
                              )}

                              {(order.status !== 'Pronto' && order.status !== 'Retirado') && (
                                <button
                                  type="button"
                                  onTouchStart={(e) => handleQuickTap(order, 'Pronto', e)}
                                  onClick={(e) => handleQuickTap(order, 'Pronto', e)}
                                  title="Finalizar"
                                  disabled={pendingIds.includes(order.id)}
                                  className={"w-10 h-10 flex items-center justify-center text-white bg-green-600 rounded text-lg " + (pendingIds.includes(order.id) ? 'opacity-50 cursor-not-allowed' : '')}
                                ><i className="ri-check-line"></i></button>
                              )}

                              {(order.status === 'Pronto' && order.status !== 'Retirado') && (
                                <>
                                  <button
                                    type="button"
                                    onTouchStart={(e) => handleQuickTap(order, 'Retirado', e)}
                                    onClick={(e) => handleQuickTap(order, 'Retirado', e)}
                                    title="Retirado"
                                    disabled={pendingIds.includes(order.id)}
                                    className={"w-10 h-10 flex items-center justify-center text-white bg-purple-600 rounded text-lg " + (pendingIds.includes(order.id) ? 'opacity-50 cursor-not-allowed' : '')}
                                  ><i className="ri-hand-heart-line"></i></button>
                                  {debugMode && (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); (async () => { await handleQuickTap(order, 'Retirado'); try { alert('DBG: ação enviada'); } catch(_){} })(); }}
                                      title="DBG Retirar"
                                      className="ml-2 w-20 h-10 flex items-center justify-center text-white bg-black rounded text-xs"
                                    >DBG Ret</button>
                                  )}
                                </>
                              )}

                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); printTicket(order); }}
                                title="Imprimir"
                                className="w-10 h-10 flex items-center justify-center text-gray-700 bg-gray-50 rounded text-lg"
                              ><i className="ri-printer-line"></i></button>

                              <div className="flex-1" />

                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleEdit(order); }}
                                title="Editar"
                                className="w-10 h-10 flex items-center justify-center text-rose-600 bg-rose-50 rounded text-lg"
                              ><i className="ri-edit-line"></i></button>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleDelete(order); }}
                                title="Excluir"
                                className="w-10 h-10 flex items-center justify-center text-red-600 bg-red-50 rounded text-lg"
                              ><i className="ri-delete-bin-line"></i></button>
                      {order.phone && (
                        // WhatsApp button removed per request
                        null
                      )}
                    </div>
                  </div>
                ))}
              </div>

                <div className="hidden sm:block w-full">
                <table className="w-full table-auto border-collapse">
                  <div className="sm:hidden mb-3 px-3">
                    <button
                      onClick={() => {
                        try { const first = orders.find((o:any) => o.status === 'Pronto'); if (!first) { showToast('Nenhuma OS com status Pronto'); return; } handleQuickTap(first, 'Retirado' as any); } catch(e){ console.warn(e); }
                      }}
                      onTouchStart={(e)=>{ try{ (e as any).stopPropagation(); }catch(_){}; try{ const first=orders.find((o:any)=>o.status==='Pronto'); if(first) handleQuickTap(first,'Retirado' as any);}catch(_){} }}
                      className="w-full bg-indigo-600 text-white py-3 rounded-md text-center font-medium"
                    >
                      Test Retirar (inline)
                    </button>
                  </div>
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-gray-600">Cliente</th>
                      <th className="hidden sm:table-cell px-3 py-2 text-left text-xs text-gray-600">Serviço</th>
                      <th className="hidden sm:table-cell px-3 py-2 text-left text-xs text-gray-600">Status</th>
                      <th className="hidden sm:table-cell px-3 py-2 text-left text-xs text-gray-600">Prazo</th>
                      <th className="px-3 py-2 text-right text-xs text-gray-600">Valor</th>
                      <th className="px-3 py-2 text-center text-xs text-gray-600">Ações <span className="text-[11px] text-gray-500">/ Envios</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {sortedOrders.map(order => {
                      const serviceDisplay = serviceDisplayFor(order);

                      const due = deliveryIndicator(order.dateOut);
                      const isLate = due === 'late';
                      return (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 align-top text-sm text-gray-900 min-w-0">
                            <div className="flex items-center gap-2">
                              {order.client_foto ? <img src={order.client_foto} alt={order.client || 'cliente'} className="w-8 h-8 rounded-full object-cover inline-block" /> : null}
                              <div className="font-medium">{order.client}</div>
                            </div>
                            <div className="text-xs text-gray-500"><span className="text-blue-600 font-semibold">{orderRef(order)}</span></div>
                            <div className="sm:hidden mt-1 text-xs text-gray-600">{serviceDisplay} · {order.dateOut || '—'}</div>
                          </td>
                          <td className="hidden sm:table-cell px-3 py-3 align-top text-sm text-gray-700 break-words">{serviceDisplay}</td>
                          <td className="px-3 py-3 align-top text-sm">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => { setSelectedOrder(order); setStatusSelection(order.status); setShowStatusOnlyModal(true); setShowStatusMessageOptions(false); }}
                                  title="Clique para alterar o status"
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${statusOptions.find(s => s.id === order.status)?.color || 'bg-gray-100 text-gray-700'}`}
                                >
                                  {order.status}
                                </button>
                              </div>
                          </td>
                          <td className="px-3 py-3 align-top text-sm text-gray-700">
                            {order.dateOut ? (
                              (() => {
                                const daysLeft = daysUntil(order.dateOut);
                                if (daysLeft === null) return <span>{order.dateOut}</span>;
                                if (daysLeft < 0) {
                                  return (
                                    <div className="flex items-center gap-2">
                                      <span className="text-red-600 font-bold">{order.dateOut}</span>
                                      <span className="text-red-600 text-xs font-bold">ATRASADO</span>
                                    </div>
                                  );
                                }
                                if (daysLeft === 0) {
                                  return <span className="text-yellow-800 text-xs font-bold">ENTREGA HOJE</span>;
                                }
                                return <span className="text-green-600 font-medium">Faltam {daysLeft} dias</span>;
                              })()
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-sm text-right">
                            <div className="font-bold text-green-600">{order.value}</div>
                              <div className="text-xs mt-1 flex items-center justify-center gap-2">
                                <div className={"inline-flex items-center gap-1 text-sm px-2 py-1 rounded bg-red-50 text-red-600"}>
                                  <i className="ri-money-dollar-circle-line"></i>
                                  Não Pago
                                </div>
                              </div>
                          </td>
                          <td className="px-3 py-3 align-top text-sm text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div className="flex items-center gap-2">
                                {order.status !== 'Em costura' && order.status !== 'Pronto' && order.status !== 'Retirado' && (
                                  <button type="button" onClick={(e) => handleQuickTap(order, 'Em costura', e as any)} title="Iniciar" disabled={pendingIds.includes(order.id)} className={"w-8 h-8 flex items-center justify-center text-white bg-blue-600 rounded " + (pendingIds.includes(order.id) ? 'opacity-50 cursor-not-allowed' : '')}>
                                    <i className="ri-play-line"></i>
                                  </button>
                                )}

                                {order.status !== 'Pronto' && order.status !== 'Retirado' && (
                                  <button type="button" onClick={(e) => handleQuickTap(order, 'Pronto', e)} title="Finalizar" disabled={pendingIds.includes(order.id)} className={"w-8 h-8 flex items-center justify-center text-white bg-green-600 rounded " + (pendingIds.includes(order.id) ? 'opacity-50 cursor-not-allowed' : '')}>
                                    <i className="ri-check-line"></i>
                                  </button>
                                )}

                                {order.status === 'Pronto' && order.status !== 'Retirado' && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleQuickTap(order, 'Retirado', e)}
                                    onTouchStart={(e) => { try { (e as any).stopPropagation(); } catch(_){}; handleQuickTap(order, 'Retirado', e as any); }}
                                    onPointerUp={(e) => { try { (e as any).stopPropagation(); } catch(_){}; handleQuickTap(order, 'Retirado', e as any); }}
                                    title="Marcar Retirado"
                                    disabled={pendingIds.includes(order.id)}
                                    className={"w-8 h-8 flex items-center justify-center text-white bg-purple-600 rounded " + (pendingIds.includes(order.id) ? 'opacity-50 cursor-not-allowed' : '')}
                                  >
                                    <i className="ri-hand-heart-line"></i>
                                  </button>
                                )}

                                <button onClick={() => printTicket(order)} title="Imprimir" className="w-8 h-8 flex items-center justify-center text-gray-700 bg-gray-50 rounded">
                                  <i className="ri-printer-line"></i>
                                </button>
                              </div>

                              <div className="flex items-center gap-2">
                                <button onClick={() => handleEdit(order)} title="Editar" className="w-8 h-8 flex items-center justify-center text-rose-600 bg-rose-50 rounded">
                                  <i className="ri-edit-line"></i>
                                </button>
                                <button onClick={() => handleDelete(order)} title="Excluir" className="w-8 h-8 flex items-center justify-center text-red-600 bg-red-50 rounded">
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </div>

                              {order.phone && (
                                <div className="flex items-center gap-2">
                                  {order.sentMessages?.[order.status] === 'sent' ? (
                                    <span title="Mensagem enviada" className="text-green-600 text-sm">📲</span>
                                  ) : order.sentMessages?.[order.status] === 'pending' ? (
                                    <span title="Pendente" className="text-yellow-600 text-sm">⏳</span>
                                  ) : null}

                                  <button onClick={() => copyMessageManual(order, order.status)} title="Copiar mensagem" className="w-8 h-8 flex items-center justify-center text-gray-700 bg-gray-50 rounded hover:bg-gray-100">
                                    <i className="ri-file-copy-line"></i>
                                  </button>
                                  <button onClick={() => sendMessageManual(order, order.status)} title="Enviar via WhatsApp" className="w-8 h-8 flex items-center justify-center text-rose-600 bg-rose-50 rounded hover:bg-rose-100">
                                    <i className="ri-send-plane-line"></i>
                                  </button>
                                  {/* Abrir WhatsApp removido */}
                                </div>
                              )}

                                {/* Modal Confirmar Entrega (pergunta inicial quando não pago) */}
                                {showConfirmDeliverPrompt && selectedOrder && (
                                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                    <div className="bg-white rounded-lg w-full max-w-md">
                                      <div className="p-4 lg:p-6">
                                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                          <i className="ri-alert-line text-2xl text-yellow-600 w-6 h-6 flex items-center justify-center"></i>
                                        </div>
                                        <h2 className="text-lg lg:text-xl font-bold text-gray-900 text-center mb-2">Confirmar Entrega</h2>
                                        <p className="text-sm text-gray-600 text-center mb-4">Cliente ainda não pagou, deseja realmente entregar?</p>
                                        <div className="flex gap-3 justify-center">
                                          <button onClick={() => { setShowConfirmDeliverPrompt(false); setSelectedOrder(null); }} className="px-4 py-2 border rounded">Não</button>
                                          <button onClick={() => { setShowConfirmDeliverPrompt(false); confirmDeliveryWithPayment(false); }} className="px-4 py-2 bg-green-600 text-white rounded">Sim</button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {toast && (
                  <div aria-live="polite" className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
                    <div className="bg-black/80 text-white text-sm px-4 py-2 rounded-md shadow">{toast}</div>
                  </div>
                )}
                  {quickTapDebug && (
                    <div className="fixed top-4 right-4 z-50">
                      <div className="bg-white/90 text-xs text-gray-800 px-3 py-1 rounded border shadow">Last action: {quickTapDebug.newStatus} ({quickTapDebug.id ? quickTapDebug.id.slice(0,6) : '—'})</div>
                    </div>
                  )}
                  {/* Export Debug: always visible to allow mobile Safari export of localStorage */}
                  <div className="fixed bottom-4 left-4 z-50">
                    <button onClick={exportLocalDebug} className="bg-black text-white text-xs px-3 py-2 rounded-md shadow">Export Debug</button>
                  </div>
                  <div className="fixed bottom-6 right-4 z-[9999] pointer-events-auto">
                    <button
                      id="test-retirar-btn"
                      onClick={() => {
                        try {
                          const first = orders.find((o:any) => o.status === 'Pronto');
                          if (!first) { showToast('Nenhuma OS com status Pronto'); return; }
                          handleQuickTap(first, 'Retirado' as any);
                        } catch (e) { console.warn('test retirar click failed', e); }
                      }}
                      onTouchStart={(e)=>{ try{ (e as any).stopPropagation(); }catch(_){}; try{ const first=orders.find((o:any)=>o.status==='Pronto'); if(first) handleQuickTap(first,'Retirado' as any);}catch(_){} }}
                      onPointerUp={(e)=>{ try{ (e as any).stopPropagation(); }catch(_){}; try{ const first=orders.find((o:any)=>o.status==='Pronto'); if(first) handleQuickTap(first,'Retirado' as any);}catch(_){} }}
                      className="bg-rose-600 text-white text-sm px-4 py-3 rounded-full shadow-lg block sm:hidden"
                      style={{ minWidth: '120px' }}
                    >
                      Test Retirar
                    </button>
                    <button
                      id="force-confirm-btn"
                      onClick={() => {
                        try {
                          const first = orders.find((o:any) => o.status === 'Pronto');
                          if (!first) { showToast('Nenhuma OS com status Pronto'); return; }
                          setSelectedOrder(first);
                          setShowConfirmDeliverPrompt(true);
                        } catch (e) { console.warn('force confirm click failed', e); }
                      }}
                      className="bg-yellow-500 text-white text-sm px-3 py-2 rounded-md shadow-lg mt-2 block sm:hidden"
                      style={{ minWidth: '120px' }}
                    >
                      Forçar Confirm
                    </button>
                    <button
                      id="intrusive-test-btn"
                      onClick={() => {
                        try {
                          alert('TEST CLICK');
                          const existing = localStorage.getItem('retiradoTaps');
                          const arr = existing ? JSON.parse(existing) : [];
                          arr.unshift({ testClick: true, ts: Date.now(), ua: typeof navigator !== 'undefined' ? navigator.userAgent : null });
                          try { localStorage.setItem('retiradoTaps', JSON.stringify(arr.slice(0,200))); } catch(_){}
                          try { showToast('Teste registrado'); } catch(_){}
                        } catch (e) { try { console.warn('intrusive test click failed', e); } catch(_){} }
                      }}
                      onTouchStart={(e)=>{ try{ (e as any).stopPropagation(); }catch(_){}; try{ alert('TEST CLICK'); }catch(_){} }}
                      className="bg-red-600 text-white text-sm px-5 py-4 rounded-full shadow-lg block sm:hidden"
                      style={{ minWidth: '140px', minHeight: '56px' }}
                    >
                      BOTÃO TESTE
                    </button>
                  </div>
                  {debugBanner && (
                    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50">
                      <div className="bg-rose-600 text-white text-sm px-4 py-2 rounded-md shadow">{debugBanner}</div>
                    </div>
                  )}
                  {/* Visible version marker so mobile can confirm updated deploy */}
                  <div className="fixed top-2 left-2 z-40 text-[10px] text-gray-500 bg-white/70 px-2 py-1 rounded">v:{APP_VERSION}</div>
                  {showDebugOverlay && (
                    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-4">
                      <div className="text-center">
                        <h1 className="text-2xl font-bold mb-2">BUILD ATUAL</h1>
                        <div className="text-sm text-gray-700 mb-4">Agora: {new Date().toLocaleString()}</div>
                        <div className="text-xs text-gray-500 mb-6">Se você vê este overlay, seu dispositivo está carregando a versão mais recente.</div>
                        <button onClick={()=>setShowDebugOverlay(false)} className="bg-black text-white px-4 py-2 rounded">Fechar</button>
                      </div>
                    </div>
                  )}
                  {/* Duplicate Export Debug button in top-right to avoid Safari bottom toolbar overlay */}
                  <div className="fixed top-2 right-2 z-50">
                    <button onClick={exportLocalDebug} className="bg-black text-white text-xs px-3 py-2 rounded-md shadow">Export Debug</button>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Pagamento Antecipado */}
      {showAdvancePaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 lg:p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-money-dollar-circle-line text-2xl text-green-600 w-6 h-6 flex items-center justify-center"></i>
              </div>
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 text-center mb-2">Pagamento Antecipado</h2>
              <p className="text-sm text-gray-600 text-center mb-4">
                Confirmar que o cliente <strong>{selectedOrder.client}</strong> realizou o pagamento antecipado?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Ordem:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedOrder.id}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Serviço:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedOrder.service}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Valor:</span>
                  <span className="text-sm font-bold text-green-600">{selectedOrder.value}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAdvancePaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmAdvancePayment}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Ordem (dynamic wizard) */}
      {showModal && (
        <NewOsWizard
          onClose={() => { setShowModal(false); }}
          onCreated={(order:any) => {
            try {
              // helper: extract only digits from numero for stable comparison
              const numeroDigits = (n: any) => {
                try {
                  const raw = String(n || '').replace(/\D/g, '');
                  return raw ? String(parseInt(raw, 10)) : '';
                } catch (e) { return String(n || ''); }
              };
              // reload canonical orders from localStorage (NewOsWizard already persisted there)
              const parsed = readOrdersFromStorage();
              if (Array.isArray(parsed)) {
                // dedupe by id (server/local) or normalized numero (digits)
                const seen = new Set<string>();
                const deduped: any[] = [];
                for (let i = 0; i < parsed.length; i++) {
                  const o = parsed[i];
                  try {
                    const key = o && o.id ? `id:${String(o.id)}` : (o && o.numero ? `num:${numeroDigits(o.numero)}` : `raw:${JSON.stringify(o)}`);
                    if (seen.has(key)) continue;
                    seen.add(key);
                    deduped.push(o);
                  } catch (e) { deduped.push(o); }
                }
                // persist cleaned list back to localStorage
                try { localStorage.setItem('orders', JSON.stringify(deduped)); } catch (e) {}
                setOrders(deduped);
                // try to find the freshly created order by id or numero digits
                const saved = deduped.find((o:any) => (order && order.id && String(o.id) === String(order.id)) || (order && order.numero && numeroDigits(o.numero) === numeroDigits(order.numero))) || deduped[0] || order;
                setSelectedOrder(saved);
                setShowSavedSummary(true);
              } else {
                // fallback: use provided object
                setSelectedOrder(order);
                setOrders((prev) => [...(prev||[]), order]);
                setShowSavedSummary(true);
              }
            } catch (e) {
              try { setSelectedOrder(order); setShowSavedSummary(true); } catch (_) {}
            }
          }}
        />
      )}

      {/* Modal Novo Cliente Rápido */}
      {/* Modal Escolher Peça */}
      {showPecasModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="p-4 flex items-center justify-between border-b">
              <h3 className="font-bold text-lg">Escolher Tipo de Peça</h3>
              <button onClick={() => { setShowPecasModal(false); setPecasSearch(''); }} className="text-gray-500"><i className="ri-close-line text-2xl"></i></button>
            </div>
            <div className="p-4 space-y-3">
              <input placeholder="Pesquisar peças..." value={pecasSearch} onChange={(e) => setPecasSearch(e.target.value)} className="w-full px-3 py-2 border rounded" />
              <div className="grid grid-cols-2 gap-2">
                {(availablePieces || []).filter((p:any) => !pecasSearch || String(p.nome).toLowerCase().includes(pecasSearch.toLowerCase())).map((p:any) => (
                  <button key={p.id || p.nome} onClick={() => { setPieceTipo(p.nome); setShowPecasModal(false); setPecasSearch(''); }} className="text-left p-2 border rounded hover:bg-gray-50 flex items-center gap-3">
                    <span className="text-xl">{p.icone || '🧵'}</span>
                    <div className="text-left">
                      <div className="font-medium">{p.nome}</div>
                      <div className="text-xs text-gray-500">{p.categoria || ''}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Escolher Cor */}
      {showCorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-lg w-full max-w-sm">
            <div className="p-4 flex items-center justify-between border-b">
              <h3 className="font-bold text-lg">Escolher Cor</h3>
              <button onClick={() => setShowCorModal(false)} className="text-gray-500"><i className="ri-close-line text-2xl"></i></button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-3 gap-2">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => { setPieceCor(c); setShowCorModal(false); }} className="px-3 py-2 border rounded text-sm text-left hover:bg-gray-50">{c}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showPrintOptions && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Opções de Impressão</h3>
              <button onClick={() => { setShowPrintOptions(false); setShowSavedSummary(false); setShowFidelizacaoModal(false); setSelectedOrder(null); }} className="text-gray-500">Fechar</button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-700">Deseja imprimir ou salvar a OS em PDF? Use as opções abaixo.</p>
              <div className="flex gap-2">
                <button onClick={() => { printTicket(orders[orders.length-1]); setShowPrintOptions(false); setShowSavedSummary(false); setSelectedOrder(null); }} className="flex-1 px-3 py-2 bg-rose-600 text-white rounded">🖨️ Imprimir OS</button>
                <button onClick={() => { printTicket(orders[orders.length-1]); setShowPrintOptions(false); setShowSavedSummary(false); setSelectedOrder(null); }} className="flex-1 px-3 py-2 border rounded">📄 Salvar em PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal Resumo Salvo */}
      {showSavedSummary && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-70 p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Ordem Salva</h3>
              <button onClick={() => setShowSavedSummary(false)} className="text-gray-500"><i className="ri-close-line text-2xl"></i></button>
            </div>
            <div className="space-y-2 text-sm text-gray-700">
              <div><strong>OS:</strong> {selectedOrder.numero}</div>
              <div><strong>Cliente:</strong> {selectedOrder.client}</div>
              <div><strong>Peça:</strong> {(selectedOrder.pieces||[]).map((p:any)=>p.tipo).join(', ')}</div>
              <div><strong>Serviço:</strong> {selectedOrder.service}</div>
              <div><strong>Prazo:</strong> {selectedOrder.dateOut || '—'}</div>
              <div><strong>Status:</strong> {selectedOrder.status}</div>
              <div><strong>Valor:</strong> {selectedOrder.value} · <em>{selectedOrder.paymentStatus === 'Pago' ? 'Pago' : 'Não Pago'}</em></div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => { setShowSavedSummary(false); setShowPrintOptions(true); }} className="px-3 py-2 bg-rose-600 text-white rounded">Imprimir / PDF</button>
              <button onClick={() => setShowSavedSummary(false)} className="px-3 py-2 border rounded">Fechar</button>
            </div>
          </div>
        </div>
      )}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Cadastro Rápido</h2>
              <button
                onClick={() => setShowNewClientModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            <div className="p-4 lg:p-6 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={quickClientName}
                  onChange={(e) => setQuickClientName(e.target.value)}
                  placeholder="Nome do cliente"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  value={quickClientPhone}
                  onChange={(e) => setQuickClientPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
                />
              </div>
            </div>
            <div className="p-4 lg:p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowNewClientModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!quickClientName) return alert('Informe o nome do cliente');
                    const saved = await upsertClient({ nome: quickClientName, telefone: quickClientPhone });
                    try {
                      const list = await loadClients();
                      setClientes(list || []);
                    } catch (e) {}
                    // if we are creating a new order, preselect the new client
                    if (saved && saved.id) setNewOrderClientId(String(saved.id));
                    alert('Cliente cadastrado com sucesso!');
                  } catch (e) {
                    console.warn('quick client save failed', e);
                    alert('Falha ao salvar cliente');
                  } finally {
                    setShowNewClientModal(false);
                    setQuickClientName('');
                    setQuickClientPhone('');
                  }
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Editar Ordem de Serviço</h2>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            <div className="p-4 lg:p-6 space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Cliente</label>
                  <input type="text" value={editClient} onChange={(e) => setEditClient(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500 cursor-pointer">
                    {serviceCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Tipo de Serviço</label>
                <select value={editServiceName} onChange={(e) => setEditServiceName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500 cursor-pointer">
                  <option value="">Selecione um serviço...</option>
                  {servicosDisponiveisState.filter(s => !editCategory || s.category === editCategory).map(s => (
                    <option key={s.id} value={s.name}>{s.name} (R$ {s.price.toFixed(2)})</option>
                  ))}
                  {editServiceName && !servicosDisponiveisState.some(s => s.name === editServiceName) && (
                    <option value={editServiceName}>{editServiceName}</option>
                  )}
                </select>
              </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500 cursor-pointer">
                    {statusOptions.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Data de Entrada</label>
                  <input type="date" value={editDateIn} onChange={(e) => setEditDateIn(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Prazo de Entrega</label>
                  <input type="date" value={editDateOut} onChange={(e) => setEditDateOut(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea rows={3} value={editObservation} onChange={(e) => setEditObservation(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500"></textarea>
              </div>
            </div>
              <div className="p-4 lg:p-6 border-t border-gray-200 flex gap-3">
              <button 
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  // save edits to orders and notify client via WhatsApp
                  const dateInStr = editDateIn ? editDateIn.split('-').reverse().join('/') : selectedOrder.dateIn;
                  const dateOutStr = editDateOut ? editDateOut.split('-').reverse().join('/') : selectedOrder.dateOut;
                  const updatedOrder = {
                    ...selectedOrder,
                    client: editClient,
                    category: serviceCategories.find(c => c.id === editCategory)?.name || editCategory,
                    service: editServiceName,
                    value: editValue.startsWith('R$') ? editValue : `R$ ${editValue}`,
                    status: editStatus,
                    dateIn: dateInStr,
                    dateOut: dateOutStr,
                    observation: editObservation,
                  };
                  const next = orders.map(o => o.id === selectedOrder.id ? updatedOrder : o);
                  setOrders(next);
                  try { localStorage.setItem('orders', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}
                  (async () => {
                    try {
                      if (supabase && typeof supabase.from === 'function') {
                        const payload: any = {
                          client: updatedOrder.client,
                          category: updatedOrder.category,
                          service: updatedOrder.service,
                          value: updatedOrder.value,
                          status: updatedOrder.status,
                          dateIn: updatedOrder.dateIn,
                          dateOut: updatedOrder.dateOut,
                          observation: updatedOrder.observation,
                        };
                        // include notas (pieces + services) if present
                        try {
                          const notas = { pieces: updatedOrder.pieces || [], services: updatedOrder.services || [] };
                          payload.notas = JSON.stringify(notas);
                          // attempt to set numeric total if available
                          const total = Number(String(updatedOrder.value || '').replace(/[^0-9,.-]/g,'').replace(/,/g,'.')) || undefined;
                          if (!isNaN(total)) payload.total = total;
                        } catch (ee) {}
                        await supabase.from('ordens').update(payload).eq('id', updatedOrder.id);
                      }
                    } catch (e) { console.warn('Failed to persist edited order to Supabase', e); }
                  })();
                  // preparar mensagem e abrir opções de envio (copiar/enviar/não enviar)
                  setSelectedOrder(updatedOrder);
                  setStatusChangeMessage(composeStatusMessage(updatedOrder, editStatus));
                  setShowStatusMessageOptions(true);
                  setShowStatusOnlyModal(true);
                  setShowEditModal(false);
                }}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Modal Alterar Status (apenas status + opções de WhatsApp) */}
        {showStatusOnlyModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-bold">Alterar Status - {selectedOrder.id}</h3>
                <button onClick={() => setShowStatusOnlyModal(false)} className="text-gray-500"><i className="ri-close-line text-2xl"></i></button>
              </div>
              <div className="p-4 space-y-4">
                {!showStatusMessageOptions ? (
                  <>
                    <label className="block text-sm text-gray-700">Novo Status</label>
                    <select value={statusSelection} onChange={(e) => setStatusSelection(e.target.value)} className="w-full px-3 py-2 border rounded">
                      {statusOptions.map(s => (<option key={s.id} value={s.id}>{s.label}</option>))}
                    </select>
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setShowStatusOnlyModal(false)} className="px-4 py-2 border rounded">Cancelar</button>
                      <button onClick={() => {
                        // If changing to Retirado, handle payment confirmation
                        if (statusSelection === 'Retirado') {
                          if (selectedOrder.paymentStatus === 'Pago') {
                            const updatedOrder = { ...selectedOrder, status: 'Retirado' };
                            const next = orders.map(o => o.id === selectedOrder.id ? updatedOrder : o);
                            setOrders(next);
                            try { localStorage.setItem('orders', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}
                            (async () => { try { if (supabase && typeof supabase.from === 'function') await supabase.from('ordens').update({ status: updatedOrder.status }).eq('id', updatedOrder.id); } catch(e){console.warn('Failed to persist status-only Retirado to Supabase', e);} })();
                            const msg = composeStatusMessage(updatedOrder, 'Retirado');
                            setStatusChangeMessage(msg);
                            setShowStatusMessageOptions(true);
                            setShowStatusOnlyModal(true);
                            try { addPointsForOrder(updatedOrder); window.dispatchEvent(new CustomEvent('clientsUpdated')); } catch (e) {}
                            return;
                          }
                          // open a confirm prompt modal; if user confirms we'll open the payment modal
                          setSelectedOrder(selectedOrder);
                          setShowStatusOnlyModal(false);
                          setShowConfirmDeliverPrompt(true);
                          return;
                        }

                        // apply status change and prepare message
                        const updatedOrder = { ...selectedOrder, status: statusSelection };
                        const next = orders.map(o => o.id === selectedOrder.id ? updatedOrder : o);
                        setOrders(next);
                        try { localStorage.setItem('orders', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}
                        (async () => { try { if (supabase && typeof supabase.from === 'function') await supabase.from('ordens').update({ status: updatedOrder.status }).eq('id', updatedOrder.id); } catch(e){console.warn('Failed to persist status-only change to Supabase', e);} })();
                        const msg = composeStatusMessage(updatedOrder, statusSelection);
                        setStatusChangeMessage(msg);
                        setShowStatusMessageOptions(true);
                      }} className="px-4 py-2 bg-rose-600 text-white rounded">Salvar</button>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="block text-sm text-gray-700">Mensagem para o cliente</label>
                    <div className="bg-gray-50 p-3 rounded max-h-40 overflow-y-auto whitespace-pre-line text-sm text-gray-900">{statusChangeMessage}</div>
                    <div className="flex gap-3">
                      <button onClick={() => { navigator.clipboard.writeText(statusChangeMessage); setShowStatusOnlyModal(false); }} className="flex-1 px-3 py-2 border rounded flex items-center justify-center gap-2">Copiar</button>
                      <button onClick={() => { const phone = (selectedOrder.phone || '').replace(/\D/g, ''); const st = statusSelection || selectedOrder.status; window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(statusChangeMessage)}`, '_blank'); try { markMessageSent(selectedOrder.id, st); } catch(e){} setShowStatusOnlyModal(false); }} className="flex-1 px-3 py-2 bg-green-600 text-white rounded flex items-center justify-center gap-2">Enviar</button>
                      <button onClick={() => setShowStatusOnlyModal(false)} className="flex-1 px-3 py-2 border rounded">Não enviar</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Modal Excluir */}
      {showDeleteModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 lg:p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-delete-bin-line text-2xl text-red-600"></i>
              </div>
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 text-center mb-2">Excluir Ordem de Serviço</h2>
              <p className="text-sm text-gray-600 text-center mb-6">
                Tem certeza que deseja excluir a ordem de <strong>{selectedOrder.client}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Materiais */}
      {showMaterialsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg lg:text-xl font-bold text-gray-900">Materiais Utilizados</h2>
                <p className="text-xs lg:text-sm text-gray-600 mt-1">Ordem: {selectedOrder.client} - {selectedOrder.service}</p>
              </div>
              <button 
                onClick={() => setShowMaterialsModal(false)}
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            <div className="p-4 lg:p-6">
              {orderMaterials.length > 0 && (
                <div className="space-y-3 mb-4">
                  {orderMaterials.map((material) => (
                    <div key={material.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{material.name}</p>
                        <p className="text-xs text-gray-600">
                          {material.quantity} {material.unit} × R$ {material.unitPrice.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">R$ {material.total.toFixed(2)}</p>
                      <button 
                        onClick={() => removeMaterial(material.id)}
                        className="text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        <i className="ri-delete-bin-line text-lg"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Adicionar Material</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Material</label>
                    <select 
                      value={selectedMaterialId}
                      onChange={handleMaterialSelect}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500 cursor-pointer"
                    >
                      <option value="">Selecione um material...</option>
                      <optgroup label="🧵 LINHAS">
                        {availableMaterials.filter(m => m.id >= 1 && m.id <= 7).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🪡 AGULHAS">
                        {availableMaterials.filter(m => m.id >= 8 && m.id <= 14).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🔘 BOTÕES E FECHAMENTOS">
                        {availableMaterials.filter(m => m.id >= 15 && m.id <= 23).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🔒 ZÍPERES">
                        {availableMaterials.filter(m => m.id >= 24 && m.id <= 29).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🧶 ELÁSTICOS">
                        {availableMaterials.filter(m => m.id >= 30 && m.id <= 34).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🧥 TECIDOS E AVIAMENTOS">
                        {availableMaterials.filter(m => m.id >= 35 && m.id <= 42).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🪢 FERRAMENTAS BÁSICAS">
                        {availableMaterials.filter(m => m.id >= 43 && m.id <= 52).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🧴 PRODUTOS AUXILIARES">
                        {availableMaterials.filter(m => m.id >= 53 && m.id <= 58).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🧵 ACABAMENTO">
                        {availableMaterials.filter(m => m.id >= 59 && m.id <= 62).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="📦 EMBALAGEM E ENTREGA">
                        {availableMaterials.filter(m => m.id >= 63 && m.id <= 66).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Quantidade</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={materialQuantity}
                        onChange={(e) => setMaterialQuantity(e.target.value)}
                        placeholder="1" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Valor Unitário (R$)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={materialPrice}
                        onChange={(e) => setMaterialPrice(e.target.value)}
                        placeholder="0,00" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" 
                      />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={addMaterial}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-add-line mr-2"></i>
                  Adicionar Material
                </button>
              </div>

              <div className="border-t border-gray-200 mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total em Materiais:</span>
                  <span className="text-lg font-bold text-purple-600">R$ {getTotalMaterials().toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="p-4 lg:p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button 
                onClick={() => setShowMaterialsModal(false)}
                className="w-full px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Entregar/Finalizar */}
      {showDeliverModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 lg:p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-check-double-line text-2xl text-green-600 w-6 h-6 flex items-center justify-center"></i>
              </div>
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 text-center mb-2">Finalizar Ordem</h2>
              <p className="text-sm text-gray-600 text-center mb-4">
                Confirmar finalização da ordem de <strong>{selectedOrder.client}</strong>?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Data de Finalização:</span>
                  <span className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Horário:</span>
                  <span className="text-sm font-bold text-gray-900">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeliverModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDeliver}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagamento ao Entregar */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 lg:p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-hand-coin-line text-2xl text-blue-600 w-6 h-6 flex items-center justify-center"></i>
              </div>
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 text-center mb-2">Confirmar Entrega</h2>
              <p className="text-sm text-gray-600 text-center mb-4">
                A ordem de <strong>{selectedOrder.client}</strong> foi paga?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Cliente:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedOrder.client}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Serviço:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedOrder.service}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Valor:</span>
                  <span className="text-sm font-bold text-green-600">{selectedOrder.value}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => confirmDeliveryWithPayment(false)}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Não Pago
                </button>
                <button 
                  onClick={() => confirmDeliveryWithPayment(true)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Sim, Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fidelização */}
      {showFidelizacaoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 lg:p-6">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-message-3-line text-2xl text-rose-600 w-6 h-6 flex items-center justify-center"></i>
              </div>
              <h2 className="text-base lg:text-xl font-bold text-gray-900 text-center mb-2">Mensagem de Fidelização</h2>
              <p className="text-xs text-gray-600 text-center mb-3">
                Envie esta mensagem para o cliente via WhatsApp
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-[40vh] overflow-y-auto">
                <p className="text-xs lg:text-sm text-gray-900 whitespace-pre-line">{fidelizacaoMessage}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { try { navigator.clipboard.writeText(fidelizacaoMessage); alert('Mensagem copiada!'); } catch(e){ alert('Não foi possível copiar'); } setShowFidelizacaoModal(false); setShowPrintOptions(true); }}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-xs lg:text-sm font-medium whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="ri-file-copy-line text-base lg:text-lg w-4 h-4 flex items-center justify-center"></i>
                  Copiar
                </button>
                <button
                  onClick={() => { openWhatsApp(); }}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-xs lg:text-sm font-medium whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="ri-whatsapp-line text-base lg:text-lg w-4 h-4 flex items-center justify-center"></i>
                  Enviar
                </button>
                <button
                  onClick={() => { setShowFidelizacaoModal(false); setShowPrintOptions(true); }}
                  className="flex-0 px-3 py-2 border border-transparent text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all text-xs lg:text-sm font-medium whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
