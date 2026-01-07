import { useEffect, useState } from 'react';
import syncOrders from '../lib/syncOrders';

export default function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncing, setSyncing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    try { const raw = localStorage.getItem('lastServerError'); if (raw) setLastError(String(JSON.parse(raw).message || JSON.stringify(JSON.parse(raw)))); } catch(_){}
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  if (online) return null;

  return (
    <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
      <div className="flex items-center justify-between gap-3">
        <div>Você está offline. Usando dados locais (localStorage).</div>
        <div className="flex items-center gap-2">
          {lastError && <button onClick={() => alert(lastError)} className="px-2 py-1 border rounded text-xs">Ver erro</button>}
          <button onClick={async () => { setSyncing(true); try { await syncOrders(); alert('Sincronização concluída (ou tentada).'); } catch(e){ alert('Falha ao sincronizar: '+String(e)); } setSyncing(false); }} className="px-2 py-1 bg-rose-500 text-white rounded text-xs">{syncing ? 'Sincronizando...' : 'Re-tentar sincronizar'}</button>
        </div>
      </div>
    </div>
  );
}
