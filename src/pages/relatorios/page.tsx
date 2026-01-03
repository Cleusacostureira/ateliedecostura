import { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';

export default function RelatoriosPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('mes');

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
                  <p className="text-lg lg:text-2xl font-bold text-gray-900">156</p>
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
                  <p className="text-lg lg:text-2xl font-bold text-gray-900">R$ 8.450</p>
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
                  <p className="text-lg lg:text-2xl font-bold text-gray-900">89</p>
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
                  <p className="text-lg lg:text-2xl font-bold text-gray-900">R$ 54</p>
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
                {[
                  { name: 'Barra de Calça', count: 45, percentage: 85 },
                  { name: 'Ajuste de Vestido', count: 35, percentage: 70 },
                  { name: 'Troca de Zíper', count: 28, percentage: 55 },
                  { name: 'Conserto Geral', count: 22, percentage: 45 },
                  { name: 'Ajuste de Cintura', count: 18, percentage: 35 },
                ].map((service, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">{service.name}</span>
                      <span className="text-sm text-gray-600">{service.count}x</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-rose-500 h-2 rounded-full"
                        style={{ width: `${service.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-4 lg:p-6 border-b border-gray-200">
                <h2 className="text-base lg:text-lg font-bold text-gray-900">Clientes Mais Frequentes</h2>
              </div>
              <div className="p-4 lg:p-6 space-y-3">
                {[
                  { name: 'Maria Silva', orders: 12, value: 'R$ 420,00' },
                  { name: 'João Santos', orders: 10, value: 'R$ 380,00' },
                  { name: 'Ana Costa', orders: 8, value: 'R$ 320,00' },
                  { name: 'Pedro Oliveira', orders: 7, value: 'R$ 280,00' },
                  { name: 'Carla Mendes', orders: 6, value: 'R$ 240,00' },
                ].map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                      <p className="text-xs text-gray-600">{client.orders} ordens</p>
                    </div>
                    <p className="text-sm font-bold text-gray-900 ml-2">{client.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 mb-4 lg:mb-6">
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <h2 className="text-base lg:text-lg font-bold text-gray-900">Distribuição por Categoria</h2>
            </div>
            <div className="p-4 lg:p-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                {[
                  { category: '👖 Barras', count: 45, color: 'bg-rose-500' },
                  { category: '👗 Vestidos', count: 35, color: 'bg-purple-500' },
                  { category: '🧵 Consertos', count: 28, color: 'bg-blue-500' },
                  { category: '✂️ Ajustes', count: 22, color: 'bg-green-500' },
                  { category: '👕 Camisas', count: 18, color: 'bg-amber-500' },
                  { category: '👔 Sociais', count: 15, color: 'bg-indigo-500' },
                  { category: '🧥 Casacos', count: 12, color: 'bg-teal-500' },
                  { category: '👶 Infantis', count: 8, color: 'bg-pink-500' },
                ].map((item, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className={`w-10 h-10 lg:w-12 lg:h-12 ${item.color} rounded-lg flex items-center justify-center mb-2 lg:mb-3`}>
                      <span className="text-xl lg:text-2xl">{item.category.split(' ')[0]}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1 truncate">{item.category.split(' ').slice(1).join(' ')}</p>
                    <p className="text-lg lg:text-xl font-bold text-gray-900">{item.count}</p>
                  </div>
                ))}
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
                  {[
                    { month: 'Jan', value: 45 },
                    { month: 'Fev', value: 52 },
                    { month: 'Mar', value: 48 },
                    { month: 'Abr', value: 61 },
                    { month: 'Mai', value: 55 },
                    { month: 'Jun', value: 68 },
                    { month: 'Jul', value: 72 },
                    { month: 'Ago', value: 65 },
                    { month: 'Set', value: 78 },
                    { month: 'Out', value: 82 },
                    { month: 'Nov', value: 88 },
                    { month: 'Dez', value: 95 },
                  ].map((data, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full bg-rose-500 rounded-t transition-colors"
                        style={{ height: `${data.value}%` }}
                        title={`${data.month}: ${data.value} ordens`}
                      ></div>
                      <span className="text-xs text-gray-600 mt-2">{data.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Desktop wide chart */}
              <div className="hidden sm:block overflow-x-auto">
                <div className="min-w-[500px]">
                  <div className="h-48 lg:h-64 flex items-end justify-between gap-2">
                    {[
                      { month: 'Jan', value: 45 },
                      { month: 'Fev', value: 52 },
                      { month: 'Mar', value: 48 },
                      { month: 'Abr', value: 61 },
                      { month: 'Mai', value: 55 },
                      { month: 'Jun', value: 68 },
                      { month: 'Jul', value: 72 },
                      { month: 'Ago', value: 65 },
                      { month: 'Set', value: 78 },
                      { month: 'Out', value: 82 },
                      { month: 'Nov', value: 88 },
                      { month: 'Dez', value: 95 },
                    ].map((data, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-rose-500 rounded-t hover:bg-rose-600 transition-colors cursor-pointer"
                          style={{ height: `${data.value}%` }}
                          title={`${data.month}: ${data.value} ordens`}
                        ></div>
                        <span className="text-xs text-gray-600 mt-2">{data.month}</span>
                      </div>
                    ))}
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
