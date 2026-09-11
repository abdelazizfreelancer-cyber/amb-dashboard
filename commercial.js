import { checkAdmin, supabaseAdmin } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await checkAdmin(req, res, 'commercial'))) return;

  const { id, tag, title, body, fit } = req.body || {};
  if (!id) return res.status(400).json({ error: 'مفيش id' });

  const update = {};
  if (tag !== undefined) update.tag = tag;
  if (title !== undefined) update.title = title;
  if (body !== undefined) update.body = body;
  if (fit !== undefined) update.fit = fit;

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from('commercial_options')
    .update(update)
    .eq('id', id);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ ok: true });
}
