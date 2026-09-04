/* =========================================================
   DASHBOARD APP - admin.js (Meetings & Questions Manager)
   ========================================================= */

// 1. إضافة موعد جديد من الداشبورد
async function addMeetingSlot(startTimeIso, endTimeIso) {
  const { data, error } = await supabaseClient
    .from('meeting_slots')
    .insert([
      { 
        start_time: startTimeIso, 
        end_time: endTimeIso 
      }
    ]);

  if (error) {
    alert('حدث خطأ أثناء إضافة الموعد: ' + error.message);
  } else {
    alert('تمت إضافة الموعد بنجاح!');
    if (typeof loadAdminMeetings === 'function') loadAdminMeetings();
  }
}

// 2. جلب وتحديث المواعيد في لوحة التحكم
async function loadAdminMeetings() {
  const listContainer = document.getElementById('adminMeetingsList');
  if (!listContainer) return;

  const { data: slots, error } = await supabaseClient
    .from('meeting_slots')
    .select('*')
    .order('start_time', { ascending: true });

  if (error) {
    listContainer.innerHTML = `<p>خطأ في جلب المواعيد: ${error.message}</p>`;
    return;
  }

  if (!slots || slots.length === 0) {
    listContainer.innerHTML = `<p>لا توجد مواعيد مضافة حالياً.</p>`;
    return;
  }

  listContainer.innerHTML = slots.map(s => `
    <div class="slot-item" style="display:flex; justify-between; align-items:center; padding:10px; border-bottom:1px solid #ccc;">
      <div>
        <strong>من:</strong> ${new Date(s.start_time).toLocaleString('ar-EG')} 
        <br>
        <strong>إلى:</strong> ${new Date(s.end_time).toLocaleString('ar-EG')}
      </div>
      <button onclick="deleteMeetingSlot('${s.id}')" style="background:red; color:#fff; border:none; padding:5px 10px; cursor:pointer;">حذف</button>
    </div>
  `).join('');
}

// 3. حذف موعد من لوحة التحكم
async function deleteMeetingSlot(slotId) {
  if (!confirm('هل أنت تأكد من حذف هذا الموعد؟')) return;

  const { error } = await supabaseClient
    .from('meeting_slots')
    .delete()
    .eq('id', slotId);

  if (error) {
    alert('حدث خطأ أثناء الحذف: ' + error.message);
  } else {
    loadAdminMeetings();
  }
}
