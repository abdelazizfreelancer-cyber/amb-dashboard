import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

export function supabaseAdmin() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// permission: null (بس تحقق من تسجيل الدخول) أو واحد من:
// 'questions' | 'responses' | 'requests' | 'commercial' | 'admins'
export async function checkAdmin(req, res, permission = null) {
  const pass = req.headers['x-admin-password'];
  if (!pass) { res.status(401).json({ error: 'غير مصرح' }); return false; }

  // الأدمن الرئيسي (باسورد Vercel) عنده كل الصلاحيات دايمًا
  if (pass === process.env.ADMIN_PASSWORD) return true;

  const supabase = supabaseAdmin();
  const { data } = await supabase.from('dashboard_admins').select('password_hash, permissions');
  const match = (data || []).find(row => bcrypt.compareSync(pass, row.password_hash));

  if (!match) { res.status(401).json({ error: 'غير مصرح' }); return false; }

  if (permission && !(match.permissions || []).includes(permission)) {
    res.status(403).json({ error: 'مفيش عندك صلاحية تعمل الإجراء ده' });
    return false;
  }
  return true;
}
