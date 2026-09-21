<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { fmtPct } from '$lib/format.js';
  import { loadSignals } from '$lib/data.js';

  const RAW = 'https://raw.githubusercontent.com/xpyct1337/ton-quant/main/data';
  const PERP_URL = RAW + '/perp_signals.json';
  const DEX_URL  = RAW + '/dex_signals.json';

  let st    = $state('loading');
  let bot   = $state(null);
  let dex   = $state(null);
  let botMeta = $state(null); // file exists but zero signals: collector runs, parser found nothing
  let dexMeta = $state(null);
  let chain = $state(null);
  let date  = $state('');

  onMount(async () => {
    const [botR, dexR, sigR] = await Promise.allSettled([
      fetch(PERP_URL).then((r) => (r.ok ? r.json() : null)),
      fetch(DEX_URL).then((r)  => (r.ok ? r.json() : null)),
      loadSignals()
    ]);
    if (botR.status === 'fulfilled' && botR.value) {
      if (botR.value.signals?.length) bot = botR.value;
      else botMeta = botR.value;
    }
    if (dexR.status === 'fulfilled' && dexR.value) {
      if (dexR.value.signals?.length) dex = dexR.value;
      else dexMeta = dexR.value;
    }
    if (sigR.status === 'fulfilled') {
      const s = sigR.value;
      if (s.today?.signals?.length) { chain = s; date = s.date || ''; }
    }
    st = 'ready';
  });

  const sideCls  = (side) => (side === 'long' || side === 'buy' ? 'good' : side === 'short' || side === 'sell' ? 'bad' : '');
  const sideTxt  = (side) => side?.toUpperCase() ?? '—';
  const KIND_TXT = { vol_spike: 'ပမာဏ ရုတ်တရက်တိုး', oi_spike: 'OI ရုတ်တရက်တိုး', price_spike: 'ဈေးနှုန်း ရုတ်တရက်ပြောင်း', funding_spike: 'FUNDING' };
  const fmtPctS  = (p) => (p >= 0 ? '+' : '') + p + '%';
  const tradeTxt = (s) => [
    s.entry != null ? 'entry ' + s.entry : null,
    s.tps?.length ? 'tp ' + s.tps.join('/') : null,
    s.sl != null ? 'sl ' + s.sl : null,
    s.lev ? s.lev + 'x' : null
  ].filter(Boolean).join(' · ') || '—';
  const fmtTime  = (ts) => new Date(typeof ts === 'number' ? ts * 1000 : ts).toLocaleString();
  const VERD_MY = { edge: 'edge ရှိ', noise: 'noise', neutral: 'ကြားနေ', collecting: 'စုဆောင်းနေ' };
  const verdCls  = (v) => (v === 'edge' ? 'good' : v === 'noise' ? 'bad' : 'muted');
  const sigScore = (sig, scores) => scores?.by_signal?.[sig];
</script>

<svelte:head><title>TG အချက်ပြများ — TON Quant</title></svelte:head>

<header class="hd">
  <h1><i class="ti ti-brand-telegram"></i> TG အချက်ပြများ</h1>
  <span class="muted">Telegram channel များမှ အချက်ပြများ + စောင့်ကြည့်နေသော jetton များ၏ on-chain ဖြစ်ရပ်များ</span>
</header>

