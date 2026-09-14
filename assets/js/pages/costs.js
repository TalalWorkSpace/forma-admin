// Feature: technical cost calculator - unit economics of running FORMA.
// Fully client-side (no RPC): fixed cost is built from real verified service
// prices; EAS and RevenueCat step with users/revenue. admin only (financials).
import { el } from '../ui.js';

export const meta = { id: 'costs', label: 'التكلفة التقنية', icon: 'calc', minRole: 'admin' };

// -- verified real prices (USD, 2026) --
const USD = { supabase: 25, apple: 99 / 12, easStarter: 19, easProd: 199, easEnt: 1000 };
const DOMAIN_MO = 50 / 12;                 // .sa domain ~50 SAR/year

const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const sar = (n) => (n < 100 ? fmt(n, 1) : fmt(n, 0));

function easUsd(users) {
  if (users <= 1000) return { usd: 0, tier: 'مجاني' };
  if (users <= 3000) return { usd: USD.easStarter, tier: 'Starter' };
  if (users <= 50000) return { usd: USD.easProd, tier: 'Production' };
  return { usd: USD.easEnt, tier: 'Enterprise' };
}

function model(N, T, price, rate, v, buf) {
  const trainees = N * T, users = trainees + N;
  const supabase = USD.supabase * rate, apple = USD.apple * rate;
  const e = easUsd(users), eas = e.usd * rate, domain = DOMAIN_MO;
  const mrr = N * price, mtrUsd = rate > 0 ? mrr / rate : 0;
  const revcat = mtrUsd > 2500 ? 0.01 * mrr : 0;
  const variable = trainees * v;
  const fixed = supabase + apple + eas + domain + buf;
  const total = fixed + revcat + variable;
  return {
    trainees, users, supabase, apple, eas, easTier: e.tier, domain, revcat,
    revcatActive: revcat > 0, variable, buffer: buf, total, mrr,
    perCoach: N ? total / N : 0, perUser: trainees ? total / trainees : 0,
    pct: price > 0 ? total / mrr * 100 : null, margin: price > 0 ? price - (N ? total / N : 0) : null,
  };
}

