// Feature: manage admins - grant / revoke panel access by email. admin only.
// Backed by admin_list_admins / admin_grant_admin / admin_revoke_admin
// (migration 20261025b). The target must already have an auth account; this
// grants the admin ROLE only, it does not create the login.
import { el, card, field, input, select, button, table, pill, spinnerScreen, toast } from '../ui.js';
import { listAdmins, grantAdmin, revokeAdmin } from '../api.js';

export const meta = { id: 'admins', label: 'الأدمن', icon: 'shield', minRole: 'admin' };

const ROLE_AR = { admin: 'مدير', editor: 'محرر', viewer: 'مشاهد' };
const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (s) => { if (!s) return '-'; const d = new Date(s); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

export function render() {
  const listWrap = el('div', {}, spinnerScreen('جاري التحميل'));

  // -- grant form --
  const emailInput = input({ type: 'email', placeholder: 'name@example.com', autocomplete: 'off' });
  const roleSel = select([
    { value: 'admin',  label: 'مدير (كل الصلاحيات)' },
    { value: 'editor', label: 'محرر' },
    { value: 'viewer', label: 'مشاهد (قراءة فقط)' },
  ], 'admin');
  const addBtn = button('منح الصلاحية', { block: true });

  async function reload() {
    listWrap.replaceChildren(spinnerScreen('جاري التحميل'));
    try {
      const rows = await listAdmins();
      listWrap.replaceChildren(rows.length ? table(cols, rows) : el('div', { class: 'empty' }, 'لا يوجد مدراء.'));
    } catch (e) {
      listWrap.replaceChildren(el('div', { class: 'empty' },
        e?.message === 'FORBIDDEN' ? 'هذه الصفحة للمدراء فقط' : 'تعذر التحميل'));
    }
  }

  const delBtn = (r) => button('إزالة', { variant: 'danger', onClick: async () => {
    if (!confirm(`إزالة صلاحية ${r.email}؟`)) return;
    try { await revokeAdmin(r.user_id); toast('تمت الإزالة'); reload(); }
    catch (e) {
      const m = e?.message || '';
      toast(m.includes('CANNOT_REMOVE_SELF') ? 'لا يمكنك إزالة نفسك'
        : m.includes('CANNOT_REMOVE_LAST_ADMIN') ? 'لا يمكن إزالة آخر مدير'
        : m === 'FORBIDDEN' ? 'ليست لديك صلاحية' : 'تعذرت الإزالة', 'err');
    }
  } });

  const cols = [
    { label: 'الإيميل', render: (r) => el('span', { class: 'mono' }, r.email || '-') },
    { label: 'الاسم',   render: (r) => r.name || '-' },
    { label: 'الدور',   render: (r) => pill(ROLE_AR[r.role] || r.role, r.role === 'admin' ? 'ok' : 'info') },
    { label: 'أضيف',    render: (r) => el('span', { class: 'mono' }, fmtDate(r.created_at)) },
    { label: '',        render: (r) => delBtn(r) },
  ];

  addBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    if (!email) { toast('اكتب الإيميل', 'err'); return; }
    addBtn.disabled = true; addBtn.textContent = 'جاري المنح';
    try {
      await grantAdmin(email, roleSel.value);
      toast(`تم منح ${email}`);
      emailInput.value = '';
      reload();
    } catch (e) {
      const m = e?.message || '';
      toast(m.includes('USER_NOT_FOUND') ? 'لا يوجد حساب بهذا الإيميل. يسجّل دخول للتطبيق أولا.'
        : m.includes('BAD_ROLE') ? 'دور غير صحيح'
        : m === 'FORBIDDEN' ? 'ليست لديك صلاحية' : 'تعذر المنح', 'err');
    } finally {
      addBtn.disabled = false; addBtn.textContent = 'منح الصلاحية';
    }
  });

  reload();

  return el('div', {},
    el('div', { class: 'page-head' },
      el('h1', {}, 'الأدمن'),
      el('p', {}, 'امنح أو أزل صلاحية الدخول للوحة التحكم. يجب أن يملك الشخص حسابا في التطبيق أولا.')),
    card('منح صلاحية', 'أدخل إيميل حساب موجود واختر الدور.',
      field('الإيميل', emailInput),
      field('الدور', roleSel),
      addBtn),
    card('المدراء الحاليون', null, listWrap));
}
