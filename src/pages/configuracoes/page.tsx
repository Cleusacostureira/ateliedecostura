import { useState, useEffect } from 'react';
import Sidebar from '../../components/layout/Sidebar';
import { supabase } from '../../lib/supabaseClient';
import { loadTemplates, saveTemplates, loadSettings, saveSettings } from '../../lib/messages';

export default function ConfiguracoesPage() {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const handleSave = () => {
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  // Diagnostics output (temporary)
  const [diagOutput, setDiagOutput] = useState<string | null>(null);
  const [diagRunning, setDiagRunning] = useState(false);

  useEffect(() => {
    // load saved logo from configuracoes if available
    async function loadLogo() {
      try {
        const res = await supabase.from('configuracoes').select('valor').eq('chave', 'company_logo').limit(1).maybeSingle();
        const data = (res as any).data;
        const error = (res as any).error;
        if (!error && data?.valor?.url) {
          setLogoPreview(data.valor.url);
        }
      } catch (err) {
        // ignore
      }
    }
    loadLogo();
  }, []);

  // Mensagens automáticas
  const [templates, setTemplates] = useState<Record<string,string>>(() => loadTemplates());
  const [msgSettings, setMsgSettings] = useState<any>(() => loadSettings());

  const handleTemplateChange = (key: string, value: string) => {
    const next = { ...templates, [key]: value };
    setTemplates(next);
    saveTemplates(next);
  };

  const handleSettingToggle = (key: string, value: boolean) => {
    const next = { ...msgSettings, enabled: { ...(msgSettings.enabled||{}), [key]: value } };
    setMsgSettings(next);
    saveSettings(next);
  };

  const handleAtelierNameChange = (v: string) => {
    const next = { ...(msgSettings || {}), atelierName: v };
    setMsgSettings(next);
    saveSettings(next);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return alert('Selecione um arquivo de imagem');
    setUploading(true);
    try {
      // upload to Supabase storage 'logos' bucket with a unique filename to avoid cache/permission issues
      const fileExt = (logoFile.name.split('.').pop() || 'png').replace(/[^a-z0-9]/gi, '').toLowerCase();
      const fileName = `cleusa-logo-${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await supabase.storage.from('logos').upload(fileName, logoFile, { upsert: true });
      if (uploadError) {
        console.error('Upload error', uploadError);
        // helpful message if bucket missing or bad request
        if ((uploadError as any)?.status === 400) {
          alert('Erro 400 ao enviar: verifique se o bucket "logos" existe e se as credenciais estão corretas. Veja o console para detalhes.');
        } else {
          alert('Erro ao enviar logo: ' + (uploadError.message || JSON.stringify(uploadError)));
        }
        setUploading(false);
        return;
      }

      // get public URL (may be public or require signed URL later)
      const { data: publicData, error: publicErr } = supabase.storage.from('logos').getPublicUrl(fileName);
      if (publicErr) console.warn('getPublicUrl warning', publicErr);
      const publicUrl = publicData?.publicUrl;

      // generate a short-lived signed URL so the client can immediately fetch the image (works if bucket is private)
      let signedUrl: string | null = null;
      try {
        const { data: signedData, error: signedError } = await supabase.storage.from('logos').createSignedUrl(fileName, 60);
        if (signedError) console.warn('createSignedUrl warning', signedError);
        if (signedData?.signedURL) signedUrl = signedData.signedURL;
      } catch (e) {
        console.error('createSignedUrl exception', e);
      }

      // save url in configuracoes table (store canonical URL and optional signed_url)
      const savePayload: any = { chave: 'company_logo', valor: { url: publicUrl }, atualizado_em: new Date() };
      if (signedUrl) savePayload.valor.signed_url = signedUrl;
      await supabase.from('configuracoes').upsert(savePayload);

      // set preview and localStorage to the signed URL (if available) + cache-bust, otherwise use publicUrl
      const chosen = signedUrl || publicUrl;
      if (!chosen) {
        alert('Upload realizado, mas não foi possível obter a URL pública. Verifique as permissões do bucket.');
      }
      const busted = `${chosen}${chosen.includes('?') ? '&' : '?'}v=${Date.now()}`;
      setLogoPreview(busted);
      try { localStorage.setItem('company_logo_url', busted); } catch {}
      try { window.dispatchEvent(new CustomEvent('companyLogoUpdated', { detail: { url: busted } })); } catch {}
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (err: any) {
      alert('Erro ao enviar logo: ' + (err.message || String(err)));
    } finally {
      setUploading(false);
    }
  };

  // Temporary diagnostics runner (no DevTools required)
  const runDiagnostics = async () => {
    setDiagRunning(true);
    setDiagOutput(null);
    const out: any = { session: null, user: null, list: null, uploadTest: null };
    try {
      const s = await supabase.auth.getSession();
      out.session = s;
    } catch (e) { out.session = { error: String(e) }; }
    try {
      const u = await supabase.auth.getUser();
      out.user = u;
    } catch (e) { out.user = { error: String(e) }; }
    try {
      const l = await supabase.storage.from('logos').list();
      out.list = l;
    } catch (e) { out.list = { error: String(e) }; }
    try {
      // small test upload (text blob) to show detailed error without touching actual logo file
      const upload = await supabase.storage.from('logos').upload(`diag-test-${Date.now()}.txt`, new Blob(['x']), { upsert: true });
      out.uploadTest = upload;
      // attempt to remove the test file if created
      try { if (upload?.data?.path) await supabase.storage.from('logos').remove([upload.data.path]); } catch(_) {}
    } catch (e) { out.uploadTest = { error: String(e) }; }

    setDiagOutput(JSON.stringify(out, null, 2));
    setDiagRunning(false);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 lg:ml-56 pt-14 lg:pt-0">
        <div className="p-3 lg:p-6">
          <div className="mb-4 lg:mb-6">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Configurações</h1>
            <p className="text-xs lg:text-sm text-gray-600 mt-1">Gerencie as configurações do sistema</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            {/* Diagnostics (temporary) */}
            <div className="col-span-1 lg:col-span-2 bg-yellow-50 rounded-lg border border-yellow-200 p-4 lg:p-6">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">Diagnostics (temporário)</h3>
              <p className="text-xs text-yellow-700 mb-2">Clique para executar checagens de sessão, listar bucket `logos` e fazer um upload de teste. Use apenas para depuração.</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={runDiagnostics}
                  disabled={diagRunning}
                  className="px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-all text-xs font-medium"
                >
                  {diagRunning ? 'Executando...' : 'Run Diagnostics'}
                </button>
                <button
                  onClick={() => { try { navigator.clipboard.writeText(diagOutput || ''); } catch {} }}
                  className="px-3 py-2 bg-white text-yellow-800 border border-yellow-200 rounded-lg text-xs"
                >
                  Copy Output
                </button>
              </div>
              {diagOutput && (
                <pre className="mt-3 p-3 bg-white rounded text-xs overflow-auto max-h-64 border">{diagOutput}</pre>
              )}
            </div>
            {/* Informações do Ateliê */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
              <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <i className="ri-store-2-line text-rose-600"></i>
                Informações do Ateliê
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Nome do Ateliê</label>
                  <input
                    type="text"
                    value={msgSettings?.atelierName || 'Cleusa Ateliê de Costura'}
                    onChange={(e) => handleAtelierNameChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Logo da Empresa</label>
                  <div className="flex items-center gap-3">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="text-xs" />
                    <button
                      onClick={handleUploadLogo}
                      disabled={uploading}
                      className="px-3 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all text-xs font-medium"
                    >
                      {uploading ? 'Enviando...' : 'Enviar Logo'}
                    </button>
                  </div>
                  {logoPreview && (
                    <div className="mt-3">
                      <p className="text-[10px] text-gray-500 mb-1">Visualizar:</p>
                      <img src={logoPreview} alt="Logo preview" className="h-20 object-contain border rounded-md" />
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="tel"
                    defaultValue="(11) 99999-9999"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    defaultValue="contato@cleusaatelie.com.br"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Endereço</label>
                  <input
                    type="text"
                    defaultValue="Rua das Costuras, 123 - Centro, São Paulo - SP"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </div>
            </div>

            {/* Horário de Funcionamento removed as requested */}

            {/* Preferências do Sistema */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
              <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <i className="ri-settings-3-line text-rose-600"></i>
                Preferências do Sistema
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs lg:text-sm font-medium text-gray-900">Notificações por E-mail</p>
                    <p className="text-[10px] lg:text-xs text-gray-500">Receba alertas de novas ordens</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs lg:text-sm font-medium text-gray-900">Notificações WhatsApp</p>
                    <p className="text-[10px] lg:text-xs text-gray-500">Alertas de prazos próximos</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs lg:text-sm font-medium text-gray-900">Backup Automático</p>
                    <p className="text-[10px] lg:text-xs text-gray-500">Backup diário dos dados</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Segurança */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6">
              <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <i className="ri-shield-check-line text-rose-600"></i>
                Segurança
              </h2>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-all text-xs lg:text-sm font-medium flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer">
                  <i className="ri-lock-password-line"></i>
                  Alterar Senha
                </button>
                <button className="w-full px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-all text-xs lg:text-sm font-medium flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer">
                  <i className="ri-download-cloud-line"></i>
                  Exportar Dados
                </button>
                <button className="w-full px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all text-xs lg:text-sm font-medium flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer">
                  <i className="ri-delete-bin-line"></i>
                  Limpar Cache
                </button>
              </div>
            </div>
          </div>

          {/* Mensagens Automáticas */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 lg:p-6 mt-4">
            <h2 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">Mensagens Automáticas (WhatsApp)</h2>
            <p className="text-xs text-gray-600 mb-3">Edite os textos e ative/desative envios automáticos por status. Envio automático está desativado por padrão — sempre será pedido confirmação.</p>
            {['Recebido','Em costura','Pronto','Retirado'].map((s) => (
              <div key={s} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">{s}</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={!!(msgSettings?.enabled?.[s])} onChange={(e) => handleSettingToggle(s, e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-rose-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>
                <textarea value={templates[s] || ''} onChange={(e) => handleTemplateChange(s, e.target.value)} rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs lg:text-sm focus:ring-2 focus:ring-rose-500" />
                <p className="text-[11px] text-gray-500 mt-1">Use {"{nome_cliente}"}, {"{servico}"} e {"{data_entrega}"} para variáveis.</p>
              </div>
            ))}
          </div>

          {/* Botão Salvar */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSave}
              className="px-6 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all font-medium flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <i className="ri-save-line"></i>
              Salvar Configurações
            </button>
          </div>

          {/* Mensagem de Sucesso */}
          {showSuccessMessage && (
            <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
              <i className="ri-check-line text-xl"></i>
              <span className="font-medium">Configurações salvas com sucesso!</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
