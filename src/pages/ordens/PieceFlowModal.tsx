import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import PiecePreview from '../../components/PiecePreview';

type PieceResult = {
  id: string;
  tipo: string;
  cor?: string;
  modelo?: string;
  services: Array<{ id?: string; name: string; price: number }>;
  icone?: string;
}

export default function PieceFlowModal({ open, onClose, onDone, servicesCatalog, allTipos, clientName, colorMap, initialTipo, initialCor, initialModelo }: { open: boolean; onClose: ()=>void; onDone: (p: PieceResult, opts?: { keepOpen?: boolean })=>void; servicesCatalog?: any[]; allTipos?: Array<{ nome: string; icone: string }>; clientName?: string; colorMap?: Record<string,string>; initialTipo?: string; initialCor?: string; initialModelo?: string }) {
  const [step, setStep] = useState(1);
  const [selectedTipo, setSelectedTipo] = useState<string>(initialTipo || '');
  const [selectedCor, setSelectedCor] = useState<string>(initialCor || '');
  const [otherColor, setOtherColor] = useState<string>('');
  const [modelo, setModelo] = useState<string>(initialModelo || '');
  const [availableServices, setAvailableServices] = useState<any[]>(servicesCatalog || []);
  const [serverLoading, setServerLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<Array<{ id?: string; name: string; price: number }>>([]);
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');

  useEffect(()=>{ if (open) reset(); },[open]);
  const reset = () => {
    setStep(1);
    setSelectedTipo(initialTipo || '');
    setSelectedCor(initialCor || '');
    setOtherColor('');
    setModelo(initialModelo || '');
    setSelectedServices([]);
    setNewServiceName(''); setNewServicePrice('');
  }

  const PREDEFINED: Array<{ key:string; nome:string; icone:string }> = (allTipos && Array.isArray(allTipos) ? (allTipos as any).map((t:any,i:number)=>({ key: String(i), nome: t.nome, icone: t.icone })) : [
    { key:'calca', nome:'Calça', icone:'👖' },
    { key:'vestido', nome:'Vestido', icone:'👗' },
    { key:'camisa', nome:'Camisa', icone:'👔' },
    { key:'blusa', nome:'Blusa', icone:'👚' },
    { key:'camiseta', nome:'Camiseta', icone:'👕' },
    { key:'shorts', nome:'Shorts', icone:'🩳' },
    { key:'outra', nome:'Outra', icone:'➕' }
  ]);
  const COLORS = (colorMap && Object.keys(colorMap)) || ['Preto','Branco','Azul','Vermelho','Verde','Amarelo','Rosa','Bege','Cinza','Marrom'];
  const COLOR_MAP: Record<string,string> = colorMap || {
    Preto: '#000000',
    Branco: '#ffffff',
    Cinza: '#9CA3AF',
    Azul: '#3B82F6',
    Vermelho: '#EF4444',
    Verde: '#10B981',
    Amarelo: '#F59E0B',
    Rosa: '#EC4899',
    Bege: '#F5DEB3',
    Marrom: '#8B4513',
  };
  const [showAllIcons, setShowAllIcons] = useState(false);

  const toggleService = (svc:any) => {
    const exists = selectedServices.find(s=> (s.id && svc.id && s.id===svc.id) || s.name===svc.name);
    if (exists) setSelectedServices(prev=>prev.filter(s=>!( (s.id && svc.id && s.id===svc.id) || s.name===svc.name)));
    else setSelectedServices(prev=>[...prev, { id: svc.id, name: svc.titulo || svc.name || svc.title || svc.nome || svc.name, price: Number(svc.preco || svc.price || svc.valor || 0) }]);
  }

  const addInlineService = () => {
    if (!newServiceName) return;
    const s = { id: `local-s-${Date.now()}`, name: newServiceName, price: Number(Number(newServicePrice||0).toFixed(2)) };
    setAvailableServices(prev=>[s, ...prev]);
    setSelectedServices(prev=>[...prev, s]);
    setNewServiceName(''); setNewServicePrice('');
  }

  useEffect(() => {
    try {
      if (Array.isArray(servicesCatalog) && servicesCatalog.length > 0) {
        setAvailableServices(servicesCatalog);
        return;
      }
      // try localStorage first
      const raw = localStorage.getItem('services');
      if (raw) {
        try { const parsed = JSON.parse(raw); if (Array.isArray(parsed) && parsed.length>0) { setAvailableServices(parsed); return; } } catch (e) {}
      }
      // try Supabase if available (also provide explicit reload button in UI)
      (async () => {
        try {
          const configured = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
          if (!configured) {
            // don't attempt server fetch when not configured
            const sampleServices = [ { id: `s-${Date.now()}-1`, titulo: 'Bainha', preco: 35 }, { id: `s-${Date.now()}-2`, titulo: 'Ajuste de cintura', preco: 50 } ];
            try { setAvailableServices(sampleServices); localStorage.setItem('services', JSON.stringify(sampleServices)); } catch (e) {}
            return;
          }
          setServerLoading(true); setServerError(null);
          const res = await supabase.from('servicos').select('*').order('titulo', { ascending: true });
          setServerLoading(false);
          if ((res as any).error) {
            setServerError(String((res as any).error.message || (res as any).error));
          } else if (Array.isArray((res as any).data) && (res as any).data.length > 0) {
            setAvailableServices((res as any).data || []);
            try { localStorage.setItem('services', JSON.stringify((res as any).data || [])); } catch(_){}
            return;
          } else {
            const sampleServices = [ { id: `s-${Date.now()}-1`, titulo: 'Bainha', preco: 35 }, { id: `s-${Date.now()}-2`, titulo: 'Ajuste de cintura', preco: 50 } ];
            try { setAvailableServices(sampleServices); localStorage.setItem('services', JSON.stringify(sampleServices)); } catch (e) {}
          }
        } catch (e) {
          setServerLoading(false);
          setServerError(String(e));
        }
      })();
    } catch (e) { }
  }, [servicesCatalog, open]);

  // ensure we attempt server load when modal opens (explicit fetch is available too)
  useEffect(() => {
    if (open) {
      try { fetchServicesFromServer(); } catch (e) {}
    }
  }, [open]);

  const fetchServicesFromServer = async () => {
    try {
      setServerLoading(true); setServerError(null);
      const res = await supabase.from('servicos').select('*').order('titulo', { ascending: true });
      setServerLoading(false);
      if ((res as any).error) {
        setServerError(String((res as any).error.message || (res as any).error));
        return;
      }
      if (Array.isArray((res as any).data)) {
        setAvailableServices((res as any).data || []);
        try { localStorage.setItem('services', JSON.stringify((res as any).data || [])); } catch(_){}
      }
    } catch (e:any) { setServerLoading(false); setServerError(String(e || 'unknown')); }
  }

    // SVG fallback icons map for consistent coloring (monochrome SVGs)
    const SVG_ICONS: Record<string,string> = {
      '👕': '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 2l2 2h8l2-2 1 6-3 2v8h-14v-8l-3-2 1-6z"/></svg>',
      '👖': '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M6 2v18h3l2-6 2 6h3v-18h-10z"/></svg>',
      '👗': '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3 6 5 2-4 8h-8l-4-8 5-2 3-6z"/></svg>',
      '👔': '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l4 5-4 3-4-3 4-5zm0 10v10"/></svg>',
      '🧥': '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M4 3v18h16v-18l-3 2-5-1-5 1-3-2z"/></svg>',
      '🧵': '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="8"/></svg>'
    };
  const subtotal = () => selectedServices.reduce((s,svc)=> s + Number(svc.price || 0), 0);

  const iconsize = 'text-4xl';

  const confirmPiece = (keepOpen: boolean = false) => {
    if (!selectedTipo) return;
    const id = `local-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    const piece = { id, tipo: selectedTipo, cor: selectedCor || (otherColor||undefined), modelo: modelo||undefined, services: selectedServices, icone: (PREDEFINED.find(p=>p.nome===selectedTipo)||{icone:'🧵'}).icone };
    try { onDone(piece, { keepOpen }); } catch (e) {}
    if (keepOpen) {
      // reset modal to allow adding another piece
      reset();
      setStep(1);
      return;
    }
    onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-white w-full h-full overflow-auto p-4 sm:rounded-none">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Adicionar Peça</h2>
          <button onClick={onClose} className="text-gray-600">Fechar</button>
        </div>

        <div className="min-h-[60vh] flex flex-col lg:flex-row gap-4">
          {/* Left: seleção / etapas */}
          <div className="lg:w-2/3">
            {step===1 && (
              <div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                  {(showAllIcons ? PREDEFINED : PREDEFINED.slice(0,12)).map(p=> (
                    <button key={p.key} onClick={()=>{ setSelectedTipo(p.nome); setStep(2); }} className="flex flex-col items-center p-4 border rounded hover:shadow">
                      <div className={`w-20 h-20 flex items-center justify-center rounded bg-gray-100 ${iconsize}`}>{p.icone}</div>
                      <div className="mt-2 text-sm">{p.nome}</div>
                    </button>
                  ))}
                </div>
                {!showAllIcons && PREDEFINED.length > 12 && (
                  <div className="mt-3">
                    <button onClick={()=>setShowAllIcons(true)} className="px-3 py-2 border rounded">Mostrar mais</button>
                  </div>
                )}
              </div>
            )}

            {step===2 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Qual a cor da peça?</h3>
                <div className="flex flex-wrap gap-3 mb-4">
                  {COLORS.map(c=> (
                    <button key={c} onClick={()=>{ setSelectedCor(c); setOtherColor(''); setStep(3); }} className="w-12 h-12 rounded-full flex items-center justify-center border" aria-label={c} title={c} style={{ backgroundColor: COLOR_MAP[c] || undefined }}>
                      {!COLOR_MAP[c] || (COLOR_MAP[c] && COLOR_MAP[c].toLowerCase() === '#ffffff') ? <div className="w-3 h-3 rounded-full border"></div> : null}
                    </button>
                  ))}
                  <div className="flex items-center gap-2">
                    <input placeholder="Outra cor" value={otherColor} onChange={e=>setOtherColor(e.target.value)} className="border p-2 rounded" />
                    <button onClick={()=>{ if (!otherColor) return; setSelectedCor(otherColor); setStep(3); }} className="px-3 py-2 bg-rose-500 text-white rounded">OK</button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>setStep(1)} className="px-3 py-2 border rounded">Voltar</button>
                </div>
              </div>
            )}

            {step===3 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Modelo / Observações (opcional)</h3>
                <textarea value={modelo} onChange={e=>setModelo(e.target.value)} placeholder="Ex: Jeans, Social, Com rasgos..." className="w-full border p-3 rounded mb-3" />
                <div className="flex gap-2">
                  <button onClick={()=>setStep(2)} className="px-3 py-2 border rounded">Voltar</button>
                  <button onClick={()=>setStep(4)} className="px-3 py-2 bg-rose-500 text-white rounded">Avançar</button>
                </div>
              </div>
            )}

            {step===4 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Quais serviços serão feitos nessa peça?</h3>
                <div className="mb-3">
                      <div className="flex gap-2 mb-2 items-center">
                    <input placeholder="Nome do serviço" value={newServiceName} onChange={e=>{ setNewServiceName(e.target.value); setServiceSearch(e.target.value); }} onKeyDown={async (e)=>{
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const q = (serviceSearch||newServiceName||'').toLowerCase().trim();
                          const filtered = (availableServices||[]).filter(s=> ((s.titulo||s.name||s.title||'')+ '').toLowerCase().includes(q));
                          if (filtered.length > 0) {
                            // select first match
                            toggleService(filtered[0]);
                            setNewServiceName(''); setServiceSearch('');
                            return;
                          }
                          // create new if no match
                          addInlineService();
                        }
                      }} className="border p-2 rounded flex-1" />
                    <input placeholder="Valor" value={newServicePrice} onChange={e=>setNewServicePrice(e.target.value)} className="border p-2 rounded w-24" />
                    <button onClick={addInlineService} className="px-3 py-2 bg-green-600 text-white rounded">+ Cadastrar</button>
                        <button onClick={fetchServicesFromServer} className="px-3 py-2 border rounded text-sm">Carregar do servidor</button>
                        {serverLoading && <div className="text-xs text-gray-500">Carregando...</div>}
                        {serverError && <div className="text-xs text-red-600">Erro: {serverError}</div>}
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-auto">
                    {((availableServices||[]).filter(s=> {
                      const q = (serviceSearch||'').toLowerCase().trim();
                      const title = ((s.titulo||s.name||s.title||s.nome)||'').toLowerCase();
                      return !q || title.includes(q);
                    })).map(s=> (
                      <label key={s.id||s.name} onClick={()=>toggleService(s)} className="flex items-center justify-between border p-2 rounded cursor-pointer">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" readOnly checked={!!selectedServices.find(ss=> ss.id===s.id || ss.name=== (s.titulo||s.name||s.title||s.nome))} />
                          <div>
                            <div className="font-medium">{s.titulo||s.name||s.title||s.nome}</div>
                            <div className="text-sm text-gray-500">R$ {Number(s.preco||s.price||s.valor||0).toFixed(2)}</div>
                          </div>
                        </div>
                        <div>
                          {selectedServices.find(ss=> ss.id===s.id || ss.name=== (s.titulo||s.name||s.title||s.nome)) && (
                            <input type="number" value={String((selectedServices.find(ss=> ss.id===s.id || ss.name=== (s.titulo||s.name||s.title||s.nome))||{price:0}).price)} onChange={e=>{
                              const v = Number(e.target.value||0);
                              setSelectedServices(prev=>prev.map(it=> (it.id===s.id || it.name===(s.titulo||s.name||s.title||s.nome)) ? { ...it, price: v } : it));
                            }} className="w-24 border p-1 rounded" />
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="mb-3">Subtotal: <strong>R$ {subtotal().toFixed(2)}</strong></div>
                <div className="flex gap-2">
                  <button onClick={()=>setStep(3)} className="px-3 py-2 border rounded">Voltar</button>
                  <button onClick={()=>setStep(5)} className="px-3 py-2 bg-rose-500 text-white rounded">Avançar</button>
                </div>
              </div>
            )}

            {step===5 && (
              <div>
                <h3 className="text-lg font-semibold mb-3">Confirmação da peça</h3>
                <div className="border rounded p-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded text-2xl">{(PREDEFINED.find(p=>p.nome===selectedTipo)||{icone:'🧵'}).icone}</div>
                    <div>
                      <div className="font-medium">{selectedTipo}</div>
                      <div className="text-sm text-gray-500">Cor: {selectedCor || otherColor || '-'}</div>
                      <div className="text-sm text-gray-500">Modelo: {modelo || '-'}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="font-medium">Serviços:</div>
                    {(selectedServices||[]).length===0 ? <div className="text-sm text-gray-500">Nenhum</div> : (
                      <ul className="list-disc pl-5">
                        {selectedServices.map(s=> (<li key={s.id||s.name}>{s.name} — R$ {Number(s.price||0).toFixed(2)}</li>))}
                      </ul>
                    )}
                  </div>
                  <div className="mt-3 font-semibold">Subtotal: R$ {subtotal().toFixed(2)}</div>
                </div>
                <div className="flex gap-2">
                  <button onClick={()=>setStep(4)} className="px-3 py-2 border rounded">Voltar</button>
                  <button onClick={()=>{ /* add piece and keep modal open for adding another */ confirmPiece(true); }} className="px-3 py-2 bg-rose-500 text-white rounded">Adicionar e Continuar</button>
                  <button onClick={()=>{ confirmPiece(false); }} className="px-3 py-2 bg-green-600 text-white rounded">Adicionar e Finalizar</button>
                </div>
              </div>
            )}
          </div>

          {/* Right: preview */}
          <div className="lg:w-1/3 border rounded p-4 bg-gray-50">
            <div className="text-sm font-medium mb-2">Prévia da Peça</div>
              <div className="mb-2">
                <div className="text-lg font-bold text-blue-600">{clientName || '-'}</div>
              </div>
            <div>
              <div className="mb-2">
                <div className="text-lg font-bold text-blue-600">{clientName || '-'}</div>
              </div>
              <PiecePreview pieceType={selectedTipo} color={(COLOR_MAP && selectedCor) ? (COLOR_MAP[selectedCor] || selectedCor) : (otherColor || undefined)} services={selectedServices} />
              <div className="mt-3 text-sm"><strong>Tipo:</strong> {selectedTipo || '-'}</div>
              <div className="text-sm"><strong>Cor:</strong> {selectedCor || otherColor || '-'}</div>
              <div className="text-sm"><strong>Modelo:</strong> {modelo || '-'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
