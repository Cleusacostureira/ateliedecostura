import { useState } from 'react';
import Sidebar from '../../components/layout/Sidebar';

export default function OrdensPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('mes');
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showMaterialsModal, setShowMaterialsModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialQuantity, setMaterialQuantity] = useState('1');
  const [materialPrice, setMaterialPrice] = useState('');
  const [orderMaterials, setOrderMaterials] = useState<any[]>([]);
  const [showFidelizacaoModal, setShowFidelizacaoModal] = useState(false);
  const [fidelizacaoMessage, setFidelizacaoMessage] = useState('');
  const [clientePhone, setClientePhone] = useState('');
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [orderServices, setOrderServices] = useState<any[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceValue, setServiceValue] = useState('');
  const [serviceObservation, setServiceObservation] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAdvancePaymentModal, setShowAdvancePaymentModal] = useState(false);

  const [orders, setOrders] = useState([
    { id: 'OS-1234', client: 'Maria Silva', phone: '11987654321', category: '👖 Barras', service: 'Barra de Calça', value: 'R$ 35,00', status: 'Em andamento', dateIn: '15/12/2024', dateOut: '20/12/2024', priority: 'normal', paymentStatus: null },
    { id: 'OS-1235', client: 'João Santos', phone: '11976543210', category: '👗 Vestidos', service: 'Ajuste de Vestido', value: 'R$ 80,00', status: 'Em fila', dateIn: '16/12/2024', dateOut: '22/12/2024', priority: 'normal', paymentStatus: null },
    { id: 'OS-1236', client: 'Ana Costa', phone: '11965432109', category: '🧵 Consertos Gerais', service: 'Troca de Zíper', value: 'R$ 45,00', status: 'Finalizado', dateIn: '14/12/2024', dateOut: '18/12/2024', priority: 'urgente', paymentStatus: null },
    { id: 'OS-1237', client: 'Pedro Oliveira', phone: '11954321098', category: '🧵 Consertos Gerais', service: 'Conserto Geral', value: 'R$ 120,00', status: 'Em andamento', dateIn: '15/12/2024', dateOut: '25/12/2024', priority: 'normal', paymentStatus: null },
    { id: 'OS-1238', client: 'Carla Mendes', phone: '11943210987', category: '👖 Barras', service: 'Barra de Calça', value: 'R$ 35,00', status: 'Entregue', dateIn: '13/12/2024', dateOut: '17/12/2024', priority: 'normal', paymentStatus: 'Pago' },
    { id: 'OS-1239', client: 'Lucas Ferreira', phone: '11932109876', category: '👔 Roupas Sociais', service: 'Ajuste de Blazer', value: 'R$ 95,00', status: 'Em fila', dateIn: '17/12/2024', dateOut: '23/12/2024', priority: 'urgente', paymentStatus: null },
    { id: 'OS-1240', client: 'Juliana Rocha', phone: '11921098765', category: '👗 Vestidos', service: 'Barra de Vestido', value: 'R$ 50,00', status: 'Em andamento', dateIn: '16/12/2024', dateOut: '21/12/2024', priority: 'normal', paymentStatus: null },
    { id: 'OS-1241', client: 'Roberto Lima', phone: '11910987654', category: '🧵 Consertos Gerais', service: 'Troca de Botões', value: 'R$ 25,00', status: 'Finalizado', dateIn: '12/12/2024', dateOut: '16/12/2024', priority: 'normal', paymentStatus: null },
  ]);

  const [clientes] = useState([
    { id: 1, nome: 'Maria Silva', telefone: '(11) 98765-4321', phone: '11987654321' },
    { id: 2, nome: 'João Santos', telefone: '(11) 97654-3210', phone: '11976543210' },
    { id: 3, nome: 'Ana Costa', telefone: '(11) 96543-2109', phone: '11965432109' },
    { id: 4, nome: 'Pedro Oliveira', telefone: '(11) 95432-1098', phone: '11954321098' },
    { id: 5, nome: 'Carla Mendes', telefone: '(11) 94321-0987', phone: '11943210987' },
  ]);

  const servicosDisponiveis = [
    { id: 1, name: 'Barra de Calça', category: '👖 Barras', price: 35.00 },
    { id: 2, name: 'Barra Italiana', category: '👖 Barras', price: 45.00 },
    { id: 3, name: 'Ajuste de Vestido', category: '👗 Vestidos', price: 80.00 },
    { id: 4, name: 'Barra de Vestido', category: '👗 Vestidos', price: 50.00 },
    { id: 5, name: 'Troca de Zíper', category: '🧵 Consertos Gerais', price: 45.00 },
    { id: 6, name: 'Troca de Botões', category: '🧵 Consertos Gerais', price: 25.00 },
    { id: 7, name: 'Ajuste de Blazer', category: '👔 Roupas Sociais', price: 95.00 },
    { id: 8, name: 'Ajuste de Calça Social', category: '👔 Roupas Sociais', price: 60.00 },
  ];

  const handleEdit = (order: any) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const handleDelete = (order: any) => {
    setSelectedOrder(order);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    setOrders(orders.filter(o => o.id !== selectedOrder.id));
    setShowDeleteModal(false);
    setSelectedOrder(null);
  };

  const handleAddMaterials = (order: any) => {
    setSelectedOrder(order);
    setShowMaterialsModal(true);
  };

  const handleDeliver = (order: any) => {
    setSelectedOrder(order);
    setShowDeliverModal(true);
  };

  const handleAdvancePayment = (order: any) => {
    setSelectedOrder(order);
    setShowAdvancePaymentModal(true);
  };

  const confirmAdvancePayment = () => {
    setOrders(orders.map(o => 
      o.id === selectedOrder.id 
        ? { ...o, paymentStatus: 'Pago' }
        : o
    ));
    setShowAdvancePaymentModal(false);
    setSelectedOrder(null);
  };

  const confirmDeliver = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR');
    const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    setOrders(orders.map(o => 
      o.id === selectedOrder.id 
        ? { ...o, status: 'Finalizado', deliveryDate: dateStr, deliveryTime: timeStr }
        : o
    ));
    
    // Mensagem de fidelização - Peça pronta para retirada
    // Se já foi pago, não inclui dados do PIX
    const isPaid = selectedOrder.paymentStatus === 'Pago';
    
    const paymentInfo = isPaid 
      ? '\n✅ *Pagamento já realizado!*\n\nAguardamos você! ✨'
      : `\n\n*DADOS PARA PAGAMENTO PIX:*\n\n*Nome:* Cleusa Belani David\n*Telefone:* 45999126130\n*CPF:* 64166724053\n\nAguardamos você! ✨`;
    
    setFidelizacaoMessage(`Olá ${selectedOrder.client}! 🎉\n\n*Cleusa Ateliê de Costura*\n\nSua peça já está pronta e pode ser retirada!\n\nServiço: ${selectedOrder.service}\nValor: ${selectedOrder.value}${paymentInfo}`);
    setClientePhone(selectedOrder.phone);
    setShowFidelizacaoModal(true);
    
    setShowDeliverModal(false);
  };

  const handleMaterialSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const materialId = e.target.value;
    setSelectedMaterialId(materialId);
    
    if (materialId) {
      const material = availableMaterials.find(m => m.id === parseInt(materialId));
      if (material) {
        setMaterialPrice(material.price.toFixed(2));
      }
    } else {
      setMaterialPrice('');
    }
  };

  const addMaterial = () => {
    if (!selectedMaterialId || !materialQuantity || parseFloat(materialQuantity) <= 0) {
      alert('Por favor, selecione um material e informe a quantidade');
      return;
    }

    const material = availableMaterials.find(m => m.id === parseInt(selectedMaterialId));
    if (!material) return;

    const quantity = parseFloat(materialQuantity);
    const price = parseFloat(materialPrice);
    const total = quantity * price;

    const newMaterial = {
      id: Date.now(),
      materialId: material.id,
      name: material.name,
      unit: material.unit,
      quantity: quantity,
      unitPrice: price,
      total: total
    };

    setOrderMaterials([...orderMaterials, newMaterial]);
    
    // Limpar campos
    setSelectedMaterialId('');
    setMaterialQuantity('1');
    setMaterialPrice('');
  };

  const removeMaterial = (id: number) => {
    setOrderMaterials(orderMaterials.filter(m => m.id !== id));
  };

  const getTotalMaterials = () => {
    return orderMaterials.reduce((sum, m) => sum + m.total, 0);
  };

  const handleServiceSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const serviceId = e.target.value;
    setSelectedServiceId(serviceId);
    
    if (serviceId) {
      const service = servicosDisponiveis.find(s => s.id === parseInt(serviceId));
      if (service) {
        setServiceValue(service.price.toFixed(2));
      }
    } else {
      setServiceValue('');
    }
  };

  const addService = () => {
    if (!selectedServiceId || !serviceValue || parseFloat(serviceValue) <= 0) {
      alert('Por favor, selecione um serviço e informe o valor');
      return;
    }

    const service = servicosDisponiveis.find(s => s.id === parseInt(selectedServiceId));
    if (!service) return;

    const newService = {
      id: Date.now(),
      serviceId: service.id,
      name: service.name,
      category: service.category,
      value: parseFloat(serviceValue),
      observation: serviceObservation
    };

    setOrderServices([...orderServices, newService]);
    
    // Limpar campos
    setSelectedServiceId('');
    setServiceValue('');
    setServiceObservation('');
  };

  const removeService = (id: number) => {
    setOrderServices(orderServices.filter(s => s.id !== id));
  };

  const getTotalServices = () => {
    return orderServices.reduce((sum, s) => sum + s.value, 0);
  };

  const isOrderLate = (dateOut: string, status: string) => {
    if (status === 'Finalizado' || status === 'Entregue') return false;
    
    const [day, month, year] = dateOut.split('/');
    const deliveryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return deliveryDate < today;
  };

  const createNewOrder = () => {
    if (orderServices.length === 0) {
      alert('Adicione pelo menos um serviço à ordem');
      return;
    }

    const totalValue = getTotalServices();
    const servicesText = orderServices.map(s => s.name).join(', ');
    
    const newOrder = {
      id: `OS-${1242 + orders.length}`,
      client: 'Novo Cliente',
      phone: '11999999999',
      category: orderServices[0].category,
      service: servicesText,
      value: `R$ ${totalValue.toFixed(2)}`,
      status: 'Em fila',
      dateIn: new Date().toLocaleDateString('pt-BR'),
      dateOut: '25/12/2024',
      priority: 'normal'
    };

    setOrders([...orders, newOrder]);
    
    // Mensagem de fidelização - Serviço recebido
    setFidelizacaoMessage(`Olá ${newOrder.client}! 😊\n\n*Cleusa Ateliê de Costura*\n\nSeu serviço foi recebido e está em andamento!\n\nServiço: ${servicesText}\nPrazo de entrega: ${newOrder.dateOut}\nValor: R$ ${totalValue.toFixed(2)}\n\nObrigada pela confiança! ✨`);
    setClientePhone(newOrder.phone);
    setShowFidelizacaoModal(true);
    
    setShowModal(false);
    setOrderServices([]);
  };

  const markAsDelivered = (order: any) => {
    // Se já foi pago antecipadamente, marca direto como entregue
    if (order.paymentStatus === 'Pago') {
      setOrders(orders.map(o => 
        o.id === order.id 
          ? { ...o, status: 'Entregue' }
          : o
      ));

      // Mensagem de agradecimento sem cobrança
      setFidelizacaoMessage(`Olá ${order.client}! 💝\n\n*Cleusa Ateliê de Costura*\n\nObrigada por retirar sua peça!\n\n✅ *Pagamento já realizado!*\n\nEsperamos que tenha ficado perfeita! Conte sempre conosco para seus ajustes e costuras.\n\nAté a próxima! ✨`);
      setClientePhone(order.phone);
      setShowFidelizacaoModal(true);
    } else {
      // Se não foi pago, pergunta sobre o pagamento
      setSelectedOrder(order);
      setShowPaymentModal(true);
    }
  };

  const confirmDeliveryWithPayment = (isPaid: boolean) => {
    setOrders(orders.map(o => 
      o.id === selectedOrder.id 
        ? { ...o, status: 'Entregue', paymentStatus: isPaid ? 'Pago' : 'Pendente' }
        : o
    ));

    // Mensagem de fidelização - Agradecimento pela retirada
    const paymentText = isPaid 
      ? 'Pagamento confirmado! ✅' 
      : `Pagamento pendente - Aguardamos seu pagamento. 💰\n\n*DADOS PARA PAGAMENTO PIX:*\n\n*Nome:* Cleusa Belani David\n*Telefone:* 45999126130\n*CPF:* 64166724053\n\n⚠️ *Ao realizar o pagamento, por favor envie o comprovante.*`;
    
    setFidelizacaoMessage(`Olá ${selectedOrder.client}! 💝\n\n*Cleusa Ateliê de Costura*\n\nObrigada por retirar sua peça!\n\n${paymentText}\n\nEsperamos que tenha ficado perfeita! Conte sempre conosco para seus ajustes e costuras.\n\nAté a próxima! ✨`);
    setClientePhone(selectedOrder.phone);
    setShowFidelizacaoModal(true);
    
    setShowPaymentModal(false);
    setSelectedOrder(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Mensagem copiada!');
    setShowFidelizacaoModal(false);
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent(fidelizacaoMessage);
    const phone = clientePhone.replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    setShowFidelizacaoModal(false);
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.service.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusCounts = {
    Todos: orders.length,
    'Em fila': orders.filter(o => o.status === 'Em fila').length,
    'Em andamento': orders.filter(o => o.status === 'Em andamento').length,
    'Finalizado': orders.filter(o => o.status === 'Finalizado').length,
    'Entregue': orders.filter(o => o.status === 'Entregue').length,
  };

  const serviceCategories = [
    { id: 'barras', name: '👖 Barras' },
    { id: 'ajustes', name: '✂️ Ajustes e Modelagem' },
    { id: 'camisas', name: '👕 Camisas / Blusas' },
    { id: 'vestidos', name: '👗 Vestidos' },
    { id: 'saia-short', name: '👔 Saia / Short / Bermuda' },
    { id: 'calcas', name: '👖 Calça / Jeans' },
    { id: 'casacos', name: '🧥 Casacos / Jaquetas' },
    { id: 'consertos', name: '🧵 Consertos Gerais' },
    { id: 'sociais', name: '👔 Roupas Sociais' },
    { id: 'infantis', name: '👶 Roupas Infantis' },
    { id: 'domestica', name: '🛋️ Costura Doméstica' },
    { id: 'especiais', name: '🎨 Serviços Especiais' },
  ];

  // Lista de materiais disponíveis
  const availableMaterials = [
    // Linhas
    { id: 1, name: 'Linha de costura poliéster', unit: 'metro', price: 0.50 },
    { id: 2, name: 'Linha de algodão', unit: 'metro', price: 0.60 },
    { id: 3, name: 'Linha para jeans', unit: 'metro', price: 0.80 },
    { id: 4, name: 'Linha para overlock', unit: 'metro', price: 0.70 },
    { id: 5, name: 'Linha invisível (nylon)', unit: 'metro', price: 1.00 },
    { id: 6, name: 'Linha encerada', unit: 'metro', price: 0.90 },
    { id: 7, name: 'Linha para bordado', unit: 'metro', price: 1.20 },
    
    // Agulhas
    { id: 8, name: 'Agulha de máquina doméstica', unit: 'unidade', price: 2.00 },
    { id: 9, name: 'Agulha de máquina industrial', unit: 'unidade', price: 3.00 },
    { id: 10, name: 'Agulha para jeans', unit: 'unidade', price: 2.50 },
    { id: 11, name: 'Agulha para malha', unit: 'unidade', price: 2.50 },
    { id: 12, name: 'Agulha para tecidos finos', unit: 'unidade', price: 2.00 },
    { id: 13, name: 'Agulha de mão', unit: 'unidade', price: 1.00 },
    { id: 14, name: 'Agulha curva', unit: 'unidade', price: 3.50 },
    
    // Botões e Fechamentos
    { id: 15, name: 'Botão comum', unit: 'unidade', price: 0.50 },
    { id: 16, name: 'Botão de pressão', unit: 'unidade', price: 1.00 },
    { id: 17, name: 'Botão de jeans', unit: 'unidade', price: 1.50 },
    { id: 18, name: 'Botão forrado', unit: 'unidade', price: 2.00 },
    { id: 19, name: 'Colchete', unit: 'unidade', price: 0.80 },
    { id: 20, name: 'Gancho', unit: 'unidade', price: 0.80 },
    { id: 21, name: 'Ilhós', unit: 'unidade', price: 0.60 },
    { id: 22, name: 'Fecho de metal', unit: 'unidade', price: 1.50 },
    { id: 23, name: 'Fecho plástico', unit: 'unidade', price: 1.00 },
    
    // Zíperes
    { id: 24, name: 'Zíper comum', unit: 'unidade', price: 5.00 },
    { id: 25, name: 'Zíper invisível', unit: 'unidade', price: 7.00 },
    { id: 26, name: 'Zíper de metal', unit: 'unidade', price: 8.00 },
    { id: 27, name: 'Zíper de nylon', unit: 'unidade', price: 6.00 },
    { id: 28, name: 'Zíper destacável (jaquetas)', unit: 'unidade', price: 10.00 },
    { id: 29, name: 'Cursor de zíper (puxador)', unit: 'unidade', price: 2.00 },
    
    // Elásticos
    { id: 30, name: 'Elástico comum', unit: 'metro', price: 1.50 },
    { id: 31, name: 'Elástico roliço', unit: 'metro', price: 2.00 },
    { id: 32, name: 'Elástico largo', unit: 'metro', price: 3.00 },
    { id: 33, name: 'Elástico para cintura', unit: 'metro', price: 2.50 },
    { id: 34, name: 'Elástico para punho', unit: 'metro', price: 1.80 },
    
    // Tecidos e Aviamentos
    { id: 35, name: 'Tecido para remendo', unit: 'metro', price: 10.00 },
    { id: 36, name: 'Forro', unit: 'metro', price: 8.00 },
    { id: 37, name: 'Entretela', unit: 'metro', price: 6.00 },
    { id: 38, name: 'Viés', unit: 'metro', price: 2.00 },
    { id: 39, name: 'Renda', unit: 'metro', price: 5.00 },
    { id: 40, name: 'Fita de cetim', unit: 'metro', price: 1.50 },
    { id: 41, name: 'Fita de gorgurão', unit: 'metro', price: 2.00 },
    { id: 42, name: 'Passamanaria', unit: 'metro', price: 3.00 },
    
    // Ferramentas Básicas
    { id: 43, name: 'Tesoura de tecido', unit: 'unidade', price: 25.00 },
    { id: 44, name: 'Tesoura de arremate', unit: 'unidade', price: 15.00 },
    { id: 45, name: 'Abridor de casas', unit: 'unidade', price: 8.00 },
    { id: 46, name: 'Alfinetes', unit: 'pacote', price: 5.00 },
    { id: 47, name: 'Alfinete de segurança', unit: 'pacote', price: 4.00 },
    { id: 48, name: 'Dedal', unit: 'unidade', price: 3.00 },
    { id: 49, name: 'Fita métrica', unit: 'unidade', price: 5.00 },
    { id: 50, name: 'Giz de alfaiate', unit: 'unidade', price: 3.00 },
    { id: 51, name: 'Marcador de tecido', unit: 'unidade', price: 6.00 },
    { id: 52, name: 'Descosedor', unit: 'unidade', price: 4.00 },
    
    // Produtos Auxiliares
    { id: 53, name: 'Cola para tecido', unit: 'unidade', price: 8.00 },
    { id: 54, name: 'Spray fixador', unit: 'unidade', price: 12.00 },
    { id: 55, name: 'Amaciante de costura', unit: 'litro', price: 10.00 },
    { id: 56, name: 'Ferro de passar', unit: 'unidade', price: 80.00 },
    { id: 57, name: 'Papel para molde', unit: 'metro', price: 2.00 },
    { id: 58, name: 'Papel carbono para costura', unit: 'folha', price: 1.50 },
    
    // Acabamento
    { id: 59, name: 'Bainha termocolante', unit: 'metro', price: 3.00 },
    { id: 60, name: 'Fita termocolante', unit: 'metro', price: 2.50 },
    { id: 61, name: 'Linha para acabamento fino', unit: 'metro', price: 1.00 },
    { id: 62, name: 'Entretela termocolante', unit: 'metro', price: 7.00 },
    
    // Embalagem e Entrega
    { id: 63, name: 'Saco plástico para roupa', unit: 'unidade', price: 0.50 },
    { id: 64, name: 'Capa protetora', unit: 'unidade', price: 2.00 },
    { id: 65, name: 'Etiqueta de identificação', unit: 'unidade', price: 0.30 },
    { id: 66, name: 'Tag de cliente', unit: 'unidade', price: 0.40 },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0 min-w-0">
        <div className="p-4 lg:p-8 min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 lg:mb-8 gap-4">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-2">Ordens de Serviço</h1>
              <p className="text-sm lg:text-base text-gray-600">Gerencie sua fila de costuras</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all whitespace-nowrap cursor-pointer font-medium"
            >
              <i className="ri-add-line text-xl w-5 h-5 flex items-center justify-center"></i>
              Nova Ordem
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4 mb-6">
            {Object.entries(statusCounts).map(([status, count]) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`p-3 lg:p-4 rounded-lg border-2 transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === status
                    ? 'border-rose-500 bg-rose-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">{count}</div>
                <div className="text-xs lg:text-sm text-gray-600">{status}</div>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg w-5 h-5 flex items-center justify-center"></i>
                <input
                  type="text"
                  placeholder="Buscar por cliente ou ID da ordem..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">ID</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Cliente</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Categoria</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Serviço</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Valor</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Entrada</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Entrega</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order) => {
                    const isLate = isOrderLate(order.dateOut, order.status);
                    return (
                      <tr key={order.id} className={`hover:bg-gray-50 transition-colors ${isLate ? 'bg-red-50' : ''}`}>
                        <td className="px-3 py-3 whitespace-normal max-w-[10rem] break-words">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{order.id}</span>
                            {order.priority === 'urgente' && (
                              <i className="ri-alarm-warning-line text-red-500 text-lg w-4 h-4 flex items-center justify-center" title="Urgente"></i>
                            )}
                            {isLate && (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold whitespace-nowrap">
                                ATRASADO
                              </span>
                            )}
                            {order.paymentStatus === 'Pago' && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold whitespace-nowrap">
                                💰 PAGO
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3 whitespace-normal text-sm text-gray-700 break-words">{order.client}</td>
                        <td className="px-3 py-3 whitespace-normal text-sm text-gray-600 break-words">{order.category}</td>
                        <td className="px-3 py-3 whitespace-normal text-sm text-gray-700 break-words">{order.service}</td>
                        <td className="px-3 py-3 whitespace-normal text-sm font-medium text-gray-900">{order.value}</td>
                        <td className="px-3 py-3 whitespace-normal text-sm text-gray-600">{order.dateIn}</td>
                        <td className="px-3 py-3 whitespace-normal">
                          <span className={`text-sm ${isLate ? 'text-red-600 font-bold' : ''}`}>
                            {order.dateOut}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-normal">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                            order.status === 'Entregue' ? 'bg-green-100 text-green-700' :
                            order.status === 'Finalizado' ? 'bg-blue-100 text-blue-700' :
                            order.status === 'Em andamento' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => handleEdit(order)}
                              className="p-2 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer" 
                              title="Editar"
                            >
                              <i className="ri-edit-line text-lg w-5 h-5 flex items-center justify-center"></i>
                            </button>
                            {order.status !== 'Entregue' && order.paymentStatus !== 'Pago' && (
                              <button 
                                onClick={() => handleAdvancePayment(order)}
                                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all cursor-pointer" 
                                title="Pagamento Antecipado"
                              >
                                <i className="ri-money-dollar-circle-line text-lg w-5 h-5 flex items-center justify-center"></i>
                              </button>
                            )}
                            <button 
                              onClick={() => {
                                setSelectedOrder(order);
                                setOrderMaterials([]);
                                setShowMaterialsModal(true);
                              }}
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all cursor-pointer" 
                              title="Materiais"
                            >
                              <i className="ri-tools-line text-lg w-5 h-5 flex items-center justify-center"></i>
                            </button>
                            {order.status === 'Finalizado' && (
                              <button 
                                onClick={() => markAsDelivered(order)}
                                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all cursor-pointer" 
                                title="Marcar como Entregue"
                              >
                                <i className="ri-hand-coin-line text-lg w-5 h-5 flex items-center justify-center"></i>
                              </button>
                            )}
                            {order.status !== 'Finalizado' && order.status !== 'Entregue' && (
                              <button 
                                onClick={() => handleDeliver(order)}
                                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all cursor-pointer" 
                                title="Finalizar"
                              >
                                <i className="ri-check-double-line text-lg w-5 h-5 flex items-center justify-center"></i>
                              </button>
                            )}
                            <button 
                              onClick={() => handleDelete(order)}
                              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer" 
                              title="Excluir"
                            >
                              <i className="ri-delete-bin-line text-lg w-5 h-5 flex items-center justify-center"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-gray-200">
              {filteredOrders.map((order) => {
                const isLate = isOrderLate(order.dateOut, order.status);
                return (
                  <div key={order.id} className={`p-4 hover:bg-gray-50 transition-colors ${isLate ? 'bg-red-50' : ''}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-bold text-gray-900">{order.id}</span>
                          {order.priority === 'urgente' && (
                            <i className="ri-alarm-warning-line text-red-500 text-base w-4 h-4 flex items-center justify-center"></i>
                          )}
                          {isLate && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[9px] font-bold whitespace-nowrap">
                              ATRASADO
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 font-medium">{order.client}</p>
                        {order.paymentStatus === 'Pago' && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[9px] font-bold whitespace-nowrap">
                            💰 PAGO
                          </span>
                        )}
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        order.status === 'Entregue' ? 'bg-green-100 text-green-700' :
                        order.status === 'Finalizado' ? 'bg-blue-100 text-blue-700' :
                        order.status === 'Em andamento' ? 'bg-amber-100 text-amber-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="mb-3">
                      <p className="text-xs text-gray-600 mb-1">{order.category}</p>
                      <p className="text-sm text-gray-900">{order.service}</p>
                    </div>
                    <div className="flex items-center justify-between mb-3 text-xs text-gray-600">
                      <div>
                        <span>Entrada: {order.dateIn}</span>
                      </div>
                      <div>
                        <span className={isLate ? 'text-red-600 font-bold' : ''}>
                          Entrega: {order.dateOut}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-gray-900">{order.value}</span>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleEdit(order)}
                          className="p-2 text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-all cursor-pointer" 
                          title="Editar"
                        >
                          <i className="ri-edit-line text-base w-4 h-4 flex items-center justify-center"></i>
                        </button>
                        {order.status !== 'Entregue' && order.paymentStatus !== 'Pago' && (
                          <button 
                            onClick={() => handleAdvancePayment(order)}
                            className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-all cursor-pointer" 
                            title="Pagamento Antecipado"
                          >
                            <i className="ri-money-dollar-circle-line text-base w-4 h-4 flex items-center justify-center"></i>
                          </button>
                        )}
                        <button 
                          onClick={() => {
                            setSelectedOrder(order);
                            setOrderMaterials([]);
                            setShowMaterialsModal(true);
                          }}
                          className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all cursor-pointer" 
                          title="Materiais"
                        >
                          <i className="ri-tools-line text-base w-4 h-4 flex items-center justify-center"></i>
                        </button>
                        {order.status === 'Finalizado' && (
                          <button 
                            onClick={() => markAsDelivered(order)}
                            className="p-2 text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-all cursor-pointer" 
                            title="Marcar como Entregue"
                          >
                            <i className="ri-hand-coin-line text-base w-4 h-4 flex items-center justify-center"></i>
                          </button>
                        )}
                        {order.status !== 'Finalizado' && order.status !== 'Entregue' && (
                          <button 
                            onClick={() => handleDeliver(order)}
                            className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-all cursor-pointer" 
                            title="Finalizar"
                          >
                            <i className="ri-check-double-line text-base w-4 h-4 flex items-center justify-center"></i>
                          </button>
                        )}
                        <button 
                          onClick={() => handleDelete(order)}
                          className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all cursor-pointer" 
                          title="Excluir"
                        >
                          <i className="ri-delete-bin-line text-base w-4 h-4 flex items-center justify-center"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>

      {/* Modal Pagamento Antecipado */}
      {showAdvancePaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 lg:p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-money-dollar-circle-line text-2xl text-green-600 w-6 h-6 flex items-center justify-center"></i>
              </div>
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 text-center mb-2">Pagamento Antecipado</h2>
              <p className="text-sm text-gray-600 text-center mb-4">
                Confirmar que o cliente <strong>{selectedOrder.client}</strong> realizou o pagamento antecipado?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Ordem:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedOrder.id}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Serviço:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedOrder.service}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Valor:</span>
                  <span className="text-sm font-bold text-green-600">{selectedOrder.value}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowAdvancePaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmAdvancePayment}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Ordem */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Nova Ordem de Serviço</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setOrderServices([]);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
              >
                <i className="ri-close-line text-2xl w-6 h-6 flex items-center justify-center"></i>
              </button>
            </div>

            <div className="p-4 lg:p-6 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cliente</label>
                  <div className="flex gap-2">
                    <select className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm">
                      <option>Selecione um cliente</option>
                      {clientes.map((cliente) => (
                        <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowNewClientModal(true)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all whitespace-nowrap cursor-pointer font-medium text-sm"
                      title="Novo Cliente"
                    >
                      <i className="ri-add-line text-lg"></i>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prioridade</label>
                  <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm">
                    <option>Normal</option>
                    <option>Urgente</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Data de Entrada</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prazo de Entrega</label>
                  <input
                    type="date"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Lista de Serviços Adicionados */}
              {orderServices.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Serviços Adicionados</h3>
                  <div className="space-y-2">
                    {orderServices.map((service) => (
                      <div key={service.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{service.name}</p>
                          <p className="text-xs text-gray-600">{service.category}</p>
                          {service.observation && (
                            <p className="text-xs text-gray-500 italic mt-1">{service.observation}</p>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-gray-900">R$ {service.value.toFixed(2)}</p>
                        <button 
                          onClick={() => removeService(service.id)}
                          className="text-red-600 hover:text-red-700 cursor-pointer"
                        >
                          <i className="ri-delete-bin-line text-lg"></i>
                        </button>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                      <span className="text-sm font-medium text-gray-700">Total:</span>
                      <span className="text-lg font-bold text-rose-600">R$ {getTotalServices().toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Adicionar Serviço */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Adicionar Serviço</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Serviço</label>
                    <select 
                      value={selectedServiceId}
                      onChange={handleServiceSelect}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 cursor-pointer"
                    >
                      <option value="">Selecione um serviço...</option>
                      {servicosDisponiveis.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.category} - {service.name} (R$ {service.price.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Valor (R$)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={serviceValue}
                        onChange={(e) => setServiceValue(e.target.value)}
                        placeholder="0,00" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Observação</label>
                      <input 
                        type="text" 
                        value={serviceObservation}
                        onChange={(e) => setServiceObservation(e.target.value)}
                        placeholder="Opcional" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500" 
                      />
                    </div>
                  </div>
                  <button 
                    onClick={addService}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                  >
                    <i className="ri-add-line mr-2"></i>
                    Adicionar Serviço
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Observações Gerais</label>
                <textarea
                  rows={4}
                  placeholder="Detalhes adicionais sobre a ordem..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm resize-none"
                  maxLength={500}
                ></textarea>
              </div>
            </div>

            <div className="p-4 lg:p-6 border-t border-gray-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowModal(false);
                  setOrderServices([]);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer font-medium text-sm"
              >
                Cancelar
              </button>
              <button 
                onClick={createNewOrder}
                className="px-6 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all whitespace-nowrap cursor-pointer font-medium text-sm"
              >
                Criar Ordem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Cliente Rápido */}
      {showNewClientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Cadastro Rápido</h2>
              <button
                onClick={() => setShowNewClientModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            <div className="p-4 lg:p-6 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  placeholder="Nome do cliente"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-sm"
                />
              </div>
            </div>
            <div className="p-4 lg:p-6 border-t border-gray-200 flex gap-3">
              <button
                onClick={() => setShowNewClientModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  alert('Cliente cadastrado com sucesso!');
                  setShowNewClientModal(false);
                }}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg lg:text-xl font-bold text-gray-900">Editar Ordem de Serviço</h2>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            <div className="p-4 lg:p-6 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Cliente</label>
                  <input type="text" defaultValue={selectedOrder.client} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select defaultValue={selectedOrder.category} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500 cursor-pointer">
                    {serviceCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Tipo de Serviço</label>
                <input type="text" defaultValue={selectedOrder.service} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <input type="text" defaultValue={selectedOrder.value} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select defaultValue={selectedOrder.status} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500 cursor-pointer">
                    <option>Em fila</option>
                    <option>Em andamento</option>
                    <option>Finalizado</option>
                    <option>Entregue</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Data de Entrada</label>
                  <input type="date" defaultValue={selectedOrder.dateIn.split('/').reverse().join('-')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Prazo de Entrega</label>
                  <input type="date" defaultValue={selectedOrder.dateOut.split('/').reverse().join('-')} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500"></textarea>
              </div>
            </div>
            <div className="p-4 lg:p-6 border-t border-gray-200 flex gap-3">
              <button 
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={() => setShowEditModal(false)}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Excluir */}
      {showDeleteModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 lg:p-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-delete-bin-line text-2xl text-red-600"></i>
              </div>
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 text-center mb-2">Excluir Ordem de Serviço</h2>
              <p className="text-sm text-gray-600 text-center mb-6">
                Tem certeza que deseja excluir a ordem de <strong>{selectedOrder.client}</strong>? Esta ação não pode ser desfeita.
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

      {/* Modal Materiais */}
      {showMaterialsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 lg:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg lg:text-xl font-bold text-gray-900">Materiais Utilizados</h2>
                <p className="text-xs lg:text-sm text-gray-600 mt-1">Ordem: {selectedOrder.client} - {selectedOrder.service}</p>
              </div>
              <button 
                onClick={() => setShowMaterialsModal(false)}
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
            </div>
            <div className="p-4 lg:p-6">
              {orderMaterials.length > 0 && (
                <div className="space-y-3 mb-4">
                  {orderMaterials.map((material) => (
                    <div key={material.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{material.name}</p>
                        <p className="text-xs text-gray-600">
                          {material.quantity} {material.unit} × R$ {material.unitPrice.toFixed(2)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">R$ {material.total.toFixed(2)}</p>
                      <button 
                        onClick={() => removeMaterial(material.id)}
                        className="text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        <i className="ri-delete-bin-line text-lg"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="border-t border-gray-200 pt-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900">Adicionar Material</h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Material</label>
                    <select 
                      value={selectedMaterialId}
                      onChange={handleMaterialSelect}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500 cursor-pointer"
                    >
                      <option value="">Selecione um material...</option>
                      <optgroup label="🧵 LINHAS">
                        {availableMaterials.filter(m => m.id >= 1 && m.id <= 7).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🪡 AGULHAS">
                        {availableMaterials.filter(m => m.id >= 8 && m.id <= 14).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🔘 BOTÕES E FECHAMENTOS">
                        {availableMaterials.filter(m => m.id >= 15 && m.id <= 23).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🔒 ZÍPERES">
                        {availableMaterials.filter(m => m.id >= 24 && m.id <= 29).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🧶 ELÁSTICOS">
                        {availableMaterials.filter(m => m.id >= 30 && m.id <= 34).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🧥 TECIDOS E AVIAMENTOS">
                        {availableMaterials.filter(m => m.id >= 35 && m.id <= 42).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🪢 FERRAMENTAS BÁSICAS">
                        {availableMaterials.filter(m => m.id >= 43 && m.id <= 52).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🧴 PRODUTOS AUXILIARES">
                        {availableMaterials.filter(m => m.id >= 53 && m.id <= 58).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="🧵 ACABAMENTO">
                        {availableMaterials.filter(m => m.id >= 59 && m.id <= 62).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="📦 EMBALAGEM E ENTREGA">
                        {availableMaterials.filter(m => m.id >= 63 && m.id <= 66).map(material => (
                          <option key={material.id} value={material.id}>
                            {material.name} - R$ {material.price.toFixed(2)}/{material.unit}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Quantidade</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={materialQuantity}
                        onChange={(e) => setMaterialQuantity(e.target.value)}
                        placeholder="1" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Valor Unitário (R$)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={materialPrice}
                        onChange={(e) => setMaterialPrice(e.target.value)}
                        placeholder="0,00" 
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" 
                      />
                    </div>
                  </div>
                </div>
                <button 
                  onClick={addMaterial}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  <i className="ri-add-line mr-2"></i>
                  Adicionar Material
                </button>
              </div>

              <div className="border-t border-gray-200 mt-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total em Materiais:</span>
                  <span className="text-lg font-bold text-purple-600">R$ {getTotalMaterials().toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="p-4 lg:p-6 border-t border-gray-200 sticky bottom-0 bg-white">
              <button 
                onClick={() => setShowMaterialsModal(false)}
                className="w-full px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Entregar/Finalizar */}
      {showDeliverModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 lg:p-6">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-check-double-line text-2xl text-green-600 w-6 h-6 flex items-center justify-center"></i>
              </div>
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 text-center mb-2">Finalizar Ordem</h2>
              <p className="text-sm text-gray-600 text-center mb-4">
                Confirmar finalização da ordem de <strong>{selectedOrder.client}</strong>?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Data de Finalização:</span>
                  <span className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Horário:</span>
                  <span className="text-sm font-bold text-gray-900">{new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeliverModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDeliver}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pagamento ao Entregar */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-4 lg:p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-hand-coin-line text-2xl text-blue-600 w-6 h-6 flex items-center justify-center"></i>
              </div>
              <h2 className="text-lg lg:text-xl font-bold text-gray-900 text-center mb-2">Confirmar Entrega</h2>
              <p className="text-sm text-gray-600 text-center mb-4">
                A ordem de <strong>{selectedOrder.client}</strong> foi paga?
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Cliente:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedOrder.client}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-600">Serviço:</span>
                  <span className="text-sm font-medium text-gray-900">{selectedOrder.service}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Valor:</span>
                  <span className="text-sm font-bold text-green-600">{selectedOrder.value}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => confirmDeliveryWithPayment(false)}
                  className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Não Pago
                </button>
                <button 
                  onClick={() => confirmDeliveryWithPayment(true)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
                >
                  Sim, Pago
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fidelização */}
      {showFidelizacaoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 lg:p-6">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="ri-message-3-line text-2xl text-rose-600 w-6 h-6 flex items-center justify-center"></i>
              </div>
              <h2 className="text-base lg:text-xl font-bold text-gray-900 text-center mb-2">Mensagem de Fidelização</h2>
              <p className="text-xs text-gray-600 text-center mb-3">
                Envie esta mensagem para o cliente via WhatsApp
              </p>
              <div className="bg-gray-50 rounded-lg p-3 mb-4 max-h-[40vh] overflow-y-auto">
                <p className="text-xs lg:text-sm text-gray-900 whitespace-pre-line">{fidelizacaoMessage}</p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => copyToClipboard(fidelizacaoMessage)}
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
    </div>
  );
}