const MARKUP = `
  <div class="page-head">
    <h1>حاسبة التكلفة التقنية</h1>
    <p>كم يكلف تشغيل فورما فعليا. حرك المدخلات وشوف تكلفة الكوتش والمتدرب تنزل مع التوسع. كل ريال مبني على سعر خدمة حقيقي، و EAS و RevenueCat يحسبان تلقائيا.</p>
  </div>

  <div class="cost-kpis">
    <div class="cost-kpi hero"><span class="lbl">تكلفة الكوتش / شهر</span><b class="n" data-k="coach">-</b><span class="foot" data-k="coach_f"></span></div>
    <div class="cost-kpi"><span class="lbl">تكلفة المتدرب / شهر</span><b class="n" data-k="user">-</b><span class="foot" data-k="user_f"></span></div>
    <div class="cost-kpi"><span class="lbl">الإجمالي / شهر</span><b class="n" data-k="total">-</b><span class="foot" data-k="total_f"></span></div>
    <div class="cost-kpi"><span class="lbl">من الدخل (infra)</span><b class="n" data-k="pct">-</b><span class="foot" data-k="pct_f"></span></div>
    <div class="cost-kpi"><span class="lbl">الربح لكل كوتش</span><b class="n" data-k="margin">-</b><span class="foot" data-k="margin_f"></span></div>
  </div>

  <div class="cost-grid">
    <div class="card">
      <h3>المدخلات</h3>
      <div class="sub">القيم الافتراضية سيناريو واقعي متوسط.</div>
      <div class="cost-ctrl"><div class="top"><span>عدد الكوتشز</span><b class="mono" data-v="coaches">50</b></div><input type="range" id="cost_coaches" min="1" max="250" step="1" value="50"></div>
      <div class="cost-ctrl"><div class="top"><span>متدربين لكل كوتش</span><b class="mono" data-v="tpc">30</b></div><input type="range" id="cost_tpc" min="5" max="60" step="1" value="30"></div>
      <div class="cost-ctrl"><div class="top"><span>سعر اشتراك الكوتش / شهر</span><b class="mono" data-v="price">200</b></div><input type="range" id="cost_price" min="0" max="600" step="10" value="200"><div class="note">يحرك نسبة الدخل والربح، ويفعل رسوم RevenueCat. صفره لتجاهله.</div></div>
      <div class="cost-row2">
        <div class="cost-ctrl"><div class="top"><span>متغير / متدرب</span><b class="mono" data-v="varc">0.10</b></div><input type="range" id="cost_varc" min="0" max="1.5" step="0.05" value="0.10"></div>
        <div class="cost-ctrl"><div class="top"><span>احتياطي / شهر</span><b class="mono" data-v="buf">100</b></div><input type="range" id="cost_buf" min="0" max="500" step="10" value="100"></div>
      </div>
      <div class="note">التخزين والنقل شبه مجاني داخل حصة Supabase (100GB تخزين، 250GB نقل). المتغير يبقى قريب من الصفر لين تتجاوز الحصة.</div>
      <div class="cost-ctrl" style="margin-top:14px"><div class="top"><span>سعر الدولار (USD)</span><b class="mono" data-v="rate">3.75</b></div><input type="range" id="cost_rate" min="3.6" max="3.9" step="0.01" value="3.75"></div>
    </div>

    <div class="cost-main">
      <div class="card">
        <h3>التكلفة لكل كوتش مقابل عدد الكوتشز</h3>
        <div class="sub">الثابت ينوزع كل ما زاد العدد فتنزل التكلفة. القفزات لأعلى عند تغير باقة EAS.</div>
        <div class="cost-chart-wrap"><svg class="cost-chart" data-el="chart" viewBox="0 0 620 300" preserveAspectRatio="xMidYMid meet" role="img" aria-label="منحنى التكلفة لكل كوتش"></svg></div>
        <div class="cost-chart-cap"><span class="leg"><i></i> التكلفة/كوتش <i class="d"></i> الأرضية الثابتة</span><span class="now mono" data-el="now"></span></div>
      </div>
      <div class="card">
        <h3>من وين تجي التكلفة</h3>
        <div class="sub">تفصيل الإجمالي الشهري عند الإعداد الحالي.</div>
        <div class="cost-bd" data-el="bd"></div>
      </div>
    </div>
  </div>

  <div class="page-head" style="margin-top:26px;margin-bottom:12px"><h1 style="font-size:18px">سيناريوهات النمو</h1></div>
  <div class="table-wrap"><table class="table"><thead><tr>
    <th>الكوتشز</th><th>المتدربون</th><th>الإجمالي</th><th>لكل كوتش</th><th>لكل متدرب</th><th>% الدخل</th><th data-el="th_m">الربح/كوتش</th>
  </tr></thead><tbody data-el="tbody"></tbody></table></div>

  <div class="card" style="margin-top:16px">
    <h3>الأسعار المرجعية (محققة من صفحات التسعير الرسمية)</h3>
    <div class="cost-src">
      <div><b>Supabase Pro</b> <span class="mono">$25/شهر</span> يشمل 100GB تخزين و250GB نقل و100k مستخدم.</div>
      <div><b>Expo EAS</b> <span class="mono">مجاني / $19 / $199</span> يتدرج مع مستخدمي التحديث (OTA).</div>
      <div><b>Apple Developer</b> <span class="mono">$99/سنة</span> إلزامي ل iOS = ~$8.25/شهر.</div>
      <div><b>RevenueCat</b> <span class="mono">مجاني ثم 1%</span> مجاني حتى $2,500 دخل شهري ثم 1% من الدخل.</div>
      <div><b>الدومين .sa</b> <span class="mono">~50 ريال/سنة</span> = ~4 ريال/شهر.</div>
      <div><b>Resend / Sentry / Cloudflare / FCM</b> <span class="mono">مجاني</span> ضمن الحدود المجانية.</div>
    </div>
    <div class="note" style="margin-top:12px">تكلفة البنية التقنية فقط بالريال. لا تشمل رسوم متجر Apple على المشتريات (تخصم من الإيراد، ليست تكلفة تشغيل) ولا الرواتب او التسويق.</div>
  </div>
`;

