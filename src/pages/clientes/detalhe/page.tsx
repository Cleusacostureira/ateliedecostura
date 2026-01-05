import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Sidebar from '../../../components/layout/Sidebar';
import { getClientById, loadClients, upsertClient } from '../../../lib/clients';

const loadOrders = () => {
  try {
    const raw = localStorage.getItem('orders');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) { return []; }
};

export default function ClienteDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [editObservacoes, setEditObservacoes] = useState('');

  useEffect(() => {
    if (!id) return;
    const c = getClientById(id);
    setClient(c);
    const all = loadOrders().filter((o: any) => o.client === (c?.nome));
    const sorted = all.slice().sort((a:any,b:any) => {
      const pa = a.dateOut?.split('/').reverse().join('-') || '';
      const pb = b.dateOut?.split('/').reverse().join('-') || '';
      return pb.localeCompare(pa);
    });
    setOrders(sorted);
    setEditObservacoes(c?.observacoes || '');
  }, [id]);

  if (!client) return (
    <div className="flex min-h-screen bg-gray-50"><Sidebar /><main className="flex-1 lg:ml-56 p-8">Cliente não encontrado</main></div>
  );

  const totalGasto = orders.reduce((s,o) => s + (parseCurrency(o.value ?? o.valor ?? 0) || 0), 0);
  const servicos = orders.length;
  const ticket = servicos ? (totalGasto / servicos) : 0;

  const saveObservacoes = () => {
    const updated = { ...client, observacoes: editObservacoes };
    upsertClient(updated);
    setClient(updated);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{client.nome}</h1>
            <p className="text-sm text-gray-600">{client.telefone} • {client.cpf}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/clientes')} className="px-3 py-2 border rounded">Voltar</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border">
            <h3 className="text-sm font-semibold text-gray-700">Resumo</h3>
            <p className="text-xs text-gray-500 mt-2">Total gasto</p>
            <p className="text-lg font-bold text-rose-600">R$ {totalGasto.toFixed(2)}</p>
            <p className="text-xs text-gray-500 mt-2">Serviços realizados</p>
            <p className="text-sm font-semibold text-gray-900">{servicos}x</p>
            <p className="text-xs text-gray-500 mt-2">Ticket médio</p>
            <p className="text-sm font-semibold text-green-600">R$ {ticket.toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Histórico de Ordens</h3>
            </div>
            <div className="space-y-2">
              {orders.map((o:any) => (
                <div key={o.id} className="p-3 bg-gray-50 rounded flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{o.service}</div>
                    <div className="text-xs text-gray-500">{o.dateOut} • {o.status}</div>
                  </div>
                  <div className="text-sm font-bold text-green-600">{o.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Preferências / Observações</h3>
          <textarea value={editObservacoes} onChange={(e) => setEditObservacoes(e.target.value)} className="w-full p-2 border rounded" rows={3}></textarea>
          <div className="mt-3 flex gap-2">
            <button onClick={saveObservacoes} className="px-3 py-2 bg-rose-600 text-white rounded">Salvar</button>
            <button onClick={() => { setEditObservacoes(client.observacoes || ''); }} className="px-3 py-2 border rounded">Cancelar</button>
          </div>
        </div>
      </main>
    </div>
  );
}
