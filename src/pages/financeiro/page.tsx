import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { supabase } from '../../lib/supabaseClient';

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
            try { data = data.filter((d:any) => { const num = String(d.numero || '').toLowerCase(); const digits = String(d.numero || '').replace(/\D/g, ''); if (num === 'n000002') return false; if (digits === '2') return false; return true; }); } catch (e) {}
            try {
              const rawDel = localStorage.getItem('deletedOrders');
              const dels = rawDel ? JSON.parse(rawDel) : [];
              if (Array.isArray(dels) && dels.length > 0) data = data.filter((d:any) => !dels.includes(String(d.orderId) || String(d.id) || String(d.numero)));
            } catch (e) {}
            try {
              const normalized = normalizeEntries(data);
              setCashFlowDetails(normalized);
              setPendingPayments(normalized.filter((d:any) => d.status === 'Pendente'));
              try { setFluxoStatus(`Sincronizado ${normalized.length} entradas`); } catch (e) {}
              try { setLocalEntriesPreview((normalized || []).slice(0,50)); } catch (e) {}
            } catch (e) {
              setCashFlowDetails(data);
              setPendingPayments(data.filter((d:any) => d.status === 'Pendente'));
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
              const rawDel = localStorage.getItem('deletedOrders');
              const dels = rawDel ? JSON.parse(rawDel) : [];
              const filtered = Array.isArray(dels) && dels.length > 0 ? parsed.filter((p:any) => !dels.includes(String(p.orderId) || String(p.numero) || String(p.id))) : parsed;
              const normalized = normalizeEntries(filtered);
              setCashFlowDetails(normalized);
              setPendingPayments(normalized.filter((d:any) => d.status === 'Pendente'));
              try { setLocalEntriesPreview((normalized || []).slice(0,50)); } catch (e) {}
              return;
            } catch (e) { setCashFlowDetails(parsed); setPendingPayments(parsed.filter((d:any) => d.status === 'Pendente')); }
          }
        }
      } catch (e) { console.warn('localStorage parse failed', e); try { setFluxoStatus('Erro parse local: ' + String(e)); } catch (ee) {} }

      if (mounted) { setCashFlowDetails([]); setPendingPayments([]); try { setFluxoStatus('Nenhuma entrada'); } catch (e) {} }
    }
    fetchFinanceiro();

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
        (async () => { try { await fetchFinanceiro(); } catch (e) { console.warn('onFinanceUpdated fetch failed', e); } })();
      } catch (e) { console.warn('onFinanceUpdated handler error', e); }
    };

    const onOrdersUpdated = () => {
      try {
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
      localStorage.setItem('cashFlowDetails', JSON.stringify(parsed));
      try { console.info('fluxo_caixa: local updated on confirmPayment, total', (parsed||[]).length); } catch(e){}
      window.dispatchEvent(new CustomEvent('financeUpdated'));
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

    // also mark related order as paid (local + try supabase)
    try {
      const rawOrders = localStorage.getItem('orders');
      const ordersArr = rawOrders ? JSON.parse(rawOrders) : [];
      const idx = ordersArr.findIndex((o:any) => String(o.id) === String(selectedClient.orderId) || String(o.id) === String(selectedClient.orderid) || String(o.numero) === String(selectedClient.numero) || String(o.numero) === String(selectedClient.orderId));
      if (idx >= 0) {
        ordersArr[idx].paymentStatus = 'Pago';
      } else {
        // try to find by client+service+date as fallback
        const fallbackIdx = ordersArr.findIndex((o:any) => (o.client === selectedClient.client || o.client === selectedClient.client_name) && (String(o.value).includes(String(selectedClient.value)) || Number(o.value) === Number(selectedClient.value)));
        if (fallbackIdx >= 0) ordersArr[fallbackIdx].paymentStatus = 'Pago';
      }
      localStorage.setItem('orders', JSON.stringify(ordersArr));
      window.dispatchEvent(new CustomEvent('ordersUpdated'));
    } catch (e) { console.warn('failed to update orders locally on confirmPayment', e); }
    // Do NOT update `ordens` table with `paymentStatus` here — update is handled via `fluxo_caixa` and local merge.

    setShowConfirmPaymentModal(false);
    setSelectedClient(null);
  };

  const handleRowClick = (item: any) => {
    if (item.status === 'Pendente') {
      setSelectedClient(item);
      setShowConfirmPaymentModal(true);
    }
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

  const totalPending = pendingPayments.reduce((sum, p) => sum + parseCurrency(p.value ?? p.valor ?? 0), 0);

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

  const receitas = cashFlowDetails.reduce((sum, it) => {
    const v = parseCurrency(it.value ?? it.valor ?? 0);
    const tipo = (it.tipo || it.type || '').toString().toLowerCase();
    if (tipo === 'despesa' || v < 0) return sum;
    return sum + v;
  }, 0);
  const despesas = cashFlowDetails.reduce((sum, it) => {
    const v = parseCurrency(it.value ?? it.valor ?? 0);
    const tipo = (it.tipo || it.type || '').toString().toLowerCase();
    if (tipo === 'despesa' || v < 0) return sum + Math.abs(v);
    return sum;
  }, 0);
  const lucro = receitas - despesas;

  const pecasSummary = (item: any) => {
    try {
      const p = item.pecas || item.pieces || [];
      if (!Array.isArray(p) || p.length === 0) return '';
      return p.map((x: any) => {
        const nome = x.nome || x.name || x.tipo || x.modelo || x.cor || String(x);
        const cat = x.categoria || x.category || '';
        return cat ? `${nome} (${cat})` : nome;
      }).join(', ');
    } catch (e) { return ''; }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar />
      
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0">
        <div className="p-3 lg:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 lg:mb-6 gap-2">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg lg:text-2xl font-bold text-gray-900 mb-0.5 lg:mb-1">Financeiro</h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { try { window.dispatchEvent(new Event('retryFluxo')); } catch (e) {} }}
                    className="text-xs px-2 py-1 bg-rose-50 border border-rose-200 text-rose-600 rounded-lg hover:bg-rose-100 transition-all"
                  >Re-tentar fluxo</button>
                  <span className="text-xs text-gray-500">{fluxoStatus}</span>
                </div>
              </div>
              <p className="text-xs lg:text-sm text-gray-600">Controle suas receitas e despesas</p>
              <div className="mt-2 flex items-start gap-3">
                <button
                  onClick={() => setShowLocalEntries(!showLocalEntries)}
                  className="text-xs px-2 py-1 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all"
                >{showLocalEntries ? 'Ocultar local' : 'Mostrar local'}</button>
                <div className="text-xs text-gray-500 mt-1">Local entries: {localEntriesPreview.length}</div>
              </div>
              {showLocalEntries && (
                <div className="mt-2 p-2 bg-white border border-gray-100 rounded text-xs overflow-auto max-h-60">
                  <pre className="whitespace-pre-wrap text-[11px]">{JSON.stringify(localEntriesPreview, null, 2)}</pre>
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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-6 mb-3 lg:mb-6">
            <div className="bg-white rounded-lg p-2.5 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-1.5 lg:gap-2">
                <div className="w-7 h-7 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="ri-arrow-up-line text-sm lg:text-2xl text-green-600 w-3.5 h-3.5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-[9px] lg:text-sm text-gray-600 mb-0.5">Receitas</p>
                  <p className="text-xs lg:text-2xl font-bold text-gray-900">R$ {receitas.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-2.5 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-1.5 lg:gap-2">
                <div className="w-7 h-7 lg:w-12 lg:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <i className="ri-arrow-down-line text-sm lg:text-2xl text-red-600 w-3.5 h-3.5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-[9px] lg:text-sm text-gray-600 mb-0.5">Despesas</p>
                  <p className="text-xs lg:text-2xl font-bold text-gray-900">R$ {despesas.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-2.5 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-1.5 lg:gap-2">
                <div className="w-7 h-7 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-wallet-line text-sm lg:text-2xl text-blue-600 w-3.5 h-3.5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6 mb-3 lg:mb-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-2.5 lg:p-6 border-b border-gray-200">
                <h2 className="text-sm lg:text-lg font-bold text-gray-900">Receitas Recentes</h2>
              </div>
              <div className="p-2.5 lg:p-6 space-y-2 lg:space-y-4">
                {(cashFlowDetails && cashFlowDetails.length > 0 ? cashFlowDetails.filter(i => {
                  const v = Number(i.value ?? i.valor ?? 0) || 0;
                  return v > 0;
                }).slice(0,4) : []).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 lg:p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] lg:text-sm font-medium text-gray-900 truncate">{item.client || item.cliente || 'Cliente'}</p>
                      <p className="text-[9px] lg:text-xs text-gray-600 truncate">{item.service || item.servico || ''}</p>
                      <p className="text-[8px] lg:text-xs text-gray-500">{item.date || item.data || ''}</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-xs lg:text-base font-bold text-amber-700 mb-2">R$ {parseCurrency(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      <div className="flex gap-1.5 lg:gap-2">
                        <span className={`text-[8px] lg:text-xs px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full whitespace-nowrap ${
                          (item.status === 'Pago' || String(item.status || '').toLowerCase() === 'pago') ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {item.status || ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-2.5 lg:p-6 border-b border-gray-200">
                <h2 className="text-sm lg:text-lg font-bold text-gray-900">Despesas Recentes</h2>
              </div>
              <div className="p-2.5 lg:p-6 space-y-2 lg:space-y-4">
                {(cashFlowDetails && cashFlowDetails.length > 0 ? cashFlowDetails.filter(i => {
                  const v = Number(i.value ?? i.valor ?? 0) || 0;
                  return v < 0 || (i.tipo||'').toString().toLowerCase() === 'despesa';
                }).slice(0,4) : []).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 lg:p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] lg:text-sm font-medium text-gray-900 truncate">{item.description || item.descricao || ''}</p>
                      <p className="text-[9px] lg:text-xs text-gray-600">{item.category || item.categoria || ''}</p>
                      <p className="text-[8px] lg:text-xs text-gray-500">{item.date || item.data || ''}</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-[10px] lg:text-sm font-bold text-red-600">R$ {(Math.abs(Number(item.value ?? item.valor ?? 0)) || 0).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fluxo de Caixa Detalhado */}
          <div className="bg-white rounded-lg border border-gray-200 mb-3 lg:mb-6">
            <div className="p-2.5 lg:p-6 border-b border-gray-200">
              <h2 className="text-sm lg:text-lg font-bold text-gray-900">Fluxo de Caixa Detalhado</h2>
              <p className="text-xs lg:text-sm text-gray-600 mt-0.5">Movimentações por cliente e serviço - Clique nos pendentes para marcar como pago</p>
            </div>
            {/* Mobile: stacked list for cash flow */}
            <div className="sm:hidden p-2.5 space-y-2">
              {cashFlowDetails.map((item) => (
                <div key={item.id} className="bg-white p-3 rounded-lg border">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[10px] font-medium text-gray-900 truncate">{item.client}</p>
                        <p className="text-[9px] text-gray-600 truncate">{item.service}</p>
                        {item.numero && <p className="text-[8px] text-gray-500">OS Nº {item.numero}</p>}
                        {pecasSummary(item) ? <p className="text-[8px] text-gray-500">Peças: {pecasSummary(item)}</p> : null}
                        <p className="text-[8px] text-gray-500">{item.date}</p>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <p className="text-[10px] font-bold text-green-600">R$ {(Number(item.value) || 0).toFixed(2)}</p>
                                                <p className="text-[10px] font-bold text-green-600">R$ {(Number(item.value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                              <p className="text-[10px] font-bold text-green-600">R$ {(Number(item.value) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${item.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop/table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
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
                  {cashFlowDetails.map((item) => (
                    <tr 
                      key={item.id}
                      onClick={() => handleRowClick(item)}
                      className={`transition-colors ${
                        item.status === 'Pendente' 
                          ? 'hover:bg-amber-50 cursor-pointer' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 lg:px-6 py-2 lg:py-4 whitespace-nowrap text-[9px] lg:text-sm text-gray-600">{item.date}</td>
                      <td className="px-3 lg:px-6 py-2 lg:py-4 whitespace-nowrap text-[10px] lg:text-sm font-medium text-gray-900">{item.client}</td>
                      <td className="px-3 lg:px-6 py-2 lg:py-4 whitespace-nowrap text-[9px] lg:text-sm text-gray-700">
                        <div className="flex flex-col">
                          <span className="truncate"><strong>{item.service}</strong></span>
                          {item.numero && <span className="text-[9px] text-gray-500">OS Nº {item.numero}</span>}
                          {pecasSummary(item) ? <span className="text-[9px] text-gray-500">Peças: {pecasSummary(item)}</span> : null}
                        </div>
                      </td>
                      <td className="px-3 lg:px-6 py-2 lg:py-4 whitespace-nowrap text-[10px] lg:text-sm font-bold text-green-600">
                        R$ {(Number(item.value) || 0).toFixed(2)}
                      </td>
                      <td className="px-3 lg:px-6 py-2 lg:py-4 whitespace-nowrap">
                        <span className={`px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full text-[8px] lg:text-xs font-medium whitespace-nowrap ${
                          item.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
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
    </div>
  );
}
