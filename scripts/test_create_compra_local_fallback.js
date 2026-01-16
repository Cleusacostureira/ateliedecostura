#!/usr/bin/env node
// Simula o fallback local quando a inserção em `fluxo_caixa` falha.
// Usa jsdom para fornecer `localStorage` em Node.
// Para rodar:
// npm install jsdom --save-dev
// node scripts/test_create_compra_local_fallback.js

/* global require, global, window, localStorage, CustomEvent, process, console */
/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-unused-vars, no-empty */

const { JSDOM } = require('jsdom');
const dom = new JSDOM(`<!doctype html><html><body></body></html>`, { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.CustomEvent = dom.window.CustomEvent;

function safeSetItem(key, value, dispatchName, caller) {
  try {
    if (value === null || value === undefined) {
      console.warn(`[storage] suppressed null ${key} caller=${caller || 'unknown'}`);
      return;
    }
    if (Array.isArray(value) && value.length === 0) {
      try {
        const existingRaw = localStorage.getItem(key);
        const existingParsed = existingRaw ? JSON.parse(existingRaw) : null;
        const existingArr = existingParsed && existingParsed.__force === true && Array.isArray(existingParsed.payload) ? existingParsed.payload : (Array.isArray(existingParsed) ? existingParsed : null);
        if (existingArr && existingArr.length > 0) {
          console.warn(`[storage] suppressed empty ${key} caller=${caller || 'unknown'}`);
          return;
        }
      } catch (e) { }
    }
    const payload = { __force: true, payload: value };
    try { localStorage.setItem(key, JSON.stringify(payload)); } catch (e) { try { localStorage.setItem(key, JSON.stringify(value)); } catch(_){} }
    try { if (dispatchName) window.dispatchEvent(new CustomEvent(dispatchName)); } catch (e) {}
  } catch (e) {
    console.warn('[storage] safeSetItem failed for ' + key, e);
  }
}

function simulateCompraFallback(compra) {
  try {
    const raw = localStorage.getItem('cashFlowDetails');
    let parsed = [];
    try { parsed = raw ? JSON.parse(raw) : []; } catch (ee) { parsed = []; }
    if (parsed && parsed.__force === true && Array.isArray(parsed.payload)) parsed = parsed.payload;
    if (!Array.isArray(parsed)) parsed = [];
    const entry = { id: `compra-${compra.id}`, orderId: compra.id, date: compra.data, client: compra.fornecedor, service: 'Compra', value: compra.valor_total, status: compra.status, tipo: 'despesa' };
    parsed.unshift(entry);
    safeSetItem('cashFlowDetails', parsed, 'financeUpdated', 'test_create_compra_local_fallback');
    return entry;
  } catch (e) {
    console.error('simulateCompraFallback failed', e);
    return null;
  }
}

// Test run
(function main() {
  const compra = { id: 'test-compra-123', data: '2026-01-15', fornecedor: 'Fornecedor Teste', valor_total: 199.9, status: 'Pago' };
  const expected = simulateCompraFallback(compra);
  const storedRaw = localStorage.getItem('cashFlowDetails');
  if (!storedRaw) {
    console.error('FAIL: cashFlowDetails not written');
    process.exit(2);
  }
  let parsed = null;
  try { parsed = JSON.parse(storedRaw); } catch (e) { console.error('FAIL: invalid json in localStorage', e); process.exit(2); }
  const arr = parsed && parsed.__force === true && Array.isArray(parsed.payload) ? parsed.payload : (Array.isArray(parsed) ? parsed : null);
  if (!Array.isArray(arr) || arr.length === 0) {
    console.error('FAIL: cashFlowDetails payload missing or empty');
    process.exit(2);
  }
  const first = arr[0];
  const matches = first && String(first.orderId) === String(expected.orderId) && Number(first.value) === Number(expected.value) && first.tipo === 'despesa';
  if (matches) {
    console.log('PASS: local fallback wrote cashFlowDetails entry as expected');
    console.log('written entry:', JSON.stringify(first, null, 2));
    process.exit(0);
  } else {
    console.error('FAIL: written entry does not match expected');
    console.error('expected:', expected);
    console.error('found:', first);
    process.exit(2);
  }
})();
