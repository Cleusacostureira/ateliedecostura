import { useEffect, useState } from 'react';
import { createCompra, updateCompra, CompraItem } from '../../../lib/compras';

export default function NewCompraModal({ onClose, compra }: { onClose: () => void; compra?: any }) {
  const [data, setData] = useState(() => new Date().toISOString().slice(0,10));
  const [fornecedor, setFornecedor] = useState('');
  const [forma, setForma] = useState('dinheiro');
  const [status, setStatus] = useState('pago');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<CompraItem[]>([{ produto: '', tipo_material: '', quantidade: '' as any, unidade: 'Un', valor_unitario: '', valor_total: 0 } as any]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!compra) return;
    setData((compra.data||'').slice(0,10) || new Date().toISOString().slice(0,10));
    setFornecedor(compra.fornecedor || '');
    setForma(compra.forma_pagamento || 'dinheiro');
    setStatus(compra.status || 'pago');
    setObservacoes(compra.observacoes || '');
    const mapped = (compra.compras_itens || compra.itens || []).map((it:any) => ({ produto: it.produto || '', tipo_material: it.tipo_material || '', quantidade: it.quantidade != null ? Number(it.quantidade) : '' as any, unidade: it.unidade || 'Un', valor_unitario: Number(it.valor_unitario||0), valor_total: Number(it.valor_total||0) }));
    setItens(mapped.length ? mapped : [{ produto: '', tipo_material: '', quantidade: '' as any, unidade: 'Un', valor_unitario: 0, valor_total: 0 }]);
  }, [compra]);

  function updateItem(idx: number, patch: Partial<CompraItem>) {
    setItens((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, ...patch } as any;
      const q = Number(next.quantidade || 0);
      const vu = Number(next.valor_unitario || 0);
      next.valor_total = q * vu;
      return next;
    }));
  }

  function addItem() { setItens((s) => [...s, { produto: '', tipo_material: '', quantidade: 1, unidade: 'Un', valor_unitario: '', valor_total: 0 } as any]); }

  function removeItem(idx: number) { setItens((s) => s.filter((_, i) => i !== idx)); }

  const total = itens.reduce((sum, it) => sum + Number(it.valor_total || 0), 0);

  async function onSave() {
    setSaving(true);
    try {
      const itensNormalized = (itens || []).map((it:any) => ({
        produto: it.produto || '',
        tipo_material: it.tipo_material || '',
        quantidade: Number(it.quantidade) || 0,
        unidade: it.unidade || 'un',
        valor_unitario: Number(it.valor_unitario) || 0,
        valor_total: Number(it.valor_total) || (Number(it.quantidade)||0) * (Number(it.valor_unitario)||0),
      }));

      if (compra && compra.id) {
        await updateCompra(compra.id, { data, fornecedor, valor_total: total, forma_pagamento: forma, status, observacoes, itens: itensNormalized });
      } else {
        await createCompra({ data, fornecedor, valor_total: total, forma_pagamento: forma, status, observacoes, itens: itensNormalized });
      }
      onClose();
    } catch (e) { console.error(e); alert('Erro ao salvar compra'); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl bg-white rounded p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-4 bg-rose-500 text-white flex items-center justify-between">
          <h2 className="text-lg font-medium">{compra ? 'Editar Compra' : 'Nova Compra'}</h2>
          <button onClick={onClose} className="text-white">Fechar</button>
        </div>
        <div className="p-6">

        <div className="space-y-3 mb-4">
          <label className="block">
            <div className="text-sm text-gray-600">Fornecedor</div>
            <input name="fornecedor" placeholder="Nome do fornecedor" value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} className="mt-1 input" />
          </label>

          <label className="block">
            <div className="text-sm text-gray-600">Data</div>
            <input name="data" type="date" value={data} onChange={(e) => setData(e.target.value)} className="mt-1 input" />
          </label>
        </div>

        <div className="space-y-4 mb-3">
          {itens.map((it, idx) => (
            <div key={idx} className="p-3 border rounded space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Item {idx+1}</div>
                <button className="text-red-500 text-sm" onClick={() => removeItem(idx)}>Remover</button>
              </div>
                <div>
                <input placeholder="Produto / descrição" className="input" value={it.produto} onChange={(e) => updateItem(idx, { produto: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input placeholder="Valor" type="number" inputMode="decimal" className="input" value={it.valor_unitario as any} onChange={(e) => updateItem(idx, { valor_unitario: e.target.value as any })} />
                <input placeholder="Quantidade" type="number" className="input" value={it.quantidade as any} onChange={(e) => updateItem(idx, { quantidade: Number(e.target.value) })} />
                <select className="input" value={it.unidade} onChange={(e) => updateItem(idx, { unidade: e.target.value })}>
                  <option value="Un">Un</option>
                  <option value="MT">MT</option>
                  <option value="Rolo">Rolo</option>
                  <option value="Kg">Kg</option>
                  <option value="Cm">Cm</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Tipo / categoria" className="input" value={it.tipo_material} onChange={(e) => updateItem(idx, { tipo_material: e.target.value })} />
                <div className="flex items-center justify-end">R$ {(Number(it.valor_total) || 0).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between mb-4">
          <button className="bg-rose-100 text-rose-700 px-3 py-1 rounded" onClick={addItem}>Adicionar Item</button>
          <div className="text-right">
            <div className="text-sm text-gray-600">Total</div>
            <div className="text-xl font-bold">R$ {total.toFixed(2)}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <label>
            <div className="text-sm text-gray-600">Forma de pagamento</div>
            <select value={forma} onChange={(e) => setForma(e.target.value)} className="mt-1 input">
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">Pix</option>
              <option value="cartao">Cartão</option>
              <option value="prazo">Prazo</option>
            </select>
          </label>
          <label>
            <div className="text-sm text-gray-600">Status</div>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-1 input">
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
            </select>
          </label>
        </div>

        <label className="block mb-4">
          <div className="text-sm text-gray-600">Observações</div>
          <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} className="mt-1 input" />
        </label>

        <div className="flex gap-2 justify-end">
          <button className="px-3 py-2 rounded bg-rose-500 text-white" onClick={() => onSave()} disabled={saving}>Salvar e Fechar</button>
        </div>
        </div>
      </div>
    </div>
  );
}
