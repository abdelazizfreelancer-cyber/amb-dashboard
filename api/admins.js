import { checkAdmin, supabaseAdmin } from './_utils.js';
import bcrypt from 'bcryptjs';

const VALID_PERMS = ['questions', 'responses', 'requests', 'commercial', 'clients', 'meetings', 'contracts', 'admins'];

export default async function handler(req, res) {
  if (!(await checkAdmin(req, res, 'admins'))) return;
  const supabase = supabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('dashboard_admins')
      .select('id, name, permissions, created_at')
      .order('created_at', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true, admins: data });
  }

  if (req.method === 'POST') {
    const { action } = req.body || {};

    if (action === 'add') {
      const { name, password, permissions } = req.body;
      if (!name || !password) return res.status(400).json({ error: 'بيانات ناقصة' });
      if (password.length < 6) return res.status(400).json({ error: 'الباسورد لازم يكون 6 أحرف على الأقل' });
      const cleanPerms = Array.isArray(permissions) ? permissions.filter(p => VALID_PERMS.includes(p)) : [];
      const password_hash = bcrypt.hashSync(password, 10);
      const { error } = await supabase.from('dashboard_admins').insert([{ name, password_hash, permissions: cleanPerms }]);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'مفيش id' });
      const { error } = await supabase.from('dashboard_admins').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    if (action === 'reset-password') {
      const { id, newPassword } = req.body;
      if (!id || !newPassword) return res.status(400).json({ error: 'بيانات ناقصة' });
      if (newPassword.length < 6) return res.status(400).json({ error: 'الباسورد لازم يكون 6 أحرف على الأقل' });
      const password_hash = bcrypt.hashSync(newPassword, 10);
      const { error } = await supabase.from('dashboard_admins').update({ password_hash }).eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    if (action === 'update-permissions') {
      const { id, permissions } = req.body;
      if (!id) return res.status(400).json({ error: 'مفيش id' });
      const cleanPerms = Array.isArray(permissions) ? permissions.filter(p => VALID_PERMS.includes(p)) : [];
      const { error } = await supabase.from('dashboard_admins').update({ permissions: cleanPerms }).eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'action غير معروف' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
