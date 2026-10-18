import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';

type Toast = { id: number; text: string; kind: 'ok' | 'erro' };
const ToastCtx = createContext<(text: string, kind?: 'ok' | 'erro') => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const show = useCallback((text: string, kind: 'ok' | 'erro' = 'ok') => {
    const id = Date.now() + Math.random();
    setItems(list => [...list, { id, text, kind }]);
    setTimeout(() => setItems(list => list.filter(t => t.id !== id)), kind === 'erro' ? 6000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {createPortal(
        <div className="fixed z-[200] left-1/2 -translate-x-1/2 bottom-24 lg:bottom-6 flex flex-col gap-2 w-[min(92vw,420px)] pointer-events-none">
          {items.map(t => (
            <div key={t.id} className={`pointer-events-auto flex items-start gap-2 px-4 py-3 rounded-xl shadow-lift text-sm animate-[sheetUp_.2s_ease-out] ${t.kind === 'erro' ? 'bg-red-700 text-white' : 'bg-at-ink text-white'}`}>
              {t.kind === 'erro' ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-300" />}
              <span>{t.text}</span>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);
