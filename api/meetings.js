import { checkAdmin, supabaseAdmin } from './_utils.js';

export default async function handler(req, res) {
  if (!(await checkAdmin(req, res, 'meetings'))) return;
  const supabase = supabaseAdmin();

  if (req.method === 'GET') {
    const { data: slots, error: slotsErr } = await supabase
      .from('meeting_slots').select('id, start_time, end_time').order('start_time', { ascending: true });
    if (slotsErr) return res.status(500).json({ error: slotsErr.message });

    const { data: links } = await supabase.from('meeting_links').select('slot_id, link');
    const { data: bookings } = await supabase.from('meeting_bookings').select('id, slot_id, user_id, booked_at');

    const linkMap = {};
    (links || []).forEach(l => { linkMap[l.slot_id] = l.link; });

    const uniqueUserIds = [...new Set((bookings || []).map(b => b.user_id))];
    const usersMap = {};
    for (const uid of uniqueUserIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(uid);
      if (userData && userData.user) {
        const meta = userData.user.user_metadata || {};
        usersMap[uid] = { name: meta.full_name || '', phone: meta.phone || '', email: userData.user.email || '' };
      }
    }
    const bookingsBySlot = {};
    (bookings || []).forEach(b => { bookingsBySlot[b.slot_id] = { ...b, client: usersMap[b.user_id] || {} }; });

    const result = slots.map(s => ({
      id: s.id, start_time: s.start_time, end_time: s.end_time, link: linkMap[s.id] || '', booking: bookingsBySlot[s.id] || null
    }));
    return res.status(200).json({ ok: true, slots: result });
  }

  if (req.method === 'POST') {
    const { action } = req.body || {};

    if (action === 'add') {
      const { startTime, endTime, link } = req.body;
      if (!startTime || !endTime || !link) return res.status(400).json({ error: 'بيانات ناقصة' });
      if (new Date(endTime) <= new Date(startTime)) return res.status(400).json({ error: 'وقت النهاية لازم يكون بعد وقت البداية' });
      const { data: slot, error: slotErr } = await supabase.from('meeting_slots').insert([{ start_time: startTime, end_time: endTime }]).select().single();
      if (slotErr) return res.status(500).json({ error: slotErr.message });
      const { error: linkErr } = await supabase.from('meeting_links').insert([{ slot_id: slot.id, link }]);
      if (linkErr) return res.status(500).json({ error: linkErr.message });
      return res.status(200).json({ ok: true, slot });
    }

    if (action === 'update') {
      const { id, startTime, endTime, link } = req.body;
      if (!id) return res.status(400).json({ error: 'مفيش id' });
      if (startTime || endTime) {
        const patch = {};
        if (startTime) patch.start_time = startTime;
        if (endTime) patch.end_time = endTime;
        const { error } = await supabase.from('meeting_slots').update(patch).eq('id', id);
        if (error) return res.status(500).json({ error: error.message });
      }
      if (link) {
        const { error } = await supabase.from('meeting_links').upsert({ slot_id: id, link });
        if (error) return res.status(500).json({ error: error.message });
      }
      return res.status(200).json({ ok: true });
    }

    if (action === 'delete') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'مفيش id' });
      const { error } = await supabase.from('meeting_slots').delete().eq('id', id);
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'action غير معروف' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
