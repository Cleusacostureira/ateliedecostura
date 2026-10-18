import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2, MessageCircle, Phone, Mail, MapPin, StickyNote, ClipboardList } from 'lucide-react';
import { Button, Card, ConfirmSheet, EmptyState, IconButton, Page, Spinner } from '../../ui';
import { useToast } from '../../ui/toast';
import { useDados } from '../../data/store';
import { excluirCliente } from '../../data/db';
import { dataLocal, dinheiro, iniciais, linkWhatsApp, telefoneBonito } from '../../data/formato';
import ClienteFormSheet from './ClienteFormSheet';
import OrdemCard from '../ordens/OrdemCard';
import OrdemDetalheSheet from '../ordens/OrdemDetalheSheet';

export default function ClienteDetalhePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { clientePorId, ordens, carregando, tirarCliente } = useDados();
  const [editar, setEditar] = useState(false);
  const [apagar, setApagar] = useState(false);
  const [apagando, setApagando] = useState(false);
  const [aberta, setAberta] = useState<string | null>(null);

  const cliente = id ? clientePorId.get(id) : undefined;
  const historico = useMemo(() => ordens.filter(o => o.clienteId === id).sort((a, b) => b.numero - a.numero), [ordens, id]);
  const gasto = historico.reduce((s, o) => s + o.total, 0);
  const aReceber = historico.filter(o => !o.pago).reduce((s, o) => s + o.total, 0);
  const pecas = historico.reduce((s, o) => s + o.pecas.length, 0);

  if (carregando) return <Page><Spinner /></Page>;
  if (!cliente) return (
    <Page>
      <EmptyState icon={<ClipboardList className="w-6 h-6" />} title="Cliente não encontrada" action={<Button variant="secondary" onClick={() => navigate('/clientes')}>Voltar para clientes</Button>} />
    </Page>
  );

  const wa = linkWhatsApp(cliente.telefone, `Olá, ${cliente.nome.split(' ')[0]}! 😊`);

  async function confirmarExclusao() {
    if (!cliente) return;
    setApagando(true);
    try {
      await excluirCliente(cliente.id);
      tirarCliente(cliente.id);
      toast('Cliente excluída');
      navigate('/clientes');
    } catch (e: any) { toast(e.message, 'erro'); } finally { setApagando(false); }
  }

  return (
    <Page>
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1.5 text-sm text-at-muted hover:text-at-wine mb-4">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </button>

      <div className="grid lg:grid-cols-[340px_1fr] gap-5 items-start">
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-at-blush text-at-wine flex items-center justify-center font-display text-2xl shrink-0">{iniciais(cliente.nome)}</div>
            <div className="min-w-0 flex-1">
              <h1 className="font-display text-2xl text-at-ink leading-tight break-words">{cliente.nome}</h1>
              <p className="text-xs text-at-muted mt-1">Cliente desde {dataLocal(cliente.created_at)}</p>
            </div>
            <IconButton label="Editar" onClick={() => setEditar(true)}><Pencil className="w-4 h-4" /></IconButton>
          </div>

          <div className="mt-5 space-y-2.5 text-sm">
            <Linha icon={<Phone className="w-4 h-4" />}>{cliente.telefone ? telefoneBonito(cliente.telefone) : <span className="text-at-muted">Sem telefone</span>}</Linha>
            {cliente.email && <Linha icon={<Mail className="w-4 h-4" />}>{cliente.email}</Linha>}
            {cliente.endereco && <Linha icon={<MapPin className="w-4 h-4" />}>{cliente.endereco}</Linha>}
            {cliente.cpf_cnpj && <Linha icon={<span className="text-[10px] font-bold">CPF</span>}>{cliente.cpf_cnpj}</Linha>}
            {cliente.notas && <Linha icon={<StickyNote className="w-4 h-4" />}><span className="whitespace-pre-wrap">{cliente.notas}</span></Linha>}
          </div>

          <div className="grid grid-cols-2 gap-2 mt-5">
            <Button onClick={() => navigate(`/ordens/nova?cliente=${cliente.id}`)}><Plus className="w-4 h-4" /> Nova ordem</Button>
            <Button variant="whatsapp" disabled={!wa} onClick={() => wa && window.open(wa, '_blank')}><MessageCircle className="w-4 h-4" /> WhatsApp</Button>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-5">
            <Numero rotulo="Ordens" valor={String(historico.length)} />
            <Numero rotulo="Peças" valor={String(pecas)} />
            <Numero rotulo="Total" valor={dinheiro(gasto)} />
          </div>
          {aReceber > 0 && <div className="mt-3 rounded-xl bg-at-blush text-at-wine text-sm px-3 py-2">A receber: <b>{dinheiro(aReceber)}</b></div>}

          <button onClick={() => setApagar(true)} className="mt-5 w-full text-xs text-at-muted hover:text-red-700 inline-flex items-center justify-center gap-1.5">
            <Trash2 className="w-3.5 h-3.5" /> Excluir cadastro
          </button>
        </Card>

        <div>
          <h2 className="font-display text-xl text-at-ink mb-3">Histórico</h2>
          {historico.length === 0 ? (
            <Card><EmptyState icon={<ClipboardList className="w-6 h-6" />} title="Nenhuma ordem ainda" text="As ordens desta cliente vão aparecer aqui." /></Card>
          ) : (
            <div className="space-y-2.5">
              {historico.map(o => <OrdemCard key={o.id} ordem={o} onClick={() => setAberta(o.id)} extra={<span className="text-xs text-at-muted ml-1">aberta em {dataLocal(o.criadaEm)}</span>} />)}
            </div>
          )}
        </div>
      </div>

      <ClienteFormSheet open={editar} onClose={() => setEditar(false)} cliente={cliente} />
      <OrdemDetalheSheet ordemId={aberta} onClose={() => setAberta(null)} />
      <ConfirmSheet open={apagar} onClose={() => setApagar(false)} title="Excluir cliente?" danger confirmLabel={historico.length ? 'Entendi' : 'Excluir'} loading={apagando}
        onConfirm={historico.length ? () => setApagar(false) : confirmarExclusao}
        text={historico.length
          ? <>A cliente <b>{cliente.nome}</b> tem {historico.length} ordens no histórico. Para não perder esse histórico, o cadastro não pode ser excluído.</>
          : <>O cadastro de <b>{cliente.nome}</b> será apagado. Essa ação não pode ser desfeita.</>} />
    </Page>
  );
}

function Linha({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex items-start gap-2.5 text-at-ink"><span className="w-5 h-5 flex items-center justify-center text-at-muted shrink-0">{icon}</span><div className="min-w-0 break-words">{children}</div></div>;
}

function Numero({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="rounded-xl bg-at-soft px-2 py-2.5 text-center">
      <div className="text-[11px] text-at-muted">{rotulo}</div>
      <div className="font-semibold text-at-ink text-sm truncate">{valor}</div>
    </div>
  );
}
