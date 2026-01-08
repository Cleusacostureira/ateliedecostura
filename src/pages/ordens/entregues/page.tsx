import { useState, useEffect } from 'react';
import Sidebar from '../../../components/layout/Sidebar';
import { readOrdersFromStorage } from '../../../lib/storageHelpers';

export default function EntreguesPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    try {
      const parsed = readOrdersFromStorage();
      if (Array.isArray(parsed)) setOrders(parsed.filter((o: any) => o.status === 'Retirado'));
    } catch (e) { setOrders([]); }
    const onUpdate = () => {
      try {
        const parsed = readOrdersFromStorage();
        if (Array.isArray(parsed)) setOrders(parsed.filter((o: any) => o.status === 'Retirado'));
      } catch (e) {}
    };
    window.addEventListener('ordersUpdated', onUpdate as any);
    return () => window.removeEventListener('ordersUpdated', onUpdate as any);
  }, []);

  const filtered = orders.filter(o => (
    o.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    o.service.toLowerCase().includes(searchTerm.toLowerCase())
  ));

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0 min-w-0">
        <div className="p-4 lg:p-8 min-w-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">Ordens Entregues</h1>
              <p className="text-sm text-gray-600">Histórico de ordens já retiradas pelos clientes</p>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="mb-4">
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por cliente, ID ou serviço..." className="w-full px-3 py-2 border rounded" />
            </div>
            <div className="overflow-auto w-full">
              <table className="w-full table-auto">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs text-gray-600">Cliente</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-600">Serviço</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-600">ID</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-600">Data Retirada</th>
                    <th className="px-3 py-2 text-right text-xs text-gray-600">Valor</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filtered.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-sm text-gray-900">{order.client}</td>
                      <td className="px-3 py-3 text-sm text-gray-700 break-words">{order.service}</td>
                      <td className="px-3 py-3 text-sm text-gray-500">{order.id}</td>
                      <td className="px-3 py-3 text-sm text-gray-700">{order.deliveryDate || order.dateOut || '—'}</td>
                      <td className="px-3 py-3 text-sm text-right font-bold text-green-600">{order.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
