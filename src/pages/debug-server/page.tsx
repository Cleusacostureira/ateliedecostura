import React, { useEffect, useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { supabase } from '../../lib/supabaseClient';

export default function DebugServerPage() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const target = [26,27,28,29,30,31,32];

  const fetchRows = async () => {
    setLoading(true);
    try {
      if (!(supabase && typeof supabase.from === 'function')) {
        setRows([{ error: 'Supabase client not available in this environment' }]);
        return;
      }
      const r = await supabase.from('ordens').select('*').in('numero', target);
      if ((r as any).error) {
        setRows([{ error: String((r as any).error) }]);
      } else {
        setRows((r as any).data || []);
      }
    } catch (e) {
      setRows([{ error: String(e) }]);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchRows(); }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <div className="p-4 lg:pl-72">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold mb-2">Debug Server Orders</h1>
          <p className="text-sm text-gray-600 mb-4">Shows server-side rows for selected `numero` values so you can see persisted `paymentStatus`.</p>
          <div className="flex gap-2 mb-4">
            <button onClick={fetchRows} disabled={loading} className="bg-black text-white px-3 py-2 rounded">Refresh</button>
            <a className="px-3 py-2 rounded bg-gray-200" href="/ordens">Go to Ordens</a>
          </div>
          <div className="bg-white rounded border p-3 text-sm overflow-auto">
            {loading && <div>Loading…</div>}
            {!loading && rows && rows.length === 0 && <div>No rows returned for numeros: {target.join(', ')}</div>}
            {!loading && rows && rows.length > 0 && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left"><th className="p-1">numero</th><th className="p-1">id</th><th className="p-1">paymentStatus</th></tr>
                </thead>
                <tbody>
                  {rows.map((r:any, i:number) => (
                    <tr key={i} className="border-t"><td className="p-1 align-top">{String(r.numero)}</td><td className="p-1 align-top break-words">{String(r.id)}</td><td className="p-1 align-top">{String(r.paymentStatus || 'null')}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            <pre className="mt-3 text-xs bg-gray-50 p-2 rounded">{rows ? JSON.stringify(rows,null,2) : 'Loading...'}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
