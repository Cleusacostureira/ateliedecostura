import { cx } from './index';
import { semAcento } from '../data/formato';

/**
 * Ícones de peças desenhados à mão (traço fino, 24×24), no estilo do app.
 * A peça é reconhecida pelo nome (ex.: "Calça jeans" → calça).
 */
const D: Record<string, string[]> = {
  camiseta: ['M8 3 4.5 5 2.5 9l3 1.5 1-1.5V21h11V9l1 1.5 3-1.5-2-4L16 3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3Z'],
  camisa: ['M8.5 3 5 4.5 3 8l-.5 7 2.5.5 1-5.5V21h12V10l1 5.5 2.5-.5L21 8l-2-3.5L15.5 3', 'M8.5 3 12 7l3.5-4', 'M12 7v14', 'M12 10.5h.01M12 13.5h.01M12 16.5h.01'],
  regata: ['M8.5 3c0 3 1.5 4.5 3.5 4.5S15.5 6 15.5 3', 'M8.5 3H7.2c0 3-1.7 5-2.2 6l.5 12h13l.5-12c-.5-1-2.2-3-2.2-6h-1.3'],
  calca: ['M6 3h12l1 18h-5l-2-12-2 12H5Z', 'M6 6h12', 'M12 6v3'],
  short: ['M5.5 4h13L20 15h-6l-2-5-2 5H4Z', 'M5.5 7h13'],
  saia: ['M8 4h8v3H8Z', 'M8 7 4 20h16L16 7', 'M10 7l-1.5 13M14 7l1.5 13'],
  vestido: ['M9 2.5V5L7 9l2 1.5L4.5 21h15L15 10.5 17 9l-2-4V2.5', 'M9 10.5h6'],
  macacao: ['M8 3v6M16 3v6', 'M7 9h10v4l1 8h-4.5L12 15l-1.5 6H6l1-8Z', 'M10 11h4'],
  casaco: ['M8.5 3 4 5.5 2.5 18l3 .5 1-6.5V21h11v-9l1 6.5 3-.5L20 5.5 15.5 3', 'M8.5 3 10 9l2 2 2-2 1.5-6', 'M12 11v10', 'M8.5 16h2'],
  moletom: ['M8.5 3 4 5.5 2.5 18l3 .5 1-6.5V21h11v-9l1 6.5 3-.5L20 5.5 15.5 3', 'M8.5 3c0 3.5 7 3.5 7 0', 'M9 14.5h6l-1 3h-4Z', 'M11 6.5v2.5M13 6.5v2.5'],
  intima: ['M3 8c2 0 4 3 4 5 2 0 3.5-1 5-2.5 1.5 1.5 3 2.5 5 2.5 0-2 2-5 4-5', 'M3 8l1-4M21 8l-1-4', 'M7 13c0 1.5 2 2.5 5 2.5s5-1 5-2.5'],
  infantil: ['M8 3 4 6l2 3 2-1v7c0 2 2 4 2 6h4c0-2 2-4 2-6V8l2 1 2-3-4-3c-1 1.5-2.5 2-4 2S9 4.5 8 3Z', 'M10.5 18.5h3'],
  uniforme: ['M9 3h6v4l4 1-1 13H6L5 8l4-1Z', 'M9 3c0 2 1.5 3 3 3s3-1 3-3', 'M9 14h6v3H9Z'],
  casa: ['M3 3h18', 'M5 3v18c2-3 3.5-8 4-18', 'M19 3v18c-2-3-3.5-8-4-18', 'M5 21h4M15 21h4'],
  toalha: ['M4 7h16v13H4Z', 'M4 7l3-3h10l3 3', 'M4 11h16', 'M4 17h16'],
  agulha: ['M18 3 7.5 13.5', 'M18 3l1 1-10.5 10.5', 'M16.5 4.2l1.3 1.3', 'M7.5 13.5c-2 2-4 4-2.5 5.5s3.5-.5 5.5-2.5c1.5-1.5 3 0 2 1.5', 'M4 20.5c3 0 4-1 4-1'],
};

const REGRAS: Array<[RegExp, keyof typeof D]> = [
  [/jardineira|macac|macaq/, 'macacao'],
  [/infantil|body|bebe/, 'infantil'],
  [/vestido|camisola|baby ?doll|pijama/, 'vestido'],
  [/saia/, 'saia'],
  [/calca|legging/, 'calca'],
  [/short|bermuda/, 'short'],
  [/moletom|capuz/, 'moletom'],
  [/casaco|jaqueta|blazer|parka|sobretudo|capa$|colete/, 'casaco'],
  [/camisa|polo/, 'camisa'],
  [/regata|cropped|top|bata|esportiva|academia/, 'regata'],
  [/lingerie|suti|calcinha|cueca|intima/, 'intima'],
  [/uniforme|jaleco|avental|hospitalar/, 'uniforme'],
  [/toalha|guardanapo|lencol|colcha|fronha|almofada/, 'toalha'],
  [/cortina/, 'casa'],
  [/camiseta|blusa/, 'camiseta'],
];

export function tipoDoIcone(nome: string): keyof typeof D {
  const n = semAcento(nome || '');
  return REGRAS.find(([re]) => re.test(n))?.[1] || 'agulha';
}

export function PecaSvg({ nome, className }: { nome: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {D[tipoDoIcone(nome)].map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/** Ícone dentro de um quadradinho rosado. */
export default function PecaIcone({ nome, tamanho = 'md', className }: { nome: string; tamanho?: 'sm' | 'md' | 'lg'; className?: string }) {
  const t = { sm: 'w-7 h-7 rounded-lg', md: 'w-10 h-10 rounded-xl', lg: 'w-12 h-12 rounded-2xl' }[tamanho];
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-7 h-7' }[tamanho];
  return (
    <span className={cx('inline-flex items-center justify-center shrink-0 bg-gradient-to-br from-at-blush to-at-soft text-at-wine border border-at-nude/60', t, className)} title={nome}>
      <PecaSvg nome={nome} className={s} />
    </span>
  );
}
