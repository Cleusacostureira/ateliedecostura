import { createPortal } from 'react-dom';
import { dataCurta, dataLocal, dinheiro, telefoneBonito } from '../../data/formato';
import type { Cliente, Ordem } from '../../data/types';
import { useAtelie } from '../../data/config';

/** Comprovante para imprimir (fica escondido na tela; só aparece na impressão). */
export default function Comprovante({ ordem, cliente }: { ordem: Ordem; cliente?: Cliente }) {
  const c = useAtelie();
  return createPortal(
    <div id="print-area" className="hidden print:block text-black" style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, padding: 16, maxWidth: 380 }}>
      <div style={{ textAlign: 'center', borderBottom: '1px dashed #999', paddingBottom: 8, marginBottom: 8 }}>
        <div style={{ fontFamily: '"Playfair Display", serif', fontSize: 20 }}>{c.nome}</div>
        <div>Fone/WhatsApp: {c.telefone}</div>{c.endereco && <div>{c.endereco}</div>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 700 }}>
        <span>OS Nº {ordem.numero}</span><span>{dataLocal(ordem.criadaEm)}</span>
      </div>
      <div style={{ marginTop: 6 }}>Cliente: <b>{cliente?.nome || '—'}</b></div>
      {cliente?.telefone && <div>Telefone: {telefoneBonito(cliente.telefone)}</div>}
      <div>Previsão de retirada: <b>{dataCurta(ordem.entrega)}</b></div>
      <table style={{ width: '100%', marginTop: 10, borderCollapse: 'collapse' }}>
        <tbody>
          {ordem.pecas.map((p, i) => (
            <tr key={p.id + i} style={{ borderTop: '1px solid #ddd', verticalAlign: 'top' }}>
              <td style={{ padding: '4px 0' }}>
                <b>{p.tipo}</b>{p.cor ? ` · ${p.cor}` : ''}{p.modelo ? ` · ${p.modelo}` : ''}
                <div>{p.services.map(s => s.name).join(', ')}</div>
              </td>
              <td style={{ textAlign: 'right', padding: '4px 0', whiteSpace: 'nowrap' }}>{dinheiro(p.services.reduce((a, s) => a + s.price, 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #999', marginTop: 8, paddingTop: 6, fontSize: 15, fontWeight: 700 }}>
        <span>Total</span><span>{dinheiro(ordem.total)}</span>
      </div>
      <div style={{ marginTop: 4 }}>Pagamento: {ordem.pago ? 'PAGO' : 'A RECEBER'}</div>
      {ordem.observacoes && <div style={{ marginTop: 6 }}>Obs.: {ordem.observacoes}</div>}
      <div style={{ marginTop: 10, fontSize: 11 }}>PIX: {c.pixNome} · {c.pixChave}</div>
      <div style={{ textAlign: 'center', marginTop: 12 }}>Obrigada pela preferência! ✂️</div>
    </div>,
    document.body,
  );
}
