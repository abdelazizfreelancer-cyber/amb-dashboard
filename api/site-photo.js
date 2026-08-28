import { checkAdmin, supabaseAdmin } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await checkAdmin(req, res, 'admins'))) return;

  const { key, imageBase64, fileExt } = req.body || {};
  if (!key || !imageBase64) return res.status(400).json({ error: 'بيانات ناقصة' });

  const supabase = supabaseAdmin();
  const buffer = Buffer.from(imageBase64, 'base64');
  const path = `${key}-${Date.now()}.${fileExt || 'jpg'}`;

  const { error: upErr } = await supabase.storage
    .from('site-assets')
    .upload(path, buffer, { contentType: `image/${fileExt || 'jpeg'}`, upsert: true });

  if (upErr) return res.status(500).json({ error: upErr.message });

  const { data: pub } = supabase.storage.from('site-assets').getPublicUrl(path);
  const value = pub.publicUrl;

  const { error: dbErr } = await supabase.from('site_settings').upsert({ key, value });
  if (dbErr) return res.status(500).json({ error: dbErr.message });

  return res.status(200).json({ ok: true, url: value });
}
