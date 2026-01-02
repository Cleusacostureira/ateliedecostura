import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import StatCard from '../../components/dashboard/StatCard';
import { clientsSummaryForMonth } from '../../lib/clients';

const loadOrders = () => {
  try {
    const raw = localStorage.getItem('orders');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) { return []; }
};

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('mes');
  const [inProgress, setInProgress] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [readyCount, setReadyCount] = useState(0);
  const [topClients, setTopClients] = useState<any[]>([]);

  const computeCounts = () => {
    const orders = loadOrders();
    const now = new Date(); now.setHours(0,0,0,0);
    const inProg = orders.filter((o: any) => o.status === 'Em costura').length;
    const ready = orders.filter((o: any) => o.status === 'Pronto').length;
    const late = orders.filter((o: any) => {
      if (!o.dateOut) return false;
      if (['Pronto','Retirado','Cancelado'].includes(o.status)) return false;
      const parts = o.dateOut.split('/');
      if (parts.length !== 3) return false;
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      d.setHours(0,0,0,0);
      return d < now;
    }).length;
    setInProgress(inProg);
    setLateCount(late);
    setReadyCount(ready);
    try {
      const top = clientsSummaryForMonth(now.getMonth(), now.getFullYear()).slice(0,5);
      setTopClients(top);
    } catch (e) { setTopClients([]); }
  };

  useEffect(() => {
    computeCounts();
    const h = () => computeCounts();
    window.addEventListener('ordersUpdated', h);
    window.addEventListener('clientsUpdated', h);
    return () => { window.removeEventListener('ordersUpdated', h); window.removeEventListener('clientsUpdated', h); };
  }, []);

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
              <StatCard icon="ri-money-dollar-circle-line" label="Faturamento do Mês" value="R$ 6.240" trend="+12,5%" trendUp={true} color="bg-rose-400" />
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
                {[
                  { month: 'Jan', value: 4200 },
                  { month: 'Fev', value: 5100 },
                  { month: 'Mar', value: 4800 },
                  { month: 'Abr', value: 5600 },
                  { month: 'Mai', value: 6100 },
                  { month: 'Jun', value: 5800 },
                  { month: 'Jul', value: 6400 },
                  { month: 'Ago', value: 5900 },
                  { month: 'Set', value: 6200 },
                  { month: 'Out', value: 5700 },
                  { month: 'Nov', value: 6000 },
                  { month: 'Dez', value: 6240 },
                ].map((item) => (
                  <div key={item.month} className="flex items-center gap-2 lg:gap-3">
                    <span className="text-[10px] lg:text-sm text-gray-600 w-6 lg:w-8">{item.month}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 lg:h-6 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-rose-400 to-pink-500 h-full rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${(item.value / 6500) * 100}%` }}
                      >
                        <span className="text-[9px] lg:text-xs text-white font-medium">R$ {(item.value / 1000).toFixed(1)}k</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <h2 className="text-sm lg:text-lg font-bold text-gray-900 mb-4">Serviços Mais Realizados</h2>
              <div className="space-y-3">
                {[
                  { service: 'Barra de Calça', count: 45, percentage: 85 },
                  { service: 'Ajuste de Vestido', count: 32, percentage: 65 },
                  { service: 'Troca de Zíper', count: 28, percentage: 55 },
                  { service: 'Ajuste de Cintura', count: 24, percentage: 48 },
                  { service: 'Barra de Vestido', count: 18, percentage: 36 },
                ].map((item) => (
                  <div key={item.service}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] lg:text-sm text-gray-700 truncate pr-2">{item.service}</span>
                      <span className="text-[10px] lg:text-sm font-bold text-gray-900 whitespace-nowrap">{item.count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 lg:h-2">
                      <div 
                        className="bg-gradient-to-r from-rose-400 to-pink-500 h-full rounded-full"
                        style={{ width: `${item.percentage}%` }}
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
                {[
                  { client: 'Maria Silva', service: 'Barra de Calça', date: '18/12/2024', urgent: true },
                  { client: 'João Santos', service: 'Ajuste de Vestido', date: '19/12/2024', urgent: false },
                  { client: 'Ana Costa', service: 'Troca de Zíper', date: '20/12/2024', urgent: true },
                  { client: 'Pedro Oliveira', service: 'Conserto Geral', date: '21/12/2024', urgent: false },
                  { client: 'Carla Mendes', service: 'Barra de Vestido', date: '22/12/2024', urgent: false },
                ].map((item, index) => (
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
                {(topClients && topClients.length > 0 ? topClients : [
                  { name: 'Carla Mendes', orders: 20, total: 2150 },
                  { name: 'Ana Costa', orders: 15, total: 1580 },
                  { name: 'Maria Silva', orders: 12, total: 1240 },
                ])
                .map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-2 lg:p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs lg:text-sm flex-shrink-0">
                        {(item.name || item.name)?.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] lg:text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-[9px] lg:text-xs text-gray-600">{item.count || item.orders || 0} ordens</p>
                      </div>
                    </div>
                    <span className="text-[10px] lg:text-sm font-bold text-green-600 whitespace-nowrap ml-2">R$ {(item.total || 0).toLocaleString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
