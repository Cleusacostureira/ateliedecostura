/* eslint-disable @typescript-eslint/no-unused-vars */
import { debugLog } from './debugLogger';

// debounce repeated warnings to avoid spamming the console (can cause UI jank)
const _lastWarn: Record<string, number> = {};
const maybeWarn = (key: string, msg: string) => {
  try {
    const now = Date.now();
    const last = _lastWarn[key] || 0;
    if (now - last > 1000) {
      _lastWarn[key] = now;
      try { console.debug(msg); } catch (_){ }
    }
  } catch (_){ }
};

export const readOrdersFromStorage = (rawStr?: string) => {
  try {
    const raw = rawStr !== undefined ? rawStr : localStorage.getItem('orders');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && parsed.__force === true && Array.isArray(parsed.payload)) return parsed.payload;
    if (Array.isArray(parsed)) return parsed;
    return [];
  } catch (e) { return []; }
};

export const readDeletedOrders = () => {
  try {
    const raw = localStorage.getItem('deletedOrders');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) { return []; }
};

export const safeSetItem = (key: string, value: any, dispatchName?: string, caller?: string) => {
  try {
    if (value === null || value === undefined) {
      try { maybeWarn(`${key}:null`, `[storage] suppressed null ${key} caller=${caller || 'unknown'}`); } catch(_){ }
      return;
    }
    // If writing an empty array but existing storage has items, avoid accidental wipe
    if (Array.isArray(value) && value.length === 0) {
      try {
        const existingRaw = localStorage.getItem(key);
        const existingParsed = existingRaw ? JSON.parse(existingRaw) : null;
        const existingArr = existingParsed && existingParsed.__force === true && Array.isArray(existingParsed.payload) ? existingParsed.payload : (Array.isArray(existingParsed) ? existingParsed : null);
        if (existingArr && existingArr.length > 0) {
          try { maybeWarn(`${key}:empty`, `[storage] suppressed empty ${key} caller=${caller || 'unknown'}`); } catch(_){ }
          return;
        }
      } catch (e) { /* ignore parse errors and continue */ }
    }

    const payload = { __force: true, payload: value };
    try {
      const serialized = JSON.stringify(payload);
      const existingRaw2 = localStorage.getItem(key);
      if (existingRaw2 === serialized) {
        // no-op when identical to avoid event loops / repeated dispatches
        return;
      }
      try { localStorage.setItem(key, serialized); } catch (e) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch(_){}
      }
    } catch (e) {}
    try { if (dispatchName) window.dispatchEvent(new CustomEvent(dispatchName)); } catch (e) {}
  } catch (e) {
    try { console.warn('[storage] safeSetItem failed for ' + key, e); } catch(_){}
  }
};
