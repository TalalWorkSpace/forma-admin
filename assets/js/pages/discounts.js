// Feature: discount codes - create/list/activate/delete promo codes for coaches
// subscribing to FORMA. Redemption in the app is a later integration; this page
// manages the codes. admin only (create/toggle/delete are require_admin('admin')).
import { el, card, field, input, select, segmented, button, table, pill, spinnerScreen, toast } from '../ui.js';
import { createDiscount, listDiscounts, toggleDiscount, deleteDiscount } from '../api.js';

export const meta = { id: 'discounts', label: 'أكواد الخصم', icon: 'tag', minRole: 'admin' };

const KIND_AR = { percent: 'نسبة', fixed: 'مبلغ', trial_days: 'أيام تجربة' };
const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (s) => { if (!s) return '-'; const d = new Date(s); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const valueText = (r) => r.kind === 'percent' ? `${r.value}%` : r.kind === 'fixed' ? `${r.value} ريال` : `${r.value} يوم`;
const usesText = (r) => `${r.used_count}${r.max_uses != null ? ' / ' + r.max_uses : ''}`;

export function render() {
  const listWrap = el('div', {}, spinnerScreen('جاري التحميل'));

  // -- create form --
  const codeInput = input({ placeholder: 'SUMMER20', maxlength: 40, style: 'text-transform:uppercase' });
  const kind = segmented(
    [{ value: 'percent', label: 'نسبة %' }, { value: 'fixed', label: 'مبلغ ثابت' }, { value: 'trial_days', label: 'أيام تجربة' }], 'percent');
  const valueInput = input({ type: 'number', min: '0', step: '1', placeholder: '20' });
  const tierSel = select([{ value: '', label: 'كل الباقات' }, { value: 'trial', label: 'تجربة' }, { value: 'starter', label: 'الأساسية' }, { value: 'pro', label: 'الاحترافية' }], '');
  const maxUses = input({ type: 'number', min: '1', step: '1', placeholder: 'بلا حد' });
  const expires = input({ type: 'date' });
  const note = input({ placeholder: 'ملاحظة اختيارية', maxlength: 120 });
  const createBtn = button('انشاء الكود', { block: true });

  async function reload() {
    listWrap.replaceChildren(spinnerScreen('جاري التحميل'));
    try {
      const rows = await listDiscounts();
      listWrap.replaceChildren(rows.length ? table(cols, rows) : el('div', { class: 'empty' }, 'لا توجد أكواد بعد.'));
    } catch (e) {
      listWrap.replaceChildren(el('div', { class: 'empty' },
        e?.message === 'FORBIDDEN' ? 'هذه الصفحة للمدراء فقط' : 'تعذر التحميل'));
    }
  }

  const activePill = (r) => {
    const p = pill(r.active ? 'مفعل' : 'موقوف', r.active ? 'ok' : 'warn');
    p.style.cursor = 'pointer';
    p.title = 'اضغط للتبديل';
    p.addEventListener('click', async () => {
      try { await toggleDiscount(r.code, !r.active); toast(r.active ? 'تم الايقاف' : 'تم التفعيل'); reload(); }
      catch { toast('تعذر التبديل', 'err'); }
    });
    return p;
  };
  const delBtn = (r) => button('حذف', { variant: 'danger', onClick: async () => {
    if (!confirm(`حذف الكود ${r.code} نهائيا؟`)) return;
    try { await deleteDiscount(r.code); toast('تم الحذف'); reload(); }
    catch { toast('تعذر الحذف', 'err'); }
  } });

  const cols = [
    { label: 'الكود', render: (r) => el('span', { class: 'mono' }, r.code) },
    { label: 'النوع', render: (r) => KIND_AR[r.kind] || r.kind },
    { label: 'القيمة', render: (r) => el('span', { class: 'mono' }, valueText(r)) },
    { label: 'الباقة', render: (r) => r.tier ? r.tier : 'الكل' },
    { label: 'الاستخدام', render: (r) => el('span', { class: 'mono' }, usesText(r)) },
    { label: 'ينتهي', render: (r) => el('span', { class: 'mono' }, fmtDate(r.expires_at)) },
    { label: 'الحالة', render: (r) => activePill(r) },
    { label: '', render: (r) => delBtn(r) },
  ];

  createBtn.addEventListener('click', async () => {
    const code = codeInput.value.trim().toUpperCase();
    const value = parseFloat(valueInput.value);
    if (!code) { toast('اكتب الكود', 'err'); return; }
    if (!(value >= 0)) { toast('اكتب قيمة صحيحة', 'err'); return; }
    if (kind.get() === 'percent' && value > 100) { toast('النسبة لا تتجاوز 100', 'err'); return; }
    createBtn.disabled = true; createBtn.textContent = 'جاري الانشاء';
    try {
      await createDiscount({
        code, kind: kind.get(), value,
        tier: tierSel.value || null,
        maxUses: maxUses.value ? parseInt(maxUses.value, 10) : null,
        expiresAt: expires.value || null,
        note: note.value.trim() || null,
      });
      toast(`تم انشاء ${code}`);
      codeInput.value = ''; valueInput.value = ''; maxUses.value = ''; expires.value = ''; note.value = '';
      reload();
    } catch (e) {
      const m = e?.message || '';
      toast(m.includes('CODE_EXISTS') ? 'الكود موجود مسبقا'
        : m === 'FORBIDDEN' ? 'ليست لديك صلاحية' : 'تعذر الانشاء', 'err');
    } finally {
      createBtn.disabled = false; createBtn.textContent = 'انشاء الكود';
    }
  });

  reload();

  return el('div', {},
    el('div', { class: 'page-head' },
      el('h1', {}, 'أكواد الخصم'),
      el('p', {}, 'انشئ وادر أكواد الخصم لاشتراكات الكوتشز في فورما.')),
    card('كود جديد', 'النوع: نسبة مئوية، مبلغ ثابت، أو أيام تجربة إضافية.',
      field('الكود', codeInput),
      field('النوع', kind.node),
      el('div', { class: 'row-2' }, el('div', {}, field('القيمة', valueInput)), el('div', {}, field('الباقة', tierSel))),
      el('div', { class: 'row-2' }, el('div', {}, field('حد الاستخدام', maxUses)), el('div', {}, field('ينتهي في', expires))),
      field('ملاحظة', note),
      createBtn),
    card('الأكواد الحالية', null, listWrap));
}
