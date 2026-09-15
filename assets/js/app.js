// FORMA Admin - shell: auth gate, admin verification, sidebar routing.
// Add a feature = add a page module to ROUTES; the sidebar and guard update.
import { el, icon, brand, button, field, input, modal, spinnerScreen, toast } from './ui.js';
import { supabase, signIn, signOut, getSession, myAdminRole, changePassword } from './api.js';
import * as overview from './pages/overview.js';
import * as users from './pages/users.js';
import * as payments from './pages/payments.js';
import * as discounts from './pages/discounts.js';
import * as costs from './pages/costs.js';
import * as notifications from './pages/notifications.js';
import * as audit from './pages/audit.js';

// Order = sidebar order; the first the user can see is the landing page.
const ROUTES = [overview, users, payments, discounts, costs, notifications, audit];   // ← register future pages here
const ROLE_RANK = { viewer: 1, editor: 2, admin: 3 };
const root = document.getElementById('app');

let ctx = { role: null, email: '' };

function canSee(page) { return (ROLE_RANK[ctx.role] ?? 0) >= (ROLE_RANK[page.meta.minRole] ?? 3); }

// == login screen ============================================================
function renderLogin(errMsg) {
  root.className = 'app';
  const email = input({ type: 'email', placeholder: 'name@example.com', autocomplete: 'username' });
  const pass = input({ type: 'password', placeholder: '••••••••', autocomplete: 'current-password' });
  const btn = button('تسجيل الدخول', { block: true });
  const submit = async () => {
    if (!email.value || !pass.value) { toast('أدخل الإيميل وكلمة المرور', 'err'); return; }
    btn.disabled = true; btn.textContent = 'جاري الدخول...';
    try { await signIn(email.value.trim(), pass.value); await boot(); }
    catch { renderLogin('بيانات الدخول غير صحيحة'); }
  };
  btn.addEventListener('click', submit);
  pass.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });

  root.replaceChildren(el('div', { class: 'login' },
    el('div', { class: 'box reveal' },
      brand(true),
      el('h2', {}, 'لوحة التحكم'),
      el('div', { class: 'tag' }, 'مخصصة لمشرفي فورما'),
      errMsg && el('div', { class: 'err' }, errMsg),
      field('البريد الإلكتروني', email),
      field('كلمة المرور', pass),
      btn)));
}

// == rejected: signed in but not an admin =====================================
function renderRejected() {
  root.className = 'app';
  root.replaceChildren(el('div', { class: 'login' },
    el('div', { class: 'box reveal', style: 'text-align:center' },
      brand(true),
      el('h2', {}, 'لا صلاحية دخول'),
      el('div', { class: 'tag' }, 'هذا الحساب ليس مشرفا. تواصل مع مسؤول النظام.'),
      button('تسجيل الخروج', { variant: 'ghost', block: true, onClick: async () => { await signOut(); renderLogin(); } }))));
}

// == change own password (self-service; no email needed) =====================
function openChangePassword() {
  const p1 = input({ type: 'password', placeholder: '••••••••', autocomplete: 'new-password' });
  const p2 = input({ type: 'password', placeholder: '••••••••', autocomplete: 'new-password' });
  const saveBtn = button('حفظ كلمة المرور', { block: true });
  const m = modal('تغيير كلمة المرور',
    el('div', {},
      field('كلمة المرور الجديدة', p1, '6 أحرف على الأقل'),
      field('تأكيد كلمة المرور', p2),
      saveBtn));
  document.body.append(m.node);
  const submit = async () => {
    if (p1.value.length < 6) { toast('كلمة المرور 6 أحرف على الأقل', 'err'); return; }
    if (p1.value !== p2.value) { toast('كلمتا المرور غير متطابقتين', 'err'); return; }
    saveBtn.disabled = true; saveBtn.textContent = 'جاري الحفظ';
    try {
      await changePassword(p1.value);
      toast('تم تغيير كلمة المرور');
      m.close();
    } catch (e) {
      toast(e?.message || 'تعذر تغيير كلمة المرور', 'err');
      saveBtn.disabled = false; saveBtn.textContent = 'حفظ كلمة المرور';
    }
  };
  saveBtn.addEventListener('click', submit);
  p2.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

// == authed shell ============================================================
function renderShell(activeId) {
  root.className = 'app authed';
  const pages = ROUTES.filter(canSee);
  const active = pages.find(p => p.meta.id === activeId) || pages[0];

  const nav = pages.map(p =>
    el('div', { class: `nav-item${p === active ? ' active' : ''}`, onclick: () => renderShell(p.meta.id) },
      icon(p.meta.icon), p.meta.label));

  const sidebar = el('aside', { class: 'sidebar' },
    brand(true),
    ...nav,
    el('div', { class: 'spacer' }),
    el('div', { class: 'who' },
      el('div', { class: 'name' }, ctx.email),
      el('div', { class: 'role' }, (ctx.role || '').toUpperCase())),
    el('div', { style: 'padding:10px 4px 0;display:flex;flex-direction:column;gap:8px' },
      button('تغيير كلمة المرور', { variant: 'ghost', block: true, onClick: openChangePassword }),
      button('تسجيل الخروج', { variant: 'ghost', block: true, onClick: async () => { await signOut(); renderLogin(); } })));

  const main = el('main', { class: 'main' },
    el('div', { class: 'topbar' }, el('div'),
      el('span', { class: 'mobile-signout', style: 'gap:8px' },
        button('كلمة المرور', { variant: 'ghost', onClick: openChangePassword }),
        button('خروج', { variant: 'ghost', onClick: async () => { await signOut(); renderLogin(); } }))),
    active ? active.render() : el('div', { class: 'page-head' }, el('h1', {}, 'لا صفحات متاحة لدورك')));

  root.replaceChildren(sidebar, main);
}

// == boot: decide login / rejected / shell ====================================
async function boot() {
  root.replaceChildren(spinnerScreen());
  const session = await getSession();
  if (!session) return renderLogin();
  const role = await myAdminRole();
  if (!role) return renderRejected();
  ctx = { role, email: session.user.email };
  renderShell();
}

supabase.auth.onAuthStateChange((event) => { if (event === 'SIGNED_OUT') renderLogin(); });
boot();
