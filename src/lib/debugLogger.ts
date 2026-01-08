export function debugLog(...args: any[]) {
  try {
    const w = window as any;
    w.__appDebugLogs = w.__appDebugLogs || [];
    try { w.__appDebugLogs.push({ ts: new Date().toISOString(), args }); } catch (e) { w.__appDebugLogs.push({ ts: new Date().toISOString(), args: String(args) }); }
    // still call console.debug so developer tools show messages when available
    try { console.debug(...args); } catch (e) {}
  } catch (e) { /* ignore */ }
}

export function getDebugBuffer() {
  try { return (window as any).__appDebugLogs || []; } catch (e) { return []; }
}