{#if st === 'loading'}
  <div class="muted pad">အချက်ပြများ ရယူနေသည်…</div>
{:else}

  <!-- @perptools_ai_bot -->
  <section class="card tw">
    <div class="sec-title">
      <i class="ti ti-robot"></i> @perptools_ai_bot
      {#if bot}<span class="muted">· ပြင်ဆင်ချိန် {fmtTime(bot.updated)}</span>{/if}
    </div>
    {#if !bot}
      {#if botMeta}
        <p class="muted sm">ချိတ်ဆက်ထားပြီး (ပြင်ဆင်ချိန် {fmtTime(botMeta.updated)})၊ သို့သော် သိရှိနိုင်သော အချက်ပြ မရှိသေးပါ — bot ၏ နောက်ဆုံး မက်ဆေ့ချ်များတွင် parser က coin+direction အတွဲကို မတွေ့ပါ။</p>
      {:else}
        <p class="muted sm">ဒေတာ မရှိပါ — GitHub Actions တွင် <code>TG_SESSION</code> secret ကို သတ်မှတ်ပြီးမှ အချက်ပြများ ပေါ်လာမည်။</p>
      {/if}
    {:else}
      <table>
        <thead><tr>
          <th>အချိန်</th><th>Coin</th><th>အချက်ပြ</th><th>အသေးစိတ်</th>
        </tr></thead>
        <tbody>
          {#each bot.signals.slice(0, 50) as s}
            <tr>
              <td class="muted">{fmtTime(s.ts)}</td>
              <td><span class="sym">{s.coin}</span></td>
              {#if s.kind && s.kind !== 'trade'}
                <td class={s.pct >= 0 ? 'good' : 'bad'}>{KIND_TXT[s.kind] ?? s.kind}</td>
                <td class="mono">{fmtPctS(s.pct)}{s.win ? ` (${s.win} မိနစ်အတွင်း)` : ''}</td>
              {:else}
                <td class={sideCls(s.side)}>{sideTxt(s.side)}</td>
                <td class="mono">{tradeTxt(s)}</td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>

  <!-- @dexnewtoken -->
  <section class="card tw">
    <div class="sec-title">
      <i class="ti ti-currency-dollar"></i> @dexnewtoken
      {#if dex}<span class="muted">· ပြင်ဆင်ချိန် {fmtTime(dex.updated)}</span>{/if}
    </div>
    {#if !dex}
      {#if dexMeta}
        <p class="muted sm">ချိတ်ဆက်ထားပြီး (ပြင်ဆင်ချိန် {fmtTime(dexMeta.updated)})၊ သို့သော် channel ၏ နောက်ဆုံး မက်ဆေ့ချ်များတွင် သိရှိနိုင်သော အချက်ပြ မရှိပါ။</p>
      {:else}
        <p class="muted sm">ဒေတာ မရှိပါ — collector မလည်ပတ်ရသေးပါ၊ «Perp signals» workflow ၏ နောက်တစ်ကြိမ် run (၄ နာရီတစ်ကြိမ်) ပြီးမှ ဖိုင်ပေါ်လာမည်။</p>
      {/if}
    {:else}
      <table>
        <thead><tr>
          <th>ရက်စွဲ</th><th>Token</th><th>အချက်ပြ</th><th>Network</th>
          <th class="r">ဈေးနှုန်း</th><th>လိပ်စာ</th>
        </tr></thead>
        <tbody>
          {#each dex.signals.slice(0, 50) as s}
            <tr>
              <td class="muted">{fmtTime(s.dt)}</td>
              <td>{#if s.addr}<a class="sym" href="{base}/token?a={s.addr}">{s.sym ?? s.name ?? '—'}</a>{:else}<span class="sym">{s.sym ?? s.name ?? '—'}</span>{/if}</td>
              {#if s.side}
                <td class={sideCls(s.side)}>{sideTxt(s.side)}</td>
              {:else if s.kind === 'listing'}
                <td class="muted">listing</td>
              {:else}
                <td>—</td>
              {/if}
              <td class="muted">{s.chain ?? '—'}</td>
              <td class="r mono">{s.price ?? '—'}{s.target ? ' → ' + s.target : ''}</td>
              <td class="mono muted">{s.addr ? s.addr.slice(0, 8) + '…' + s.addr.slice(-6) : '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>

  <!-- On-chain signal events (daily tracked set) -->
  <section class="card tw">
    <div class="sec-title">
      <i class="ti ti-circuit-diode"></i> On-chain ဖြစ်ရပ်များ
      {#if date}<span class="muted">· {date}</span>{/if}
    </div>
    {#if !chain}
      <p class="muted sm">ယနေ့အတွက် ဒေတာ မရှိပါ — snapshot သည် 03:10 UTC နောက်တွင် ပေါ်လာမည်။</p>
    {:else}
      <table>
        <thead><tr>
          <th>Jetton</th><th>အချက်ပြ</th><th class="r">ဈေးနှုန်း</th>
          <th class="r">TVL</th><th class="r">Vol 24 နာရီ</th>
          <th class="r">အလေးချိန်</th><th>ဆုံးဖြတ်ချက်</th>
        </tr></thead>
        <tbody>
          {#each chain.today.signals as s}
            {@const sc = sigScore(s.sig, chain.scores)}
            <tr>
              <td>{#if s.addr}<a class="sym" href="{base}/token?a={s.addr}">{s.sym ?? s.addr.slice(0, 6)}</a>{:else}<span class="sym">{s.sym ?? '—'}</span>{/if}</td>
              <td class="sig-name">{s.sig.replace(/_/g, ' ')}</td>
              <td class="r mono">{s.price != null ? '$' + s.price.toPrecision(4) : '—'}</td>
              <td class="r mono">{s.tvl != null ? '$' + Math.round(s.tvl / 1000) + 'K' : '—'}</td>
              <td class="r mono">{s.vol24 != null ? '$' + Math.round(s.vol24 / 1000) + 'K' : '—'}</td>
              <td class="r mono">{s.w ?? '—'}</td>
              <td>
                {#if sc}
                  <span class="pill {verdCls(sc.verdict)}">{VERD_MY[sc.verdict] ?? sc.verdict}</span>
                  {#if sc.d1_mean != null}<span class="mono muted">{fmtPct(sc.d1_mean)}</span>{/if}
                {:else}
                  <span class="muted sm">စုဆောင်းနေသည်</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>

  <p class="foot muted">
    @perptools_ai_bot: bot နှင့် ကိုယ်ပိုင် chat မှ အချက်ပြများကို Telethon ဖြင့် ရယူသည် (scripts/perp_signals.py၊ workflow ၄ နာရီတစ်ကြိမ်)။
    @dexnewtoken: အများပြည်သူ channel ဖြစ်ပြီး t.me/s ကို parse လုပ်သည် (scripts/dex_signals.py)။
    On-chain ဖြစ်ရပ်များ: စောင့်ကြည့်နေသော jetton 24 ခုပေါ်ရှိ momentum, liq_inflow, breakout စသည့် pattern များ၊ ဆုံးဖြတ်ချက် (edge/noise/collecting) ကို တကယ်ရရှိပြီးသော forward ပြန်အမြတ်များအရ ချမှတ်သည်။
    ဘဏ္ဍာရေးအကြံပေးချက် မဟုတ်ပါ။
  </p>
{/if}

<style>
  .hd{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;margin-bottom:18px}
  .hd i{color:var(--accent);font-size:22px}
  h1{font-size:24px;display:flex;align-items:center;gap:8px}
  .pad{padding:30px 0}
  section{margin-bottom:16px}
  .sm{font-size:13px;line-height:1.5}
  .sec-title{display:flex;align-items:center;gap:8px;margin-bottom:10px;font-weight:500}
  .sec-title i{font-size:16px;color:var(--accent)}
  table{width:100%;border-collapse:collapse;font-size:13px}.tw{overflow-x:auto}
  th{color:var(--dim);font-weight:400;text-align:left;padding:6px 9px;font-size:11px;white-space:nowrap}
  td{padding:8px 9px;border-top:1px solid var(--border);white-space:nowrap}
  .r{text-align:right}
  .sym{font-weight:500}
  .sig-name{text-transform:lowercase;color:var(--muted)}
  .pill{font-size:11px;padding:2px 8px;border-radius:6px;background:var(--card2)}
  .pill.good{color:var(--good)}.pill.bad{color:var(--bad)}.pill.muted{color:var(--muted)}
  .good{color:var(--good)}.bad{color:var(--bad)}
  code{background:var(--card2);padding:1px 6px;border-radius:5px;font-family:var(--mono)}
  .foot{font-size:11px;margin-top:14px;line-height:1.6;max-width:740px}
</style>
