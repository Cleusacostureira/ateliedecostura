import { useState } from 'react';

interface ClienteModalProps {
  isOpen: boolean;
  onClose: () => void;
  cliente?: any;
  onSave: (cliente: any) => void;
}

export default function ClienteModal({ isOpen, onClose, cliente, onSave }: ClienteModalProps) {
  const [previewImage, setPreviewImage] = useState(cliente?.foto || '');
  const [status, setStatus] = useState(cliente?.status || 'ativo');
  const [pontos, setPontos] = useState(cliente?.pontos ?? 0);
  const [pontosMeta, setPontosMeta] = useState(cliente?.pontosMeta ?? 10);
  const [createdAt] = useState(cliente?.createdAt || new Date().toLocaleDateString('pt-BR'));

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const clienteData = {
      // do NOT generate a local id for new clients — let Supabase assign id
      id: cliente?.id ? cliente.id : undefined,
      nome: String(formData.get('nome') || '').trim(),
      telefone: String(formData.get('telefone') || '').trim(),
      cpf: String(formData.get('cpf') || '').trim(),
      endereco: String(formData.get('endereco') || '').trim(),
      foto: previewImage,
      observacoes: String(formData.get('observacoes') || '').trim(),
      totalGasto: cliente?.totalGasto || 0,
      servicosRealizados: cliente?.servicosRealizados || 0,
      pontos: pontos,
      pontosMeta: pontosMeta,
      status: status,
      createdAt: createdAt,
    };
    onSave(clienteData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg lg:text-xl font-bold text-gray-900">
            {cliente ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <i className="ri-close-line text-2xl"></i>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 lg:p-6 space-y-4">
          {/* Foto */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-gray-200">
                {previewImage ? (
                  <img src={previewImage} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <i className="ri-user-line text-4xl text-gray-400"></i>
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-rose-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-rose-700 transition-all">
                <i className="ri-camera-line text-white text-sm"></i>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageChange}
                />
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-2">Clique no ícone para adicionar foto</p>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
              Nome Completo <span className="text-red-500">*</span>
            </label>
            <input 
              type="text" 
              name="nome"
              defaultValue={cliente?.nome}
              required
              placeholder="Digite o nome completo" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" 
            />
          </div>

          {/* Telefone e CPF */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">
                Telefone / WhatsApp <span className="text-red-500">*</span>
              </label>
              <input 
                type="tel" 
                name="telefone"
                defaultValue={cliente?.telefone}
                required
                placeholder="(00) 00000-0000" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" 
              />
            </div>
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input 
                type="text" 
                name="cpf"
                defaultValue={cliente?.cpf}
                placeholder="000.000.000-00" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border rounded">
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Cadastro</label>
              <input type="text" value={createdAt} readOnly className="w-full px-3 py-2 border rounded bg-gray-50" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Pontos</label>
              <input type="number" value={pontos} onChange={(e) => setPontos(parseInt(e.target.value || '0'))} className="w-full px-3 py-2 border rounded" />
            </div>
            <div>
              <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Meta (pontos)</label>
              <input type="number" value={pontosMeta} onChange={(e) => setPontosMeta(parseInt(e.target.value || '10'))} className="w-full px-3 py-2 border rounded" />
            </div>
          </div>

          {/* Endereço */}
          <div>
            <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Endereço Completo</label>
            <input 
              type="text" 
              name="endereco"
              defaultValue={cliente?.endereco}
              placeholder="Rua, número, bairro, cidade - UF" 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" 
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea 
              name="observacoes"
              defaultValue={cliente?.observacoes}
              rows={3} 
              placeholder="Ex: Cliente frequente, prefere urgência..." 
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500"
            ></textarea>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
            >
              {cliente ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
