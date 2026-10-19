import { formatMessageForStatus } from '../lib/messages';
import { textoServicos } from './db';
import { dataCurta, dinheiro } from './formato';
import type { Ordem, StatusOrdem } from './types';
import { configAtual, textoPix } from './config';

/** Lista cada peça (com cor) e seus serviços com valor — igual à versão anterior. */
export function listaPecas(o: Ordem) {
  return o.pecas.map(p => {
    const linhas = [`- ${p.tipo}${p.cor ? ` (${p.cor})` : ''}${p.modelo ? ` — ${p.modelo}` : ''}`];
    p.services.forEach(s => linhas.push(`  • ${s.name.trim()} — ${dinheiro(s.price)}`));
    return linhas.join('\n');
  }).join('\n');
}

/** Mensagem de peça pronta: peças, cores, valores, total e PIX no final (ou aviso de pago). */
export function mensagemPronta(o: Ordem, nomeCliente: string) {
  const c = configAtual();
  const pagamento = o.pago ? '✅ *Pagamento já realizado!*' : textoPix(c);
  return `Olá ${nomeCliente || ''}! 🎉\n\n*${c.nome}*\n\nSua(s) peça(s) da OS ${o.numero} está(ão) pronta(s)! ✂️✨\n\n${listaPecas(o)}\n\n💰 *Valor total: ${dinheiro(o.total)}*${o.entrega ? `\n📅 Previsão de retirada: ${dataCurta(o.entrega)}` : ''}\n\n${pagamento}\n\nAguardamos você! ✨`;
}

/** Mensagem de mudança de status — usa os modelos editáveis em Configurações (a de "pronta" é a completa). */
export function mensagemStatus(o: Ordem, nomeCliente: string, status: StatusOrdem = o.status) {
  if (status === 'Pronto') return mensagemPronta(o, nomeCliente);
  return formatMessageForStatus({ client: nomeCliente, service: textoServicos(o.pecas), dateOut: dataCurta(o.entrega) }, status);
}

/** Mensagem enviada ao abrir a OS (mesmo texto da versão anterior, com os dados do PIX). */
export function mensagemNovaOrdem(o: Ordem, nomeCliente: string) {
  const c = configAtual();
  return `${nomeCliente}! 🎉\n\n✂️ ${c.nome}\n\nSua(s) peça(s) da OS ${o.numero} está(ão) registrada(s) e em breve pronta(s).\n\n🧾 Serviço(s): ${textoServicos(o.pecas)}\n💰 Valor: ${dinheiro(o.total)}\n\n📅 Previsão de retirada: ${dataCurta(o.entrega)}\n\n${textoPix(c)}\n\n✨ Aguardamos você!`;
}
