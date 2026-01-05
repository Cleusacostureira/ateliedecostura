import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import StatCard from '../../components/dashboard/StatCard';
import { clientsSummaryForMonth } from '../../lib/clients';
import { supabase } from '../../lib/supabaseClient';

const formatDate = (d: any) => {
  if (!d) return '';
  // already dd/mm/yyyy
  if (typeof d === 'string' && d.includes('/')) return d;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('pt-BR');
};

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('mes');
  const [inProgress, setInProgress] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [urgentCount, setUrgentCount] = useState(0);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [ordemItens, setOrdemItens] = useState<any[]>([]);
  const [servicosList, setServicosList] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<Array<{month:string;value:number}>>([]);
  const [topServices, setTopServices] = useState<any[]>([]);
  const [upcomingDeliveries, setUpcomingDeliveries] = useState<any[]>([]);
  const [revenueThisMonth, setRevenueThisMonth] = useState<number>(0);
  const [totalOrdersAll, setTotalOrdersAll] = useState<number>(0);

  const computeCounts = () => {
    const list = orders || [];
    const now = new Date(); now.setHours(0,0,0,0);
    const inProg = list.filter((o: any) => (o.status || '').toString() === 'Em costura').length;
    const ready = list.filter((o: any) => (o.status || '').toString() === 'Pronto').length;
    const late = list.filter((o: any) => {
      const dateOut = o.dateOut || o.data_entrega || o.dataEntrega || '';
      if (!dateOut) return false;
      if (['Pronto','Retirado','Cancelado'].includes((o.status || '').toString())) return false;
      const dStr = formatDate(dateOut);
      if (!dStr) return false;
      const parts = dStr.split('/');
      if (parts.length !== 3) return false;
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      d.setHours(0,0,0,0);
      return d < now;
    }).length;
    setInProgress(inProg);
    setLateCount(late);
    setReadyCount(ready);
    try {
      const today = new Date(); today.setHours(0,0,0,0);
      const todayCountCalc = list.filter((o: any) => {
        const dateOut = o.dateOut || o.data_entrega || o.dataEntrega || '';
        if (!dateOut) return false;
        if (['Retirado','Cancelado'].includes((o.status || '').toString())) return false;
        const dStr = formatDate(dateOut);
        if (!dStr) return false;
        const parts = dStr.split('/');
        if (parts.length !== 3) return false;
        const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        d.setHours(0,0,0,0);
        return d.getTime() === today.getTime();
      }).length;
      const urgentCountCalc = list.filter((o: any) => (o.priority || '').toString() === 'urgente' && !['Retirado','Cancelado'].includes((o.status || '').toString())).length;
      setTodayCount(todayCountCalc);
      setUrgentCount(urgentCountCalc);
      // compute top clients from orders and clients table
      const clientMap: Record<string,string> = {};
      (clients || []).forEach(c => { clientMap[c.id] = c.nome || c.nome; });
      const counts: Record<string, { orders: number; total: number }> = {};
      list.forEach(o => {
        const cid = o.cliente_id || o.clienteId || o.clientId || null;
        const name = cid ? (clientMap[cid] || cid) : (o.client || o.cliente || 'Cliente desconhecido');
        const v = parseFloat((o.total || o.valor || o.value || 0).toString()) || 0;
        counts[name] = counts[name] || { orders: 0, total: 0 };
        counts[name].orders += 1;
        counts[name].total += v;
      });
      const top = Object.keys(counts).map(k => ({ name: k, orders: counts[k].orders, total: counts[k].total })).sort((a,b) => b.orders - a.orders).slice(0,5);
      setTopClients(top);
    } catch (e) { setTopClients([]); setTodayCount(0); setUrgentCount(0); }
  };

  useEffect(() => {
    // fetch orders and clients from Supabase (fallback to localStorage)
    let mounted = true;
    async function fetchData() {
      try {
        if (supabase && typeof supabase.from === 'function') {
          const oRes = await supabase.from('ordens').select('*');
          if (!(oRes as any).error && Array.isArray((oRes as any).data) && mounted) {
            const mapped = (oRes as any).data.map((o: any) => ({
              ...o,
              dateOut: formatDate(o.data_entrega || o.dataEntrega || o.dateOut),
              dateIn: formatDate(o.data_criacao || o.created_at || o.dateIn),
            }));
            setOrders(mapped);
          }
          const cRes = await supabase.from('clientes').select('*');
          const oiRes = await supabase.from('ordem_itens').select('*');
          const sRes = await supabase.from('servicos').select('*');
          if (!(cRes as any).error && Array.isArray((cRes as any).data) && mounted) {
            setClients((cRes as any).data);
          }
          if (!(oiRes as any).error && Array.isArray((oiRes as any).data) && mounted) {
            setOrdemItens((oiRes as any).data);
          }
          if (!(sRes as any).error && Array.isArray((sRes as any).data) && mounted) {
            setServicosList((sRes as any).data);
          }
        }
      } catch (e) {
        console.warn('dashboard fetch error', e);
      }

      // fallback localStorage
      try {
        const raw = localStorage.getItem('orders');
        if (raw && mounted) setOrders(JSON.parse(raw));
      } catch (e) {}
    }

    fetchData();
    const h = () => computeCounts();
    window.addEventListener('ordersUpdated', h);
    window.addEventListener('clientsUpdated', h);
    return () => { mounted = false; window.removeEventListener('ordersUpdated', h); window.removeEventListener('clientsUpdated', h); };
  }, []);

  // compute metrics whenever core data changes
  useEffect(() => {
    computeCounts();
    // monthly data and revenue
    try {
      const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      const vals = new Array(12).fill(0);
      const now = new Date();
      orders.forEach(o => {
        const dateStr = o.dateIn || o.data_criacao || o.created_at || o.dataCriacao || '';
        const dt = dateStr && typeof dateStr === 'string' && dateStr.includes('/') ?
          ((): Date => { const p = dateStr.split('/'); return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0])); })()
          : new Date(dateStr || null);
        if (!dt || isNaN(dt.getTime())) return;
        const m = dt.getMonth();
        const v = parseFloat((o.total || o.valor || o.value || 0).toString()) || 0;
        vals[m] += v;
      });
      setMonthlyData(months.map((m, i) => ({ month: m, value: Number((vals[i] || 0).toFixed(2)) })));
      // revenue this month (exact with cents)
      const currentMonth = now.getMonth();
      const rev = vals[currentMonth] || 0;
      setRevenueThisMonth(Number(rev.toFixed(2)));
      // total of all orders (sum)
      const totalAll = vals.reduce((acc, v) => acc + v, 0);
      setTotalOrdersAll(Number(totalAll.toFixed(2)));

      // top services from ordem_itens joined with servicos
      const svcCounts: Record<string, {count:number, total:number, servicoId?:string}> = {};
      ordemItens.forEach(it => {
        const sid = it.servico_id || it.servicoId || it.servico;
        const qty = parseInt(it.quantidade || 1);
        const price = parseFloat((it.preco_unitario || it.preco || 0).toString()) || 0;
        const key = sid || (it.nome_servico || 'desconhecido');
        svcCounts[key] = svcCounts[key] || { count: 0, total: 0, servicoId: sid };
        svcCounts[key].count += qty;
        svcCounts[key].total += qty * price;
      });
      // also collect service items from orders payloads (some installations store items inside `ordens`)
      const orderSvcCounts: Record<string, {count:number, total:number, servicoId?:string}> = {};
      orders.forEach(o => {
        const items = (o.itens || o.ordem_itens || o.items || o.pecas || []).map((it:any) => it || {}).filter(Boolean);
        items.forEach((it:any) => {
          const name = (it.nome || it.name || it.servico || it.title || it.titulo || '').toString() || null;
          if (!name) return;
          const qty = parseInt(it.quantidade || it.qty || 1) || 1;
          const price = parseFloat((it.preco_unitario || it.preco || it.price || 0).toString()) || 0;
          orderSvcCounts[name] = orderSvcCounts[name] || { count: 0, total: 0 };
          orderSvcCounts[name].count += qty;
          orderSvcCounts[name].total += qty * price;
        });
      });

      const svcArr = Object.keys(svcCounts).map(k => ({ servicoId: svcCounts[k].servicoId, name: (servicosList.find(s=>s.id===svcCounts[k].servicoId)?.titulo) || k, count: svcCounts[k].count, total: svcCounts[k].total }));
      // merge with order-level items
      Object.keys(orderSvcCounts).forEach(k => {
        const existing = svcArr.find(s => s.name === k);
        if (existing) { existing.count += orderSvcCounts[k].count; existing.total += orderSvcCounts[k].total; }
        else svcArr.push({ servicoId: undefined, name: k, count: orderSvcCounts[k].count, total: orderSvcCounts[k].total });
      });
      setTopServices(svcArr.sort((a,b)=>b.count - a.count).slice(0,5));

      // upcoming deliveries (next 5)
      const today = new Date(); today.setHours(0,0,0,0);
      const upcoming = orders
        .filter(o => {
          const dateStr = o.dateOut || o.data_entrega || o.dataEntrega || '';
          if (!dateStr) return false;
          const parts = dateStr.split('/');
          if (parts.length !== 3) return false;
          const d = new Date(parseInt(parts[2]), parseInt(parts[1]) -1, parseInt(parts[0]));
          d.setHours(0,0,0,0);
          return d.getTime() >= today.getTime() && !( ['Retirado','Cancelado'].includes((o.status||'').toString()) );
        })
        .map(o => {
          const dateStr = o.dateOut || o.data_entrega || o.dataEntrega || '';
          return { id: o.id, client: (clients.find(c=>c.id===o.cliente_id)?.nome) || o.cliente || 'Cliente desconhecido', service: '', date: dateStr, urgent: (o.priority||'')==='urgente' };
        })
        .sort((a,b) => {
          const pa = a.date.split('/'); const pb = b.date.split('/');
          const da = new Date(parseInt(pa[2]), parseInt(pa[1]) -1, parseInt(pa[0]));
          const db = new Date(parseInt(pb[2]), parseInt(pb[1]) -1, parseInt(pb[0]));
          return da.getTime() - db.getTime();
        })
        .slice(0,5);
      setUpcomingDeliveries(upcoming);
    } catch (e) {
      console.warn('compute metrics failed', e);
      setMonthlyData([]); setTopServices([]); setUpcomingDeliveries([]); setRevenueThisMonth(0);
    }
  }, [orders, clients, ordemItens, servicosList, selectedPeriod]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 lg:ml-64 pt-14 lg:pt-0">
        <div className="p-4 lg:p-8">
          <div className="mb-4 lg:mb-6">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">Dashboard</h1>
            <p className="text-xs lg:text-sm text-gray-600">Visão geral do seu ateliê</p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-4 lg:mb-6">
            <div>
              <StatCard icon="ri-money-dollar-circle-line" label="Faturamento do Mês" value={`R$ ${revenueThisMonth.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} trend="" trendUp={true} color="bg-rose-400" />
            </div>
            <div>
              <StatCard icon="ri-file-list-3-line" label="OS em costura" value={String(inProgress)} trend="" trendUp={false} color="bg-amber-400" />
            </div>
            <div>
              <StatCard icon="ri-alarm-warning-line" label="OS atrasadas" value={String(lateCount)} trend="" trendUp={false} color="bg-red-400" />
            </div>
            <div>
              <StatCard icon="ri-checkbox-circle-line" label="OS prontas para retirada" value={String(readyCount)} trend="" trendUp={true} color="bg-green-400" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <a href="/agenda" className="no-underline text-inherit">
                <div className="text-sm font-semibold">OS para hoje</div>
                <div className="text-2xl font-bold text-rose-600">{String(todayCount || 0)}</div>
              </a>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <a href="/agenda" className="no-underline text-inherit">
                <div className="text-sm font-semibold">OS urgentes</div>
                <div className="text-2xl font-bold text-red-600">{String(urgentCount || 0)}</div>
              </a>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <a href="/agenda" className="no-underline text-inherit">
                <div className="text-sm font-semibold">Próxima entrega</div>
                <div className="text-2xl font-bold text-green-600">{/* compute next */ '-'} </div>
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-4 lg:mb-6">
            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm lg:text-lg font-bold text-gray-900">Faturamento Mensal</h2>
                <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="text-xs lg:text-sm px-2 lg:px-3 py-1 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                >
                  <option value="mes">Este Mês</option>
                  <option value="ano">Este Ano</option>
                </select>
              </div>
              <div className="space-y-3">
                {(monthlyData.length ? monthlyData : []).map((item) => (
                  <div key={item.month} className="flex items-center gap-2 lg:gap-3">
                    <span className="text-[10px] lg:text-sm text-gray-600 w-6 lg:w-8">{item.month}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 lg:h-6 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-rose-400 to-pink-500 h-full rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${Math.min(100, (item.value / (Math.max(...monthlyData.map(m=>m.value||0)) || 1)) * 100)}%` }}
                      >
                        <span className="text-[9px] lg:text-xs text-white font-medium">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <h2 className="text-sm lg:text-lg font-bold text-gray-900 mb-4">Serviços Mais Realizados</h2>
              <div className="space-y-3">
                {(topServices.length ? topServices : []).map((item) => (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] lg:text-sm text-gray-700 truncate pr-2">{item.name}</span>
                      <span className="text-[10px] lg:text-sm font-bold text-gray-900 whitespace-nowrap">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 lg:h-2">
                      <div 
                        className="bg-gradient-to-r from-rose-400 to-pink-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, Math.round((item.count / (topServices[0]?.count || 1)) * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <h2 className="text-sm lg:text-lg font-bold text-gray-900 mb-4">Próximas Entregas</h2>
              <div className="space-y-3">
                {(upcomingDeliveries.length ? upcomingDeliveries : []).map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 lg:p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs lg:text-sm flex-shrink-0">
                        {item.client.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] lg:text-sm font-medium text-gray-900 truncate">{item.client}</p>
                        <p className="text-[9px] lg:text-xs text-gray-600 truncate">{item.service}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 lg:gap-2 flex-shrink-0 ml-2">
                      {item.urgent && (
                        <i className="ri-alarm-warning-line text-red-500 text-sm lg:text-base w-3 h-3 lg:w-4 lg:h-4 flex items-center justify-center"></i>
                      )}
                      <span className="text-[9px] lg:text-xs text-gray-600 whitespace-nowrap">{item.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <h2 className="text-sm lg:text-lg font-bold text-gray-900 mb-4">Top Clientes</h2>
              <div className="space-y-3">
                {(topClients && topClients.length > 0 ? topClients : []).map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 lg:p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs lg:text-sm flex-shrink-0">
                        {(item.name || '')?.charAt(0) || '-'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] lg:text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-[9px] lg:text-xs text-gray-600">{item.orders || item.count || 0} ordens</p>
                      </div>
                    </div>
                    <span className="text-[10px] lg:text-sm font-bold text-green-600 whitespace-nowrap ml-2">R$ {(item.total || 0).toLocaleString('pt-BR')}</span>
                  </div>
                ))}
                {(!topClients || topClients.length === 0) && (
                  <div className="text-sm text-gray-500">Nenhum cliente com ordens ainda.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
