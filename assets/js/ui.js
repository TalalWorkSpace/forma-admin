// Reusable UI primitives. Every page composes these, so features reuse the same
// button/field/card/table/toast/toggle. No emoji anywhere: icons are inline SVG.

export const el = (tag, attrs = {}, ...children) => {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v === true) n.setAttribute(k, '');
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : document.createTextNode(String(c)));
  return n;
};

// == icons (SVG, currentColor) - the only icon source; never emoji ============
const PATHS = {
  bell:   '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  users:  '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9"/><path d="M16 3.1a4 4 0 0 1 0 7.8"/>',
  chart:  '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  check:  '<path d="M20 6 9 17l-5-5"/>',
  alert:  '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  history:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  refresh:'<path d="M21 12a9 9 0 1 1-2.64-6.36L21 8"/><path d="M21 3v5h-5"/>',
  card:   '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  tag:    '<path d="M20.6 13.4 12 22l-9-9V4h9l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
  close:  '<path d="M18 6 6 18"/><path d="M6 6l12 12"/>',
};
export const icon = (name, size = 18) =>
  el('span', { class: 'i', html:
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PATHS[name] || ''}</svg>` });

export const card = (title, sub, ...body) =>
  el('div', { class: 'card reveal' },
    title && el('h3', {}, title),
    sub && el('div', { class: 'sub' }, sub),
    ...body);

export const field = (label, control, hint) =>
  el('div', { class: 'field' },
    el('label', {}, label),
    control,
    hint && el('div', { class: 'hint' }, hint));

export const input = (attrs = {}) => el('input', attrs);
export const textarea = (attrs = {}) => el('textarea', attrs);

/** Native select. options: [{value,label}]. Returns the <select> element. */
export const select = (options, initial) => {
  const s = el('select', { class: 'sel' },
    ...options.map((o) => el('option', o.value === initial ? { value: o.value, selected: true } : { value: o.value }, o.label)));
  return s;
};

export const button = (label, { variant = 'lime', block = false, onClick, id } = {}) =>
  el('button', { class: `btn btn-${variant}${block ? ' btn-block' : ''}`, id, onclick: onClick }, label);

/** Segmented control. options: [{value,label}]. Returns {node, get, set}. */
export function segmented(options, initial) {
  let value = initial ?? options[0].value;
  const btns = options.map(o =>
    el('button', { type: 'button', class: o.value === value ? 'on' : '', onclick: () => set(o.value) }, o.label));
  const node = el('div', { class: 'seg' }, ...btns);
  function set(v) { value = v; btns.forEach((b, i) => b.classList.toggle('on', options[i].value === v)); node.dispatchEvent(new CustomEvent('change', { detail: v })); }
  return { node, get: () => value, set };
}

/** On/off toggle row. Returns {node, get}. */
export function toggle(label, initial = false) {
  let on = initial;
  const knob = el('span', { class: 'tg-knob' });
  const sw = el('button', { type: 'button', class: `tg${on ? ' on' : ''}`, role: 'switch', 'aria-checked': String(on) }, knob);
  const node = el('label', { class: 'tg-row' }, el('span', { class: 'tg-label' }, label), sw);
  const flip = () => { on = !on; sw.classList.toggle('on', on); sw.setAttribute('aria-checked', String(on)); node.dispatchEvent(new CustomEvent('change', { detail: on })); };
  sw.addEventListener('click', flip);
  return { node, get: () => on };
}

export const stat = (n, l) => el('div', { class: 'stat' }, el('div', { class: 'n' }, n), el('div', { class: 'l' }, l));

/** Coloured status pill. kind: ok | info | warn (matches .pill.* in CSS). */
export const pill = (text, kind = 'info') => el('span', { class: `pill ${kind}` }, text);

/**
 * Data table. cols: [{ key, label, render?(row) }]. Renders inside a
 * horizontally scrollable wrapper so wide tables never break the phone layout.
 */
export function table(cols, rows, { empty = 'لا توجد بيانات', onRow } = {}) {
  if (!rows || rows.length === 0) return el('div', { class: 'empty' }, empty);
  return el('div', { class: 'table-wrap' },
    el('table', { class: 'table' },
      el('thead', {}, el('tr', {}, ...cols.map(c => el('th', {}, c.label)))),
      el('tbody', {}, ...rows.map(r =>
        el('tr', onRow ? { class: 'tr-click', onclick: () => onRow(r) } : {},
          ...cols.map(c => el('td', {}, c.render ? c.render(r) : (r[c.key] ?? '-'))))))));
}

/**
 * Modal overlay. Returns { node, close }. Closes on backdrop click, the X, or
 * Escape. `onClose` runs after removal. Append node to document.body.
 */
export function modal(title, content, { onClose } = {}) {
  const closeBtn = el('button', { class: 'modal-x', 'aria-label': 'اغلاق' }, icon('close', 18));
  const box = el('div', { class: 'modal-box reveal', role: 'dialog', 'aria-modal': 'true' },
    el('div', { class: 'modal-head' }, el('h3', {}, title), closeBtn),
    el('div', { class: 'modal-body' }, content));
  const node = el('div', { class: 'modal-overlay' }, box);
  function close() {
    document.removeEventListener('keydown', onKey);
    node.remove();
    onClose && onClose();
  }
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  node.addEventListener('click', (e) => { if (e.target === node) close(); });
  closeBtn.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  return { node, close, setBody: (n) => box.querySelector('.modal-body').replaceChildren(n) };
}

/**
 * Minimal dependency-free SVG bar chart. series: [{ label, value }].
 * Bars use the lime accent; the tallest sets the scale.
 */
export function barChart(series, { height = 120, valueFmt = (v) => v } = {}) {
  const max = Math.max(1, ...series.map((s) => s.value));
  const n = series.length || 1;
  const gap = 2, bw = Math.max(1, (100 - gap * n) / n);
  const bars = series.map((s, i) => {
    const h = (s.value / max) * 100;
    const x = i * (bw + gap);
    return `<rect x="${x.toFixed(2)}" y="${(100 - h).toFixed(2)}" width="${bw.toFixed(2)}" height="${h.toFixed(2)}" rx="0.6" fill="var(--lime)" opacity="${s.value ? 0.9 : 0.15}"><title>${s.label}: ${valueFmt(s.value)}</title></rect>`;
  }).join('');
  return el('div', { class: 'chart', html:
    `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:${height}px" shape-rendering="crispEdges">${bars}</svg>` });
}

let toastTimer;
export function toast(msg, kind = 'ok') {
  let wrap = document.querySelector('.toast-wrap');
  if (!wrap) { wrap = el('div', { class: 'toast-wrap' }); document.body.append(wrap); }
  wrap.innerHTML = '';
  const t = el('div', { class: `toast ${kind}` }, icon(kind === 'ok' ? 'check' : 'alert', 16), el('span', {}, msg));
  wrap.append(t);
  requestAnimationFrame(() => t.classList.add('show'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 3200);
}

export const spinnerScreen = (label = 'جاري التحميل') =>
  el('div', { class: 'center-screen' }, el('div', { class: 'spin' }), el('span', { style: 'margin-inline-start:10px' }, label));

export const LOGO = 'assets/img/logo.png';
export const brand = (withTag = true) =>
  el('div', { class: 'brand' },
    el('img', { src: LOGO, alt: 'FORMA' }),
    el('div', {}, el('b', {}, 'FORMA'), withTag && el('small', {}, 'ADMIN')));
