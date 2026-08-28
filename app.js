/* ===================== SUPABASE CLIENT (بس لقراءة الأسئلة العامة) ===================== */
const supabaseClient = window.supabase.createClient(
  window.APP_CONFIG.SUPABASE_URL,
  window.APP_CONFIG.SUPABASE_ANON_KEY
);

/* ===================== STATIC CONFIG (لازم يفضل مطابق لموقع العميل) ===================== */
const SECTIONS_META = [
  {key:"s1", part:"PART 01 — DISCOVERY", num:"01", title:"نبذة عن البراند", desc:"الأساسيات اللي بنبني عليها كل حاجة تانية"},
  {key:"s2", part:"PART 01 — DISCOVERY", num:"02", title:"الوضع التشغيلي الحالي", desc:"إزاي البيزنس شغال دلوقتي على أرض الواقع"},
  {key:"s3", part:"PART 01 — DISCOVERY", num:"03", title:"المنتجات والتسعير", desc:"عشان نحدد إعلانات هتدفع على إيه بالظبط"},
  {key:"s4", part:"PART 01 — DISCOVERY", num:"04", title:"الجمهور المستهدف", desc:"مين بالظبط اللي بيشتري (أو المفروض يشتري)"},
  {key:"s5", part:"PART 01 — DISCOVERY", num:"05", title:"المنافسين والسوق", desc:"عشان نعرف نموضعكم صح جنبهم"},
  {key:"s6", part:"PART 01 — DISCOVERY", num:"06", title:"التجربة التسويقية السابقة", desc:"عشان نبني على اللي اتعمل، مش نبدأ من صفر"},
  {key:"s7", part:"PART 02 — GOALS & SETUP", num:"07", title:"الأهداف من التعاون", desc:"عشان نقيس النجاح صح من الأول"},
  {key:"s8", part:"PART 02 — GOALS & SETUP", num:"08", title:"الميزانية", desc:"رقم الإعلانات الفعلي، منفصل عن أتعاب الشغل"},
  {key:"s9", part:"PART 02 — GOALS & SETUP", num:"09", title:"المحل كجزء من الخطة", desc:"بما إن عندكم محل قائم، هنستغله صح في الحملات"},
  {key:"s10", part:"PART 02 — GOALS & SETUP", num:"10", title:"الأنظمة والدفع الإلكتروني", desc:"التفاصيل التقنية اللي هتوفر وقت بعد كده"},
  {key:"commercial", part:"PART 03 — COMMERCIALS", num:"—", title:"نتحاسب إزاي؟", desc:"هنراجعها مع بعض ونختار الأنسب لحجم شغلك", isCommercial:true}
];

/* ===================== STATE ===================== */
let questions = [];
let commercialOptions = [];
let adminAuthed = false;
let adminPassword = null;
let adminName = '';
let adminPermissions = []; // مصفوفة أسماء الصلاحيات، أو 'all' للأدمن الرئيسي
let adminSubTab = "questions";

const PERMISSION_LABELS = {
  questions: 'الأسئلة',
  responses: 'الردود المستلمة',
  requests: 'طلبات بريف جديد',
  commercial: 'خيارات التحاسب',
  clients: 'بيانات العملاء (الشيت)',
  meetings: 'المواعيد',
  contracts: 'العقود',
  admins: 'المشرفين',
  theme: 'شكل الموقع'
};
function hasPerm(p){ return adminPermissions === 'all' || adminPermissions.includes(p); }

/* ===================== LOAD QUESTIONS (public) ===================== */
async function loadQuestions(){
  const { data, error } = await supabaseClient
    .from('questions')
    .select('id, section_key, label, type, multi, options, required')
    .order('created_at', { ascending: true });
  if(error){ console.error('load questions error', error); questions = []; return; }
  questions = (data || []).map(q => ({
    id: q.id, sectionKey: q.section_key, label: q.label, type: q.type,
    multi: q.multi, options: q.options, required: q.required
  }));
}
async function loadCommercialOptions(){
  const { data, error } = await supabaseClient
    .from('commercial_options')
    .select('id, tag, title, body, fit, sort_order')
    .order('sort_order', { ascending: true });
  if(error){ console.error('load commercial options error', error); commercialOptions = []; return; }
  commercialOptions = data || [];
}

/* ===================== GATE ===================== */
function renderAdminGate(){
  const container = document.getElementById('adminView');
  container.innerHTML = `
    <div class="admin-gate">
      <h3>لوحة التحكم</h3>
      <p>ادخل الباسورد للمتابعة.</p>
      <input type="password" id="gatePass" placeholder="الباسورد">
      <div class="err" id="gateErr">الباسورد غلط، جرب تاني.</div>
      <button class="btn primary" id="gateBtn">دخول</button>
    </div>
  `;
  const tryEnter = async () => {
    const val = document.getElementById('gatePass').value;
    const btn = document.getElementById('gateBtn');
    btn.disabled = true; btn.textContent = "جاري التحقق...";
    try{
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: val })
      });
      const json = await res.json();
      if(res.ok){
        adminAuthed = true; adminPassword = val; adminName = json.name || ''; adminPermissions = json.permissions || [];
        renderAdminRoot();
      }
      else{ document.getElementById('gateErr').classList.add('show'); btn.disabled = false; btn.textContent = "دخول"; }
    }catch(err){ document.getElementById('gateErr').classList.add('show'); btn.disabled = false; btn.textContent = "دخول"; }
  };
  document.getElementById('gateBtn').addEventListener('click', tryEnter);
  document.getElementById('gatePass').addEventListener('keydown', e => { if(e.key === 'Enter') tryEnter(); });
}

async function renderAdminRoot(){
  if(!adminAuthed){ renderAdminGate(); return; }
  await loadQuestions();
  await loadCommercialOptions();
  const container = document.getElementById('adminView');

  const tabs = [
    { key:'questions', label:'الأسئلة' },
    { key:'responses', label:'الردود المستلمة' },
    { key:'requests', label:'طلبات بريف جديد' },
    { key:'commercial', label:'خيارات التحاسب' },
    { key:'clients', label:'بيانات العملاء' },
    { key:'meetings', label:'المواعيد' },
    { key:'contracts', label:'العقود' },
    { key:'theme', label:'شكل الموقع' },
    { key:'admins', label:'الحسابات' }
  ].filter(t => hasPerm(t.key));

  if(tabs.length === 0){
    container.innerHTML = `<div class="admin-empty">مفيش عندك صلاحية توصل لأي قسم دلوقتي. تواصل مع الأدمن الرئيسي.</div>`;
    return;
  }
  if(!tabs.some(t => t.key === adminSubTab)) adminSubTab = tabs[0].key;

  container.innerHTML = `
    <div class="admin-toolbar">
      <div class="subtabs">
        ${tabs.map(t => `<button class="subtab-btn ${adminSubTab===t.key?'active':''}" data-tab="${t.key}">${t.label}</button>`).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        ${adminName ? `<span style="font-size:12px;color:var(--ink-dim);font-family:'Cairo';">مسجل دخول: ${adminName}</span>` : ``}
        <button class="mini-link" id="logoutBtn">تسجيل خروج</button>
      </div>
    </div>
    <div id="adminInner"></div>
  `;
  container.querySelectorAll('.subtab-btn').forEach(btn => {
    btn.addEventListener('click', () => { adminSubTab = btn.dataset.tab; renderAdminRoot(); });
  });
  document.getElementById('logoutBtn').addEventListener('click', () => { adminAuthed=false; adminPassword=null; adminName=''; adminPermissions=[]; renderAdminGate(); });

  if(adminSubTab === 'questions') renderQuestionEditor();
  else if(adminSubTab === 'responses') renderResponsesList();
  else if(adminSubTab === 'requests') renderBriefRequests();
  else if(adminSubTab === 'admins') renderAdminsManager();
  else if(adminSubTab === 'clients') renderClientsSheetTab();
  else if(adminSubTab === 'meetings') renderMeetingsAdmin();
  else if(adminSubTab === 'contracts') renderContractsAdmin();
  else if(adminSubTab === 'theme') renderThemeEditor();
  else renderCommercialEditor();
}

