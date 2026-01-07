import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { supabase } from '../../lib/supabaseClient';

export default function ServicosPage() {
  const [showNewServiceModal, setShowNewServiceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('todos');
  const [showEditMaterialModal, setShowEditMaterialModal] = useState(false);
  const [showDeleteMaterialModal, setShowDeleteMaterialModal] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [showNewMaterialModal, setShowNewMaterialModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'servicos' | 'materiais'>('servicos');

  const serviceCategories = [
    { id: 'todos', name: 'Todos', icon: 'ri-apps-line' },
    { id: 'barras', name: '👖 Barras', icon: 'ri-scissors-line' },
    { id: 'ajustes', name: '✂️ Ajustes', icon: 'ri-pencil-ruler-2-line' },
    { id: 'camisas', name: '👕 Camisas', icon: 'ri-shirt-line' },
    { id: 'vestidos', name: '👗 Vestidos', icon: 'ri-user-3-line' },
    { id: 'saia-short', name: '👔 Saia/Short', icon: 'ri-t-shirt-line' },
    { id: 'calcas', name: '👖 Calças', icon: 'ri-scissors-2-line' },
    { id: 'casacos', name: '🧥 Casacos', icon: 'ri-hoodie-line' },
    { id: 'consertos', name: '🧵 Consertos', icon: 'ri-tools-line' },
    { id: 'sociais', name: '👔 Sociais', icon: 'ri-briefcase-line' },
    { id: 'infantis', name: '👶 Infantis', icon: 'ri-bear-smile-line' },
    { id: 'domestica', name: '🛋️ Doméstica', icon: 'ri-home-4-line' },
    { id: 'especiais', name: '🎨 Especiais', icon: 'ri-star-line' },
  ];

  const [services, setServices] = useState<any[]>([]);

  const defaultServices = [
    { id: 1, category: 'barras', name: 'Barra simples de calça', price: 35, time: '30 min', count: 45 },
    { id: 2, category: 'barras', name: 'Barra italiana', price: 45, time: '45 min', count: 28 },
    { id: 3, category: 'barras', name: 'Barra original (jeans)', price: 50, time: '60 min', count: 32 },
    { id: 4, category: 'barras', name: 'Barra de saia', price: 30, time: '30 min', count: 18 },
    { id: 5, category: 'barras', name: 'Barra de vestido', price: 40, time: '45 min', count: 22 },
    { id: 6, category: 'barras', name: 'Barra de cortina', price: 25, time: '30 min', count: 12 },
    { id: 7, category: 'ajustes', name: 'Ajuste de cintura', price: 45, time: '45 min', count: 38 },
    { id: 8, category: 'ajustes', name: 'Ajuste de quadril', price: 50, time: '60 min', count: 25 },
    { id: 9, category: 'ajustes', name: 'Ajuste de lateral', price: 55, time: '60 min', count: 20 },
    { id: 10, category: 'ajustes', name: 'Ajuste de comprimento', price: 40, time: '45 min', count: 30 },
    { id: 11, category: 'ajustes', name: 'Ajuste de manga', price: 35, time: '30 min', count: 22 },
    { id: 12, category: 'ajustes', name: 'Ajuste de ombro', price: 45, time: '45 min', count: 15 },
    { id: 13, category: 'ajustes', name: 'Ajuste geral', price: 80, time: '90 min', count: 18 },
    { id: 14, category: 'camisas', name: 'Ajuste de camisa social', price: 50, time: '60 min', count: 24 },
    { id: 15, category: 'camisas', name: 'Encurtar manga', price: 30, time: '30 min', count: 20 },
    { id: 16, category: 'camisas', name: 'Apertar manga', price: 35, time: '45 min', count: 16 },
    { id: 17, category: 'camisas', name: 'Troca de colarinho', price: 40, time: '45 min', count: 8 },
    { id: 18, category: 'camisas', name: 'Troca de punho', price: 35, time: '30 min', count: 10 },
    { id: 19, category: 'vestidos', name: 'Ajuste de vestido', price: 80, time: '90 min', count: 35 },
    { id: 20, category: 'vestidos', name: 'Ajuste de alça', price: 30, time: '30 min', count: 18 },
    { id: 21, category: 'vestidos', name: 'Ajuste de busto', price: 50, time: '60 min', count: 22 },
    { id: 22, category: 'vestidos', name: 'Ajuste de cintura', price: 45, time: '45 min', count: 28 },
    { id: 23, category: 'vestidos', name: 'Ajuste de comprimento', price: 40, time: '45 min', count: 20 },
    { id: 24, category: 'vestidos', name: 'Reforma completa', price: 150, time: '180 min', count: 8 },
    { id: 25, category: 'saia-short', name: 'Ajuste de saia', price: 40, time: '45 min', count: 15 },
    { id: 26, category: 'saia-short', name: 'Ajuste de short', price: 35, time: '30 min', count: 12 },
    { id: 27, category: 'saia-short', name: 'Ajuste de bermuda', price: 35, time: '30 min', count: 10 },
    { id: 28, category: 'saia-short', name: 'Troca de zíper', price: 45, time: '45 min', count: 18 },
    { id: 29, category: 'saia-short', name: 'Ajuste de cós', price: 40, time: '45 min', count: 14 },
    { id: 30, category: 'calcas', name: 'Ajuste de calça social', price: 50, time: '60 min', count: 25 },
    { id: 31, category: 'calcas', name: 'Ajuste de jeans', price: 55, time: '60 min', count: 30 },
    { id: 32, category: 'calcas', name: 'Troca de zíper de calça', price: 45, time: '45 min', count: 22 },
    { id: 33, category: 'calcas', name: 'Troca de botão', price: 15, time: '15 min', count: 35 },
    { id: 34, category: 'calcas', name: 'Reforço de costura', price: 30, time: '30 min', count: 18 },
    { id: 35, category: 'calcas', name: 'Reparo em rasgo', price: 40, time: '45 min', count: 20 },
    { id: 36, category: 'casacos', name: 'Ajuste de jaqueta', price: 70, time: '90 min', count: 12 },
    { id: 37, category: 'casacos', name: 'Ajuste de casaco', price: 80, time: '90 min', count: 10 },
    { id: 38, category: 'casacos', name: 'Troca de forro', price: 90, time: '120 min', count: 8 },
    { id: 39, category: 'casacos', name: 'Ajuste de manga', price: 50, time: '60 min', count: 15 },
    { id: 40, category: 'casacos', name: 'Troca de zíper de jaqueta', price: 60, time: '60 min', count: 12 },
    { id: 41, category: 'consertos', name: 'Troca de zíper', price: 45, time: '45 min', count: 40 },
    { id: 42, category: 'consertos', name: 'Troca de botão', price: 15, time: '15 min', count: 50 },
    { id: 43, category: 'consertos', name: 'Aplicação de botão', price: 20, time: '20 min', count: 30 },
    { id: 44, category: 'consertos', name: 'Reforço de costura', price: 30, time: '30 min', count: 25 },
    { id: 45, category: 'consertos', name: 'Bainha', price: 25, time: '30 min', count: 35 },
    { id: 46, category: 'consertos', name: 'Conserto de rasgo', price: 40, time: '45 min', count: 28 },
    { id: 47, category: 'consertos', name: 'Pregar colchete', price: 15, time: '15 min', count: 20 },
    { id: 48, category: 'consertos', name: 'Ajuste de elástico', price: 30, time: '30 min', count: 18 },
    { id: 49, category: 'sociais', name: 'Ajuste de terno', price: 120, time: '120 min', count: 8 },
    { id: 50, category: 'sociais', name: 'Ajuste de paletó', price: 90, time: '90 min', count: 12 },
    { id: 51, category: 'sociais', name: 'Ajuste de blazer', price: 85, time: '90 min', count: 15 },
    { id: 52, category: 'sociais', name: 'Ajuste de colete', price: 60, time: '60 min', count: 6 },
    { id: 53, category: 'sociais', name: 'Ajuste de calça social', price: 50, time: '60 min', count: 20 },
    { id: 54, category: 'infantis', name: 'Ajuste de roupa infantil', price: 30, time: '30 min', count: 25 },
    { id: 55, category: 'infantis', name: 'Barra infantil', price: 20, time: '20 min', count: 30 },
    { id: 56, category: 'infantis', name: 'Conserto geral infantil', price: 35, time: '45 min', count: 18 },
    { id: 57, category: 'domestica', name: 'Barra de cortina', price: 25, time: '30 min', count: 15 },
    { id: 58, category: 'domestica', name: 'Ajuste de toalha', price: 20, time: '20 min', count: 10 },
    { id: 59, category: 'domestica', name: 'Ajuste de capa de almofada', price: 30, time: '30 min', count: 12 },
    { id: 60, category: 'domestica', name: 'Conserto de roupa de cama', price: 35, time: '45 min', count: 8 },
    { id: 61, category: 'especiais', name: 'Reforma completa de roupa', price: 150, time: '180 min', count: 10 },
    { id: 62, category: 'especiais', name: 'Customização', price: 100, time: '120 min', count: 12 },
    { id: 63, category: 'especiais', name: 'Ajustes sob medida', price: 120, time: '120 min', count: 8 },
    { id: 64, category: 'especiais', name: 'Costura sob encomenda', price: 200, time: '240 min', count: 5 },
  ];

  const defaultMaterials = [
    { id: 1, name: 'Linha de costura poliéster', unit: 'metro', price: 0.50 },
    { id: 2, name: 'Linha de algodão', unit: 'metro', price: 0.60 },
    { id: 3, name: 'Linha para jeans', unit: 'metro', price: 0.80 },
    { id: 4, name: 'Linha para overlock', unit: 'metro', price: 0.70 },
    { id: 5, name: 'Linha invisível (nylon)', unit: 'metro', price: 1.00 },
    { id: 6, name: 'Linha encerada', unit: 'metro', price: 0.90 },
    { id: 7, name: 'Linha para bordado', unit: 'metro', price: 1.20 },
    { id: 8, name: 'Agulha de máquina doméstica', unit: 'unidade', price: 2.00 },
    { id: 9, name: 'Agulha de máquina industrial', unit: 'unidade', price: 3.00 },
    { id: 10, name: 'Agulha para jeans', unit: 'unidade', price: 2.50 },
    { id: 11, name: 'Agulha para malha', unit: 'unidade', price: 2.50 },
    { id: 12, name: 'Agulha para tecidos finos', unit: 'unidade', price: 2.00 },
    { id: 13, name: 'Agulha de mão', unit: 'unidade', price: 1.00 },
    { id: 14, name: 'Agulha curva', unit: 'unidade', price: 3.50 },
    { id: 15, name: 'Botão comum', unit: 'unidade', price: 0.50 },
    { id: 16, name: 'Botão de pressão', unit: 'unidade', price: 1.00 },
    { id: 17, name: 'Botão de jeans', unit: 'unidade', price: 1.50 },
    { id: 18, name: 'Botão forrado', unit: 'unidade', price: 2.00 },
    { id: 19, name: 'Colchete', unit: 'unidade', price: 0.80 },
    { id: 20, name: 'Gancho', unit: 'unidade', price: 0.80 },
    { id: 21, name: 'Ilhós', unit: 'unidade', price: 0.60 },
    { id: 22, name: 'Fecho de metal', unit: 'unidade', price: 1.50 },
    { id: 23, name: 'Fecho plástico', unit: 'unidade', price: 1.00 },
    { id: 24, name: 'Zíper comum', unit: 'unidade', price: 5.00 },
    { id: 25, name: 'Zíper invisível', unit: 'unidade', price: 7.00 },
    { id: 26, name: 'Zíper de metal', unit: 'unidade', price: 8.00 },
    { id: 27, name: 'Zíper de nylon', unit: 'unidade', price: 6.00 },
    { id: 28, name: 'Zíper destacável (jaquetas)', unit: 'unidade', price: 10.00 },
    { id: 29, name: 'Cursor de zíper (puxador)', unit: 'unidade', price: 2.00 },
    { id: 30, name: 'Elástico comum', unit: 'metro', price: 1.50 },
    { id: 31, name: 'Elástico roliço', unit: 'metro', price: 2.00 },
    { id: 32, name: 'Elástico largo', unit: 'metro', price: 3.00 },
    { id: 33, name: 'Elástico para cintura', unit: 'metro', price: 2.50 },
    { id: 34, name: 'Elástico para punho', unit: 'metro', price: 1.80 },
    { id: 35, name: 'Tecido para remendo', unit: 'metro', price: 10.00 },
    { id: 36, name: 'Forro', unit: 'metro', price: 8.00 },
    { id: 37, name: 'Entretela', unit: 'metro', price: 6.00 },
    { id: 38, name: 'Viés', unit: 'metro', price: 2.00 },
    { id: 39, name: 'Renda', unit: 'metro', price: 5.00 },
    { id: 40, name: 'Fita de cetim', unit: 'metro', price: 1.50 },
    { id: 41, name: 'Fita de gorgurão', unit: 'metro', price: 2.00 },
    { id: 42, name: 'Passamanaria', unit: 'metro', price: 3.00 },
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
    { id: 53, name: 'Cola para tecido', unit: 'unidade', price: 8.00 },
    { id: 54, name: 'Spray fixador', unit: 'unidade', price: 12.00 },
    { id: 55, name: 'Amaciante de costura', unit: 'litro', price: 10.00 },
    { id: 56, name: 'Ferro de passar', unit: 'unidade', price: 80.00 },
    { id: 57, name: 'Papel para molde', unit: 'metro', price: 2.00 },
    { id: 58, name: 'Papel carbono para costura', unit: 'folha', price: 1.50 },
    { id: 59, name: 'Bainha termocolante', unit: 'metro', price: 3.00 },
    { id: 60, name: 'Fita termocolante', unit: 'metro', price: 2.50 },
    { id: 61, name: 'Linha para acabamento fino', unit: 'metro', price: 1.00 },
    { id: 62, name: 'Entretela termocolante', unit: 'metro', price: 7.00 },
    { id: 63, name: 'Saco plástico para roupa', unit: 'unidade', price: 0.50 },
    { id: 64, name: 'Capa protetora', unit: 'unidade', price: 2.00 },
    { id: 65, name: 'Etiqueta de identificação', unit: 'unidade', price: 0.30 },
    { id: 66, name: 'Tag de cliente', unit: 'unidade', price: 0.40 },
  ];

  const handleEdit = (service: any) => {
    setSelectedService(service);
    setShowEditModal(true);
  };

  const handleDelete = (service: any) => {
    setSelectedService(service);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    const updated = services.filter(s => s.id !== selectedService.id);
    setServices(updated);
    try { localStorage.setItem('services', JSON.stringify(updated)); localStorage.setItem('servicesOrder', JSON.stringify(updated.map(s=>s.id))); } catch(e){}
    setShowDeleteModal(false);
    setSelectedService(null);
  };

  const handleSaveEdit = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    try {
      // read values from modal form if provided
      let name = selectedService?.name || '';
      let category = selectedService?.category || '';
      let price = Number(selectedService?.price || 0) || 0;
      let time = selectedService?.time || '';
      if (e && e.currentTarget) {
        const form = new FormData(e.currentTarget as HTMLFormElement);
        name = (form.get('name') as string) || name;
        category = (form.get('category') as string) || category;
        const rawPrice = (form.get('price') as string) || String(price);
        price = Number(String(rawPrice).replace(/[^0-9,\.]/g, '').replace(',', '.')) || 0;
        time = (form.get('time') as string) || time;
      }

      const updated = { ...selectedService, name, category, price, time };
      const newServices = services.map(s => s.id === selectedService.id ? updated : s);
      setServices(newServices);
      try { localStorage.setItem('services', JSON.stringify(newServices)); localStorage.setItem('servicesOrder', JSON.stringify(newServices.map(s=>s.id))); } catch(e){}

      // persist to supabase when possible
      try {
        if (supabase && (selectedService?.__raw?.id || selectedService?.id)) {
          const idToUpdate = selectedService.__raw?.id || selectedService.id;
          // only update columns that actually exist in DB: titulo, preco, duracao_minutos
          const payload: any = { titulo: name, preco: price };
          const minutes = parseInt(String(time || '').replace(/[^0-9]/g, '')) || null;
          if (minutes) payload.duracao_minutos = minutes;
          // perform update then fetch the updated row explicitly
          const updRes = await supabase.from('servicos').update(payload).eq('id', idToUpdate);
          if ((updRes as any).error) {
            console.warn('supabase update error', (updRes as any).error);
          }
          const sel = await supabase.from('servicos').select('*').eq('id', idToUpdate).maybeSingle();
          if (!(sel as any).error && (sel as any).data) {
            const row = (sel as any).data;
            // map server row to UI shape
            const mappedRow = {
              id: row.id,
              category: row.categoria || row.category || category || 'outros',
              name: row.titulo || row.nome || name,
              price: Number(row.preco ?? row.price ?? price) || 0,
              time: row.duracao_minutos ? `${row.duracao_minutos} min` : (row.time || time),
              count: Number(row.popularidade || row.count || 0) || 0,
              __raw: row,
            };
            setServices(services.map(s => s.id === updated.id ? mappedRow : s));
            // persist to localStorage
            try {
              const raw = localStorage.getItem('services');
              const arr = raw ? JSON.parse(raw) : services;
              const newArr = Array.isArray(arr) ? arr.map((s:any) => s.id === mappedRow.id ? mappedRow : s) : services;
              localStorage.setItem('services', JSON.stringify(newArr));
            } catch (err) { /* ignore */ }
          } else {
            // no server row returned; nothing else to do (we already optimistically updated local state)
          }
        }
      } catch (err) { console.warn('failed to persist service edit to supabase', err); }

      // persist to localStorage fallback
      try {
        const raw = localStorage.getItem('services');
        const arr = raw ? JSON.parse(raw) : services;
        const newArr = Array.isArray(arr) ? arr.map((s:any) => s.id === updated.id ? updated : s) : services;
        localStorage.setItem('services', JSON.stringify(newArr));
      } catch (err) { /* ignore */ }
    } catch (err) { console.warn('save edit service failed', err); }
    setShowEditModal(false);
    setSelectedService(null);
  };

  const filteredServices = services.filter(service => {
    const name = (service && service.name) ? String(service.name) : '';
    const matchesSearch = name.toLowerCase().includes((searchTerm || '').toLowerCase());
    const matchesCategory = selectedCategory === 'todos' || (service && service.category ? service.category : '') === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalServices = services.length;
  const totalRevenue = services.reduce((sum, s) => sum + (s.price * (s.count || 0)), 0);
  const avgPrice = services.length ? Math.round(services.reduce((sum, s) => sum + s.price, 0) / services.length) : 0;
  const mostPopular = services.length ? services.slice().sort((a, b) => (b.count || 0) - (a.count || 0))[0] : { name: '-' };

  // Lista de materiais disponíveis
  const [availableMaterials, setAvailableMaterials] = useState<any[]>([]);

  // fetch services and materials from Supabase on mount, fallback to localStorage
  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        if (supabase && typeof supabase.from === 'function') {
          const svcRes = await supabase.from('servicos').select('*');
          if (!(svcRes as any).error && Array.isArray((svcRes as any).data) && mounted) {
            const svcData = (svcRes as any).data;
            if (svcData.length === 0) {
              try {
                await supabase.from('servicos').insert(defaultServices);
                // defaultServices already in correct shape
                setServices(defaultServices);
              } catch (e) { console.warn('failed to seed servicos', e); setServices(defaultServices); }
            } else {
              // map DB fields to UI shape
              const normalize = (str: any) => (str || '').toString().toLowerCase().replace(/[^a-z0-9áàâãäéèêëíìîïóòôõöúùûüç ]/g,'').trim();
              const mapped = svcData.map((s: any) => {
                const name = s.titulo || s.nome || s.title || '';
                let category = s.categoria || s.category || (s.descricao && s.descricao.categoria) || '';
                if (!category) {
                  // try infer from defaultServices by name match
                  const n = normalize(name);
                  const found = defaultServices.find(d => normalize(d.name) === n);
                  if (found) category = found.category || found.categoria || '';
                }
                if (!category) category = 'outros';
                return {
                  id: s.id,
                  category,
                  name,
                  price: Number(s.preco ?? s.price ?? 0) || 0,
                  time: s.duracao_minutos ? `${s.duracao_minutos} min` : (s.time || ''),
                  count: Number(s.popularidade || s.count || 0) || 0,
                  __raw: s,
                };
              });
              // prefer persisted order from localStorage, else preserve current UI order, else use server order
              setServices((prev:any[]) => {
                try {
                  const stored = (() => { try { return JSON.parse(localStorage.getItem('servicesOrder') || 'null'); } catch(e){return null} })();
                  let ordered: any[] = [];
                  if (Array.isArray(stored) && stored.length > 0) {
                    const ids: string[] = stored;
                    ordered = ids.map(id => mapped.find(m => m.id === id)).filter(x => !!x).concat(mapped.filter(m => !ids.includes(m.id)));
                  } else if (prev && prev.length > 0) {
                    const prevIds = prev.map(p => p.id);
                    ordered = prevIds.map(id => mapped.find(m => m.id === id)).filter(x => !!x).concat(mapped.filter(m => !prevIds.includes(m.id)));
                  } else {
                    ordered = mapped;
                  }
                  // prioritize specific services within their category (move to top of category)
                  try {
                    const prioritized = ['barra italiana','barra simples de calça'];
                    const byCategory: Record<string, any[]> = {};
                    ordered.forEach(item => { byCategory[item.category] = byCategory[item.category] || []; byCategory[item.category].push(item); });
                    Object.keys(byCategory).forEach(cat => {
                      const list = byCategory[cat];
                      const pri = prioritized.map(p => list.find(l => (l.name || '').toString().toLowerCase() === p)).filter(Boolean);
                      const rest = list.filter(l => !pri.includes(l));
                      byCategory[cat] = [...pri, ...rest];
                    });
                    const finalOrdered = Object.keys(byCategory).flatMap(cat => byCategory[cat]);
                    ordered = finalOrdered;
                    localStorage.setItem('services', JSON.stringify(ordered));
                    localStorage.setItem('servicesOrder', JSON.stringify(ordered.map(s=>s.id)));
                  } catch(e){}
                  return ordered as any[];
                } catch (e) {
                  try { localStorage.setItem('services', JSON.stringify(mapped)); localStorage.setItem('servicesOrder', JSON.stringify(mapped.map(s=>s.id))); } catch(_){ }
                  return mapped;
                }
              });
            }
          }
          const matRes = await supabase.from('materiais').select('*');
          if (!(matRes as any).error && Array.isArray((matRes as any).data) && mounted) {
            const matData = (matRes as any).data;
            if (matData.length === 0) {
              try {
                await supabase.from('materiais').insert(defaultMaterials);
                setAvailableMaterials(defaultMaterials);
              } catch (e) { console.warn('failed to seed materiais', e); setAvailableMaterials(defaultMaterials); }
            } else {
              const mappedM = matData.map((m: any) => ({
                id: m.id,
                name: m.nome || m.name || '',
                unit: m.unidade || m.unit || '',
                price: Number(m.preco ?? m.price ?? 0) || 0,
                estoque: Number(m.estoque ?? m.stock ?? 0) || 0,
                __raw: m,
              }));
              setAvailableMaterials(mappedM);
            }
          }
          return;
        }
      } catch (e) {
        console.warn('servicos fetch error', e);
      }

      // fallback localStorage
      try {
        const rawServices = localStorage.getItem('services');
        if (rawServices) {
          const parsed = JSON.parse(rawServices);
          if (Array.isArray(parsed) && mounted) setServices(parsed);
        }
        const rawMats = localStorage.getItem('materials');
        if (rawMats) {
          const parsedM = JSON.parse(rawMats);
          if (Array.isArray(parsedM) && mounted) setAvailableMaterials(parsedM);
        }
      } catch (e) { console.warn('localStorage parse failed', e); }
    }
    fetchData();
    return () => { mounted = false; };
  }, []);

  const handleEditMaterial = (material: any) => {
    setSelectedMaterial(material);
    setShowEditMaterialModal(true);
  };

  const handleDeleteMaterial = (material: any) => {
    setSelectedMaterial(material);
    setShowDeleteMaterialModal(true);
  };

  const confirmDeleteMaterial = () => {
    setAvailableMaterials(availableMaterials.filter(m => m.id !== selectedMaterial.id));
    setShowDeleteMaterialModal(false);
    setSelectedMaterial(null);
  };

  const handleSaveEditMaterial = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updatedMaterial = {
      ...selectedMaterial,
      name: formData.get('name') as string,
      unit: formData.get('unit') as string,
      price: parseFloat(formData.get('price') as string),
    };
    setAvailableMaterials(availableMaterials.map(m => 
      m.id === selectedMaterial.id ? updatedMaterial : m
    ));
    // persist material to supabase when possible
    (async () => {
      try {
        if (supabase && selectedMaterial?.__raw && selectedMaterial.__raw.id) {
          await supabase.from('materiais').update({ nome: updatedMaterial.name, unidade: updatedMaterial.unit, preco: updatedMaterial.price }).eq('id', selectedMaterial.__raw.id);
        } else if (supabase && selectedMaterial?.id) {
          await supabase.from('materiais').update({ nome: updatedMaterial.name, unidade: updatedMaterial.unit, preco: updatedMaterial.price }).eq('id', selectedMaterial.id);
        }
      } catch (err) { console.warn('failed to persist material edit to supabase', err); }
    })();
    setShowEditMaterialModal(false);
    setSelectedMaterial(null);
  };

  const handleAddNewMaterial = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newMaterial = {
      id: Math.max(...availableMaterials.map(m => m.id)) + 1,
      name: formData.get('name') as string,
      unit: formData.get('unit') as string,
      price: parseFloat(formData.get('price') as string),
    };
    setAvailableMaterials([...availableMaterials, newMaterial]);
    // try to persist new material to supabase
    (async () => {
      try {
        if (supabase) {
          await supabase.from('materiais').insert({ nome: newMaterial.name, unidade: newMaterial.unit, preco: newMaterial.price });
        }
      } catch (err) { console.warn('failed to persist new material', err); }
    })();
    setShowNewMaterialModal(false);
  };

  const totalMaterials = availableMaterials.length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0">
        <div className="p-4 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-4 lg:mb-6 gap-3">
            <div>
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">Serviços e Materiais</h1>
              <p className="text-sm lg:text-base text-gray-600">Gerencie seus serviços, valores e materiais</p>
            </div>
          </div>

          {/* Botões de Navegação */}
          <div className="grid grid-cols-2 gap-3 mb-4 lg:mb-6">
            <button
              onClick={() => setActiveTab('servicos')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer text-sm ${
                activeTab === 'servicos'
                  ? 'bg-rose-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <i className="ri-scissors-line text-lg w-5 h-5 flex items-center justify-center"></i>
              Serviços
            </button>
            <button
              onClick={() => setActiveTab('materiais')}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all whitespace-nowrap cursor-pointer text-sm ${
                activeTab === 'materiais'
                  ? 'bg-purple-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <i className="ri-tools-line text-lg w-5 h-5 flex items-center justify-center"></i>
              Materiais
            </button>
          </div>

          {/* Conteúdo de Serviços */}
          {activeTab === 'servicos' && (
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowNewServiceModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all whitespace-nowrap cursor-pointer font-medium text-sm"
                >
                  <i className="ri-add-line text-lg w-5 h-5 flex items-center justify-center"></i>
                  Novo Serviço
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-4 lg:mb-6">
                <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
                  <div className="flex flex-col gap-2">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-rose-100 rounded-lg flex items-center justify-center">
                      <i className="ri-scissors-line text-lg lg:text-2xl text-rose-600 w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                    </div>
                    <div>
                      <p className="text-xs lg:text-sm text-gray-600 mb-1">Total de Serviços</p>
                      <p className="text-lg lg:text-2xl font-bold text-gray-900">{totalServices}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
                  <div className="flex flex-col gap-2">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <i className="ri-money-dollar-circle-line text-lg lg:text-2xl text-green-600 w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                    </div>
                    <div>
                      <p className="text-xs lg:text-sm text-gray-600 mb-1">Receita Total</p>
                      <p className="text-lg lg:text-2xl font-bold text-gray-900">R$ {(totalRevenue / 1000).toFixed(1)}k</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
                  <div className="flex flex-col gap-2">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <i className="ri-price-tag-3-line text-lg lg:text-2xl text-blue-600 w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                    </div>
                    <div>
                      <p className="text-xs lg:text-sm text-gray-600 mb-1">Preço Médio</p>
                      <p className="text-lg lg:text-2xl font-bold text-gray-900">R$ {avgPrice}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
                  <div className="flex flex-col gap-2">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                      <i className="ri-star-line text-lg lg:text-2xl text-amber-600 w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                    </div>
                    <div>
                      <p className="text-xs lg:text-sm text-gray-600 mb-1 truncate">Mais Popular</p>
                      <p className="text-xs lg:text-base font-bold text-gray-900 truncate">{mostPopular.name}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 mb-4 lg:mb-6">
                <div className="p-4 border-b border-gray-200 space-y-3">
                  <div className="relative">
                    <i className="ri-search-line absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-base w-5 h-5 flex items-center justify-center"></i>
                    <input
                      type="text"
                      placeholder="Buscar serviço..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-sm"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pb-2">
                    {serviceCategories.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          selectedCategory === cat.id
                            ? 'bg-rose-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile: stacked cards */}
                <div className="sm:hidden space-y-3">
                  {filteredServices.map((service) => (
                    <div key={service.id} className="bg-white p-3 rounded-lg border">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-gray-900 truncate">{service.name}</div>
                          <div className="text-xs text-gray-600">{serviceCategories.find(c=>c.id===service.category)?.name}</div>
                          <div className="text-xs text-gray-600 mt-1">{service.time} · {service.count}x</div>
                        </div>
                        <div className="text-right ml-3">
                          <div className="font-bold text-sm text-gray-900">R$ {(Number(service.price) || 0).toFixed(2)}</div>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <button onClick={() => handleEdit(service)} title="Editar" className="w-8 h-8 flex items-center justify-center text-gray-600 bg-gray-50 rounded"><i className="ri-edit-line"></i></button>
                        <button onClick={() => handleDelete(service)} title="Excluir" className="w-8 h-8 flex items-center justify-center text-red-600 bg-red-50 rounded"><i className="ri-delete-bin-line"></i></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block w-full">
                  <table className="w-full table-auto">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-normal break-words">Serviço</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-normal break-words">Categoria</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-normal break-words">Valor</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-normal break-words">Tempo</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-normal break-words">Realizados</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider whitespace-normal break-words">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredServices.map((service) => (
                        <tr key={service.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 lg:px-6 py-4 whitespace-normal break-words text-sm font-medium text-gray-900">{service.name || '-'}</td>
                          <td className="px-4 lg:px-6 py-4 whitespace-normal break-words text-sm text-gray-600">
                            {serviceCategories.find(c => c.id === service.category)?.name}
                          </td>
                          <td className="px-4 lg:px-6 py-4 whitespace-normal break-words text-sm font-bold text-gray-900">R$ {(Number(service.price) || 0).toFixed(2)}</td>
                          <td className="px-4 lg:px-6 py-4 whitespace-normal break-words text-sm text-gray-600">{service.time || ''}</td>
                          <td className="px-4 lg:px-6 py-4 whitespace-normal break-words text-sm text-gray-900">{(service.count || 0)}x</td>
                          <td className="px-4 lg:px-6 py-4 whitespace-normal break-words text-sm">
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleEdit(service)}
                                className="p-2 text-gray-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer" 
                                title="Editar"
                              >
                                <i className="ri-edit-line text-lg w-5 h-5 flex items-center justify-center"></i>
                              </button>
                              <button 
                                onClick={() => handleDelete(service)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer" 
                                title="Excluir"
                              >
                                <i className="ri-delete-bin-line text-lg w-5 h-5 flex items-center justify-center"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* Conteúdo de Materiais */}
          {activeTab === 'materiais' && (
            <>
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowNewMaterialModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all whitespace-nowrap cursor-pointer font-medium text-sm"
                >
                  <i className="ri-add-line text-lg w-5 h-5 flex items-center justify-center"></i>
                  Novo Material
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-4 lg:mb-6">
                <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
                  <div className="flex flex-col gap-2">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <i className="ri-tools-line text-lg lg:text-2xl text-purple-600 w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
                    </div>
                    <div>
                      <p className="text-xs lg:text-sm text-gray-600 mb-1">Total de Materiais</p>
                      <p className="text-lg lg:text-2xl font-bold text-gray-900">{totalMaterials}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900">Materiais Cadastrados</h3>
                </div>

                <div className="w-full">
                  <table className="w-full table-auto">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Material</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Unidade</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Valor</th>
                        <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {availableMaterials.map((material) => (
                        <tr key={material.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">{material.name}</td>
                          <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 capitalize">{material.unit}</td>
                          <td className="px-4 lg:px-6 py-4 text-sm font-semibold text-gray-900">R$ {(Number(material.price) || 0).toFixed(2)}</td>
                          <td className="px-4 lg:px-6 py-4 text-sm">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditMaterial(material)}
                                className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all cursor-pointer"
                                title="Editar"
                              >
                                <i className="ri-edit-line text-lg w-5 h-5 flex items-center justify-center"></i>
                              </button>
                              <button
                                onClick={() => handleDeleteMaterial(material)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                                title="Excluir"
                              >
                                <i className="ri-delete-bin-line text-lg w-5 h-5 flex items-center justify-center"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Modal Novo Serviço */}
      {showNewServiceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 lg:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 lg:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-base lg:text-xl font-bold text-gray-900">Novo Serviço</h2>
              <button
                onClick={() => setShowNewServiceModal(false)}
                className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
              >
                <i className="ri-close-line text-xl lg:text-2xl w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
              </button>
            </div>

            <div className="p-3 lg:p-6 space-y-3 lg:space-y-4">
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Nome do Serviço</label>
                <input
                  type="text"
                  placeholder="Ex: Barra de calça"
                  className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs lg:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Categoria</label>
                <select className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs lg:text-sm cursor-pointer">
                  <option>Selecione uma categoria</option>
                  {serviceCategories.filter(c => c.id !== 'todos').map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Valor Padrão</label>
                  <input
                    type="text"
                    placeholder="R$ 0,00"
                    className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs lg:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Tempo Médio</label>
                  <input
                    type="text"
                    placeholder="Ex: 30 min"
                    className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs lg:text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Observações</label>
                <textarea
                  rows={3}
                  placeholder="Detalhes adicionais sobre o serviço..."
                  className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs lg:text-sm resize-none"
                  maxLength={500}
                ></textarea>
              </div>
            </div>

            <div className="p-3 lg:p-6 border-t border-gray-200 flex items-center justify-end gap-2 lg:gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowNewServiceModal(false)}
                className="px-3 lg:px-6 py-1.5 lg:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm"
              >
                Cancelar
              </button>
              <button className="px-3 lg:px-6 py-1.5 lg:py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm">
                Adicionar Serviço
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Serviço */}
      {showEditModal && selectedService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 lg:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 lg:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-base lg:text-xl font-bold text-gray-900">Editar Serviço</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
              >
                <i className="ri-close-line text-xl lg:text-2xl w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
              </button>
            </div>

              <form id="editServiceForm" onSubmit={handleSaveEdit} className="p-3 lg:p-6 space-y-3 lg:space-y-4">
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Nome do Serviço</label>
                <input
                  name="name"
                  type="text"
                  defaultValue={selectedService.name}
                  className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs lg:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Categoria</label>
                <select 
                  name="category"
                  defaultValue={selectedService.category}
                  className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs lg:text-sm cursor-pointer"
                >
                  {serviceCategories.filter(c => c.id !== 'todos').map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Valor Padrão</label>
                  <input
                    name="price"
                    type="text"
                    defaultValue={`${(Number(selectedService.price) || 0).toFixed(2)}`}
                    className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs lg:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Tempo Médio</label>
                  <input
                    name="time"
                    type="text"
                    defaultValue={selectedService.time}
                    className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-xs lg:text-sm"
                  />
                </div>
              </div>

            <div className="p-3 lg:p-6 border-t border-gray-200 flex items-center justify-end gap-2 lg:gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-3 lg:px-6 py-1.5 lg:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                form="editServiceForm"
                className="px-3 lg:px-6 py-1.5 lg:py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm"
              >
                Salvar Alterações
              </button>
            </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excluir Serviço */}
      {showDeleteModal && selectedService && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 lg:p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-3 lg:p-6">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4">
                <i className="ri-delete-bin-line text-xl lg:text-2xl text-red-600 w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
              </div>
              <h2 className="text-base lg:text-xl font-bold text-gray-900 text-center mb-1.5 lg:mb-2">Excluir Serviço</h2>
              <p className="text-xs lg:text-sm text-gray-600 text-center mb-4 lg:mb-6">
                Tem certeza que deseja excluir o serviço <strong>{selectedService.name}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex items-center gap-2 lg:gap-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmDelete}
                  className="flex-1 px-3 lg:px-4 py-1.5 lg:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Novo Material */}
      {showNewMaterialModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 lg:p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 lg:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-base lg:text-xl font-bold text-gray-900">Novo Material</h2>
              <button
                onClick={() => setShowNewMaterialModal(false)}
                className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
              >
                <i className="ri-close-line text-xl lg:text-2xl w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
              </button>
            </div>

            <form onSubmit={handleAddNewMaterial} className="p-3 lg:p-6 space-y-3 lg:space-y-4">
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Nome do Material</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Ex: Linha branca"
                  className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs lg:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Unidade de Medida</label>
                <select
                  name="unit"
                  required
                  className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs lg:text-sm cursor-pointer"
                >
                  <option value="metro">Metro</option>
                  <option value="unidade">Unidade</option>
                  <option value="pacote">Pacote</option>
                  <option value="litro">Litro</option>
                  <option value="folha">Folha</option>
                </select>
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Valor Unitário (R$)</label>
                <input
                  type="number"
                  name="price"
                  required
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs lg:text-sm"
                />
              </div>

              <div className="flex items-center gap-2 lg:gap-3 pt-2 lg:pt-4">
                <button
                  type="button"
                  onClick={() => setShowNewMaterialModal(false)}
                  className="flex-1 px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 lg:px-4 py-1.5 lg:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm"
                >
                  Adicionar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar Material */}
      {showEditMaterialModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 lg:p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-3 lg:p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-base lg:text-xl font-bold text-gray-900">Editar Material</h2>
              <button
                onClick={() => setShowEditMaterialModal(false)}
                className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all cursor-pointer"
              >
                <i className="ri-close-line text-xl lg:text-2xl w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
              </button>
            </div>

            <form onSubmit={handleSaveEditMaterial} className="p-3 lg:p-6 space-y-3 lg:space-y-4">
              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Nome do Material</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={selectedMaterial.name}
                  className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs lg:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Unidade de Medida</label>
                <select
                  name="unit"
                  required
                  defaultValue={selectedMaterial.unit}
                  className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs lg:text-sm cursor-pointer"
                >
                  <option value="metro">Metro</option>
                  <option value="unidade">Unidade</option>
                  <option value="pacote">Pacote</option>
                  <option value="litro">Litro</option>
                  <option value="folha">Folha</option>
                </select>
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1.5 lg:mb-2">Valor Unitário (R$)</label>
                <input
                  type="number"
                  name="price"
                  required
                  step="0.01"
                  min="0"
                  defaultValue={selectedMaterial.price}
                  className="w-full px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-xs lg:text-sm"
                />
              </div>

              <div className="flex items-center gap-2 lg:gap-3 pt-2 lg:pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditMaterialModal(false)}
                  className="flex-1 px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 lg:px-4 py-1.5 lg:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Excluir Material */}
      {showDeleteMaterialModal && selectedMaterial && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 lg:p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-3 lg:p-6">
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4">
                <i className="ri-delete-bin-line text-xl lg:text-2xl text-red-600 w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center"></i>
              </div>
              <h2 className="text-base lg:text-xl font-bold text-gray-900 text-center mb-1.5 lg:mb-2">Excluir Material</h2>
              <p className="text-xs lg:text-sm text-gray-600 text-center mb-4 lg:mb-6">
                Tem certeza que deseja excluir <strong>{selectedMaterial.name}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex items-center gap-2 lg:gap-3">
                <button
                  onClick={() => setShowDeleteMaterialModal(false)}
                  className="flex-1 px-3 lg:px-4 py-1.5 lg:py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteMaterial}
                  className="flex-1 px-3 lg:px-4 py-1.5 lg:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all whitespace-nowrap cursor-pointer font-medium text-xs lg:text-sm"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
