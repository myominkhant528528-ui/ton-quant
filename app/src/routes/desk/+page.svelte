<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { loadDeskStatus, loadDeskCalibration, loadDeskFactors, loadDeskCopytrade, loadUniverse } from '$lib/data.js';
  import { staleHours } from '$lib/metrics.js';

  let status = $state(undefined);   // undefined=loading, null=not run, obj=ran
  let calib = $state(undefined);
  let factors = $state(undefined);
  let copytrade = $state(undefined);
  let universe = $state([]);

  // Old desk runs wrote truncated addresses ("EQA6VT7WUn…") as sym; resolve them to
  // real tickers via the universe (prefix match) or the addr field newer runs carry.
  let byAddr = $derived(new Map(universe.map((t) => [t.addr, t.sym])));
  function tokName(t) {
    if (t.addr && byAddr.get(t.addr)) return byAddr.get(t.addr);
    if (!/^[EU]Q.{7,}…$/.test(t.sym)) return t.sym;
    const pre = t.sym.slice(0, -1);
    const hit = universe.find((u) => u.addr.startsWith(pre));
    return hit ? hit.sym : t.sym;
  }
  function tokAddr(t) {
    if (t.addr) return t.addr;
    if (!/^[EU]Q.{7,}…$/.test(t.sym)) return null;
    const pre = t.sym.slice(0, -1);
    return universe.find((u) => u.addr.startsWith(pre))?.addr || null;
  }

  const pct = (x) => (x == null ? '—' : (x >= 0 ? '+' : '') + (x * 100).toFixed(1) + '%');
  const sign = (x) => (x == null ? '' : x >= 0 ? 'good' : 'bad');

  let wallets = $derived(status?.wallets || []);
  let tokens = $derived(status?.tokens || []);
  let copyOk = $derived(wallets.filter((w) => w.copy_ok).length);
  let wRisk = $derived.by(() => {
    const r = { low: 0, med: 0, high: 0 };
    for (const w of wallets) if (w.manip_risk in r) r[w.manip_risk]++;
    return r;
  });
  let highTokens = $derived(tokens.filter((t) => t.manip_risk === 'high'));
  // the LIVE badge must not lie: if the last run is >48h old, the worker is silent
  let silentH = $derived.by(() => {
    const h = status?.date ? staleHours(status.date) : null;
    return h != null && h > 48 ? Math.round(h) : null;
  });

  // calibration headline: +7d avg excess return by risk bucket
  let h7 = $derived(calib?.feature_backtest?.['+7d']);
  let bundle = $derived(calib?.bundle_backtest);
  let calBars = $derived.by(() => {
    if (!h7) return null;
    const rows = [['low', h7.low?.avg], ['med', h7.med?.avg], ['high', h7.high?.avg]]
      .map(([k, v]) => ({ k, v: v ?? 0, n: h7[k]?.n ?? 0 }));
    const max = Math.max(...rows.map((r) => Math.abs(r.v)), 0.0001);
    return rows.map((r) => ({ ...r, w: Math.max(3, Math.round((Math.abs(r.v) / max) * 100)) }));
  });

  // researcher
  let active = $derived(factors?.active || []);
  let fcount = $derived.by(() => {
    const c = { proposed: 0, promoted: 0, rejected: 0, demoted: 0 };
    for (const e of factors?.history || []) if (e.action in c) c[e.action]++;
    return c;
  });

  onMount(async () => {
    loadUniverse().then((u) => (universe = u.tokens || [])).catch(() => {});
    status = await loadDeskStatus();
    calib = await loadDeskCalibration();
    factors = await loadDeskFactors();
    copytrade = await loadDeskCopytrade();
  });
</script>

<svelte:head><title>TON Quant — AI ဒက်စ်</title></svelte:head>

