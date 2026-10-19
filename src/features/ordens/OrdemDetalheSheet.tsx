import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, MessageCircle, Pencil, Printer, Trash2, CalendarDays, Wallet, User } from 'lucide-react';
import { Badge, Button, ConfirmSheet, Sheet, Textarea, cx } from '../../ui';
import { useToast } from '../../ui/toast';
import { useDados } from '../../data/store';
import { excluirOrdem, marcarPagamento, mudarStatus } from '../../data/db';
import { dataCurta, dataLocal, dinheiro, linkWhatsApp, prazo, proximoStatus, ROTULO_STATUS, STATUS_VISUAL, telefoneBonito } from '../../data/formato';
import { mensagemStatus } from '../../data/mensagens';
import { STATUS, type Ordem, type StatusOrdem } from '../../data/types';
import { PagamentoBadge, StatusBadge } from './OrdemCard';
import Comprovante from './Comprovante';
import PecaIcone from '../../ui/PecaIcone';

export default function OrdemDetalheSheet({ ordemId, onClose }: { ordemId: string | null; onClose: () => void }) {
  const { ordens, clientePorId, guardarOrdem, tirarOrdem } = useDados();
  const navigate = useNavigate();
  const toast = useToast();
  const ordem = ordemId ? ordens.find(o => o.id === ordemId) : undefined;
  const cliente = ordem?.clienteId ? clientePorId.get(ordem.clienteId) : undefined;
  const nome = cliente?.nome || '';

  const [salvando, setSalvando] = useState<string | null>(null);
  const [perguntaPago, setPerguntaPago] = useState(false);
  const [aviso, setAviso] = useState<{ status: StatusOrdem; texto: string } | null>(null);
  const [apagar, setApagar] = useState(false);

  useEffect(() => { setAviso(null); setPerguntaPago(false); }, [ordemId]);

  if (!ordem) return null;

  async function aplicarStatus(s: StatusOrdem, o: Ordem = ordem!) {
    if (s === o.status) return;
    setSalvando('status');
    try {
      const nova = await mudarStatus(o, s);
      guardarOrdem(nova);
      toast(`OS ${nova.numero}: ${ROTULO_STATUS[s]}`);
      // "Em costura" não gera aviso: a cliente se confundia com a mensagem de andamento
      if (s !== 'Em costura') setAviso({ status: s, texto: mensagemStatus(nova, nome, s) });
      else setAviso(null);
    } catch (e: any) { toast(e.message, 'erro'); } finally { setSalvando(null); }
  }

  function pedirStatus(s: StatusOrdem) {
    if (s === 'Retirado' && !ordem!.pago) { setPerguntaPago(true); return; }
    aplicarStatus(s);
  }

  async function entregar(pagoAgora: boolean) {
    setPerguntaPago(false);
    let o = ordem!;
    if (pagoAgora) {
      try { o = await marcarPagamento(o, true, nome); guardarOrdem(o); } catch (e: any) { toast(e.message, 'erro'); return; }
    }
    aplicarStatus('Retirado', o);
  }

  async function alternarPagamento() {
    setSalvando('pago');
    try {
      const nova = await marcarPagamento(ordem!, !ordem!.pago, nome);
      guardarOrdem(nova);
      toast(nova.pago ? 'Pagamento registrado' : 'Marcada como a receber');
    } catch (e: any) { toast(e.message, 'erro'); } finally { setSalvando(null); }
  }

  async function confirmarExclusao() {
    setSalvando('apagar');
    try {
      await excluirOrdem(ordem!);
      tirarOrdem(ordem!.id);
      toast(`OS ${ordem!.numero} excluída`);
      setApagar(false);
      onClose();
    } catch (e: any) { toast(e.message, 'erro'); } finally { setSalvando(null); }
  }

  const proximo = proximoStatus(ordem.status);
  const p = prazo(ordem);
  const idx = STATUS.indexOf(ordem.status);
  const waAviso = aviso ? linkWhatsApp(cliente?.telefone, aviso.texto) : null;

  return (
    <>
      <Sheet open={!!ordemId} onClose={onClose} wide title={
        <div className="flex items-center gap-2 flex-wrap">
          <span>OS {ordem.numero}</span>
          <StatusBadge status={ordem.status} />
        </div>
      } footer={
        <div className="flex flex-wrap gap-2 justify-between">
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => { onClose(); navigate(`/ordens/${ordem.id}/editar`); }}><Pencil className="w-4 h-4" /> Editar</Button>
            <Button variant="ghost" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4" /> Imprimir</Button>
            <Button variant="ghost" size="sm" className="text-red-700" onClick={() => setApagar(true)}><Trash2 className="w-4 h-4" /><span className="hidden sm:inline">Excluir</span></Button>
          </div>
          {proximo && (
            <Button onClick={() => pedirStatus(proximo)} loading={salvando === 'status'}>
              <Check className="w-4 h-4" /> {STATUS_VISUAL[ordem.status].acao}
            </Button>
          )}
        </div>
      }>
        {/* Cliente */}
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-white border border-at-line p-3.5">
          <button className="flex items-center gap-3 min-w-0 text-left" onClick={() => { if (cliente) { onClose(); navigate(`/clientes/${cliente.id}`); } }}>
            <span className="w-10 h-10 rounded-full bg-at-blush text-at-wine flex items-center justify-center shrink-0"><User className="w-5 h-5" /></span>
            <span className="min-w-0">
              <span className="block font-medium text-at-ink truncate">{nome || 'Cliente não informada'}</span>
              <span className="block text-xs text-at-muted">{cliente?.telefone ? telefoneBonito(cliente.telefone) : 'Sem telefone'}</span>
            </span>
          </button>
          {cliente?.telefone && (
            <Button size="sm" variant="whatsapp" onClick={() => { const l = linkWhatsApp(cliente.telefone, mensagemStatus(ordem, nome, ordem.status === 'Em costura' ? 'Recebido' : ordem.status)); if (l) window.open(l, '_blank'); }}>
              <MessageCircle className="w-4 h-4" /> <span className="hidden sm:inline">Mensagem</span>
            </Button>
          )}
        </div>

        {/* Aviso ao cliente depois de mudar status */}
        {aviso && (
          <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5">
            <div className="text-sm font-medium text-emerald-800 mb-2">Avisar {nome.split(' ')[0] || 'a cliente'} que a OS está “{ROTULO_STATUS[aviso.status]}”?</div>
            <Textarea value={aviso.texto} onChange={e => setAviso({ ...aviso, texto: e.target.value })} className="bg-white text-sm min-h-[110px]" />
            <div className="flex gap-2 justify-end mt-2">
              <Button size="sm" variant="ghost" onClick={() => setAviso(null)}>Agora não</Button>
              <Button size="sm" variant="whatsapp" disabled={!waAviso} onClick={() => { if (waAviso) window.open(waAviso, '_blank'); setAviso(null); }}>
                <MessageCircle className="w-4 h-4" /> {waAviso ? 'Enviar no WhatsApp' : 'Cliente sem WhatsApp'}
              </Button>
            </div>
          </div>
        )}

        {/* Etapas */}
        <div className="mt-4">
          <div className="text-xs font-medium text-at-muted mb-2">Andamento (toque para mudar)</div>
          <div className="grid grid-cols-4 gap-1.5">
            {STATUS.map((s, i) => (
              <button key={s} disabled={!!salvando} onClick={() => pedirStatus(s)}
                className={cx('rounded-xl py-2.5 px-1 text-xs font-medium border transition',
                  i < idx ? 'bg-at-blush/60 border-at-blush text-at-wine' :
                  i === idx ? 'bg-at-wine border-at-wine text-white shadow-sm' :
                  'bg-white border-at-line text-at-muted hover:border-at-nude')}>
                {i < idx && <Check className="w-3 h-3 inline mr-0.5 -mt-0.5" />}{ROTULO_STATUS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="rounded-2xl bg-white border border-at-line p-3.5">
            <div className="text-xs text-at-muted flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> Entrega</div>
            <div className="font-medium text-at-ink mt-1">{dataCurta(ordem.entrega)}</div>
            <Badge tone={p.tom} className="mt-1.5">{p.texto}</Badge>
          </div>
          <div className="rounded-2xl bg-white border border-at-line p-3.5">
            <div className="text-xs text-at-muted flex items-center gap-1.5"><Wallet className="w-3.5 h-3.5" /> Pagamento</div>
            <div className="font-medium text-at-ink mt-1">{dinheiro(ordem.total)}</div>
            <div className="flex items-center gap-2 mt-1.5">
              <PagamentoBadge pago={ordem.pago} />
              <button onClick={alternarPagamento} disabled={!!salvando} className="text-xs text-at-wine underline underline-offset-2 disabled:opacity-50">
                {salvando === 'pago' ? 'Salvando...' : ordem.pago ? 'desfazer' : 'marcar pago'}
              </button>
            </div>
          </div>
        </div>

        {/* Peças */}
        <div className="mt-4">
          <div className="text-xs font-medium text-at-muted mb-2">{ordem.pecas.length} {ordem.pecas.length === 1 ? 'peça' : 'peças'}</div>
          <div className="rounded-2xl bg-white border border-at-line divide-y divide-at-line">
            {ordem.pecas.map((pc, i) => (
              <div key={pc.id + i} className="p-3.5 flex gap-3">
                <PecaIcone nome={pc.tipo} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-at-ink">{pc.tipo}{pc.cor && <span className="text-at-muted font-normal"> · {pc.cor}</span>}</div>
                  {pc.modelo && <div className="text-xs text-at-muted">{pc.modelo}</div>}
                  <div className="mt-1 space-y-0.5">
                    {pc.services.map((s, j) => (
                      <div key={s.id + j} className="flex justify-between text-sm"><span className="text-at-ink/80">{s.name}</span><span className="text-at-ink">{dinheiro(s.price)}</span></div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <div className="p-3.5 flex justify-between font-semibold text-at-ink"><span>Total</span><span>{dinheiro(ordem.total)}</span></div>
          </div>
        </div>

        {ordem.observacoes && (
          <div className="mt-4 rounded-2xl bg-at-soft p-3.5 text-sm whitespace-pre-wrap"><span className="text-xs text-at-muted block mb-1">Observações</span>{ordem.observacoes}</div>
        )}
        <p className="text-xs text-at-muted mt-4 text-center">Aberta em {dataLocal(ordem.criadaEm)}</p>
      </Sheet>

      <Comprovante ordem={ordem} cliente={cliente} />

      <Sheet open={perguntaPago} onClose={() => setPerguntaPago(false)} title="Entregar a OS" footer={
        <div className="flex flex-col sm:flex-row gap-2 sm:justify-end">
          <Button variant="secondary" onClick={() => entregar(false)}>Entregar sem pagamento</Button>
          <Button onClick={() => entregar(true)}>Sim, recebi {dinheiro(ordem.total)}</Button>
        </div>
      }>
        <p className="text-sm text-at-ink">A OS {ordem.numero} está <b>a receber ({dinheiro(ordem.total)})</b>. A cliente pagou na retirada?</p>
      </Sheet>

      <ConfirmSheet open={apagar} onClose={() => setApagar(false)} title={`Excluir OS ${ordem.numero}?`} danger confirmLabel="Excluir" loading={salvando === 'apagar'}
        onConfirm={confirmarExclusao}
        text={<>A ordem de <b>{nome || 'cliente'}</b> ({dinheiro(ordem.total)}) e o lançamento dela no financeiro serão apagados. Essa ação não pode ser desfeita.</>} />
    </>
  );
}