/* ===================== CLIENTS SHEET (بيانات العملاء) ===================== */
function renderClientsSheetTab(){
  const inner = document.getElementById('adminInner');
  const url = window.APP_CONFIG.GOOGLE_SHEET_VIEW_URL;
  if(!url || !url.startsWith('http')){
    inner.innerHTML = `<div class="admin-empty">لسه معملتش ربط الشيت. حط رابط الشيت في config.js تحت GOOGLE_SHEET_VIEW_URL.</div>`;
    return;
  }
  inner.innerHTML = `
    <div class="admin-gate" style="max-width:100%;margin:0;text-align:right;">
      <h3 style="margin-bottom:10px;">بيانات كل العملاء بتتسجل في الشيت أوتوماتيك</h3>
      <p style="margin-bottom:14px;">أي عميل يعمل حساب جديد، بياناته (الاسم، الهاتف، الإيميل، تاريخ التسجيل) بتتحط في الشيت لوحدها فورًا.</p>
      <a href="${url}" target="_blank" style="display:inline-block;">
        <button class="btn primary" style="width:auto;">افتح الشيت ↗</button>
      </a>
    </div>
  `;
}

/* ===================== MEETINGS ADMIN ===================== */
const WEEKDAY_NAMES = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];

async function renderMeetingsAdmin(){
  const inner = document.getElementById('adminInner');
  inner.innerHTML = `<div class="load-msg">جاري تحميل المواعيد...</div>`;
  let slots = [];
  try{
    const r = await fetch('/api/meetings', { headers: { 'x-admin-password': adminPassword } });
    if(r.status === 401){ adminAuthed=false; adminPassword=null; renderAdminGate(); return; }
    const json = await r.json();
    slots = json.slots || [];
  }catch(err){ inner.innerHTML = `<div class="admin-empty">حصل خطأ في تحميل المواعيد.</div>`; return; }

  const grouped = {};
  slots.forEach(s => {
    const d = new Date(s.start_time);
    const key = d.toISOString().split('T')[0];
    if(!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  });
  const sortedDates = Object.keys(grouped).sort();

  inner.innerHTML = `
    <div class="qs-section">
      <h3 style="font-family:'Cairo';font-size:15px;color:var(--green-900);margin-bottom:14px;">إضافة معاد جديد</h3>
      <div class="row">
        <input type="date" id="newSlotDate">
      </div>
      <div class="time-picker" id="timePickerStart">
        <div class="time-picker-label">من الساعة (بداية الميتينج)</div>
        <div class="time-picker-row">
          ${[12,1,2,3,4,5].map(h => `<button type="button" class="hour-btn start-hour-btn" data-hour="${h}">${h}</button>`).join('')}
        </div>
        <div class="time-picker-row">
          ${[6,7,8,9,10,11].map(h => `<button type="button" class="hour-btn start-hour-btn" data-hour="${h}">${h}</button>`).join('')}
        </div>
        <div class="ampm-toggle">
          <button type="button" class="ampm-btn start-ampm-btn active" data-ampm="AM">صباحًا</button>
          <button type="button" class="ampm-btn start-ampm-btn" data-ampm="PM">مساءً</button>
        </div>
      </div>
      <div class="time-picker" id="timePickerEnd" style="margin-top:10px;">
        <div class="time-picker-label">لحد الساعة (نهاية الميتينج — اختياري)</div>
        <button type="button" class="hour-btn end-hour-btn active" data-hour="" style="width:100%;margin-bottom:8px;">بدون تحديد نهاية</button>
        <div class="time-picker-row">
          ${[12,1,2,3,4,5].map(h => `<button type="button" class="hour-btn end-hour-btn" data-hour="${h}">${h}</button>`).join('')}
        </div>
        <div class="time-picker-row">
          ${[6,7,8,9,10,11].map(h => `<button type="button" class="hour-btn end-hour-btn" data-hour="${h}">${h}</button>`).join('')}
        </div>
        <div class="ampm-toggle">
          <button type="button" class="ampm-btn end-ampm-btn active" data-ampm="AM">صباحًا</button>
          <button type="button" class="ampm-btn end-ampm-btn" data-ampm="PM">مساءً</button>
        </div>
      </div>
      <div class="time-picker-preview" id="timePickerPreview" style="margin-top:10px;">من فضلك اختار الساعة</div>
      <div class="row" style="margin-top:10px;">
        <input type="text" id="newSlotLink" placeholder="رابط الميتينج (اختياري — ممكن تحطه بعدين)">
      </div>
      <button class="btn primary small" id="addSlotBtn" style="margin-top:10px;">إضافة المعاد</button>
    </div>
    ${sortedDates.length === 0 ? `<div class="admin-empty">مفيش مواعيد متضافة لسه.</div>` : sortedDates.map(dateKey => {
      const d = new Date(dateKey);
      const dayName = WEEKDAY_NAMES[d.getDay()];
      return `
        <div class="qs-section">
          <h3 style="font-family:'Cairo';font-size:15px;color:var(--green-900);margin-bottom:12px;">${dayName} — ${d.toLocaleDateString('ar-EG')}</h3>
          ${grouped[dateKey].map(s => {
            const startTxt = new Date(s.start_time).toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' });
            const timeLabel = s.end_time
              ? `${startTxt} – ${new Date(s.end_time).toLocaleTimeString('ar-EG', { hour:'2-digit', minute:'2-digit' })}`
              : startTxt;
            const booked = s.booking;
            return `
              <div class="q-row" data-id="${s.id}">
                <div class="q-row-text">
                  <div class="qlabel">${timeLabel} ${booked ? `<span class="status-pill st-approved">محجوز</span>` : `<span class="status-pill st-pending">متاح</span>`}</div>
                  <div class="qmeta">${s.link ? s.link : '<em>من غير رابط ميتينج — حط الرابط بعدين لو حبيت</em>'}${booked ? ` · حجزه: ${booked.client.name || 'بدون اسم'} (${booked.client.phone||'—'})` : ''}</div>
                </div>
                <div class="q-row-actions">
                  <button class="del-btn delSlotBtn" data-id="${s.id}" title="مسح المعاد">✕</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }).join('')}
  `;

  let selectedStartHour12 = null; // 1..12
  let selectedStartAmPm = 'AM';
  let selectedEndHour12 = null; // null = بدون تحديد نهاية
  let selectedEndAmPm = 'AM';

  document.querySelectorAll('.start-hour-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.start-hour-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedStartHour12 = parseInt(btn.dataset.hour, 10);
      updateTimePickerPreview();
    });
  });
  document.querySelectorAll('.start-ampm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.start-ampm-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedStartAmPm = btn.dataset.ampm;
      updateTimePickerPreview();
    });
  });
  document.querySelectorAll('.end-hour-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.end-hour-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedEndHour12 = btn.dataset.hour ? parseInt(btn.dataset.hour, 10) : null;
      updateTimePickerPreview();
    });
  });
  document.querySelectorAll('.end-ampm-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.end-ampm-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedEndAmPm = btn.dataset.ampm;
      updateTimePickerPreview();
    });
  });

  function updateTimePickerPreview(){
    const el = document.getElementById('timePickerPreview');
    if(!el) return;
    if(selectedStartHour12 === null){ el.textContent = 'من فضلك اختار الساعة'; return; }
    let txt = `من الساعة ${selectedStartHour12} ${selectedStartAmPm === 'AM' ? 'صباحًا' : 'مساءً'}`;
    if(selectedEndHour12 !== null){
      txt += ` — لحد ${selectedEndHour12} ${selectedEndAmPm === 'AM' ? 'صباحًا' : 'مساءً'}`;
    }
    el.textContent = txt;
  }

  document.getElementById('addSlotBtn').addEventListener('click', async (e) => {
    const dateVal = document.getElementById('newSlotDate').value; // YYYY-MM-DD
    const link = document.getElementById('newSlotLink').value.trim();
    if(!dateVal || selectedStartHour12 === null){ alert('اختار التاريخ وساعة البداية'); return; }

    // تحويل 12 ساعة (+صباحًا/مساءً) لصيغة 24 ساعة
    let startHour24 = selectedStartHour12 % 12; // 12 -> 0
    if(selectedStartAmPm === 'PM') startHour24 += 12;
    const startDateTimeStr = `${dateVal}T${String(startHour24).padStart(2,'0')}:00:00`;

    let endDateTimeStr = null;
    if(selectedEndHour12 !== null){
      let endHour24 = selectedEndHour12 % 12;
      if(selectedEndAmPm === 'PM') endHour24 += 12;
      endDateTimeStr = `${dateVal}T${String(endHour24).padStart(2,'0')}:00:00`;
    }

    const btnEl = e.target;
    btnEl.disabled = true; btnEl.textContent = "جاري الإضافة...";
    const result = await adminFetch('/api/meetings', {
      action: 'add',
      startTime: new Date(startDateTimeStr).toISOString(),
      endTime: endDateTimeStr ? new Date(endDateTimeStr).toISOString() : null,
      link: link || null
    });
    btnEl.disabled = false; btnEl.textContent = "إضافة المعاد";
    if(result && result.ok){ renderMeetingsAdmin(); }
    else{ alert('حصل خطأ: ' + ((result && result.error) || 'خطأ غير معروف')); }
  });
  inner.querySelectorAll('.delSlotBtn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if(!confirm('متأكد إنك عايز تمسح المعاد ده؟')) return;
      await adminFetch('/api/meetings', { action: 'delete', id: e.target.dataset.id });
      renderMeetingsAdmin();
    });
  });
}

