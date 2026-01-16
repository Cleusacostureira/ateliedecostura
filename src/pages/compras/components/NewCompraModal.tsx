import { useState } from 'react';
import { createCompra, CompraItem } from '../../../lib/compras';

export default function NewCompraModal({ onClose }: { onClose: () => void }) {
  const [data, setData] = useState(() => new Date().toISOString().slice(0,10));
  const [fornecedor, setFornecedor] = useState('');
  const [forma, setForma] = useState('dinheiro');
  const [status, setStatus] = useState('pago');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<CompraItem[]>([{ produto: '', tipo_material: '', quantidade: 1, unidade: 'un', valor_unitario: 0, valor_total: 0 }]);
  const [saving, setSaving] = useState(false);

  function updateItem(idx: number, patch: Partial<CompraItem>) {
    setItens((prev) => prev.map((it, i) => i === idx ? { ...it, ...patch, valor_total: (patch.quantidade ?? it.quantidade) * (patch.valor_unitario ?? it.valor_unitario) } : it));
  }

  function addItem() { setItens((s) => [...s, { produto: '', tipo_material: '', quantidade: 1, unidade: 'un', valor_unitario: 0, valor_total: 0 }]); }

  function removeItem(idx: number) { setItens((s) => s.filter((_, i) => i !== idx)); }

  const total = itens.reduce((sum, it) => sum + Number(it.valor_total || 0), 0);

  async function onSave(newAndClose = false) {
    setSaving(true);
    try {
      await createCompra({ data, fornecedor, valor_total: total, forma_pagamento: forma, status, observacoes, itens });
      if (newAndClose) onClose();
      else {
        // reset for new entry
        setFornecedor(''); setObservacoes(''); setItens([{ produto: '', tipo_material: '', quantidade: 1, unidade: 'un', valor_unitario: 0, valor_total: 0 }]);
      }
    } catch (e) { console.error(e); alert('Erro ao salvar compra'); }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl bg-white rounded p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-4 bg-rose-500 text-white flex items-center justify-between">
          <h2 className="text-lg font-medium">Nova Compra</h2>
          <button onClick={onClose} className="text-white">Fechar</button>
        </div>
        <div className="p-6">

        <div className="grid grid-cols-2 gap-3 mb-3">
          <label className="block">
            <div className="text-sm text-gray-600">Data</div>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} className="mt-1 input" />
          </label>
          <label className="block">
            <div className="text-sm text-gray-600">Fornecedor</div>
            <input value={fornecedor} onChange={(e) => setFornecedor(e.target.value)} className="mt-1 input" />
          </label>
        </div>

        <div className="space-y-2 mb-3">
          {itens.map((it, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
              <input className="col-span-4 input" placeholder="Produto/descrição" value={it.produto} onChange={(e) => updateItem(idx, { produto: e.target.value })} />
              <input className="col-span-2 input" placeholder="Tipo" value={it.tipo_material} onChange={(e) => updateItem(idx, { tipo_material: e.target.value })} />
              <input type="number" className="col-span-1 input" value={it.quantidade} onChange={(e) => updateItem(idx, { quantidade: Number(e.target.value) })} />
              <input className="col-span-1 input" value={it.unidade} onChange={(e) => updateItem(idx, { unidade: e.target.value })} />
              <input type="number" className="col-span-2 input" value={it.valor_unitario} onChange={(e) => updateItem(idx, { valor_unitario: Number(e.target.value) })} />
              <div className="col-span-1">R$ {it.valor_total?.toFixed(2)}</div>
              <div className="col-span-1">
                <button className="text-red-500" onClick={() => removeItem(idx)}>Remover</button>
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
          <button className="px-3 py-2 rounded border border-rose-500 text-rose-700" onClick={() => onSave(false)} disabled={saving}>Salvar e Nova</button>
          <button className="px-3 py-2 rounded bg-rose-500 text-white" onClick={() => onSave(true)} disabled={saving}>Salvar e Fechar</button>
        </div>
        </div>
      </div>
    </div>
  );
}
