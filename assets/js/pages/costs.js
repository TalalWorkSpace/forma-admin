// Feature: technical cost - two tabs. Default tab explains the cost model; the
// second is an interactive calculator. Fully client-side (no RPC). Fixed cost is
// built from real verified service prices; EAS and RevenueCat step with
// users/revenue. admin only (financials).
import { el } from '../ui.js';

export const meta = { id: 'costs', label: 'التكلفة التقنية', icon: 'calc', minRole: 'admin' };

// -- verified real prices (USD, 2026) --
const USD = { supabase: 25, apple: 99 / 12, easStarter: 19, easProd: 199, easEnt: 1000 };
const DOMAIN_MO = 50 / 12;

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

// ============ tab 1: explanation (general) ============
const EXPLAIN = `
  <div class="expl">
    <p class="expl-lede">كم يكلف تشغيل التطبيق شهريا، وليش كل رقم بهذا الحجم، وكيف تتغير التكلفة كل ما كبرنا. الأرقام مبنية على الأسعار الرسمية الحقيقية للخدمات (بالريال، والدولار = 3.75).</p>

    <div class="expl-sec">
      <div class="expl-kicker">الفكرة الأساسية</div>
      <h3>معظم التكلفة ثابتة، فتنزل مع التوسع</h3>
      <p>أغلب المصاريف <b>ثابتة</b>: تدفعها سواء عندك 10 كوتشز أو 500. الوحيد اللي يكبر مع الاستخدام هو التخزين والتوصيل. يعني كل ما زاد عدد الكوتشز، الثابت ينوزع على عدد أكبر، فتكلفة خدمة الكوتش الواحد <b>تنزل بسرعة</b>. النتيجة: التكلفة تبدأ بسيطة وتصير أبسط مع النمو.</p>
      <div class="expl-callout">القاعدة باختصار: <b>السيرفرات رخيصة وتبقى رخيصة. اللي يكبر مع نجاحك هو حصة RevenueCat (1% من الدخل) والتخزين، مو البنية التحتية.</b></div>
    </div>

    <div class="expl-sec">
      <div class="expl-kicker">البنود</div>
      <h3>من وش تتكون التكلفة</h3>
      <p>ست خدمات مدفوعة (أغلبها رمزي) وأربع مجانية. كل بند وسعره الحقيقي ووظيفته:</p>
      <div class="expl-svc">
        <div class="expl-item"><div class="nm">Supabase Pro <span class="ib fx">ثابت</span></div><div class="pr">94 ريال / شهر</div><div class="ds">العمود الفقري: قاعدة البيانات + تسجيل الدخول + التخزين + التحديث الحي. الباقة تشمل 100GB تخزين و250GB نقل و100 ألف مستخدم شهري. ($25، ثابت لين نتجاوز الحصص.)</div></div>
        <div class="expl-item"><div class="nm">Apple Developer <span class="ib fx">ثابت</span></div><div class="pr">31 ريال / شهر</div><div class="ds">رسوم إلزامية لنشر أي تطبيق على متجر Apple. تدفع سنويا $99 = ~31 ريال بالشهر. لا يمكن الاستغناء عنها ل iOS.</div></div>
        <div class="expl-item"><div class="nm">Expo EAS <span class="ib sc">يتدرج</span></div><div class="pr">مجاني ثم 71 ثم 746</div><div class="ds">بناء التطبيق وتحديثاته اللحظية (OTA). مجاني حتى ~1000 مستخدم نشط، ثم Starter ($19) حتى 3000، ثم Production ($199) حتى 50 ألف. يقفز درجة كل ما عبرنا عتبة.</div></div>
        <div class="expl-item"><div class="nm">RevenueCat <span class="ib sc">يتدرج مع الدخل</span></div><div class="pr">مجاني ثم 1%</div><div class="ds">يدير الاشتراكات والمشتريات داخل التطبيق. مجاني حتى دخل شهري ~9,375 ريال ($2,500)، وبعدها 1% من الدخل. يكبر مع <b>الدخل</b> مو مع عدد المستخدمين.</div></div>
        <div class="expl-item"><div class="nm">الدومين .sa <span class="ib fx">ثابت</span></div><div class="pr">4 ريال / شهر</div><div class="ds">اسم النطاق forma-app.sa. يدفع سنويا ~50 ريال = ~4 ريال بالشهر.</div></div>
        <div class="expl-item"><div class="nm">التخزين والتوصيل <span class="ib sc">مع الاستخدام</span></div><div class="pr">~0 حاليا</div><div class="ds">صور وفيديوهات التقدم. شبه مجاني الآن لأننا داخل حصة Supabase. يبدأ يكلف بس لو تجاوزنا 100GB تخزين او 250GB نقل شهري.</div></div>
        <div class="expl-item"><div class="nm">Resend · Sentry · Cloudflare · FCM <span class="ib">مجاني</span></div><div class="pr">0 ريال</div><div class="ds">رموز الدخول بالإيميل (Resend)، تتبع الأخطاء (Sentry)، الحماية و CDN و SSL (Cloudflare)، والإشعارات (FCM). كلها ضمن الباقات المجانية عند حجمنا.</div></div>
      </div>
    </div>

    <div class="expl-sec">
      <div class="expl-kicker">النمو</div>
      <h3>كيف تتغير التكلفة مع كل مرحلة</h3>
      <p>على أساس 30 متدرب لكل كوتش وسعر اشتراك 200 ريال. لاحظ القفزة عند 100 كوتش: هناك يعبر عدد المستخدمين 3000 فتقفز باقة EAS ل Production، ثم تكمل التكلفة نزول لكل كوتش كل ما وزعناها على أكثر.</p>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>المرحلة</th><th>كوتشز</th><th>متدربون</th><th>الإجمالي/شهر</th><th>لكل كوتش</th><th>لكل متدرب</th><th>% الدخل</th></tr></thead>
        <tbody>
          <tr><td>الإطلاق</td><td class="mono">30</td><td class="mono">900</td><td class="mono">~319</td><td class="mono">10.6</td><td class="mono">0.35</td><td class="mono">5.3%</td></tr>
          <tr><td>نمو مبكر</td><td class="mono">100</td><td class="mono">3,000</td><td class="mono">~1,475</td><td class="mono up">14.8</td><td class="mono">0.49</td><td class="mono">7.4%</td></tr>
          <tr><td>توسع</td><td class="mono">250</td><td class="mono">7,500</td><td class="mono">~2,225</td><td class="mono down">8.9</td><td class="mono">0.30</td><td class="mono">4.5%</td></tr>
          <tr><td>كبير</td><td class="mono">600</td><td class="mono">18,000</td><td class="mono">~3,975</td><td class="mono down">6.6</td><td class="mono">0.22</td><td class="mono">3.3%</td></tr>
          <tr><td>ضخم</td><td class="mono">1,000</td><td class="mono">30,000</td><td class="mono">~5,975</td><td class="mono down">6.0</td><td class="mono">0.20</td><td class="mono">3.0%</td></tr>
        </tbody>
      </table></div>
      <div class="note" style="margin-top:9px">الأرقام بالريال، تقديرية ومحافظة. القفزة عند 100 كوتش سببها عتبة EAS وتختفي مع مزيد من النمو.</div>
    </div>

    <div class="expl-sec">
      <div class="expl-kicker">التركيبة عند التوسع</div>
      <h3>وين تروح الفلوس عند 1,000 كوتش</h3>
      <p>عند أكبر مرحلة (30 ألف مستخدم، دخل 200 ألف ريال)، الإجمالي ~5,975 ريال. البنية التحتية الصافية (Supabase + Apple + دومين) تبقى <b>ضئيلة (~4%)</b>؛ اللي يكبر هو التخزين وحصة RevenueCat.</p>
      <div class="expl-bar">
        <span style="width:50.2%;background:#C6FF00">التخزين 50%</span>
        <span style="width:33.5%;background:#9AD000;color:#08160A">RevenueCat 34%</span>
        <span style="width:12.5%;background:#E0B23A">EAS 12%</span>
        <span style="width:3.8%;background:#7C8270"></span>
      </div>
      <div class="expl-legend">
        <div><i style="background:#C6FF00"></i><b>التخزين والتوصيل</b><span class="n mono">~3,000</span></div>
        <div><i style="background:#9AD000"></i><b>RevenueCat (1%)</b><span class="n mono">~2,000</span></div>
        <div><i style="background:#E0B23A"></i><b>Expo EAS</b><span class="n mono">~746</span></div>
        <div><i style="background:#7C8270"></i><b>البنية الثابتة</b><span class="n mono">~229</span></div>
      </div>
      <div class="expl-callout" style="margin-top:14px">التخزين هو الأكبر لكنه <b>قابل للتحسين</b> (ضغط الصور، حذف القديم). RevenueCat نسبة ثابتة من الدخل، يعني ما يزعجك إلا وأنت تكسب أصلا. السيرفرات نفسها تبقى ~200 ريال.</div>
    </div>

    <div class="expl-sec">
      <div class="expl-kicker">التصحيح</div>
      <h3>الفرق عن التقدير القديم</h3>
      <p>التقدير الأول كان فيه أرقام منفوخة وبنود ناقصة. هذا اللي تغير بعد المراجعة مقابل الأسعار الرسمية:</p>
      <div class="table-wrap"><table class="table">
        <thead><tr><th>البند</th><th>التقدير القديم</th><th>الصحيح</th><th>السبب</th></tr></thead>
        <tbody>
          <tr><td class="mono">Supabase Pro</td><td class="mono">375 ريال</td><td class="mono down">94 ريال</td><td>السعر الفعلي $25 مو $100</td></tr>
          <tr><td class="mono">الدومين</td><td class="mono">50/شهر</td><td class="mono down">4/شهر</td><td>السعر سنوي مو شهري</td></tr>
          <tr><td class="mono">Apple Developer</td><td class="mono">مفقود</td><td class="mono up">+31</td><td>رسوم إلزامية نسيت</td></tr>
          <tr><td class="mono">RevenueCat</td><td class="mono">مفقود</td><td class="mono up">+1% دخل</td><td>أكبر بند عند التوسع</td></tr>
        </tbody>
      </table></div>
      <div class="expl-compare">
        <div class="box old"><div class="t">تكلفة الإطلاق - القديم</div><div class="b mono">750 - 1,000</div></div>
        <div class="box new"><div class="t">تكلفة الإطلاق - الصحيح</div><div class="b mono">~230 - 320</div></div>
      </div>
    </div>

    <div class="expl-sec">
      <div class="expl-kicker">الخلاصة</div>
      <h3>باختصار</h3>
      <ul class="expl-take">
        <li><span class="ck"></span><div><b>الإطلاق يكلف ~320 ريال بالشهر</b>، ومعظمه Supabase + رسوم Apple.</div></li>
        <li><span class="ck"></span><div><b>تكلفة الكوتش الواحد تنزل مع النمو</b>، من ~11 ريال نحو 6 ريال، لأن الثابت ينوزع.</div></li>
        <li><span class="ck"></span><div><b>البنية التقنية دايما أقل من ~7% من الدخل</b> وتنزل نحو 3% مع التوسع.</div></li>
        <li><span class="ck"></span><div><b>اللي يكبر مع النجاح هو التخزين وحصة RevenueCat (1%)</b>، والتخزين قابل للتحسين. السيرفرات تبقى رخيصة.</div></li>
      </ul>
    </div>

    <div class="note" style="margin-top:26px;padding-top:18px;border-top:1px solid var(--dark-line)">تكلفة تشغيل البنية التقنية فقط. لا تشمل رسوم متجر Apple على المشتريات (15% الى 30%) لأنها خصم من الإيراد وليست تكلفة تشغيل، ولا الرواتب او التسويق. الأسعار محققة من صفحات التسعير الرسمية (2026).</div>
  </div>
`;

