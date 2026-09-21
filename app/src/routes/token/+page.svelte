<script>
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { base } from '$app/paths';
  import { loadToken, loadTrades, liveRates } from '$lib/data.js';
  import { fmtUsd, fmtPct, fmtNum, shortAddr } from '$lib/format.js';
  import { human, chartChange24 } from '$lib/token.js';
  import PriceChart from '$lib/components/PriceChart.svelte';
  import StackedBar from '$lib/components/StackedBar.svelte';

  let st = $state('loading');
  let d = $state(null);
  let err = $state('');
  let showAll = $state(false);
  let unitTon = $state(false);
  let trades = $state([]);

  // display labels (raw values from token.js stay English so logic/classes keep working)
  const TIER_MY = { 'Whale-dominated': 'Whale လွှမ်းမိုးမှု', Mixed: 'ရောနှော', Distributed: 'ပြန့်ကျဲ' };
  const HHI_MY = { distributed: 'ပြန့်ကျဲ', moderate: 'အလယ်အလတ်', concentrated: 'စုစည်း' };
  const EDGE_MY = { edge: 'edge ရှိ', noise: 'noise', collecting: 'စုဆောင်းနေ', 'multi-day': 'ရက်များစွာ' };

  // 24h change strictly from the ts-aware chart (same source as the plotted line)
  let d24 = $derived(chartChange24(d?.chart));

  let thesis = $derived.by(() => {
    if (!d) return '';
    const parts = [];
    parts.push(d.score.score >= 70 ? 'အခြေခံအားသာချက် ခိုင်မာသည်' : d.score.score >= 45 ? 'အခြေခံအားသာချက် ရောထွေးသည်' : 'အခြေခံအားသာချက် အားနည်းသည်');
    if (d.mvrv != null) parts.push(d.mvrv > 1.2 ? 'ဈေးနှုန်းသည် ပျမ်းမျှကုန်ကျစရိတ်ထက် သိသိသာသာ မြင့်နေသည် (အမြတ်/ဈေးပူလွန်းသည့် ဇုန်)' : d.mvrv < 0.9 ? 'ဈေးနှုန်းသည် ကုန်ကျစရိတ်အောက်တွင်ရှိသည် (လက်လျှော့ခြင်း/တန်ဖိုးနိမ့်ခြင်း)' : 'ဈေးနှုန်းသည် ပျမ်းမျှကုန်ကျစရိတ်အနီးတွင် ရှိသည်');
    parts.push(d.tiers.verdict === 'Whale-dominated' ? 'holder များသည် whale များထံ စုစည်းနေသည်' : d.tiers.verdict === 'Distributed' ? 'holder များ ပြန့်ကျဲနေသည်' : 'စုစည်းမှု ရောထွေးသည်');
    const edgeHit = d.edge.find((e) => e.verdict === 'edge');
    if (edgeHit) parts.push(`ကျွန်ုပ်တို့၏ «${edgeHit.sig}» အချက်ပြသည် သမိုင်းကြောင်းအရ edge ရှိသည်`);
    return parts.join(' · ') + '။';
  });

  const ago = (ts) => { const s = (Date.now() - new Date(ts).getTime()) / 1000; return s < 60 ? Math.round(s) + ' စက္ကန့်' : s < 3600 ? Math.round(s / 60) + ' မိနစ်' : s < 86400 ? Math.round(s / 3600) + ' နာရီ' : Math.round(s / 86400) + ' ရက်'; };

  // live price/mcap refresh — chart, holders etc. stay as loaded
  async function refreshLive(a) {
    if (!d) return;
    const r = await liveRates([a]);
    const p = r[a];
    if (p > 0) {
      if (d.price > 0) d.mcap = d.mcap * p / d.price;
      d.price = p;
      d.priceTon = d.tonUsd ? p / d.tonUsd : d.priceTon;
    }
  }

  onMount(() => {
    const a = $page.url.searchParams.get('a');
    if (!a) { st = 'noaddr'; return; }
    (async () => {
      try { d = await loadToken(a); st = 'ready'; loadTrades(a).then((t) => (trades = t)).catch(() => {}); } catch (e) { err = e.message; st = 'error'; }
    })();
    const iv = setInterval(() => { if (!document.hidden) refreshLive(a); }, 60000);
    const onVis = () => { if (!document.hidden) refreshLive(a); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(iv); document.removeEventListener('visibilitychange', onVis); };
  });
