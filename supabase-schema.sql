-- ==========================================================
-- لو أول مرة تعمل القاعدة: شغّل الكود ده كامل.
-- لو عندك قاعدة شغالة بالفعل من قبل: شغّل بس القسم اللي في الآخر
-- (PART 2 — MIGRATION) عشان تضيف عليها من غير ما تفقد بياناتك.
-- ==========================================================

-- ============ PART 1 — من الصفر ============

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  section_key text not null,
  label text not null,
  type text not null,
  multi boolean default false,
  options jsonb,
  required boolean default false,
  created_at timestamptz default now()
);

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  ref text unique not null,
  user_id uuid references auth.users(id),   -- مين اللي بعت البريف ده (لازم يكون مسجل دخول)
  submitted_at timestamptz not null default now(),
  answers jsonb not null,
  read_at timestamptz
);

alter table questions enable row level security;
alter table responses enable row level security;

drop policy if exists "public can read questions" on questions;
create policy "public can read questions"
  on questions for select
  using (true);

-- بدل السماح لأي حد يبعت رد (زي قبل كده)، دلوقتي بس المستخدم
-- المسجل دخول يقدر يبعت رد باسمه هو بس
drop policy if exists "authenticated users insert own responses" on responses;
create policy "authenticated users insert own responses"
  on responses for insert
  to authenticated
  with check (auth.uid() = user_id);

-- ============ PART 2 — MIGRATION (لو القاعدة موجودة بالفعل) ============
-- شغّل السطور دي بس لو الجدولين already موجودين من قبل:

-- alter table responses add column if not exists user_id uuid references auth.users(id);
-- drop policy if exists "public can insert responses" on responses;
-- create policy "authenticated users insert own responses"
--   on responses for insert
--   to authenticated
--   with check (auth.uid() = user_id);

-- ============ PART 3 — رفع الملفات (صور/فيديوهات في الأسئلة + الصورة الشخصية) ============
-- شغّل الكود ده مرة واحدة (سواء أول مرة أو تعديل لاحق)

insert into storage.buckets (id, name, public)
values ('brief-uploads', 'brief-uploads', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- أي مستخدم مسجل دخول يقدر يرفع ملف في مجلد خاص باسمه هو بس (باسم الـ user_id)
drop policy if exists "users upload own brief files" on storage.objects;
create policy "users upload own brief files"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'brief-uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "users update own avatar" on storage.objects;
create policy "users update own avatar"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- الباكتين عامين للقراءة (public) عشان الصور/الفيديوهات تتفتح بلينك مباشر في الداش بورد وصفحة الحساب
drop policy if exists "public read brief files" on storage.objects;
create policy "public read brief files"
  on storage.objects for select
  using (bucket_id = 'brief-uploads');

drop policy if exists "public read avatars" on storage.objects;
create policy "public read avatars"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- ============ PART 4 — العميل يقدر يشوف بريفه هو بس (لصفحة "البريف" في حسابه) ============
drop policy if exists "users read own responses" on responses;
create policy "users read own responses"
  on responses for select
  to authenticated
  using (auth.uid() = user_id);

-- ============ PART 5 — طلبات "بريف جديد" (بعد ما العميل يبعت أول بريف، مينفعش يبعت تاني غير بموافقتك) ============
create table if not exists brief_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  status text not null default 'pending', -- pending | approved | denied
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table brief_requests enable row level security;

drop policy if exists "users insert own brief request" on brief_requests;
create policy "users insert own brief request"
  on brief_requests for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "users read own brief requests" on brief_requests;
create policy "users read own brief requests"
  on brief_requests for select
  to authenticated
  using (auth.uid() = user_id);

-- ============ PART 6 — خيارات "نتحاسب إزاي؟" (قابلة للتعديل من الداش بورد) ============
create table if not exists commercial_options (
  id uuid primary key default gen_random_uuid(),
  tag text not null,
  title text not null,
  body text not null,
  fit text not null,
  sort_order int not null default 0
);
alter table commercial_options enable row level security;

drop policy if exists "public read commercial options" on commercial_options;
create policy "public read commercial options"
  on commercial_options for select
  using (true);

insert into commercial_options (tag, title, body, fit, sort_order)
select * from (values
  ('OPTION A', 'نسبة من المبيعات (Performance)', 'نسبة من المبيعات الفعلية اللي بتيجي من الحملات، وغالبًا بتتحدد بحد أدنى شهري بسيط بالإضافة للنسبة.', 'لو عندكم تتبع مبيعات دقيق وواضح (بيكسل شغال، أونلاين بشكل أساسي).', 1),
  ('OPTION B', 'مبلغ ثابت + نسبة من المبيعات (مختلط)', 'أتعاب شهرية أساسية ثابتة، بالإضافة لنسبة من 10% إلى 20% من المبيعات الفعلية اللي بتيجي من الحملات.', 'توازن بين استقرار الطرفين والتحفيز على تحقيق نتيجة فعلية — الأكتر شيوعًا.', 2)
) as v(tag,title,body,fit,sort_order)
where not exists (select 1 from commercial_options);

-- ============ PART 7 — إصلاح أي حساب "معلّق" بسبب تأكيد الإيميل ============
-- شغّل السطر ده لو حد قالك "الباسورد غلط" مع إنه متأكد منه صح
-- استبدل الإيميل بإيميل الحساب اللي عنده مشكلة
-- update auth.users set email_confirmed_at = now() where email = 'ضع الإيميل هنا';

-- عشان تشوف كل الحسابات المعلّقة (لسه معملتش تأكيد) دفعة واحدة:
-- select email, created_at, email_confirmed_at from auth.users where email_confirmed_at is null;

-- ============ PART 8 — مشرفين إضافيين على الداش بورد (بصلاحيات مخصصة لكل واحد) ============
create table if not exists dashboard_admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  password_hash text not null,
  permissions jsonb not null default '[]'::jsonb, -- مثال: ["questions","responses","requests","commercial","admins"]
  created_at timestamptz not null default now()
);
alter table dashboard_admins add column if not exists permissions jsonb not null default '[]'::jsonb;
alter table dashboard_admins enable row level security;
-- مفيش أي policy عامة هنا عن قصد — الوصول للجدول ده بس من خلال الـ API بصلاحيات service role

