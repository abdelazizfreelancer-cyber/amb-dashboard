import { supabaseAdmin } from './_utils.js';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { password } = req.body || {};
  if (!password) return res.status(401).json({ ok: false, error: 'باسورد غلط' });

  if (password === process.env.ADMIN_PASSWORD) {
    return res.status(200).json({ ok: true, name: 'الأدمن الرئيسي', permissions: 'all' });
  }

  const supabase = supabaseAdmin();
  const { data } = await supabase.from('dashboard_admins').select('name, password_hash, permissions');
  const match = (data || []).find(row => bcrypt.compareSync(password, row.password_hash));
  if (match) return res.status(200).json({ ok: true, name: match.name, permissions: match.permissions || [] });

  return res.status(401).json({ ok: false, error: 'باسورد غلط' });
}