const THEME_FONTS = ['Cairo', 'Almarai', 'Tajawal', 'Changa', 'IBM Plex Sans Arabic', 'El Messiri', 'Reem Kufi'];
const THEME_DEFAULTS = { primaryColor:'#143331', accentColor:'#c08829', headingFont:'Cairo', bodyFont:'Almarai' };
let currentThemeConfig = { ...THEME_DEFAULTS };

async function loadCurrentThemeConfig(){
  const { data } = await supabaseClient.from('site_settings').select('value').eq('key','theme_config').maybeSingle();
  if(data && data.value){
    try{ currentThemeConfig = { ...THEME_DEFAULTS, ...JSON.parse(data.value) }; }
    catch(e){ currentThemeConfig = { ...THEME_DEFAULTS }; }
  } else {
    currentThemeConfig = { ...THEME_DEFAULTS };
  }
}

async function renderThemeEditor(){
  const inner = document.getElementById('adminInner');
  inner.innerHTML = `<div class="load-msg">جاري تحميل إعدادات الشكل...</div>`;
  await loadCurrentThemeConfig();
  const cfg = currentThemeConfig;

  inner.innerHTML = `
    <div class="qs-section">
      <h3 style="font-family:'Cairo';font-size:15px;color:var(--green-900);margin-bottom:8px;">شكل الموقع</h3>
      <p style="font-size:12px;color:var(--ink-dim);margin-bottom:16px;">غيّر لون الموقع الأساسي، لون التمييز (الدهبي)، وخطوط العناوين والنصوص. أي تغيير بيتطبق على موقع العميل مباشرة بعد الحفظ، من غير ما تحتاج ترفع أي ملفات.</p>

      <div class="row" style="align-items:center;display:flex;gap:14px;">
        <div style="flex:1;">
          <label style="font-family:'Cairo';font-size:12px;font-weight:700;display:block;margin-bottom:6px;">اللون الأساسي</label>
          <input type="color" id="themePrimaryColor" value="${cfg.primaryColor}" style="width:100%;height:42px;padding:2px;cursor:pointer;">
        </div>
        <div style="flex:1;">
          <label style="font-family:'Cairo';font-size:12px;font-weight:700;display:block;margin-bottom:6px;">لون التمييز (الدهبي)</label>
          <input type="color" id="themeAccentColor" value="${cfg.accentColor}" style="width:100%;height:42px;padding:2px;cursor:pointer;">
        </div>
      </div>

      <div class="row" style="margin-top:14px;display:flex;gap:14px;">
        <div style="flex:1;">
          <label style="font-family:'Cairo';font-size:12px;font-weight:700;display:block;margin-bottom:6px;">خط العناوين</label>
          <select id="themeHeadingFont">
            ${THEME_FONTS.map(f => `<option value="${f}" ${f===cfg.headingFont?'selected':''}>${f}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1;">
          <label style="font-family:'Cairo';font-size:12px;font-weight:700;display:block;margin-bottom:6px;">خط النصوص</label>
          <select id="themeBodyFont">
            ${THEME_FONTS.map(f => `<option value="${f}" ${f===cfg.bodyFont?'selected':''}>${f}</option>`).join('')}
          </select>
        </div>
      </div>

      <div id="themePreviewBox" style="margin-top:18px;padding:22px;border-radius:12px;border:1px solid var(--line);">
        <div id="themePreviewHeading" style="font-size:18px;font-weight:800;margin-bottom:6px;">كده هيبقى شكل العناوين</div>
        <div id="themePreviewBody" style="font-size:14px;margin-bottom:14px;">وده شكل النصوص العادية في الموقع.</div>
        <button type="button" id="themePreviewBtn" style="border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:default;">زرار تجريبي</button>
      </div>

      <button class="btn primary small" id="saveThemeBtn" style="margin-top:16px;">حفظ شكل الموقع</button>
      <button class="btn small" id="resetThemeBtn" style="margin-top:16px;">رجوع للشكل الافتراضي</button>
      <div id="themeStatus" style="font-size:12px;color:var(--ink-dim);margin-top:8px;"></div>
    </div>
  `;

  function readThemeFormValues(){
    return {
      primaryColor: document.getElementById('themePrimaryColor').value,
      accentColor: document.getElementById('themeAccentColor').value,
      headingFont: document.getElementById('themeHeadingFont').value,
      bodyFont: document.getElementById('themeBodyFont').value
    };
  }
  function ensurePreviewFontLoaded(fontName){
    const id = 'theme-preview-font-' + fontName.replace(/\s+/g,'-');
    if(document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id; link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}:wght@400;700;800&display=swap`;
    document.head.appendChild(link);
  }
  function updatePreview(){
    const v = readThemeFormValues();
    ensurePreviewFontLoaded(v.headingFont);
    ensurePreviewFontLoaded(v.bodyFont);
    const box = document.getElementById('themePreviewBox');
    const heading = document.getElementById('themePreviewHeading');
    const body = document.getElementById('themePreviewBody');
    const btn = document.getElementById('themePreviewBtn');
    box.style.background = '#fff';
    heading.style.color = v.primaryColor;
    heading.style.fontFamily = `'${v.headingFont}'`;
    body.style.fontFamily = `'${v.bodyFont}'`;
    btn.style.background = v.primaryColor;
    btn.style.color = v.accentColor;
  }
  ['themePrimaryColor','themeAccentColor','themeHeadingFont','themeBodyFont'].forEach(id => {
    document.getElementById(id).addEventListener('input', updatePreview);
  });
  updatePreview();

  document.getElementById('saveThemeBtn').addEventListener('click', async (e) => {
    const v = readThemeFormValues();
    const statusEl = document.getElementById('themeStatus');
    const btnEl = e.target;
    btnEl.disabled = true; btnEl.textContent = "جاري الحفظ...";
    const result = await adminFetch('/api/settings', { key: 'theme_config', value: JSON.stringify(v) });
    btnEl.disabled = false; btnEl.textContent = "حفظ شكل الموقع";
    statusEl.textContent = (result && result.ok) ? "اتحفظ ✓ — افتح موقع العميل عشان تشوف الشكل الجديد" : "حصل خطأ، حاول تاني";
  });
  document.getElementById('resetThemeBtn').addEventListener('click', async (e) => {
    if(!confirm('متأكد عايز ترجع لشكل الموقع الافتراضي؟')) return;
    document.getElementById('themePrimaryColor').value = THEME_DEFAULTS.primaryColor;
    document.getElementById('themeAccentColor').value = THEME_DEFAULTS.accentColor;
    document.getElementById('themeHeadingFont').value = THEME_DEFAULTS.headingFont;
    document.getElementById('themeBodyFont').value = THEME_DEFAULTS.bodyFont;
    updatePreview();
    const statusEl = document.getElementById('themeStatus');
    const btnEl = e.target;
    btnEl.disabled = true; btnEl.textContent = "جاري الحفظ...";
    const result = await adminFetch('/api/settings', { key: 'theme_config', value: JSON.stringify(THEME_DEFAULTS) });
    btnEl.disabled = false; btnEl.textContent = "رجوع للشكل الافتراضي";
    statusEl.textContent = (result && result.ok) ? "رجع للشكل الافتراضي ✓" : "حصل خطأ، حاول تاني";
  });
}

