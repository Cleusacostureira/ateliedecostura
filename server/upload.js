import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const upload = multer({ dest: path.join(process.cwd(), 'tmp') });
const app = express();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

app.post('/upload-logo', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  const filePath = req.file.path;
  const original = req.file.originalname || 'upload.bin';
  const ext = (original.split('.').pop() || 'png').replace(/[^a-z0-9]/gi, '').toLowerCase();
  const filename = `cleusa-logo-${Date.now()}.${ext}`;

  try {
    const fileStream = fs.createReadStream(filePath);
    const { data: uploadData, error: uploadErr } = await supabase.storage.from('logos').upload(filename, fileStream, { upsert: true });
    if (uploadErr) {
      console.error('storage upload error', uploadErr);
      return res.status(500).json({ error: uploadErr });
    }

    const { data: publicData } = supabase.storage.from('logos').getPublicUrl(filename);
    const publicUrl = publicData?.publicUrl || null;

    const payload = { chave: 'company_logo', valor: { url: publicUrl }, atualizado_em: new Date() };
    const { error: upsertErr } = await supabase.from('configuracoes').upsert(payload);
    if (upsertErr) {
      console.error('upsert error', upsertErr);
      return res.status(500).json({ error: upsertErr });
    }

    // cleanup
    try { fs.unlinkSync(filePath); } catch (_) {}

    return res.json({ url: publicUrl });
  } catch (e) {
    console.error('unexpected error', e);
    try { fs.unlinkSync(filePath); } catch (_) {}
    return res.status(500).json({ error: String(e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Upload server listening on http://localhost:${PORT}`));
