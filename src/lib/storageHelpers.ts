/* eslint-disable @typescript-eslint/no-unused-vars */
import { debugLog } from './debugLogger';
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
      try { console.warn(`[storage] suppressed null ${key} caller=${caller || 'unknown'}`); } catch(_){}
      return;
    }
    // If writing an empty array but existing storage has items, avoid accidental wipe
    if (Array.isArray(value) && value.length === 0) {
      try {
        const existingRaw = localStorage.getItem(key);
        const existingParsed = existingRaw ? JSON.parse(existingRaw) : null;
        const existingArr = existingParsed && existingParsed.__force === true && Array.isArray(existingParsed.payload) ? existingParsed.payload : (Array.isArray(existingParsed) ? existingParsed : null);
        if (existingArr && existingArr.length > 0) {
          try { console.warn(`[storage] suppressed empty ${key} caller=${caller || 'unknown'}`); } catch(_){}
          return;
        }
      } catch (e) { /* ignore parse errors and continue */ }
    }

    const payload = { __force: true, payload: value };
    try { localStorage.setItem(key, JSON.stringify(payload)); } catch (e) { try { localStorage.setItem(key, JSON.stringify(value)); } catch(_){} }
    try { if (dispatchName) window.dispatchEvent(new CustomEvent(dispatchName)); } catch (e) {}
  } catch (e) {
    try { console.warn('[storage] safeSetItem failed for ' + key, e); } catch(_){}
  }
};