/* ===================== CONTRACTS ADMIN ===================== */
const DEFAULT_CONTRACT_TEMPLATE = `عقد تقديم خدمات تسويق رقمي وإدارة حملات إعلانية

الطرف الأول (العميل): {{اسم_العميل}}
رقم التواصل: {{رقم_هاتف_العميل}}
الطرف الثاني (مقدم الخدمة): عبدالعزيز تامر — Junior Media Buyer
للتواصل: 01041249535
تاريخ الاتفاق: {{تاريخ_التوقيع}}

١. نطاق العمل
يلتزم الطرف الثاني بإعداد وتنفيذ الخطة الإعلانية الشهرية، إدارة الحملات ومتابعتها، المشاركة في إعداد المحتوى الإعلاني، تحليل النتائج وإعداد التقارير الدورية، وتقديم التوصيات والاستشارات المرتبطة بأداء الحملات.

٢. التزامات الطرف الثاني
تنفيذ الأعمال بمهنية، الحفاظ على سرية بيانات الطرف الأول، تقديم تقرير أداء دوري، إخطار الطرف الأول بأي مشكلة تقنية دون تأخير، وعدم تقديم نفس الخدمة لمنافس مباشر دون موافقة كتابية.

٣. التزامات الطرف الأول
توفير الأصول اللازمة (صور، فيديوهات، بيانات المنتجات، صلاحيات الوصول)، سداد الأتعاب والميزانية في مواعيدها، الرد على طلبات المراجعة خلال مدة معقولة.

٤. الأتعاب وطريقة السداد
نموذج التحاسب المتفق عليه: {{نموذج_التحاسب}}
القيمة/النسبة: {{قيمة_الاتفاق}}

٥. الميزانية الإعلانية
الميزانية الشهرية المبدئية: {{الميزانية_الشهرية}} جنيه مصري، قابلة للتعديل باتفاق كتابي.

٦. مدة الاتفاق والتجديد
يبدأ الاتفاق من {{تاريخ_البدء}} ولمدة {{مدة_الاتفاق}}، ويُجدَّد تلقائيًا ما لم يُخطر أحد الطرفين الآخر قبل 15 يومًا من الانتهاء.

٧. السرية وحماية البيانات
يلتزم كل طرف بسرية بيانات الطرف الآخر لمدة سنة بعد انتهاء الاتفاق.

٨. إنهاء الاتفاق
يحق لأي طرف إنهاء الاتفاق بإخطار كتابي مسبق مدته 15 يومًا.

هذا المستند نموذج تعاون بين الطرفين، ويُعد توقيع الطرفين عليه إلكترونيًا بمثابة إقرار منهما بقراءة وفهم جميع البنود والموافقة عليها.`;

async function renderContractsAdmin(){
  const inner = document.getElementById('adminInner');
  inner.innerHTML = `<div class="load-msg">جاري تحميل العملاء...</div>`;
  let clients = [];
  try{
    const r = await fetch('/api/contracts', { headers: { 'x-admin-password': adminPassword } });
    if(r.status === 401){ adminAuthed=false; adminPassword=null; renderAdminGate(); return; }
    const json = await r.json();
    clients = json.clients || [];
  }catch(err){ inner.innerHTML = `<div class="admin-empty">حصل خطأ في تحميل العملاء.</div>`; return; }

  if(clients.length === 0){ inner.innerHTML = `<div class="admin-empty">مفيش عملاء مسجلين لسه.</div>`; return; }

  const statusLabel = { null: 'لسه معملتش', ready_to_sign: 'في انتظار التوقيع', signed: 'اتوقع ✓' };
  const statusClass = { null: '', ready_to_sign: 'st-pending', signed: 'st-approved' };

  inner.innerHTML = clients.map(c => {
    const st = c.contract ? c.contract.status : null;
    return `
      <div class="brief-list-card" data-uid="${c.id}">
        <div>
          <div class="name">${c.name || 'بدون اسم'} ${st ? `<span class="status-pill ${statusClass[st]}">${statusLabel[st]}</span>` : `<span class="status-pill">لسه معملتش</span>`}</div>
          <div class="date">${c.phone||'—'} · ${c.email||'—'}</div>
        </div>
        <span style="color:var(--ink-dim);">←</span>
      </div>
    `;
  }).join('');

  inner.querySelectorAll('.brief-list-card').forEach(card => {
    card.addEventListener('click', () => {
      const client = clients.find(c => c.id === card.dataset.uid);
      renderContractEditor(client);
    });
  });
}

function fillTemplate(client){
  return DEFAULT_CONTRACT_TEMPLATE
    .replace(/{{اسم_العميل}}/g, client.name || '')
    .replace(/{{رقم_هاتف_العميل}}/g, client.phone || '')
    .replace(/{{تاريخ_التوقيع}}/g, new Date().toLocaleDateString('ar-EG'));
}

