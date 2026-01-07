import { useState, useEffect } from 'react';
import { loadClients, upsertClient, deleteClient } from '../../lib/clients';
import { supabase } from '../../lib/supabaseClient';
import ClienteModal from './components/ClienteModal';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../../components/layout/Sidebar';

export default function ClientesPage() {
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientes, setClientes] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const enrichAndSet = async (baseClients: any[]) => {
      let clients = baseClients || [];
      try {
        const ids = (clients || []).map(c => c.id).filter(Boolean);
        let ordersFromServer: any[] = [];
        if (supabase && ids.length > 0) {
          const r = await supabase.from('ordens').select('cliente_id,total,notas').in('cliente_id', ids as any[]);
          if (!(r as any).error && Array.isArray((r as any).data)) ordersFromServer = (r as any).data;
        }

        let localOrders: any[] = [];
        try { const raw = localStorage.getItem('orders'); localOrders = raw ? JSON.parse(raw) : []; } catch(e) { localOrders = []; }

        const map: Record<string, { total: number; count: number }> = {};
        const accumulate = (clienteId: string, amt: number, cnt: number) => {
          if (!clienteId) return;
          if (!map[clienteId]) map[clienteId] = { total: 0, count: 0 };
          map[clienteId].total += Number(amt || 0);
          map[clienteId].count += Number(cnt || 0);
        };

        const processOrderRow = (o: any) => {
          try {
            const cid = String(o.cliente_id || '');
            if (!cid) return; // skip orders without cliente_id
            let piecesCount = 0;
            let piecesSum = 0;
            try {
              const notas = o.notas ? (typeof o.notas === 'string' ? JSON.parse(o.notas) : o.notas) : {};
              const pieces = notas?.pieces || notas?.pecas || [];
              if (Array.isArray(pieces) && pieces.length > 0) {
                piecesCount = pieces.length;
                piecesSum = pieces.reduce((acc:any, p:any) => {
                  try {
                    const svc = (p.services || []);
                    const sumSvc = Array.isArray(svc) ? svc.reduce((s:any, it:any) => s + (Number(it.value || it.valor || 0) || 0), 0) : 0;
                    return acc + sumSvc;
                  } catch (e) { return acc; }
                }, 0);
              }
            } catch (e) { /* ignore */ }
            if (piecesCount === 0) {
              let t = Number(o.total || 0) || 0;
              try {
                const notas2 = o.notas ? (typeof o.notas === 'string' ? JSON.parse(o.notas) : o.notas) : {};
                const sv = notas2?.services || notas2?.servicos || [];
                if (Array.isArray(sv) && sv.length > 0) {
                  t = sv.reduce((s:any, it:any) => s + (Number(it.value || it.valor || 0) || 0), 0);
                }
              } catch (e) {}
              accumulate(cid, t, piecesCount);
            } else {
              accumulate(cid, piecesSum, piecesCount);
            }
          } catch (e) { /* ignore order */ }
        };

        const seenOrders = new Set<string>();
        (ordersFromServer || []).forEach(o => { try { const id = String(o.id || o.numero || ''); if (!id) return; seenOrders.add(id); processOrderRow(o); } catch(e){} });
        (localOrders || []).forEach(o => { try { const id = String(o.id || o.numero || ''); if (!id) return; if (seenOrders.has(id)) return; seenOrders.add(id); processOrderRow(o); } catch(e){} });

        clients = (clients || []).map(c => ({ ...c, totalGasto: map[c.id]?.total || Number(c.totalGasto || 0) || 0, servicosRealizados: map[c.id]?.count || c.servicosRealizados || 0 }));
        // sort alphabetically by name
        clients = (clients || []).slice().sort((a:any,b:any) => String((a.nome||'')).localeCompare(String((b.nome||''))));
      } catch (e) { console.warn('failed to enrich clients with orders totals', e); }
      if (mounted) setClientes(clients || []);
    };

    (async () => {
      const list = await loadClients();
      if (!mounted) return;
      await enrichAndSet(list || []);
    })();

    const onClientsUpdated = async () => {
      const list = await loadClients();
      await enrichAndSet(list || []);
    };
    const onOrdersUpdated = async () => {
      const list = await loadClients();
      await enrichAndSet(list || []);
    };

    window.addEventListener('clientsUpdated', onClientsUpdated as any);
    window.addEventListener('ordersUpdated', onOrdersUpdated as any);
    return () => { mounted = false; window.removeEventListener('clientsUpdated', onClientsUpdated as any); window.removeEventListener('ordersUpdated', onOrdersUpdated as any); };
  }, []);

  const handleEdit = (cliente: any) => {
    setSelectedCliente(cliente);
    setShowModal(true);
  };

  const openDetail = (cliente: any) => {
    navigate(`/clientes/${cliente.id}`);
  };

  const handleDelete = (cliente: any) => {
    setSelectedCliente(cliente);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    (async () => {
      try {
        if (selectedCliente?.id) await deleteClient(String(selectedCliente.id));
      } catch (e) { console.warn('delete client failed', e); }
      const list = await loadClients();
      setClientes(list || []);
      setShowDeleteModal(false);
      setSelectedCliente(null);
    })();
  };

  const handleSave = (clienteData: any) => {
    (async () => {
      try {
        await upsertClient(clienteData as any);
        alert('Cliente Cadastrado com Sucesso');
      } catch (e) { console.warn('upsert client failed', e); }
      const list = await loadClients();
      setClientes(list || []);
      setSelectedCliente(null);
      setShowModal(false);
    })();
  };

  const filteredClientes = clientes.filter(cliente => {
    const nome = (cliente.nome || '').toString().toLowerCase();
    const tel = (cliente.telefone || '').toString();
    return nome.includes(searchTerm.toLowerCase()) || tel.includes(searchTerm);
  });

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0">
        <div className="p-3 lg:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 lg:mb-6 gap-2">
            <div>
              <h1 className="text-lg lg:text-2xl font-bold text-gray-900 mb-0.5 lg:mb-1">Clientes</h1>
              <p className="text-xs lg:text-sm text-gray-600">Gerencie sua base de clientes</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-1.5 lg:gap-2 px-3 lg:px-6 py-2 lg:py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm"
            >
              <i className="ri-add-line text-base lg:text-xl w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center"></i>
              Novo Cliente
            </button>
          </div>

          {/* Busca */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 lg:p-4 mb-4 lg:mb-6">
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 lg:px-4 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
          </div>

          {/* Lista de Clientes em Tabela */}
          <div className="bg-white rounded-lg border border-gray-200 p-3 lg:p-4 overflow-auto">
            <table className="w-full min-w-[640px] table-auto">
              <thead>
                <tr className="text-left text-xs lg:text-sm text-gray-600">
                  <th className="py-2 px-3">Cliente</th>
                  <th className="py-2 px-3">Telefone</th>
                  <th className="py-2 px-3">Total Gasto</th>
                  <th className="py-2 px-3">Serviços</th>
                  <th className="py-2 px-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredClientes.map((cliente) => (
                  <tr key={cliente.id} className="border-t last:border-b hover:bg-gray-50">
                    <td className="py-3 px-3 align-top">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {cliente.foto ? (
                            <img src={cliente.foto} alt={cliente.nome} className="w-full h-full object-cover" />
                          ) : (
                            <i className="ri-user-line text-base text-gray-400"></i>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div onClick={() => openDetail(cliente)} className="text-sm lg:text-base font-semibold text-gray-900 truncate cursor-pointer">{cliente.nome}</div>
                          {cliente.cpf && <div className="text-xs text-gray-500">{cliente.cpf}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 align-top text-sm text-gray-700">{cliente.telefone || '-'}</td>
                    <td className="py-3 px-3 align-top text-sm font-semibold text-rose-600">R$ {(Number(cliente.totalGasto) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="py-3 px-3 align-top text-sm text-gray-900">{cliente.servicosRealizados || 0}x</td>
                    <td className="py-3 px-3 align-top text-sm">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(cliente)} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-xs font-medium">Editar</button>
                        <button onClick={() => handleDelete(cliente)} className="px-3 py-1 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-xs font-medium">Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredClientes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 px-3 text-center text-sm text-gray-500">Nenhum cliente encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Cliente */}
        <ClienteModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedCliente(null);
          }}
          cliente={selectedCliente}
          onSave={handleSave}
        />

        {/* Modal Excluir */}
        {showDeleteModal && selectedCliente && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="p-4 lg:p-6">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <i className="ri-delete-bin-line text-2xl text-red-600"></i>
                </div>
                <h2 className="text-lg lg:text-xl font-bold text-gray-900 text-center mb-2">Excluir Cliente</h2>
                <p className="text-sm text-gray-600 text-center mb-6">
                  Tem certeza que deseja excluir <strong>{selectedCliente.nome}</strong>? Esta ação não pode ser desfeita.
                </p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
