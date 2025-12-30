import { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('mes');

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
            <div className="bg-white rounded-lg p-3 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-2">
                <div className="w-8 h-8 lg:w-12 lg:h-12 bg-rose-100 rounded-lg flex items-center justify-center">
                  <i className="ri-money-dollar-circle-line text-base lg:text-2xl text-rose-600 w-4 h-4 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-[10px] lg:text-sm text-gray-600 mb-0.5">Faturamento do Mês</p>
                  <p className="text-sm lg:text-2xl font-bold text-gray-900">R$ 6.240</p>
                  <span className="text-[9px] lg:text-xs text-green-600 font-medium">+12,5%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-2">
                <div className="w-8 h-8 lg:w-12 lg:h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <i className="ri-file-list-3-line text-base lg:text-2xl text-amber-600 w-4 h-4 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-[10px] lg:text-sm text-gray-600 mb-0.5">Ordens em Andamento</p>
                  <p className="text-sm lg:text-2xl font-bold text-gray-900">18</p>
                  <span className="text-[9px] lg:text-xs text-gray-500">3 urgentes</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-2">
                <div className="w-8 h-8 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="ri-checkbox-circle-line text-base lg:text-2xl text-green-600 w-4 h-4 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-[10px] lg:text-sm text-gray-600 mb-0.5">Ordens Finalizadas</p>
                  <p className="text-sm lg:text-2xl font-bold text-gray-900">142</p>
                  <span className="text-[9px] lg:text-xs text-green-600 font-medium">+8,2%</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-3 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-2">
                <div className="w-8 h-8 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-line-chart-line text-base lg:text-2xl text-blue-600 w-4 h-4 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-[10px] lg:text-sm text-gray-600 mb-0.5">Faturamento do Ano</p>
                  <p className="text-sm lg:text-2xl font-bold text-gray-900">R$ 68.5k</p>
                  <span className="text-[9px] lg:text-xs text-green-600 font-medium">+15,3%</span>
                </div>
              </div>
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
                {[
                  { name: 'Carla Mendes', orders: 20, total: 2150 },
                  { name: 'Ana Costa', orders: 15, total: 1580 },
                  { name: 'Maria Silva', orders: 12, total: 1240 },
                  { name: 'Juliana Rocha', orders: 10, total: 950 },
                  { name: 'João Santos', orders: 8, total: 680 },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 lg:p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-rose-400 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-xs lg:text-sm flex-shrink-0">
                        {item.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] lg:text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-[9px] lg:text-xs text-gray-600">{item.orders} ordens</p>
                      </div>
                    </div>
                    <span className="text-[10px] lg:text-sm font-bold text-green-600 whitespace-nowrap ml-2">R$ {item.total.toLocaleString('pt-BR')}</span>
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
