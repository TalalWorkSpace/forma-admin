// Feature: audit log - every admin action (who, what, when). admin only.
import { el, table, pill, spinnerScreen } from '../ui.js';
import { auditLog } from '../api.js';

export const meta = { id: 'audit', label: 'السجل', icon: 'history', minRole: 'admin' };

const AUD_AR = { all: 'الجميع', coaches: 'الكوتشز', trainees: 'المتدربون' };
const ACTION_AR = { broadcast: 'بث إشعار' };

const fmtDateTime = (s) => {
  if (!s) return '-';
  const d = new Date(s), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function summary(a) {
  const d = a.detail || {};
  if (a.action === 'broadcast') {
    const aud = AUD_AR[d.audience] || d.audience || '';
    return `«${d.title || ''}» الى ${aud}` + (d.count != null ? ` (${d.count})` : '') + (d.include_test ? ' [+اختبار]' : '');
  }
  try { return JSON.stringify(d); } catch { return '-'; }
}

export function render() {
  const result = el('div', {}, spinnerScreen('جاري التحميل'));

  (async () => {
    try {
      const rows = await auditLog(100);
      result.replaceChildren(table([
        { label: 'الوقت', render: (r) => el('span', { class: 'mono' }, fmtDateTime(r.created_at)) },
        { label: 'المشرف', render: (r) => el('span', { class: 'mono' }, r.admin_email || '-') },
        { label: 'العملية', render: (r) => pill(ACTION_AR[r.action] || r.action, 'info') },
        { label: 'التفاصيل', render: (r) => summary(r) },
      ], rows, { empty: 'لا توجد عمليات مسجلة بعد' }));
    } catch (e) {
      result.replaceChildren(el('div', { class: 'empty' },
        e?.message === 'FORBIDDEN' ? 'هذه الصفحة للمدراء فقط' : 'تعذر التحميل'));
    }
  })();

  return el('div', {},
    el('div', { class: 'page-head' },
      el('h1', {}, 'سجل العمليات'),
      el('p', {}, 'كل عملية إدارية مع المشرف والوقت.')),
    result);
}
