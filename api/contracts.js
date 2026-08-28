import { checkAdmin, supabaseAdmin } from './_utils.js';

export default async function handler(req, res) {
  if (!(await checkAdmin(req, res, 'contracts'))) return;
  const supabase = supabaseAdmin();

  if (req.method === 'GET') {
    const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    if (usersErr) return res.status(500).json({ error: usersErr.message });

    const { data: contracts } = await supabase
      .from('contracts')
      .select('id, user_id, status, contract_text, signature_data_url, signed_at, created_at');

    const contractMap = {};
    (contracts || []).forEach(c => { contractMap[c.user_id] = c; });

    const clients = (usersData.users || []).map(u => {
      const meta = u.user_metadata || {};
      return {
        id: u.id,
        name: meta.full_name || '',
        phone: meta.phone || '',
        email: u.email || '',
        avatar: meta.avatar_url || '',
        contract: contractMap[u.id] || null
      };
    });

    return res.status(200).json({ ok: true, clients });
  }

  if (req.method === 'POST') {
    const { userId, contractText } = req.body || {};
    if (!userId || !contractText) return res.status(400).json({ error: 'بيانات ناقصة' });

    const { data: existing } = await supabase.from('contracts').select('id, status').eq('user_id', userId).maybeSingle();
    if (existing && existing.status === 'signed') {
      return res.status(400).json({ error: 'العقد ده اتوقع بالفعل، مينفعش تعدّله' });
    }

    const { error } = await supabase.from('contracts').upsert({
      user_id: userId, contract_text: contractText, status: 'ready_to_sign', updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
