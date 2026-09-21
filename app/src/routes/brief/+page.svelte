<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { loadAll, loadSignals, loadDeskStatus, loadDeskCopytrade, loadPaper, loadXsForward, loadPerpSignals, loadHealth } from '$lib/data.js';
  import { fmtUsd, fmtPct, shortAddr } from '$lib/format.js';
  import { walletHref } from '$lib/wallets.js';

  // Дневной срез: то, что изменилось за последние сутки, одним экраном.
  // Всё считается из уже собранных data/*.json — новых запросов к API нет.
  const RAW = 'https://raw.githubusercontent.com/xpyct1337/ton-quant/main/data';
  const j = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)).catch(() => null);

  let st = $state('loading');
  let err = $state('');
  let today = $state('');
  let yesterday = $state('');
  let symOf = {};

  let moversUp = $state([]);
  let moversDown = $state([]);
  let deskNote = $state('');
  let newHighRiskWallets = $state([]);
  let newHighRiskTokens = $state([]);
  let newCopyOk = $state([]);
  let topConviction = $state([]);
  let copytrade = $state(null);
  let bundlers = $state([]);
  let buyerConc = $state([]);
  let socialSpikes = $state([]);
  let paperBots = $state([]);
  let xsLast = $state(null);
  let xsOpen = $state(null);
  let perpFeed = $state([]);
  let health = $state(null);
  let healthIssues = $state([]);

  const healthName = { snapshot: 'နေ့စဉ်အနှစ်ချုပ်', intraday: 'နေ့တွင်း', wallets: 'wallet များ', flows: 'စီးဆင်းမှု', social: 'လူမှုကွန်ရက်', forensics: 'စုံစမ်းစစ်ဆေးမှု', signals: 'အချက်ပြများ', xs_forward: 'XS-momentum', perp_markets: 'perp ဈေးကွက်များ', perp_signals: 'TG perps', dex_signals: 'DEX TG', desk: 'ဒက်စ်' };
  function healthState(h) {
    const now = Date.now();
    return Object.entries(h?.sources || {}).filter(([, s]) => {
      if (s.status === 'error' || s.status === 'missing') return true;
      const age = s.updated_at ? (now - new Date(s.updated_at).getTime()) / 3600000 : Infinity;
      return age > (s.max_age_h ?? Infinity);
    });
  }

  function pctBot(equity) {
    if (!equity || equity.length < 2) return null;
    const a = equity[equity.length - 2].v, b = equity[equity.length - 1].v;
    return a ? ((b - a) / a) * 100 : null;
  }

  onMount(() => {
    (async () => {
      try {
        const [d, sig, verdicts, ct, paper, xs, perp, h] = await Promise.all([
          loadAll(), loadSignals(), loadDeskStatus(), loadDeskCopytrade(),
          loadPaper(), loadXsForward(), loadPerpSignals(), loadHealth()
        ]);
        health = h;
        healthIssues = healthState(h);
        symOf = Object.fromEntries(d.rows.map((r) => [r.addr, r.sym]));
        const dates = d.dates;
        today = dates[dates.length - 1];
        yesterday = dates[dates.length - 2] || today;

        const core = d.rows.filter((r) => r.core && r.d1 != null);
        moversUp = [...core].sort((a, b) => b.d1 - a.d1).slice(0, 5);
        moversDown = [...core].sort((a, b) => a.d1 - b.d1).slice(0, 5);

        // Деск: что нового во вчерашних vs сегодняшних вердиктах
        const prevV = await j(`${RAW}/desk/verdicts/${yesterday}.json`);
        const prevW = new Map((prevV?.wallets || []).map((w) => [w.addr, w]));
        const prevT = new Map((prevV?.tokens || []).map((t) => [t.sym, t]));
        const W = verdicts?.wallets || [], T = verdicts?.tokens || [];
        deskNote = verdicts ? `${verdicts.date} · မော်ဒယ် ${verdicts.model}` : '';
        newHighRiskWallets = W.filter((w) => w.manip_risk === 'high' && prevW.get(w.addr)?.manip_risk !== 'high');
        newHighRiskTokens = T.filter((t) => t.manip_risk === 'high' && prevT.get(t.sym)?.manip_risk !== 'high');
        newCopyOk = W.filter((w) => w.copy_ok && !prevW.get(w.addr)?.copy_ok);
        topConviction = [...W].filter((w) => w.copy_ok).sort((a, b) => b.conviction - a.conviction).slice(0, 5);
        copytrade = ct;

        // Форензика/потоки/соцсети — сегодня vs вчера
        const [forT, flowT, socT, socY] = await Promise.all([
          j(`${RAW}/forensics/${today}.json`), j(`${RAW}/flows/${today}.json`),
          j(`${RAW}/social/${today}.json`), j(`${RAW}/social/${yesterday}.json`)
        ]);
        bundlers = Object.entries(forT?.tokens || {})
          .map(([addr, f]) => ({ addr, sym: symOf[addr] || shortAddr(addr), ...f }))
          .filter((f) => f.bundle > 0.15).sort((a, b) => b.bundle - a.bundle).slice(0, 5);
        buyerConc = Object.entries(flowT?.tokens || {})
          .map(([addr, f]) => ({ addr, sym: symOf[addr] || shortAddr(addr), ...f }))
          .filter((f) => f.trades_n >= 20 && f.buyer_conc >= 0.6).sort((a, b) => b.buyer_conc - a.buyer_conc).slice(0, 5);
        const socYmap = new Map(Object.entries(socY?.tokens || {}));
        socialSpikes = Object.entries(socT?.tokens || {})
          .map(([addr, s]) => ({ addr, sym: symOf[addr] || shortAddr(addr), mentions: s.mentions, delta: s.mentions - (socYmap.get(addr)?.mentions || 0) }))
          .filter((s) => s.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5);

        // Paper-боты и xsmom forward-test
        paperBots = Object.entries(paper.bots || {}).map(([name, b]) => ({
          name, total: b.cash + (b.positions || []).reduce((s, p) => s + p.size, 0),
          d1: pctBot(b.equity), openPositions: (b.positions || []).length
        }));
        xsLast = xs.records?.[xs.records.length - 1] || null;
        xsOpen = xs.state || null;
        perpFeed = (perp?.signals || []).slice(0, 6);

        st = 'ready';
      } catch (e) {
        st = 'error'; err = String(e.message || e);
      }
    })();
  });

  const cls = (v) => (v > 0 ? 'good' : v < 0 ? 'bad' : '');
