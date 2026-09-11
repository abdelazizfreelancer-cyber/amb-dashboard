// القيم دي "عامة" وآمنة إنها تكون في الكود (Supabase مصمم كده)،
// الحماية الحقيقية بتحصل من خلال RLS policies + الـ Service Role Key
// اللي متسجلش هنا خالص ومحفوظة كـ Environment Variable على Vercel بس.

window.APP_CONFIG = {
  SUPABASE_URL: "https://obysvsjesvljbtnupedi.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieXN2c2plc3ZsamJ0bnVwZWRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NDAzNzMsImV4cCI6MjEwMzIxNjM3M30.ptA4ooLpkqZW0825CsQ8UL4ZZqPrhfjE5mhWlo8U7Gk",
  GOOGLE_SHEET_VIEW_URL: "https://docs.google.com/spreadsheets/d/12tIuEMwi5acSKR1EAbb5lNQCcfVkSa6AAZeYckVZc3Y/edit"
};
