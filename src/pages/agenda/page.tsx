import { useEffect, useMemo, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { readOrdersFromStorage, safeSetItem } from '../../lib/storageHelpers';

function parseDateStr(d: string) {
  if (!d) return null;
  const [day, month, year] = d.split('/');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

export default function AgendaPage() {
  const [orders, setOrders] = useState<any[]>(() => {
    try { return readOrdersFromStorage(); } catch { return []; }
  });
  const [tab, setTab] = useState<'today'|'tomorrow'|'week'|'kanban'>('today');

  useEffect(() => { try { safeSetItem('orders', orders, 'ordersUpdated', 'AgendaPage'); } catch { void 0; } }, [orders]);

  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const tomorrow = useMemo(() => { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(0,0,0,0); return d; }, []);
  const weekEnd = useMemo(() => { const d = new Date(); d.setDate(d.getDate()+7); d.setHours(0,0,0,0); return d; }, []);

  const isSameDay = (a: Date|null, b: Date) => { if (!a) return false; return a.getTime() === b.getTime(); };

  const ordersWithParsedDate = orders.map(o => ({ ...o, _dateObj: parseDateStr(o.dateOut) }));

  const todayList = ordersWithParsedDate.filter(o => isSameDay(o._dateObj, today));
  const tomorrowList = ordersWithParsedDate.filter(o => isSameDay(o._dateObj, tomorrow));
  const weekList = ordersWithParsedDate.filter(o => o._dateObj && o._dateObj >= today && o._dateObj <= weekEnd);

  const overdueCount = ordersWithParsedDate.filter(o => o._dateObj && o._dateObj < today && o.status !== 'Retirado' && o.status !== 'Cancelado').length;
  const todayCount = todayList.length;
  const urgentCount = ordersWithParsedDate.filter(o => o.priority === 'urgente').length;

  // Kanban columns
  const columns = ['Recebido','Em costura','Aguardando prova','Ajuste final','Pronto'];

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
  };
  const onDropTo = (e: React.DragEvent, status: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const next = orders.map(o => o.id === id ? { ...o, status } : o);
    setOrders(next);
  };

  const allowDrop = (e: React.DragEvent) => e.preventDefault();

  const cardClass = (o: any) => {
    if (o._dateObj && o._dateObj < today) return 'border-l-4 border-red-500';
    if (o._dateObj && isSameDay(o._dateObj, today)) return 'border-l-4 border-yellow-400';
    return 'border-l-4 border-green-200';
  };

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 p-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Agenda</h1>
          <p className="text-sm text-gray-600">Visão rápida do que fazer hoje e nos próximos dias</p>
          <div className="mt-3 flex gap-3">
            <div className="px-3 py-2 bg-red-50 rounded">{overdueCount} OS atrasadas</div>
            <div className="px-3 py-2 bg-yellow-50 rounded">{todayCount} para hoje</div>
            <div className="px-3 py-2 bg-rose-50 rounded">{urgentCount} urgentes</div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex gap-2">
            <button onClick={() => setTab('today')} className={`px-3 py-2 rounded ${tab==='today'?'bg-rose-600 text-white':'bg-gray-100'}`}>Hoje</button>
            <button onClick={() => setTab('tomorrow')} className={`px-3 py-2 rounded ${tab==='tomorrow'?'bg-rose-600 text-white':'bg-gray-100'}`}>Amanhã</button>
            <button onClick={() => setTab('week')} className={`px-3 py-2 rounded ${tab==='week'?'bg-rose-600 text-white':'bg-gray-100'}`}>Semana</button>
            <button onClick={() => setTab('kanban')} className={`px-3 py-2 rounded ${tab==='kanban'?'bg-rose-600 text-white':'bg-gray-100'}`}>Fila (Kanban)</button>
          </div>
        </div>

        {tab === 'today' && (
          <div className="space-y-3">
            {todayList.length === 0 && <div className="text-sm text-gray-500">Nenhuma ordem para hoje</div>}
            {todayList.map(o => (
              <div key={o.id} className={`p-4 bg-white rounded shadow ${cardClass(o)}`}> 
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{o.client}</div>
                    <div className="text-sm text-gray-600">{o.service}</div>
                    <div className="text-xs text-gray-500">Prazo: {o.dateOut || 'Sem data'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{o.value}</div>
                    {o.priority === 'urgente' && <div className="text-xs text-red-600">Urgente</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'tomorrow' && (
          <div className="space-y-3">
            {tomorrowList.length === 0 && <div className="text-sm text-gray-500">Nenhuma ordem para amanhã</div>}
            {tomorrowList.map(o => (
              <div key={o.id} className={`p-4 bg-white rounded shadow ${cardClass(o)}`}> 
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{o.client}</div>
                    <div className="text-sm text-gray-600">{o.service}</div>
                    <div className="text-xs text-gray-500">Prazo: {o.dateOut || 'Sem data'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{o.value}</div>
                    {o.priority === 'urgente' && <div className="text-xs text-red-600">Urgente</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'week' && (
          <div className="space-y-3">
            {weekList.length === 0 && <div className="text-sm text-gray-500">Nenhuma ordem para a semana</div>}
            {weekList.map(o => (
              <div key={o.id} className={`p-4 bg-white rounded shadow ${cardClass(o)}`}> 
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{o.client}</div>
                    <div className="text-sm text-gray-600">{o.service}</div>
                    <div className="text-xs text-gray-500">Prazo: {o.dateOut || 'Sem data'}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{o.value}</div>
                    {o.priority === 'urgente' && <div className="text-xs text-red-600">Urgente</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'kanban' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            {columns.map(col => (
              <div key={col} onDragOver={allowDrop} onDrop={(e) => onDropTo(e, col)} className="p-2 bg-gray-50 rounded min-h-[300px]">
                <div className="font-semibold mb-2">{col}</div>
                <div className="space-y-3">
                  {ordersWithParsedDate.filter(o => o.status === col).map(o => (
                    <div key={o.id} draggable onDragStart={(e) => onDragStart(e, o.id)} className={`p-3 bg-white rounded shadow ${cardClass(o)}`}>
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{o.client}</div>
                          <div className="text-sm text-gray-600">{o.service}</div>
                          <div className="text-xs text-gray-500">{o.dateOut || 'Sem data'}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{o.value}</div>
                          {o.priority === 'urgente' && <div className="text-xs text-red-600">Urgente</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}
