import React from 'react';

type Service = { name: string; price: number };

const CalcaSVG = ({ color }: { color?: string }) => (
  <svg width="140" height="180" viewBox="0 0 180 260" xmlns="http://www.w3.org/2000/svg">
    <path d="M40 10 H140 L120 250 H90 L80 120 L70 250 H40 Z" fill={color || 'transparent'} stroke={color ? '#444' : '#9CA3AF'} strokeWidth="2" />
  </svg>
);

const VestidoSVG = ({ color }: { color?: string }) => (
  <svg width="140" height="180" viewBox="0 0 180 260" xmlns="http://www.w3.org/2000/svg">
    <path d="M90 10 L120 60 L160 80 L140 250 H40 L20 80 L60 60 Z" fill={color || 'transparent'} stroke={color ? '#444' : '#9CA3AF'} strokeWidth="2" />
  </svg>
);

const CamisaSVG = ({ color }: { color?: string }) => (
  <svg width="140" height="140" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
    <path d="M30 10 H150 L160 60 L140 90 H40 L20 60 Z" fill={color || 'transparent'} stroke={color ? '#444' : '#9CA3AF'} strokeWidth="2" />
  </svg>
);

const Placeholder = () => (
  <div className="w-36 h-44 rounded-md flex items-center justify-center bg-gray-100 text-sm text-gray-500">Selecione uma peça para visualizar</div>
);

const normalizeType = (t?: string) => {
  if (!t) return '';
  // normalize and remove combining diacritics in a widely-compatible way
  const noDiacritics = String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return noDiacritics.replace(/\s+/g, '').replace(/[^a-z]/g, '');
}

export default function PiecePreview({ pieceType, color, services }: { pieceType?: string; color?: string; services?: Service[] }) {
  const type = normalizeType(pieceType);
  const renderPiece = () => {
    if (!type) return <Placeholder />;
    // more flexible matching to accept variations like 'jaqueta', 'casaco', 'calças' etc.
    if (type.includes('calca') || type.includes('calc') || type.includes('pants') || type.includes('trouser') ) return <CalcaSVG color={color || undefined} />;
    if (type.includes('vest') || type.includes('vestido') || type.includes('dress')) return <VestidoSVG color={color || undefined} />;
    if (type.includes('camis') || type.includes('camisa') || type.includes('blusa') || type.includes('camiset') || type.includes('jaquet') || type.includes('casac')) return <CamisaSVG color={color || undefined} />;
    if (type.includes('short') || type.includes('bermuda')) return <CalcaSVG color={color || undefined} />;
    // fallback: if any alphabetic chars exist, try CamisaSVG as a generic silhouette
    if (/[a-z]/.test(type)) return <CamisaSVG color={color || undefined} />;
    return <Placeholder />;
  }

  const subtotal = (services || []).reduce((s, it) => s + Number(it.price || 0), 0);

  return (
    <div className="w-full">
      <div className="flex items-center justify-center mb-3 bg-gray-100 p-3 rounded">{renderPiece()}</div>
      <div className="mt-2">
        <div className="text-sm font-medium">Serviços</div>
        <div className="text-sm max-h-28 overflow-auto">
          {(services || []).length === 0 ? <div className="text-gray-500">Nenhum</div> : (
            <ul className="list-disc pl-5">
              {(services || []).map((s, i) => (<li key={i}>{s.name} — R$ {Number(s.price||0).toFixed(2)}</li>))}
            </ul>
          )}
        </div>
        <div className="mt-3 font-semibold">Subtotal: R$ {subtotal.toFixed(2)}</div>
      </div>
    </div>
  )
}
