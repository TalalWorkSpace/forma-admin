// Feature: overview dashboard - live headcounts, growth, activity, subscriptions.
// One RPC (admin_stats) fills the whole page. viewer+.
import { el, card, stat, pill, toggle, spinnerScreen } from '../ui.js';
import { stats } from '../api.js';

export const meta = { id: 'overview', label: 'نظرة عامة', icon: 'chart', minRole: 'viewer' };

const TIER_AR = { free: 'مجاني', trial: 'تجربة', starter: 'الأساسية', pro: 'الاحترافية', expired: 'منتهي', basic: 'أساسي' };

export function render() {
  const body = el('div', {}, spinnerScreen('جاري تحميل الإحصائيات'));
  const includeTest = toggle('شمل حسابات الاختبار', false);

  function view(s) {
    const tiers = Object.entries(s.by_tier || {}).sort((a, b) => b[1] - a[1]);
    return el('div', {},
      el('div', { class: 'stats' },
        stat(s.total, 'إجمالي المستخدمين'),
        stat(s.coaches, 'الكوتشز'),
        stat(s.trainees, 'المتدربون')),
      el('div', { class: 'stats' },
        stat(s.active_subs, 'اشتراكات فعالة'),
        stat(s.expired_subs, 'اشتراكات منتهية'),
        stat(s.new_7d, 'جدد (7 أيام)')),
      el('div', { class: 'stats' },
        stat(s.sessions_7d, 'تمارين مكتملة (7 أيام)'),
        stat(s.sessions_30d, 'تمارين مكتملة (30 يوم)'),
        stat(s.new_30d, 'جدد (30 يوم)')),
      card('توزيع اشتراكات الكوتشز', 'حسب الباقة الحالية',
        tiers.length
          ? el('div', { class: 'pill-row' }, ...tiers.map(([t, n]) =>
              pill(`${TIER_AR[t] || t}: ${n}`, t === 'expired' ? 'warn' : (t === 'free' ? 'info' : 'ok'))))
          : el('div', { class: 'empty' }, 'لا توجد بيانات')));
  }

  async function load() {
    body.replaceChildren(spinnerScreen('جاري تحميل الإحصائيات'));
    try {
      body.replaceChildren(view(await stats(includeTest.get())));
    } catch (e) {
      body.replaceChildren(el('div', { class: 'empty' },
        e?.message === 'FORBIDDEN' ? 'ليست لديك صلاحية العرض' : 'تعذر تحميل الإحصائيات'));
    }
  }
  includeTest.node.addEventListener('change', load);
  load();

  return el('div', {},
    el('div', { class: 'page-head' },
      el('h1', {}, 'نظرة عامة'),
      el('p', {}, 'ملخص حي لحالة التطبيق: المستخدمون، الاشتراكات، والنشاط.')),
    el('div', { style: 'margin-bottom:16px' }, includeTest.node),
    body);
}
