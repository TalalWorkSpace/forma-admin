// Shared: open a read-only detail modal for one user. Used by the users page
// (click a row). Billing controls are added here in a later wave.
import { el, modal, pill, table, spinnerScreen } from './ui.js';
import { userDetail } from './api.js';

const TIER_AR = { free: 'مجاني', trial: 'تجربة', starter: 'الأساسية', pro: 'الاحترافية', expired: 'منتهي', basic: 'أساسي', unlimited: 'غير محدود' };
const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (s) => { if (!s) return '-'; const d = new Date(s); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtDateTime = (s) => { if (!s) return '-'; const d = new Date(s); return `${fmtDate(s)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };

const kv = (k, v) => el('div', { class: 'kv' }, el('span', { class: 'k' }, k), el('span', { class: 'v' }, v ?? '-'));

function detailView(d) {
  const tierKind = d.tier === 'expired' ? 'warn' : (d.tier === 'free' ? 'info' : 'ok');
  const head = el('div', { class: 'kv-grid' },
    kv('الاسم', d.name || '-'),
    kv('الإيميل', el('span', { class: 'mono' }, d.email || '-')),
    kv('النوع', pill(d.role === 'coach' ? 'كوتش' : 'متدرب', d.role === 'coach' ? 'ok' : 'info')),
    kv('الباقة', pill(TIER_AR[d.tier] || d.tier, tierKind)),
    kv('تنتهي الباقة', el('span', { class: 'mono' }, fmtDate(d.tier_expires_at))),
    kv('انضم', el('span', { class: 'mono' }, fmtDate(d.created_at))),
    kv('آخر دخول', el('span', { class: 'mono' }, fmtDate(d.last_sign_in_at))),
    kv('إشعارات Push', d.has_push_token ? 'مفعلة' : 'لا'));

  const sections = [el('div', { class: 'detail-sec' }, head)];

  if (d.role === 'coach' && d.coach) {
    sections.push(el('div', { class: 'detail-sec' },
      el('h4', {}, 'العملاء'),
      el('div', { class: 'kv-grid' },
        kv('عملاء نشطون', String(d.coach.clients_active ?? 0)),
        kv('إجمالي العملاء', String(d.coach.clients_total ?? 0)))));
  }
  if (d.role === 'trainee' && d.trainee) {
    sections.push(el('div', { class: 'detail-sec' },
      el('h4', {}, 'التدريب'),
      el('div', { class: 'kv-grid' },
        kv('الكوتش', d.trainee.coach_name || 'لا يوجد'),
        kv('الستريك', `${d.trainee.streak ?? 0} يوم`),
        kv('إجمالي التمارين', String(d.trainee.sessions_total ?? 0)),
        kv('آخر 7 أيام', String(d.trainee.sessions_7d ?? 0)))));
  }

  const pays = d.payments || [];
  sections.push(el('div', { class: 'detail-sec' },
    el('h4', {}, 'المدفوعات'),
    pays.length
      ? table([
          { label: 'الوقت', render: (r) => el('span', { class: 'mono' }, fmtDateTime(r.created_at)) },
          { label: 'الحدث', render: (r) => r.event_type || '-' },
          { label: 'الباقة', render: (r) => el('span', { class: 'mono' }, `${r.tier_before || '-'} > ${r.tier_after || '-'}`) },
          { label: 'المبلغ', render: (r) => el('span', { class: 'mono' }, r.price ? `${r.price} ${r.currency || ''}`.trim() : '-') },
          { label: 'الحالة', render: (r) => r.status },
        ], pays)
      : el('div', { class: 'empty' }, 'لا مدفوعات مسجلة.')));

  return el('div', { 'data-user': d.id }, ...sections);
}

/** Fetch + show the detail modal for a user id. */
export async function openUserDetail(userId) {
  const m = modal('تفاصيل المستخدم', spinnerScreen('جاري التحميل'));
  document.body.append(m.node);
  try {
    m.setBody(detailView(await userDetail(userId)));
  } catch (e) {
    m.setBody(el('div', { class: 'empty' },
      e?.message === 'USER_NOT_FOUND' ? 'المستخدم غير موجود'
        : e?.message === 'FORBIDDEN' ? 'ليست لديك صلاحية العرض' : 'تعذر التحميل'));
  }
  return m;
}
