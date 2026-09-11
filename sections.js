import { checkAdmin, supabaseAdmin } from './_utils.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await checkAdmin(req, res, 'questions'))) return;
  const supabase = supabaseAdmin();
  const { action } = req.body || {};

  if (action === 'add') {
    const { title, description } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'اكتب اسم القسم' });

    const { data: maxRow } = await supabase
      .from('question_sections').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
    const nextOrder = (maxRow ? maxRow.sort_order : 0) + 1;
    const sectionKey = 'sec_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const { data, error } = await supabase.from('question_sections').insert([{
      section_key: sectionKey,
      part: 'PART 04 — إضافي',
      num: String(nextOrder).padStart(2, '0'),
      title: title.trim(),
      description: description || null,
      is_commercial: false,
      sort_order: nextOrder
    }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, section: data });
  }

  if (action === 'delete') {
    const { sectionKey } = req.body;
    if (!sectionKey) return res.status(400).json({ error: 'مفيش sectionKey' });

    // بنمسح الأسئلة اللي جوه القسم الأول (لو موجودة) وبعدين القسم نفسه
    const { error: delQErr } = await supabase.from('questions').delete().eq('section_key', sectionKey);
    if (delQErr) return res.status(500).json({ error: delQErr.message });
    const { error: delSErr } = await supabase.from('question_sections').delete().eq('section_key', sectionKey);
    if (delSErr) return res.status(500).json({ error: delSErr.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(400).json({ error: 'action غير معروف' });
}
