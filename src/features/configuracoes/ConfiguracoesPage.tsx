import { useEffect, useState } from 'react';
import { Save, Upload, Store, QrCode, MessageSquareText, ImageIcon, RotateCcw } from 'lucide-react';
import { Button, Card, Field, Input, Page, PageHeader, Textarea, cx } from '../../ui';
import { useToast } from '../../ui/toast';
import { salvarConfig, useAtelie, textoPix, type AtelieConfig } from '../../data/config';
import { loadTemplates, saveTemplates, type MessageTemplates } from '../../lib/messages';
import { useCompanyLogo } from '../../lib/useCompanyLogo';
import { supabase } from '../../lib/supabaseClient';
import { ROTULO_STATUS } from '../../data/formato';
import { STATUS } from '../../data/types';

const VARIAVEIS = [['{nome_cliente}', 'nome da cliente'], ['{servico}', 'serviços'], ['{data_entrega}', 'data de entrega'], ['{atelier}', 'nome do ateliê']];

function Secao({ icone, titulo, texto, children }: { icone: React.ReactNode; titulo: string; texto?: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-3 mb-4">
        <span className="w-9 h-9 rounded-xl bg-at-blush text-at-wine flex items-center justify-center shrink-0">{icone}</span>
        <div><h2 className="font-display text-lg text-at-ink">{titulo}</h2>{texto && <p className="text-xs text-at-muted mt-0.5">{texto}</p>}</div>
      </div>
      {children}
    </Card>
  );
}