function renderContractEditor(client){
  const inner = document.getElementById('adminInner');
  const isSigned = client.contract && client.contract.status === 'signed';
  const text = client.contract ? client.contract.contract_text : fillTemplate(client);

  inner.innerHTML = `
    <button class="preview-back" id="backToContracts">→ رجوع لكل العملاء</button>
    <div class="preview-header">
      <h2>${client.name || 'بدون اسم'}</h2>
      <div class="meta"><span>📞 ${client.phone||'—'}</span><span>✉️ ${client.email||'—'}</span></div>
    </div>
    ${isSigned ? `
      <div id="printableContract" class="print-doc" style="background:#fff;border:1px solid var(--line);border-radius:10px;padding:24px;">
        <pre style="white-space:pre-wrap;font-family:'Almarai';font-size:14px;line-height:2;">${client.contract.contract_text}</pre>
        <div style="margin-top:20px;border-top:1px dashed var(--line);padding-top:16px;">
          <div style="font-family:'Cairo';font-size:12px;color:var(--ink-dim);margin-bottom:8px;">توقيع العميل — بتاريخ ${new Date(client.contract.signed_at).toLocaleString('ar-EG')}</div>
          <img src="${client.contract.signature_data_url}" style="max-width:260px;border:1px solid var(--line);border-radius:6px;">
        </div>
      </div>
      <button class="btn primary small" id="printContractBtn" style="margin-top:14px;">طباعة / تحميل PDF</button>
    ` : `
      <div class="qs-section">
        <h3 style="font-family:'Cairo';font-size:15px;color:var(--green-900);margin-bottom:12px;">${client.contract ? 'تعديل نص العقد' : 'تجهيز العقد'}</h3>
        <textarea id="contractTextArea" style="width:100%;min-height:420px;font-family:'Almarai';font-size:13px;line-height:2;padding:14px;border:1px solid var(--line);border-radius:8px;">${text}</textarea>
        <button class="btn primary small" id="activateContractBtn" style="margin-top:12px;">${client.contract ? 'حفظ التعديل' : 'تفعيل العقد للعميل'}</button>
        <p style="font-size:12px;color:var(--ink-dim);margin-top:10px;">${client.contract ? 'العقد ده ظاهر للعميل بالفعل وبينتظر توقيعه.' : 'بمجرد التفعيل، العقد هيظهر للعميل في حسابه ويقدر يوقّعه.'}</p>
      </div>
    `}
  `;

  document.getElementById('backToContracts').addEventListener('click', renderContractsAdmin);
  if(isSigned){
    document.getElementById('printContractBtn').addEventListener('click', () => window.print());
  } else {
    document.getElementById('activateContractBtn').addEventListener('click', async (e) => {
      const contractText = document.getElementById('contractTextArea').value.trim();
      if(!contractText){ alert('نص العقد مينفعش يبقى فاضي'); return; }
      const btnEl = e.target;
      btnEl.disabled = true; btnEl.textContent = "جاري الحفظ...";
      const result = await adminFetch('/api/contracts', { userId: client.id, contractText });
      btnEl.disabled = false; btnEl.textContent = client.contract ? "حفظ التعديل" : "تفعيل العقد للعميل";
      if(result && result.ok){ renderContractsAdmin(); }
      else{ alert('حصل خطأ: ' + ((result && result.error) || 'خطأ غير معروف')); }
    });
  }
}

/* ===================== QUESTION EDITOR ===================== */
let keepFormOpenFor = null; // اسم القسم اللي محتاجين نسيب فورم الإضافة فيه مفتوح بعد آخر عملية حفظ
let editingQid = null;      // السؤال اللي دلوقتي في وضع التعديل

function typeToSelectValue(q){
  if(q.type === 'chips') return q.multi ? 'chips_multi' : 'chips_single';
  return q.type;
}

function renderQuestionEditor(){
  const inner = document.getElementById('adminInner');
  inner.innerHTML = SECTIONS_META.map(meta => {
    const qs = questions.filter(q => q.sectionKey === meta.key);
    const isOpen = keepFormOpenFor === meta.key;
    return `
      <div class="qs-section" data-section="${meta.key}">
        <div class="qs-section-head">
          <div class="badge-num">${meta.num}</div>
          <h3>${meta.title}</h3>
        </div>
        ${qs.length === 0 ? '<p style="font-size:12px;color:var(--ink-dim);">مفيش أسئلة في القسم ده دلوقتي.</p>' : qs.map(q => {
          if(editingQid === q.id){
            return `
              <div class="q-row q-row-editing" data-qid="${q.id}">
                <div class="row">
                  <input type="text" class="editQLabel" value="${q.label.replace(/"/g,'&quot;')}" placeholder="نص السؤال">
                  <select class="editQType">
                    <option value="text" ${q.type==='text'?'selected':''}>إجابة قصيرة</option>
                    <option value="textarea" ${q.type==='textarea'?'selected':''}>إجابة طويلة</option>
                    <option value="chips_single" ${typeToSelectValue(q)==='chips_single'?'selected':''}>اختيارات (يختار واحد)</option>
                    <option value="chips_multi" ${typeToSelectValue(q)==='chips_multi'?'selected':''}>اختيارات (يختار أكتر من واحد)</option>
                    <option value="number" ${q.type==='number'?'selected':''}>رقم</option>
                    <option value="file" ${q.type==='file'?'selected':''}>ملف (صورة أو فيديو)</option>
                  </select>
                </div>
                <input type="text" class="editQOptions" value="${(q.options||[]).join('، ')}" placeholder="الاختيارات مفصولة بفاصلة (لو النوع اختيارات)" style="margin-bottom:10px;">
                <div class="row" style="align-items:center;">
                  <label class="req-toggle"><input type="checkbox" class="editQRequired" ${q.required?'checked':''}> إجباري</label>
                  <div style="display:flex;gap:8px;">
                    <button class="btn small cancelEditBtn">إلغاء</button>
                    <button class="btn primary small saveEditBtn" data-qid="${q.id}">حفظ التعديل</button>
                  </div>
                </div>
              </div>
            `;
          }
          return `
          <div class="q-row" data-qid="${q.id}">
            <div class="q-row-text">
              <div class="qlabel">${q.label}</div>
              <div class="qmeta">${typeLabel(q)}</div>
            </div>
            <div class="q-row-actions">
              <label class="req-toggle"><input type="checkbox" class="req-check" ${q.required?'checked':''}> إجباري</label>
              <button class="edit-btn" title="عدّل السؤال">✎</button>
              <button class="del-btn" title="مسح السؤال">✕</button>
            </div>
          </div>
        `;
        }).join('')}
        <button class="add-q-toggle" data-section="${meta.key}">+ ضيف سؤال في القسم ده</button>
        <div class="add-q-form ${isOpen?'open':''}" data-section-form="${meta.key}">
          ${isOpen ? `<div class="qadd-success">✓ اتضاف السؤال. تقدر تضيف واحد تاني على طول.</div>` : ``}
          <div class="row">
            <input type="text" class="newQLabel" placeholder="نص السؤال">
            <select class="newQType">
              <option value="text">إجابة قصيرة</option>
              <option value="textarea">إجابة طويلة</option>
              <option value="chips_single">اختيارات (يختار واحد)</option>
              <option value="chips_multi">اختيارات (يختار أكتر من واحد)</option>
              <option value="number">رقم</option>
              <option value="file">ملف (صورة أو فيديو)</option>
            </select>
          </div>
          <input type="text" class="newQOptions" placeholder="الاختيارات مفصولة بفاصلة (لو النوع اختيارات) — مثال: أيوه، لأ، مش متأكد" style="margin-bottom:10px;">
          <div class="row" style="align-items:center;">
            <label class="req-toggle"><input type="checkbox" class="newQRequired"> إجباري</label>
            <button class="btn primary small saveQBtn" data-section="${meta.key}">حفظ السؤال</button>
          </div>
        </div>
      </div>
    `;
  }).join('');
  keepFormOpenFor = null;

  inner.querySelectorAll('.req-check').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const qid = e.target.closest('.q-row').dataset.qid;
      const q = questions.find(x => x.id === qid);
      if(!q) return;
      q.required = e.target.checked;
      await adminFetch('/api/questions', { action: 'update', id: qid, required: q.required });
    });
  });
  inner.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const qid = e.target.closest('.q-row').dataset.qid;
      if(!confirm('متأكد إنك عايز تمسح السؤال ده؟')) return;
      await adminFetch('/api/questions', { action: 'delete', id: qid });
      await loadQuestions(); renderQuestionEditor();
    });
  });
  inner.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      editingQid = e.target.closest('.q-row').dataset.qid;
      renderQuestionEditor();
    });
  });
  inner.querySelectorAll('.cancelEditBtn').forEach(btn => {
    btn.addEventListener('click', () => { editingQid = null; renderQuestionEditor(); });
  });
  inner.querySelectorAll('.saveEditBtn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const qid = e.target.dataset.qid;
      const wrap = e.target.closest('.q-row-editing');
      const label = wrap.querySelector('.editQLabel').value.trim();
      const typeVal = wrap.querySelector('.editQType').value;
      const optsRaw = wrap.querySelector('.editQOptions').value.trim();
      const required = wrap.querySelector('.editQRequired').checked;
      if(!label){ alert('اكتب نص السؤال'); return; }
      let type = typeVal, multi = false, options = null;
      if(typeVal === 'chips_single' || typeVal === 'chips_multi'){
        type = 'chips'; multi = (typeVal === 'chips_multi');
        options = optsRaw.split('،').join(',').split(',').map(s=>s.trim()).filter(Boolean);
        if(options.length < 2){ alert('محتاج تكتب اختيارين على الأقل مفصولين بفاصلة'); return; }
      }
      const btnEl = e.target;
      btnEl.disabled = true; btnEl.textContent = "جاري الحفظ...";
      const result = await adminFetch('/api/questions', { action: 'update', id: qid, label, type, multi, options, required });
      if(result && result.ok){
        editingQid = null;
        await loadQuestions();
        renderQuestionEditor();
      } else {
        btnEl.disabled = false; btnEl.textContent = "حفظ التعديل";
        alert('حصل خطأ أثناء الحفظ: ' + ((result && result.error) || 'خطأ غير معروف'));
      }
    });
  });
  inner.querySelectorAll('.add-q-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const sec = e.target.dataset.section;
      const form = inner.querySelector(`.add-q-form[data-section-form="${sec}"]`);
      form.classList.toggle('open');
    });
  });
  inner.querySelectorAll('.saveQBtn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const sec = e.target.dataset.section;
      const wrap = e.target.closest('.qs-section');
      const label = wrap.querySelector('.newQLabel').value.trim();
      const typeVal = wrap.querySelector('.newQType').value;
      const optsRaw = wrap.querySelector('.newQOptions').value.trim();
      const required = wrap.querySelector('.newQRequired').checked;
      if(!label){ alert('اكتب نص السؤال الأول'); return; }
      let type = typeVal, multi = false, options = null;
      if(typeVal === 'chips_single' || typeVal === 'chips_multi'){
        type = 'chips'; multi = (typeVal === 'chips_multi');
        options = optsRaw.split('،').join(',').split(',').map(s=>s.trim()).filter(Boolean);
        if(options.length < 2){ alert('محتاج تكتب اختيارين على الأقل مفصولين بفاصلة'); return; }
      } else if(typeVal === 'file'){
        type = 'file'; multi = false; options = null;
      }
      const btnEl = e.target;
      btnEl.disabled = true; btnEl.textContent = "جاري الحفظ...";
      const result = await adminFetch('/api/questions', { action: 'add', sectionKey: sec, label, type, multi, options, required });
      btnEl.disabled = false; btnEl.textContent = "حفظ السؤال";
      if(result && result.ok){
        keepFormOpenFor = sec;
        await loadQuestions();
        renderQuestionEditor();
      } else {
        alert('حصل خطأ أثناء حفظ السؤال: ' + ((result && result.error) || 'خطأ غير معروف، جرب تاني.'));
      }
    });
  });
}
function typeLabel(q){
  if(q.type === 'textarea') return 'إجابة طويلة';
  if(q.type === 'number') return 'رقم';
  if(q.type === 'file') return 'ملف (صورة/فيديو)';
  if(q.type === 'chips') return q.multi ? 'اختيارات (متعدد)' : 'اختيارات (واحد)';
  return 'إجابة قصيرة';
}

