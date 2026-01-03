import { useState, useEffect } from 'react';
import { loadClients, upsertClient, deleteClient } from '../../lib/clients';
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
    async function fetch() {
      const list = await loadClients();
      if (!mounted) return;
      setClientes(list || []);
    }
    fetch();
    const h = async () => setClientes(await loadClients());
    window.addEventListener('clientsUpdated', h as any);
    return () => { mounted = false; window.removeEventListener('clientsUpdated', h as any); };
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

          {/* Lista de Clientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 lg:gap-4">
            {filteredClientes.map((cliente) => (
              <div key={cliente.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {cliente.foto ? (
                      <img src={cliente.foto} alt={cliente.nome} className="w-full h-full object-cover" />
                    ) : (
                      <i className="ri-user-line text-2xl text-gray-400"></i>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 onClick={() => openDetail(cliente)} className="text-sm lg:text-base font-semibold text-gray-900 truncate cursor-pointer">{cliente.nome}</h3>
                    <p className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                      <i className="ri-phone-line w-3 h-3 flex items-center justify-center"></i>
                      {cliente.telefone}
                    </p>
                    {cliente.cpf && (
                      <p className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
                        <i className="ri-id-card-line w-3 h-3 flex items-center justify-center"></i>
                        {cliente.cpf}
                      </p>
                    )}
                  </div>
                </div>

                {cliente.endereco && (
                  <p className="text-xs text-gray-600 mb-3 flex items-start gap-1">
                    <i className="ri-map-pin-line w-3 h-3 flex items-center justify-center mt-0.5 flex-shrink-0"></i>
                    <span className="line-clamp-2">{cliente.endereco}</span>
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-[10px] text-gray-500">Total Gasto</p>
                    <p className="text-sm font-semibold text-rose-600">R$ {cliente.totalGasto.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-500">Serviços</p>
                    <p className="text-sm font-semibold text-gray-900">{cliente.servicosRealizados}x</p>
                  </div>
                </div>

                {cliente.observacoes && (
                  <p className="text-xs text-gray-500 italic mb-3 line-clamp-2">{cliente.observacoes}</p>
                )}

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleEdit(cliente)}
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all text-xs font-medium whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-edit-line mr-1"></i>
                    Editar
                  </button>
                  <button 
                    onClick={() => handleDelete(cliente)}
                    className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all text-xs font-medium whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-delete-bin-line mr-1"></i>
                    Excluir
                  </button>
                </div>
              </div>
            ))}
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