// ============ tab 2: calculator ============
const CALC = `
  <div class="cost-kpis">
    <div class="cost-kpi hero"><span class="lbl">تكلفة الكوتش / شهر</span><b class="n" data-k="coach">-</b><span class="foot" data-k="coach_f"></span></div>
    <div class="cost-kpi"><span class="lbl">تكلفة المتدرب / شهر</span><b class="n" data-k="user">-</b><span class="foot" data-k="user_f"></span></div>
    <div class="cost-kpi"><span class="lbl">الإجمالي / شهر</span><b class="n" data-k="total">-</b><span class="foot" data-k="total_f"></span></div>
    <div class="cost-kpi"><span class="lbl">من الدخل (infra)</span><b class="n" data-k="pct">-</b><span class="foot" data-k="pct_f"></span></div>
    <div class="cost-kpi"><span class="lbl">الربح لكل كوتش</span><b class="n" data-k="margin">-</b><span class="foot" data-k="margin_f"></span></div>
  </div>
  <div class="cost-grid">
    <div class="card">
      <h3>المدخلات</h3><div class="sub">القيم الافتراضية سيناريو واقعي متوسط.</div>
      <div class="cost-ctrl"><div class="top"><span>عدد الكوتشز</span><b class="mono" data-v="coaches">50</b></div><input type="range" id="cost_coaches" min="1" max="250" step="1" value="50"></div>
      <div class="cost-ctrl"><div class="top"><span>متدربين لكل كوتش</span><b class="mono" data-v="tpc">30</b></div><input type="range" id="cost_tpc" min="5" max="60" step="1" value="30"></div>
      <div class="cost-ctrl"><div class="top"><span>سعر اشتراك الكوتش / شهر</span><b class="mono" data-v="price">200</b></div><input type="range" id="cost_price" min="0" max="600" step="10" value="200"><div class="note">يحرك نسبة الدخل والربح ويفعل رسوم RevenueCat. صفره لتجاهله.</div></div>
      <div class="cost-row2">
        <div class="cost-ctrl"><div class="top"><span>متغير / متدرب</span><b class="mono" data-v="varc">0.10</b></div><input type="range" id="cost_varc" min="0" max="1.5" step="0.05" value="0.10"></div>
        <div class="cost-ctrl"><div class="top"><span>احتياطي / شهر</span><b class="mono" data-v="buf">100</b></div><input type="range" id="cost_buf" min="0" max="500" step="10" value="100"></div>
      </div>
      <div class="note">التخزين والنقل شبه مجاني داخل حصة Supabase (100GB تخزين، 250GB نقل).</div>
      <div class="cost-ctrl" style="margin-top:14px"><div class="top"><span>سعر الدولار (USD)</span><b class="mono" data-v="rate">3.75</b></div><input type="range" id="cost_rate" min="3.6" max="3.9" step="0.01" value="3.75"></div>
    </div>
    <div class="cost-main">
      <div class="card">
        <h3>التكلفة لكل كوتش مقابل عدد الكوتشز</h3><div class="sub">الثابت ينوزع كل ما زاد العدد فتنزل التكلفة. القفزات لأعلى عند تغير باقة EAS.</div>
        <div class="cost-chart-wrap"><svg class="cost-chart" data-el="chart" viewBox="0 0 620 300" preserveAspectRatio="xMidYMid meet" role="img" aria-label="منحنى التكلفة لكل كوتش"></svg></div>
        <div class="cost-chart-cap"><span class="leg"><i></i> التكلفة/كوتش <i class="d"></i> الأرضية الثابتة</span><span class="now mono" data-el="now"></span></div>
      </div>
      <div class="card"><h3>من وين تجي التكلفة</h3><div class="sub">تفصيل الإجمالي الشهري عند الإعداد الحالي.</div><div class="cost-bd" data-el="bd"></div></div>
    </div>
  </div>
  <div class="page-head" style="margin-top:22px;margin-bottom:12px"><h1 style="font-size:18px">سيناريوهات النمو</h1></div>
  <div class="table-wrap"><table class="table"><thead><tr>
    <th>الكوتشز</th><th>المتدربون</th><th>الإجمالي</th><th>لكل كوتش</th><th>لكل متدرب</th><th>% الدخل</th><th data-el="th_m">الربح/كوتش</th>
  </tr></thead><tbody data-el="tbody"></tbody></table></div>
`;

const MARKUP = `
  <div class="page-head"><h1>التكلفة التقنية</h1><p>شرح تكلفة تشغيل فورما، وحاسبة تفاعلية تجرب فيها السيناريوهات.</p></div>
  <div class="cost-tabs">
    <button class="cost-tab active" type="button" data-tab="explain">شرح التكلفة</button>
    <button class="cost-tab" type="button" data-tab="calc">الحاسبة</button>
  </div>
  <div class="cost-panel" data-panel="explain">${EXPLAIN}</div>
  <div class="cost-panel" data-panel="calc" hidden>${CALC}</div>
`;

export function render() {
  const wrap = el('div', {});
  wrap.innerHTML = MARKUP;
  const q = (sel) => wrap.querySelector(sel);

  // -- tabs --
  const tabs = wrap.querySelectorAll('.cost-tab');
  const panels = wrap.querySelectorAll('.cost-panel');
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((x) => x.classList.toggle('active', x === t));
    panels.forEach((p) => { p.hidden = p.getAttribute('data-panel') !== t.getAttribute('data-tab'); });
  }));

  // -- calculator wiring --
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
    const yMax = Math.max(...vals.slice(0, 60)) * 1.05;
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
