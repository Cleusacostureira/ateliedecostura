import { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { getDebugBuffer } from '../../lib/debugLogger';

export default function DebugPage() {
  const [text, setText] = useState('');

  const collect = () => {
    try {
      const buf = getDebugBuffer();
      const ordersRaw = localStorage.getItem('orders');
      let orders = null;
      try { orders = ordersRaw ? JSON.parse(ordersRaw) : null; } catch (e) { orders = ordersRaw; }
      const deletedRaw = localStorage.getItem('deletedOrders');
      let deleted = null;
      try { deleted = deletedRaw ? JSON.parse(deletedRaw) : null; } catch (e) { deleted = deletedRaw; }
      const payload = {
        ts: new Date().toISOString(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        logs: buf,
        orders,
        deleted,
      };
      setText(JSON.stringify(payload, null, 2));
    } catch (e) { setText(String(e)); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(text || ''); alert('Copiado para a área de transferência'); } catch (e) { alert('Falha ao copiar: ' + String(e)); }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0 min-w-0 p-6">
        <h1 className="text-xl font-bold mb-4">Debug — coletar logs</h1>
        <p className="text-sm text-gray-600 mb-4">Clique em <strong>Coletar</strong> e copie o JSON abaixo para me enviar.</p>
        <div className="flex gap-2 mb-4">
          <button onClick={collect} className="px-3 py-2 bg-rose-600 text-white rounded">Coletar</button>
          <button onClick={copy} className="px-3 py-2 border rounded">Copiar</button>
          <button onClick={() => setText('')} className="px-3 py-2 border rounded">Limpar</button>
        </div>
        <textarea value={text} onChange={(e)=>setText(e.target.value)} className="w-full h-[60vh] p-3 text-xs border rounded bg-white" />
      </main>
    </div>
  );
}
