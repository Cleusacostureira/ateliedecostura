export type MessageTemplates = Record<string, string>;
export type MessageSettings = {
  enabled: Record<string, boolean>;
  atelierName: string;
};

const TEMPLATES_KEY = 'auto_message_templates';
const SETTINGS_KEY = 'auto_message_settings';

const defaultTemplates: MessageTemplates = {
  'Recebido': `Olá, {nome_cliente}! 😊\nSeu serviço foi recebido no *{atelier}* ✂️\n\n🧵 Serviço: {servico}\n📅 Prazo: {data_entrega}\n\nAssim que houver novidades, avisamos você 💕`,
  'Em costura': `Olá, {nome_cliente}! ✨\nSeu serviço já está em andamento no *{atelier}* 🧵\n\nQualquer atualização, te avisamos 😊`,
  'Pronto': `Olá, {nome_cliente}! 🎉\nSeu serviço ficou pronto! ✂️✨\n\n📍 Pode retirar no *{atelier}*\nEstamos te aguardando 💕`,
  'Retirado': `Obrigada, {nome_cliente}! 💖\nFoi um prazer cuidar da sua roupa ✨\n\nSempre que precisar, o *{atelier}* estará à disposição 🧵✂️`,
};

export function loadTemplates(): MessageTemplates {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) return defaultTemplates;
    const parsed = JSON.parse(raw);
    return { ...defaultTemplates, ...parsed };
  } catch (e) { return defaultTemplates; }
}

export function saveTemplates(t: MessageTemplates) {
  try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(t)); } catch (e) {}
}

export function loadSettings(): MessageSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { enabled: { 'Recebido': true, 'Em costura': true, 'Pronto': true, 'Retirado': true }, atelierName: 'Cleusa Ateliê de Costura' };
    const parsed = JSON.parse(raw);
    return { enabled: { 'Recebido': true, 'Em costura': true, 'Pronto': true, 'Retirado': true, ...(parsed.enabled || {}) }, atelierName: parsed.atelierName || 'Cleusa Ateliê de Costura' };
  } catch (e) { return { enabled: { 'Recebido': true, 'Em costura': true, 'Pronto': true, 'Retirado': true }, atelierName: 'Cleusa Ateliê de Costura' }; }
}

export function saveSettings(s: MessageSettings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
}

export function formatMessageForStatus(order: any, status: string) {
  const templates = loadTemplates();
  const settings = loadSettings();
  const tpl = templates[status] || templates['Recebido'] || '';
  const atelier = settings.atelierName || 'Cleusa Ateliê de Costura';
  const replacements: Record<string,string> = {
    '{nome_cliente}': order?.client || '',
    '{servico}': order?.service || '',
    '{data_entrega}': order?.dateOut || '',
    '{atelier}': atelier,
  };
  let out = tpl;
  Object.entries(replacements).forEach(([k,v]) => { out = out.split(k).join(v); });
  return out;
}
