// Feature: intern playbook - the intern's week schedule, onboarding, business /
// technical projects, feature proposals, weekly updates and access checklist, as
// one editable document saved to the DB (admin_get_playbook / admin_save_playbook).
// Ported from the standalone "Forma Intern Playbook" doc into the panel's RTL dark
// style. Enum VALUES stay English in the data; the UI maps them to Arabic labels.
// Viewers see it; saving is require_admin('editor') server-side.
import { el, icon, button, spinnerScreen, toast } from '../ui.js';
import { getPlaybook, savePlaybook } from '../api.js';

export const meta = { id: 'playbook', label: 'بلايبوك المتدرب', icon: 'check', minRole: 'viewer' };

const STATUS = ['Not started', 'In progress', 'In review', 'Done'];
const EFFORT = ['Not rated', 'Small', 'Medium', 'Large'];
const DECISION = ['Pending', 'Planned', 'Deferred', 'Rejected'];
const STATUS_AR = { 'Not started': 'لم يبدأ', 'In progress': 'قيد العمل', 'In review': 'قيد المراجعة', 'Done': 'منجز' };
const EFFORT_AR = { 'Not rated': 'غير مُقيَّم', 'Small': 'صغير', 'Medium': 'متوسط', 'Large': 'كبير' };
const DECISION_AR = { 'Pending': 'معلّق', 'Planned': 'مخطّط', 'Deferred': 'مؤجّل', 'Rejected': 'مرفوض' };
const TRACK_AR = { biz: 'أعمال', tech: 'تقني', both: 'الاثنين' };
const USER_AR = { Coach: 'كوتش', Trainee: 'متدرب', Both: 'الاثنين' };
const TIER_AR = { Free: 'مجاني', 'Trainee plan': 'باقة المتدرب', 'Coach plan': 'باقة الكوتش' };

