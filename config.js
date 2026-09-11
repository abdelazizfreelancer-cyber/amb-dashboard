// القيم دي "عامة" وآمنة إنها تكون في الكود (Supabase مصمم كده)،
// الحماية الحقيقية بتحصل من خلال RLS policies + الـ Service Role Key
// اللي متسجلش هنا خالص ومحفوظة كـ Environment Variable على Vercel بس.

window.APP_CONFIG = {
  SUPABASE_URL: "https://ikzejyosymihahfliesl.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlremVqeW9zeW1paGFoZmxpZXNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NTM0MTYsImV4cCI6MjEwMzQyOTQxNn0.VDqVUJJK2dKZVH8eHMX738eUlaTCUvng_V-3DVmpy7o",
  GOOGLE_SHEET_VIEW_URL: "https://docs.google.com/spreadsheets/d/12tIuEMwi5acSKR1EAbb5lNQCcfVkSa6AAZeYckVZc3Y/edit"
};
