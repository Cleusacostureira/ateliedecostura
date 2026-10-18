import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { loadSettings, saveSettings } from '../lib/messages';

export type AtelieConfig = {
  nome: string;
  telefone: string;
  endereco: string;
  pixNome: string;
  pixChave: string;
  pixCpf: string;
};

export const PADRAO: AtelieConfig = {
  nome: 'Cleusa Ateliê de Costura',
  telefone: '45 99912-6130',
  endereco: '',
  pixNome: 'Cleusa Belani David',
  pixChave: '45 99912-6130',
  pixCpf: '641.667.240-53',
};

const CHAVE_LOCAL = 'atelie_config';
let atual: AtelieConfig = lerLocal();
const ouvintes = new Set<(c: AtelieConfig) => void>();

function lerLocal(): AtelieConfig {
  try { return { ...PADRAO, ...(JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '{}') || {}) }; } catch { return { ...PADRAO }; }
}
function avisar() { ouvintes.forEach(f => f(atual)); }

export const configAtual = () => atual;

/** Busca a configuração no banco (se existir) e atualiza a cópia local. */
export async function sincronizarConfig() {
  try {
    const { data } = await supabase.from('configuracoes').select('valor').eq('chave', 'atelie').limit(1).maybeSingle();
    const v = data?.valor;
    if (v) {
      const obj = typeof v === 'string' ? JSON.parse(v) : v;
      atual = { ...PADRAO, ...obj };
      localStorage.setItem(CHAVE_LOCAL, JSON.stringify(atual));
      avisar();
    }
  } catch { /* fica com a cópia local */ }
}

/** Salva no aparelho e tenta no banco. Retorna se ficou salvo no banco (vale para todos os aparelhos). */
export async function salvarConfig(c: AtelieConfig): Promise<boolean> {
  atual = { ...c };
  try { localStorage.setItem(CHAVE_LOCAL, JSON.stringify(atual)); } catch { /* ignora */ }
  try { const s = loadSettings(); saveSettings({ ...s, atelierName: c.nome }); } catch { /* ignora */ }
  avisar();
  try {
    const { error } = await supabase.from('configuracoes').upsert({ chave: 'atelie', valor: JSON.stringify(atual) }, { onConflict: 'chave' });
    return !error;
  } catch { return false; }
}

export function useAtelie(): AtelieConfig {
  const [c, setC] = useState(atual);
  useEffect(() => { ouvintes.add(setC); return () => { ouvintes.delete(setC); }; }, []);
  return c;
}

export const textoPix = (c: AtelieConfig = atual) =>
  `*DADOS PARA PAGAMENTO PIX:*\n*Nome:* ${c.pixNome}\n*Chave/Telefone:* ${c.pixChave}${c.pixCpf ? `\n*CPF:* ${c.pixCpf}` : ''}`;
