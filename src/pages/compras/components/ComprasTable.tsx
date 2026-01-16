import { useState } from 'react';
import { deleteCompra } from '../../../lib/compras';

export default function ComprasTable({ compras, loading, onRefresh, onEdit }: { compras: any[]; loading: boolean; onRefresh: () => void; onEdit: (c:any)=>void }) {
  const [filter, setFilter] = useState('');

  async function onDelete(id: string) {
    if (!confirm('Confirma exclusão da compra? Essa ação removerá a despesa financeira vinculada.')) return;
    try {
      await deleteCompra(id);
      onRefresh();
    } catch (e) { console.error(e); alert('Erro ao excluir'); }
  }

  const rows = (compras || []).filter(c => {
    if (!filter) return true;
    return (c.fornecedor || '').toLowerCase().includes(filter.toLowerCase()) || (c.compras_itens || []).some((it:any)=> (it.produto||'').toLowerCase().includes(filter.toLowerCase()));
  });

  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <input placeholder="Buscar fornecedor ou produto" value={filter} onChange={(e)=>setFilter(e.target.value)} className="input w-64" />
        <div>{loading ? 'Carregando...' : `${rows.length} registros`}</div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th className="p-2">Data</th>
              <th className="p-2">Fornecedor</th>
              <th className="p-2">Produto</th>
              <th className="p-2">Tipo</th>
              <th className="p-2 text-right">Quantidade</th>
              <th className="p-2 text-right">Valor Total</th>
              <th className="p-2">Forma</th>
              <th className="p-2">Status</th>
              <th className="p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c:any) => (
              <tr key={c.id} className="border-t">
                <td className="p-2 align-top">{(c.data||'').slice(0,10)}</td>
                <td className="p-2 align-top">{c.fornecedor}</td>
                <td className="p-2 align-top">{(c.compras_itens||[]).map((it:any)=>it.produto).join(', ')}</td>
                <td className="p-2 align-top">{(c.compras_itens||[]).map((it:any)=>it.tipo_material).filter(Boolean).join(', ')}</td>
                <td className="p-2 align-top text-right">{(c.compras_itens||[]).reduce((s:any, it:any)=>s + (it.quantidade||0), 0)}</td>
                <td className="p-2 align-top text-right">R$ {(Number(c.valor_total)||0).toFixed(2)}</td>
                <td className="p-2 align-top">{c.forma_pagamento}</td>
                <td className="p-2 align-top">{c.status}</td>
                <td className="p-2 align-top">
                  <div className="flex gap-2">
                    <button className="text-blue-600 flex items-center gap-1" onClick={()=>onEdit(c)}>✏️ Editar</button>
                    <button className="text-red-600" onClick={()=>onDelete(c.id)}>Excluir</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
