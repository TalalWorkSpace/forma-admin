// Feature 1 - broadcast notifications. A page is a function that returns a DOM
// node; register it in app.js's ROUTES. New features follow the same shape.
import { el, card, field, input, textarea, button, segmented, toggle, stat, toast } from '../ui.js';
import { audienceCounts, broadcast } from '../api.js';

export const meta = { id: 'notifications', label: 'الإشعارات', icon: 'bell', minRole: 'editor' };

export function render() {
  let counts = { all: 0, coaches: 0, trainees: 0, all_with_test: 0, coaches_with_test: 0, trainees_with_test: 0 };

  const titleInput = input({ placeholder: 'عنوان الإشعار', maxlength: 80 });
  const bodyInput = textarea({ placeholder: 'نص الرسالة التي تصل جوال المستخدم', maxlength: 300 });
  const audience = segmented(
    [{ value: 'trainees', label: 'المتدربون' }, { value: 'coaches', label: 'الكوتشز' }, { value: 'all', label: 'الجميع' }],
    'trainees');

  const includeTest = toggle('شمل حسابات الاختبار', false);
  const reach = el('div', { class: 'hint', style: 'text-align:right;margin-top:2px' });
  const countFor = (aud) => includeTest.get() ? (counts[aud + '_with_test'] ?? 0) : (counts[aud] ?? 0);
  const updateReach = () => {
    const withTest = includeTest.get();
    reach.textContent = `سيصل الى ${countFor(audience.get())} مستخدم` + (withTest ? ' (يشمل حسابات الاختبار).' : ' (لا يشمل حسابات الاختبار).');
  };
  audience.node.addEventListener('change', updateReach);
  includeTest.node.addEventListener('change', updateReach);

  const sendBtn = button('ارسال الاشعار', { block: true });
  const statRow = el('div', { class: 'stats' },
    stat('-', 'الجميع'), stat('-', 'الكوتشز'), stat('-', 'المتدربون'));

  audienceCounts().then(c => {
    counts = c;
    statRow.replaceChildren(stat(c.all, 'الجميع'), stat(c.coaches, 'الكوتشز'), stat(c.trainees, 'المتدربون'));
    updateReach();
  }).catch(() => { reach.textContent = 'تعذر جلب اعداد الجمهور.'; });

  sendBtn.addEventListener('click', async () => {
    const title = titleInput.value.trim(), body = bodyInput.value.trim(), aud = audience.get();
    if (!title || !body) { toast('اكتب العنوان والنص', 'err'); return; }
    const label = { all: 'الجميع', coaches: 'الكوتشز', trainees: 'المتدربين' }[aud];
    if (!confirm(`ارسال هذا الاشعار الى ${countFor(aud)} من ${label}؟`)) return;
    sendBtn.disabled = true; sendBtn.textContent = 'جاري الارسال';
    try {
      const n = await broadcast({ title, body, audience: aud, includeTest: includeTest.get() });
      toast(`تم الارسال الى ${n} مستخدم`, 'ok');
      titleInput.value = ''; bodyInput.value = '';
    } catch (e) {
      toast(e?.message === 'FORBIDDEN' ? 'ليست لديك صلاحية الارسال' : 'تعذر الارسال، حاول مرة اخرى', 'err');
    } finally {
      sendBtn.disabled = false; sendBtn.textContent = 'ارسال الاشعار';
    }
  });

  return el('div', {},
    el('div', { class: 'page-head' },
      el('h1', {}, 'الإشعارات'),
      el('p', {}, 'ارسل اشعارا فوريا الى جوالات المستخدمين. يحترم اعدادات الاشعارات لكل مستخدم.')),
    statRow,
    card('اشعار جديد', 'يصل كاشعار Push على الجوال ويظهر في مركز الاشعارات داخل التطبيق.',
      field('العنوان', titleInput),
      field('النص', bodyInput),
      field('الجمهور', audience.node, reach),
      el('div', { style: 'margin-bottom:16px' }, includeTest.node),
      sendBtn),
  );
}
