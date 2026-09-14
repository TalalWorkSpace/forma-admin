// Feature: users list - search + filter by role, newest first. viewer+.
import { el, card, field, input, segmented, toggle, table, pill, spinnerScreen } from '../ui.js';
import { listUsers } from '../api.js';

export const meta = { id: 'users', label: 'المستخدمون', icon: 'users', minRole: 'viewer' };

const TIER_AR = { free: 'مجاني', trial: 'تجربة', starter: 'الأساسية', pro: 'الاحترافية', expired: 'منتهي', basic: 'أساسي' };
const fmtDate = (s) => {
  if (!s) return '-';
  const d = new Date(s), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export function render() {
  const search = input({ placeholder: 'ابحث بالاسم أو الإيميل', type: 'search' });
  const role = segmented(
    [{ value: 'all', label: 'الكل' }, { value: 'coach', label: 'كوتش' }, { value: 'trainee', label: 'متدرب' }], 'all');
  const includeTest = toggle('شمل حسابات الاختبار', false);
  const count = el('div', { class: 'hint', style: 'margin:10px 2px 0' });
  const result = el('div', {}, spinnerScreen('جاري التحميل'));

  const cols = [
    { label: 'الاسم', render: (r) => r.name || '-' },
    { label: 'الإيميل', render: (r) => el('span', { class: 'mono' }, r.email || '-') },
    { label: 'النوع', render: (r) => pill(r.role === 'coach' ? 'كوتش' : 'متدرب', r.role === 'coach' ? 'ok' : 'info') },
    { label: 'الباقة', render: (r) => pill(TIER_AR[r.tier] || r.tier, r.tier === 'expired' ? 'warn' : (r.tier === 'free' ? 'info' : 'ok')) },
    { label: 'انضم', render: (r) => el('span', { class: 'mono' }, fmtDate(r.created_at)) },
    { label: 'آخر دخول', render: (r) => el('span', { class: 'mono' }, fmtDate(r.last_sign_in_at)) },
  ];

  async function load() {
    result.replaceChildren(spinnerScreen('جاري التحميل'));
    try {
      const rows = await listUsers({ search: search.value.trim(), role: role.get(), limit: 100, includeTest: includeTest.get() });
      count.textContent = `${rows.length} مستخدم` + (rows.length === 100 ? ' (أول 100)' : '');
      result.replaceChildren(table(cols, rows, { empty: 'لا يوجد مستخدمون مطابقون' }));
    } catch (e) {
      count.textContent = '';
      result.replaceChildren(el('div', { class: 'empty' },
        e?.message === 'FORBIDDEN' ? 'ليست لديك صلاحية العرض' : 'تعذر التحميل'));
    }
  }

  let timer;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 300); });
  role.node.addEventListener('change', load);
  includeTest.node.addEventListener('change', load);
  load();

  return el('div', {},
    el('div', { class: 'page-head' },
      el('h1', {}, 'المستخدمون'),
      el('p', {}, 'كل مستخدمي فورما. ابحث وصفي حسب النوع.')),
    card(null, null,
      field('بحث', search),
      el('div', { class: 'row-2' },
        el('div', {}, role.node),
        el('div', { style: 'display:flex;align-items:flex-end' }, includeTest.node)),
      count),
    result);
}
