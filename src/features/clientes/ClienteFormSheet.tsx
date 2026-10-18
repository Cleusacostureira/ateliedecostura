import { useEffect, useState } from 'react';
import { Button, Field, Input, Sheet, Textarea } from '../../ui';
import { useToast } from '../../ui/toast';
import { useDados } from '../../data/store';
import { criarCliente, salvarCliente, type ClienteForm } from '../../data/db';
import { semAcento } from '../../data/formato';
import type { Cliente } from '../../data/types';

const vazio: ClienteForm = { nome: '', telefone: '', email: '', cpf_cnpj: '', endereco: '', notas: '' };

export default function ClienteFormSheet({ open, onClose, cliente, nomeInicial, onSalvo }: {
  open: boolean;
  onClose: () => void;
  cliente?: Cliente | null;
  nomeInicial?: string;
  onSalvo?: (c: Cliente) => void;
}) {
  const { clientes, guardarCliente } = useDados();
  const toast = useToast();
  const [f, setF] = useState<ClienteForm>(vazio);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF(cliente ? {
      nome: cliente.nome || '', telefone: cliente.telefone || '', email: cliente.email || '',
      cpf_cnpj: cliente.cpf_cnpj || '', endereco: cliente.endereco || '', notas: cliente.notas || '',
    } : { ...vazio, nome: nomeInicial || '' });
  }, [open, cliente, nomeInicial]);

  const set = (k: keyof ClienteForm) => (e: { target: { value: string } }) => setF(v => ({ ...v, [k]: e.target.value }));

  // Aviso de possível cadastro repetido (mesmo telefone ou mesmo nome)
  const tel = f.telefone.replace(/\D/g, '');
  const repetida = clientes.find(c => c.id !== cliente?.id && (
    (tel.length >= 8 && String(c.telefone || '').replace(/\D/g, '').endsWith(tel.slice(-8))) ||
    (f.nome.trim().length > 3 && semAcento(c.nome.trim()) === semAcento(f.nome.trim()))
  ));

  async function salvar() {
    if (!f.nome.trim()) { toast('Informe o nome da cliente', 'erro'); return; }
    setSalvando(true);
    try {
      const c = cliente ? await salvarCliente(cliente.id, f) : await criarCliente(f);
      guardarCliente(c);
      toast(cliente ? 'Cadastro atualizado' : 'Cliente cadastrada');
      onSalvo?.(c);
      onClose();
    } catch (e: any) {
      toast(e.message, 'erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={cliente ? 'Editar cliente' : 'Nova cliente'} footer={
      <div className="flex gap-2 justify-end">
        <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        <Button onClick={salvar} loading={salvando}>Salvar</Button>
      </div>
    }>
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); salvar(); }}>
        <Field label="Nome *"><Input autoFocus value={f.nome} onChange={set('nome')} placeholder="Nome da cliente" /></Field>
        <Field label="WhatsApp / telefone" hint="Com DDD, só números. Ex.: 45999998888">
          <Input inputMode="tel" value={f.telefone} onChange={set('telefone')} placeholder="(45) 99999-8888" />
        </Field>
        {repetida && (
          <div className="text-sm rounded-xl bg-amber-50 text-amber-800 px-3 py-2">
            Já existe <b>{repetida.nome}</b>{repetida.telefone ? ` (${repetida.telefone})` : ''} cadastrada. Confira para não duplicar.
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="E-mail"><Input type="email" value={f.email} onChange={set('email')} /></Field>
          <Field label="CPF / CNPJ"><Input value={f.cpf_cnpj} onChange={set('cpf_cnpj')} /></Field>
        </div>
        <Field label="Endereço / cidade"><Input value={f.endereco} onChange={set('endereco')} /></Field>
        <Field label="Observações" hint="Medidas, preferências, recados..."><Textarea value={f.notas} onChange={set('notas')} /></Field>
        <button type="submit" className="hidden" />
      </form>
    </Sheet>
  );
}