</script>

<svelte:head><title>နေ့စဉ်အနှစ်ချုပ် — TON Quant</title></svelte:head>

<header class="hd">
  <h1>နေ့စဉ်အနှစ်ချုပ်</h1>
  {#if today}<span class="muted upd">{today}{yesterday && yesterday !== today ? ` · ${yesterday} နှင့် နှိုင်းယှဉ်` : ''}</span>{/if}
  <p class="muted lead">စုဆောင်းထားသော ဒေတာအားလုံးအရ ၂၄ နာရီအတွင်း ပြောင်းလဲမှုများ — ဈေးကွက်၊ ဒက်စ် (အန္တရာယ်/copy-feed)၊ စုံစမ်းစစ်ဆေးမှု၊ လူမှုကွန်ရက်၊ စမ်းသပ် bot များနှင့် perp များ။ စာမျက်နှာအားလုံး လှည့်မကြည့်ရအောင် တစ်မျက်နှာတည်း ပြထားသည်။</p>
</header>

{#if st === 'loading'}
  <div class="muted pad">အနှစ်ချုပ် ပြင်ဆင်နေသည်…</div>
{:else if st === 'error'}
  <div class="card bad">ဒေတာ ရယူ၍မရပါ: {err}</div>
{:else}

  {#if health?.sources}
    <section class="health {healthIssues.length ? 'warn' : 'ok'}">
      <i class="ti {healthIssues.length ? 'ti-alert-triangle' : 'ti-circle-check'}"></i>
      {#if healthIssues.length}
        <span>ဒေတာစုဆောင်းမှု အာရုံစိုက်ရန် လိုသည်: {healthIssues.map(([name, s]) => `${healthName[name] || name}${s.status === 'error' ? ' — အမှား' : ' — ဟောင်းနေပြီ'}`).join(' · ')}</span>
      {:else}
        <span>ဒေတာစုဆောင်းမှု ပုံမှန်ဖြစ်သည်: ရင်းမြစ် {Object.keys(health.sources).length} ခု လတ်ဆတ်သည်။</span>
      {/if}
    </section>
  {/if}

  <section class="card">
    <div class="sec-title">ဈေးကွက် 24 နာရီ <span class="muted">· «core» ထဲမှ တက်/ကျ ထိပ်တန်း 5 ခု (stablecoin နှင့် အတုအယောင် market cap များ ချန်လှပ်)</span></div>
    <div class="cols2">
      <div>
        <div class="grp-title good">တက်နေသည်</div>
        {#each moversUp as m}<div class="row"><a class="sym" href="{base}/token?a={m.addr}">{m.sym}</a><span class="mono {cls(m.d1)}">{fmtPct(m.d1)}</span></div>{/each}
        {#if !moversUp.length}<p class="muted sm">ဒေတာ မရှိပါ။</p>{/if}
      </div>
      <div>
        <div class="grp-title bad">ကျနေသည်</div>
        {#each moversDown as m}<div class="row"><a class="sym" href="{base}/token?a={m.addr}">{m.sym}</a><span class="mono {cls(m.d1)}">{fmtPct(m.d1)}</span></div>{/each}
        {#if !moversDown.length}<p class="muted sm">ဒေတာ မရှိပါ။</p>{/if}
      </div>
    </div>
  </section>

  <section class="card">
    <div class="sec-title">AI Desk <span class="muted">· {deskNote || 'ဆုံးဖြတ်ချက် မရှိသေးပါ'}</span></div>
    <p class="muted sm">ဒက်စ်သည် roster ထဲရှိ wallet/token များပေါ်တွင် LLM agent များကို run ပြီး ကိုင်လှုပ်မှုအန္တရာယ် + «copy လုပ်နိုင်သည်» အလံကို သတ်မှတ်သည်။ ဤနေရာတွင် မနေ့ကနှင့် ကွာခြားချက်ကို ပြထားသည်။</p>
    {#if !deskNote}
      <p class="muted sm">ဒက်စ်က ဆုံးဖြတ်ချက် မရေးသေးပါ — ပထမဆုံး run ပြီးမှ ဤအပိုင်း ပေါ်လာမည်။</p>
    {:else}
      {#if newHighRiskWallets.length}
        <div class="grp-title bad">အန္တရာယ်မြင့် wallet အသစ်များ</div>
        {#each newHighRiskWallets as w}<div class="row"><a class="sym" href={walletHref(base, w.addr)}>{w.name || shortAddr(w.addr)}</a><span class="muted sm reason">{w.reason}</span></div>{/each}
      {/if}
      {#if newHighRiskTokens.length}
        <div class="grp-title bad">အန္တရာယ်မြင့် token အသစ်များ</div>
        {#each newHighRiskTokens as t}<div class="row">{#if t.addr}<a class="sym" href="{base}/token?a={t.addr}">{t.sym}</a>{:else}<span class="sym">{t.sym}</span>{/if}<span class="muted sm reason">{t.reason}</span></div>{/each}
      {/if}
      {#if newCopyOk.length}
        <div class="grp-title good">«copy လုပ်နိုင်သည်» အသစ်များ</div>
        {#each newCopyOk as w}<div class="row"><a class="sym" href={walletHref(base, w.addr)}>{w.name || shortAddr(w.addr)}</a><span class="mono">ယုံကြည်မှု {w.conviction}</span></div>{/each}
      {/if}
      <div class="grp-title">ယနေ့ ဒက်စ်၏ ယုံကြည်မှု အမြင့်ဆုံးများ</div>
      {#if topConviction.length}
        {#each topConviction as w}<div class="row"><a class="sym" href={walletHref(base, w.addr)}>{w.name || shortAddr(w.addr)}</a><span class="mono good">ယုံကြည်မှု {w.conviction}</span></div>{/each}
      {:else}<p class="muted sm">လက်ရှိ wallet တစ်ခုမှ စိစစ်မှု (vetting) မအောင်မြင်ပါ (အားလုံး copy_ok=false) — ဒက်စ်က roster ကို အန္တရာယ်ရှိသည်ဟု ယူဆသည်။</p>{/if}
      {#if !newHighRiskWallets.length && !newHighRiskTokens.length && !newCopyOk.length}
        <p class="muted sm">မနေ့ကနှင့်စာလျှင် အန္တရာယ် ပြင်းထန်စွာ ပြောင်းလဲမှု မရှိပါ။</p>
      {/if}
      {#if copytrade}
        <div class="grp-title">Copy-feed စစ်ဆေးမှု <span class="muted">· ကာလ {copytrade.horizon} ရက်</span></div>
        <p class="muted sm">{copytrade.note} Baseline copy-all: {fmtPct(copytrade.copy_all.avg * 100)} ပျမ်းမျှ ({copytrade.copy_all.win_rate}% အမြတ်ရသည်){copytrade.comparison_ready ? `; desk-filter — ${fmtPct(copytrade.copy_desk.avg * 100)}.` : '.'}</p>
      {/if}
    {/if}
  </section>

  <section class="card">
    <div class="sec-title">သံသယဖြစ်ဖွယ် လှုပ်ရှားမှု <span class="muted">· စုံစမ်းစစ်ဆေးမှု + အရောင်းအဝယ်စီးဆင်းမှု၊ နောက်ဆုံးအခြေအနေ</span></div>
    <p class="muted sm">«Bundle» — ငွေလွှဲမှုအစုအဖွဲ့တစ်ခုတည်းမှ ဝင်လာသော holder များ၏ အချိုး (စီစဉ်ထားသော ဝင်ရောက်မှု/ဖြန့်ဝေမှုနှင့် ဆင်တူသည်)။ «Buyer conc.» — ဝယ်ယူပမာဏ မည်မျှသည် လိပ်စာအနည်းငယ်မှ လာသနည်း (bot များ ဖြစ်နိုင်သည်)။</p>
    {#if bundlers.length}
      <div class="grp-title bad">Bundle-score မြင့်</div>
      {#each bundlers as b}<div class="row"><a class="sym" href="{base}/token?a={b.addr}">{b.sym}</a><span class="mono bad">bundle {(b.bundle * 100).toFixed(0)}%</span><span class="muted sm">cluster {b.clusters} ခု၊ အများဆုံး {b.max_cluster}</span></div>{/each}
    {/if}
    {#if buyerConc.length}
      <div class="grp-title bad">ဝယ်သူ စုစည်းမှု</div>
      {#each buyerConc as f}<div class="row"><a class="sym" href="{base}/token?a={f.addr}">{f.sym}</a><span class="mono bad">{(f.buyer_conc * 100).toFixed(0)}% — လိပ်စာ {f.ubuyers} ခုမှ</span><span class="muted sm">{f.trades_n} ခု အရောင်းအဝယ်</span></div>{/each}
    {/if}
    {#if !bundlers.length && !buyerConc.length}<p class="muted sm">လက်ရှိအခြေအနေတွင် သံသယဖြစ်ဖွယ် မတွေ့ပါ။</p>{/if}
  </section>

  <section class="card">
    <div class="sec-title">လူမှုကွန်ရက် <span class="muted">· စောင့်ကြည့်နေသော TG channel များတွင် $TICKER ဖော်ပြမှု ရုတ်တရက်တိုးခြင်း</span></div>
    {#if socialSpikes.length}
      {#each socialSpikes as s}<div class="row"><a class="sym" href="{base}/token?a={s.addr}">{s.sym}</a><span class="mono">{s.mentions} ကြိမ် ဖော်ပြ <span class="good">(+{s.delta})</span></span></div>{/each}
    {:else}<p class="muted sm">သိသာသော ဖော်ပြမှုတိုးမြင့်ခြင်း မရှိပါ။</p>{/if}
  </section>

  <section class="card">
    <div class="sec-title">စမ်းသပ် bot များနှင့် momentum forward-test</div>
    {#each paperBots as b}
      <div class="row"><span class="sym">{b.name}</span>
        <span class="mono {cls(b.d1)}">{b.d1 != null ? fmtPct(b.d1) + ' (တစ်ရက်အတွင်း)' : '—'}</span>
        <span class="muted sm">{fmtUsd(b.total)} · ဖွင့်ထားသော position {b.openPositions} ခု</span></div>
    {/each}
    {#if xsLast}
      <div class="grp-title">XS-momentum · နောက်ဆုံး ပိတ်ပြီး rotation</div>
      <div class="row"><span class="mono {cls(xsLast.net)}">{fmtPct(xsLast.net * 100)}</span><span class="muted sm">{xsLast.long.length} long / {xsLast.short.length} short</span></div>
    {/if}
    {#if xsOpen}
      <p class="muted sm">လက်ရှိ ဖွင့်ထားသည်: {xsOpen.long?.length || 0} long / {xsOpen.short?.length || 0} short ({new Date(xsOpen.bar_ts).toISOString().slice(0, 10)} မှစ၍)။</p>
    {/if}
    {#if !paperBots.length && !xsLast}<p class="muted sm">စမ်းသပ် bot ဒေတာ မရှိပါ။</p>{/if}
  </section>

  <section class="card">
    <div class="sec-title">Perp အချက်ပြများ <span class="muted">· @perptools_ai_bot feed၊ နောက်ဆုံးများ</span></div>
    {#if perpFeed.length}
      {#each perpFeed as p}<div class="row"><span class="sym">{p.coin}</span><span class="muted sm">{p.kind}{p.pct != null ? ' ' + fmtPct(p.pct) : ''}</span><span class="muted sm">{new Date(p.ts * 1000).toLocaleString()}</span></div>{/each}
    {:else}<p class="muted sm">အချက်ပြ မရှိပါ (TG collector မသတ်မှတ်ရသေး သို့မဟုတ် ဗလာဖြစ်နေသည်)။</p>{/if}
  </section>

  <p class="muted foot">အားလုံးကို စုဆောင်းပြီးသား <code>data/*.json</code> မှ client-side တွင် တွက်ချက်ထားသည် — API သို့ တောင်းဆိုမှုအသစ် မရှိပါ။ ဘဏ္ဍာရေးအကြံပေးချက် မဟုတ်ပါ။</p>
{/if}

<style>
  .hd{margin-bottom:16px}
  h1{font-size:24px;display:inline}
  .upd{font-size:12px;margin-left:10px}
  .lead{max-width:640px;margin-top:8px;font-size:13px;line-height:1.6}
  .health{display:flex;gap:8px;align-items:center;border-radius:10px;padding:9px 12px;margin-bottom:16px;font-size:13px}
  .health.ok{color:var(--good);background:rgba(22,199,132,.08);border:1px solid rgba(22,199,132,.25)}
  .health.warn{color:#f0b35c;background:rgba(240,153,58,.1);border:1px solid rgba(240,153,58,.35)}
  .health i{font-size:16px;flex:none}
  .pad{padding:30px 0}
  section{margin-bottom:16px}
  .sec-title{display:flex;align-items:baseline;gap:8px;margin-bottom:8px;flex-wrap:wrap}
  .sm{font-size:12px;line-height:1.5}
  .cols2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
  .grp-title{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin:12px 0 6px}
  .grp-title:first-of-type{margin-top:0}
  .row{display:flex;align-items:center;gap:10px;padding:6px 0;border-top:1px solid var(--border);flex-wrap:wrap}
  .row:first-of-type{border-top:none}
  .sym{font-weight:500;min-width:64px}
  .reason{flex:1}
  .good{color:var(--good)}.bad{color:var(--bad)}
  .foot{font-size:11px;margin-top:14px;line-height:1.6;max-width:720px}
  code{font-size:11px}
  @media(max-width:700px){.cols2{grid-template-columns:1fr}}
</style>
