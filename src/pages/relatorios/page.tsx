/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { supabase } from '../../lib/supabaseClient';
import { readOrdersFromStorage, safeSetItem } from '../../lib/storageHelpers';

export default function RelatoriosPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('mes');
  const [orders, setOrders] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);
  const [chartMonth, setChartMonth] = useState<number>(new Date().getMonth());
  const [chartYear, setChartYear] = useState<number>(new Date().getFullYear());
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const seedSampleOrders = () => {
    try {
      const sample = [
        { id: 'ord-000033', numero: '000033', client: 'Cliente Teste', total: 120.5, value: 120.5, pecas: [{ tipo: 'Camisa', nome: 'Camisa'},{ tipo: 'Camisa', nome: 'Camisa'}], service: 'Ajuste Geral', data: new Date().toISOString(), created_at: new Date().toISOString() },
        { id: 'ord-000034', numero: '000034', client: 'Cliente Dois', total: 80, value: 80, pecas: [{ tipo: 'Vestido', nome: 'Vestido'}], service: 'Bainha', data: new Date().toISOString(), created_at: new Date().toISOString() }
      ];
      try { safeSetItem('orders', sample, 'ordersUpdated', 'RelatoriosPage'); } catch { try { localStorage.setItem('orders', JSON.stringify({ __force: true, payload: sample })); } catch(__){} }
      setOrders(sample);
      alert('Dados de teste adicionados em localStorage');
    } catch (e) { console.warn('seed failed', e); }
  };

  useEffect(() => {
    let mounted = true;
    async function fetchOrders() {
      // fetch orders and clients in sequence but ensure both attempts run
      try {
        if (supabase && typeof supabase.from === 'function') {
          const res = await supabase.from('ordens').select('*');
          if (!(res as any).error && Array.isArray((res as any).data)) {
            if (mounted) setOrders((res as any).data);
            // do not return here: continue to attempt loading clients
          }
        }
      } catch (e) {
        console.warn('relatorios fetch ordens error', e);
      }

      // also try to load clients for better name resolution (always attempt)
      try {
        if (supabase && typeof supabase.from === 'function') {
          const cRes = await supabase.from('clientes').select('*');
          if (!(cRes as any).error && Array.isArray((cRes as any).data) && mounted) {
            try {
              const sorted = (cRes as any).data.slice().sort((a:any,b:any) => String((a.nome||'')).localeCompare(String((b.nome||''))));
              setClientsList(sorted);
            } catch (ee) { setClientsList((cRes as any).data); }
          }
        }
      } catch (e) { console.warn('relatorios fetch clients error', e); }

      // fallback to localStorage
      try {
        const parsed = readOrdersFromStorage();
        if (Array.isArray(parsed) && mounted) {
          setOrders(parsed);
          return;
        }
      } catch (e) { console.warn('relatorios localStorage parse failed', e); }

      // Dev helper: seed sample orders into localStorage when requested via URL
      try {
        if (typeof window !== 'undefined' && window.location.search.includes('seedOrders=1')) {
          const sample = [
            {
              id: 'ord-000033',
              numero: '000033',
              client: 'Cliente Teste',
              total: 120.5,
              value: 120.5,
              pecas: [{ tipo: 'Camisa', nome: 'Camisa' }, { tipo: 'Camisa', nome: 'Camisa' }],
              service: 'Ajuste Geral',
              data: new Date().toISOString(),
              created_at: new Date().toISOString()
            },
            {
              id: 'ord-000034',
              numero: '000034',
              client: 'Cliente Dois',
              total: 80,
              value: 80,
              pecas: [{ tipo: 'Vestido', nome: 'Vestido' }],
              service: 'Bainha',
              data: new Date().toISOString(),
              created_at: new Date().toISOString()
            }
          ];
          try { safeSetItem('orders', sample, 'ordersUpdated', 'RelatoriosPage'); } catch(e) { try { localStorage.setItem('orders', JSON.stringify({ __force: true, payload: sample })); } catch(__){} }
          if (mounted) setOrders(sample);
          return;
        }
      } catch(e) {}

      if (mounted) {
        // if no orders and running locally, seed sample orders so charts show during dev
        const host = typeof window !== 'undefined' ? (window.location.hostname || '') : '';
        if ((host && (host.includes('localhost') || host.includes('127.0.0.1'))) ) {
          try {
            const sample = [
              {
                id: 'ord-000033',
                numero: '000033',
                client: 'Cliente Teste',
                total: 120.5,
                value: 120.5,
                pecas: [{ tipo: 'Camisa', nome: 'Camisa' }, { tipo: 'Camisa', nome: 'Camisa' }],
                service: 'Ajuste Geral',
                data: new Date().toISOString(),
                created_at: new Date().toISOString()
              },
              {
                id: 'ord-000034',
                numero: '000034',
                client: 'Cliente Dois',
                total: 80,
                value: 80,
                pecas: [{ tipo: 'Vestido', nome: 'Vestido' }],
                service: 'Bainha',
                data: new Date().toISOString(),
                created_at: new Date().toISOString()
              }
            ];
            try { safeSetItem('orders', sample, 'ordersUpdated', 'RelatoriosPage'); } catch(e) { try { localStorage.setItem('orders', JSON.stringify({ __force: true, payload: sample })); } catch(__){} }
            setOrders(sample);
          } catch(e) { setOrders([]); }
        } else {
          setOrders([]);
        }
      }
    }

    fetchOrders();
    return () => { mounted = false; };
  }, []);

  // Derived aggregations from orders (deduped by id/numero)
  const servicesCountMap: Record<string, number> = {};
  const clientsCountMap: Record<string, number> = {};
  const revenueByMonth = Array.from({ length: 12 }).map(() => 0);

  // build unique orders map (prefer server rows with id/numero)
  const uniqOrdersMap: Record<string, any> = {};
  (orders || []).forEach((o:any) => {
    try {
      const key = String(o.id || o.numero || '');
      if (!key) return;
      if (!uniqOrdersMap[key] || (o.created_at && (!uniqOrdersMap[key].created_at || String(o.created_at) > String(uniqOrdersMap[key].created_at)))) uniqOrdersMap[key] = o;
    } catch {}
  });
  const uniqOrders = Object.values(uniqOrdersMap || {});

  uniqOrders.forEach((o:any) => {
    // services/items: try multiple sources (itens array, ordem_itens, notas.services/servicos, top-level fields)
    let items: string[] = [];
    try {
      const arr = (o.itens || o.ordem_itens || o.items || o.pecas || []);
      if (Array.isArray(arr) && arr.length > 0) {
        items = items.concat(arr.map((it: any) => (it && (it.nome || it.name || it.servico || it.title || it.titulo || it.servico_nome || '')).toString()).filter(Boolean));
      }
    } catch {}
    try {
      const notas = o.notas ? (typeof o.notas === 'string' ? JSON.parse(o.notas) : o.notas) : null;
      const fromNotas = (notas && (notas.services || notas.servicos || [])) || [];
      if (Array.isArray(fromNotas) && fromNotas.length > 0) {
        items = items.concat(fromNotas.map((s:any) => ((s && (s.name || s.titulo || s.nome || s.servico || s.title)) || '').toString()).filter(Boolean));
      }
    } catch {}
    try {
      const svcTop = (o.service || o.servico || '').toString();
      if (svcTop) items.push(svcTop);
    } catch {}
    // dedupe items
    items = Array.from(new Set((items || []).map((s:any)=>String(s).trim()).filter(Boolean)));
    items.forEach((s: string) => {
      const key = s.trim();
      if (!key) return;
      servicesCountMap[key] = (servicesCountMap[key] || 0) + 1;
    });

    // clients (resolve by cliente_id via clientsList when possible)
    let clientName = '';
    try {
      if (o.cliente_id) {
        const c = clientsList.find((c:any) => String(c.id) === String(o.cliente_id));
        if (c && c.nome) clientName = String(c.nome).trim();
      }
    } catch {}
    if (!clientName) {
      // handle object-shaped client fields
      try {
        if (o.client && typeof o.client === 'object') {
          clientName = String(o.client.nome || o.client.name || '').trim();
        }
      } catch {}
    }
    if (!clientName) clientName = (o.client || o.cliente || o.client_name || o.nome_cliente || '').toString().trim() || '';
    if (!clientName && o.cliente_id) {
      // try fetching from clientsList by id as last attempt
      try {
        const c2 = clientsList.find((c:any) => String(c.id) === String(o.cliente_id));
        if (c2 && c2.nome) clientName = String(c2.nome).trim();
      } catch(e){}
    }
    clientName = clientName || 'Sem nome';
    clientsCountMap[clientName] = (clientsCountMap[clientName] || 0) + 1;

    // months (robust parsing: accept dd/mm/yyyy strings or ISO dates)
    try {
      // parse order value
      const rawVal: any = o.total ?? o.valor ?? o.value ?? (o.notas && typeof o.notas === 'object' && o.notas.total) ?? o.value;
      let orderVal = 0;
      try {
        const s = String(rawVal || '').replace(/[^0-9,.-]/g, '').replace(',', '.');
        orderVal = parseFloat(s) || 0;
      } catch(e) { orderVal = 0; }

      const candidates = [o.data_entrega, o.dataEntrega, o.data, o.created_at, o.createdAt, o.dateOut, o.dateOutAt, o.date_in, o.dateIn];
      let d: Date | null = null;
      for (const rawDate of candidates) {
        if (!rawDate) continue;
        try {
          if (typeof rawDate === 'string' && rawDate.includes('/')) {
            const parts = rawDate.split('/').map((p: string) => p.trim());
            if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1;
              const year = parseInt(parts[2]);
              if (!isNaN(day) && !isNaN(month) && !isNaN(year)) { d = new Date(year, month, day); }
            }
          }
          if (!d) {
            const maybe = new Date(rawDate as any);
            if (maybe && !isNaN(maybe.getTime())) { d = maybe; }
          }
        } catch { continue; }
        if (d) break;
      }
      if (d && !isNaN(d.getTime())) {
        const m = d.getMonth();
        revenueByMonth[m] = (revenueByMonth[m] || 0) + (Number(orderVal) || 0);
      }
    } catch { /* ignore date parse errors */ }
  });

  // distribution by piece
  const pieceCountMap: Record<string, number> = {};
  uniqOrders.forEach((o:any) => {
    try {
      const notas = o.notas ? (typeof o.notas === 'string' ? JSON.parse(o.notas) : o.notas) : null;
      const pieces = notas?.pieces || notas?.pecas || [];
      (pieces || []).forEach((p:any) => {
        const name = (p.tipo || p.nome || p.name || p.title || '').toString() || 'Peça';
        pieceCountMap[name] = (pieceCountMap[name] || 0) + 1;
      });
    } catch (e) {}
  });
  const distributionByPiece = Object.keys(pieceCountMap).map(k => ({ label: k, count: pieceCountMap[k] }));

  // Derived summary metrics
  const totalOrdersCount = uniqOrders.length;
  const totalRevenue = uniqOrders.reduce((sum:any, o:any) => {
    try {
      const raw = o.total ?? o.valor ?? o.value ?? (o.notas && typeof o.notas === 'object' && o.notas.total) ?? o.value;
      const s = String(raw || '').replace(/[^0-9,.-]/g, '').replace(',', '.');
      const n = parseFloat(s) || 0;
      return sum + n;
    } catch { return sum; }
  }, 0);
  const activeClientsCount = new Set(uniqOrders.map((o:any) => {
    try {
      if (o.cliente_id) return String(o.cliente_id);
      if (o.client) return String(o.client).trim();
      if (o.cliente) return String(o.cliente).trim();
      return null;
    } catch(e){return null}
  }).filter(Boolean)).size;
  const ticketAverage = totalOrdersCount > 0 ? Number((totalRevenue / totalOrdersCount).toFixed(2)) : 0;

  const servicesMost = Object.entries(servicesCountMap).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count})).slice(0,8);
  const clientsMost = Object.entries(clientsCountMap).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count})).slice(0,8);
  const distribution = servicesMost.map((s, i) => ({ label: s.name, count: s.count, color: ['bg-rose-500','bg-purple-500','bg-blue-500','bg-green-500','bg-amber-500','bg-indigo-500','bg-teal-500','bg-pink-500'][i % 8] }));
  const evolutionMonthly = revenueByMonth;
  const maxEvo = Math.max(...evolutionMonthly, 1);

  // Daily aggregates for selected month/year (orders)
  const daysInMonth = (y:number,m:number) => new Date(y, m+1, 0).getDate();
  const buildDailyAggregates = (y:number,m:number) => {
    const days = daysInMonth(y,m);
    const arr = Array.from({ length: days }).map((_,i) => ({ day: i+1, revenue: 0, services: 0 }));
    const parseDate = (rawDate:any) : Date | null => {
      try {
        if (!rawDate) return null;
        if (typeof rawDate === 'string') {
          if (rawDate.includes('/')) {
            const parts = rawDate.split('/').map((p:string)=>p.trim());
            if (parts.length === 3) {
              const day = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1;
              const year = parseInt(parts[2]);
              if (!isNaN(day) && !isNaN(month) && !isNaN(year)) return new Date(year, month, day);
            }
          }
          const maybe = new Date(rawDate as any);
          if (maybe && !isNaN(maybe.getTime())) return maybe;
        } else if (rawDate instanceof Date) return rawDate;
        else if (typeof rawDate === 'number') return new Date(rawDate);
      } catch(e) {}
      return null;
    };

    (uniqOrders || []).forEach((o:any) => {
      try {
        // prefer created_at (abertura) then createdAt, then data/data_entrega, then outros
        const candidates = [o.created_at, o.createdAt, o.data, o.data_entrega, o.dataEntrega, o.dateOut, o.dateOutAt, o.date_in, o.dateIn];
        let d: Date | null = null;
        for (const rawDate of candidates) {
          const pd = parseDate(rawDate);
          if (pd) { d = pd; break; }
        }
        if (!d) return;
        if (d.getFullYear() !== y || d.getMonth() !== m) return;
        const dayIndex = d.getDate() - 1;
        // revenue: prefer total-like fields
        const rawVal: any = o.total ?? o.valor ?? o.value ?? o.total_valor ?? (o.notas && typeof o.notas === 'object' && (o.notas.total || o.notas.valor)) ?? 0;
        let orderVal = 0;
        try { const s = String(rawVal || '').replace(/[^0-9,.-]/g, '').replace(',', '.'); orderVal = parseFloat(s) || 0; } catch(e) { orderVal = 0; }
        arr[dayIndex].revenue += orderVal;
        // services count: count items/pecas length when possible, else try notes/services arrays, else 1
        try {
          let svcCount = 0;
          const arrItems = (o.itens || o.ordem_itens || o.items || o.pecas || []);
          if (Array.isArray(arrItems) && arrItems.length > 0) svcCount = arrItems.length;
          else {
            const notas = o.notas ? (typeof o.notas === 'string' ? (()=>{ try { return JSON.parse(o.notas); } catch(e){ return null;} })() : o.notas) : null;
            const fromNotas = (notas && (notas.services || notas.servicos || [])) || [];
            if (Array.isArray(fromNotas) && fromNotas.length > 0) svcCount = fromNotas.length;
            else if (o.service || o.servico) svcCount = 1;
          }
          arr[dayIndex].services += svcCount;
        } catch(e) {}
      } catch(e) {}
    });
    return arr;
  };
  const dailyAggregates = buildDailyAggregates(chartYear, chartMonth);
  const maxDailyRevenue = Math.max(...dailyAggregates.map(d=>d.revenue), 1);
  const maxDailyServices = Math.max(...dailyAggregates.map(d=>d.services), 1);

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar />
      
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0">
        <div className="p-4 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 lg:mb-6 gap-3">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">Relatórios</h1>
              <p className="text-sm lg:text-base text-gray-600">Análise detalhada do seu negócio</p>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full sm:w-auto">
              <button
                onClick={() => setSelectedPeriod('semana')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedPeriod === 'semana'
                    ? 'bg-rose-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setSelectedPeriod('mes')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedPeriod === 'mes'
                    ? 'bg-rose-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Mês
              </button>
              <button
                onClick={() => setSelectedPeriod('ano')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedPeriod === 'ano'
                    ? 'bg-rose-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Ano
              </button>
              <button onClick={seedSampleOrders} className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 border border-gray-300 hover:bg-gray-50">Popular dados (teste)</button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-4 lg:mb-6">
            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-rose-100 rounded-lg flex items-center justify-center">
                  <i className="ri-file-list-3-line text-lg lg:text-2xl text-rose-600 w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-gray-600 mb-1">Total de Ordens</p>
                  <p className="text-lg lg:text-2xl font-bold text-gray-900">{totalOrdersCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="ri-money-dollar-circle-line text-lg lg:text-2xl text-green-600 w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-gray-600 mb-1">Faturamento</p>
                  <p className="text-lg lg:text-2xl font-bold text-gray-900">R$ {totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-user-line text-lg lg:text-2xl text-blue-600 w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-gray-600 mb-1">Clientes Ativos</p>
                  <p className="text-lg lg:text-2xl font-bold text-gray-900">{String(activeClientsCount)}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-2">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <i className="ri-star-line text-lg lg:text-2xl text-amber-600 w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-xs lg:text-sm text-gray-600 mb-1">Ticket Médio</p>
                  <p className="text-lg lg:text-2xl font-bold text-gray-900">R$ {ticketAverage.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:gap-6 mb-4 lg:mb-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 lg:p-6 border-b border-gray-200">
                <h2 className="text-base lg:text-lg font-bold text-gray-900">Serviços Mais Realizados</h2>
              </div>
              <div className="p-4 lg:p-6 space-y-3">
                {orders && orders.length > 0 ? (
                  servicesMost.map((service, index) => {
                    const max = servicesMost[0]?.count || 1;
                    const pct = Math.round((service.count / max) * 100);
                    return (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">{service.name}</span>
                          <span className="text-sm text-gray-600">{service.count}x</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-rose-500 h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-600">Nenhuma ordem registrada</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-base lg:text-lg font-bold text-gray-900">Faturamento Diário</h2>
                <div className="flex items-center gap-2">
                  <select value={chartMonth} onChange={(e)=>setChartMonth(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
                    {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map((m,idx)=>(<option key={idx} value={idx}>{m}</option>))}
                  </select>
                  <input type="number" value={chartYear} onChange={(e)=>setChartYear(Number(e.target.value))} className="w-20 border rounded px-2 py-1 text-sm" />
                  <button onClick={()=>setShowDebugPanel(s=>!s)} className="px-2 py-1 bg-gray-100 rounded border">Debug</button>
                </div>
              </div>
              <div className="p-4 lg:p-6">
                <div className="overflow-x-auto">
                  <div className="h-56 flex items-end gap-2">
                    {dailyAggregates.map((d, idx) => {
                      const revPct = Math.round((d.revenue / maxDailyRevenue) * 100);
                      const svcPct = Math.round((d.services / maxDailyServices) * 100);
                      // ensure minimal visible height so empty months still show structure
                      const revHeight = Math.max(6, revPct);
                      const svcHeight = Math.max(4, Math.round(svcPct/2));
                    return (
                      <div key={idx} className="flex flex-col items-center" style={{ width: 40 }}>
                        <div className="flex flex-col items-center">
                          <div className="w-8 bg-green-500 rounded-t" style={{ height: `${revHeight}%` }} title={`R$ ${d.revenue.toFixed(2)}`}>
                            <div className="text-[10px] text-white text-center" style={{opacity: d.revenue>0?1:0}}>{d.revenue>0?`R$ ${d.revenue.toFixed(2)}`:''}</div>
                          </div>
                          <div className="w-8 bg-rose-400 mt-0.5 rounded-t" style={{ height: `${svcHeight}%` }} title={`${d.services} serviços`}>
                            <div className="text-[9px] text-white text-center" style={{opacity: d.services>0?1:0}}>{d.services>0?d.services:''}</div>
                          </div>
                        </div>
                        <div className="text-[10px] text-gray-600 mt-2">{d.day}</div>
                      </div>
                    );
                    })}
                  </div>
                </div>
                <div className="mt-3 text-sm text-gray-600">Barra verde = R$ faturado; barra rosa = quantidade de serviços (mês selecionado)</div>
                {showDebugPanel && (
                  <div className="mt-3 p-3 bg-gray-50 rounded border text-xs">
                    <div><strong>orders.length:</strong> {String((orders||[]).length)}</div>
                    <div><strong>uniqOrders:</strong> {String((uniqOrders||[]).length)}</div>
                    <pre className="mt-2 overflow-auto" style={{maxHeight:200}}>{JSON.stringify({ revenueByMonth, dailyAggregates, chartMonth, chartYear }, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Distribuição por Peça removida conforme solicitado */}

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <h2 className="text-base lg:text-lg font-bold text-gray-900">Evolução Mensal</h2>
            </div>
            <div className="p-4 lg:p-6">
              {/* Mobile-friendly chart (no horizontal scroll) */}
              <div className="sm:hidden">
                <div className="h-40 flex items-end gap-1">
                  {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, index) => {
                    const value = evolutionMonthly[index] || 0;
                    const pct = Math.round((value / maxEvo) * 100);
                    const h = Math.max(6, pct);
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-rose-500 rounded-t transition-colors" style={{ height: `${h}%`, minHeight: 6, border: '1px solid rgba(0,0,0,0.06)' }} title={`${m}: R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
                          <div className="text-[10px] text-white text-center" style={{opacity: value>0?1:0}}>{value>0?`R$ ${Number(value).toFixed(2)}`:''}</div>
                        </div>
                        <span className="text-xs text-gray-600 mt-2">{m}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Desktop wide chart */}
              <div className="hidden sm:block overflow-x-auto">
                <div className="min-w-[500px]">
                  <div className="h-48 lg:h-64 flex items-end justify-between gap-2">
                    {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, index) => {
                      const value = evolutionMonthly[index] || 0;
                      const pct = Math.round((value / maxEvo) * 100);
                      const h = Math.max(6, pct);
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-rose-500 rounded-t hover:bg-rose-600 transition-colors cursor-pointer" style={{ height: `${h}%`, minHeight: 6, border: '1px solid rgba(0,0,0,0.06)' }} title={`${m}: R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}>
                            <div className="text-[10px] text-white text-center" style={{opacity: value>0?1:0}}>{value>0?`R$ ${Number(value).toFixed(2)}`:''}</div>
                          </div>
                          <span className="text-xs text-gray-600 mt-2">{m}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
            {/* debug panel (visible with ?debug=1) */}
            {typeof window !== 'undefined' && window.location.search.includes('debug=1') && (
              <div className="mt-4 p-4 bg-white border rounded-lg">
                <h3 className="text-sm font-bold mb-2">Debug — Relatórios</h3>
                <div className="text-xs text-gray-700 mb-2">orders.length: {String((orders||[]).length)} — uniqOrders: {String((uniqOrders||[]).length)}</div>
                <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto" style={{maxHeight: 240}}>
{JSON.stringify({ revenueByMonth, sampleOrders: (uniqOrders||[]).slice(0,6).map(o=>({id:o.id, numero:o.numero, data_entrega:o.data_entrega||o.dateOut||o.created_at, total:o.total||o.valor||o.value, notas:o.notas})) }, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
