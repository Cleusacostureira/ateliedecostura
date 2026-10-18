export type StatusOrdem = 'Recebido' | 'Em costura' | 'Pronto' | 'Retirado';
export const STATUS: StatusOrdem[] = ['Recebido', 'Em costura', 'Pronto', 'Retirado'];

export type ServicoPeca = { id: string; name: string; price: number };
export type Peca = { id: string; tipo: string; cor: string; icone?: string; modelo?: string; services: ServicoPeca[] };

export type Cliente = {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  cpf_cnpj: string | null;
  endereco: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
};

/** Ordem de serviço como está no banco (tabela `ordens`). As peças ficam em `notas` (JSON). */
export type OrdemRow = {
  id: string;
  numero: number;
  cliente_id: string | null;
  status: string;
  total: number;
  data_criacao: string;
  data_entrega: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  paymentStatus: string | null;
};

export type Ordem = {
  id: string;
  numero: number;
  clienteId: string | null;
  status: StatusOrdem;
  total: number;
  criadaEm: string;        // ISO
  entrega: string | null;  // AAAA-MM-DD
  pecas: Peca[];
  observacoes: string;
  pago: boolean;
  atualizadaEm: string;
};

export type ServicoCatalogo = { id: string; titulo: string; preco: number; categoria: string };
export type PecaCatalogo = { id: string; nome: string; categoria: string; icone: string };
