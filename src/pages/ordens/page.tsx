import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { addPointsForOrder } from '../../lib/clients';
import { formatMessageForStatus } from '../../lib/messages';

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
  const [clientFilter, setClientFilter] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [onlyLateFilter, setOnlyLateFilter] = useState(false);
  const [showStatusOnlyModal, setShowStatusOnlyModal] = useState(false);
  const [statusSelection, setStatusSelection] = useState('');
  const [statusChangeMessage, setStatusChangeMessage] = useState('');
  const [showStatusMessageOptions, setShowStatusMessageOptions] = useState(false);
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
  const [showConfirmDeliverPrompt, setShowConfirmDeliverPrompt] = useState(false);
  const [showAdvancePaymentModal, setShowAdvancePaymentModal] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Edit modal controlled fields
  const [editClient, setEditClient] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editServiceName, setEditServiceName] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editDateIn, setEditDateIn] = useState('');
  const [editDateOut, setEditDateOut] = useState('');
  const [editObservation, setEditObservation] = useState('');

  // New order modal: filter services by selected category
  const [newServiceCategoryFilter, setNewServiceCategoryFilter] = useState('');
  const [newOrderDate, setNewOrderDate] = useState('');
  const [newOrderStatus, setNewOrderStatus] = useState('Recebido');
  const [newOrderPaymentStatus, setNewOrderPaymentStatus] = useState<string | null>(null);
  const [showInlineServiceForm, setShowInlineServiceForm] = useState(false);
  const [inlineServiceName, setInlineServiceName] = useState('');
  const [inlineServicePrice, setInlineServicePrice] = useState('');
  const [inlineServiceCategory, setInlineServiceCategory] = useState('');

  const defaultSampleOrders = [
    { id: 'OS-1234', client: 'Maria Silva', phone: '11987654321', category: '👖 Barras', service: 'Barra de Calça', value: 'R$ 35,00', status: 'Recebido', dateIn: '15/12/2024', dateOut: '20/12/2024', priority: 'normal', paymentStatus: null },
    { id: 'OS-1235', client: 'João Santos', phone: '11976543210', category: '👗 Vestidos', service: 'Ajuste de Vestido', value: 'R$ 80,00', status: 'Recebido', dateIn: '16/12/2024', dateOut: '22/12/2024', priority: 'normal', paymentStatus: null },
    { id: 'OS-1236', client: 'Ana Costa', phone: '11965432109', category: '🧵 Consertos Gerais', service: 'Troca de Zíper', value: 'R$ 45,00', status: 'Pronto', dateIn: '14/12/2024', dateOut: '18/12/2024', priority: 'urgente', paymentStatus: null },
    { id: 'OS-1237', client: 'Pedro Oliveira', phone: '11954321098', category: '🧵 Consertos Gerais', service: 'Conserto Geral', value: 'R$ 120,00', status: 'Em costura', dateIn: '15/12/2024', dateOut: '25/12/2024', priority: 'normal', paymentStatus: null },
    { id: 'OS-1238', client: 'Carla Mendes', phone: '11943210987', category: '👖 Barras', service: 'Barra de Calça', value: 'R$ 35,00', status: 'Retirado', dateIn: '13/12/2024', dateOut: '17/12/2024', priority: 'normal', paymentStatus: 'Pago' },
    { id: 'OS-1239', client: 'Lucas Ferreira', phone: '11932109876', category: '👔 Roupas Sociais', service: 'Ajuste de Blazer', value: 'R$ 95,00', status: 'Recebido', dateIn: '17/12/2024', dateOut: '23/12/2024', priority: 'urgente', paymentStatus: null },
    { id: 'OS-1240', client: 'Juliana Rocha', phone: '11921098765', category: '👗 Vestidos', service: 'Barra de Vestido', value: 'R$ 50,00', status: 'Em costura', dateIn: '16/12/2024', dateOut: '21/12/2024', priority: 'normal', paymentStatus: null },
    { id: 'OS-1241', client: 'Roberto Lima', phone: '11910987654', category: '🧵 Consertos Gerais', service: 'Troca de Botões', value: 'R$ 25,00', status: 'Pronto', dateIn: '12/12/2024', dateOut: '16/12/2024', priority: 'normal', paymentStatus: null },
  ];

  const loadOrders = () => {
    try {
      const raw = localStorage.getItem('orders');
      if (!raw) return defaultSampleOrders;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return defaultSampleOrders;
      // ensure old orders have a status
      return parsed.map((o: any) => ({ ...o, status: o.status || 'Recebido' }));
    } catch (e) {
      return defaultSampleOrders;
    }
  };

  const [orders, setOrders] = useState<any[]>(loadOrders);

  const [clientes] = useState([
    { id: 1, nome: 'Maria Silva', telefone: '(11) 98765-4321', phone: '11987654321' },
    { id: 2, nome: 'João Santos', telefone: '(11) 97654-3210', phone: '11976543210' },
    { id: 3, nome: 'Ana Costa', telefone: '(11) 96543-2109', phone: '11965432109' },
    { id: 4, nome: 'Pedro Oliveira', telefone: '(11) 95432-1098', phone: '11954321098' },
    { id: 5, nome: 'Carla Mendes', telefone: '(11) 94321-0987', phone: '11943210987' },
  ]);

  const servicosDisponiveis = [
    { id: 1, name: 'Barra simples de calça', category: 'barras', price: 35 },
    { id: 2, name: 'Barra italiana', category: 'barras', price: 45 },
    { id: 3, name: 'Barra original (jeans)', category: 'barras', price: 50 },
    { id: 4, name: 'Barra de saia', category: 'barras', price: 30 },
    { id: 5, name: 'Barra de vestido', category: 'barras', price: 40 },
    { id: 6, name: 'Barra de cortina', category: 'barras', price: 25 },

    { id: 7, name: 'Ajuste de cintura', category: 'ajustes', price: 45 },
    { id: 8, name: 'Ajuste de quadril', category: 'ajustes', price: 50 },
    { id: 9, name: 'Ajuste de lateral', category: 'ajustes', price: 55 },
    { id: 10, name: 'Ajuste de comprimento', category: 'ajustes', price: 40 },
    { id: 11, name: 'Ajuste de manga', category: 'ajustes', price: 35 },

    { id: 14, name: 'Ajuste de camisa social', category: 'camisas', price: 50 },
    { id: 15, name: 'Encurtar manga', category: 'camisas', price: 30 },

    { id: 19, name: 'Ajuste de vestido', category: 'vestidos', price: 80 },
    { id: 20, name: 'Ajuste de alça', category: 'vestidos', price: 30 },

    { id: 25, name: 'Ajuste de saia', category: 'saia-short', price: 40 },

    { id: 30, name: 'Ajuste de calça social', category: 'calcas', price: 50 },

    { id: 36, name: 'Ajuste de jaqueta', category: 'casacos', price: 70 },

    { id: 41, name: 'Troca de zíper', category: 'consertos', price: 45 },
    { id: 42, name: 'Troca de botão', category: 'consertos', price: 15 },
    { id: 43, name: 'Aplicação de botão', category: 'consertos', price: 20 },

    { id: 49, name: 'Ajuste de terno', category: 'sociais', price: 120 },

    { id: 54, name: 'Ajuste de roupa infantil', category: 'infantis', price: 30 },

    { id: 57, name: 'Barra de cortina', category: 'domestica', price: 25 },

    { id: 61, name: 'Reforma completa de roupa', category: 'especiais', price: 150 },
  ];

  // tornar a lista de serviços editável dentro do modal (para permitir cadastro rápido)
  const [servicosDisponiveisState, setServicosDisponiveisState] = useState(servicosDisponiveis);


  const handleEdit = (order: any) => {
    setSelectedOrder(order);
    // initialize edit fields
    setEditClient(order.client || '');
    setEditCategory(serviceCategories.find(c => c.name === order.category)?.id || '');
    setEditServiceName(order.service || '');
    setEditValue((order.value || '').toString().replace(/^R\$\s?/, ''));
    setEditStatus(order.status || 'Recebido');
    try {
      setEditDateIn(order.dateIn.split('/').reverse().join('-'));
      setEditDateOut(order.dateOut.split('/').reverse().join('-'));
    } catch (e) {
      setEditDateIn('');
      setEditDateOut('');
    }
    setEditObservation(order.observation || '');
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
    
    const updatedOrder = { ...selectedOrder, status: 'Pronto', deliveryDate: dateStr, deliveryTime: timeStr };
    setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
    
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
    // preparar mensagem para envio (não enviar automaticamente)
    setSelectedOrder(updatedOrder);
    const msg = formatMessageForStatus(updatedOrder, 'Pronto');
    setStatusChangeMessage(msg);
    setFidelizacaoMessage(msg);
    setShowStatusMessageOptions(true);
    setShowFidelizacaoModal(true);
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
      const service = servicosDisponiveisState.find(s => s.id === parseInt(serviceId));
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

    const service = servicosDisponiveisState.find(s => s.id === parseInt(selectedServiceId));
    if (!service) return;

    const newService = {
      id: Date.now(),
      serviceId: service.id,
      name: service.name,
      category: serviceCategories.find(c => c.id === service.category)?.name || service.category,
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
    if (!dateOut) return false;
    if (status === 'Pronto' || status === 'Retirado' || status === 'Cancelado') return false;

    const [day, month, year] = dateOut.split('/');
    if (!day || !month || !year) return false;
    const deliveryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return deliveryDate < today;
  };

  const deliveryIndicator = (dateOut: string) => {
    if (!dateOut) return 'none';
    const [day, month, year] = dateOut.split('/');
    if (!day || !month || !year) return 'none';
    const deliveryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    const today = new Date();
    today.setHours(0,0,0,0);
    if (deliveryDate < today) return 'late';
    if (deliveryDate.getTime() === today.getTime()) return 'today';
    return 'ok';
  };

  const daysUntil = (dateOut: string) => {
    if (!dateOut) return null;
    const parts = dateOut.split('/');
    if (parts.length !== 3) return null;
    const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    const today = new Date();
    today.setHours(0,0,0,0);
    const diffMs = d.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  const createNewOrder = () => {
    if (orderServices.length === 0) {
      alert('Adicione pelo menos um serviço à ordem');
      return;
    }

    if (!newOrderDate) {
      alert('Por favor informe a data prevista de entrega');
      return;
    }

    const totalValue = getTotalServices();
    const servicesText = orderServices.map(s => s.name).join(', ');
    
    const formatDate = (iso: string) => {
      try {
        const parts = iso.split('-');
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      } catch (e) { return '' }
    };

    const newOrder = {
      id: `OS-${1242 + orders.length}`,
      client: 'Novo Cliente',
      phone: '11999999999',
      category: orderServices[0].category,
      service: servicesText,
      value: `R$ ${totalValue.toFixed(2)}`,
      status: newOrderStatus || 'Recebido',
      paymentStatus: newOrderPaymentStatus || null,
      dateIn: new Date().toLocaleDateString('pt-BR'),
      dateOut: formatDate(newOrderDate),
      priority: 'normal'
    };

    setOrders([...orders, newOrder]);
    
    // Mensagem de fidelização - Serviço recebido
    setFidelizacaoMessage(`Olá ${newOrder.client}! 😊\n\n*Cleusa Ateliê de Costura*\n\nSua ordem foi registrada com sucesso!\n\nServiço: ${servicesText}\nPrazo de entrega: ${newOrder.dateOut}\nValor: R$ ${totalValue.toFixed(2)}\n\nObrigada pela confiança! ✨`);
    setClientePhone(newOrder.phone);
    setShowFidelizacaoModal(true);
    
    setShowModal(false);
    setOrderServices([]);
  };

  const markAsDelivered = (order: any) => {
    // Se já foi pago antecipadamente, marca direto como entregue
    if (order.paymentStatus === 'Pago') {
      const updatedOrder = { ...order, status: 'Retirado' };
      setOrders(orders.map(o => o.id === order.id ? updatedOrder : o));
      // Mensagem de agradecimento sem cobrança
      setFidelizacaoMessage(`Olá ${order.client}! 💝\n\n*Cleusa Ateliê de Costura*\n\nObrigada por retirar sua peça!\n\n✅ *Pagamento já realizado!*\n\nEsperamos que tenha ficado perfeita! Conte sempre conosco para seus ajustes e costuras.\n\nAté a próxima! ✨`);
      setClientePhone(order.phone);
      setShowFidelizacaoModal(true);
      // enviar notificação automática de retirada
      sendStatusWhatsApp(updatedOrder, 'Retirado');
      // atualizar pontos/total do cliente se pago
      if (updatedOrder.paymentStatus === 'Pago') {
        try { addPointsForOrder(updatedOrder); window.dispatchEvent(new CustomEvent('clientsUpdated')); } catch (e) {}
      }
    } else {
      // Se não foi pago, pergunta sobre o pagamento
      setSelectedOrder(order);
      setShowPaymentModal(true);
    }
  };

  const confirmDeliveryWithPayment = (isPaid: boolean) => {
    const updatedOrder = { ...selectedOrder, status: 'Retirado', paymentStatus: isPaid ? 'Pago' : 'Pendente' };
    setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));

    // Mensagem de fidelização - Agradecimento pela retirada
    const paymentText = isPaid 
      ? 'Pagamento confirmado! ✅' 
      : `Pagamento pendente - Aguardamos seu pagamento. 💰\n\n*DADOS PARA PAGAMENTO PIX:*\n\n*Nome:* Cleusa Belani David\n*Telefone:* 45999126130\n*CPF:* 64166724053\n\n⚠️ *Ao realizar o pagamento, por favor envie o comprovante.*`;
    
    setFidelizacaoMessage(`Olá ${selectedOrder.client}! 💝\n\n*Cleusa Ateliê de Costura*\n\nObrigada por retirar sua peça!\n\n${paymentText}\n\nEsperamos que tenha ficado perfeita! Conte sempre conosco para seus ajustes e costuras.\n\nAté a próxima! ✨`);
    setClientePhone(selectedOrder.phone);
    setShowFidelizacaoModal(true);
    
    setShowPaymentModal(false);
    setSelectedOrder(null);
    // preparar mensagem de retirada para envio (não enviar automaticamente)
    setSelectedOrder(updatedOrder);
    const msg = formatMessageForStatus(updatedOrder, 'Retirado');
    setStatusChangeMessage(msg);
    setFidelizacaoMessage(msg);
    setShowStatusMessageOptions(true);
    setShowFidelizacaoModal(true);
    // atualizar pontos/total do cliente se pago
    if (updatedOrder.paymentStatus === 'Pago') {
      try { addPointsForOrder(updatedOrder); window.dispatchEvent(new CustomEvent('clientsUpdated')); } catch (e) {}
    }
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
    try { if (selectedOrder) markMessageSent(selectedOrder.id, selectedOrder.status); } catch (e) {}
    setShowFidelizacaoModal(false);
  };

  const composeStatusMessage = (order: any, newStatus: string) => {
    if (!order) return '';
    switch (newStatus) {
      case 'Recebido':
        return `Olá ${order.client}! 😊\n\nSua ordem ${order.id} foi *recebida* e está sendo processada.`;
      case 'Em costura':
        return `Olá ${order.client}! 👗\n\nIniciamos a costura da sua peça (OS ${order.id}). Em breve atualizamos o andamento.`;
      case 'Aguardando prova':
        return `Olá ${order.client}! 👀\n\nSua peça (OS ${order.id}) está pronta para prova. Aguardo sua visita.`;
      case 'Ajuste final':
        return `Olá ${order.client}! ✂️\n\nEstamos nos ajustes finais da sua peça (OS ${order.id}). Em breve avisamos quando estiver pronta.`;
      case 'Pronto':
        return `Olá ${order.client}! 🎉\n\nSua peça (OS ${order.id}) está *pronta para retirada*. Obrigada pela preferência!`;
      case 'Retirado':
        return `Olá ${order.client}! 💝\n\nObrigado por retirar sua peça (OS ${order.id}). Esperamos que tenha gostado!`;
      case 'Cancelado':
        return `Olá ${order.client}, informamos que a OS ${order.id} foi cancelada. Se houver dúvidas, entre em contato.`;
      default:
        return `Olá ${order.client}, sua ordem ${order.id} está com o status: ${newStatus}.`;
    }
  };

  const sendStatusWhatsApp = (order: any, newStatus: string) => {
    if (!order || !order.phone) return;
    const msg = composeStatusMessage(order, newStatus);
    const phone = (order.phone || '').replace(/\D/g, '');
    try {
      window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    } catch (e) {}
  };

  const getFormattedMessage = (order: any, status: string) => {
    try { return formatMessageForStatus(order, status); } catch (e) { return composeStatusMessage(order, status); }
  };

  const markMessageSent = (orderId: string, status: string) => {
    const next = orders.map(o => {
      if (o.id !== orderId) return o;
      const sent = { ...(o.sentMessages || {}) };
      sent[status] = 'sent';
      return { ...o, sentMessages: sent };
    });
    setOrders(next);
    try { localStorage.setItem('orders', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}
  };

  const sendMessageManual = (order: any, status: string) => {
    if (!order || !order.phone) return alert('Cliente sem WhatsApp');
    const message = getFormattedMessage(order, status);
    const phone = (order.phone || '').replace(/\D/g, '');
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank');
    markMessageSent(order.id, status);
  };

  const copyMessageManual = (order: any, status: string) => {
    const message = getFormattedMessage(order, status);
    try { navigator.clipboard.writeText(message); alert('Mensagem copiada!'); } catch (e) { alert('Não foi possível copiar'); }
  };

  const applyQuickStatus = (order: any, newStatus: string) => {
    // If marking as Retirado, handle payment confirmation and marking
    if (newStatus === 'Retirado') {
      if (order.paymentStatus === 'Pago') {
        const updatedOrder = { ...order, status: 'Retirado' };
        setOrders(orders.map(o => o.id === order.id ? updatedOrder : o));
        // mensagem de agradecimento e pontos
        setFidelizacaoMessage(`Olá ${order.client}! 💝\n\n*Cleusa Ateliê de Costura*\n\nObrigada por retirar sua peça!\n\n✅ *Pagamento já realizado!*\n\nEsperamos que tenha ficado perfeita!`);
        setClientePhone(order.phone);
        setShowFidelizacaoModal(true);
        try { addPointsForOrder(updatedOrder); window.dispatchEvent(new CustomEvent('clientsUpdated')); } catch (e) {}
        setSelectedOrder(updatedOrder);
        const msg = composeStatusMessage(updatedOrder, 'Retirado');
        setStatusChangeMessage(msg);
        setFidelizacaoMessage(msg);
        setShowStatusMessageOptions(true);
        setShowStatusOnlyModal(true);
        return;
      }

      // open an explicit confirm modal; if user confirms we'll open the payment modal
      setSelectedOrder(order);
      setShowConfirmDeliverPrompt(true);
      return;
    }

    const updatedOrder = { ...order, status: newStatus };
    setOrders(orders.map(o => o.id === order.id ? updatedOrder : o));
    setSelectedOrder(updatedOrder);
    setStatusChangeMessage(composeStatusMessage(updatedOrder, newStatus));
    setShowStatusMessageOptions(true);
    setShowStatusOnlyModal(true);
  };

  const togglePaymentStatus = (order: any) => {
    const next = orders.map(o => o.id === order.id ? { ...o, paymentStatus: o.paymentStatus === 'Pago' ? null : 'Pago' } : o);
    setOrders(next);
    try { localStorage.setItem('orders', JSON.stringify(next)); window.dispatchEvent(new CustomEvent('ordersUpdated')); } catch (e) {}
  };

  const filteredOrders = orders.filter(order => {
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch = !term || order.client.toLowerCase().includes(term) || order.service.toLowerCase().includes(term) || order.id.toLowerCase().includes(term);
    // Por padrão (Todos) não exibimos ordens já retiradas — elas ficam na página de entregues
    const matchesStatus = statusFilter === 'Todos' ? order.status !== 'Retirado' : order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // sort: open orders first, then finalized, then delivered. Within each group, urgent first, then overdue, then by entry date (older first)
  const sortStatusRank = (status: string) => {
    if (status === 'Recebido' || status === 'Em costura') return 0;
    if (status === 'Pronto' || status === 'Aguardando prova' || status === 'Ajuste final') return 1;
    return 2; // Retirado, Cancelado or others
  };

  const parseDate = (d: string) => {
    const parts = d.split('/');
    if (parts.length !== 3) return new Date(0);
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    return new Date(year, month, day);
  };

  const sortedOrders = filteredOrders.slice().sort((a, b) => {
    const sa = sortStatusRank(a.status);
    const sb = sortStatusRank(b.status);
    if (sa !== sb) return sa - sb;

    // urgent first
    const pa = a.priority === 'urgente' ? 0 : 1;
    const pb = b.priority === 'urgente' ? 0 : 1;
    if (pa !== pb) return pa - pb;

    // overdue first
    const lateA = isOrderLate(a.dateOut, a.status) ? 0 : 1;
    const lateB = isOrderLate(b.dateOut, b.status) ? 0 : 1;
    if (lateA !== lateB) return lateA - lateB;

    // older entry first
    return parseDate(a.dateIn).getTime() - parseDate(b.dateIn).getTime();
  });

  // persist orders to localStorage and notify dashboard
  useEffect(() => {
    try {
      localStorage.setItem('orders', JSON.stringify(orders));
      window.dispatchEvent(new CustomEvent('ordersUpdated'));
    } catch (e) {}
  }, [orders]);

  const statusCounts = {
    Todos: orders.length,
    'Recebido': orders.filter(o => o.status === 'Recebido').length,
    'Em costura': orders.filter(o => o.status === 'Em costura').length,
    'Aguardando prova': orders.filter(o => o.status === 'Aguardando prova').length,
    'Ajuste final': orders.filter(o => o.status === 'Ajuste final').length,
    'Pronto': orders.filter(o => o.status === 'Pronto').length,
    'Retirado': orders.filter(o => o.status === 'Retirado').length,
    'Cancelado': orders.filter(o => o.status === 'Cancelado').length,
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

  const statusOptions = [
    { id: 'Recebido', label: 'Recebido', color: 'bg-gray-400 text-white' },
    { id: 'Em costura', label: 'Em costura', color: 'bg-blue-500 text-white' },
    { id: 'Aguardando prova', label: 'Aguardando prova', color: 'bg-yellow-400 text-black' },
    { id: 'Ajuste final', label: 'Ajuste final', color: 'bg-purple-600 text-white' },
    { id: 'Pronto', label: 'Pronto', color: 'bg-green-500 text-white' },
    { id: 'Retirado', label: 'Retirado', color: 'bg-green-800 text-white' },
    { id: 'Cancelado', label: 'Cancelado', color: 'bg-red-600 text-white' },
  ];

  const statusIcons: Record<string, string> = {
    'Todos': 'ri-list-check-line',
    'Recebido': 'ri-inbox-line',
    'Em costura': 'ri-scissors-line',
    'Aguardando prova': 'ri-eye-line',
    'Ajuste final': 'ri-tools-line',
    'Pronto': 'ri-flag-line',
    'Retirado': 'ri-hand-heart-line',
    'Cancelado': 'ri-close-circle-line',
  };

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
          <style>{`
            /* Blink only the "ATRASADO" badge as a slow alert */
            .late-blink { animation: lateBlink 2.0s ease-in-out infinite; }
            @keyframes lateBlink { 0% { opacity: 1; transform: translateY(0); } 50% { opacity: 0.28; transform: translateY(-1px); } 100% { opacity: 1; transform: translateY(0); } }
          `}</style>
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

          <div className="flex gap-2 mb-6 items-center">
            {Object.entries(statusCounts).map(([status, count]) => {
              const icon = statusIcons[status] || 'ri-checkbox-blank-line';
              const color = statusOptions.find(s => s.id === status)?.color || 'bg-gray-100 text-gray-800';
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-xs cursor-pointer ${
                    statusFilter === status
                      ? 'border-rose-500 bg-rose-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded ${color}`}>
                    <i className={`${icon} text-sm`}></i>
                  </span>
                  <div className="flex flex-col leading-none text-left">
                    <span className="font-bold text-sm text-gray-900">{count}</span>
                    <span className="text-[11px] text-gray-600">{status}</span>
                  </div>
                </button>
              );
            })}
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

            {/* Lista: tabela responsiva com filtros rápidos */}
            <div className="p-4">
              <div className="mb-2" />

              <div className="w-full">
                <table className="w-full table-auto border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-gray-600">Cliente</th>
                      <th className="hidden sm:table-cell px-3 py-2 text-left text-xs text-gray-600">Serviço</th>
                      <th className="hidden sm:table-cell px-3 py-2 text-left text-xs text-gray-600">Status</th>
                      <th className="hidden sm:table-cell px-3 py-2 text-left text-xs text-gray-600">Prazo</th>
                      <th className="px-3 py-2 text-right text-xs text-gray-600">Valor</th>
                      <th className="px-3 py-2 text-center text-xs text-gray-600">Ações <span className="text-[11px] text-gray-500">/ Envios</span></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {sortedOrders.map(order => {
                      const due = deliveryIndicator(order.dateOut);
                      const isLate = due === 'late';
                      return (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="px-3 py-3 align-top text-sm text-gray-900 min-w-0">
                            <div className="font-medium">{order.client}</div>
                            <div className="text-xs text-gray-500">{order.id}</div>
                            <div className="sm:hidden mt-1 text-xs text-gray-600">{order.service} · {order.dateOut || '—'}</div>
                          </td>
                          <td className="hidden sm:table-cell px-3 py-3 align-top text-sm text-gray-700 break-words">{order.service}</td>
                          <td className="px-3 py-3 align-top text-sm">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => { setSelectedOrder(order); setStatusSelection(order.status); setShowStatusOnlyModal(true); setShowStatusMessageOptions(false); }}
                                  title="Clique para alterar o status"
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${statusOptions.find(s => s.id === order.status)?.color || 'bg-gray-100 text-gray-700'}`}
                                >
                                  {order.status}
                                </button>
                              </div>
                          </td>
                          <td className="px-3 py-3 align-top text-sm text-gray-700">
                            {order.dateOut ? (
                              (() => {
                                const daysLeft = daysUntil(order.dateOut);
                                if (daysLeft === null) return <span>{order.dateOut}</span>;
                                if (daysLeft < 0) {
                                  return (
                                    <div className="flex items-center gap-2">
                                      <span className="text-red-600 font-bold">{order.dateOut}</span>
                                      <span className="text-red-600 text-xs font-bold">ATRASADO</span>
                                    </div>
                                  );
                                }
                                if (daysLeft === 0) {
                                  return <span className="text-yellow-800 text-xs font-bold">ENTREGA HOJE</span>;
                                }
                                return <span className="text-green-600 font-medium">Faltam {daysLeft} dias</span>;
                              })()
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top text-sm text-right">
                            <div onClick={() => togglePaymentStatus(order)} className="font-bold text-green-600 cursor-pointer">{order.value}</div>
                              <div className="text-xs mt-1 flex items-center justify-center gap-2">
                                <button onClick={() => togglePaymentStatus(order)} className={"inline-flex items-center gap-1 text-sm px-2 py-1 rounded " + (order.paymentStatus === 'Pago' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600') }>
                                  <i className="ri-money-dollar-circle-line"></i>
                                  {order.paymentStatus === 'Pago' ? 'Pago' : 'Não Pago'}
                                </button>
                              </div>
                          </td>
                          <td className="px-3 py-3 align-top text-sm text-center">
                            <div className="flex items-center justify-center gap-3">
                              <div className="flex items-center gap-2">
                                {order.status !== 'Em costura' && order.status !== 'Pronto' && order.status !== 'Retirado' && (
                                  <button onClick={() => applyQuickStatus(order, 'Em costura')} title="Iniciar" className="w-8 h-8 flex items-center justify-center text-white bg-blue-600 rounded">
                                    <i className="ri-play-line"></i>
                                  </button>
                                )}

                                {order.status !== 'Pronto' && order.status !== 'Retirado' && (
                                  <button onClick={() => applyQuickStatus(order, 'Pronto')} title="Finalizar" className="w-8 h-8 flex items-center justify-center text-white bg-green-600 rounded">
                                    <i className="ri-check-line"></i>
                                  </button>
                                )}

                                {order.status === 'Pronto' && order.status !== 'Retirado' && (
                                  <button onClick={() => applyQuickStatus(order, 'Retirado')} title="Marcar Retirado" className="w-8 h-8 flex items-center justify-center text-white bg-purple-600 rounded">
                                    <i className="ri-hand-heart-line"></i>
                                  </button>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <button onClick={() => handleEdit(order)} title="Editar" className="w-8 h-8 flex items-center justify-center text-rose-600 bg-rose-50 rounded">
                                  <i className="ri-edit-line"></i>
                                </button>
                                <button onClick={() => handleDelete(order)} title="Excluir" className="w-8 h-8 flex items-center justify-center text-red-600 bg-red-50 rounded">
                                  <i className="ri-delete-bin-line"></i>
                                </button>
                              </div>

                              {order.phone && (
                                <div className="flex items-center gap-2">
                                  {order.sentMessages?.[order.status] === 'sent' ? (
                                    <span title="Mensagem enviada" className="text-green-600 text-sm">📲</span>
                                  ) : order.sentMessages?.[order.status] === 'pending' ? (
                                    <span title="Pendente" className="text-yellow-600 text-sm">⏳</span>
                                  ) : null}

                                  <button onClick={() => copyMessageManual(order, order.status)} title="Copiar mensagem" className="w-8 h-8 flex items-center justify-center text-gray-700 bg-gray-50 rounded hover:bg-gray-100">
                                    <i className="ri-file-copy-line"></i>
                                  </button>
                                  <button onClick={() => sendMessageManual(order, order.status)} title="Enviar via WhatsApp" className="w-8 h-8 flex items-center justify-center text-rose-600 bg-rose-50 rounded hover:bg-rose-100">
                                    <i className="ri-send-plane-line"></i>
                                  </button>
                                  <button onClick={() => { const m = getFormattedMessage(order, order.status); const phone = (order.phone||'').replace(/\D/g,''); window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(m)}`, '_blank'); }} title="Abrir WhatsApp" className="w-8 h-8 flex items-center justify-center text-amber-700 bg-amber-50 rounded hover:bg-amber-100">
                                    <i className="ri-whatsapp-line"></i>
                                  </button>
                                </div>
                              )}

                                {/* Modal Confirmar Entrega (pergunta inicial quando não pago) */}
                                {showConfirmDeliverPrompt && selectedOrder && (
                                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                    <div className="bg-white rounded-lg w-full max-w-md">
                                      <div className="p-4 lg:p-6">
                                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                          <i className="ri-alert-line text-2xl text-yellow-600 w-6 h-6 flex items-center justify-center"></i>
                                        </div>
                                        <h2 className="text-lg lg:text-xl font-bold text-gray-900 text-center mb-2">Confirmar Entrega</h2>
                                        <p className="text-sm text-gray-600 text-center mb-4">Cliente ainda não pagou, deseja realmente entregar?</p>
                                        <div className="flex gap-3 justify-center">
                                          <button onClick={() => { setShowConfirmDeliverPrompt(false); setSelectedOrder(null); }} className="px-4 py-2 border rounded">Não</button>
                                          <button onClick={() => { setShowConfirmDeliverPrompt(false); setShowPaymentModal(true); }} className="px-4 py-2 bg-green-600 text-white rounded">Sim</button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select value={newOrderStatus} onChange={(e) => setNewOrderStatus(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm">
                    {statusOptions.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                  <div className="mt-2 flex items-center gap-2">
                    <i className="ri-money-dollar-circle-line text-lg text-gray-700"></i>
                    <select value={newOrderPaymentStatus || ''} onChange={(e) => setNewOrderPaymentStatus(e.target.value || null)} className="px-2 py-1 border rounded text-sm">
                      <option value="">Falta Pagar</option>
                      <option value="Pago">Pago</option>
                    </select>
                  </div>
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
                    value={newOrderDate}
                    onChange={(e) => setNewOrderDate(e.target.value)}
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">Categoria do Serviço</label>
                    <select value={newServiceCategoryFilter} onChange={(e) => setNewServiceCategoryFilter(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 cursor-pointer mb-2">
                      <option value="">Todas as categorias</option>
                      {serviceCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Serviço</label>
                    <div className="flex gap-2 items-center">
                      <select 
                        value={selectedServiceId}
                        onChange={handleServiceSelect}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 cursor-pointer"
                      >
                        <option value="">Selecione um serviço...</option>
                        {servicosDisponiveisState.filter(s => !newServiceCategoryFilter || s.category === newServiceCategoryFilter).map((service) => (
                          <option key={service.id} value={service.id}>
                            {serviceCategories.find(c => c.id === service.category)?.name || service.category} - {service.name} (R$ {service.price.toFixed(2)})
                          </option>
                        ))}
                      </select>
                      <button title="Adicionar serviço" onClick={() => { setShowInlineServiceForm(!showInlineServiceForm); setInlineServiceCategory(newServiceCategoryFilter || serviceCategories[0]?.id || ''); }} className="w-9 h-9 bg-rose-50 text-rose-600 rounded flex items-center justify-center hover:bg-rose-100">
                        <i className="ri-add-line"></i>
                      </button>
                    </div>

                    {showInlineServiceForm && (
                      <div className="mt-3 p-3 border border-dashed rounded bg-gray-50">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Categoria</label>
                            <select value={inlineServiceCategory} onChange={(e) => setInlineServiceCategory(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm">
                              {serviceCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Nome do Serviço</label>
                            <input value={inlineServiceName} onChange={(e) => setInlineServiceName(e.target.value)} className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Valor (R$)</label>
                            <input value={inlineServicePrice} onChange={(e) => setInlineServicePrice(e.target.value)} type="number" step="0.01" className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm" />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end mt-3">
                          <button onClick={() => { setShowInlineServiceForm(false); setInlineServiceName(''); setInlineServicePrice(''); }} className="px-3 py-2 border rounded text-sm">Cancelar</button>
                          <button onClick={() => {
                            if (!inlineServiceName || !inlineServicePrice) return alert('Preencha nome e valor do serviço');
                            const id = Date.now();
                            const newSvc = { id, name: inlineServiceName, category: inlineServiceCategory, price: parseFloat(inlineServicePrice) };
                            setServicosDisponiveisState([...servicosDisponiveisState, newSvc]);
                            setSelectedServiceId(String(id));
                            setServiceValue(parseFloat(inlineServicePrice).toFixed(2));
                            setInlineServiceName(''); setInlineServicePrice(''); setShowInlineServiceForm(false);
                          }} className="px-3 py-2 bg-green-600 text-white rounded text-sm">Salvar serviço</button>
                        </div>
                      </div>
                    )}
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
                  <input type="text" value={editClient} onChange={(e) => setEditClient(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500 cursor-pointer">
                    {serviceCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Tipo de Serviço</label>
                <select value={editServiceName} onChange={(e) => setEditServiceName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500 cursor-pointer">
                  <option value="">Selecione um serviço...</option>
                  {servicosDisponiveisState.filter(s => !editCategory || s.category === editCategory).map(s => (
                    <option key={s.id} value={s.name}>{s.name} (R$ {s.price.toFixed(2)})</option>
                  ))}
                  {editServiceName && !servicosDisponiveisState.some(s => s.name === editServiceName) && (
                    <option value={editServiceName}>{editServiceName}</option>
                  )}
                </select>
              </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                  <input type="text" value={editValue} onChange={(e) => setEditValue(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500 cursor-pointer">
                    {statusOptions.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Data de Entrada</label>
                  <input type="date" value={editDateIn} onChange={(e) => setEditDateIn(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" />
                </div>
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Prazo de Entrega</label>
                  <input type="date" value={editDateOut} onChange={(e) => setEditDateOut(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Observações</label>
                <textarea rows={3} value={editObservation} onChange={(e) => setEditObservation(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500"></textarea>
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
                onClick={() => {
                  // save edits to orders and notify client via WhatsApp
                  const dateInStr = editDateIn ? editDateIn.split('-').reverse().join('/') : selectedOrder.dateIn;
                  const dateOutStr = editDateOut ? editDateOut.split('-').reverse().join('/') : selectedOrder.dateOut;
                  const updatedOrder = {
                    ...selectedOrder,
                    client: editClient,
                    category: serviceCategories.find(c => c.id === editCategory)?.name || editCategory,
                    service: editServiceName,
                    value: editValue.startsWith('R$') ? editValue : `R$ ${editValue}`,
                    status: editStatus,
                    dateIn: dateInStr,
                    dateOut: dateOutStr,
                    observation: editObservation,
                  };
                  setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
                  // preparar mensagem e abrir opções de envio (copiar/enviar/não enviar)
                  setSelectedOrder(updatedOrder);
                  setStatusChangeMessage(composeStatusMessage(updatedOrder, editStatus));
                  setShowStatusMessageOptions(true);
                  setShowStatusOnlyModal(true);
                  setShowEditModal(false);
                }}
                className="flex-1 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all text-sm font-medium whitespace-nowrap cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

        {/* Modal Alterar Status (apenas status + opções de WhatsApp) */}
        {showStatusOnlyModal && selectedOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4">
            <div className="bg-white rounded-lg w-full max-w-md">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-bold">Alterar Status - {selectedOrder.id}</h3>
                <button onClick={() => setShowStatusOnlyModal(false)} className="text-gray-500"><i className="ri-close-line text-2xl"></i></button>
              </div>
              <div className="p-4 space-y-4">
                {!showStatusMessageOptions ? (
                  <>
                    <label className="block text-sm text-gray-700">Novo Status</label>
                    <select value={statusSelection} onChange={(e) => setStatusSelection(e.target.value)} className="w-full px-3 py-2 border rounded">
                      {statusOptions.map(s => (<option key={s.id} value={s.id}>{s.label}</option>))}
                    </select>
                    <div className="flex gap-3 justify-end">
                      <button onClick={() => setShowStatusOnlyModal(false)} className="px-4 py-2 border rounded">Cancelar</button>
                      <button onClick={() => {
                        // If changing to Retirado, handle payment confirmation
                        if (statusSelection === 'Retirado') {
                          if (selectedOrder.paymentStatus === 'Pago') {
                            const updatedOrder = { ...selectedOrder, status: 'Retirado' };
                            setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
                            const msg = composeStatusMessage(updatedOrder, 'Retirado');
                            setStatusChangeMessage(msg);
                            setShowStatusMessageOptions(true);
                            setShowStatusOnlyModal(true);
                            try { addPointsForOrder(updatedOrder); window.dispatchEvent(new CustomEvent('clientsUpdated')); } catch (e) {}
                            return;
                          }
                          // open a confirm prompt modal; if user confirms we'll open the payment modal
                          setSelectedOrder(selectedOrder);
                          setShowStatusOnlyModal(false);
                          setShowConfirmDeliverPrompt(true);
                          return;
                        }

                        // apply status change and prepare message
                        const updatedOrder = { ...selectedOrder, status: statusSelection };
                        setOrders(orders.map(o => o.id === selectedOrder.id ? updatedOrder : o));
                        const msg = composeStatusMessage(updatedOrder, statusSelection);
                        setStatusChangeMessage(msg);
                        setShowStatusMessageOptions(true);
                      }} className="px-4 py-2 bg-rose-600 text-white rounded">Salvar</button>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="block text-sm text-gray-700">Mensagem para o cliente</label>
                    <div className="bg-gray-50 p-3 rounded max-h-40 overflow-y-auto whitespace-pre-line text-sm text-gray-900">{statusChangeMessage}</div>
                    <div className="flex gap-3">
                      <button onClick={() => { navigator.clipboard.writeText(statusChangeMessage); setShowStatusOnlyModal(false); }} className="flex-1 px-3 py-2 border rounded flex items-center justify-center gap-2">Copiar</button>
                      <button onClick={() => { const phone = (selectedOrder.phone || '').replace(/\D/g, ''); const st = statusSelection || selectedOrder.status; window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(statusChangeMessage)}`, '_blank'); try { markMessageSent(selectedOrder.id, st); } catch(e){} setShowStatusOnlyModal(false); }} className="flex-1 px-3 py-2 bg-green-600 text-white rounded flex items-center justify-center gap-2">Enviar</button>
                      <button onClick={() => setShowStatusOnlyModal(false)} className="flex-1 px-3 py-2 border rounded">Não enviar</button>
                    </div>
                  </>
                )}
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
                <button
                  onClick={() => setShowFidelizacaoModal(false)}
                  className="flex-0 px-3 py-2 border border-transparent text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all text-xs lg:text-sm font-medium whitespace-nowrap cursor-pointer flex items-center justify-center gap-2"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
