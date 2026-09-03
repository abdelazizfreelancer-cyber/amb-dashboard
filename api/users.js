import { supabaseAdmin, checkAdmin } from './_utils.js';

export default async function handler(req, res) {
  if (!(await checkAdmin(req, res, 'clients'))) return;
  const supabase = supabaseAdmin();

  if (req.method === 'GET') {
    // List users
    const { data, error } = await supabase.auth.admin.listUsers();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ users: data.users });
  } 
  
  if (req.method === 'POST') {
    const { action, id, new_password } = req.body;
    
    if (action === 'reset_password') {
      if (!id || !new_password) return res.status(400).json({ error: 'Missing parameters' });
      const { data, error } = await supabase.auth.admin.updateUserById(id, { password: new_password });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
    
    if (action === 'delete_brief') {
      if (!id) return res.status(400).json({ error: 'Missing user ID' });
      // مسح الإجابات من جدول responses لهذا العميل
      const { error } = await supabase.from('responses').delete().eq('user_id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
    
    if (action === 'delete_user') {
      if (!id) return res.status(400).json({ error: 'Missing user ID' });
      // Delete user
      const { data, error } = await supabase.auth.admin.deleteUser(id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
    
    return res.status(400).json({ error: 'Unknown action' });
  }

  res.status(405).end();
}
