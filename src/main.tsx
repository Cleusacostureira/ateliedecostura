import { StrictMode } from 'react'
import './i18n'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
/* eslint-disable @typescript-eslint/no-unused-vars */
import syncOrders from './lib/syncOrders'
import ErrorBoundary from './components/ErrorBoundary'
import './lib/parseCurrencyGlobal'

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
      // parse once for common null/empty checks for a few keys we protect
      let parsedMaybeCommon: any = null;
      try { parsedMaybeCommon = JSON.parse(value || 'null'); } catch (e) { parsedMaybeCommon = null; }

      // Suppress literal `null` writes for sensitive keys to avoid accidental wipes
      if (parsedMaybeCommon === null && ['orders','cashFlowDetails','retiradoTaps'].includes(key)) {
        try {
          console.warn(`Suppressed write of null ${key} to avoid accidental wipe.`);
          const stack = (new Error()).stack || '';
          console.log('[storage] suppressed null ' + key + ' caller stack', stack.split('\n').slice(2,6).join('\n'));
        } catch (e) {}
        return;
      }

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
        let parsedMaybe: any = null;
        try { parsedMaybe = JSON.parse(value || 'null'); } catch (e) { parsedMaybe = null; }

        // If someone wrote the literal `null` (or an equivalent) to `orders`,
        // suppress it to avoid wiping the canonical list.
        if (parsedMaybe === null) {
          console.warn('Suppressed write of null orders to avoid accidental wipe.');
          try {
            const stack = (new Error()).stack || '';
            console.log('[storage] suppressed null orders caller stack', stack.split('\n').slice(2,6).join('\n'));
          } catch (e) {}
          return;
        }
        try { newArr = Array.isArray(parsedMaybe) ? parsedMaybe : JSON.parse(value || '[]'); } catch (e) { return _origSet(key, value); }
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

        // Add light instrumentation for debugging: sizes and call site
        try {
          const stack = (new Error()).stack || '';
          console.log('[storage] setItem orders — existingLen=', (existingArr||[]).length, ' newLen=', (newArr||[]).length, ' parsedForce=', !!(parsedMaybe && parsedMaybe.__force));
          console.log('[storage] caller stack', stack.split('\n').slice(2,6).join('\n'));
        } catch (e) {}

        // If the incoming array looks like a full replacement (not a small delta),
        // prefer replacing existing storage entirely to avoid merging partial sets.
        // Additionally, skip writes when incoming === existing to avoid noisy/duplicate writes.
        if (Array.isArray(newArr) && Array.isArray(existingArr)) {
          if (newArr.length === existingArr.length && JSON.stringify(newArr) === JSON.stringify(existingArr)) {
            console.log('[storage] skip identical orders write — no-op');
            return;
          }
          if (newArr.length >= existingArr.length) {
            try {
              _origSet('orders', JSON.stringify(newArr));
              try { window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch(e) {}
              return;
            } catch (e) { /* fallthrough to merging on error */ }
          }
        }

        // Merge by id/numero but prefer non-empty fields and newer timestamps from the incoming item
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

        const mergePreferNonEmpty = (prev: any, next: any) => {
          if (!prev) return next;
          if (!next) return prev;
          const out: any = { ...prev };
          Object.keys(next).forEach((k) => {
            try {
              const nv = next[k];
              if (nv === undefined || nv === null) return; // skip
              if (typeof nv === 'string' && nv.trim() === '') return; // skip empty strings
              // timestamp heuristic: if next has an updated_at and it's older or equal, prefer prev
              if ((k === 'updated_at' || k === 'updatedAt' || k === 'modifiedAt') && prev[k]) {
                try {
                  const nTime = new Date(nv).getTime();
                  const pTime = new Date(prev[k]).getTime();
                  if (!isNaN(nTime) && !isNaN(pTime) && nTime <= pTime) return;
                } catch (e) {}
              }
              out[k] = nv;
            } catch (e) {}
          });
          return out;
        };

        (existingArr || []).forEach((it:any) => map.set(keyFor(it), it));
        (newArr || []).forEach((it:any) => {
          const k = keyFor(it);
          const prev = map.get(k) || null;
          map.set(k, mergePreferNonEmpty(prev, it));
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
