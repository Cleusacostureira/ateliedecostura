import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { listCompras } from '../../lib/compras';
import NewCompraModal from './components/NewCompraModal';
import ComprasTable from './components/ComprasTable';

export default function ComprasPage() {
  const [compras, setCompras] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await listCompras();
      setCompras(data || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const totals = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
    const today = now.toISOString().slice(0,10);
    let totalMonth = 0, totalToday = 0, itemCount = 0;
    compras.forEach(c => {
      if (!c) return;
      const d = (c.data || '').slice(0,10);
      if (d >= monthStart) totalMonth += Number(c.valor_total || 0);
      if (d === today) totalToday += Number(c.valor_total || 0);
      if (Array.isArray(c.compras_itens)) itemCount += c.compras_itens.length;
    });
    const ticket = compras.length ? totalMonth / compras.length : 0;
    return { totalMonth, totalToday, itemCount, ticket };
  }, [compras]);

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0">
        <div className="p-6 app-horizontal-safe max-w-screen-xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold">Compras</h1>
            <div>
              <button onClick={() => setShowNew(true)} className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded">Nova Compra</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-white rounded shadow">
              <div className="text-sm text-gray-500">Total Compras (Mês)</div>
              <div className="text-xl font-bold">R$ {totals.totalMonth.toFixed(2)}</div>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <div className="text-sm text-gray-500">Total Compras (Hoje)</div>
              <div className="text-xl font-bold">R$ {totals.totalToday.toFixed(2)}</div>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <div className="text-sm text-gray-500">Quantidade de Itens</div>
              <div className="text-xl font-bold">{totals.itemCount}</div>
            </div>
            <div className="p-4 bg-white rounded shadow">
              <div className="text-sm text-gray-500">Ticket Médio</div>
              <div className="text-xl font-bold">R$ {totals.ticket.toFixed(2)}</div>
            </div>
          </div>

          <ComprasTable compras={compras} loading={loading} onRefresh={load} />
        </div>

        {showNew && <NewCompraModal onClose={() => { setShowNew(false); load(); }} />}
      </main>
    </div>
  );
}