/* helper: authenticated POST to admin API */
async function adminFetch(url, body){
  try{
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-password': adminPassword },
      body: JSON.stringify(body)
    });
    if(res.status === 401){ adminAuthed = false; adminPassword = null; renderAdminGate(); return null; }
    return await res.json();
  }catch(err){ console.error('admin fetch error', err); return null; }
}

/* ===================== BRIEF REQUESTS (طلبات "بريف جديد") ===================== */
async function renderBriefRequests(){
  const inner = document.getElementById('adminInner');
  inner.innerHTML = `<div class="load-msg">جاري تحميل الطلبات...</div>`;
  let res;
  try{
    const r = await fetch('/api/requests', { headers: { 'x-admin-password': adminPassword } });
    if(r.status === 401){ adminAuthed = false; adminPassword = null; renderAdminGate(); return; }
    res = await r.json();
  }catch(err){ inner.innerHTML = `<div class="admin-empty">حصل خطأ في تحميل الطلبات.</div>`; return; }

  const requests = res.requests || [];
  if(requests.length === 0){ inner.innerHTML = `<div class="admin-empty">مفيش طلبات "بريف جديد" لحد دلوقتي.</div>`; return; }

  const statusLabel = { pending: 'قيد المراجعة', approved: 'تمت الموافقة', denied: 'مرفوض' };
  const statusClass = { pending: 'st-pending', approved: 'st-approved', denied: 'st-denied' };

  inner.innerHTML = requests.map(req => `
    <div class="brief-list-card" style="cursor:default;" data-id="${req.id}">
      <div>
        <div class="name">${req.client.name || 'بدون اسم'} <span class="status-pill ${statusClass[req.status]}">${statusLabel[req.status]}</span></div>
        <div class="date">${req.client.phone||''}${req.client.phone?' · ':''}${req.client.email||''} · ${new Date(req.created_at).toLocaleString('ar-EG')}</div>
      </div>
      ${req.status === 'pending' ? `
        <div style="display:flex;gap:8px;">
          <button class="btn small approveBtn" data-id="${req.id}">موافقة</button>
          <button class="btn small danger denyBtn" data-id="${req.id}">رفض</button>
        </div>
      ` : ``}
    </div>
  `).join('');

  inner.querySelectorAll('.approveBtn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      await adminFetch('/api/requests', { id: e.target.dataset.id, status: 'approved' });
      renderBriefRequests();
    });
  });
  inner.querySelectorAll('.denyBtn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      await adminFetch('/api/requests', { id: e.target.dataset.id, status: 'denied' });
      renderBriefRequests();
    });
  });
}

/* ===================== ADMINS MANAGER (الحسابات) ===================== */
let currentSitePhoto = null;
let currentMetaPixelId = '';

async function loadCurrentSitePhoto(){
  const { data } = await supabaseClient.from('site_settings').select('value').eq('key','about_photo_url').maybeSingle();
  currentSitePhoto = (data && data.value) || 'assets-preview-fallback';
}
async function loadCurrentMetaPixelId(){
  const { data } = await supabaseClient.from('site_settings').select('value').eq('key','meta_pixel_id').maybeSingle();
  currentMetaPixelId = (data && data.value) || '';
}

