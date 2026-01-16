/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export function useCompanyLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem('company_logo_url');
    } catch {
      return null;
    }
  });

  useEffect(() => {
    let mounted = true;

    async function load() {
      // if in localStorage use it first
      try {
        const stored = localStorage.getItem('company_logo_url');
        if (stored) {
          setLogoUrl(stored);
        }
      } catch {}

      try {
        const res = await supabase.from('configuracoes').select('valor').eq('chave', 'company_logo').limit(1).maybeSingle();
        const data = (res as any).data;
        const error = (res as any).error;
        if (!error && data?.valor) {
          if (!mounted) return;
          // prefer signed_url if present (immediate access), otherwise use public url
          const urlBase = data.valor.signed_url || data.valor.url;
          if (urlBase) {
            const busted = `${urlBase}${urlBase.includes('?') ? '&' : '?'}v=${Date.now()}`;
            setLogoUrl(busted);
            try { localStorage.setItem('company_logo_url', busted); } catch {}
          }
        }
      } catch (err) {
        // ignore
      }
    }

    load();

    function onUpdate(ev?: Event) {
      try {
        // If a CustomEvent with detail.url was dispatched, use it immediately
        const custom = ev as CustomEvent | undefined;
        const detailUrl = custom && (custom.detail as any)?.url;
        if (detailUrl) {
          setLogoUrl(detailUrl);
          return;
        }

        // fallback to localStorage (storage event or manual updates)
        const stored = localStorage.getItem('company_logo_url');
        setLogoUrl(stored);
      } catch {}
    }

    window.addEventListener('companyLogoUpdated', onUpdate as EventListener);
    window.addEventListener('storage', onUpdate as EventListener);

    return () => {
      mounted = false;
      window.removeEventListener('companyLogoUpdated', onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, []);

  return logoUrl;
}
