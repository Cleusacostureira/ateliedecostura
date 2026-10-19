import { useEffect, useMemo, useState } from 'react';
import { Send, Check, PackageCheck, CalendarClock, Wallet, Heart, Users, CalendarPlus } from 'lucide-react';
import { Badge, Button, Card, Page, PageHeader, Textarea, cx } from '../../ui';
import { useDados } from '../../data/store';
import { configAtual, textoPix } from '../../data/config';
import { listaPecas } from '../../data/mensagens';
import { dataLocal, diasAte, dinheiro, iniciais, linkWhatsApp, telefoneBonito } from '../../data/formato';
import type { Cliente, Ordem } from '../../data/types';

type Publico = 'prontas' | 'hoje' | 'amanha' | 'receber' | 'sumidas' | 'todas';
type Dest = { cliente: Cliente; ordens: Ordem[]; extra?: string };

const MODELOS: Record<Publico, string> = {
  prontas: 'Olá, {nome}! 🎉\n\n*{atelie}*\n\nSua(s) peça(s) da OS {os} está(ão) pronta(s)! ✂️✨\n\n{pecas}\n\n💰 *Valor total: {valor}*\n\n{pagamento}\n\nAguardamos você! ✨',
  hoje: 'Olá, {nome}! 😊\nPassando para lembrar que a OS {os} tem entrega prevista para *hoje* no *{atelie}*.\nQualquer novidade te avisamos! 🧵',
  amanha: 'Olá, {nome}! 😊\nSua OS {os} tem entrega prevista para *amanhã* no *{atelie}*. Te avisamos assim que ficar pronta! ✂️',
  receber: 'Olá, {nome}! 😊\nTudo bem? Passando para lembrar do valor em aberto aqui no *{atelie}*: *{valor}* (OS {os}).\n\n{pix}\n\nQualquer dúvida, estamos à disposição! ✨',
  sumidas: 'Olá, {nome}! 💕\nQue saudade! Aqui é do *{atelie}*. Se tiver alguma peça precisando de barra, ajuste ou conserto, é só trazer. Será um prazer te atender de novo! ✂️',
  todas: 'Olá, {nome}! 😊\nAqui é do *{atelie}*. ',
};

const PUBLICOS: Array<{ id: Publico; rotulo: string; texto: string; icone: any }> = [
  { id: 'prontas', rotulo: 'Peças prontas', texto: 'aguardando retirada', icone: PackageCheck },
  { id: 'hoje', rotulo: 'Entrega hoje', texto: 'ainda não prontas', icone: CalendarClock },
  { id: 'amanha', rotulo: 'Entrega amanhã', texto: 'lembrete antecipado', icone: CalendarPlus },
  { id: 'receber', rotulo: 'Valores a receber', texto: 'cobrança gentil', icone: Wallet },
  { id: 'sumidas', rotulo: 'Sem vir há 60+ dias', texto: 'chamar de volta', icone: Heart },
  { id: 'todas', rotulo: 'Todas as clientes', texto: 'recado geral', icone: Users },
];

const CHAVE_ENVIADOS = 'disparos_enviados';
function lerEnviados(): Record<string, string[]> {
  try { const j = JSON.parse(localStorage.getItem(CHAVE_ENVIADOS) || '{}'); const hoje = new Date().toDateString(); return j.dia === hoje ? j.lista || {} : {}; } catch { return {}; }
}