async function renderAdminsManager(){
  const inner = document.getElementById('adminInner');
  inner.innerHTML = `<div class="load-msg">جاري تحميل الحسابات...</div>`;
  let admins = [];
  await loadCurrentSitePhoto();
  await loadCurrentMetaPixelId();
  try{
    const r = await fetch('/api/admins', { headers: { 'x-admin-password': adminPassword } });
    if(r.status === 401){ adminAuthed=false; adminPassword=null; renderAdminGate(); return; }
    const json = await r.json();
    admins = json.admins || [];
  }catch(err){ inner.innerHTML = `<div class="admin-empty">حصل خطأ في تحميل الحسابات.</div>`; return; }

  inner.innerHTML = `
    <div class="qs-section">
      <h3 style="font-family:'Cairo';font-size:15px;color:var(--green-900);margin-bottom:14px;">حسابي — الصورة الظاهرة للعميل</h3>
      <div style="display:flex;align-items:center;gap:18px;">
        <img id="mySitePhoto" src="${currentSitePhoto === 'assets-preview-fallback' ? '' : currentSitePhoto}" style="width:90px;height:90px;border-radius:50%;object-fit:cover;background:#eee;border:2px solid var(--gold);">
        <div>
          <input type="file" id="sitePhotoInput" accept="image/*" style="display:none;">
          <button class="btn small" id="changeSitePhotoBtn">تغيير الصورة</button>
          <div id="sitePhotoStatus" style="font-size:12px;color:var(--ink-dim);margin-top:6px;"></div>
        </div>
      </div>
    </div>

    <div class="qs-section">
      <h3 style="font-family:'Cairo';font-size:15px;color:var(--green-900);margin-bottom:8px;">ربط الموقع بـ Meta Pixel (فيسبوك/إنستجرام)</h3>
      <p style="font-size:12px;color:var(--ink-dim);margin-bottom:12px;">حط رقم الـ Pixel ID بتاعك من Meta Events Manager، وهيتظهّر أوتوماتيك في موقع العميل عشان تقدر تعمل إعلانات وتتابع الزيارات والبريفات اللي بتوصل.</p>
      <div class="row">
        <input type="text" id="metaPixelInput" placeholder="مثال: 1234567890123456" value="${currentMetaPixelId}">
      </div>
      <button class="btn primary small" id="saveMetaPixelBtn" style="margin-top:10px;">حفظ</button>
      <div id="metaPixelStatus" style="font-size:12px;color:var(--ink-dim);margin-top:6px;"></div>
    </div>

    <p style="font-size:12px;color:var(--ink-dim);margin:20px 0 16px;">"الأدمن الرئيسي" باسوردته متسجلة في Vercel وعنده كل الصلاحيات دايمًا. من هنا تقدر تضيف مشرفين تانيين وتحدد كل واحد يشوف ويتحكم في إيه بالظبط.</p>
    <div class="qs-section">
      <h3 style="font-family:'Cairo';font-size:15px;color:var(--green-900);margin-bottom:14px;">إضافة مشرف جديد</h3>
      <div class="row">
        <input type="text" id="newAdminName" placeholder="اسم المشرف">
        <input type="text" id="newAdminPass" placeholder="الباسورد (6 أحرف على الأقل)">
      </div>
      <div style="margin:14px 0;">
        <div style="font-family:'Cairo';font-size:12px;color:var(--ink-dim);margin-bottom:8px;">الصلاحيات:</div>
        <div class="chip-group">
          ${Object.entries(PERMISSION_LABELS).map(([key,label]) => `
            <label class="perm-chip"><input type="checkbox" class="newAdminPerm" value="${key}"> ${label}</label>
          `).join('')}
        </div>
      </div>
      <button class="btn primary small" id="addAdminBtn">إضافة</button>
    </div>

    ${admins.length === 0 ? `<div class="admin-empty">مفيش مشرفين إضافيين لسه.</div>` : admins.map(a => `
      <div class="qs-section" data-id="${a.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div class="qlabel">${a.name}</div>
            <div class="qmeta">اتضاف: ${new Date(a.created_at).toLocaleDateString('ar-EG')}</div>
          </div>
          <button class="del-btn delAdminBtn" data-id="${a.id}" title="مسح المشرف">✕</button>
        </div>
        <div style="margin:12px 0;">
          <div style="font-family:'Cairo';font-size:12px;color:var(--ink-dim);margin-bottom:8px;">الصلاحيات:</div>
          <div class="chip-group">
            ${Object.entries(PERMISSION_LABELS).map(([key,label]) => `
              <label class="perm-chip"><input type="checkbox" class="editPerm" value="${key}" ${((a.permissions||[]).includes(key))?'checked':''}> ${label}</label>
            `).join('')}
          </div>
          <button class="btn small savePermsBtn" data-id="${a.id}" style="margin-top:10px;">حفظ الصلاحيات</button>
        </div>
        <div class="row" style="align-items:center;border-top:1px dashed var(--line);padding-top:12px;">
          <input type="text" class="newPassField" placeholder="باسورد جديد (6 أحرف على الأقل)">
          <button class="btn small resetPassBtn" data-id="${a.id}">تصفير الباسورد</button>
        </div>
      </div>
    `).join('')}
  `;

  document.getElementById('changeSitePhotoBtn').addEventListener('click', () => document.getElementById('sitePhotoInput').click());
  document.getElementById('sitePhotoInput').addEventListener('change', handleSitePhotoUpload);

  document.getElementById('saveMetaPixelBtn').addEventListener('click', async (e) => {
    const val = document.getElementById('metaPixelInput').value.trim();
    const statusEl = document.getElementById('metaPixelStatus');
    const btnEl = e.target;
    btnEl.disabled = true; btnEl.textContent = "جاري الحفظ...";
    const result = await adminFetch('/api/settings', { key: 'meta_pixel_id', value: val });
    btnEl.disabled = false; btnEl.textContent = "حفظ";
    if(result && result.ok){ statusEl.textContent = val ? "تم الربط ✓ — هيظهر في موقع العميل من غير ما تعمل حاجة تانية" : "تم مسح الـ Pixel ID"; }
    else{ statusEl.textContent = "حصل خطأ، حاول تاني"; }
  });

  document.getElementById('addAdminBtn').addEventListener('click', async (e) => {
    const name = document.getElementById('newAdminName').value.trim();
    const password = document.getElementById('newAdminPass').value;
    const permissions = Array.from(document.querySelectorAll('.newAdminPerm:checked')).map(cb => cb.value);
    if(!name || !password){ alert('اكتب الاسم والباسورد'); return; }
    const btnEl = e.target;
    btnEl.disabled = true; btnEl.textContent = "جاري الإضافة...";
    const result = await adminFetch('/api/admins', { action: 'add', name, password, permissions });
    btnEl.disabled = false; btnEl.textContent = "إضافة";
    if(result && result.ok){ renderAdminsManager(); }
    else{ alert('حصل خطأ: ' + ((result && result.error) || 'خطأ غير معروف')); }
  });
  inner.querySelectorAll('.delAdminBtn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if(!confirm('متأكد إنك عايز تمسح المشرف ده؟')) return;
      await adminFetch('/api/admins', { action: 'delete', id: e.target.dataset.id });
      renderAdminsManager();
    });
  });
  inner.querySelectorAll('.savePermsBtn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const wrap = e.target.closest('.qs-section');
      const id = e.target.dataset.id;
      const permissions = Array.from(wrap.querySelectorAll('.editPerm:checked')).map(cb => cb.value);
      const btnEl = e.target;
      btnEl.disabled = true; btnEl.textContent = "جاري الحفظ...";
      const result = await adminFetch('/api/admins', { action: 'update-permissions', id, permissions });
      btnEl.disabled = false; btnEl.textContent = "حفظ الصلاحيات";
      if(!(result && result.ok)) alert('حصل خطأ أثناء الحفظ');
    });
  });
  inner.querySelectorAll('.resetPassBtn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const wrap = e.target.closest('.qs-section');
      const id = e.target.dataset.id;
      const newPassword = wrap.querySelector('.newPassField').value;
      if(!newPassword || newPassword.length < 6){ alert('اكتب باسورد جديد 6 أحرف على الأقل'); return; }
      const btnEl = e.target;
      btnEl.disabled = true; btnEl.textContent = "جاري الحفظ...";
      const result = await adminFetch('/api/admins', { action: 'reset-password', id, newPassword });
      btnEl.disabled = false; btnEl.textContent = "تصفير الباسورد";
      if(result && result.ok){ wrap.querySelector('.newPassField').value = ''; alert('اتغيّر الباسورد بنجاح'); }
      else{ alert('حصل خطأ أثناء الحفظ'); }
    });
  });
}

async function handleSitePhotoUpload(e){
  const file = e.target.files[0];
  if(!file) return;
  const statusEl = document.getElementById('sitePhotoStatus');
  statusEl.textContent = "جاري الرفع...";
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const reader = new FileReader();
  reader.onload = async () => {
    const base64 = reader.result.split(',')[1];
    const result = await adminFetch('/api/site-photo', { key: 'about_photo_url', imageBase64: base64, fileExt: ext });
    if(result && result.ok){
      document.getElementById('mySitePhoto').src = result.url;
      statusEl.textContent = "تم تحديث الصورة ✓";
    } else {
      statusEl.textContent = "حصل خطأ في الرفع، حاول تاني";
    }
  };
  reader.readAsDataURL(file);
}