-- ============ PART 9 — إعدادات الموقع العامة (زي صورتك الشخصية في صفحة "عن نفسي") ============
create table if not exists site_settings (
  key text primary key,
  value text
);
alter table site_settings enable row level security;

drop policy if exists "public read site settings" on site_settings;
create policy "public read site settings"
  on site_settings for select
  using (true);
-- مفيش policy للكتابة — التعديل بس من خلال الـ API بصلاحيات service role

insert into storage.buckets (id, name, public)
values ('site-assets', 'site-assets', true)
on conflict (id) do nothing;
-- مفيش policies إضافية على الباكت ده — الرفع بس من خلال الـ API بصلاحيات service role،
-- والقراءة عامة تلقائيًا لأن الباكت public

-- ============ PART 10 — مواعيد الميتينج ============
create table if not exists meeting_slots (
  id uuid primary key default gen_random_uuid(),
  start_time timestamptz not null,
  created_at timestamptz not null default now()
);
create table if not exists meeting_links (
  slot_id uuid primary key references meeting_slots(id) on delete cascade,
  link text not null
);
create table if not exists meeting_bookings (
  id uuid primary key default gen_random_uuid(),
  slot_id uuid not null unique references meeting_slots(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  booked_at timestamptz not null default now()
);

-- منع نفس العميل من حجز أكتر من معاد واحد في نفس الوقت
-- (لو الجدول اتعمل قبل الإضافة دي، الكود ده بيضيف القيد بأمان من غير ما يكسر حاجة)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'meeting_bookings_user_id_key'
  ) then
    alter table meeting_bookings add constraint meeting_bookings_user_id_key unique (user_id);
  end if;
end $$;


alter table meeting_slots enable row level security;
alter table meeting_links enable row level security;
alter table meeting_bookings enable row level security;

drop policy if exists "public read meeting slots" on meeting_slots;
create policy "public read meeting slots"
  on meeting_slots for select
  using (true);

drop policy if exists "public read meeting bookings" on meeting_bookings;
create policy "public read meeting bookings"
  on meeting_bookings for select
  using (true);

drop policy if exists "authenticated users book own slot" on meeting_bookings;
create policy "authenticated users book own slot"
  on meeting_bookings for insert
  to authenticated
  with check (auth.uid() = user_id);

-- رابط الميتينج نفسه ميظهرش غير للعميل اللي حاجز، وبس قبل الميعاد بـ10 دقايق أو بعده
drop policy if exists "client reads own link near meeting time" on meeting_links;
create policy "client reads own link near meeting time"
  on meeting_links for select
  to authenticated
  using (
    exists (
      select 1 from meeting_bookings b
      join meeting_slots s on s.id = b.slot_id
      where b.slot_id = meeting_links.slot_id
        and b.user_id = auth.uid()
        and s.start_time <= now() + interval '10 minutes'
    )
  );

-- ============ PART 11 — العقد الإلكتروني ============
create table if not exists contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id),
  status text not null default 'ready_to_sign', -- ready_to_sign | signed
  contract_text text not null,
  signature_data_url text,
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table contracts enable row level security;

drop policy if exists "client reads own contract" on contracts;
create policy "client reads own contract"
  on contracts for select
  to authenticated
  using (auth.uid() = user_id);
-- الكتابة (تفعيل العقد) بس من الداش بورد بصلاحيات service role
-- التوقيع نفسه بيتم من خلال دالة سيرفر خاصة في موقع العميل (مش مباشر من المتصفح)
