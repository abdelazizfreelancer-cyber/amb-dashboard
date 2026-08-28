import { checkAdmin, supabaseAdmin } from './_utils.js';

export default async function handler(req, res) {
  if (!(await checkAdmin(req, res, 'responses'))) return;
  const supabase = supabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('responses')
      .select('ref, user_id, submitted_at, answers, read_at')
      .order('submitted_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const uniqueUserIds = [...new Set((data || []).map(r => r.user_id).filter(Boolean))];
    const usersMap = {};
    for (const uid of uniqueUserIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(uid);
      if (userData && userData.user) {
        const meta = userData.user.user_metadata || {};
        usersMap[uid] = { name: meta.full_name || '', phone: meta.phone || '', email: userData.user.email || '', avatar: meta.avatar_url || '' };
      }
    }
    const enriched = (data || []).map(r => ({ ...r, client: usersMap[r.user_id] || { name: '', phone: '', email: '', avatar: '' } }));
    return res.status(200).json({ ok: true, responses: enriched });
  }

  if (req.method === 'POST') {
    const { ref } = req.body || {};
    if (!ref) return res.status(400).json({ error: 'مفيش ref' });
    const { error } = await supabase.from('responses').update({ read_at: new Date().toISOString() }).eq('ref', ref);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