/* ===================== COMMERCIAL OPTIONS EDITOR ===================== */
function renderCommercialEditor(){
  const inner = document.getElementById('adminInner');
  if(commercialOptions.length === 0){
    inner.innerHTML = `<div class="admin-empty">مفيش خيارات تحاسب متسجلة. تأكد إنك شغّلت آخر تحديث لملف الـ SQL.</div>`;
    return;
  }
  inner.innerHTML = `
    <p style="font-size:12px;color:var(--ink-dim);margin-bottom:16px;">دول الكارتين اللي بيشوفهم العميل في قسم "نتحاسب إزاي؟" آخر البريف. أي تعديل هنا بينعكس على موقع العميل فورًا.</p>
    ${commercialOptions.map(o => `
      <div class="qs-section" data-opt-id="${o.id}">
        <input type="text" class="optTag" value="${o.tag}" style="font-family:'Cairo';font-weight:700;color:var(--gold);border:none;background:none;margin-bottom:10px;padding:0;">
        <div class="field" style="padding-right:0;"><label>العنوان</label><input type="text" class="optTitle" value="${o.title.replace(/"/g,'&quot;')}"></div>
        <div class="field" style="padding-right:0;"><label>الوصف</label><textarea class="optBody">${o.body}</textarea></div>
        <div class="field" style="padding-right:0;"><label>الأنسب لـ</label><input type="text" class="optFit" value="${o.fit.replace(/"/g,'&quot;')}"></div>
        <button class="btn primary small saveOptBtn" data-id="${o.id}" style="margin-top:8px;">حفظ التعديل</button>
      </div>
    `).join('')}
  `;
  inner.querySelectorAll('.saveOptBtn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const wrap = e.target.closest('.qs-section');
      const id = e.target.dataset.id;
      const tag = wrap.querySelector('.optTag').value.trim();
      const title = wrap.querySelector('.optTitle').value.trim();
      const body = wrap.querySelector('.optBody').value.trim();
      const fit = wrap.querySelector('.optFit').value.trim();
      const btnEl = e.target;
      btnEl.disabled = true; btnEl.textContent = "جاري الحفظ...";
      const result = await adminFetch('/api/commercial', { id, tag, title, body, fit });
      btnEl.disabled = false; btnEl.textContent = "حفظ التعديل";
      if(result && result.ok){ await loadCommercialOptions(); renderCommercialEditor(); }
      else { alert('حصل خطأ أثناء الحفظ'); }
    });
  });
}

/* ===================== RESPONSES ===================== */
async function renderResponsesList(){
  const inner = document.getElementById('adminInner');
  inner.innerHTML = `<div class="load-msg">جاري تحميل الردود...</div>`;

  let records = [];
  try{
    const res = await fetch('/api/responses', { headers: { 'x-admin-password': adminPassword } });
    if(res.status === 401){ adminAuthed = false; adminPassword = null; renderAdminGate(); return; }
    const json = await res.json();
    records = json.responses || [];
  }catch(err){
    inner.innerHTML = `<div class="admin-empty">حصل خطأ في تحميل الردود.</div>`;
    return;
  }

  if(records.length === 0){
    inner.innerHTML = `<div class="admin-empty">مفيش بريفات اتبعتت لسه. لما العميل يضغط "إرسال"، هيظهر هنا فورًا.</div>`;
    return;
  }

  const unreadCount = records.filter(r => !r.read_at).length;

  inner.innerHTML = `
    <div style="font-family:'Cairo';font-size:13px;color:var(--ink-dim);margin-bottom:14px;">${records.length} رد${unreadCount>0?` · ${unreadCount} جديد`:''}</div>
    ${records.map(rec => {
      const a = rec.answers;
      const c = rec.client || {};
      const dateStr = new Date(rec.submitted_at).toLocaleString('ar-EG');
      const isNew = !rec.read_at;
      return `
        <div class="brief-list-card" data-ref="${rec.ref}">
          <div style="display:flex;align-items:center;gap:12px;">
            ${c.avatar ? `<img src="${c.avatar}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;">` : ''}
            <div>
              <div class="name">${isNew?'<span class="new-tag">جديد</span>':''}${c.name || 'بدون اسم'} ${a.brandName?'· '+a.brandName:''}</div>
              <div class="date">${c.phone||''}${c.phone?' · ':''}${c.email||''}${c.email?' · ':''}${rec.ref} · ${dateStr}</div>
            </div>
          </div>
          <span style="color:var(--ink-dim);">←</span>
        </div>
      `;
    }).join('')}
  `;
  inner.querySelectorAll('.brief-list-card').forEach(card => {
    card.addEventListener('click', async () => {
      const ref = card.dataset.ref;
      const rec = records.find(r => r.ref === ref);
      if(!rec.read_at){ await adminFetch('/api/responses', { ref }); rec.read_at = new Date().toISOString(); }
      renderResponsePreview(rec);
    });
  });
}

function renderResponsePreview(rec){
  const inner = document.getElementById('adminInner');
  const a = rec.answers;
  const c = rec.client || {};
  const dateStr = new Date(rec.submitted_at).toLocaleString('ar-EG');

  const sectionsHtml = SECTIONS_META.map(meta => {
    const qs = questions.filter(q => q.sectionKey === meta.key);
    if(qs.length === 0) return '';
    return `
      <div class="preview-section">
        <div class="preview-section-head">
          <div class="badge-num" style="min-width:32px;height:32px;font-size:12px;">${meta.num}</div>
          <h3>${meta.title}</h3>
        </div>
        ${qs.map(q => {
          let v = a[q.id];
          if(Array.isArray(v)) v = v.join('، ');
          const empty = !v;
          let content;
          if(empty){ content = 'من غير إجابة'; }
          else if(q.type === 'file'){
            const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(v);
            content = isVideo
              ? `🎬 <a href="${v}" target="_blank">عرض الفيديو</a>`
              : `<a href="${v}" target="_blank"><img src="${v}" style="max-width:220px;max-height:180px;border-radius:8px;margin-top:4px;display:block;"></a>`;
          } else { content = v; }
          return `<div class="preview-q"><div class="ql">${q.label}</div><div class="qa ${empty?'empty':''}">${content}</div></div>`;
        }).join('')}
      </div>
    `;
  }).join('');

  inner.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
      <button class="preview-back" id="backToList" style="margin-bottom:0;">→ رجوع لكل الردود</button>
      <button class="btn primary small" id="printBriefBtn">طباعة / تحميل PDF</button>
    </div>
    <div id="printableBrief">
      <div class="preview-header" style="display:flex;align-items:center;gap:16px;">
        ${c.avatar ? `<img src="${c.avatar}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid var(--gold);flex-shrink:0;">` : ''}
        <div>
          <h2 style="margin:0 0 6px;">${c.name || 'بدون اسم'} ${a.brandName ? '— '+a.brandName : ''}</h2>
          <div class="meta">
            <span>📞 ${c.phone || '—'}</span>
            <span>✉️ ${c.email || '—'}</span>
            <span>🏷 ${rec.ref}</span>
            <span>🕐 ${dateStr}</span>
            ${a.industry ? `<span>${a.industry}</span>` : ''}
          </div>
        </div>
      </div>
      ${sectionsHtml}
    </div>
  `;
  document.getElementById('backToList').addEventListener('click', renderResponsesList);
  document.getElementById('printBriefBtn').addEventListener('click', () => window.print());
}

/* ===================== INIT ===================== */
renderAdminGate();
