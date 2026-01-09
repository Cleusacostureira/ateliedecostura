import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';

export default function DebugExportPage() {
  const [payload, setPayload] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const ordersRaw = localStorage.getItem('orders');
      const cashRaw = localStorage.getItem('cashFlowDetails');
      const parsed = { orders: ordersRaw ? JSON.parse(ordersRaw) : null, cashFlowDetails: cashRaw ? JSON.parse(cashRaw) : null };
      setPayload(parsed);
    } catch (e) {
      setPayload({ error: String(e) });
    }
  }, []);

  const copy = async () => {
    try {
      const txt = JSON.stringify(payload, null, 2);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(txt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        const w = window.open('', '_blank');
        if (w) { w.document.write('<pre>' + txt.replace(/</g,'&lt;') + '</pre>'); w.document.close(); }
      }
    } catch (e) {
      alert('Copy failed: ' + String(e));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="p-4 lg:pl-72">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold mb-2">Debug Export</h1>
          <p className="text-sm text-gray-600 mb-4">This page reads `orders` and `cashFlowDetails` from localStorage and shows the JSON so you can copy it on mobile.</p>
          <div className="mb-4">
            <button onClick={copy} className="bg-black text-white px-4 py-2 rounded">Copy JSON {copied ? '✓' : ''}</button>
          </div>
          <div className="bg-white rounded border p-3 text-sm overflow-auto max-h-[60vh]">
            <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word'}}>{payload ? JSON.stringify(payload, null, 2) : 'Loading...'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