export default function ConfiguracoesPage() {
  const atual = useAtelie();
  const toast = useToast();
  const logoAtual = useCompanyLogo();
  const [f, setF] = useState<AtelieConfig>(atual);
  const [tpl, setTpl] = useState<MessageTemplates>(loadTemplates());
  const [statusTpl, setStatusTpl] = useState<string>('Recebido');
  const [salvando, setSalvando] = useState(false);
  const [logo, setLogo] = useState<{ file: File; preview: string } | null>(null);
  const [enviandoLogo, setEnviandoLogo] = useState(false);

  useEffect(() => { setF(atual); }, [atual]);
  const set = (k: keyof AtelieConfig) => (e: { target: { value: string } }) => setF(v => ({ ...v, [k]: e.target.value }));

  async function salvar() {
    setSalvando(true);
    try {
      saveTemplates(tpl);
      const noBanco = await salvarConfig(f);
      toast(noBanco ? 'Configurações salvas' : 'Salvo neste aparelho (entre com seu login para valer em todos os aparelhos)');
    } finally { setSalvando(false); }
  }

  async function enviarLogo() {
    if (!logo) return;
    setEnviandoLogo(true);
    try {
      const nome = `logo-${Date.now()}.${(logo.file.name.split('.').pop() || 'png').toLowerCase()}`;
      const up = await supabase.storage.from('logos').upload(nome, logo.file, { upsert: true });
      if (up.error) throw new Error(up.error.message);
      const url = supabase.storage.from('logos').getPublicUrl(nome).data.publicUrl;
      const r = await supabase.from('configuracoes').upsert({ chave: 'company_logo', valor: url }, { onConflict: 'chave' });
      if (r.error) throw new Error(r.error.message);
      toast('Logo atualizada — recarregue a página para ver em todo o app');
      setLogo(null);
    } catch (e: any) { toast('Não foi possível enviar a logo: ' + e.message, 'erro'); }
    finally { setEnviandoLogo(false); }
  }

  const exemplo = (tpl[statusTpl] || '')
    .split('{nome_cliente}').join('Maria').split('{servico}').join('Barra, Ajuste').split('{data_entrega}').join('24/10/2026').split('{atelier}').join(f.nome);

  return (
    <Page>
      <PageHeader title="Configurações" subtitle="Dados do ateliê, PIX, logo e mensagens"
        actions={<Button onClick={salvar} loading={salvando}><Save className="w-4 h-4" /> Salvar</Button>} />

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="space-y-5">
          <Secao icone={<Store className="w-4 h-4" />} titulo="Dados do ateliê" texto="Aparecem nas mensagens e no comprovante impresso">
            <div className="space-y-4">
              <Field label="Nome do ateliê"><Input value={f.nome} onChange={set('nome')} /></Field>
              <Field label="Telefone / WhatsApp"><Input value={f.telefone} onChange={set('telefone')} /></Field>
              <Field label="Endereço"><Input value={f.endereco} onChange={set('endereco')} placeholder="Rua, número, cidade" /></Field>
            </div>
          </Secao>

          <Secao icone={<QrCode className="w-4 h-4" />} titulo="Dados do PIX" texto="Enviados na abertura da OS e nas cobranças">
            <div className="space-y-4">
              <Field label="Nome do titular"><Input value={f.pixNome} onChange={set('pixNome')} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Chave PIX / telefone"><Input value={f.pixChave} onChange={set('pixChave')} /></Field>
                <Field label="CPF (opcional)"><Input value={f.pixCpf} onChange={set('pixCpf')} /></Field>
              </div>
              <pre className="whitespace-pre-wrap font-sans text-xs bg-at-soft rounded-xl p-3 text-at-ink">{textoPix(f)}</pre>
            </div>
          </Secao>

          <Secao icone={<ImageIcon className="w-4 h-4" />} titulo="Logo" texto="Aparece no menu do app">
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-2xl border border-at-line bg-white flex items-center justify-center overflow-hidden">
                {logo ? <img src={logo.preview} alt="" className="max-w-full max-h-full" /> : logoAtual ? <img src={logoAtual} alt="" className="max-w-full max-h-full" /> : <span className="font-display text-at-wine text-center text-sm px-2">{f.nome.split(' ')[0]}</span>}
              </div>
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 h-10 px-3 rounded-xl border border-at-line bg-white text-sm cursor-pointer hover:bg-at-soft">
                  <Upload className="w-4 h-4" /> Escolher imagem
                  <input type="file" accept="image/*" className="hidden" onChange={e => { const file = e.target.files?.[0]; if (file) setLogo({ file, preview: URL.createObjectURL(file) }); }} />
                </label>
                {logo && <div><Button size="sm" onClick={enviarLogo} loading={enviandoLogo}>Enviar logo</Button></div>}
              </div>
            </div>
          </Secao>
        </div>

        <Secao icone={<MessageSquareText className="w-4 h-4" />} titulo="Mensagens de andamento" texto="Texto sugerido ao avisar a cliente no WhatsApp quando a OS muda de etapa">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {STATUS.filter(s => s !== 'Em costura').map(s => (
              <button key={s} onClick={() => setStatusTpl(s)} className={cx('h-8 px-3 rounded-full text-xs font-medium border', statusTpl === s ? 'bg-at-wine border-at-wine text-white' : 'bg-white border-at-line text-at-ink')}>{ROTULO_STATUS[s]}</button>
            ))}
          </div>
          {statusTpl === 'Pronto' && <p className="text-xs text-at-muted bg-at-soft rounded-xl px-3 py-2 mb-2">Ao marcar a OS como pronta, o app envia a mensagem completa: cada peça com cor, os serviços com valor, o valor total e os dados do PIX (ou “pagamento já realizado”). O texto abaixo não é usado para essa etapa.</p>}
          <Textarea value={tpl[statusTpl] || ''} onChange={e => setTpl({ ...tpl, [statusTpl]: e.target.value })} className="min-h-[180px] text-sm" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {VARIAVEIS.map(([v, r]) => (
              <button key={v} onClick={() => setTpl({ ...tpl, [statusTpl]: (tpl[statusTpl] || '') + v })} className="text-[11px] rounded-full bg-at-soft px-2 py-1 text-at-ink hover:bg-at-blush" title={`Inserir ${r}`}>{v}</button>
            ))}
            <button onClick={() => { const padrao = { ...tpl }; delete padrao[statusTpl]; saveTemplates(padrao); setTpl(loadTemplates()); }} className="text-[11px] rounded-full px-2 py-1 text-at-muted hover:text-at-ink inline-flex items-center gap-1 ml-auto"><RotateCcw className="w-3 h-3" />texto original</button>
          </div>
          <div className="mt-4">
            <div className="text-xs text-at-muted mb-1.5">Como a cliente vai receber</div>
            <div className="rounded-2xl rounded-tl-sm bg-[#E7F8DC] text-sm text-[#1f2b1a] p-3 whitespace-pre-wrap max-w-sm shadow-sm">{exemplo}</div>
          </div>
        </Secao>
      </div>

    </Page>
  );
}
