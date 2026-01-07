import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { loadClients, upsertClient } from '../../lib/clients';

type Piece = {
  id: string;
  tipo: string;
  cor?: string;
  modelo?: string;
  services: Array<{ id?: string; name: string; price: number }>
  icone?: string;
}

export default function NewOsWizard({ onClose, onCreated } : { onClose: ()=>void, onCreated?: (order:any)=>void }) {
  const [step, setStep] = useState(1);
  const [clients, setClients] = useState<any[]>([]);
  const [searchClient, setSearchClient] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');

  const [priority, setPriority] = useState<'Normal'|'Urgente'>('Normal');
  const [dateIn, setDateIn] = useState(() => new Date().toISOString().slice(0,10));
  const [dateOut, setDateOut] = useState('');

  const [pieces, setPieces] = useState<Piece[]>([]);
  const [currentPieceTipo, setCurrentPieceTipo] = useState('');
  const [currentPieceCor, setCurrentPieceCor] = useState('');
  const [currentPieceModelo, setCurrentPieceModelo] = useState('');
  const [selectedPieceForService, setSelectedPieceForService] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [servicesList, setServicesList] = useState<any[]>([]);
  const [serviceSearch, setServiceSearch] = useState('');
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState<number | ''>('');
  const [editingAddedService, setEditingAddedService] = useState<{ pieceId: string; idx: number; price: number | '' } | null>(null);
  const [showPostConfirm, setShowPostConfirm] = useState(false);
  const [postConfirmSentMessage, setPostConfirmSentMessage] = useState(false);
  const [lastCreatedOrder, setLastCreatedOrder] = useState<any | null>(null);
  const [showServiceAddedToast, setShowServiceAddedToast] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const formatDate = (d?: string | null) => {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('pt-BR'); } catch (e) { return d; }
  }

  const PREDEFINED_PECAS: Array<{ nome: string; categoria: string; icone: string }> = [
    { nome: 'Camiseta', categoria: 'ROUPAS SUPERIORES', icone: '👕' },
    { nome: 'Camisa social', categoria: 'ROUPAS SUPERIORES', icone: '👔' },
    { nome: 'Camisa polo', categoria: 'ROUPAS SUPERIORES', icone: '👕' },
    { nome: 'Blusa', categoria: 'ROUPAS SUPERIORES', icone: '👕' },
    { nome: 'Cropped', categoria: 'ROUPAS SUPERIORES', icone: '👕' },
    { nome: 'Regata', categoria: 'ROUPAS SUPERIORES', icone: '👕' },
    { nome: 'Bata', categoria: 'ROUPAS SUPERIORES', icone: '👕' },
    { nome: 'Top', categoria: 'ROUPAS SUPERIORES', icone: '👕' },
    { nome: 'Moletom', categoria: 'ROUPAS SUPERIORES', icone: '👕' },
    { nome: 'Casaco', categoria: 'ROUPAS SUPERIORES', icone: '🧥' },
    { nome: 'Jaqueta', categoria: 'ROUPAS SUPERIORES', icone: '🧥' },
    { nome: 'Blazer', categoria: 'ROUPAS SUPERIORES', icone: '🧥' },
    { nome: 'Colete', categoria: 'ROUPAS SUPERIORES', icone: '🧥' },
    { nome: 'Calça jeans', categoria: 'ROUPAS INFERIORES', icone: '👖' },
    { nome: 'Calça social', categoria: 'ROUPAS INFERIORES', icone: '👖' },
    { nome: 'Calça de alfaiataria', categoria: 'ROUPAS INFERIORES', icone: '👖' },
    { nome: 'Calça legging', categoria: 'ROUPAS INFERIORES', icone: '👖' },
    { nome: 'Calça moletom', categoria: 'ROUPAS INFERIORES', icone: '👖' },
    { nome: 'Bermuda', categoria: 'ROUPAS INFERIORES', icone: '🩳' },
    { nome: 'Short', categoria: 'ROUPAS INFERIORES', icone: '🩳' },
    { nome: 'Saia curta', categoria: 'ROUPAS INFERIORES', icone: '👗' },
    { nome: 'Saia média', categoria: 'ROUPAS INFERIORES', icone: '👗' },
    { nome: 'Saia longa', categoria: 'ROUPAS INFERIORES', icone: '👗' },
    { nome: 'Vestido curto', categoria: 'VESTIDOS E PEÇAS ÚNICAS', icone: '👗' },
    { nome: 'Vestido médio', categoria: 'VESTIDOS E PEÇAS ÚNICAS', icone: '👗' },
    { nome: 'Vestido longo', categoria: 'VESTIDOS E PEÇAS ÚNICAS', icone: '👗' },
    { nome: 'Vestido de festa', categoria: 'VESTIDOS E PEÇAS ÚNICAS', icone: '👗' },
    { nome: 'Vestido social', categoria: 'VESTIDOS E PEÇAS ÚNICAS', icone: '👗' },
    { nome: 'Macacão', categoria: 'VESTIDOS E PEÇAS ÚNICAS', icone: '👗' },
    { nome: 'Macaquinho', categoria: 'VESTIDOS E PEÇAS ÚNICAS', icone: '👗' },
    { nome: 'Jardineira', categoria: 'VESTIDOS E PEÇAS ÚNICAS', icone: '👗' },
    { nome: 'Casaco pesado', categoria: 'ROUPAS DE FRIO / EXTERNAS', icone: '🧥' },
    { nome: 'Sobretudo', categoria: 'ROUPAS DE FRIO / EXTERNAS', icone: '🧥' },
    { nome: 'Jaqueta jeans', categoria: 'ROUPAS DE FRIO / EXTERNAS', icone: '🧥' },
    { nome: 'Jaqueta de couro', categoria: 'ROUPAS DE FRIO / EXTERNAS', icone: '🧥' },
    { nome: 'Parka', categoria: 'ROUPAS DE FRIO / EXTERNAS', icone: '🧥' },
    { nome: 'Capa', categoria: 'ROUPAS DE FRIO / EXTERNAS', icone: '🧥' },
    { nome: 'Lingerie', categoria: 'ROUPAS ÍNTIMAS / LEVES', icone: '🩲' },
    { nome: 'Sutiã', categoria: 'ROUPAS ÍNTIMAS / LEVES', icone: '🩲' },
    { nome: 'Calcinha', categoria: 'ROUPAS ÍNTIMAS / LEVES', icone: '🩲' },
    { nome: 'Cueca', categoria: 'ROUPAS ÍNTIMAS / LEVES', icone: '🩲' },
    { nome: 'Pijama', categoria: 'ROUPAS ÍNTIMAS / LEVES', icone: '🛌' },
    { nome: 'Camisola', categoria: 'ROUPAS ÍNTIMAS / LEVES', icone: '🛌' },
    { nome: 'Baby doll', categoria: 'ROUPAS ÍNTIMAS / LEVES', icone: '🛌' },
    { nome: 'Body infantil', categoria: 'ROUPAS INFANTIS', icone: '👶' },
    { nome: 'Conjunto infantil', categoria: 'ROUPAS INFANTIS', icone: '👶' },
    { nome: 'Camiseta infantil', categoria: 'ROUPAS INFANTIS', icone: '👶' },
    { nome: 'Calça infantil', categoria: 'ROUPAS INFANTIS', icone: '👶' },
    { nome: 'Vestido infantil', categoria: 'ROUPAS INFANTIS', icone: '👶' },
    { nome: 'Short infantil', categoria: 'ROUPAS INFANTIS', icone: '👶' },
    { nome: 'Uniforme escolar', categoria: 'ROUPAS ESPECIAIS', icone: '🎓' },
    { nome: 'Uniforme profissional', categoria: 'ROUPAS ESPECIAIS', icone: '🎓' },
    { nome: 'Roupa hospitalar', categoria: 'ROUPAS ESPECIAIS', icone: '🎓' },
    { nome: 'Jaleco', categoria: 'ROUPAS ESPECIAIS', icone: '🎓' },
    { nome: 'Avental', categoria: 'ROUPAS ESPECIAIS', icone: '🎓' },
    { nome: 'Roupa esportiva', categoria: 'ROUPAS ESPECIAIS', icone: '🏃' },
    { nome: 'Roupa de academia', categoria: 'ROUPAS ESPECIAIS', icone: '🏃' },
    { nome: 'Barra de cortina', categoria: 'ACESSÓRIOS EM TECIDO', icone: '🧵' },
    { nome: 'Cortina', categoria: 'ACESSÓRIOS EM TECIDO', icone: '🧵' },
    { nome: 'Capa de almofada', categoria: 'ACESSÓRIOS EM TECIDO', icone: '🧵' },
    { nome: 'Fronha', categoria: 'ACESSÓRIOS EM TECIDO', icone: '🧵' },
    { nome: 'Lençol', categoria: 'ACESSÓRIOS EM TECIDO', icone: '🛏️' },
    { nome: 'Colcha', categoria: 'ACESSÓRIOS EM TECIDO', icone: '🛏️' },
    { nome: 'Toalha', categoria: 'ACESSÓRIOS EM TECIDO', icone: '🧺' },
    { nome: 'Guardanapo de tecido', categoria: 'ACESSÓRIOS EM TECIDO', icone: '🍽️' }
  ];
  const COLORS = ['Preto', 'Branco', 'Cinza', 'Azul', 'Vermelho', 'Verde', 'Amarelo', 'Rosa', 'Bege', 'Marrom', 'Vinho', 'Roxo', 'Laranja'];
  const COLOR_MAP: Record<string,string> = {
    Preto: '#000000',
    Branco: '#ffffff',
    Cinza: '#9CA3AF',
    Azul: '#3B82F6',
    Vermelho: '#EF4444',
    Verde: '#10B981',
    Amarelo: '#F59E0B',
    Rosa: '#EC4899',
    Bege: '#F5DEB3',
    Marrom: '#8B4513',
    Vinho: '#7F1D1D',
    Roxo: '#7C3AED',
    Laranja: '#FB923C'
  };

  const [paymentStatus, setPaymentStatus] = useState<'Pago'|'Não pago'>('Não pago');
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [showAddAnotherModal, setShowAddAnotherModal] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let list = [];
        try { list = await loadClients(); } catch(e) { list = []; console.warn('loadClients failed in wizard', e); }
        // if Supabase env is configured, prefer what the server returned (even if empty)
        const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
        // if we have no list and either Supabase is not configured OR we're offline, try local storage
        if ((!list || list.length === 0) && (!supabaseConfigured || !isOnline)) {
          try { const raw = localStorage.getItem('clientes'); if (raw) list = JSON.parse(raw); } catch(e) { /* ignore */ }
        }
        const sorted = (list || []).slice().sort((a:any,b:any) => String((a.nome||a.name||'')).localeCompare(String(b.nome||b.name||''), 'pt-BR', { sensitivity: 'base' }));
        // Only seed sample clients when Supabase is NOT configured and we have no local data
        if ((!sorted || sorted.length === 0) && !supabaseConfigured) {
          const sampleClients = [
            { id: `local-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, nome: 'Maria Silva', telefone: '11988887777' },
            { id: `local-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, nome: 'João Pereira', telefone: '11977776666' }
          ];
          try { localStorage.setItem('clientes', JSON.stringify(sampleClients)); } catch (e) {}
          setClients(sampleClients);
          try { window.dispatchEvent(new CustomEvent('clientsUpdated')); } catch (e) {}
        } else {
          setClients(sorted);
        }
      } catch (e) {
        try {
          const raw = localStorage.getItem('clientes');
          const parsed = raw ? JSON.parse(raw) : [];
          setClients((parsed || []).slice().sort((a:any,b:any) => String((a.nome||a.name||'')).localeCompare(String(b.nome||b.name||''), 'pt-BR', { sensitivity: 'base' })));
        } catch (_) { setClients([]); }
      }
      // services
      try {
        const raw = localStorage.getItem('services');
        if (raw) setServicesList(JSON.parse(raw));
        else {
          const res = await supabase.from('servicos').select('*');
          if (!(res as any).error && Array.isArray((res as any).data) && (res as any).data.length > 0) setServicesList((res as any).data || []);
          else {
            // seed sample services if none available
            const sampleServices = [ { id: `s-${Date.now()}-1`, titulo: 'Bainha', preco: 35 }, { id: `s-${Date.now()}-2`, titulo: 'Ajuste de cintura', preco: 50 } ];
            try { localStorage.setItem('services', JSON.stringify(sampleServices)); } catch (e) {}
            setServicesList(sampleServices);
          }
        }
      } catch (_) {}
    })();
    const onClientsUpdated = () => {
      try {
        const raw = localStorage.getItem('clientes');
        const parsed = raw ? JSON.parse(raw) : [];
        setClients((parsed || []).slice().sort((a:any,b:any) => String((a.nome||a.name||'')).localeCompare(String(b.nome||b.name||''), 'pt-BR', { sensitivity: 'base' })));
      } catch (e) { }
    };
    const onServicesUpdated = () => {
      try {
        const raw = localStorage.getItem('services');
        if (raw) setServicesList(JSON.parse(raw));
      } catch (e) {}
    };
    window.addEventListener('clientsUpdated', onClientsUpdated as EventListener);
    window.addEventListener('servicesUpdated', onServicesUpdated as EventListener);
    return () => { window.removeEventListener('clientsUpdated', onClientsUpdated as EventListener); window.removeEventListener('servicesUpdated', onServicesUpdated as EventListener); };
  }, []);

  useEffect(() => {
    (async () => {
      let serverList: any[] = [];
      try { serverList = await loadClients(); } catch (e) { serverList = []; console.warn('loadClients failed in wizard', e); }
      const supabaseConfigured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (Array.isArray(serverList) && serverList.length > 0) {
        const sortedServer = serverList.slice().sort((a:any,b:any) => String((a.nome||a.name||'')).localeCompare(String(b.nome||b.name||''), 'pt-BR', { sensitivity: 'base' }));
        try { localStorage.setItem('clientes', JSON.stringify(sortedServer)); } catch (e) {}
        setClients(sortedServer);
      } else {
        // if Supabase is configured and we're online we prefer the server result (even if empty)
        if (supabaseConfigured && isOnline) {
          setClients([]);
          return;
        }
        // fallback: use whichever is in localStorage (could be seeded earlier)
        let localList: any[] = [];
        try { const raw = localStorage.getItem('clientes'); if (raw) localList = JSON.parse(raw); } catch (e) { localList = []; }
        if (Array.isArray(localList) && localList.length > 0) {
          const sortedLocal = localList.slice().sort((a:any,b:any) => String((a.nome||a.name||'')).localeCompare(String(b.nome||b.name||''), 'pt-BR', { sensitivity: 'base' }));
          setClients(sortedLocal);
        } else {
          // seed samples only if absolutely no data available and Supabase not configured
          const sampleClients = [
            { id: `local-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, nome: 'Maria Silva', telefone: '11988887777' },
            { id: `local-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, nome: 'João Pereira', telefone: '11977776666' }
          ];
          try { localStorage.setItem('clientes', JSON.stringify(sampleClients)); } catch (e) {}
          setClients(sampleClients);
          try { window.dispatchEvent(new CustomEvent('clientsUpdated')); } catch (e) {}
        }
      }
    })();
  }, []);
  const addServiceToPiece = (pieceId: string, svc: any) => {
    const price = Number(svc.preco || svc.price || 0) || 0;
    setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, services: [...p.services, { id: svc.id, name: svc.titulo || svc.name || svc.title, price: Number(price) }] } : p));
    // show success toast
    try { setShowServiceAddedToast(true); setTimeout(()=>setShowServiceAddedToast(false), 2000); } catch(e){}
  };

  const createServiceInline = async () => {
    if (!newServiceName) return alert('Nome do serviço é obrigatório');
    const obj: any = { titulo: newServiceName, preco: Number(newServicePrice || 0) };
    // persist locally
    try {
      const raw = localStorage.getItem('services');
      const arr = raw ? JSON.parse(raw) : [];
      arr.unshift(obj);
      localStorage.setItem('services', JSON.stringify(arr));
      setServicesList(prev => [obj, ...(prev || [])]);
      setNewServiceName(''); setNewServicePrice('');
    } catch (e) { console.debug('createServiceInline local save failed', e); }
    // try supabase
    try {
      await supabase.from('servicos').insert([{ titulo: obj.titulo, preco: obj.preco }]);
    } catch (e) { /* ignore */ }
  };

  const saveEditedAddedServicePrice = (pieceId: string, idx: number, price: number) => {
    setPieces(prev => prev.map(p => p.id === pieceId ? { ...p, services: p.services.map((s:any, i:number) => i===idx ? { ...s, price: Number(price||0) } : s) } : p));
    setEditingAddedService(null);
  };

  const subtotal = () => {
    try { return pieces.reduce((s,p) => s + (p.services||[]).reduce((ss,si)=> ss + Number(si.price||0), 0), 0); } catch (e) { return 0; }
  };

  const addPiece = () => {
    if (!currentPieceTipo) return;
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const matched = PREDEFINED_PECAS.find(p => (p.nome || '').toLowerCase() === (currentPieceTipo || '').toLowerCase());
    const icone = matched ? matched.icone : '🧵';
    const newPiece: Piece = { id, tipo: currentPieceTipo, cor: currentPieceCor || undefined, modelo: currentPieceModelo || undefined, services: [], icone };
    setPieces(prev => [...prev, newPiece]);
    setCurrentPieceTipo(''); setCurrentPieceCor(''); setCurrentPieceModelo('');
    setSelectedPieceForService(newPiece.id);
  };

  const next = () => {
    // simple validations per step
    if (step === 1 && !selectedClient) return alert('Selecione ou cadastre um cliente');
    if (step === 4 && !dateOut) return alert('Informe a previsão de entrega');
    if (step === 5) {
      console.debug('next(step5) invoked', { currentPieceTipo, piecesLen: pieces.length });
      // if user has filled the current piece fields, add it first
      if (currentPieceTipo) {
        addPiece();
        // open in-app modal asking whether to add another piece
        console.debug('setting showAddAnotherModal(true) after addPiece');
        setShowAddAnotherModal(true);
        return;
      }
      // if there are already pieces added, ask whether to add another
      if (pieces.length > 0) {
        console.debug('pieces already exist, setting showAddAnotherModal(true)');
        setShowAddAnotherModal(true);
        return;
      }
      return alert('Adicione pelo menos uma peça');
    }
    if (step === 6) {
      // if no piece selected but we have pieces, auto-select first
      if (!selectedPieceForService && pieces.length > 0) {
        setSelectedPieceForService(pieces[0].id);
        return;
      }
      // if there are pieces and current piece has at least one service, move to next piece without services
      if (selectedPieceForService) {
        const current = pieces.find(p=>p.id===selectedPieceForService);
        const currentHasServices = (current && (current.services||[]).length>0);
        if (pieces.length > 1 && currentHasServices) {
          const nextPiece = pieces.find(p => (p.services||[]).length === 0);
          if (nextPiece) {
            setSelectedPieceForService(nextPiece.id);
            return; // stay on step 6 to add services to next piece
          }
        }
        // if current has no services, require at least one
        if (!currentHasServices) return alert('Adicione ao menos um serviço para esta peça');
      }
    }
    setStep(s => Math.min(10, s+1));
  };

  const prev = () => setStep(s => Math.max(1, s-1));

  const handleCreateClient = async () => {
    if (!newClientName) return alert('Nome obrigatório');
    try {
      const created = await upsertClient({ nome: newClientName, telefone: newClientPhone });
      setClients(prev => (prev||[]).concat([created]).slice().sort((a:any,b:any) => String((a.nome||a.name||'')).localeCompare(String(b.nome||b.name||''), 'pt-BR', { sensitivity: 'base' })));
      setSelectedClient(created);
      setShowNewClientForm(false);
    } catch (e) {
      const local = { id: `local-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, nome: newClientName, telefone: newClientPhone };
      setClients(prev => (prev||[]).concat([local]).slice().sort((a:any,b:any) => String((a.nome||a.name||'')).localeCompare(String(b.nome||b.name||''), 'pt-BR', { sensitivity: 'base' })));
      setSelectedClient(local);
      setShowNewClientForm(false);
    }
  };

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    // generate sequential numero: try Supabase latest, fallback to localStorage
    let numero = 'N00001';
    try {
      const res = await supabase.from('ordens').select('numero').order('created_at', { ascending: false }).limit(1);
      if (!(res as any).error && Array.isArray((res as any).data) && (res as any).data.length > 0) {
        const last = (res as any).data[0].numero || '';
        const m = String(last).match(/(\d+)$/);
        const next = m ? (parseInt(m[1],10) + 1) : 1;
        numero = 'N' + String(next).padStart(5,'0');
      } else {
        // fallback to localStorage
        try {
          const raw = localStorage.getItem('orders');
          const arr = raw ? JSON.parse(raw) : [];
          let max = 0;
          (arr || []).forEach((o:any) => {
            try { const m = String(o.numero||'').match(/(\d+)$/); if (m) max = Math.max(max, Number(m[1])); } catch(_){}
          });
          numero = 'N' + String(max+1).padStart(5,'0');
        } catch(_) { numero = 'N00001'; }
      }
    } catch (e) {
      // ignore and fallback
      try {
        const raw = localStorage.getItem('orders');
        const arr = raw ? JSON.parse(raw) : [];
        let max = 0;
        (arr || []).forEach((o:any) => { try { const m = String(o.numero||'').match(/(\d+)$/); if (m) max = Math.max(max, Number(m[1])); } catch(_){} });
        numero = 'N' + String(max+1).padStart(5,'0');
      } catch(_) { numero = 'N00001'; }
    }

    // keep dates as local date strings (YYYY-MM-DD) to avoid timezone shift
    const order = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      numero,
      cliente: selectedClient?.nome || '',
      client: selectedClient?.nome || '',
      cliente_id: selectedClient?.id || null,
      priority,
      dateIn: dateIn || null,
      dateOut: dateOut || null,
      pieces,
      total: subtotal(),
      // keep UI/payment fields locally only; do not send potentially-missing DB columns
      paymentStatus: paymentStatus === 'Pago' ? 'Pago' : 'Não pago',
      paymentMethod: paymentMethod || null,
      paidAmount: paymentStatus === 'Pago' ? (paidAmount ?? subtotal()) : 0,
      created_at: new Date().toISOString()
    };
    // mark as local/unsynced by default
    order._local = true;
    order._unsynced = true;
    // persist locally
    try {
      const raw = localStorage.getItem('orders');
      const arr = raw ? JSON.parse(raw) : [];
      arr.unshift(order);
      localStorage.setItem('orders', JSON.stringify(arr));
    } catch (e) {}

    // try saving to Supabase (best-effort) and always add a fluxo_caixa row (Pago/Não pago)
    // `finalOrder` will point to the canonical order to notify the parent (server row when available)
    let finalOrder: any = order;
    try {
      // Build payload only with known/safe columns to avoid PostgREST schema errors
      // Only use minimal known-safe columns when inserting into `ordens` to avoid PostgREST schema errors
      const normalizeNumero = (raw: any) => {
        try {
          const s = String(raw || '');
          const digits = s.replace(/\D/g, '');
          if (!digits) return undefined;
          const n = parseInt(digits, 10);
          return isNaN(n) ? undefined : n;
        } catch (e) { return undefined; }
      };

      const insertObj: any = {
        cliente_id: order.cliente_id,
        notas: order.notas || (order.pieces ? { pieces: order.pieces } : null),
        total: order.total,
        data_entrega: order.dateOut,
        // explicitly set status to avoid DB defaulting to 'draft'
        status: 'Recebido'
      };
      const numericNumero = normalizeNumero(order.numero);
      if (numericNumero !== undefined) insertObj.numero = numericNumero;

      const { data, error } = await supabase.from('ordens').insert([insertObj]).select();
      if (error) {
        const errPayload = {
          message: (error as any)?.message || String(error),
          details: (error as any)?.details || null,
          hint: (error as any)?.hint || null,
          code: (error as any)?.code || null,
          status: (error as any)?.status || null,
          responseData: data || null,
          time: new Date().toISOString()
        };
        try { console.error('supabase ordens insert error:', errPayload); } catch(e){}
        try { localStorage.setItem('lastServerError', JSON.stringify(errPayload)); } catch(e){}
      } else if (Array.isArray(data) && data[0]) {
        // server returned created row; merge it into local storage replacing the temp order
        const serverRow = data[0];
        try {
          const raw = localStorage.getItem('orders');
          let arr = raw ? JSON.parse(raw) : [];
          const idx = arr.findIndex((o:any) => o.id === order.id || String(o.numero || '').replace(/\D/g,'') === String(order.numero || '').replace(/\D/g,''));
          const merged = { ...order, ...serverRow, _local: false, _unsynced: false };
          finalOrder = merged;
          if (idx >= 0) {
            arr[idx] = merged;
          } else {
            arr.unshift(merged);
          }
          // Remove other local-only duplicates that share the same normalized numero (temp records)
          try {
            const numKey = String(merged.numero || '');
            const normalizedKey = numKey.replace(/\D/g, '');
            if (normalizedKey) {
              arr = arr.filter((a:any) => {
                try {
                  const aNum = String(a.numero || '').replace(/\D/g, '');
                  if (aNum !== normalizedKey) return true;
                  if (String(a.id || '') === String(merged.id || '')) return true; // keep merged/server row
                  if (a._local === true || String(a.id || '').startsWith('local-')) return false; // drop local temp
                  return true; // keep other server rows if any
                } catch (ee) { return true; }
              });
            }
          } catch (ee) { /* ignore dedupe errors */ }
          try { localStorage.setItem('orders', JSON.stringify({ __force: true, payload: arr })); } catch(e){}
          try { window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch(e){}
        } catch(e) { /* ignore local update errors */ }
      }

      const insertedId = (Array.isArray(data) && data[0]) ? data[0].id : null;
      try {
        // build services text from pieces.services
        const servicesText = (order.pieces || []).flatMap((p:any) => (p.services||[]).map((s:any) => s.name || s.titulo || s.title || s.name)).join(', ');
        const fluxoObj: any = {
          date: order.dateIn,
          client: order.cliente,
          service: servicesText || 'OS',
          // ensure numeric value
          value: Number(Number(order.paidAmount || order.total || 0).toFixed(2)),
          status: order.paymentStatus === 'Pago' ? 'Pago' : 'Não pago',
          // normalize numero for fluxo_caixa to avoid bigint parse errors
          numero: (() => { const n = normalizeNumero(order.numero); return n !== undefined ? n : null; })(),
          pecas: order.pieces
        };
        if (insertedId) fluxoObj.orderid = insertedId;
        // send fluxo without any UI-only keys
        await supabase.from('fluxo_caixa').insert([fluxoObj]);
      } catch (_f) {
        // ignore fluxo errors
      }
    } catch (e) {
      try { localStorage.setItem('lastServerError', JSON.stringify({ message: String(e) })); } catch(_){}
      console.debug('supabase ordens insert failed', e);
    }
    if (onCreated) onCreated(finalOrder);
    // close wizard UI now; parent will open fidelizaçao modal
    onClose();
    setLastCreatedOrder(finalOrder);
    setShowPostConfirm(true);
    setIsSubmitting(false);
  };

  const sendFidelizacaoAndOpenPrint = (order:any) => {
    try {
      const phone = (selectedClient?.telefone || selectedClient?.phone || order?.phone || '').toString().replace(/\D/g,'');
      const servicesText = (order.pieces || []).flatMap((p:any) => (p.services||[]).map((s:any) => s.name || s.titulo || s.title || '')).join(', ');
      const message = `Olá ${order.cliente || selectedClient?.nome || ''}! Obrigado pela preferência. Sua OS ${order.numero} foi confirmada. Serviço(s): ${servicesText}. Total: R$ ${Number(order.total||0).toFixed(2)}.`;
      if (phone) window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } catch (e) { console.warn('fidelizacao send failed', e); }
    setPostConfirmSentMessage(true);
    // open print preview modal after sending
    setShowPrintPreview(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      {showAddAnotherModal && (
        <div className="fixed top-4 right-4 z-[9999]">
          <div className="px-3 py-2 bg-yellow-300 text-black rounded">DEBUG: showAddAnotherModal = true</div>
        </div>
      )}
      <div className="bg-white shadow-xl w-full h-full sm:h-auto sm:max-w-3xl sm:rounded-lg p-4 sm:p-6 z-10 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Nova Ordem de Serviço — Passo {step} de 10</h3>
          <button onClick={onClose} className="text-gray-500">Fechar</button>
        </div>

        <div className="mb-4">
          <div className="w-full h-2 bg-gray-100 rounded overflow-hidden">
            <div style={{ width: `${(step/10)*100}%` }} className="h-full bg-rose-500"></div>
          </div>
        </div>

        <div className="min-h-[240px] max-h-[60vh] overflow-auto">
          {step === 1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Selecione o Cliente</label>
              <div className="flex gap-2 mb-3">
                <input value={searchClient} onChange={e=>setSearchClient(e.target.value)} placeholder="Buscar cliente" className="flex-1 border px-3 py-2 rounded" />
                <button onClick={()=>setShowNewClientForm(s=>!s)} className="px-4 py-2 bg-rose-500 text-white rounded">+ Novo Cliente</button>
              </div>
              {showNewClientForm && (
                <div className="p-3 border rounded mb-2">
                  <input className="w-full mb-2 p-2 border rounded" placeholder="Nome" value={newClientName} onChange={e=>setNewClientName(e.target.value)} />
                  <input className="w-full mb-2 p-2 border rounded" placeholder="Telefone" value={newClientPhone} onChange={e=>setNewClientPhone(e.target.value)} />
                  <div className="flex gap-2">
                    <button onClick={handleCreateClient} className="px-3 py-2 bg-rose-500 text-white rounded">Criar</button>
                    <button onClick={()=>setShowNewClientForm(false)} className="px-3 py-2 border rounded">Cancelar</button>
                  </div>
                </div>
              )}
              {showPostConfirm && lastCreatedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/40" onClick={()=>{ setShowPostConfirm(false); onClose(); }}></div>
                  <div className="bg-white rounded-lg p-4 z-10 w-full max-w-md">
                    <div className="text-lg font-medium mb-2">Ordem criada — #{lastCreatedOrder.numero}</div>
                    <div className="text-sm text-gray-600 mb-4">Deseja enviar a mensagem de fidelização agora?</div>
                    <div className="flex gap-2 justify-end">
                      {!postConfirmSentMessage && (
                        <button onClick={()=>{ sendFidelizacaoAndOpenPrint(lastCreatedOrder); }} className="px-4 py-2 bg-rose-500 text-white rounded">Enviar mensagem</button>
                      )}
                      {postConfirmSentMessage && (
                        <button onClick={()=>{ setShowPrintPreview(true); }} className="px-4 py-2 bg-blue-600 text-white rounded">Imprimir</button>
                      )}
                      <button onClick={()=>{ setShowPostConfirm(false); onClose(); }} className="px-4 py-2 border rounded">Fechar</button>
                    </div>
                  </div>
                </div>
              )}
              <div className="max-h-40 overflow-auto border rounded p-2">
                {(clients||[]).filter(c => String(c.nome || c.name || '').toLowerCase().includes(searchClient.toLowerCase())).map(c => (
                  <div key={c.id || c.nome} onClick={()=>setSelectedClient(c)} className={`p-2 rounded cursor-pointer ${selectedClient?.id===c.id ? 'bg-rose-50 border border-rose-200' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div>{c.nome || c.name}</div>
                      <div className="text-xs text-gray-500">{c.telefone || c.phone || ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
              <div className="flex items-center justify-center gap-4">
                <button onClick={()=>setPriority('Normal')} className={`px-6 py-4 text-base rounded ${priority==='Normal' ? 'bg-rose-500 text-white' : 'border'}`}>Normal</button>
                <button onClick={()=>setPriority('Urgente')} className={`px-8 py-5 text-lg rounded ${priority==='Urgente' ? 'bg-red-600 text-white' : 'border'}`}>Urgente</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Data de Entrada</label>
              <div className="border rounded p-4 text-center">
                <div className="text-sm text-gray-500 mb-2">Clique para adicionar a data</div>
                <input type="date" value={dateIn} onChange={e=>setDateIn(e.target.value)} className="mx-auto border p-3 rounded text-base" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Previsão de Entrega</label>
              <input type="date" value={dateOut} onChange={e=>setDateOut(e.target.value)} className="border p-2 rounded w-full" />
            </div>
          )}

          {step === 5 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Cadastrar Peça</label>
              <div className="flex gap-2 mb-2">
                <input placeholder="Nome da peça" className="flex-1 border p-2 rounded" value={currentPieceTipo} onChange={e=>setCurrentPieceTipo(e.target.value)} />
                <input placeholder="Modelo / Observação" className="w-40 border p-2 rounded" value={currentPieceModelo} onChange={e=>setCurrentPieceModelo(e.target.value)} />
                <button onClick={addPiece} className="px-4 py-2 bg-rose-500 text-white rounded">Adicionar</button>
              </div>

              <div className="mb-3">
                <div className="text-sm text-gray-600 mb-2">Peças rápidas (por categoria)</div>
                <div className="max-h-40 overflow-auto space-y-3">
                  {(() => {
                    const excluded = new Set(['ACESSÓRIOS EM TECIDO','ROUPAS DE FRIO / EXTERNAS','ROUPAS ESPECIAIS','ROUPAS INFANTIS']);
                    return PREDEFINED_PECAS
                      .filter(p => !excluded.has(p.categoria))
                      .filter(p => !currentPieceTipo || p.nome.toLowerCase().includes(currentPieceTipo.toLowerCase()))
                      .slice()
                      .sort((a,b) => a.nome.localeCompare(b.nome))
                      .map(p => (
                        <button key={p.nome} onClick={()=>setCurrentPieceTipo(p.nome)} className={`flex items-center gap-2 px-3 py-1 border rounded ${currentPieceTipo===p.nome ? 'bg-rose-50 border-rose-200' : 'bg-white'}`}>
                          <span className="text-lg">{p.icone}</span>
                          <span className="text-sm">{p.nome}</span>
                        </button>
                      ));
                  })()}
                </div>
              </div>

              <div className="mb-3">
                <div className="text-sm text-gray-600 mb-2">Cores</div>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => {
                    const hex = COLOR_MAP[c] || '#ccc';
                    const isWhite = c === 'Branco';
                    return (
                      <button
                        key={c}
                        title={c}
                        aria-label={c}
                        onClick={() => setCurrentPieceCor(c)}
                        className={`w-10 h-8 rounded border flex items-center justify-center ${currentPieceCor===c ? 'ring-2 ring-rose-500' : ''}`}
                        style={{ backgroundColor: hex, borderColor: isWhite ? '#e5e7eb' : undefined }}
                      >
                        <span className="sr-only">{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                {pieces.map(p => (
                  <div key={p.id} className="p-2 border rounded">
                    <div className="flex justify-between items-center">
                      <div className="font-medium flex items-center gap-2">{p.icone || '🧵'} <span>{p.tipo}</span> <span className="text-xs text-gray-500">{p.cor}</span></div>
                      <div className="text-sm text-gray-500">Serviços: {(p.services||[]).length}</div>
                    </div>
                    {(p.services||[]).length > 0 && (
                      <div className="mt-2 space-y-1">
                        {(p.services||[]).map((s:any, idx:number) => (
                          <div key={idx} className="flex justify-between items-center">
                            <div className="font-semibold">{s.name}</div>
                            <div className="text-sm text-gray-700">R$ {Number(s.price||0).toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {/* Inline fallback prompt in case overlay modal is not visible due to stacking/z-index issues */}
              {showAddAnotherModal && (
                <div className="mt-3 p-3 border rounded bg-yellow-50">
                  <div className="font-medium">Peça adicionada</div>
                  <div className="text-sm text-gray-600 mb-2">Deseja adicionar outra peça?</div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={()=>{ setShowAddAnotherModal(false); }} className="px-3 py-1 bg-rose-500 text-white rounded">Sim</button>
                    <button onClick={()=>{ setShowAddAnotherModal(false); setStep(6); }} className="px-3 py-1 border rounded">Não</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 6 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Serviços da Peça</label>
              <div className="mb-2">Selecione a peça:</div>
              <div className="mb-3">
                {selectedPieceForService ? (
                  (() => {
                    const p = pieces.find(x=>x.id===selectedPieceForService);
                    if (!p) return null;
                    return (
                      <div className="flex items-center justify-between p-3 border rounded bg-rose-50">
                        <div className="flex items-center gap-3">
                          <div className="text-2xl">{p.icone || '🧵'}</div>
                          <div>
                            <div className="font-medium">{p.tipo}</div>
                            <div className="text-xs text-gray-500">{p.cor || ''}</div>
                          </div>
                        </div>
                        <div>
                          <button onClick={()=>setSelectedPieceForService(null)} className="px-3 py-1 border rounded text-sm">Trocar</button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="flex gap-2 mb-3">
                    {pieces.map(p => (
                      <button key={p.id} onClick={()=>setSelectedPieceForService(p.id)} className={`flex items-center gap-2 px-3 py-2 border rounded ${selectedPieceForService===p.id ? 'bg-rose-50 border-rose-200' : 'bg-white'}`}>
                        <span className="text-lg">{p.icone || '🧵'}</span>
                        <span className="text-sm">{p.tipo}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedPieceForService ? (
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <input placeholder="Pesquisar serviços" value={serviceSearch} onChange={e=>setServiceSearch(e.target.value)} className="flex-1 border p-2 rounded" />
                    <button onClick={()=>{ setNewServiceName(serviceSearch); }} className="px-3 py-2 border rounded text-sm">Cadastrar</button>
                  </div>
                  {/* if nothing matches, show quick create */}
                  {serviceSearch && (servicesList||[]).filter(s=> (s.titulo||s.name||s.title||'').toLowerCase().includes(serviceSearch.toLowerCase())).length === 0 && (
                    <div className="p-3 border rounded mb-3">
                      <div className="text-sm font-medium mb-1">Serviço não encontrado — cadastrar</div>
                      <input placeholder="Nome do serviço" value={newServiceName} onChange={e=>setNewServiceName(e.target.value)} className="w-full border p-2 rounded mb-2" />
                      <input type="number" placeholder="Preço" value={newServicePrice as any} onChange={e=>setNewServicePrice(e.target.value ? Number(e.target.value) : '')} className="w-full border p-2 rounded mb-2" />
                      <div className="flex justify-end">
                        <button onClick={createServiceInline} className="px-3 py-2 bg-rose-500 text-white rounded">Criar serviço</button>
                      </div>
                    </div>
                  )}
                  <div className="mb-2 font-medium">Serviços disponíveis</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-auto">
                    {((servicesList||[]).slice().sort((a:any,b:any) => (String(a.titulo||a.name||a.title||'')).localeCompare(String(b.titulo||b.name||b.title||''), 'pt-BR', { sensitivity: 'base' })).filter((s:any)=> !serviceSearch || (String(s.titulo||s.name||s.title||'')).toLowerCase().includes(serviceSearch.toLowerCase()))) .map((s:any) => {
                      const displayName = s.titulo || s.name || s.title || '';
                      const price = Number(s.preco ?? s.price ?? 0) || 0;
                      const cat = (s.categoria || s.category || '').toString();
                      const catIcon = PREDEFINED_PECAS.find(p=>p.categoria === cat)?.icone || '•';
                      return (
                        <div key={(s.id||displayName)} className="p-2 border rounded flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-xl">{catIcon}</div>
                            <div>
                              <div className="font-medium">{displayName}</div>
                              <div className="text-xs text-gray-500">R$ {price.toFixed(2)}</div>
                            </div>
                          </div>
                          <div>
                            <button onClick={()=>{ addServiceToPiece(selectedPieceForService, s); alert('Servico adicionado com sucesso!'); }} className="px-3 py-1 bg-rose-500 text-white rounded">Adicionar</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-3">
                    <div className="text-sm font-medium mb-1">Serviços adicionados nesta peça</div>
                    <div className="space-y-2 max-h-40 overflow-auto">
                      {pieces.find(p=>p.id===selectedPieceForService)?.services.map((sv:any, idx:number) => (
                        <div key={idx} className="p-2 border rounded flex justify-between items-center">
                          <div className="font-semibold">{sv.name}</div>
                          <div className="flex items-center gap-2">
                            {editingAddedService && editingAddedService.pieceId === selectedPieceForService && editingAddedService.idx === idx ? (
                              <>
                                <input type="number" value={editingAddedService.price as any} onChange={e=>setEditingAddedService({...editingAddedService, price: e.target.value ? Number(e.target.value) : ''})} className="w-24 p-1 border rounded text-sm" />
                                <button onClick={()=>saveEditedAddedServicePrice(selectedPieceForService, idx, Number(editingAddedService.price || 0))} className="px-2 py-1 bg-rose-500 text-white rounded text-sm">Salvar</button>
                                <button onClick={()=>setEditingAddedService(null)} className="px-2 py-1 border rounded text-sm">Cancelar</button>
                              </>
                            ) : (
                              <>
                                <div className="text-sm text-gray-600">R$ {Number(sv.price||0).toFixed(2)}</div>
                                <button onClick={()=>setEditingAddedService({ pieceId: selectedPieceForService, idx, price: Number(sv.price||0) })} className="px-2 py-1 border rounded text-sm">Editar</button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Selecione uma peça para ver e adicionar serviços.</div>
              )}
            </div>
          )}

          {step === 7 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resumo Financeiro</label>
              <div className="p-3 border rounded">
                {pieces.map((p,i) => (
                  <div key={p.id} className="flex justify-between py-1">
                    <div>{i+1}. {p.tipo} — {p.services.map(s=>s.name).join(', ')}</div>
                    <div>R$ {(p.services||[]).reduce((s,si)=> s+Number(si.price||0),0).toFixed(2)}</div>
                  </div>
                ))}
                <div className="border-t mt-2 pt-2 flex justify-between font-bold">Total <div>R$ {subtotal().toFixed(2)}</div></div>
              </div>
            </div>
          )}

          {step === 8 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pagamento</label>
              <div className="flex gap-2 mb-2">
                <button onClick={()=>setPaymentStatus('Pago')} className={`px-4 py-2 rounded ${paymentStatus==='Pago' ? 'bg-green-600 text-white' : 'border'}`}>Pago</button>
                <button onClick={()=>setPaymentStatus('Não pago')} className={`px-4 py-2 rounded ${paymentStatus==='Não pago' ? 'bg-red-600 text-white' : 'border'}`}>Não pago</button>
              </div>
              {paymentStatus === 'Pago' && (
                <div className="space-y-2">
                  <select className="w-full border p-2 rounded" value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)}>
                    <option value="">Escolha a forma</option>
                    <option value="PIX">PIX</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Cartão Débito">Cartão Débito</option>
                    <option value="Cartão Crédito">Cartão Crédito</option>
                  </select>
                  <input type="number" className="w-full border p-2 rounded" placeholder="Valor pago" value={paidAmount ?? subtotal()} onChange={e=>setPaidAmount(Number(e.target.value))} />
                </div>
              )}
            </div>
          )}

          {step === 9 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Resumo Final</label>
              <div className="p-3 border rounded">
                <div><strong>Cliente:</strong> {selectedClient?.nome || selectedClient?.name}</div>
                <div><strong>Prioridade:</strong> {priority}</div>
                <div><strong>Entrada:</strong> {formatDate(dateIn)}</div>
                <div><strong>Previsão:</strong> {formatDate(dateOut)}</div>
                <div className="mt-2">
                  {pieces.map((p,i)=> (<div key={p.id} className="py-1">{i+1}. {p.tipo} — {p.services.map(s=>s.name).join(', ')} — R$ {(p.services||[]).reduce((s,si)=> s+Number(si.price||0),0).toFixed(2)}</div>))}
                </div>
                <div className="mt-2 font-bold">Total: R$ {subtotal().toFixed(2)}</div>
              </div>
            </div>
          )}

          {step === 10 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirmação</label>
              <div className="p-3 border rounded">
                <div>Ao confirmar, a OS será criada no sistema.</div>
                <div className="mt-2 text-sm text-gray-600">Você poderá enviar mensagem, imprimir ou exportar após a criação.</div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-between">
          <div>
            {step > 1 && <button onClick={prev} className="px-4 py-2 border rounded">Voltar</button>}
          </div>
            <div className="flex gap-2">
            {step < 10 && <button onClick={next} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Avançar</button>}
            {step === 10 && <button onClick={handleConfirm} className="px-4 py-2 bg-rose-500 text-white rounded">Confirmar OS</button>}
          </div>
        </div>
        {showAddAnotherModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={()=>setShowAddAnotherModal(false)}></div>
            <div className="bg-white rounded-lg p-4 z-10 w-full max-w-sm">
              <div className="text-base font-medium mb-2">Peça adicionada</div>
              <div className="text-sm text-gray-600 mb-4">Deseja adicionar outra peça?</div>
              <div className="flex justify-end gap-2">
                <button onClick={()=>{ setShowAddAnotherModal(false); /* stay on step 5 */ }} className="px-4 py-2 bg-rose-500 text-white rounded">Sim</button>
                <button onClick={()=>{ setShowAddAnotherModal(false); setStep(6); }} className="px-4 py-2 border rounded">Não</button>
              </div>
            </div>
          </div>
        )}
        {/* Service added toast */}
        {showServiceAddedToast && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-green-600 text-white px-4 py-2 rounded shadow">Serviço adicionado com sucesso!</div>
          </div>
        )}

        {/* Print preview modal */}
        {showPrintPreview && lastCreatedOrder && (
          <div className="fixed inset-0 z-60 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={()=>setShowPrintPreview(false)}></div>
            <div className="bg-white w-full max-w-md rounded-lg p-4 z-10 overflow-auto relative">
              <button onClick={()=>setShowPrintPreview(false)} className="absolute right-3 top-3 text-gray-600 text-lg">×</button>
              <div className="text-lg font-bold mb-2">Impressão — OS {lastCreatedOrder.numero}</div>
              <div className="text-sm text-gray-700 mb-2">Cliente: {lastCreatedOrder.cliente || lastCreatedOrder.client}</div>
              <div className="mb-2">
                {(lastCreatedOrder.pieces||[]).map((p:any, i:number) => (
                  <div key={i} className="border-b py-2">
                    <div className="font-medium">{p.tipo}</div>
                    {(p.services||[]).map((s:any,si:number) => (
                      <div key={si} className="flex justify-between">
                        <div className="font-semibold">{s.name}</div>
                        <div>R$ {Number(s.price||s.value||0).toFixed(2)}</div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="font-bold text-right">Total: R$ {Number(lastCreatedOrder.total||0).toFixed(2)}</div>
              <div className="mt-4 flex gap-2 justify-end">
                <button onClick={()=>{ window.print(); }} className="px-4 py-2 bg-blue-600 text-white rounded">Imprimir</button>
                <button onClick={()=>setShowPrintPreview(false)} className="px-4 py-2 border rounded">Fechar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
