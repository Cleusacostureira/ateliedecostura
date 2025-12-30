import { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';

export default function DisparosPage() {
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');

  const templates = [
    {
      id: 'lembrete',
      name: 'Lembrete de Entrega',
      message: 'Olá {nome}! Sua peça estará pronta amanhã ({data}). Aguardamos você! 😊',
    },
    {
      id: 'confirmacao',
      name: 'Confirmação de Recebimento',
      message: 'Olá {nome}! Confirmamos o recebimento da sua peça. Prazo de entrega: {data}. Obrigada! ✨',
    },
    {
      id: 'pronto',
      name: 'Peça Pronta',
      message: 'Olá {nome}! Sua peça já está pronta! Pode vir buscar quando quiser. 🎉',
    },
    {
      id: 'promocao',
      name: 'Promoção',
      message: 'Olá {nome}! Temos uma promoção especial para você! Entre em contato para saber mais. 💝',
    },
  ];

  const history = [
    { id: 1, date: '15/12/2024', time: '14:30', recipients: 5, template: 'Lembrete de Entrega', status: 'Enviado' },
    { id: 2, date: '14/12/2024', time: '10:15', recipients: 3, template: 'Peça Pronta', status: 'Enviado' },
    { id: 3, date: '13/12/2024', time: '16:45', recipients: 8, template: 'Confirmação de Recebimento', status: 'Enviado' },
    { id: 4, date: '12/12/2024', time: '11:20', recipients: 12, template: 'Promoção', status: 'Enviado' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0">
        <div className="p-3 lg:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 lg:mb-6 gap-2">
            <div>
              <h1 className="text-lg lg:text-2xl font-bold text-gray-900 mb-0.5 lg:mb-1">Disparos de Mensagens</h1>
              <p className="text-xs lg:text-sm text-gray-600">Envie mensagens automáticas para seus clientes</p>
            </div>
            <button
              onClick={() => setShowNewMessageModal(true)}
              className="flex items-center gap-1.5 lg:gap-2 px-3 lg:px-6 py-2 lg:py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm"
            >
              <i className="ri-send-plane-line text-base lg:text-xl w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center"></i>
              Novo Disparo
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6 mb-3 lg:mb-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-2.5 lg:p-6 border-b border-gray-200">
                <h2 className="text-sm lg:text-lg font-bold text-gray-900">Templates Disponíveis</h2>
              </div>
              <div className="p-2.5 lg:p-6 space-y-2 lg:space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-2.5 lg:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => setSelectedTemplate(template.id)}
                  >
                    <div className="flex items-start justify-between mb-1.5 lg:mb-2">
                      <h3 className="text-[10px] lg:text-sm font-semibold text-gray-900">{template.name}</h3>
                      <button className="text-rose-600 hover:text-rose-700 cursor-pointer">
                        <i className="ri-edit-line text-sm lg:text-lg w-3.5 h-3.5 lg:w-5 lg:h-5 flex items-center justify-center"></i>
                      </button>
                    </div>
                    <p className="text-[9px] lg:text-sm text-gray-600">{template.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-2.5 lg:p-6 border-b border-gray-200">
                <h2 className="text-sm lg:text-lg font-bold text-gray-900">Histórico de Envios</h2>
              </div>
              <div className="p-2.5 lg:p-6 space-y-2 lg:space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="p-2.5 lg:p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-start justify-between mb-1 lg:mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[10px] lg:text-sm font-semibold text-gray-900 truncate">{item.template}</h3>
                        <p className="text-[9px] lg:text-xs text-gray-600">
                          {item.date} às {item.time}
                        </p>
                      </div>
                      <span className="px-1.5 lg:px-2 py-0.5 lg:py-1 bg-green-100 text-green-700 rounded-full text-[8px] lg:text-xs font-medium whitespace-nowrap ml-2">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-[9px] lg:text-xs text-gray-600">
                      <i className="ri-user-line mr-0.5 lg:mr-1"></i>
                      {item.recipients} destinatários
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-2.5 lg:p-6 border-b border-gray-200">
              <h2 className="text-sm lg:text-lg font-bold text-gray-900">Estatísticas</h2>
            </div>
            <div className="p-2.5 lg:p-6">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
                <div className="p-2.5 lg:p-4 bg-gray-50 rounded-lg">
                  <div className="w-7 h-7 lg:w-10 lg:h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-1.5 lg:mb-2">
                    <i className="ri-send-plane-line text-sm lg:text-xl text-blue-600 w-3.5 h-3.5 lg:w-5 lg:h-5 flex items-center justify-center"></i>
                  </div>
                  <p className="text-[9px] lg:text-xs text-gray-600 mb-0.5">Total Enviado</p>
                  <p className="text-xs lg:text-xl font-bold text-gray-900">28</p>
                </div>

                <div className="p-2.5 lg:p-4 bg-gray-50 rounded-lg">
                  <div className="w-7 h-7 lg:w-10 lg:h-10 bg-green-100 rounded-lg flex items-center justify-center mb-1.5 lg:mb-2">
                    <i className="ri-check-double-line text-sm lg:text-xl text-green-600 w-3.5 h-3.5 lg:w-5 lg:h-5 flex items-center justify-center"></i>
                  </div>
                  <p className="text-[9px] lg:text-xs text-gray-600 mb-0.5">Entregues</p>
                  <p className="text-xs lg:text-xl font-bold text-gray-900">28</p>
                </div>

                <div className="p-2.5 lg:p-4 bg-gray-50 rounded-lg">
                  <div className="w-7 h-7 lg:w-10 lg:h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-1.5 lg:mb-2">
                    <i className="ri-eye-line text-sm lg:text-xl text-purple-600 w-3.5 h-3.5 lg:w-5 lg:h-5 flex items-center justify-center"></i>
                  </div>
                  <p className="text-[9px] lg:text-xs text-gray-600 mb-0.5">Visualizados</p>
                  <p className="text-xs lg:text-xl font-bold text-gray-900">24</p>
                </div>

                <div className="p-2.5 lg:p-4 bg-gray-50 rounded-lg">
                  <div className="w-7 h-7 lg:w-10 lg:h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-1.5 lg:mb-2">
                    <i className="ri-percent-line text-sm lg:text-xl text-amber-600 w-3.5 h-3.5 lg:w-5 lg:h-5 flex items-center justify-center"></i>
                  </div>
                  <p className="text-[9px] lg:text-xs text-gray-600 mb-0.5">Taxa de Abertura</p>
                  <p className="text-xs lg:text-xl font-bold text-gray-900">86%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Novo Disparo */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 lg:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 lg:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-base lg:text-xl font-bold text-gray-900">Novo Disparo de Mensagem</h2>
              <button
                onClick={() => setShowNewMessageModal(false)}
                className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
              >
                <i className="ri-close-line text-xl lg:text-2xl w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
              </button>
            </div>

            <div className="p-3 lg:p-6 space-y-3 lg:space-y-4">
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Template</label>
                <select className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs lg:text-sm cursor-pointer">
                  <option>Selecione um template</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Destinatários</label>
                <select className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs lg:text-sm cursor-pointer">
                  <option>Todos os clientes</option>
                  <option>Clientes com entrega hoje</option>
                  <option>Clientes com entrega amanhã</option>
                  <option>Clientes com peças prontas</option>
                  <option>Selecionar manualmente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Mensagem</label>
                <textarea
                  rows={5}
                  placeholder="Digite sua mensagem..."
                  className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs lg:text-sm resize-none"
                  maxLength={500}
                ></textarea>
                <p className="text-[9px] lg:text-xs text-gray-500 mt-1">
                  Use {'{nome}'} para o nome do cliente e {'{data}'} para a data de entrega
                </p>
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Agendar Envio</label>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3">
                  <input
                    type="date"
                    className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs lg:text-sm"
                  />
                  <input
                    type="time"
                    className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs lg:text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="p-3 lg:p-6 border-t border-gray-200 flex items-center justify-end gap-2 lg:gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowNewMessageModal(false)}
                className="px-3 lg:px-6 py-1.5 lg:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm"
              >
                Cancelar
              </button>
              <button className="px-3 lg:px-6 py-1.5 lg:py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm">
                Enviar Agora
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
