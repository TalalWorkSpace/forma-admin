// Feature: payments monitoring + log. Reads FORMA-revenue events (coaches paying
// FORMA via RevenueCat). Populates once the RevenueCat webhook is live. viewer+.
import { el, card, stat, table, pill, toggle, spinnerScreen } from '../ui.js';
import { payments, paymentStats } from '../api.js';

export const meta = { id: 'payments', label: 'المدفوعات', icon: 'card', minRole: 'viewer' };

const EVENT_AR = {
  INITIAL_PURCHASE: 'شراء اول', RENEWAL: 'تجديد', PRODUCT_CHANGE: 'تغيير باقة',
  CANCELLATION: 'الغاء', EXPIRATION: 'انتهاء', BILLING_ISSUE: 'مشكلة دفع',
  UNCANCELLATION: 'تراجع الغاء', TRANSFER: 'نقل', SYNC: 'مزامنة',
};
const STATUS_KIND = { processed: 'ok', received: 'info', ignored: 'info', unmatched: 'warn', failed: 'warn' };
const fmtDateTime = (s) => {
  if (!s) return '-';
  const d = new Date(s), p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};
const money = (r) => (r.price ? `${r.price} ${r.currency || ''}`.trim() : '-');
const tierFlow = (r) => (r.tier_before || r.tier_after) ? `${r.tier_before || '-'} > ${r.tier_after || '-'}` : '-';

export function render() {
  const includeTest = toggle('شمل حسابات الاختبار', false);
  const statRow = el('div', { class: 'stats' }, stat('-', 'كوتشز مشتركون'), stat('-', 'على تجربة'), stat('-', 'أحداث (30 يوم)'));
  const logWrap = el('div', {}, spinnerScreen('جاري التحميل'));

  const cols = [
    { label: 'الوقت', render: (r) => el('span', { class: 'mono' }, fmtDateTime(r.created_at)) },
    { label: 'المستخدم', render: (r) => el('div', {},
        el('div', {}, r.user_name || '-'),
        el('div', { class: 'mono muted-sm' }, r.user_email || '-')) },
    { label: 'الحدث', render: (r) => EVENT_AR[r.event_type] || r.event_type || '-' },
    { label: 'الباقة', render: (r) => el('span', { class: 'mono' }, tierFlow(r)) },
    { label: 'المبلغ', render: (r) => el('span', { class: 'mono' }, money(r)) },
    { label: 'الحالة', render: (r) => pill(r.status, STATUS_KIND[r.status] || 'info') },
    { label: 'البيئة', render: (r) => r.environment ? el('span', { class: 'mono' }, r.environment) : '-' },
  ];

  async function load() {
    logWrap.replaceChildren(spinnerScreen('جاري التحميل'));
    try {
      const [st, rows] = await Promise.all([paymentStats(), payments(100, includeTest.get())]);
      statRow.replaceChildren(
        stat(st.paying_coaches, 'كوتشز مشتركون'),
        stat(st.trial_coaches, 'على تجربة'),
        stat(st.last_30d, 'أحداث (30 يوم)'));
      logWrap.replaceChildren(rows.length
        ? table(cols, rows)
        : el('div', { class: 'empty' },
            'لا توجد أحداث دفع بعد. يمتلئ السجل تلقائيا عند تفعيل RevenueCat واول عملية شراء حقيقية.'));
    } catch (e) {
      logWrap.replaceChildren(el('div', { class: 'empty' },
        e?.message === 'FORBIDDEN' ? 'ليست لديك صلاحية العرض' : 'تعذر التحميل'));
    }
  }
  includeTest.node.addEventListener('change', load);
  load();

  return el('div', {},
    el('div', { class: 'page-head' },
      el('h1', {}, 'المدفوعات'),
      el('p', {}, 'اشتراكات الكوتشز في فورما وسجل أحداث الدفع مع اسم المستخدم.')),
    el('div', { style: 'margin-bottom:16px' }, includeTest.node),
    statRow,
    card('سجل المدفوعات', 'أحدث أحداث RevenueCat لكل كوتش.', logWrap));
}
