import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { supabase } from '../../lib/supabaseClient';

export default function RelatoriosPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('mes');
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    async function fetchOrders() {
      try {
        if (supabase && typeof supabase.from === 'function') {
          const res = await supabase.from('ordens').select('*');
          if (!(res as any).error && Array.isArray((res as any).data)) {
            if (mounted) setOrders((res as any).data);
            return;
          }
        }
      } catch (e) {
        console.warn('relatorios fetch ordens error', e);
      }

      // fallback to localStorage
      try {
        const raw = localStorage.getItem('orders');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && mounted) {
            setOrders(parsed);
            return;
          }
        }
      } catch (e) {
        console.warn('relatorios localStorage parse failed', e);
      }

      if (mounted) setOrders([]);
    }

    fetchOrders();
    return () => { mounted = false; };
  }, []);

  // Derived aggregations from orders
  const servicesCountMap: Record<string, number> = {};
  const clientsCountMap: Record<string, number> = {};
  const monthsCount = Array.from({ length: 12 }).map(() => 0);

  (orders || []).forEach((o) => {
    // services/items
    const items = (o.itens || o.ordem_itens || o.items || []).map((it: any) => (it.nome || it.name || it.servico || it.title || '').toString()).filter(Boolean);
    if (items.length === 0) {
      const svc = (o.service || o.servico || '').toString();
      if (svc) items.push(svc);
    }
    items.forEach((s: string) => {
      const key = s.trim();
      if (!key) return;
      servicesCountMap[key] = (servicesCountMap[key] || 0) + 1;
    });

    // clients
    const client = (o.client || o.cliente || o.client_name || o.nome_cliente || '').toString().trim() || 'Sem nome';
    clientsCountMap[client] = (clientsCountMap[client] || 0) + 1;

    // months
    const d = new Date(o.data_entrega || o.data || o.created_at || o.createdAt || Date.now());
    if (!isNaN(d.getTime())) {
      monthsCount[d.getMonth()] = (monthsCount[d.getMonth()] || 0) + 1;
    }
  });

  const servicesMost = Object.entries(servicesCountMap).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count})).slice(0,8);
  const clientsMost = Object.entries(clientsCountMap).sort((a,b)=>b[1]-a[1]).map(([name,count])=>({name,count})).slice(0,8);
  const distribution = servicesMost.map((s, i) => ({ label: s.name, count: s.count, color: ['bg-rose-500','bg-purple-500','bg-blue-500','bg-green-500','bg-amber-500','bg-indigo-500','bg-teal-500','bg-pink-500'][i % 8] }));
  const evolutionMonthly = monthsCount;
  const maxEvo = Math.max(...evolutionMonthly, 1);

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
                  <p className="text-lg lg:text-2xl font-bold text-gray-900">{orders.length}</p>
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
                  <p className="text-lg lg:text-2xl font-bold text-gray-900">R$ {orders.reduce((sum, o) => {
                    try {
                      const v = (o.value || '').toString().replace(/[^0-9,\.]/g, '').replace(',', '.');
                      return sum + (parseFloat(v) || 0);
                    } catch (e) { return sum; }
                  }, 0).toFixed(2)}</p>
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
                  <p className="text-lg lg:text-2xl font-bold text-gray-900">{Array.from(new Set(orders.map(o => (o.client || '').toString()))).filter(Boolean).length}</p>
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
                  <p className="text-lg lg:text-2xl font-bold text-gray-900">R$ {(orders.length > 0 ? (orders.reduce((sum, o) => {
                    try { const v = (o.value || '').toString().replace(/[^0-9,\.]/g, '').replace(',', '.'); return sum + (parseFloat(v) || 0); } catch (e) { return sum; }
                  }, 0) / orders.length) : 0).toFixed(2)}</p>
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
              <div className="p-4 lg:p-6 border-b border-gray-200">
                <h2 className="text-base lg:text-lg font-bold text-gray-900">Clientes Mais Frequentes</h2>
              </div>
              <div className="p-4 lg:p-6 space-y-3">
                {clientsMost && clientsMost.length > 0 ? clientsMost.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                      <p className="text-xs text-gray-600">{client.count} ordens</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 ml-2">-</p>
                  </div>
                )) : (
                  <div className="text-sm text-gray-600">Nenhum cliente registrado</div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 mb-4 lg:mb-6">
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <h2 className="text-base lg:text-lg font-bold text-gray-900">Distribuição por Categoria</h2>
            </div>
            <div className="p-4 lg:p-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {(distribution && distribution.length > 0) ? distribution.map((item, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className={`w-10 h-10 lg:w-12 lg:h-12 ${item.color} rounded-lg flex items-center justify-center mb-2 lg:mb-3`}>
                      <span className="text-xl lg:text-2xl">{(item.label || '').slice(0,1)}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1 truncate">{item.label}</p>
                    <p className="text-lg lg:text-xl font-bold text-gray-900">{item.count}</p>
                  </div>
                )) : (
                  <div className="text-sm text-gray-600">Sem distribuição</div>
                )}
              </div>
            </div>
          </div>

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
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-rose-500 rounded-t transition-colors" style={{ height: `${pct}%` }} title={`${m}: ${value} ordens`}></div>
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
                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-1">
                          <div className="w-full bg-rose-500 rounded-t hover:bg-rose-600 transition-colors cursor-pointer" style={{ height: `${pct}%` }} title={`${m}: ${value} ordens`}></div>
                          <span className="text-xs text-gray-600 mt-2">{m}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