</script>

<svelte:head><title>{d ? d.name + ' — TON Quant' : 'Token — TON Quant'}</title></svelte:head>

{#if st === 'loading'}<div class="muted pad">jetton ၏ onchain ဒေတာများ ရယူနေသည်…</div>
{:else if st === 'noaddr'}
  <div class="card"><h2 class="sec-title">Jetton လိပ်စာ မထည့်ထားပါ</h2><p class="muted">စာမျက်နှာကို <code>/token?a=ADDRESS</code> အဖြစ် ဖွင့်ပါ — သို့မဟုတ် <a href="{base}/">ဈေးကွက်</a> တွင် jetton တစ်ခု ရွေးပါ။</p></div>
{:else if st === 'error'}<div class="card bad">အမှား: {err}</div>
{:else}
  <header class="hero">
    <div class="hl">
      {#if d.image}<img class="ava" src={d.image} alt="" />{/if}
      <div>
        <div class="nm"><h1>{d.name}</h1><span class="sym muted">{d.symbol}</span></div>
        <div class="tags">
          {#if d.verification === 'whitelist'}<span class="pill good">အတည်ပြုပြီး</span>{/if}
          {#if d.verification === 'blacklist'}<span class="pill bad">blacklist ဖြစ်နေသည်</span>{/if}
          {#if d.adminZero}<span class="pill good">mint စွန့်လွှတ်ပြီး</span>{:else}<span class="pill warn">mint ဆက်လက်အလုပ်လုပ်နေသည်</span>{/if}
          {#if d.taxable}<span class="pill warn">အခွန်ရှိသည်</span>{/if}
          {#if d.lowLiq}<span class="pill warn">liquidity နည်းသည်</span>{/if}
          <span class="addr muted mono">{shortAddr(d.addr)}</span>
          {#if d.pairs.length}
            <a class="pill tv-link" href={d.pairs[0].url || 'https://dexscreener.com/ton/' + d.addr} target="_blank" rel="noopener"><i class="ti ti-chart-candle"></i> TradingView</a>
          {/if}
        </div>
      </div>
    </div>
    <div class="hr">
      <div class="score" class:good={d.score.score >= 70} class:warn={d.score.score >= 45 && d.score.score < 70} class:bad={d.score.score < 45}>
        <div class="snum mono">{d.score.score}</div><div class="slbl muted">TON Quant ရမှတ်</div>
      </div>
      <div class="price">
        <button class="unit" onclick={() => (unitTon = !unitTon)}>{unitTon ? 'TON' : 'USD'}</button>
        <div class="pv mono">{unitTon ? (d.priceTon != null ? d.priceTon.toPrecision(4) + ' TON' : '—') : fmtUsd(d.price)}</div>
        {#if d24 != null}<div class="pd mono" class:good={d24 > 0} class:bad={d24 < 0} title="~24 နာရီအတွင်း ဈေးနှုန်းဇယားအရ ပြောင်းလဲမှု">{fmtPct(d24)} 24 နာရီ</div>{/if}
      </div>
    </div>
  </header>

  <div class="thesis"><i class="ti ti-bulb"></i><span>{thesis}</span></div>

  <section class="kpis">
    <div class="kc"><div class="kl">Market cap</div><div class="kv mono">{fmtUsd(d.mcap)}</div></div>
    <div class="kc"><div class="kl">Holder များ</div><div class="kv mono">{fmtNum(d.holders)}</div>{#if d.growth}<div class="kd mono" class:good={d.growth.pct > 0} class:bad={d.growth.pct < 0}>{d.growth.pct >= 0 ? '▲' : '▼'}{Math.abs(d.growth.pct).toFixed(1)}% {d.growth.days} ရက်</div>{/if}</div>
    <div class="kc"><div class="kl">DEX liquidity</div><div class="kv mono">{fmtUsd(d.liq)}</div></div>
    <div class="kc"><div class="kl">ပမာဏ 24 နာရီ</div><div class="kv mono">{fmtUsd(d.vol)}</div></div>
    <div class="kc"><div class="kl">Top-10 ကိုင်ထားမှု</div><div class="kv mono">{d.top10 != null ? d.top10.toFixed(1) + '%' : '—'}</div></div>
    <div class="kc"><div class="kl">MVRV-lite</div><div class="kv mono" class:good={d.mvrv > 1} class:bad={d.mvrv < 1}>{d.mvrv != null ? d.mvrv.toFixed(2) : '—'}</div></div>
  </section>

  <!-- THE leap: quant synthesis -->
  <section class="grid2">
    <div class="card">
      <div class="sec-title">ကုန်ကျစရိတ်အခြေခံ · MVRV-lite</div>
      <div class="big mono" class:good={d.mvrv > 1} class:bad={d.mvrv < 1}>{d.mvrv != null ? d.mvrv.toFixed(2) + '×' : '—'}</div>
      <p class="muted sm">{d.mvrv == null ? 'ဈေးနှုန်း မှတ်တမ်း နည်းသည်' : d.mvrv > 1.2 ? 'ဈေးကွက်သည် holder များ၏ ပျမ်းမျှကုန်ကျစရိတ်ထက် မြင့်နေသည် — မထုတ်ယူရသေးသော အမြတ်များစွာရှိသည် (အမြတ်ထုတ်ယူမှု အန္တရာယ်)။' : d.mvrv < 0.9 ? 'ဈေးကွက်သည် ပျမ်းမျှကုန်ကျစရိတ်အောက်တွင် ရှိသည် — holder များ ပျမ်းမျှအားဖြင့် ရှုံးနေသည် (လက်လျှော့ဇုန်)။' : 'ဈေးကွက်သည် ပျမ်းမျှကုန်ကျစရိတ်အနီးတွင်ရှိသည် — မျှခြေ။'}</p>
      {#if d.inProfit != null}<div class="profitbar"><div class="pf" style="width:{d.inProfit}%"></div></div><div class="muted sm">≈{d.inProfit.toFixed(0)}% မှတ်တမ်းကာလသည် လက်ရှိဈေးထက် နိမ့်သည် (proxy «အမြတ်ရနေသည်»)</div>{/if}
    </div>
    <div class="card">
      <div class="sec-title">ဤ jetton ပေါ်ရှိ ကျွန်ုပ်တို့၏ အချက်ပြမှတ်တမ်း</div>
      {#if !d.curated}
        <p class="muted sm">ဤ jetton သည် စောင့်ကြည့်နေသော 24 ခုအတွင်း မပါဝင်ပါ — အချက်ပြမှတ်တမ်း/bot များ မရှိပါ။</p>
      {:else if d.edge.length}
        {#each d.edge as e}
          <div class="edge"><span class="sym">{e.sig.replace(/_/g, ' ')}</span> <span class="pill {e.verdict === 'edge' ? 'good' : e.verdict === 'noise' ? 'bad' : 'muted'}">{EDGE_MY[e.verdict] ?? e.verdict}</span>{#if e.d1 != null}<span class="muted mono">{fmtPct(e.d1)}</span>{/if}</div>
        {/each}
      {:else}<p class="muted sm">ယနေ့ အချက်ပြ မရှိပါ။ Jetton ကို စောင့်ကြည့်နေသည် — မှတ်တမ်း စုဆောင်းနေသည်။</p>{/if}
      <div class="sec-title" style="margin-top:14px">ဤ jetton ပေါ်ရှိ စမ်းသပ် bot</div>
      {#if d.track.n || d.track.positions.length}
        <div class="sm">အရောင်းအဝယ်: <b>{d.track.n}</b> · နိုင် {d.track.wins} / ရှုံး {d.track.losses} · ရရှိပြီး အမြတ် <span class="mono" class:good={d.track.realized > 0} class:bad={d.track.realized < 0}>{fmtUsd(d.track.realized)}</span>{#if d.track.positions.length} · ဖွင့်ထားသည် {d.track.positions.length}{/if}</div>
      {:else}<p class="muted sm">Bot များ ဤ jetton ကို မကုန်သွယ်ရသေးပါ။</p>{/if}
    </div>
  </section>

  <section class="card"><div class="sec-title">ဈေးနှုန်း <span class="muted">· {d.chart.length > 1 ? d.chart[0].d + ' → ' + d.chart[d.chart.length - 1].d : ''} · အမှတ် {d.chart.length} ခု · တန်ဖိုးကြည့်ရန် ထိပါ</span></div>{#if d.chart.length > 2}<PriceChart points={d.chart} />{:else}<p class="muted sm">ဈေးနှုန်း မှတ်တမ်း မလုံလောက်ပါ။</p>{/if}</section>

  <section class="card">
    <div class="sec-title">Holder ဖွဲ့စည်းပုံ <span class="muted">· {TIER_MY[d.tiers.verdict] ?? d.tiers.verdict} ({d.tiers.whalePct.toFixed(0)}%)</span>{#if d.hhi}<span class="pill {d.hhi.cls}" style="margin-left:8px">HHI {HHI_MY[d.hhi.label] ?? d.hhi.label}</span>{/if}</div>
    <StackedBar buckets={d.tiers.buckets} />
  </section>

  {#if d.collect && (d.collect.flow || d.collect.spread != null || d.collect.topPool != null || d.collect.mentions != null)}
    <section class="card">
      <div class="sec-title">စီးဆင်းမှုနှင့် ဖွဲ့စည်းပုံ <span class="muted">· နေ့စဉ်စုဆောင်းမှု{d.collect.flowDate ? ' · ' + d.collect.flowDate : ''}</span></div>
      <div class="cgrid">
        {#if d.collect.flow}
          <div class="ci"><div class="kl">ထူးခြားသော ဝယ်သူ 24 နာရီ</div><div class="kv mono">{d.collect.flow.ubuyers}</div><div class="kd muted">{d.collect.flow.trades_n} ခု အရောင်းအဝယ်</div></div>
          <div class="ci"><div class="kl" title="ထိပ်တန်းဝယ်သူများ၏ ဝယ်ယူပမာဏ အချိုး — ~1.0 = wallet တစ်ခု နှစ်ခုက ပမာဏတစ်ခုလုံးကို လှည့်ပတ်နေသည် (bot များ)၊ နိမ့်ခြင်း = သဘာဝအတိုင်း">ဝယ်သူ စုစည်းမှု</div>
            <div class="kv mono" class:bad={d.collect.flow.buyer_conc >= 0.9} class:warn={d.collect.flow.buyer_conc >= 0.7 && d.collect.flow.buyer_conc < 0.9}>{(d.collect.flow.buyer_conc * 100).toFixed(0)}%</div>
            <div class="kd muted">{d.collect.flow.buyer_conc >= 0.9 ? 'ပမာဏတစ်ခုလုံး — wallet ၂ ခုခန့်' : d.collect.flow.buyer_conc >= 0.7 ? 'ဝယ်သူ အုပ်စု သေးငယ်သည်' : 'သဘာဝအတိုင်း (organic)'}</div></div>
          <div class="ci"><div class="kl">ဝယ်ယူမှု အချိုး</div><div class="kv mono">{(d.collect.flow.buy_share * 100).toFixed(0)}%</div><div class="kd muted">ပမာဏအတွင်း ဝယ်ယူမှု အချိုး</div></div>
        {/if}
        {#if d.collect.spread != null}
          <div class="ci"><div class="kl" title="DEX pool များအကြား ဈေးကွာဟမှု — မြင့်ခြင်း = ကွဲပြားခြင်း/ကိုင်လှုပ်မှု">Pool အချင်းချင်း spread</div><div class="kv mono" class:warn={d.collect.spread > 2}>{d.collect.spread.toFixed(2)}%</div></div>
        {/if}
        {#if d.collect.topPool != null}
          <div class="ci"><div class="kl" title="အကြီးဆုံး pool ရှိ TVL အချိုး — ~100% = liquidity အားလုံး တစ်နေရာတည်းတွင်ရှိသည် (ကျိုးပဲ့လွယ်)">ထိပ်တန်း pool အချိုး</div><div class="kv mono" class:warn={d.collect.topPool > 0.95}>{(d.collect.topPool * 100).toFixed(0)}%</div></div>
        {/if}
        {#if d.collect.mentions != null}
          <div class="ci"><div class="kl">TG ဖော်ပြမှုများ</div><div class="kv mono">{d.collect.mentions}</div><div class="kd muted">တစ်ရက်အတွင်း cashtag{d.collect.socialDate ? ' · ' + d.collect.socialDate : ''}</div></div>
        {/if}
      </div>
    </section>
  {/if}

  <section class="card tw">
    <div class="sec-title">ထိပ်တန်း holder များ <span class="muted">· ထိပ်တန်း 100 နမူနာမှ</span></div>
    <table>
      <thead><tr><th>#</th><th>လိပ်စာ</th><th class="r">လက်ကျန်</th><th class="r">အချိုး</th></tr></thead>
      <tbody>
        {#each (showAll ? d.holdersList : d.holdersList.slice(0, 10)) as h, i}
          <tr><td class="muted">{i + 1}</td><td class="mono">{shortAddr(h.owner?.address || h.address)}</td>
            <td class="r mono">{fmtNum(human(h.balance, d.decimals))}</td>
            <td class="r mono">{(Number(h.balance) / (d.supply * Math.pow(10, d.decimals)) * 100).toFixed(2)}%</td></tr>
        {/each}
      </tbody>
    </table>
    {#if d.holdersList.length > 10}<button class="more" onclick={() => (showAll = !showAll)}>{showAll ? 'ချုံ့ရန်' : `အားလုံးပြရန် (${d.holdersList.length})`}</button>{/if}
  </section>

  {#if d.pairs.length}
    <section class="card tw">
      <div class="sec-title">DEX liquidity နှင့် slippage
        <a class="arblink" href="{base}/arb">pool အချင်းချင်း arbitrage →</a>
      </div>
      <table>
        <thead><tr><th>Pool</th><th class="r">Liquidity</th><th class="r">Vol 24h</th><th class="r">$1K</th><th class="r">$10K</th><th class="r">Max &lt;1%</th></tr></thead>
        <tbody>
          {#each d.pairs.slice(0, 6) as p}
            {@const q = (p.liquidity?.usd || 0) / 2}
            <tr><td>{p.dexId || 'dex'} <span class="muted">{p.baseToken?.symbol}/{p.quoteToken?.symbol}</span></td>
              <td class="r mono">{fmtUsd(p.liquidity?.usd)}</td><td class="r mono">{fmtUsd(p.volume?.h24)}</td>
              <td class="r mono">{q > 0 ? ((Math.pow((q + 1000) / q, 2) - 1) * 100).toFixed(2) + '%' : '—'}</td>
              <td class="r mono">{q > 0 ? ((Math.pow((q + 10000) / q, 2) - 1) * 100).toFixed(2) + '%' : '—'}</td>
              <td class="r mono">{q > 0 ? fmtUsd(q * (Math.sqrt(1.01) - 1)) : '—'}</td></tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}

  {#if trades.length}
    <section class="card tw">
      <div class="sec-title">DEX ရှိ လတ်တလော အရောင်းအဝယ်များ <span class="muted">· အမှန်တကယ် swap များ (GeckoTerminal)</span></div>
      <table>
        <thead><tr><th>အချိန်</th><th>ဘက်</th><th class="r">ပမာဏ</th><th>Wallet</th></tr></thead>
        <tbody>
          {#each trades as t}
            <tr><td class="muted">{ago(t.ts)} အကြာက</td>
              <td class="sym" class:good={t.kind === 'buy'} class:bad={t.kind === 'sell'}>{t.kind === 'buy' ? 'ဝယ်' : 'ရောင်း'}</td>
              <td class="r mono" class:good={t.kind === 'buy'} class:bad={t.kind === 'sell'}>{fmtUsd(t.usd)}</td>
              <td class="mono muted">{shortAddr(t.from)}</td></tr>
          {/each}
        </tbody>
      </table>
    </section>
  {/if}
  <div class="foot muted">ဒေတာ: tonapi.io + DexScreener + STON.fi။ ဘဏ္ဍာရေးအကြံပေးချက် မဟုတ်ပါ။</div>
{/if}

<style>
  .pad{padding:30px 0}section{margin-bottom:16px}
  .hero{display:flex;justify-content:space-between;gap:20px;flex-wrap:wrap;align-items:flex-start;margin-bottom:14px}
  .hl{display:flex;gap:14px;align-items:flex-start}
  .ava{width:52px;height:52px;border-radius:50%;background:var(--card2)}
  .nm{display:flex;align-items:baseline;gap:9px}h1{font-size:23px}.sym{font-size:14px}
  .tags{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px;align-items:center}
  .addr{font-size:12px}
  .hr{display:flex;gap:18px;align-items:center}
  .score{text-align:center}.snum{font-size:30px;font-weight:600}.slbl{font-size:10px}
  .score.good .snum{color:var(--good)}.score.warn .snum{color:var(--warn)}.score.bad .snum{color:var(--bad)}
  .price{text-align:right}.unit{background:var(--card2);border:none;color:var(--muted);font-size:11px;padding:2px 8px;border-radius:6px;cursor:pointer}
  .pv{font-size:24px;margin-top:3px}.pd{font-size:13px}
  .thesis{display:flex;gap:9px;align-items:flex-start;background:rgba(34,167,255,.08);border:1px solid rgba(34,167,255,.2);border-radius:11px;padding:11px 14px;margin-bottom:18px;font-size:13px;line-height:1.5}
  .thesis i{color:var(--accent);font-size:17px;flex:none;margin-top:1px}
  .kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:16px}
  .kc{background:var(--card2);border-radius:11px;padding:11px 13px}
  .kl{color:var(--muted);font-size:11px;margin-bottom:5px}.kv{font-size:17px}.kd{font-size:11px;margin-top:4px}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .cgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:10px}
  .ci{background:var(--card2);border-radius:10px;padding:10px 12px}
  .ci .kv{font-size:18px;margin-top:2px}
  .ci .kd{font-size:11px;margin-top:3px}
  .kv.warn{color:var(--warn)}.kv.bad{color:var(--bad)}
  .big{font-size:34px;margin:4px 0 6px}.sm{font-size:13px;line-height:1.5}
  .profitbar{height:8px;border-radius:5px;background:rgba(255,255,255,.08);overflow:hidden;margin:8px 0 5px}.pf{height:100%;background:var(--good)}
  .edge{display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13px}
  .pill{font-size:11px;padding:2px 9px;border-radius:6px;background:var(--card2)}
  .pill.good{color:var(--good)}.pill.bad{color:var(--bad)}.pill.warn{color:var(--warn)}.pill.muted{color:var(--muted)}
  a.tv-link{color:var(--accent);border-color:rgba(34,167,255,.35);text-decoration:none;display:inline-flex;align-items:center;gap:4px}
  a.tv-link:hover{background:rgba(34,167,255,.15)}
  table{width:100%;border-collapse:collapse;font-size:13px}.tw{overflow-x:auto}
  th{color:var(--dim);font-weight:400;text-align:left;padding:6px 9px;font-size:11px;white-space:nowrap}
  td{padding:8px 9px;border-top:1px solid var(--border);white-space:nowrap}
  .r{text-align:right}.sym{font-weight:500}
  .more{margin-top:10px;background:transparent;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:7px 14px;font-size:12px;cursor:pointer}
  .arblink{font-size:12px;color:var(--accent);font-weight:400;margin-left:8px}
  .foot{font-size:11px;margin-top:18px}
  code{background:var(--card2);padding:1px 6px;border-radius:5px;font-family:var(--mono)}
  @media(max-width:720px){.kpis{grid-template-columns:repeat(3,1fr)}.grid2{grid-template-columns:1fr}}
</style>