export function render() {
  const root = el('div', { class: 'pb' }, spinnerScreen('جاري التحميل'));

  let state = null, editMode = false, dirty = false, original = '';

  // -- tiny helpers (mirror the original doc's engine) --
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const fmt = (v) => { if (!v) return ''; const d = new Date(v + 'T00:00:00'); return isNaN(d) ? v : d.toLocaleDateString('ar', { day: 'numeric', month: 'short', year: 'numeric', numberingSystem: 'latn' }); };
  const getPath = (p) => p.split('.').reduce((o, k) => (o == null ? o : o[k]), state);
  const setPath = (p, v) => { const ks = p.split('.'); let o = state; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; };
  const ce = () => (editMode ? ' contenteditable="plaintext-only" spellcheck="true"' : '');
  const ed = (path, val, ph, tag, cls) => { tag = tag || 'span'; return `<${tag} class="ed ${cls || ''}" data-bind="${path}" data-ph="${esc(ph || '')}"${ce()}>${esc(val)}</${tag}>`; };
  const sel = (path, opts, val, labels) => `<select class="pb-sel" data-bind="${path}" data-v="${esc(val)}"${editMode ? '' : ' disabled'}>${opts.map((o) => `<option value="${esc(o)}"${o === val ? ' selected' : ''}>${esc(labels ? labels[o] || o : o)}</option>`).join('')}</select>`;
  const delBtn = (list, id) => `<button class="pb-x edit-only" type="button" data-act="del" data-list="${list}" data-id="${id}">حذف</button>`;

  // -- section renderers (build innerHTML; the shell ids match) --
  function renderHero() {
    const m = state.meta;
    const ob = state.onboarding, bz = state.projects.filter((p) => p.track === 'biz'), tc = state.projects.filter((p) => p.track === 'tech');
    const cnt = (a, f) => a.filter(f).length;
    const meter = (lbl, done, total, cls) => { const pct = total ? Math.round((done / total) * 100) : 0; return `<div class="pb-meter"><div class="row"><span>${lbl}</span><span class="mono">${done} / ${total}</span></div><div class="pb-track ${cls}"><i style="width:${pct}%"></i></div></div>`; };
    const start = editMode ? `<input type="date" data-bind="meta.start" value="${esc(m.start)}" class="pb-date">` : `<span class="v">${m.start ? esc(fmt(m.start)) : '—'}</span>`;
    byId('pb-hero').innerHTML =
      `<div class="pb-hero-top"><span class="pb-kicker">فورما · برنامج التدريب</span><h1>بلايبوك المتدرب</h1>${ed('overview', state.overview, 'وصف البرنامج', 'p', 'pb-lede')}</div>` +
      `<div class="pb-facts">` +
        `<div class="pb-fact"><span class="pb-kicker">المتدرب</span><span class="v">${ed('meta.intern', m.intern, 'اسم المتدرب')}</span></div>` +
        `<div class="pb-fact"><span class="pb-kicker">تاريخ البدء</span>${start}</div>` +
        `<div class="pb-fact"><span class="pb-kicker">مشرف الأعمال</span><span class="v">${ed('meta.bizLead', m.bizLead, 'الاسم')}</span></div>` +
        `<div class="pb-fact"><span class="pb-kicker">المشرف التقني</span><span class="v">${ed('meta.techLead', m.techLead, 'الاسم')}</span></div>` +
      `</div>` +
      `<div class="pb-meters">${meter('اكتمال الأونبوردنق', cnt(ob, (x) => x.done), ob.length, 'neutral')}${meter('مشاريع الأعمال المنجزة', cnt(bz, (x) => x.status === 'Done'), bz.length, 'biz')}${meter('المشاريع التقنية المنجزة', cnt(tc, (x) => x.status === 'Done'), tc.length, 'tech')}</div>`;
  }
  function renderWeek() {
    const tiles = state.week.map((d, i) => {
      const ctl = editMode ? sel(`week.${i}.track`, ['biz', 'tech', 'both'], d.track, TRACK_AR) : `<span class="pb-pill ${d.track}">${TRACK_AR[d.track]}</span>`;
      return `<div class="pb-day ${d.track}"><div class="pb-day-h"><h3>${esc(d.day)}</h3>${ctl}</div>${ed(`week.${i}.focus`, d.focus, 'محور اليوم', 'div', 'pb-focus')}<div class="pb-lead">المشرف: ${ed(`week.${i}.lead`, d.lead, 'المشرف')}</div></div>`;
    }).join('');
    byId('pb-week').innerHTML = `<div class="pb-grid-gap"><div class="pb-week">${tiles}</div><div class="pb-rule"><b>قاعدة أساسية</b>${ed('rule', state.rule, 'القاعدة')}</div></div>`;
  }
  function renderChecks(key, elId, addLabel) {
    const items = state[key];
    const lis = items.map((it, i) => `<li class="${it.done ? 'done' : ''}"><input type="checkbox" data-bind="${key}.${i}.done"${it.done ? ' checked' : ''}${editMode ? '' : ' disabled'}>${ed(`${key}.${i}.text`, it.text, 'صف المهمة')}${delBtn(key, it.id)}</li>`).join('');
    byId(elId).innerHTML = `<ul class="pb-checks">${lis || '<li class="muted">لا عناصر بعد.</li>'}</ul><div class="pb-add-row"><button class="pb-add edit-only" type="button" data-act="add-check" data-list="${key}">+ ${addLabel}</button></div>`;
  }
  function renderProjects(track, elId) {
    let html = '';
    state.projects.forEach((p, i) => {
      if (p.track !== track) return;
      const b = `projects.${i}.`;
      const due = editMode ? `<label class="pb-inline">موعد التسليم <input type="date" data-bind="${b}due" value="${esc(p.due)}" class="pb-date"></label>` : `<span>التسليم: ${p.due ? esc(fmt(p.due)) : 'غير محدد'}</span>`;
      html += `<article class="pb-proj"><div class="pb-proj-h">${ed(b + 'title', p.title, 'اسم المشروع', 'h3')}${sel(b + 'status', STATUS, p.status, STATUS_AR)}</div>` +
        `<dl><div><dt class="pb-kicker">العمل</dt><dd>${ed(b + 'brief', p.brief, 'ماذا يفعل المتدرب')}</dd></div><div><dt class="pb-kicker">المخرَج</dt><dd>${ed(b + 'deliverable', p.deliverable, 'ما الذي يُسلَّم')}</dd></div><div><dt class="pb-kicker">لماذا يهم</dt><dd>${ed(b + 'why', p.why, 'القرار الذي يخدمه')}</dd></div></dl>` +
        `<div class="pb-proj-f">${due}${delBtn('projects', p.id)}</div></article>`;
    });
    byId(elId).innerHTML = html || '<div class="empty">لا مشاريع في هذا المسار بعد. فعّل التعديل واضغط «أضف مشروع».</div>';
  }
  function renderFlow() {
    byId('pb-flow').innerHTML = state.flow.map((s, i) => `<li>${ed(`flow.${i}.text`, s.text, 'الخطوة')}<span class="pb-who">${ed(`flow.${i}.who`, s.who, 'المسؤول')}</span></li>`).join('');
  }
  function renderProposals() {
    const rows = state.proposals.map((p, i) => { const b = `proposals.${i}.`; return `<tr><td>${ed(b + 'problem', p.problem, 'المشكلة')}</td><td>${editMode ? sel(b + 'user', ['Coach', 'Trainee', 'Both'], p.user, USER_AR) : esc(USER_AR[p.user] || p.user)}</td><td>${ed(b + 'evidence', p.evidence, 'الدليل')}</td><td>${editMode ? sel(b + 'tier', ['Free', 'Trainee plan', 'Coach plan'], p.tier, TIER_AR) : esc(TIER_AR[p.tier] || p.tier)}</td><td>${sel(b + 'effort', EFFORT, p.effort, EFFORT_AR)}</td><td>${sel(b + 'decision', DECISION, p.decision, DECISION_AR)}</td><td class="mono">${esc(fmt(p.date))}</td><td>${delBtn('proposals', p.id)}</td></tr>`; }).join('');
    byId('pb-proposals').innerHTML = rows
      ? `<div class="pb-tablebox"><table class="pb-table"><thead><tr><th>المشكلة</th><th>لمن</th><th>الدليل</th><th>الباقة</th><th>الجهد</th><th>القرار</th><th>أُضيف</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
      : '<div class="empty">لا مقترحات بعد. غالباً تأتي الأولى من تحليل المنافسين. استخدم «مقترح جديد».</div>';
  }
  function renderUpdates() {
    byId('pb-cadence').innerHTML = ed('cadence', state.cadence, 'الإيقاع');
    byId('pb-questions').innerHTML = state.questions.map((q, i) => `<li>${ed(`questions.${i}`, q, 'سؤال')}</li>`).join('');
    const list = state.updates.slice().sort((a, b) => (b.week || '').localeCompare(a.week || ''));
    byId('pb-updates').innerHTML = list.length ? list.map((u) => { const i = state.updates.indexOf(u), b = `updates.${i}.`;
      return `<article class="pb-upd"><div class="pb-upd-h"><h3>أسبوع ينتهي ${esc(fmt(u.week) || '(بلا تاريخ)')}</h3>${delBtn('updates', u.id)}</div><dl>` +
        `<div><dt class="pb-kicker">أُنجز</dt><dd>${ed(b + 'done', u.done, 'لا شيء')}</dd></div>` +
        `<div><dt class="pb-kicker">تعلّمت</dt><dd>${ed(b + 'learned', u.learned, 'لا شيء')}</dd></div>` +
        `<div><dt class="pb-kicker">معطّل</dt><dd>${ed(b + 'blocked', u.blocked, 'لا شيء')}</dd></div>` +
        `<div><dt class="pb-kicker">الأسبوع القادم</dt><dd>${ed(b + 'next', u.next, 'لا شيء')}</dd></div></dl></article>`; }).join('')
      : '<div class="empty">لا تحديثات بعد. الأول يُنشر في أول خميس للمتدرب.</div>';
  }
  function renderChrome() {
    root.classList.toggle('editing', editMode);
    const t = byId('pb-edit-toggle');
    if (t) { t.textContent = editMode ? 'إنهاء التعديل' : 'تعديل'; t.classList.toggle('on', editMode); }
    const sb = byId('pb-savebar'); if (sb) sb.classList.toggle('show', dirty);
    const fs = byId('pb-foot'); if (fs) fs.textContent = state.meta.updated ? 'آخر حفظ ' + fmt(state.meta.updated) : 'لم يُحفظ بعد';
  }
  function renderAll() {
    renderHero(); renderWeek(); renderChecks('onboarding', 'pb-onboarding', 'أضف عنصراً');
    renderProjects('biz', 'pb-biz'); renderProjects('tech', 'pb-tech'); renderFlow(); renderProposals();
    renderUpdates(); renderChecks('access', 'pb-access', 'أضف عنصراً'); renderChrome();
  }
  const byId = (id) => root.querySelector('#' + id);
  const markDirty = () => { dirty = true; renderChrome(); };

  // -- the page shell (sections populated by renderAll) --
  function build() {
    original = JSON.stringify(state);
    root.replaceChildren();
    root.insertAdjacentHTML('beforeend', `
      <div class="page-head pb-head">
        <div><h1>بلايبوك المتدرب</h1><p>جدول المتدرب الأسبوعي ومشاريعه وتحديثاته — قابلة للتعديل والحفظ.</p></div>
        <button class="pb-btn" type="button" id="pb-edit-toggle">تعديل</button>
      </div>
      <section class="pb-sec" id="pb-hero"></section>
      <section class="pb-sec"><div class="pb-sh"><span class="pb-kicker">الإيقاع الأسبوعي</span><h2>أيام كاملة، لا أنصاف</h2><p>كل يوم لمسار واحد، فيتعمّق المتدرب بدل تشتيت التركيز.</p></div><div id="pb-week"></div></section>
      <section class="pb-sec"><div class="pb-sh"><span class="pb-kicker">أول أسبوعين</span><h2>تعلّم المنتج كمستخدم</h2><p>لا يبدأ أي مشروع قبل إنجاز هذه.</p></div><div id="pb-onboarding"></div></section>
      <section class="pb-sec"><div class="pb-sh-row"><div><span class="pb-kicker biz-k">مسار · الأعمال</span><h2>مشاريع الأعمال</h2></div><button class="pb-add edit-only" type="button" data-act="add-project" data-track="biz">+ أضف مشروع</button></div><div class="pb-projects" id="pb-biz"></div></section>
      <section class="pb-sec"><div class="pb-sh-row"><div><span class="pb-kicker tech-k">مسار · التقني</span><h2>المشاريع التقنية</h2></div><button class="pb-add edit-only" type="button" data-act="add-project" data-track="tech">+ أضف مشروع</button></div><div class="pb-projects" id="pb-tech"></div></section>
      <section class="pb-sec"><div class="pb-sh"><span class="pb-kicker">حيث يلتقي المساران</span><h2>مقترحات المزايا</h2><p>كل فكرة بدليل وفئة باقة، فتبقى القائمة backlog لا قائمة أمنيات.</p></div><ol class="pb-flow" id="pb-flow"></ol><button class="pb-btn primary edit-only" type="button" data-act="toggle-form" data-form="pb-pform">مقترح جديد</button>
        <form class="pb-panel" id="pb-pform" hidden><div class="pb-grid2"><label class="pb-f">المشكلة<input id="pf-problem" type="text"></label><label class="pb-f">الدليل<input id="pf-evidence" type="text"></label></div><div class="pb-grid3"><label class="pb-f">لمن<select id="pf-user"><option value="Coach">كوتش</option><option value="Trainee">متدرب</option><option value="Both">الاثنين</option></select></label><label class="pb-f">الباقة<select id="pf-tier"><option value="Free">مجاني</option><option value="Trainee plan">باقة المتدرب</option><option value="Coach plan">باقة الكوتش</option></select></label><label class="pb-f">الجهد<select id="pf-effort"><option value="Not rated">غير مُقيَّم</option><option value="Small">صغير</option><option value="Medium">متوسط</option><option value="Large">كبير</option></select></label><label class="pb-f">القرار<select id="pf-decision"><option value="Pending">معلّق</option><option value="Planned">مخطّط</option><option value="Deferred">مؤجّل</option><option value="Rejected">مرفوض</option></select></label></div><div class="pb-actions"><button class="pb-btn" type="button" data-act="toggle-form" data-form="pb-pform">إلغاء</button><button class="pb-btn primary" type="submit">أضف المقترح</button></div></form>
        <div id="pb-proposals"></div></section>
      <section class="pb-sec"><div class="pb-sh"><span class="pb-kicker">كل خميس</span><h2>التحديثات الأسبوعية</h2><p id="pb-cadence"></p></div><ol class="pb-qs" id="pb-questions"></ol><button class="pb-btn primary edit-only" type="button" data-act="toggle-form" data-form="pb-uform">تحديث جديد</button>
        <form class="pb-panel" id="pb-uform" hidden><label class="pb-f" style="max-width:220px">أسبوع ينتهي<input id="uf-week" type="date"></label><div class="pb-grid2"><label class="pb-f">ماذا أنجزت<textarea id="uf-done"></textarea></label><label class="pb-f">ماذا تعلّمت<textarea id="uf-learned"></textarea></label><label class="pb-f">ما المعطّل<textarea id="uf-blocked"></textarea></label><label class="pb-f">خطة الأسبوع القادم<textarea id="uf-next"></textarea></label></div><div class="pb-actions"><button class="pb-btn" type="button" data-act="toggle-form" data-form="pb-uform">إلغاء</button><button class="pb-btn primary" type="submit">أضف التحديث</button></div></form>
        <div id="pb-updates"></div></section>
      <section class="pb-sec"><div class="pb-sh"><span class="pb-kicker">قبل اليوم الأول</span><h2>الصلاحيات والسرية</h2><p>المتدرب يعمل على بيئة الـ staging فقط. الإنتاج يبقى مع الفريق المؤسّس.</p></div><div id="pb-access"></div></section>
      <div class="pb-foot" id="pb-foot"></div>
      <div class="pb-savebar" id="pb-savebar"><span>لديك تغييرات غير محفوظة.</span><div class="pb-actions"><button class="pb-btn ghost" type="button" data-act="discard">تجاهل</button><button class="pb-btn primary" type="button" id="pb-save-btn" data-act="save">حفظ التغييرات</button></div></div>
    `);
    renderAll();
    wire();
  }

  // -- events --
  function wire() {
    byId('pb-edit-toggle').addEventListener('click', () => { editMode = !editMode; renderAll(); });
    root.addEventListener('input', (e) => { const t = e.target; if (t.classList && t.classList.contains('ed') && t.dataset.bind) { setPath(t.dataset.bind, t.innerText.replace(/\n$/, '')); markDirty(); } });
    root.addEventListener('change', (e) => { const t = e.target, p = t.dataset && t.dataset.bind; if (!p) return; setPath(p, t.type === 'checkbox' ? t.checked : t.value); markDirty(); renderAll(); });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
      if (a === 'del') { if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'تأكيد الحذف'; setTimeout(() => { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'حذف'; } }, 3000); return; } state[b.dataset.list] = state[b.dataset.list].filter((x) => x.id !== b.dataset.id); markDirty(); renderAll(); return; }
      if (a === 'add-check') { state[b.dataset.list].push({ id: uid(), text: '', done: false }); markDirty(); renderAll(); return; }
      if (a === 'add-project') { state.projects.push({ id: uid(), track: b.dataset.track, title: '', brief: '', deliverable: '', why: '', status: 'Not started', due: '' }); markDirty(); renderAll(); return; }
      if (a === 'toggle-form') { const f = byId(b.dataset.form); f.hidden = !f.hidden; if (!f.hidden && b.dataset.form === 'pb-uform' && !byId('uf-week').value) byId('uf-week').value = today(); return; }
      if (a === 'save') { save(); return; }
      if (a === 'discard') { state = JSON.parse(original); dirty = false; editMode = false; renderAll(); toast('أُلغيت التغييرات'); return; }
    });
    byId('pb-pform').addEventListener('submit', (e) => { e.preventDefault(); const pr = byId('pf-problem').value.trim(); if (!pr) { toast('اكتب المشكلة أولاً', 'err'); return; } state.proposals.unshift({ id: uid(), problem: pr, user: byId('pf-user').value, evidence: byId('pf-evidence').value.trim(), tier: byId('pf-tier').value, effort: byId('pf-effort').value, decision: byId('pf-decision').value, date: today() }); e.target.reset(); e.target.hidden = true; markDirty(); renderAll(); toast('أُضيف المقترح. احفظ للإبقاء.'); });
    byId('pb-uform').addEventListener('submit', (e) => { e.preventDefault(); const d = byId('uf-done').value.trim(); if (!d) { toast('اكتب ما أنجزته أولاً', 'err'); return; } state.updates.push({ id: uid(), week: byId('uf-week').value || today(), done: d, learned: byId('uf-learned').value.trim(), blocked: byId('uf-blocked').value.trim(), next: byId('uf-next').value.trim() }); e.target.reset(); e.target.hidden = true; markDirty(); renderAll(); toast('أُضيف التحديث. احفظ للإبقاء.'); });
  }

  async function save() {
    const btn = byId('pb-save-btn'); if (btn.disabled) return;
    btn.disabled = true; btn.textContent = 'جاري الحفظ...';
    const prev = state.meta.updated; state.meta.updated = today();
    try { await savePlaybook(state); original = JSON.stringify(state); dirty = false; editMode = false; renderAll(); toast('تم الحفظ'); }
    catch (e) { state.meta.updated = prev; toast(e?.message === 'FORBIDDEN' ? 'ليست لديك صلاحية الحفظ' : 'تعذر الحفظ', 'err'); }
    finally { btn.disabled = false; btn.textContent = 'حفظ التغييرات'; }
  }

  (async () => {
    try { state = await getPlaybook(); if (!state || !state.meta) throw new Error('EMPTY'); build(); }
    catch (e) { root.replaceChildren(el('div', { class: 'page-head' }, el('h1', {}, 'بلايبوك المتدرب')), el('div', { class: 'empty' }, e?.message === 'FORBIDDEN' ? 'هذه الصفحة للأدمن فقط' : 'تعذر التحميل')); }
  })();

  return root;
}
