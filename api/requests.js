import { checkAdmin, supabaseAdmin } from './_utils.js';

export default async function handler(req, res) {
  if (!(await checkAdmin(req, res, 'requests'))) return;
  const supabase = supabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('brief_requests')
      .select('id, user_id, status, created_at, resolved_at')
      .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const uniqueUserIds = [...new Set((data || []).map(r => r.user_id).filter(Boolean))];
    const usersMap = {};
    for (const uid of uniqueUserIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(uid);
      if (userData && userData.user) {
        const meta = userData.user.user_metadata || {};
        usersMap[uid] = { name: meta.full_name || '', phone: meta.phone || '', email: userData.user.email || '' };
      }
    }
    const enriched = (data || []).map(r => ({ ...r, client: usersMap[r.user_id] || { name: '', phone: '', email: '' } }));
    return res.status(200).json({ ok: true, requests: enriched });
  }

  if (req.method === 'POST') {
    const { id, status } = req.body || {};
    if (!id || !['approved', 'denied'].includes(status)) return res.status(400).json({ error: 'بيانات ناقصة' });
    const { error } = await supabase.from('brief_requests').update({ status, resolved_at: new Date().toISOString() }).eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