export function render() {
  const wrap = el('div', {});
  wrap.innerHTML = MARKUP;
  const q = (sel) => wrap.querySelector(sel);
  const set = (k, html) => { const n = wrap.querySelector(`[data-k="${k}"]`); if (n) n.innerHTML = html; };
  const val = (k, t) => { const n = wrap.querySelector(`[data-v="${k}"]`); if (n) n.textContent = t; };

  const ids = ['coaches', 'tpc', 'price', 'varc', 'buf', 'rate'];
  const read = () => ({
    N: +q('#cost_coaches').value, T: +q('#cost_tpc').value, price: +q('#cost_price').value,
    v: +q('#cost_varc').value, buf: +q('#cost_buf').value, rate: +q('#cost_rate').value,
  });

  function drawChart(s) {
    const W = 620, H = 300, pl = 54, pr = 18, pt = 16, pb = 36, maxN = 250;
    const pc = (n) => model(n, s.T, s.price, s.rate, s.v, s.buf).perCoach;
    const asym = s.T * s.v + (s.price > 0 && (s.N * s.price / s.rate) > 2500 ? 0.01 * s.price : 0);
    const vals = []; for (let n = 1; n <= maxN; n++) vals.push(pc(n));
    let yMax = Math.max(...vals.slice(0, 60)) * 1.05;
    const x = (n) => pl + (n - 1) / (maxN - 1) * (W - pl - pr);
    const y = (v) => pt + (1 - v / yMax) * (H - pt - pb);
    let path = '', area = `M${x(1)},${y(0)}`;
    for (let i = 0; i < vals.length; i++) { const n = i + 1; path += (i === 0 ? 'M' : 'L') + x(n).toFixed(1) + ',' + y(vals[i]).toFixed(1) + ' '; area += ` L${x(n).toFixed(1)},${y(vals[i]).toFixed(1)}`; }
    area += ` L${x(maxN)},${y(0)} Z`;
    let grid = '', yl = '';
    for (let g = 0; g <= 4; g++) { const vv = yMax * g / 4, yy = y(vv); grid += `<line class="gl" x1="${pl}" y1="${yy.toFixed(1)}" x2="${W - pr}" y2="${yy.toFixed(1)}"/>`; yl += `<text class="ax" x="${pl - 8}" y="${(yy + 3.5).toFixed(1)}" text-anchor="end">${fmt(vv)}</text>`; }
    let xl = ''; [1, 50, 100, 150, 200, 250].forEach((n) => { xl += `<text class="ax" x="${x(n).toFixed(1)}" y="${H - pb + 18}" text-anchor="middle">${n}</text>`; });
    const cx = x(s.N), cy = y(pc(s.N));
    q('[data-el="chart"]').innerHTML = grid + yl + xl
      + `<text class="ax" x="${pl - 8}" y="${pt - 4}" text-anchor="end">ريال</text>`
      + `<line class="asymp" x1="${pl}" y1="${y(asym).toFixed(1)}" x2="${W - pr}" y2="${y(asym).toFixed(1)}"/>`
      + `<path class="area" d="${area}"/><path class="curve" d="${path}"/>`
      + `<line class="mk" x1="${cx.toFixed(1)}" y1="${cy.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${H - pb}"/>`
      + `<line class="mk" x1="${pl}" y1="${cy.toFixed(1)}" x2="${cx.toFixed(1)}" y2="${cy.toFixed(1)}"/>`
      + `<circle class="dot" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="5.5"/>`;
    q('[data-el="now"]').textContent = `N=${s.N} → ${sar(pc(s.N))} ريال / كوتش`;
  }

  function buildTable(s) {
    const base = [10, 30, 50, 100, 200]; if (!base.includes(s.N)) base.push(s.N); base.sort((a, b) => a - b);
    q('[data-el="th_m"]').style.display = s.price > 0 ? '' : 'none';
    let html = '';
    base.forEach((N) => {
      const m = model(N, s.T, s.price, s.rate, s.v, s.buf);
      const marg = s.price > 0 ? `<td class="mono" style="color:${m.margin >= 0 ? 'var(--success)' : 'var(--error)'};font-weight:700">${sar(m.margin)}</td>` : '';
      html += `<tr class="${N === s.N ? 'cost-active' : ''}"><td>${fmt(N)}</td><td class="mono">${fmt(m.trainees)}</td><td class="mono">${fmt(m.total)}</td><td class="mono">${sar(m.perCoach)}</td><td class="mono">${m.perUser.toFixed(2)}</td><td class="mono">${s.price > 0 ? m.pct.toFixed(1) + '%' : '-'}</td>${marg}</tr>`;
    });
    q('[data-el="tbody"]').innerHTML = html;
  }

  function update() {
    const s = read();
    val('coaches', s.N); val('tpc', s.T); val('price', fmt(s.price));
    val('varc', s.v.toFixed(2)); val('buf', fmt(s.buf)); val('rate', s.rate.toFixed(2));
    const m = model(s.N, s.T, s.price, s.rate, s.v, s.buf);

    set('coach', `${sar(m.perCoach)}<span class="u">ريال</span>`); wrap.querySelector('[data-k="coach_f"]').textContent = `${fmt(m.total)} / ${fmt(s.N)} كوتش`;
    set('user', `${m.perUser.toFixed(2)}<span class="u">ريال</span>`); wrap.querySelector('[data-k="user_f"]').textContent = `${fmt(m.trainees)} متدرب`;
    set('total', `${fmt(m.total)}<span class="u">ريال</span>`); wrap.querySelector('[data-k="total_f"]').textContent = `${fmt(m.users)} مستخدم بالتطبيق`;

    const marginEl = wrap.querySelector('[data-k="margin"]');
    if (s.price > 0) {
      set('pct', `${m.pct.toFixed(1)}<span class="u">%</span>`); wrap.querySelector('[data-k="pct_f"]').textContent = `الدخل ${fmt(m.mrr)} ريال`;
      set('margin', `${sar(m.margin)}<span class="u">ريال</span>`); marginEl.className = 'n ' + (m.margin >= 0 ? 'pos' : 'neg');
      wrap.querySelector('[data-k="margin_f"]').textContent = `${fmt(s.price)} سعر ناقص ${sar(m.perCoach)} تكلفة`;
    } else {
      set('pct', '-'); wrap.querySelector('[data-k="pct_f"]').textContent = 'حدد سعر الكوتش';
      set('margin', '-'); marginEl.className = 'n'; wrap.querySelector('[data-k="margin_f"]').textContent = 'حدد سعر الكوتش';
    }

    const free = '<span class="cost-chip free">مجاني</span>';
    const rows = [
      ['Supabase Pro', 'قاعدة + Auth + تخزين + Realtime', fmt(m.supabase)],
      ['Apple Developer', '$99/سنة موزعة', fmt(m.apple)],
      ['Expo EAS', 'باقة ' + m.easTier + (m.eas === 0 ? free : ''), m.eas === 0 ? '0' : fmt(m.eas)],
      ['الدومين .sa', '~50 ريال/سنة', fmt(m.domain, 1)],
      ['RevenueCat', m.revcatActive ? '1% من الدخل' : 'تحت العتبة' + free, m.revcatActive ? fmt(m.revcat) : '0'],
      ['متغير (تخزين/نقل)', s.v.toFixed(2) + ' × ' + fmt(m.trainees) + ' متدرب', fmt(m.variable)],
      ['احتياطي', 'هامش أمان', fmt(m.buffer)],
    ];
    let h = '';
    rows.forEach((r) => { h += `<div class="brow"><div class="k"><b>${r[0]}</b><span>${r[1]}</span></div><div class="v mono">${r[2]}</div></div>`; });
    h += `<div class="brow tot"><div class="k"><b>الإجمالي الشهري</b></div><div class="v mono">${fmt(m.total)} ريال</div></div>`;
    q('[data-el="bd"]').innerHTML = h;

    drawChart(s);
    buildTable(s);
  }

  ids.forEach((id) => q('#cost_' + id).addEventListener('input', update));
  update();
  return wrap;
}
