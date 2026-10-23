// Feature: Mohammed's Playbook - the weekly track schedule, onboarding, business /
// technical projects, feature proposals, weekly updates and access checklist, as one
// editable document saved to the DB (admin_get_playbook / admin_save_playbook).
// English + LTR inside the RTL panel. Viewers see it; saving is require_admin('editor').
import { el, spinnerScreen, toast } from '../ui.js';
import { getPlaybook, savePlaybook } from '../api.js';

export const meta = { id: 'playbook', label: "Mohammed's Playbook", icon: 'check', minRole: 'viewer' };

const STATUS = ['Not started', 'In progress', 'In review', 'Done'];
const EFFORT = ['Not rated', 'Small', 'Medium', 'Large'];
const DECISION = ['Pending', 'Planned', 'Deferred', 'Rejected'];
const TRACK = { biz: 'Business', tech: 'Technical', both: 'Both tracks' };

export function render() {
  const root = el('div', { class: 'pb', dir: 'ltr' }, spinnerScreen('Loading'));

  let state = null, editMode = false, dirty = false, original = '';

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9);
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const fmt = (v) => { if (!v) return ''; const d = new Date(v + 'T00:00:00'); return isNaN(d) ? v : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  const setPath = (p, v) => { const ks = p.split('.'); let o = state; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; };
  const ce = () => (editMode ? ' contenteditable="plaintext-only" spellcheck="true"' : '');
  const ed = (path, val, ph, tag, cls) => { tag = tag || 'span'; return `<${tag} class="ed ${cls || ''}" data-bind="${path}" data-ph="${esc(ph || '')}"${ce()}>${esc(val)}</${tag}>`; };
  const sel = (path, opts, val, labels) => `<select class="pb-sel" data-bind="${path}" data-v="${esc(val)}"${editMode ? '' : ' disabled'}>${opts.map((o) => `<option value="${esc(o)}"${o === val ? ' selected' : ''}>${esc(labels ? labels[o] || o : o)}</option>`).join('')}</select>`;
  const delBtn = (list, id) => `<button class="pb-x edit-only" type="button" data-act="del" data-list="${list}" data-id="${id}">Remove</button>`;
  const byId = (id) => root.querySelector('#' + id);
  const markDirty = () => { dirty = true; renderChrome(); };

  function renderHero() {
    const m = state.meta;
    const ob = state.onboarding, bz = state.projects.filter((p) => p.track === 'biz'), tc = state.projects.filter((p) => p.track === 'tech');
    const cnt = (a, f) => a.filter(f).length;
    const meter = (lbl, done, total, cls) => { const pct = total ? Math.round((done / total) * 100) : 0; return `<div class="pb-meter"><div class="row"><span>${lbl}</span><span class="mono">${done} / ${total}</span></div><div class="pb-track ${cls}"><i style="width:${pct}%"></i></div></div>`; };
    const start = editMode ? `<input type="date" data-bind="meta.start" value="${esc(m.start)}" class="pb-date">` : `<span class="v">${m.start ? esc(fmt(m.start)) : '—'}</span>`;
    byId('pb-hero').innerHTML =
      `<div class="pb-hero-top"><span class="pb-kicker">Forma · Program</span><h1>Mohammed's <em>Playbook</em></h1>${ed('overview', state.overview, 'Describe the program', 'p', 'pb-lede')}</div>` +
      `<div class="pb-facts">` +
        `<div class="pb-fact"><span class="pb-kicker">Name</span><span class="v">${ed('meta.intern', m.intern, 'Add name')}</span></div>` +
        `<div class="pb-fact"><span class="pb-kicker">Start date</span>${start}</div>` +
        `<div class="pb-fact"><span class="pb-kicker">Business lead</span><span class="v">${ed('meta.bizLead', m.bizLead, 'Add name')}</span></div>` +
        `<div class="pb-fact"><span class="pb-kicker">Technical lead</span><span class="v">${ed('meta.techLead', m.techLead, 'Add name')}</span></div>` +
      `</div>` +
      `<div class="pb-meters">${meter('Onboarding complete', cnt(ob, (x) => x.done), ob.length, 'neutral')}${meter('Business projects done', cnt(bz, (x) => x.status === 'Done'), bz.length, 'biz')}${meter('Technical projects done', cnt(tc, (x) => x.status === 'Done'), tc.length, 'tech')}</div>`;
  }
  function renderWeek() {
    const tiles = state.week.map((d, i) => {
      const ctl = editMode ? sel(`week.${i}.track`, ['biz', 'tech', 'both'], d.track, TRACK) : `<span class="pb-pill ${d.track}">${TRACK[d.track]}</span>`;
      return `<div class="pb-day ${d.track}"><div class="pb-day-h"><h3>${esc(d.day)}</h3>${ctl}</div>${ed(`week.${i}.focus`, d.focus, 'What this day is for', 'div', 'pb-focus')}<div class="pb-lead">With ${ed(`week.${i}.lead`, d.lead, 'Supervisor')}</div></div>`;
    }).join('');
    byId('pb-week').innerHTML = `<div class="pb-grid-gap"><div class="pb-week">${tiles}</div><div class="pb-rule"><b>Ground rule</b>${ed('rule', state.rule, 'Ground rule')}</div></div>`;
  }
  function renderChecks(key, elId, addLabel) {
    const items = state[key];
    const lis = items.map((it, i) => `<li class="${it.done ? 'done' : ''}"><input type="checkbox" data-bind="${key}.${i}.done"${it.done ? ' checked' : ''}${editMode ? '' : ' disabled'}>${ed(`${key}.${i}.text`, it.text, 'Describe the item')}${delBtn(key, it.id)}</li>`).join('');
    byId(elId).innerHTML = `<ul class="pb-checks">${lis || '<li class="muted">No items yet.</li>'}</ul><div class="pb-add-row"><button class="pb-add edit-only" type="button" data-act="add-check" data-list="${key}">+ ${addLabel}</button></div>`;
  }
  function renderProjects(track, elId) {
    let html = '';
    state.projects.forEach((p, i) => {
      if (p.track !== track) return;
      const b = `projects.${i}.`;
      const due = editMode ? `<label class="pb-inline">Due <input type="date" data-bind="${b}due" value="${esc(p.due)}" class="pb-date"></label>` : `<span>Due ${p.due ? esc(fmt(p.due)) : 'not set'}</span>`;
      html += `<article class="pb-proj"><div class="pb-proj-h">${ed(b + 'title', p.title, 'Project name', 'h3')}${sel(b + 'status', STATUS, p.status)}</div>` +
        `<dl><div><dt class="pb-kicker">The work</dt><dd>${ed(b + 'brief', p.brief, 'What gets done')}</dd></div><div><dt class="pb-kicker">Deliverable</dt><dd>${ed(b + 'deliverable', p.deliverable, 'What gets handed over')}</dd></div><div><dt class="pb-kicker">Why it matters</dt><dd>${ed(b + 'why', p.why, 'The decision it informs')}</dd></div></dl>` +
        `<div class="pb-proj-f">${due}${delBtn('projects', p.id)}</div></article>`;
    });
    byId(elId).innerHTML = html || '<div class="empty">No projects on this track yet. Switch to Edit and use Add project.</div>';
  }
  function renderFlow() {
    byId('pb-flow').innerHTML = state.flow.map((s, i) => `<li>${ed(`flow.${i}.text`, s.text, 'Step')}<span class="pb-who">${ed(`flow.${i}.who`, s.who, 'Owner')}</span></li>`).join('');
  }
  function renderProposals() {
    const rows = state.proposals.map((p, i) => { const b = `proposals.${i}.`; return `<tr><td>${ed(b + 'problem', p.problem, 'Problem')}</td><td>${editMode ? sel(b + 'user', ['Coach', 'Trainee', 'Both'], p.user) : esc(p.user)}</td><td>${ed(b + 'evidence', p.evidence, 'Evidence')}</td><td>${editMode ? sel(b + 'tier', ['Free', 'Trainee plan', 'Coach plan'], p.tier) : esc(p.tier)}</td><td>${sel(b + 'effort', EFFORT, p.effort)}</td><td>${sel(b + 'decision', DECISION, p.decision)}</td><td class="mono">${esc(fmt(p.date))}</td><td>${delBtn('proposals', p.id)}</td></tr>`; }).join('');
    byId('pb-proposals').innerHTML = rows
      ? `<div class="pb-tablebox"><table class="pb-table"><thead><tr><th>Problem</th><th>For</th><th>Evidence</th><th>Plan tier</th><th>Effort</th><th>Decision</th><th>Added</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>`
      : '<div class="empty">No proposals yet. The first ones usually come out of the competitor analysis. Use New proposal.</div>';
  }
  function renderUpdates() {
    byId('pb-cadence').innerHTML = ed('cadence', state.cadence, 'Cadence');
    byId('pb-questions').innerHTML = state.questions.map((q, i) => `<li>${ed(`questions.${i}`, q, 'Question')}</li>`).join('');
    const list = state.updates.slice().sort((a, b) => (b.week || '').localeCompare(a.week || ''));
    byId('pb-updates').innerHTML = list.length ? list.map((u) => { const i = state.updates.indexOf(u), b = `updates.${i}.`;
      return `<article class="pb-upd"><div class="pb-upd-h"><h3>Week ending ${esc(fmt(u.week) || '(no date)')}</h3>${delBtn('updates', u.id)}</div><dl>` +
        `<div><dt class="pb-kicker">Finished</dt><dd>${ed(b + 'done', u.done, 'Nothing listed')}</dd></div>` +
        `<div><dt class="pb-kicker">Learned</dt><dd>${ed(b + 'learned', u.learned, 'Nothing listed')}</dd></div>` +
        `<div><dt class="pb-kicker">Blocked</dt><dd>${ed(b + 'blocked', u.blocked, 'Nothing blocked')}</dd></div>` +
        `<div><dt class="pb-kicker">Next week</dt><dd>${ed(b + 'next', u.next, 'Nothing listed')}</dd></div></dl></article>`; }).join('')
      : '<div class="empty">No updates yet. The first one is due on the first Thursday.</div>';
  }
  function renderChrome() {
    root.classList.toggle('editing', editMode);
    const t = byId('pb-edit-toggle');
    if (t) { t.textContent = editMode ? 'Done editing' : 'Edit'; t.classList.toggle('on', editMode); }
    const sb = byId('pb-savebar'); if (sb) sb.classList.toggle('show', dirty);
    const fs = byId('pb-foot'); if (fs) fs.textContent = state.meta.updated ? 'Last saved ' + fmt(state.meta.updated) : 'Not saved yet';
  }
  function renderAll() {
    renderHero(); renderWeek(); renderChecks('onboarding', 'pb-onboarding', 'Add item');
    renderProjects('biz', 'pb-biz'); renderProjects('tech', 'pb-tech'); renderFlow(); renderProposals();
    renderUpdates(); renderChecks('access', 'pb-access', 'Add item'); renderChrome();
  }

  function build() {
    original = JSON.stringify(state);
    root.replaceChildren();
    root.insertAdjacentHTML('beforeend', `
      <div class="page-head pb-head">
        <div><h1>Mohammed's Playbook</h1><p>Weekly schedule, projects and updates — editable and saved.</p></div>
        <button class="pb-btn" type="button" id="pb-edit-toggle">Edit</button>
      </div>
      <section class="pb-sec" id="pb-hero"></section>
      <section class="pb-sec"><div class="pb-sh"><span class="pb-kicker">Weekly rhythm</span><h2>Days, not half-days</h2><p>Each day belongs to one track, so Mohammed goes deep instead of switching context.</p></div><div id="pb-week"></div></section>
      <section class="pb-sec"><div class="pb-sh"><span class="pb-kicker">First two weeks</span><h2>Learn the product as a user</h2><p>No project starts until these are done.</p></div><div id="pb-onboarding"></div></section>
      <section class="pb-sec"><div class="pb-sh-row"><div><span class="pb-kicker biz-k">Track · Business</span><h2>Business projects</h2></div><button class="pb-add edit-only" type="button" data-act="add-project" data-track="biz">+ Add project</button></div><div class="pb-projects" id="pb-biz"></div></section>
      <section class="pb-sec"><div class="pb-sh-row"><div><span class="pb-kicker tech-k">Track · Technical</span><h2>Technical projects</h2></div><button class="pb-add edit-only" type="button" data-act="add-project" data-track="tech">+ Add project</button></div><div class="pb-projects" id="pb-tech"></div></section>
      <section class="pb-sec"><div class="pb-sh"><span class="pb-kicker">Where the tracks meet</span><h2>Feature proposals</h2><p>Every idea comes with evidence and a plan tier, so the list stays a backlog.</p></div><ol class="pb-flow" id="pb-flow"></ol><button class="pb-btn primary edit-only" type="button" data-act="toggle-form" data-form="pb-pform">New proposal</button>
        <form class="pb-panel" id="pb-pform" hidden><div class="pb-grid2"><label class="pb-f">Problem<input id="pf-problem" type="text"></label><label class="pb-f">Evidence<input id="pf-evidence" type="text"></label></div><div class="pb-grid3"><label class="pb-f">For<select id="pf-user"><option value="Coach">Coach</option><option value="Trainee">Trainee</option><option value="Both">Both</option></select></label><label class="pb-f">Plan tier<select id="pf-tier"><option value="Free">Free</option><option value="Trainee plan">Trainee plan</option><option value="Coach plan">Coach plan</option></select></label><label class="pb-f">Effort<select id="pf-effort"><option value="Not rated">Not rated</option><option value="Small">Small</option><option value="Medium">Medium</option><option value="Large">Large</option></select></label><label class="pb-f">Decision<select id="pf-decision"><option value="Pending">Pending</option><option value="Planned">Planned</option><option value="Deferred">Deferred</option><option value="Rejected">Rejected</option></select></label></div><div class="pb-actions"><button class="pb-btn" type="button" data-act="toggle-form" data-form="pb-pform">Cancel</button><button class="pb-btn primary" type="submit">Add proposal</button></div></form>
        <div id="pb-proposals"></div></section>
      <section class="pb-sec"><div class="pb-sh"><span class="pb-kicker">Every Thursday</span><h2>Weekly updates</h2><p id="pb-cadence"></p></div><ol class="pb-qs" id="pb-questions"></ol><button class="pb-btn primary edit-only" type="button" data-act="toggle-form" data-form="pb-uform">New update</button>
        <form class="pb-panel" id="pb-uform" hidden><label class="pb-f" style="max-width:220px">Week ending<input id="uf-week" type="date"></label><div class="pb-grid2"><label class="pb-f">What I finished<textarea id="uf-done"></textarea></label><label class="pb-f">What I learned<textarea id="uf-learned"></textarea></label><label class="pb-f">What is blocked<textarea id="uf-blocked"></textarea></label><label class="pb-f">Plan for next week<textarea id="uf-next"></textarea></label></div><div class="pb-actions"><button class="pb-btn" type="button" data-act="toggle-form" data-form="pb-uform">Cancel</button><button class="pb-btn primary" type="submit">Add update</button></div></form>
        <div id="pb-updates"></div></section>
      <section class="pb-sec"><div class="pb-sh"><span class="pb-kicker">Before day one</span><h2>Access and confidentiality</h2><p>Mohammed works on staging only. Production stays with the founding team.</p></div><div id="pb-access"></div></section>
      <div class="pb-foot" id="pb-foot"></div>
      <div class="pb-savebar" id="pb-savebar"><span>You have unsaved changes.</span><div class="pb-actions"><button class="pb-btn ghost" type="button" data-act="discard">Discard</button><button class="pb-btn primary" type="button" id="pb-save-btn" data-act="save">Save changes</button></div></div>
    `);
    renderAll();
    wire();
  }

  function wire() {
    byId('pb-edit-toggle').addEventListener('click', () => { editMode = !editMode; renderAll(); });
    root.addEventListener('input', (e) => { const t = e.target; if (t.classList && t.classList.contains('ed') && t.dataset.bind) { setPath(t.dataset.bind, t.innerText.replace(/\n$/, '')); markDirty(); } });
    root.addEventListener('change', (e) => { const t = e.target, p = t.dataset && t.dataset.bind; if (!p) return; setPath(p, t.type === 'checkbox' ? t.checked : t.value); markDirty(); renderAll(); });
    root.addEventListener('click', (e) => {
      const b = e.target.closest('[data-act]'); if (!b) return; const a = b.dataset.act;
      if (a === 'del') { if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'Confirm remove'; setTimeout(() => { if (b.isConnected) { b.dataset.armed = ''; b.textContent = 'Remove'; } }, 3000); return; } state[b.dataset.list] = state[b.dataset.list].filter((x) => x.id !== b.dataset.id); markDirty(); renderAll(); return; }
      if (a === 'add-check') { state[b.dataset.list].push({ id: uid(), text: '', done: false }); markDirty(); renderAll(); return; }
      if (a === 'add-project') { state.projects.push({ id: uid(), track: b.dataset.track, title: '', brief: '', deliverable: '', why: '', status: 'Not started', due: '' }); markDirty(); renderAll(); return; }
      if (a === 'toggle-form') { const f = byId(b.dataset.form); f.hidden = !f.hidden; if (!f.hidden && b.dataset.form === 'pb-uform' && !byId('uf-week').value) byId('uf-week').value = today(); return; }
      if (a === 'save') { save(); return; }
      if (a === 'discard') { state = JSON.parse(original); dirty = false; editMode = false; renderAll(); toast('Changes discarded'); return; }
    });
    byId('pb-pform').addEventListener('submit', (e) => { e.preventDefault(); const pr = byId('pf-problem').value.trim(); if (!pr) { toast('Add the problem first', 'err'); return; } state.proposals.unshift({ id: uid(), problem: pr, user: byId('pf-user').value, evidence: byId('pf-evidence').value.trim(), tier: byId('pf-tier').value, effort: byId('pf-effort').value, decision: byId('pf-decision').value, date: today() }); e.target.reset(); e.target.hidden = true; markDirty(); renderAll(); toast('Proposal added. Save to keep it.'); });
    byId('pb-uform').addEventListener('submit', (e) => { e.preventDefault(); const d = byId('uf-done').value.trim(); if (!d) { toast('Add what you finished first', 'err'); return; } state.updates.push({ id: uid(), week: byId('uf-week').value || today(), done: d, learned: byId('uf-learned').value.trim(), blocked: byId('uf-blocked').value.trim(), next: byId('uf-next').value.trim() }); e.target.reset(); e.target.hidden = true; markDirty(); renderAll(); toast('Update added. Save to keep it.'); });
  }

  async function save() {
    const btn = byId('pb-save-btn'); if (btn.disabled) return;
    btn.disabled = true; btn.textContent = 'Saving...';
    const prev = state.meta.updated; state.meta.updated = today();
    try { await savePlaybook(state); original = JSON.stringify(state); dirty = false; editMode = false; renderAll(); toast('Saved'); }
    catch (e) { state.meta.updated = prev; toast(e?.message === 'FORBIDDEN' ? 'You do not have permission to save' : 'Could not save', 'err'); }
    finally { btn.disabled = false; btn.textContent = 'Save changes'; }
  }

  (async () => {
    try { state = await getPlaybook(); if (!state || !state.meta) throw new Error('EMPTY'); build(); }
    catch (e) { root.replaceChildren(el('div', { class: 'page-head' }, el('h1', {}, "Mohammed's Playbook")), el('div', { class: 'empty' }, e?.message === 'FORBIDDEN' ? 'Admins only' : 'Could not load')); }
  })();

  return root;
}