<div class="desk">
  <!-- HERO -->
  <header class="hero">
    {#if silentH}
      <div class="eyebrow off"><span class="dot off"></span> WORKER တိတ်ဆိတ်နေသည် · နောက်ဆုံး run {silentH} နာရီ အကြာ</div>
    {:else}
      <div class="eyebrow"><span class="dot"></span> တိုက်ရိုက် · 24/7 worker</div>
    {/if}
    <h1>AI Smart-Money <span class="grad">ဒက်စ်</span></h1>
    <p class="lede">MacBook M1 ပေါ်ရှိ local LLM သည် ၂၄ နာရီပတ်လုံး smart-money wallet များကို စိစစ်ကာ ကိုင်လှုပ်မှုကို ဖယ်ရှားပြီး စာရင်းအင်း gate အောက်တွင် alpha factor များကို ကိုယ်တိုင်ရှာဖွေသည်။</p>
    <div class="meta">
      {#if status}
        <span><b>{status.date}</b> run</span>
        <span class="mono">{status.model}</span>
        <span>Osaurus · MLX</span>
      {:else if status === null}
        <span class="muted">ဒက်စ် မစတင်ရသေးပါ</span>
      {:else}
        <span class="muted">ဖွင့်နေသည်…</span>
      {/if}
    </div>
  </header>

  <!-- Calibration is a diagnostic, not a proof of edge. -->
  <section class="proof">
    <div class="proof-head">
      <span class="kicker">အန္တရာယ် calibration</span>
      <span class="muted small">ကိုင်လှုပ်မှုအန္တရာယ် bucket အလိုက် token များ၏ +7 ရက်အကြာ forward excess ပြန်အမြတ်</span>
    </div>
    {#if calib === undefined}
      <div class="muted pad">calibration တွက်နေသည်…</div>
    {:else if !calBars}
      <div class="muted">Calibration သည် worker ၏ ပထမဆုံး run ပြီးမှ ပေါ်လာမည်။</div>
    {:else}
      <div class="proof-grid">
        <div class="bignum">
          <span class="big {sign(h7.high?.avg)}">{pct(h7.high?.avg)}</span>
          <span class="big-cap">အန္တရာယ်မြင့် token များ၊ +7 ရက်</span>
          <span class="verdict {calib.signal_separates_at_7d ? 'warn' : 'bad'}">
            {calib.signal_separates_at_7d ? 'monotonic ဖြစ်သည်: high < med < low · ပဏာမ' : 'monotonic ဖြစ်ခြင်း အတည်မပြုနိုင်ပါ'}
          </span>
        </div>
        <div class="bars">
          {#each calBars as b}
            <div class="barrow">
              <span class="blab r-{b.k}">{b.k}</span>
              <div class="btrack"><div class="bfill {sign(b.v)}" style="width:{b.w}%"></div></div>
              <span class="bval {sign(b.v)} mono">{pct(b.v)}</span>
              <span class="bn muted">n={b.n}</span>
            </div>
          {/each}
        </div>
      </div>
      <p class="muted small note-line">snapshot {calib.snapshots} ခု · LLM မပါသော ပျမ်းမျှ excess ပြန်အမြတ်များ။ ၎င်းသည် အခြေအနေစစ်ဆေးမှုသာ ဖြစ်သည် — confidence interval နှင့် စာရင်းအင်းအခြေခံ ကောက်ချက်ချမှု မရှိသေးပါ။</p>
      {#if bundle}<p class="muted small note-line">bundle &gt;20%: {pct(bundle.high?.avg)} (n={bundle.high?.n ?? 0}) vs {pct(bundle.low?.avg)} (n={bundle.low?.n ?? 0}) · {bundle.candidate && bundle.available ? (bundle.confidence?.passed ? 'confidence gate အောင်မြင်ပြီး' : 'confidence/OOS gate မအောင်မြင်ပါ') : 'ဒေတာ မလုံလောက်သေးပါ'}</p>{/if}
      {#if calib.momentum_test}<p class="muted small note-line">mom_7d &lt; -0.1: OOS {pct(calib.momentum_test.oos?.avg)} (n={calib.momentum_test.oos?.n ?? 0}) · {calib.momentum_test.passed ? 'confidence gate အောင်မြင်ပြီး' : 'IS/OOS gate ပယ်ချခံရ'}</p>{/if}
    {/if}
  </section>

  <!-- KPI strip -->
  <section class="kpis">
    <div class="kpi"><span class="kl">wallet အရေအတွက်</span><span class="kv">{wallets.length}</span></div>
    <div class="kpi"><span class="kl">copy_ok</span><span class="kv good">{copyOk}</span></div>
    <div class="kpi"><span class="kl">အလံပြထားသော token</span><span class="kv bad">{highTokens.length}</span></div>
    <div class="kpi"><span class="kl">အန္တရာယ် L/M/H</span><span class="kv"><span class="good">{wRisk.low}</span><span class="sep">/</span><span class="warn">{wRisk.med}</span><span class="sep">/</span><span class="bad">{wRisk.high}</span></span></div>
  </section>

  <div class="cols">
    <!-- COPY-TRADING -->
    <section class="card">
      <div class="ttl"><i class="ti ti-arrows-split"></i> Copy-trading · baseline</div>
      {#if copytrade === undefined}
        <div class="muted pad">ရယူနေသည်…</div>
      {:else if !copytrade}
        <div class="muted small">Worker run ပြီးမှ ပေါ်လာမည် — roster wallet အားလုံးကို copy လုပ်ခြင်း နှင့် <code>copy_ok</code> ဖြင့် စိစစ်ပြီးသည်များကိုသာ copy လုပ်ခြင်း နှိုင်းယှဉ်ချက်။</div>
      {:else}
        <div class="duel">
          <div class="side">
            <span class="sl">copy-all</span>
            <span class="sv {sign(copytrade.copy_all.avg)}">{pct(copytrade.copy_all.avg)}</span>
            <span class="sn muted">n={copytrade.copy_all.n} · အနိုင် {copytrade.copy_all.win_rate}%</span>
          </div>
          {#if copytrade.comparison_ready}
            <div class="vs">vs</div>
            <div class="side">
              <span class="sl">copy-desk</span>
              <span class="sv {sign(copytrade.copy_desk.avg)}">{pct(copytrade.copy_desk.avg)}</span>
              <span class="sn muted">n={copytrade.copy_desk.n}</span>
            </div>
          {/if}
        </div>
        {#if copytrade.comparison_ready}<div class="edge {sign(copytrade.edge)}">edge desk−all: {pct(copytrade.edge)}</div>{/if}
        {#if copytrade.point_in_time}<div class="muted small">point-in-time: ပိတ်ပြီး entry {copytrade.covered_signals ?? 0} ခု · verdict ရက်စွဲ {copytrade.verdict_dates ?? 0} ခု</div>{/if}
        {#if copytrade.note}<p class="muted small">{copytrade.note}</p>{/if}
      {/if}
    </section>

    <!-- RESEARCHER -->
    <section class="card">
      <div class="ttl"><i class="ti ti-flask"></i> သုတေသီ Agent</div>
      {#if factors === undefined}
        <div class="muted pad">ရယူနေသည်…</div>
      {:else}
        <div class="rstats">
          <span class="chip"><b>{active.length}</b>/8 အသုံးပြုနေ</span>
          <span class="chip">ကြိုးစားမှု {fcount.proposed} ကြိမ်</span>
          <span class="chip good">promote {fcount.promoted} ခု</span>
          <span class="chip muted">reject {fcount.rejected} ခု</span>
        </div>
        {#if active.length}
          <div class="flist">
            {#each active as f}
              <div class="frow"><span class="mono">{f.id}</span><span class="muted small">{f.direction} · oos_lo {f.metrics?.oos?.wilson_lo ?? '—'}</span></div>
            {/each}
          </div>
        {:else}
          <p class="muted small">Gate သည် တင်းကျပ်သည် (walk-forward OOS၊ anti-overfit) — မှတ်တမ်းတိုလျှင် မည်သည့်အရာမျှ မကျော်လွန်နိုင်ပါ။ Snapshot များ စုဆောင်းလာသည်နှင့်အမျှ အမှန်တကယ် factor များ ပေါ်လာမည်။</p>
        {/if}
      {/if}
    </section>
  </div>

  <!-- FLAGGED TOKENS FEED -->
  <section class="card">
    <div class="ttl"><i class="ti ti-alert-triangle"></i> အလံပြထားသော token များ <span class="muted small">manip_risk: high</span></div>
    {#if status === undefined}
      <div class="muted pad">ရယူနေသည်…</div>
    {:else if !highTokens.length}
      <div class="muted small">နောက်ဆုံး run တွင် အန္တရာယ်မြင့် token မရှိပါ။</div>
    {:else}
      <div class="chips">
        {#each highTokens.slice(0, 24) as t}
          {@const a = tokAddr(t)}
          {#if a}
            <a class="tok" href="{base}/token?a={a}" title={t.reason || ''}>{tokName(t)}{#if t.flags?.length}<span class="tflags">{t.flags.slice(0, 2).join(' ')}</span>{/if}</a>
          {:else}
            <span class="tok" title={t.reason || ''}>{tokName(t)}{#if t.flags?.length}<span class="tflags">{t.flags.slice(0, 2).join(' ')}</span>{/if}</span>
          {/if}
        {/each}
        {#if highTokens.length > 24}<span class="tok more">+{highTokens.length - 24}</span>{/if}
      </div>
    {/if}
  </section>

  <footer class="foot muted small">
    Runtime: Osaurus (Apple-MLX) · <span class="mono">qwen3-4b-4bit</span> · launchd 24/7 · floors တင်းကျပ်သည် (wash-ban သည် အမြဲ high)။
    တပ်ဆင်မှုနှင့် လည်ပတ်မှု — <code>docs/DESK-SETUP-m1.md</code>။ ဤစာမျက်နှာသည် ဖတ်ရုံသာ (static) ဖြစ်ပြီး ဒက်စ်က repo သို့ verdict များ ရေးသည်။
  </footer>
</div>

<style>
  .desk { max-width: 920px; }
  .desk > * { animation: rise .5s cubic-bezier(.2, .7, .2, 1) both; }
  .desk > :nth-child(1) { animation-delay: .02s }
  .desk > :nth-child(2) { animation-delay: .08s }
  .desk > :nth-child(3) { animation-delay: .14s }
  .desk > :nth-child(4) { animation-delay: .20s }
  .desk > :nth-child(5) { animation-delay: .26s }
  .desk > :nth-child(6) { animation-delay: .32s }
  @keyframes rise { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
  @media (prefers-reduced-motion: reduce) { .desk > * { animation: none } }

  .muted { color: var(--muted) }
  .small { font-size: 12px }
  .mono { font-family: var(--mono) }
  .pad { padding: 14px 0 }
  .good { color: var(--good) } .bad { color: var(--bad) } .warn { color: var(--warn) }
  code { font-family: var(--mono); font-size: .92em; color: var(--text) }

  /* hero */
  .hero { margin: 4px 0 22px }
  .eyebrow { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700;
    letter-spacing: .12em; color: var(--good); text-transform: uppercase; margin-bottom: 12px }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--good); animation: pulse 2s infinite }
  .eyebrow.off { color: var(--warn) }
  .dot.off { background: var(--warn); animation: none }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(22,199,132,.5) } 70% { box-shadow: 0 0 0 9px rgba(22,199,132,0) } 100% { box-shadow: 0 0 0 0 rgba(22,199,132,0) } }
  h1 { font-family: var(--head); font-size: clamp(30px, 6vw, 46px); font-weight: 800;
    line-height: 1.02; letter-spacing: -.02em; margin: 0 }
  .grad { background: linear-gradient(100deg, var(--accent), var(--good)); -webkit-background-clip: text;
    background-clip: text; color: transparent }
  .lede { color: var(--muted); font-size: 15px; line-height: 1.55; max-width: 60ch; margin: 12px 0 0 }
  .meta { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 14px; font-size: 13px }
  .meta b { color: var(--text) }

  /* proof */
  .proof { background: linear-gradient(160deg, var(--card2), var(--card));
    border: 1px solid var(--border); border-radius: 16px; padding: 20px; margin-bottom: 16px;
    position: relative; overflow: hidden }
  .proof::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 2px;
    background: linear-gradient(90deg, var(--accent), var(--good), transparent) }
  .proof-head { display: flex; flex-direction: column; gap: 3px; margin-bottom: 16px }
  .kicker { font-family: var(--head); font-size: 13px; font-weight: 700; color: var(--text) }
  .proof-grid { display: grid; grid-template-columns: minmax(150px, .8fr) 1.4fr; gap: 22px; align-items: center }
  .bignum { display: flex; flex-direction: column; gap: 4px }
  .big { font-family: var(--head); font-size: clamp(34px, 7vw, 52px); font-weight: 800; line-height: 1; letter-spacing: -.03em }
  .big-cap { font-size: 12px; color: var(--muted) }
  .verdict { font-size: 12px; font-weight: 700; margin-top: 6px }
  .bars { display: flex; flex-direction: column; gap: 9px }
  .barrow { display: grid; grid-template-columns: 42px 1fr 56px 44px; align-items: center; gap: 10px }
  .blab { font-size: 12px; font-weight: 700; text-transform: uppercase }
  .r-low { color: var(--good) } .r-med { color: var(--warn) } .r-high { color: var(--bad) }
  .btrack { height: 8px; background: rgba(255,255,255,.05); border-radius: 6px; overflow: hidden }
  .bfill { height: 100%; border-radius: 6px }
  .bfill.good { background: linear-gradient(90deg, rgba(22,199,132,.25), var(--good)) }
  .bfill.bad { background: linear-gradient(90deg, rgba(246,70,93,.25), var(--bad)) }
  .bval { font-size: 13px; font-weight: 700; text-align: right }
  .bn { font-size: 11px; text-align: right }
  .note-line { margin: 14px 0 0 }

  /* kpi strip */
  .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 16px }
  .kpi { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 12px 14px;
    display: flex; flex-direction: column; gap: 4px }
  .kl { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em }
  .kv { font-family: var(--head); font-size: 22px; font-weight: 700 }
  .sep { color: var(--border); margin: 0 2px }

  /* two-column cards */
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px }
  @media (max-width: 680px) { .cols { grid-template-columns: 1fr } .proof-grid { grid-template-columns: 1fr } }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 15px 16px; margin-bottom: 16px }
  .cols .card { margin-bottom: 0 }
  .ttl { font-family: var(--head); font-size: 14px; font-weight: 700; display: flex; align-items: center;
    gap: 8px; margin-bottom: 12px }
  .ttl .small { font-weight: 400 }

  /* copy-trading duel */
  .duel { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; margin: 6px 0 12px }
  .side { display: flex; flex-direction: column; gap: 3px; text-align: center }
  .sl { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em }
  .sv { font-family: var(--head); font-size: 26px; font-weight: 800 }
  .sn { font-size: 11px }
  .vs { font-size: 11px; color: var(--muted); font-weight: 700 }
  .edge { text-align: center; font-size: 13px; font-weight: 700; padding: 8px; border-radius: 9px;
    background: rgba(255,255,255,.03) }

  /* researcher */
  .rstats { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 10px }
  .chip { font-size: 12px; padding: 4px 9px; border-radius: 20px; background: var(--card2); border: 1px solid var(--border) }
  .chip b { font-family: var(--head) }
  .flist { display: flex; flex-direction: column; gap: 6px }
  .frow { display: flex; justify-content: space-between; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px }
  .frow:last-child { border-bottom: none }

  /* flagged tokens */
  .chips { display: flex; flex-wrap: wrap; gap: 8px }
  .tok { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600;
    padding: 5px 10px; border-radius: 9px; background: rgba(246,70,93,.14); color: var(--text); border: 1px solid rgba(246,70,93,.25) }
  .tok .tflags { font-family: var(--mono); font-size: 10px; color: var(--bad); font-weight: 500 }
  .tok.more { background: var(--card2); color: var(--muted); border-color: var(--border) }

  .foot { margin-top: 8px; line-height: 1.6; border-top: 1px solid var(--border); padding-top: 14px }
</style>
