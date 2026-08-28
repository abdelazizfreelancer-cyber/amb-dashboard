import { checkAdmin, supabaseAdmin } from './_utils.js';

// دالة عامة لحفظ أي إعداد نصي في جدول site_settings (key/value)
// بتستخدم حاليًا لحفظ Meta Pixel ID، وأي إعدادات نصية تانية تتضاف مستقبلًا بدون ملف API جديد
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!(await checkAdmin(req, res, ['admins', 'theme']))) return;

  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({ error: 'بيانات ناقصة' });

  const supabase = supabaseAdmin();
  const { error } = await supabase.from('site_settings').upsert({ key, value: value || null });
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ ok: true });
}
