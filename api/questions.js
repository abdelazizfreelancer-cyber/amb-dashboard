import { checkAdmin, supabaseAdmin } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await checkAdmin(req, res, 'questions'))) return;

  const { action } = req.body || {};
  const supabase = supabaseAdmin();

  if (action === 'add') {
    const { sectionKey, label, type, multi, options, required } = req.body;
    if (!sectionKey || !label || !type) return res.status(400).json({ error: 'بيانات ناقصة' });
    const { data, error } = await supabase
      .from('questions')
      .insert([{ section_key: sectionKey, label, type, multi: !!multi, options: options || null, required: !!required }])
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, question: data });
  }

  if (action === 'update') {
    const { id, required, label, type, multi, options } = req.body;
    if (!id) return res.status(400).json({ error: 'مفيش id' });
    const update = {};
    if (required !== undefined) update.required = !!required;
    if (label !== undefined) update.label = label;
    if (type !== undefined) update.type = type;
    if (multi !== undefined) update.multi = !!multi;
    if (options !== undefined) update.options = options;
    const { error } = await supabase.from('questions').update(update).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  if (action === 'delete') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'مفيش id' });
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'action غير معروف' });
}
