// Shared: open a detail modal for one user. Read-only info for everyone; for
// coaches it also exposes billing actions (extend trial, set tier, custom price)
// which are admin-gated server-side. Used by the users page (click a row).
import { el, modal, field, input, select, button, pill, table, spinnerScreen, toast } from './ui.js';
import { userDetail, extendTrial, setTier, setCustomPrice } from './api.js';

const TIER_AR = { free: 'مجاني', trial: 'تجربة', starter: 'الأساسية', pro: 'الاحترافية', expired: 'منتهي', basic: 'أساسي', unlimited: 'غير محدود' };
const pad = (n) => String(n).padStart(2, '0');
const fmtDate = (s) => { if (!s) return '-'; const d = new Date(s); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const fmtDateTime = (s) => { if (!s) return '-'; const d = new Date(s); return `${fmtDate(s)} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const kv = (k, v) => el('div', { class: 'kv' }, el('span', { class: 'k' }, k), el('span', { class: 'v' }, v ?? '-'));

// -- billing actions (coaches only). `refresh` re-fetches the modal after a write.
function billingActions(d, refresh) {
  // extend trial
  const days = input({ type: 'number', min: '1', max: '365', step: '1', placeholder: 'أيام' });
  const extendBtn = button('تمديد', {});
  extendBtn.addEventListener('click', async () => {
    const n = parseInt(days.value, 10);
    if (!(n >= 1)) { toast('اكتب عدد الأيام', 'err'); return; }
    extendBtn.disabled = true;
    try { await extendTrial(d.id, n); toast(`تم تمديد ${n} يوم`); refresh(); }
    catch (e) { toast(e?.message === 'FORBIDDEN' ? 'ليست لديك صلاحية' : 'تعذر التمديد', 'err'); extendBtn.disabled = false; }
  });

  // set tier
  const tierSel = select([
    { value: 'trial', label: 'تجربة' }, { value: 'starter', label: 'الأساسية' },
    { value: 'pro', label: 'الاحترافية' }, { value: 'expired', label: 'منتهي' }, { value: 'free', label: 'مجاني' },
  ], d.tier);
  const tierDays = input({ type: 'number', min: '1', step: '1', placeholder: 'أيام (اختياري)' });
  const tierBtn = button('تطبيق', {});
  tierBtn.addEventListener('click', async () => {
    tierBtn.disabled = true;
    try {
      await setTier(d.id, tierSel.value, tierDays.value ? parseInt(tierDays.value, 10) : null);
      toast('تم تغيير الباقة'); refresh();
    } catch (e) { toast(e?.message === 'FORBIDDEN' ? 'ليست لديك صلاحية' : 'تعذر التغيير', 'err'); tierBtn.disabled = false; }
  });

  // custom price
  const price = input({ type: 'number', min: '0', step: '0.01', placeholder: 'السعر', value: d.custom_price ?? '' });
  const priceNote = input({ placeholder: 'ملاحظة', maxlength: 120, value: d.custom_note ?? '' });
  const priceBtn = button('حفظ السعر', {});
  priceBtn.addEventListener('click', async () => {
    priceBtn.disabled = true;
    try {
      await setCustomPrice(d.id, price.value === '' ? null : parseFloat(price.value), d.custom_currency || 'SAR', priceNote.value.trim() || null);
      toast('تم حفظ السعر'); refresh();
    } catch (e) { toast(e?.message === 'FORBIDDEN' ? 'ليست لديك صلاحية' : 'تعذر الحفظ', 'err'); priceBtn.disabled = false; }
  });

  return el('div', { class: 'detail-sec' },
    el('h4', {}, 'إجراءات الفوترة'),
    el('div', { class: 'act-row' }, el('div', { class: 'act-lbl' }, 'تمديد التجربة'), days, extendBtn),
    el('div', { class: 'act-row' }, el('div', { class: 'act-lbl' }, 'تغيير الباقة'), tierSel, tierDays, tierBtn),
    el('div', { class: 'act-row' }, el('div', { class: 'act-lbl' }, 'سعر مخصص'), price, priceNote, priceBtn));
}

function detailView(d, refresh) {
  const tierKind = d.tier === 'expired' ? 'warn' : (d.tier === 'free' ? 'info' : 'ok');
  const priceStr = d.custom_price != null ? `${d.custom_price} ${d.custom_currency || 'SAR'}` : 'لا يوجد';
  const head = el('div', { class: 'kv-grid' },
    kv('الاسم', d.name || '-'),
    kv('الإيميل', el('span', { class: 'mono' }, d.email || '-')),
    kv('النوع', pill(d.role === 'coach' ? 'كوتش' : 'متدرب', d.role === 'coach' ? 'ok' : 'info')),
    kv('الباقة', pill(TIER_AR[d.tier] || d.tier, tierKind)),
    kv('تنتهي الباقة', el('span', { class: 'mono' }, fmtDate(d.tier_expires_at))),
    kv('السعر المخصص', priceStr),
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
    sections.push(billingActions(d, refresh));
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
  async function load() {
    try {
      m.setBody(detailView(await userDetail(userId), load));
    } catch (e) {
      m.setBody(el('div', { class: 'empty' },
        e?.message === 'USER_NOT_FOUND' ? 'المستخدم غير موجود'
          : e?.message === 'FORBIDDEN' ? 'ليست لديك صلاحية العرض' : 'تعذر التحميل'));
    }
  }
  load();
  return m;
}
