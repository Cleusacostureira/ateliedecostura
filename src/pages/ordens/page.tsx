import { useState, useEffect, useRef } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import NewOsWizard from './NewOsWizard';
import { addPointsForOrder, loadClients, upsertClient } from '../../lib/clients';
import { formatMessageForStatus } from '../../lib/messages';
import { supabase } from '../../lib/supabaseClient';

export default function OrdensPage() {
  // runtime flag to avoid repeated failing requests when the `fluxo_caixa` table is missing
  const isFluxoAvailable = () => !((window as any).__fluxoCaixaMissing === true);
  const markFluxoMissing = () => { (window as any).__fluxoCaixaMissing = true; console.info('fluxo_caixa table missing — falling back to localStorage'); };
  const [selectedPeriod, setSelectedPeriod] = useState('mes');
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showAdvancePaymentModal, setShowAdvancePaymentModal] = useState(false);
  // backward-compatible aliases: some parts of the code use `showModal`/`setShowModal`
  const showModal = showNewOrderModal;
  const setShowModal = setShowNewOrderModal;
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [showPecasModal, setShowPecasModal] = useState(false);
  const [pecasSearch, setPecasSearch] = useState('');
  const [showCorModal, setShowCorModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showFidelizacaoModal, setShowFidelizacaoModal] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [showSavedSummary, setShowSavedSummary] = useState(false);
  const [showConfirmDeliverPrompt, setShowConfirmDeliverPrompt] = useState(false);
  const [showStatusMessageOptions, setShowStatusMessageOptions] = useState(false);
  const [showInlineServiceForm, setShowInlineServiceForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [clientFilter, setClientFilter] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [onlyLateFilter, setOnlyLateFilter] = useState(false);
  const [showStatusOnlyModal, setShowStatusOnlyModal] = useState(false);
  const [statusSelection, setStatusSelection] = useState('');
  const [statusChangeMessage, setStatusChangeMessage] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const ordersRef = useRef<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [availablePieces, setAvailablePieces] = useState<any[]>([]);
  // debug panel state (visible when URL contains ?debug=1)
  const [debugOpen, setDebugOpen] = useState<boolean>(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  // New Order form state
  const [newOrderClientId, setNewOrderClientId] = useState<string | null>(null);
  const [newOrderDate, setNewOrderDate] = useState<string>('');
  const [newOrderStatus, setNewOrderStatus] = useState<string>('Recebido');
  const [newOrderPaymentStatus, setNewOrderPaymentStatus] = useState<string | null>(null);
  const [newOrderObservacoes, setNewOrderObservacoes] = useState<string>('');
  const [orderServices, setOrderServices] = useState<any[]>([]);
  const [pieces, setPieces] = useState<any[]>([]);
  const [selectedPieceForService, setSelectedPieceForService] = useState<any>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<any>('');
  const [serviceValue, setServiceValue] = useState<string>('');
  const [serviceObservation, setServiceObservation] = useState<string>('');
  const [fidelizacaoMessage, setFidelizacaoMessage] = useState<string>('');
  const [clientePhone, setClientePhone] = useState<string>('');
  // pieces form helpers (declared here to avoid ReferenceErrors in the modal)
  const [pieceTipo, setPieceTipo] = useState<string>('');
  const [pieceCor, setPieceCor] = useState<string>('');
  const [pieceModelo, setPieceModelo] = useState<string>('');
  const [newServiceCategoryFilter, setNewServiceCategoryFilter] = useState<string>('');
  const [inlineServiceCategory, setInlineServiceCategory] = useState<string>('');
  const [inlineServiceName, setInlineServiceName] = useState<string>('');
  const [inlineServicePrice, setInlineServicePrice] = useState<string>('');
  const [quickClientName, setQuickClientName] = useState<string>('');
  const [quickClientPhone, setQuickClientPhone] = useState<string>('');
  const [orderMaterials, setOrderMaterials] = useState<any[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<any>('');
  const [materialQuantity, setMaterialQuantity] = useState<string>('1');
  const [materialPrice, setMaterialPrice] = useState<string>('');

  // edit modal state placeholders
  const [editClient, setEditClient] = useState<string>('');
  const [editCategory, setEditCategory] = useState<string>('');
  const [editServiceName, setEditServiceName] = useState<string>('');
  const [editValue, setEditValue] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('');
  const [editDateIn, setEditDateIn] = useState<string>('');
  const [editDateOut, setEditDateOut] = useState<string>('');
  const [editObservation, setEditObservation] = useState<string>('');
  const defaultSampleOrders: any[] = [];
  // small constants used by the piece/color pickers when DB lists are missing
  const COLORS = ['Preta','Branca','Azul','Vermelha','Verde','Amarela','Rosa','Bege','Cinza','Marrom'];
  const DEFAULT_PECAS = [
    { id: 'calca', nome: 'Calça', icone: '👖', categoria: 'calcas' },
    { id: 'camisa', nome: 'Camisa', icone: '👕', categoria: 'camisas' },
    { id: 'vestido', nome: 'Vestido', icone: '👗', categoria: 'vestidos' },
  ];

  // small utility for printing tickets during development
  const printTicket = (order: any) => {
    try {
      const w = window.open('', '_blank');
      if (!w) return;
      w.document.write('<pre>' + JSON.stringify(order, null, 2) + '</pre>');
      w.document.close();
    } catch (e) { console.info('printTicket error', e); }
  };
  useEffect(() => { ordersRef.current = orders; }, [orders]);
// helper: build a map of cashFlowDetails by order id/numero, ignoring locally deleted tombstones
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
    parsed.forEach((c: any) => {
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

  // helper: ensure local cashFlowDetails only contains entries for currently active orders
  const reconcileLocalCashForOrders = (activeOrders: any[]) => {
    try {
      const activeSet = new Set<string>();
      (activeOrders || []).forEach((o:any) => { if (o && (o.id || o.numero)) { if (o.id) activeSet.add(String(o.id)); if (o.numero) activeSet.add(String(o.numero)); } });
      const raw = localStorage.getItem('cashFlowDetails');
      const parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) {
        localStorage.setItem('cashFlowDetails', JSON.stringify([]));
        return;
      }
      if (activeSet.size === 0) {
        // no active orders -> clear local financial entries
        localStorage.setItem('cashFlowDetails', JSON.stringify([]));
        try { window.dispatchEvent(new CustomEvent('financeUpdated')); } catch(e){}
        return;
      }
      const filtered = (parsed || []).filter((c:any) => {
        try {
          const oid = c.orderId || c.orderid;
          const num = c.numero;
          if (oid && activeSet.has(String(oid))) return true;
          if (num && activeSet.has(String(num))) return true;
          return false;
        } catch (e) { return false; }
      });
      localStorage.setItem('cashFlowDetails', JSON.stringify(filtered));
      try { window.dispatchEvent(new CustomEvent('financeUpdated')); } catch(e){}
    } catch (e) { /* ignore */ }
  };

  // small helper to parse currency-ish strings into numbers
  const parseCurrency = (raw: any) => {
    try {
      if (raw === null || raw === undefined) return 0;
      if (typeof raw === 'number') return raw;
      const s = String(raw).replace(/[^0-9,.-]/g, '').replace(',', '.');
      const n = Number(s);
      return isNaN(n) ? 0 : n;
    } catch (e) { return 0; }
  };

  // normalize various status representations into the canonical display strings used by the app
  const normalizeStatus = (s: any) => {
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
    // fallback: Title Case the incoming string
    return String(s).split(/\s+/).map((w:any) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Load orders from Supabase on mount; fallback to localStorage or empty list
  useEffect(() => {
    let mounted = true;
    async function fetchOrders() {
      try {
        // attempt Supabase fetch first
        if (supabase && typeof supabase.from === 'function') {
          const res = await supabase.from('ordens').select('*');
          if (!(res as any).error && Array.isArray((res as any).data)) {
            let raw = (res as any).data as any[];

            // filter out locally deleted tombstones (by id or numero)
            try {
              const deletedRaw = localStorage.getItem('deletedOrders');
              const deletedList = deletedRaw ? JSON.parse(deletedRaw) : [];
              const deletedArr = Array.isArray(deletedList) ? deletedList.map((x:any) => String(x)) : [];

              // Build sets of server ids/numeros so we can clean tombstones that refer to real server rows
              const serverIdSet = new Set<string>(raw.map((r:any) => String(r.id)).filter(Boolean));
              const serverNumSet = new Set<string>(raw.map((r:any) => String(r.numero || '').replace(/\D/g,'')).filter(Boolean));

              // Remove tombstones that actually refer to server rows (prevent accidental suppression)
              const cleaned = deletedArr.filter((d: string) => {
                const dClean = String(d || '');
                if (serverIdSet.has(dClean)) return false;
                if (serverNumSet.has(dClean.replace(/\D/g,''))) return false;
                return true;
              });
              if (cleaned.length !== deletedArr.length) {
                const removed = deletedArr.filter(d => !cleaned.includes(d));
                try { localStorage.setItem('deletedOrders', JSON.stringify(cleaned)); } catch(e) {}
                try { console.info('Removed tombstones that match server rows:', removed); } catch(e){}
                try { setDebugInfo((prev:any) => ({ ...(prev||{}), removedTombstones: removed })); } catch(e){}
              }

              const deletedSet = new Set<string>(cleaned);
              if (deletedSet.size > 0) {
                raw = raw.filter((o:any) => !deletedSet.has(String(o.id)) && !deletedSet.has(String(o.numero)));
              }
            } catch (e) { /* ignore parsing tombstones */ }

            // enrich with clients and cash data
            let clientsMap: Record<string, any> = {};
            try {
              const clientsList = await loadClients();
              (clientsList || []).forEach((c:any) => { if (c && c.id) clientsMap[String(c.id)] = c; });
            } catch (e) { /* ignore client load failures */ }

            const cashMap = getCashMap();

            // map raw orders into display-friendly objects
            let data = raw.map((o: any) => {
              const client = o.cliente_id ? clientsMap[String(o.cliente_id)] : null;
              let parsedNotas: any = {};
              try { parsedNotas = o.notas ? (typeof o.notas === 'string' ? JSON.parse(o.notas) : o.notas) : {}; } catch (e) { parsedNotas = {}; }
              const pieces = parsedNotas.pieces || parsedNotas.pecas || [];
              const services = parsedNotas.services || parsedNotas.servicos || [];
              const servicesText = (services || []).flatMap((s:any) => [s.name || s.titulo || s.title || s.nome || String(s)]).join(', ').trim();
              const formatIsoToBR = (iso:any) => {
                try {
                  if (!iso) return '';
                  const s = String(iso);
                  // if already in dd/mm/yyyy form, return as-is
                  if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s)) return s;
                  // if ISO-like (YYYY-MM-DD) parse and format
                  if (/\d{4}-\d{2}-\d{2}/.test(s)) {
                    const d = new Date(s);
                    if (!isNaN(d.getTime())) return d.toLocaleDateString('pt-BR');
                  }
                  // fallback: try Date parsing
                  const d2 = new Date(s);
                  if (!isNaN(d2.getTime())) return d2.toLocaleDateString('pt-BR');
                  return s;
                } catch (e) { return String(iso||''); }
              };

              const cash = cashMap[String(o.id)] || cashMap[String(o.numero)] || null;
              const currentPaid = String(o.paymentStatus || '').toLowerCase() === 'pago';
              const cashPaid = !!(cash && String(cash.status || '').toLowerCase() === 'pago');
              const finalPaid = currentPaid || cashPaid;

              const rawValue = o.value ?? o.total ?? o.total_valor ?? (cash && (cash.value || cash.valor)) ?? null;
              const numericVal = Number(String(rawValue).replace(/[^0-9.-]/g, '').replace(',', '.')) || 0;
              const displayValue = numericVal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

              return {
                ...o,
                status: normalizeStatus(o.status),
                client: client?.nome || o.client || '',
                phone: client?.telefone || o.phone || '',
                client_foto: client?.foto || o.client_foto || null,
                pieces,
                services,
                service: servicesText || o.service || o.servico || '',
                dateOut: formatIsoToBR(o.data_entrega || o.dateOut || o.date_out || o.previsao) || o.dateOut || '',
                paymentStatus: finalPaid ? 'Pago' : (o.paymentStatus || null),
                value: displayValue,
              };
            });

            // merge local overrides (local edits should take precedence)
            try {
              const rawLocal = localStorage.getItem('orders');
              if (rawLocal) {
                const parsedLocal = JSON.parse(rawLocal);
                if (Array.isArray(parsedLocal)) {
                  // ignore locally deleted orders when merging
                  const parsedLocalFiltered = parsedLocal.filter((lo:any) => !(deletedSet && (deletedSet.has(String(lo.id)) || deletedSet.has(String(lo.numero)))));
                  const localMap: Record<string, any> = {};
                  parsedLocalFiltered.forEach((lo: any) => { if (lo && lo.id) localMap[String(lo.id)] = lo; });
                  const formatLocalValue = (v:any, serverVal:any) => {
                    try {
                      if (v === undefined || v === null) return serverVal || '';
                      const s = String(v).trim();
                      if (!s) return serverVal || '';
                      // if already contains currency symbol or decimal separators, keep formatted
                      if (/R\$|\$|BRL|,\d{2}/i.test(s)) return s;
                      // numeric fallback
                      const n = Number(s.replace(/[^0-9.-]/g, '').replace(',', '.'));
                      if (!isNaN(n)) return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                      return s;
                    } catch (e) { return serverVal || ''; }
                  };

                  data = data.map((o: any) => {
                    const local = localMap[String(o.id)] || {};
                    const serverService = o.service || '';
                    const serverDateOut = o.dateOut || '';
                    const serverValue = o.value || '';
                    const chosenService = (local.service && String(local.service).trim()) ? local.service : serverService;
                    const chosenDateOut = (local.dateOut && String(local.dateOut).trim()) ? local.dateOut : serverDateOut;
                    const chosenValue = formatLocalValue(local.value !== undefined ? local.value : serverValue, serverValue);
                    return {
                      ...o,
                      paymentStatus: (local.paymentStatus !== undefined ? local.paymentStatus : o.paymentStatus),
                      status: (local.status !== undefined ? normalizeStatus(local.status) : o.status),
                      sentMessages: (local.sentMessages !== undefined ? local.sentMessages : o.sentMessages),
                      service: chosenService,
                      dateOut: chosenDateOut,
                      value: chosenValue,
                    };
                  });
                }
              }
            } catch (e) { /* ignore local merge errors */ }

            if (mounted) {
              try { reconcileLocalCashForOrders(data); } catch (e) {}
              setOrders(data);
              try {
                // clean up localStorage orders so they strictly reflect server state
                // Keep only rows that exist on the server (by id or numero). This removes local temp/unsynced duplicates.
                try {
                  const rawLocal = localStorage.getItem('orders');
                  const parsedLocal = rawLocal ? JSON.parse(rawLocal) : [];
                  if (Array.isArray(parsedLocal)) {
                    const serverIds = new Set<string>(data.map((x:any) => String(x.id)).filter(Boolean));
                    const serverNumeros = new Set<string>(data.map((x:any) => String(x.numero || '').replace(/\D/g,'')).filter(n=>n));
                    const removed: string[] = [];
                    const filteredLocal = parsedLocal.filter((lo:any) => {
                      try {
                        if (!lo) return false;
                        const loId = String(lo.id || '');
                        const loNum = String(lo.numero || '').replace(/\D/g,'');
                        const keep = (loId && serverIds.has(loId)) || (loNum && serverNumeros.has(loNum));
                        if (!keep) removed.push(loId || lo.numero || String(lo));
                        return keep;
                      } catch (ee) { return false; }
                    });
                    // persist filtered list (server-canonical) — force overwrite
                    try { localStorage.setItem('orders', JSON.stringify({ __force: true, payload: filteredLocal })); } catch(e){}

                    // write tombstones for removed local ids/numeros so they won't resurface
                    try {
                      const rawDeleted = localStorage.getItem('deletedOrders');
                      const deletedList = rawDeleted ? JSON.parse(rawDeleted) : [];
                      const set = new Set(Array.isArray(deletedList) ? deletedList.map((x:any)=>String(x)) : []);
                      removed.forEach(r => { if (r) set.add(String(r)); });
                      localStorage.setItem('deletedOrders', JSON.stringify(Array.from(set)));
                    } catch (ee) { /* ignore tombstone write errors */ }

                    // also remove any cashFlowDetails that are not associated with server orders
                    try {
                      const rawC = localStorage.getItem('cashFlowDetails');
                      const parsedC = rawC ? JSON.parse(rawC) : [];
                      const filteredC = (parsedC || []).filter((c:any) => {
                        try {
                          const oid = String(c.orderId || c.orderid || '');
                          const num = String(c.numero || '').replace(/\D/g,'');
                          if (oid && serverIds.has(oid)) return true;
                          if (num && serverNumeros.has(num)) return true;
                          return false;
                        } catch (e) { return false; }
                      });
                      localStorage.setItem('cashFlowDetails', JSON.stringify(filteredC));
                      try { window.dispatchEvent(new CustomEvent('financeUpdated')); } catch(e){}
                    } catch (ee) { /* ignore cash cleanup errors */ }
                  }
                } catch (e) { /* ignore cleanup parsing errors */ }
              } catch (e) { /* ignore cleanup errors */ }
            }
            return;
          } else {
            console.warn('Supabase fetch ordens error', (res as any).error);
          }
        }
      } catch (e) {
        console.warn('fetchOrders error', e);
      }

      // fallback to localStorage-only when Supabase unavailable or on error
      try {
        const raw = localStorage.getItem('orders');
        if (raw) {
          let parsed = JSON.parse(raw);
          // filter out deleted tombstones from local fallback as well
          try {
            const deletedRaw = localStorage.getItem('deletedOrders');
            const deletedList = deletedRaw ? JSON.parse(deletedRaw) : [];
            const deletedSetLocal = new Set(Array.isArray(deletedList) ? deletedList.map((x:any) => String(x)) : []);
            if (Array.isArray(parsed) && deletedSetLocal.size > 0) {
              parsed = parsed.filter((o:any) => !deletedSetLocal.has(String(o.id)) && !deletedSetLocal.has(String(o.numero)));
            }
          } catch (ee) { /* ignore */ }
          if (Array.isArray(parsed) && mounted) {
            try {
              const cashMap = getCashMap();
              const merged = parsed.map((o: any) => {
                const cash = (cashMap[String(o.id)] || cashMap[String(o.numero)]) || {};
                const amount = (cash && (cash.value || cash.valor)) ? Number(cash.value || cash.valor) : 0;
                const displayValue = o.value && String(o.value).trim() !== '' ? String(o.value) : `R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                try {
                  const currentPaid = String(o.paymentStatus || '').toLowerCase() === 'pago';
                  const cashPaid = !!(cash && String(cash.status || '').toLowerCase() === 'pago');
                  const finalPaid = currentPaid || cashPaid;
                  return { ...o, status: normalizeStatus(o.status), paymentStatus: finalPaid ? 'Pago' : (o.paymentStatus || null), value: displayValue };
                } catch (_inner) { return { ...o, status: normalizeStatus(o.status), paymentStatus: (o.paymentStatus || null), value: displayValue }; }
              });
              if (mounted) {
                try { reconcileLocalCashForOrders(merged); } catch (e) {}
                setOrders(merged);
              }
              return;
            } catch (ee) { if (mounted) setOrders(parsed.map((o: any) => ({ ...o, status: normalizeStatus(o.status) }))); return; }
          }
        }
      } catch (e) { console.warn('localStorage parse orders failed', e); }

      if (mounted) { try { reconcileLocalCashForOrders(defaultSampleOrders); } catch(e){}; setOrders(defaultSampleOrders); }
    }
    fetchOrders();
    return () => { mounted = false; };
  }, []);

  // helper to fetch server/local/tombstone status for debug UI
  const fetchDebugInfo = async () => {
    try {
      const localRaw = localStorage.getItem('orders') || '[]';
      const local = JSON.parse(localRaw || '[]');
      const deletedRaw = localStorage.getItem('deletedOrders') || '[]';
      const deleted = JSON.parse(deletedRaw || '[]');
      let server: any[] = [];
      try {
        if (supabase && typeof supabase.from === 'function') {
          const res = await supabase.from('ordens').select('*');
          if (!(res as any).error && Array.isArray((res as any).data)) server = (res as any).data;
        }
      } catch (e) { /* ignore */ }
      setDebugInfo({ serverCount: server.length, serverSample: server.slice(0,6), localCount: (Array.isArray(local)?local.length:0), localSample: (Array.isArray(local)?local.slice(0,6):[]), deleted: Array.isArray(deleted)?deleted:[] });
    } catch (e) { setDebugInfo({ error: String(e) }); }
  };

  // allow other parts of the app to request a server refresh of orders
  useEffect(() => {
    const handler = async (e?: Event) => {
      try {
        if (!(supabase && typeof supabase.from === 'function')) return;
        const res = await supabase.from('ordens').select('*');
        if ((res as any).error) return;
        let raw = (res as any).data || [];

        // filter out locally deleted tombstones (by id or numero)
        try {
          const deletedRaw = localStorage.getItem('deletedOrders');
          const deletedList = deletedRaw ? JSON.parse(deletedRaw) : [];
          const deletedArr = Array.isArray(deletedList) ? deletedList.map((x:any) => String(x)) : [];

          // Build sets of server ids/numeros so we can clean tombstones that refer to real server rows
          const serverIdSet = new Set<string>(raw.map((r:any) => String(r.id)).filter(Boolean));
          const serverNumSet = new Set<string>(raw.map((r:any) => String(r.numero || '').replace(/\D/g,'')).filter(Boolean));

          // Remove tombstones that actually refer to server rows (prevent accidental suppression)
          const cleaned = deletedArr.filter((d: string) => {
            const dClean = String(d || '');
            if (serverIdSet.has(dClean)) return false;
            if (serverNumSet.has(dClean.replace(/\D/g,''))) return false;
            return true;
          });
          if (cleaned.length !== deletedArr.length) {
            const removed = deletedArr.filter(d => !cleaned.includes(d));
            try { localStorage.setItem('deletedOrders', JSON.stringify(cleaned)); } catch(e) {}
            try { console.info('Removed tombstones that match server rows:', removed); } catch(e){}
            try { setDebugInfo((prev:any) => ({ ...(prev||{}), removedTombstones: removed })); } catch(e){}
          }

          const deletedSet = new Set<string>(cleaned);
          if (deletedSet.size > 0) {
            raw = raw.filter((o:any) => !deletedSet.has(String(o.id)) && !deletedSet.has(String(o.numero)));
          }
        } catch (e) { /* ignore */ }

        // persist server-canonical orders to localStorage and notify
        try { localStorage.setItem('orders', JSON.stringify({ __force: true, payload: raw })); } catch(e){}
        try { window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch(e){}
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
          const raw = localStorage.getItem('orders') || '[]';
          const arr = JSON.parse(raw || '[]');
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
      const raw = localStorage.getItem('orders') || '[]';
      const arr = JSON.parse(raw || '[]');
      const serverNum = String(server.numero || '').replace(/\D/g,'');
      const idx = arr.findIndex((o:any) => String(o.id) === String(server.id) || String(o.numero || '').replace(/\D/g,'') === serverNum);
      const existing = idx >= 0 ? arr[idx] : {};
      // determine numeric value from server or existing cash
      const valCandidate = server.value ?? server.total ?? existing.value ?? existing.total ?? 0;
      const valNum = Number(String(valCandidate).replace(/[^0-9.-]/g,'').replace(',', '.')) || 0;
      const merged = { ...existing, ...server, _local: false, _unsynced: false, value: valNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) };
      if (idx >= 0) arr[idx] = merged; else arr.unshift(merged);
      localStorage.setItem('orders', JSON.stringify({ __force: true, payload: arr }));
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
        const raw = localStorage.getItem('orders');
        if (!raw) return;
        const parsedLocal = JSON.parse(raw || '[]');
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
          try { localStorage.setItem('orders', JSON.stringify({ __force: true, payload: filtered })); } catch (e) {}
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
    try { localStorage.setItem('orders', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}
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
        // Only attempt server deletion for IDs that look like server-generated (numeric or UUID).
        if (supabase && typeof supabase.from === 'function' && idToDelete && !isLocalId(idToDelete) && (isNumeric(idToDelete) || isUuid(idToDelete))) {
          const res = await supabase.from('ordens').delete().eq('id', idToDelete);
          if ((res as any).error) throw (res as any).error;
          // if deleted on server, also remove any tombstone locally for id/numero
          try {
            const raw = localStorage.getItem('deletedOrders');
            const list = raw ? JSON.parse(raw) : [];
            const filtered = (list || []).filter((x:any) => String(x) !== String(idToDelete) && String(x) !== String(numeroToDelete));
            localStorage.setItem('deletedOrders', JSON.stringify(filtered));
          } catch (e) {}
          // tentar remover lançamentos financeiros relacionados (por orderId e por numero)
          try {
            // primeiro por orderid (PostgREST uses lowercased column names)
            if (isFluxoAvailable() && supabase && typeof supabase.from === 'function') {
              const del1 = await supabase.from('fluxo_caixa').delete().eq('orderid', idToDelete);
              if (del1 && (del1 as any).error && (del1 as any).error.code === 'PGRST205') { markFluxoMissing(); }
              // depois por numero (se tivermos um numero legível)
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
    
    setFidelizacaoMessage(`Olá ${selectedOrder.client}! 🎉\n\n*Cleusa Ateliê de Costura*\n\nSua peça já está pronta e pode ser retirada!\n\nServiço: ${selectedOrder.service}\nValor: ${selectedOrder.value}${paymentInfo}`);
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
      const notasPieces = order.pieces || order.pecas || [];
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

    const newOrder = {
      id: savedId || `OS-${1242 + orders.length}`,
      numero: displayNumber,
      client: clientName,
      phone: clientPhone,
      client_foto: clientFoto,
      category: orderServices[0].category,
      service: servicesText,
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
    setFidelizacaoMessage(`Olá ${newOrder.client}! 😊\n\n*Cleusa Ateliê de Costura*\n\nSua ordem foi registrada com sucesso!\n\nServiço: ${servicesText}\nPrazo de entrega: ${newOrder.dateOut}\nValor: R$ ${totalValue.toFixed(2)}\n\nObrigada pela confiança! ✨`);
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
      // Se não foi pago, pergunta sobre o pagamento
      setSelectedOrder(order);
      setShowPaymentModal(true);
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

  const applyQuickStatus = (order: any, newStatus: string) => {
    // If marking as Retirado, handle payment confirmation and marking
      if (newStatus === 'Retirado') {
      if (order.paymentStatus === 'Pago') {
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

      // open an explicit confirm modal; if user confirms we'll open the payment modal
      setSelectedOrder(order);
      setShowConfirmDeliverPrompt(true);
      return;
    }

    const updatedOrder = { ...order, status: newStatus };
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
    setSelectedOrder(updatedOrder);
    setStatusChangeMessage(composeStatusMessage(updatedOrder, newStatus));
    setShowStatusMessageOptions(true);
    setShowStatusOnlyModal(true);
  };

  const togglePaymentStatus = async (order: any) => {
    const newStatus = order.paymentStatus === 'Pago' ? null : 'Pago';
    // optimistic UI
    const next = orders.map(o => o.id === order.id ? { ...o, paymentStatus: newStatus } : o);
    setOrders(next);
    try { localStorage.setItem('orders', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}

    // persist order payment status to Supabase (best-effort)
    // Do not update `ordens` table with `paymentStatus` (column may not exist).
    // Payment is persisted in `fluxo_caixa` above; financeiro merges that back into orders.

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
      } else {
        // remove entradas relacionadas no fluxo_caixa (server then local)
        try {
          if (isFluxoAvailable() && supabase && typeof supabase.from === 'function') {
            const del1 = await supabase.from('fluxo_caixa').delete().eq('orderid', orderId);
            if (del1 && (del1 as any).error && (del1 as any).error.code === 'PGRST205') { markFluxoMissing(); throw (del1 as any).error; }
            if (numero) {
              const del2 = await supabase.from('fluxo_caixa').delete().eq('numero', numero);
              if (del2 && (del2 as any).error && (del2 as any).error.code === 'PGRST205') { markFluxoMissing(); throw (del2 as any).error; }
            }
            window.dispatchEvent(new CustomEvent('financeUpdated'));
          } else {
            throw new Error('no-supabase-or-fluxo-missing');
          }
        } catch (e) {
          try {
            const raw = localStorage.getItem('cashFlowDetails');
            const parsed = raw ? JSON.parse(raw) : [];
            const filtered = (parsed || []).filter((c:any) => String(c.orderId || c.orderid) !== String(orderId) && !(numero && String(c.numero || '') === String(numero)));
            localStorage.setItem('cashFlowDetails', JSON.stringify(filtered));
            window.dispatchEvent(new CustomEvent('financeUpdated'));
          } catch (ee) { console.warn('failed to remove local cash entries on unpaid', ee); }
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
    try {
      localStorage.setItem('orders', JSON.stringify(orders));
      // `localStorage.setItem` is wrapped in `src/main.tsx` which already
      // dispatches the `ordersUpdated` event. Do not re-dispatch here to
      // avoid update loops between components.
    } catch (e) {}
  }, [orders]);

  // Listen for external ordersUpdated events (e.g., from Financeiro) and reload local orders
  useEffect(() => {
    const onOrdersUpdated = () => {
      try {
        const raw = localStorage.getItem('orders');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            try {
              const cashMap = getCashMap();
              const normalized = parsed.map((o:any) => {
                const cash = cashMap[String(o.id)] || cashMap[String(o.numero)];
                try {
                  const currentPaid = String(o.paymentStatus || '').toLowerCase() === 'pago';
                  const cashPaid = !!(cash && String(cash.status || '').toLowerCase() === 'pago');
                  const finalPaid = currentPaid || cashPaid;
                  return {
                    ...o,
                    status: normalizeStatus(o.status),
                    paymentStatus: finalPaid ? 'Pago' : (o.paymentStatus || null),
                    value: o.value || (cash ? `R$ ${Number(cash.value || cash.valor || 0).toFixed(2)}` : o.value)
                  };
                } catch (_inner) { return { ...o, status: normalizeStatus(o.status), paymentStatus: (o.paymentStatus || null), value: o.value }; }
              });
              const currJson = JSON.stringify(ordersRef.current || []);
              const newJson = JSON.stringify(normalized || []);
              if (currJson !== newJson) setOrders(normalized);
            } catch (ee) {
              try { const normalized = parsed.map((o:any) => ({ ...o, status: normalizeStatus(o.status) })); setOrders(normalized); } catch(_){ }
            }
          }
        }
      } catch (e) { }
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
              <div className="mb-2" />
              {/* Debug button removed in production */}

              {/* Debug panel (visible when ?debug=1 is present in URL) */}
              {typeof window !== 'undefined' && window.location.search.includes('debug') && (
                <div className="p-3 bg-yellow-50 rounded-lg mb-4 border border-yellow-200">
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => { fetchDebugInfo(); setDebugOpen(true); }} className="px-3 py-1 bg-yellow-400 text-white rounded">Fetch Server/Local</button>
                    <button onClick={() => { window.dispatchEvent(new CustomEvent('refetchOrdersFromServer')); setTimeout(fetchDebugInfo, 800); }} className="px-3 py-1 bg-amber-500 text-white rounded">Force Refetch</button>
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
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${statusOptions.find(s=>s.id===order.status)?.color || 'bg-gray-100 text-gray-800'}`}>{order.status}</span>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 break-words">{orderRef(order)} · {serviceDisplayFor(order)}</div>
                        <div className="text-xs text-gray-600 mt-1">Prazo: {order.dateOut || '—'}</div>
                      </div>
                      <div className="text-right ml-3">
                                <div onClick={() => togglePaymentStatus(order)} className="font-bold text-sm text-green-600 truncate cursor-pointer">{order.value}</div>
                                <div className="text-xs mt-1">
                                  <button onClick={() => togglePaymentStatus(order)} className="text-[12px] px-2 py-1 rounded inline-flex items-center justify-center " title="Marcar pagamento">
                                    {order.paymentStatus === 'Pago' ? 'Pago' : 'Não Pago'}
                                  </button>
                                </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => applyQuickStatus(order, 'Em costura')} title="Iniciar" className="w-8 h-8 flex items-center justify-center text-white bg-blue-600 rounded"><i className="ri-play-line"></i></button>
                      <button onClick={() => applyQuickStatus(order, 'Pronto')} title="Finalizar" className="w-8 h-8 flex items-center justify-center text-white bg-green-600 rounded"><i className="ri-check-line"></i></button>
                      <button onClick={() => applyQuickStatus(order, 'Retirado')} title="Retirado" className="w-8 h-8 flex items-center justify-center text-white bg-purple-600 rounded"><i className="ri-hand-heart-line"></i></button>

                      <button onClick={() => printTicket(order)} title="Imprimir" className="w-8 h-8 flex items-center justify-center text-gray-700 bg-gray-50 rounded"><i className="ri-printer-line"></i></button>

                      <div className="flex-1" />

                      <button onClick={() => handleEdit(order)} title="Editar" className="w-8 h-8 flex items-center justify-center text-rose-600 bg-rose-50 rounded"><i className="ri-edit-line"></i></button>
                      <button onClick={() => handleDelete(order)} title="Excluir" className="w-8 h-8 flex items-center justify-center text-red-600 bg-red-50 rounded"><i className="ri-delete-bin-line"></i></button>
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
                            <div className="text-xs text-gray-500">{orderRef(order)}</div>
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
                            <div onClick={() => togglePaymentStatus(order)} className="font-bold text-green-600 cursor-pointer">{order.value}</div>
                              <div className="text-xs mt-1 flex items-center justify-center gap-2">
                                <button onClick={() => togglePaymentStatus(order)} className={"inline-flex items-center gap-1 text-sm px-2 py-1 rounded " + (order.paymentStatus === 'Pago' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600') }>
                                  <i className="ri-money-dollar-circle-line"></i>
                                  {order.paymentStatus === 'Pago' ? 'Pago' : 'Não Pago'}
                                </button>
                              </div>
                          </td>
                          <td className="px-3 py-3 align-top text-sm text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div className="flex items-center gap-2">
                                {order.status !== 'Em costura' && order.status !== 'Pronto' && order.status !== 'Retirado' && (
                                  <button onClick={() => applyQuickStatus(order, 'Em costura')} title="Iniciar" className="w-8 h-8 flex items-center justify-center text-white bg-blue-600 rounded">
                                    <i className="ri-play-line"></i>
                                  </button>
                                )}

                                {order.status !== 'Pronto' && order.status !== 'Retirado' && (
                                  <button onClick={() => applyQuickStatus(order, 'Pronto')} title="Finalizar" className="w-8 h-8 flex items-center justify-center text-white bg-green-600 rounded">
                                    <i className="ri-check-line"></i>
                                  </button>
                                )}

                                {order.status === 'Pronto' && order.status !== 'Retirado' && (
                                  <button onClick={() => applyQuickStatus(order, 'Retirado')} title="Marcar Retirado" className="w-8 h-8 flex items-center justify-center text-white bg-purple-600 rounded">
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
                                          <button onClick={() => { setShowConfirmDeliverPrompt(false); setShowPaymentModal(true); }} className="px-4 py-2 bg-green-600 text-white rounded">Sim</button>
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
                try { return String(n || '').replace(/\D/g, ''); } catch (e) { return String(n || ''); }
              };
              // reload canonical orders from localStorage (NewOsWizard already persisted there)
              const raw = localStorage.getItem('orders');
              const parsed = raw ? JSON.parse(raw) : [];
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
