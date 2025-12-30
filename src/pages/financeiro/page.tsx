import { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';

export default function FinanceiroPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('mes');
  const [showPendingPayments, setShowPendingPayments] = useState(false);
  const [showCobrancaModal, setShowCobrancaModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showConfirmPaymentModal, setShowConfirmPaymentModal] = useState(false);

  // Dados de clientes com pagamentos pendentes
  const [pendingPayments, setPendingPayments] = useState([
    { 
      id: 1, 
      client: 'Ana Costa', 
      phone: '11965432109',
      service: 'Troca de Zíper', 
      value: 45.00, 
      date: '14/12/2024',
      daysLate: 3
    },
    { 
      id: 2, 
      client: 'Lucas Ferreira', 
      phone: '11932109876',
      service: 'Ajuste de Blazer', 
      value: 95.00, 
      date: '12/12/2024',
      daysLate: 5
    },
    { 
      id: 3, 
      client: 'Juliana Rocha', 
      phone: '11921098765',
      service: 'Barra de Vestido', 
      value: 50.00, 
      date: '10/12/2024',
      daysLate: 7
    },
  ]);

  // Fluxo de caixa detalhado por cliente e serviço
  const [cashFlowDetails, setCashFlowDetails] = useState([
    { id: 1, client: 'Maria Silva', service: 'Barra de Calça', value: 35.00, date: '15/12/2024', type: 'receita', status: 'Pago' },
    { id: 2, client: 'João Santos', service: 'Ajuste de Vestido', value: 80.00, date: '16/12/2024', type: 'receita', status: 'Pago' },
    { id: 3, client: 'Ana Costa', service: 'Troca de Zíper', value: 45.00, date: '14/12/2024', type: 'receita', status: 'Pendente' },
    { id: 4, client: 'Pedro Oliveira', service: 'Conserto Geral', value: 120.00, date: '15/12/2024', type: 'receita', status: 'Pago' },
    { id: 5, client: 'Carla Mendes', service: 'Barra de Calça', value: 35.00, date: '13/12/2024', type: 'receita', status: 'Pago' },
    { id: 6, client: 'Lucas Ferreira', service: 'Ajuste de Blazer', value: 95.00, date: '12/12/2024', type: 'receita', status: 'Pendente' },
    { id: 7, client: 'Juliana Rocha', service: 'Barra de Vestido', value: 50.00, date: '10/12/2024', type: 'receita', status: 'Pendente' },
    { id: 8, client: 'Roberto Lima', service: 'Troca de Botões', value: 25.00, date: '12/12/2024', type: 'receita', status: 'Pago' },
  ]);

  const handleCobranca = (client: any) => {
    const message = `Olá ${client.client}! 😊\n\n*Cleusa Ateliê de Costura*\n\nEsperamos que sua peça tenha ficado perfeita!\n\nGostaríamos de lembrá-lo(a) sobre o pagamento pendente do serviço realizado:\n\n*Serviço:* ${client.service}\n*Valor:* R$ ${client.value.toFixed(2)}\n*Data:* ${client.date}\n\n*DADOS PARA PAGAMENTO PIX:*\n\n*Nome:* Cleusa Belani David\n*Telefone:* 45999126130\n*CPF:* 64166724053\n\nContamos com sua compreensão e aguardamos seu pagamento.\n\nQualquer dúvida, estamos à disposição! ✨`;
    
    setSelectedClient({ ...client, message });
    setShowCobrancaModal(true);
  };

  const handleConfirmPayment = (client: any) => {
    setSelectedClient(client);
    setShowConfirmPaymentModal(true);
  };

  const confirmPayment = () => {
    // Remove da lista de pendentes
    setPendingPayments(pendingPayments.filter(p => p.id !== selectedClient.id));
    
    // Atualiza no fluxo de caixa detalhado
    setCashFlowDetails(cashFlowDetails.map(item => 
      item.client === selectedClient.client && item.service === selectedClient.service && item.status === 'Pendente'
        ? { ...item, status: 'Pago' }
        : item
    ));
    
    setShowConfirmPaymentModal(false);
    setSelectedClient(null);
  };

  const handleRowClick = (item: any) => {
    if (item.status === 'Pendente') {
      setSelectedClient(item);
      setShowConfirmPaymentModal(true);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Mensagem copiada!');
  };

  const openWhatsApp = () => {
    if (!selectedClient) return;
    const message = encodeURIComponent(selectedClient.message);
    const phone = selectedClient.phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    setShowCobrancaModal(false);
  };

  const totalPending = pendingPayments.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0">
        <div className="p-3 lg:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 lg:mb-6 gap-2">
            <div>
              <h1 className="text-lg lg:text-2xl font-bold text-gray-900 mb-0.5 lg:mb-1">Financeiro</h1>
              <p className="text-xs lg:text-sm text-gray-600">Controle suas receitas e despesas</p>
            </div>
            <div className="flex gap-1.5 lg:gap-2">
              <button
                onClick={() => setSelectedPeriod('semana')}
                className={`px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedPeriod === 'semana'
                    ? 'bg-rose-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setSelectedPeriod('mes')}
                className={`px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedPeriod === 'mes'
                    ? 'bg-rose-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Mês
              </button>
              <button
                onClick={() => setSelectedPeriod('ano')}
                className={`px-2.5 lg:px-4 py-1.5 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all whitespace-nowrap cursor-pointer ${
                  selectedPeriod === 'ano'
                    ? 'bg-rose-500 text-white'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Ano
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-6 mb-3 lg:mb-6">
            <div className="bg-white rounded-lg p-2.5 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-1.5 lg:gap-2">
                <div className="w-7 h-7 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="ri-arrow-up-line text-sm lg:text-2xl text-green-600 w-3.5 h-3.5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-[9px] lg:text-sm text-gray-600 mb-0.5">Receitas</p>
                  <p className="text-xs lg:text-2xl font-bold text-gray-900">R$ 8.450</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-2.5 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-1.5 lg:gap-2">
                <div className="w-7 h-7 lg:w-12 lg:h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <i className="ri-arrow-down-line text-sm lg:text-2xl text-red-600 w-3.5 h-3.5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-[9px] lg:text-sm text-gray-600 mb-0.5">Despesas</p>
                  <p className="text-xs lg:text-2xl font-bold text-gray-900">R$ 2.340</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-2.5 lg:p-6 border border-gray-200">
              <div className="flex flex-col gap-1.5 lg:gap-2">
                <div className="w-7 h-7 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="ri-wallet-line text-sm lg:text-2xl text-blue-600 w-3.5 h-3.5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-[9px] lg:text-sm text-gray-600 mb-0.5">Lucro</p>
                  <p className="text-xs lg:text-2xl font-bold text-gray-900">R$ 6.110</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPendingPayments(!showPendingPayments)}
              className="bg-white rounded-lg p-2.5 lg:p-6 border-2 border-amber-200 hover:border-amber-300 transition-all cursor-pointer text-left"
            >
              <div className="flex flex-col gap-1.5 lg:gap-2">
                <div className="w-7 h-7 lg:w-12 lg:h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <i className="ri-time-line text-sm lg:text-2xl text-amber-600 w-3.5 h-3.5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                </div>
                <div>
                  <p className="text-[9px] lg:text-sm text-gray-600 mb-0.5">A Receber</p>
                  <p className="text-xs lg:text-2xl font-bold text-gray-900">R$ {totalPending.toFixed(2)}</p>
                  <p className="text-[8px] lg:text-xs text-amber-600 font-medium mt-0.5">
                    {pendingPayments.length} {pendingPayments.length === 1 ? 'cliente' : 'clientes'}
                  </p>
                </div>
              </div>
            </button>
          </div>

          {/* Lista de Pagamentos Pendentes */}
          {showPendingPayments && (
            <div className="bg-white rounded-lg border-2 border-amber-200 mb-3 lg:mb-6 animate-fadeIn">
              <div className="p-3 lg:p-6 border-b border-amber-200 bg-amber-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm lg:text-lg font-bold text-gray-900">Pagamentos Pendentes</h2>
                    <p className="text-xs lg:text-sm text-gray-600 mt-0.5">Clientes com valores em aberto</p>
                  </div>
                  <button
                    onClick={() => setShowPendingPayments(false)}
                    className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-all cursor-pointer"
                  >
                    <i className="ri-close-line text-lg lg:text-xl w-4 h-4 lg:w-5 lg:h-5 flex items-center justify-center"></i>
                  </button>
                </div>
              </div>
              <div className="p-3 lg:p-6 space-y-2 lg:space-y-3">
                {pendingPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 lg:p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-xs lg:text-sm font-bold text-gray-900">{payment.client}</p>
                        {payment.daysLate > 5 && (
                          <span className="px-1.5 lg:px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[8px] lg:text-xs font-bold whitespace-nowrap">
                            {payment.daysLate} dias
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] lg:text-sm text-gray-700">{payment.service}</p>
                      <p className="text-[9px] lg:text-xs text-gray-500">Vencimento: {payment.date}</p>
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-xs lg:text-base font-bold text-amber-700 mb-2">R$ {payment.value.toFixed(2)}</p>
                      <div className="flex gap-1.5 lg:gap-2">
                        <button
                          onClick={() => handleCobranca(payment)}
                          className="px-2 lg:px-3 py-1 lg:py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all text-[9px] lg:text-xs font-medium whitespace-nowrap cursor-pointer flex items-center gap-1"
                        >
                          <i className="ri-message-3-line text-xs lg:text-sm w-3 h-3 lg:w-4 lg:h-4 flex items-center justify-center"></i>
                          Cobrar
                        </button>
                        <button
                          onClick={() => handleConfirmPayment(payment)}
                          className="px-2 lg:px-3 py-1 lg:py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-[9px] lg:text-xs font-medium whitespace-nowrap cursor-pointer flex items-center gap-1"
                        >
                          <i className="ri-check-line text-xs lg:text-sm w-3 h-3 lg:w-4 lg:h-4 flex items-center justify-center"></i>
                          Pago
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-6 mb-3 lg:mb-6">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-2.5 lg:p-6 border-b border-gray-200">
                <h2 className="text-sm lg:text-lg font-bold text-gray-900">Receitas Recentes</h2>
              </div>
              <div className="p-2.5 lg:p-6 space-y-2 lg:space-y-4">
                {[
                  { client: 'Maria Silva', service: 'Barra de Calça', value: 'R$ 35,00', date: '15/12/2024', status: 'Pago' },
                  { client: 'João Santos', service: 'Ajuste de Vestido', value: 'R$ 80,00', date: '16/12/2024', status: 'Pago' },
                  { client: 'Ana Costa', service: 'Troca de Zíper', value: 'R$ 45,00', date: '14/12/2024', status: 'Pendente' },
                  { client: 'Pedro Oliveira', service: 'Conserto Geral', value: 'R$ 120,00', date: '15/12/2024', status: 'Pago' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 lg:p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] lg:text-sm font-medium text-gray-900 truncate">{item.client}</p>
                      <p className="text-[9px] lg:text-xs text-gray-600 truncate">{item.service}</p>
                      <p className="text-[8px] lg:text-xs text-gray-500">{item.date}</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-[10px] lg:text-sm font-bold text-gray-900">{item.value}</p>
                      <span className={`text-[8px] lg:text-xs px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full whitespace-nowrap ${
                        item.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-2.5 lg:p-6 border-b border-gray-200">
                <h2 className="text-sm lg:text-lg font-bold text-gray-900">Despesas Recentes</h2>
              </div>
              <div className="p-2.5 lg:p-6 space-y-2 lg:space-y-4">
                {[
                  { description: 'Linha de costura', category: 'Material', value: 'R$ 45,00', date: '14/12/2024' },
                  { description: 'Zíperes diversos', category: 'Material', value: 'R$ 120,00', date: '13/12/2024' },
                  { description: 'Energia elétrica', category: 'Conta', value: 'R$ 180,00', date: '10/12/2024' },
                  { description: 'Botões e aviamentos', category: 'Material', value: 'R$ 85,00', date: '12/12/2024' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 lg:p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] lg:text-sm font-medium text-gray-900 truncate">{item.description}</p>
                      <p className="text-[9px] lg:text-xs text-gray-600">{item.category}</p>
                      <p className="text-[8px] lg:text-xs text-gray-500">{item.date}</p>
                    </div>
                    <div className="text-right ml-2 flex-shrink-0">
                      <p className="text-[10px] lg:text-sm font-bold text-red-600">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Fluxo de Caixa Detalhado */}
          <div className="bg-white rounded-lg border border-gray-200 mb-3 lg:mb-6">
            <div className="p-2.5 lg:p-6 border-b border-gray-200">
              <h2 className="text-sm lg:text-lg font-bold text-gray-900">Fluxo de Caixa Detalhado</h2>
              <p className="text-xs lg:text-sm text-gray-600 mt-0.5">Movimentações por cliente e serviço - Clique nos pendentes para marcar como pago</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-[9px] lg:text-xs font-medium text-gray-600 uppercase tracking-wider">Data</th>
                    <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-[9px] lg:text-xs font-medium text-gray-600 uppercase tracking-wider">Cliente</th>
                    <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-[9px] lg:text-xs font-medium text-gray-600 uppercase tracking-wider">Serviço</th>
                    <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-[9px] lg:text-xs font-medium text-gray-600 uppercase tracking-wider">Valor</th>
                    <th className="px-3 lg:px-6 py-2 lg:py-3 text-left text-[9px] lg:text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cashFlowDetails.map((item) => (
                    <tr 
                      key={item.id} 
                      onClick={() => handleRowClick(item)}
                      className={`transition-colors ${
                        item.status === 'Pendente' 
                          ? 'hover:bg-amber-50 cursor-pointer' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 lg:px-6 py-2 lg:py-4 whitespace-nowrap text-[9px] lg:text-sm text-gray-600">{item.date}</td>
                      <td className="px-3 lg:px-6 py-2 lg:py-4 whitespace-nowrap text-[10px] lg:text-sm font-medium text-gray-900">{item.client}</td>
                      <td className="px-3 lg:px-6 py-2 lg:py-4 whitespace-nowrap text-[9px] lg:text-sm text-gray-700">{item.service}</td>
                      <td className="px-3 lg:px-6 py-2 lg:py-4 whitespace-nowrap text-[10px] lg:text-sm font-bold text-green-600">
                        R$ {item.value.toFixed(2)}
                      </td>
                      <td className="px-3 lg:px-6 py-2 lg:py-4 whitespace-nowrap">
                        <span className={`px-1.5 lg:px-2 py-0.5 lg:py-1 rounded-full text-[8px] lg:text-xs font-medium whitespace-nowrap ${
                          item.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Modal de Cobrança */}
      {showCobrancaModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 lg:p-6">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-message-3-line text-2xl text-amber-600 w-6 h-6 flex items-center justify-center"></i>
              </div>
              <h2 className="text-base lg:text-xl font-bold text-gray-900 text-center mb-2">Mensagem de Cobrança</h2>
              <p className="text-xs text-gray-600 text-center mb-3">
                Envie uma mensagem respeitosa de cobrança via WhatsApp
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-[40vh] overflow-y-auto">
                <p className="text-xs lg:text-sm text-gray-900 whitespace-pre-line">{selectedClient.message}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCobrancaModal(false)}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-xs lg:text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => copyToClipboard(selectedClient.message)}
                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-xs lg:text-sm font-medium whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="ri-file-copy-line text-base lg:text-lg w-4 h-4 flex items-center justify-center"></i>
                  Copiar
                </button>
                <button 
                  onClick={openWhatsApp}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-xs lg:text-sm font-medium whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="ri-whatsapp-line text-base lg:text-lg w-4 h-4 flex items-center justify-center"></i>
                  WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Pagamento */}
      {showConfirmPaymentModal && selectedClient && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 lg:p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-check-double-line text-2xl text-green-600 w-6 h-6 flex items-center justify-center"></i>
              </div>
              <h2 className="text-base lg:text-xl font-bold text-gray-900 text-center mb-2">Confirmar Pagamento</h2>
              <p className="text-xs text-gray-600 text-center mb-4">
                Confirmar que o pagamento foi recebido?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Cliente:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedClient.client}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Serviço:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedClient.service}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Valor:</span>
                  <span className="text-sm font-bold text-green-600">R$ {selectedClient.value.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmPayment}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
