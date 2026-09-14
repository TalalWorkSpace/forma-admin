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
