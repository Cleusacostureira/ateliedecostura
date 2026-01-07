import { StrictMode } from 'react'
import './i18n'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import syncOrders from './lib/syncOrders'
import ErrorBoundary from './components/ErrorBoundary'

// try to sync on startup
syncOrders().catch(e => { try { localStorage.setItem('lastServerError', JSON.stringify({ message: String(e) })); } catch(_){} });

// listen to online events to retry sync
window.addEventListener('online', () => { syncOrders().catch(() => {}); });

// Protect accidental overwrites of the master `orders` key.
// This wrapper prevents writing an empty array over an existing orders list
// and performs a simple merge (existing + new) to avoid losing local-only OS.
try {
  const _origSet = localStorage.setItem.bind(localStorage);
  (localStorage as any).setItem = function(key: string, value: string) {
    try {
      if (key === 'orders') {
        // support a forced write format: { __force: true, payload: [...] }
        try {
          const parsed = JSON.parse(value || 'null');
          if (parsed && parsed.__force === true && Array.isArray(parsed.payload)) {
            _origSet('orders', JSON.stringify(parsed.payload));
            try { window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch(e){}
            return;
          }
        } catch (_) {}
        let newArr: any[] = [];
        try { newArr = JSON.parse(value || '[]'); } catch (e) { return _origSet(key, value); }
        if (!Array.isArray(newArr)) return _origSet(key, value);

        let existingRaw = null;
        try { existingRaw = localStorage.getItem('orders'); } catch (e) { existingRaw = null; }
        let existingArr: any[] = [];
        try { existingArr = existingRaw ? JSON.parse(existingRaw) : []; } catch (e) { existingArr = []; }

        // If existing has items and new write is empty, ignore to avoid accidental wipe
        if (Array.isArray(existingArr) && existingArr.length > 0 && Array.isArray(newArr) && newArr.length === 0) {
          console.warn('Suppressed write of empty orders to avoid accidental wipe.');
          return;
        }

        // Merge by id/numero preserving fields from newArr over existingArr
        const map = new Map<string, any>();
        const normalizeNumeroKey = (n: any) => {
          try {
            const raw = String(n || '').replace(/\D/g, '');
            return raw ? String(parseInt(raw, 10)) : null;
          } catch (e) { return null; }
        }
        const keyFor = (it: any) => {
          try {
            const numKey = normalizeNumeroKey(it?.numero || it?.numero || (it && it.numero));
            if (numKey) return `num:${numKey}`;
            if (it && it.id) return `id:${String(it.id)}`;
            return `raw:${JSON.stringify(it || '')}`;
          } catch (e) { return `raw:${JSON.stringify(it || '')}`; }
        };
        (existingArr || []).forEach((it:any) => map.set(keyFor(it), it));
        (newArr || []).forEach((it:any) => {
          const k = keyFor(it);
          const prev = map.get(k) || {};
          map.set(k, { ...prev, ...it });
        });
        const merged = Array.from(map.values());
        _origSet('orders', JSON.stringify(merged));
        try { window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch(e) {}
        return;
      }
    } catch (e) {
      // fallthrough to default
    }
    return _origSet(key, value);
  };
} catch (e) { console.warn('failed to wrap localStorage.setItem', e); }
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
