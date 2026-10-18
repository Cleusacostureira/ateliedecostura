import { formatMessageForStatus } from '../lib/messages';
import { textoServicos } from './db';
import { dataCurta, dinheiro } from './formato';
import type { Ordem, StatusOrdem } from './types';

/** Mensagem de mudança de status — usa os modelos editáveis da tela Disparos/Configurações. */
export function mensagemStatus(o: Ordem, nomeCliente: string, status: StatusOrdem = o.status) {
  return formatMessageForStatus({ client: nomeCliente, service: textoServicos(o.pecas), dateOut: dataCurta(o.entrega) }, status);
}

/** Mensagem enviada ao abrir a OS (mesmo texto da versão anterior, com os dados do PIX). */
export function mensagemNovaOrdem(o: Ordem, nomeCliente: string) {
  return `${nomeCliente}! 🎉\n\n✂️ Cleusa Ateliê de Costura\n\nSua(s) peça(s) da OS ${o.numero} está(ão) registrada(s) e em breve pronta(s).\n\n🧾 Serviço(s): ${textoServicos(o.pecas)}\n💰 Valor: ${dinheiro(o.total)}\n\n📅 Previsão de retirada: ${dataCurta(o.entrega)}\n\n🔁 Dados para pagamento (PIX):\nNome: Cleusa Belani David\nTelefone: 45 99912-6130\nCPF: 641.667.240-53\n\n✨ Aguardamos você!`;
}