export default function DisparosPage() {
  const { ordens, clientes, clientePorId } = useDados();
  const [publico, setPublico] = useState<Publico>('prontas');
  const [modelos, setModelos] = useState<Record<Publico, string>>(() => {
    try { return { ...MODELOS, ...(JSON.parse(localStorage.getItem('disparos_modelos_v2') || '{}') || {}) }; } catch { return MODELOS; }
  });
  const [enviados, setEnviados] = useState<Record<string, string[]>>(lerEnviados);

  useEffect(() => { try { localStorage.setItem('disparos_modelos_v2', JSON.stringify(modelos)); } catch { /* ignora */ } }, [modelos]);
  useEffect(() => { try { localStorage.setItem(CHAVE_ENVIADOS, JSON.stringify({ dia: new Date().toDateString(), lista: enviados })); } catch { /* ignora */ } }, [enviados]);

  const grupos = useMemo(() => {
    const agrupar = (os: Ordem[]): Dest[] => {
      const m = new Map<string, Ordem[]>();
      os.forEach(o => { if (o.clienteId && clientePorId.get(o.clienteId)) m.set(o.clienteId, [...(m.get(o.clienteId) || []), o]); });
      return [...m.entries()].map(([id, l]) => ({ cliente: clientePorId.get(id)!, ordens: l }));
    };
    const abertas = ordens.filter(o => o.status !== 'Retirado');
    const ultima = new Map<string, string>();
    ordens.forEach(o => { if (o.clienteId && (!ultima.has(o.clienteId) || o.criadaEm > ultima.get(o.clienteId)!)) ultima.set(o.clienteId, o.criadaEm); });
    const limite = new Date(Date.now() - 60 * 86_400_000).toISOString();
    return {
      prontas: agrupar(abertas.filter(o => o.status === 'Pronto')),
      hoje: agrupar(abertas.filter(o => o.status !== 'Pronto' && o.entrega && diasAte(o.entrega) === 0)),
      amanha: agrupar(abertas.filter(o => o.status !== 'Pronto' && o.entrega && diasAte(o.entrega) === 1)),
      receber: agrupar(ordens.filter(o => !o.pago)),
      sumidas: clientes.filter(c => ultima.has(c.id) && ultima.get(c.id)! < limite).sort((a, b) => ultima.get(b.id)!.localeCompare(ultima.get(a.id)!)).map(c => ({ cliente: c, ordens: [], extra: `última visita ${dataLocal(ultima.get(c.id))}` })),
      todas: [...clientes].sort((a, b) => a.nome.localeCompare(b.nome)).map(c => ({ cliente: c, ordens: [] })),
    } as Record<Publico, Dest[]>;
  }, [ordens, clientes, clientePorId]);

  const lista = grupos[publico];
  const comTelefone = lista.filter(d => linkWhatsApp(d.cliente.telefone, 'x'));
  const enviadosAqui = new Set(enviados[publico] || []);
  const proximo = comTelefone.find(d => !enviadosAqui.has(d.cliente.id));

  const montar = (d: Dest) => {
    const c = configAtual();
    const total = d.ordens.reduce((s, o) => s + o.total, 0);
    return modelos[publico]
      .split('{nome}').join(d.cliente.nome.split(' ')[0])
      .split('{atelie}').join(c.nome)
      .split('{os}').join(d.ordens.map(o => o.numero).join(', ') || '-')
      .split('{valor}').join(dinheiro(total))
      .split('{pecas}').join(d.ordens.map(o => (d.ordens.length > 1 ? `OS ${o.numero}:\n` : '') + listaPecas(o)).join('\n\n'))
      .split('{pagamento}').join(d.ordens.length && d.ordens.every(o => o.pago) ? '✅ *Pagamento já realizado!*' : textoPix(c))
      .split('{pix}').join(textoPix(c));
  };

  function enviar(d: Dest) {
    const l = linkWhatsApp(d.cliente.telefone, montar(d));
    if (!l) return;
    window.open(l, '_blank');
    setEnviados(e => ({ ...e, [publico]: [...new Set([...(e[publico] || []), d.cliente.id])] }));
  }

  return (
    <Page>
      <PageHeader title="Disparos" subtitle="Mensagens pelo WhatsApp para grupos de clientes" />

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 mb-5">
        {PUBLICOS.map(p => (
          <button key={p.id} onClick={() => setPublico(p.id)}
            className={cx('text-left rounded-2xl border p-3 transition', publico === p.id ? 'bg-at-wine border-at-wine text-white shadow-lift' : 'bg-white border-at-line hover:border-at-nude')}>
            <p.icone className={cx('w-4 h-4 mb-2', publico === p.id ? 'text-white' : 'text-at-wine')} />
            <div className="font-display text-xl leading-none">{grupos[p.id].length}</div>
            <div className="text-xs font-medium mt-1">{p.rotulo}</div>
            <div className={cx('text-[11px]', publico === p.id ? 'text-white/75' : 'text-at-muted')}>{p.texto}</div>
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-5 items-start">
        <Card className="p-4 sm:p-5 lg:sticky lg:top-8">
          <h2 className="font-display text-lg text-at-ink mb-1">Mensagem</h2>
          <p className="text-xs text-at-muted mb-3">Use {'{nome}'}, {'{os}'}, {'{pecas}'}, {'{valor}'}, {'{pagamento}'}, {'{pix}'} e {'{atelie}'} — são trocados para cada cliente.</p>
          <Textarea value={modelos[publico]} onChange={e => setModelos(m => ({ ...m, [publico]: e.target.value }))} className="min-h-[170px] text-sm" />
          <button onClick={() => setModelos(m => ({ ...m, [publico]: MODELOS[publico] }))} className="text-xs text-at-muted hover:text-at-ink mt-1">restaurar texto sugerido</button>
          {lista[0] && (
            <div className="mt-4">
              <div className="text-xs text-at-muted mb-1.5">Exemplo para {lista[0].cliente.nome.split(' ')[0]}</div>
              <div className="rounded-2xl rounded-tl-sm bg-[#E7F8DC] text-sm text-[#1f2b1a] p-3 whitespace-pre-wrap shadow-sm">{montar(lista[0])}</div>
            </div>
          )}
        </Card>

        <div>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-sm text-at-muted">{enviadosAqui.size} de {comTelefone.length} enviadas hoje{lista.length > comTelefone.length && ` · ${lista.length - comTelefone.length} sem WhatsApp`}</div>
            {proximo && <Button variant="whatsapp" onClick={() => enviar(proximo)}><Send className="w-4 h-4" /> Enviar para {proximo.cliente.nome.split(' ')[0]}</Button>}
          </div>
          <div className="h-1.5 rounded-full bg-at-soft overflow-hidden mb-3"><div className="h-full bg-[#1FA855] transition-all" style={{ width: `${comTelefone.length ? (enviadosAqui.size / comTelefone.length) * 100 : 0}%` }} /></div>
          {lista.length === 0 ? <Card className="p-8 text-center text-sm text-at-muted">Ninguém neste grupo agora.</Card> : (
            <Card className="divide-y divide-at-line overflow-hidden">
              {lista.slice(0, 200).map(d => {
                const ok = enviadosAqui.has(d.cliente.id);
                const tem = !!linkWhatsApp(d.cliente.telefone, 'x');
                return (
                  <div key={d.cliente.id} className={cx('flex items-center gap-3 px-4 py-3', ok && 'bg-emerald-50/40')}>
                    <span className="w-9 h-9 rounded-full bg-at-blush text-at-wine flex items-center justify-center text-xs font-semibold shrink-0">{iniciais(d.cliente.nome)}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-at-ink truncate">{d.cliente.nome}</div>
                      <div className="text-xs text-at-muted truncate">{tem ? telefoneBonito(d.cliente.telefone) : 'sem WhatsApp válido'}{d.ordens.length ? ` · OS ${d.ordens.map(o => o.numero).join(', ')} · ${dinheiro(d.ordens.reduce((s, o) => s + o.total, 0))}` : ''}{d.extra ? ` · ${d.extra}` : ''}</div>
                    </div>
                    {ok ? <Badge tone="green"><Check className="w-3 h-3" />enviada</Badge> : null}
                    <Button size="sm" variant={ok ? 'secondary' : 'whatsapp'} disabled={!tem} onClick={() => enviar(d)} className="shrink-0">{ok ? 'Reenviar' : 'Enviar'}</Button>
                  </div>
                );
              })}
            </Card>
          )}
          {lista.length > 200 && <p className="text-xs text-at-muted text-center mt-2">Mostrando 200 de {lista.length}.</p>}
        </div>
      </div>
    </Page>
  );
}
