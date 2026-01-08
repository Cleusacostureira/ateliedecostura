import React from 'react';
import { getDebugBuffer } from '../lib/debugLogger';

export default function DebugCopyButton() {
  const handleCopy = async () => {
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
      const text = JSON.stringify(payload, null, 2);
      try { await navigator.clipboard.writeText(text); alert('Logs copiados para a área de transferência — cole aqui.'); } catch (e) { prompt('Copie manualmente este JSON:', text); }
    } catch (e) { alert('Falha ao coletar logs: ' + String(e)); }
  };

  return (
    <button
      onClick={handleCopy}
      title="Copiar logs de debug"
      className="fixed right-4 bottom-6 z-50 px-3 py-2 bg-rose-600 text-white rounded shadow-lg text-sm"
    >
      Copiar logs
    </button>
  );
}
