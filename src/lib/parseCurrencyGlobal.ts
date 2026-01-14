// attach a global parseCurrency utility to window so legacy callers work without imports
function parseCurrencyImpl(raw: any) {
  try {
    if (raw === null || raw === undefined) return 0;
    if (typeof raw === 'number') return raw;
    let s = String(raw).trim();
    s = s.replace(/R\$/g, '').replace(/\s/g, '');
    if (s.indexOf('.') !== -1 && s.indexOf(',') !== -1) {
      s = s.replace(/\./g, '').replace(/,/g, '.');
    } else if (s.indexOf(',') !== -1 && s.indexOf('.') === -1) {
      s = s.replace(/,/g, '.');
    }
    let n = parseFloat(s);
    if (isNaN(n)) {
      const digits = String(raw).replace(/\D/g, '');
      if (!digits) return 0;
      if (digits.length <= 2) return parseFloat(digits) / 100;
      const reais = digits.slice(0, -2);
      const cents = digits.slice(-2);
      n = parseFloat(reais + '.' + cents);
    }
    return isNaN(n) ? 0 : n;
  } catch (e) { return 0; }
}

;(window as any).parseCurrency = parseCurrencyImpl;
export default parseCurrencyImpl;
