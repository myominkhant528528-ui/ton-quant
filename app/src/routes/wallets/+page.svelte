<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { loadWallets, loadDeskStatus } from '$lib/data.js';
  import { walletHref } from '$lib/wallets.js';

  let st = $state('loading');
  let data = $state(null);
  let verdicts = $state(null); // null until loaded / absent -> page degrades gracefully (no risk layer)
  let sort = $state('smart'); // combined who-to-copy rank (default); 'edge'=skill, 'breadth'=conviction

  const short = (a) => a.slice(0, 4) + '…' + a.slice(-4);
  const fmtEdge = (e) => (e == null ? '—' : (e > 0 ? '+' : '') + e + '%');

  let vByAddr = $derived.by(() => {
    const m = new Map();
    for (const w of verdicts?.wallets || []) m.set(w.addr, w);
    return m;
  });
  let riskBySym = $derived.by(() => {
    const m = new Map();
    for (const t of verdicts?.tokens || []) m.set(t.sym, t);
    return m;
  });

  let roster = $derived.by(() => {
    const byMetric = (a, b) =>
      sort === 'smart'
        ? (b.smart ?? -1e9) - (a.smart ?? -1e9) || b.n - a.n
        : sort === 'edge'
          ? (b.edge ?? -1e9) - (a.edge ?? -1e9) || b.n - a.n
          : sort === 'win'
            ? (b.win ?? -1) - (a.win ?? -1) || (b.edge ?? -1e9) - (a.edge ?? -1e9)
            : sort === 'conv'
              ? (b.conv ?? -1) - (a.conv ?? -1) || b.n - a.n
              : b.n - a.n;
    const sorted = [...(data?.roster || [])].sort(byMetric);
    if (!vByAddr.size) return sorted;   // no desk verdicts -> plain sort, no risk layer
    // desk-vetted: copy_ok wallets float to the top, flagged (copy_ok=false) sink to
    // the bottom; wallets the desk hasn't scored (yet) stay in the middle, untouched.
    const bucket = (w) => { const v = vByAddr.get(w.addr); return v ? (v.copy_ok ? 0 : 2) : 1; };
    return sorted
      .map((w, i) => ({ w, i }))
      .sort((x, y) => bucket(x.w) - bucket(y.w) || x.i - y.i)
      .map(({ w }) => w);
  });
  let signals = $derived(roster.filter((w) => w.new && w.new.length));

  onMount(async () => {
    try {
      data = await loadWallets();
      st = data && data.roster?.length ? 'ready' : 'empty';
    } catch (e) {
      st = 'error';
    }
    loadDeskStatus().then((v) => (verdicts = v)).catch(() => {});
  });
</script>

<svelte:head><title>TON Quant — စမတ်မနီ</title></svelte:head>

<header class="hd">
  <div class="hd-top"><h1>စမတ်မနီ</h1>
    <span class="muted">စောင့်ကြည့်နေသော token အများအပြား၏ ထိပ်တန်း holder များတွင် တစ်ပြိုင်နက် ပါဝင်နေသော wallet များ — ၎င်းတို့ ဝယ်နေသည်များကို စောင့်ကြည့်ပါ</span>
  </div>
  {#if data}
    <div class="legend muted">scan လုပ်ထားသော token {data.scanned} ခု · wallet {data.wallets} ခု · roster {data.roster_size} · {data.date}</div>
  {/if}
  {#if st === 'ready'}
    <div class="sortbar">
      <span class="muted small">စီစဉ်ပုံ:</span>
      <button class="sb" class:on={sort === 'smart'} onclick={() => (sort = 'smart')}>smart-score အလိုက်</button>
      <button class="sb" class:on={sort === 'edge'} onclick={() => (sort = 'edge')}>edge အလိုက် ({data.edge_days || 7} ရက်)</button>
      <button class="sb" class:on={sort === 'win'} onclick={() => (sort = 'win')}>hit-rate အလိုက်</button>
      <button class="sb" class:on={sort === 'conv'} onclick={() => (sort = 'conv')}>conviction အလိုက်</button>
      <button class="sb" class:on={sort === 'breadth'} onclick={() => (sort = 'breadth')}>breadth အလိုက်</button>
    </div>
  {/if}
</header>

{#if st === 'loading'}<div class="muted pad">roster ရယူနေသည်…</div>
{:else if st === 'error'}<div class="card bad">data/wallets.json ကို ရယူ၍မရပါ</div>
{:else if st === 'empty'}<div class="muted pad">ဒေတာ မရှိသေးပါ — script ၏ ပထမဆုံး run ကို စောင့်နေသည်။</div>
{:else}
  {#if signals.length}
    <section class="card sig">
      <div class="sig-h"><i class="ti ti-bolt"></i> မနေ့မှစ၍ ဝင်ရောက်မှုအသစ်များ ({signals.reduce((s, w) => s + w.new.length, 0)})</div>
      <div class="muted small">ဤ wallet များသည် ယနေ့ token အသစ်များ၏ ထိပ်တန်း holder တွင် ပထမဆုံးအကြိမ် ပါဝင်လာသည် — copy-buy ကိုယ်စားလှယ်လောင်းများ</div>
      {#each signals as w}
        <div class="sig-row">
          <a class="addr mono" href={walletHref(base, w.addr)} title={w.addr}>{w.name || short(w.addr)}</a>
          <span class="chips">{#each w.new as t}<span class="chip new">{t}</span>{/each}</span>
        </div>
      {/each}
    </section>
  {/if}

  {#if data.favorites?.length}
    <section class="card fav">
      <div class="fav-h"><i class="ti ti-flame"></i> စမတ်မနီ ကိုင်ထားသော ထိပ်တန်း token များ</div>
      <div class="muted small">ecosystem အလိုက် «စမတ်မနီ» သဘောတူညီမှု — <b>⚖cons</b> = roster holder အရေအတွက်ကို rank အလေးချိန်ပေးထားသည် (ထိပ်တန်း holder သည် နောက်ပိုင်းထက် ပိုလေးသည်)၊ <b>N×</b> = holder အရေအတွက်အစစ်။ edge = ဤ holder များ၏ ပျမ်းမျှ {data.edge_days || 7} ရက် ပြန်အမြတ်</div>
      {#each data.favorites.slice(0, 15) as f}
        {@const tokV = riskBySym.get(f.sym)}
        <div class="fav-row">
          <span class="chip fav-tok">{f.sym}</span>
          <span class="fav-bar"><span class="fav-fill" style="width:{((f.cons ?? f.holders) / (data.favorites[0].cons ?? data.favorites[0].holders)) * 100}%"></span></span>
          {#if f.cons != null}<span class="conv mono" title="rank အလေးချိန်ပေး သဘောတူညီမှု — roster holder များအပေါ် Σ (26−rank)/25 — စမတ်မနီက ထိပ်တန်း holder ဖြစ်နေသော token သည် နောက်ပိုင်းတွင်သာ ကိုင်ထားသော token ထက် သာသည်">⚖{f.cons}</span>{/if}
          <span class="fav-n mono" title="roster holder အရေအတွက်အစစ်">{f.holders}×</span>
          {#if f.avg_edge != null}<span class="edge mono" class:up={f.avg_edge > 0} class:down={f.avg_edge < 0}>{fmtEdge(f.avg_edge)}</span>{/if}
          {#if f.new}<span class="chip new">+{f.new}</span>{/if}
          {#if tokV?.manip_risk === 'high'}<span class="risk high" title="AI ဒက်စ်: {tokV.reason || 'ကိုင်လှုပ်မှုအန္တရာယ် မြင့်မား'}">⚠ အန္တရာယ်</span>{/if}
        </div>
      {/each}
    </section>
  {/if}

  <div class="grid">
    {#each roster as w, i}
      {@const v = vByAddr.get(w.addr)}
      <div class="card wc" class:dirty={v && !v.copy_ok}>
        <div class="wc-top">
          <span class="rank mono">#{i + 1}</span>
          <a class="addr mono" href={walletHref(base, w.addr)} title={w.addr}>{w.name || short(w.addr)}</a>
          {#if v}
            <span class="risk {v.manip_risk}" title="AI ဒက်စ် စိစစ်မှု{v.copy_ok ? ' — copy လုပ်နိုင်သည်' : ' — copy မလုပ်ရ'} (conviction {v.conviction}): {v.reason}">{v.manip_risk}</span>
          {/if}
          {#if w.smart != null}
            <span class="smart mono" class:up={w.smart > 0} class:down={w.smart < 0}
              title="smart-score — «ဘယ်သူ့ကို copy လုပ်ရမလဲ» ဟူသော ပေါင်းစပ်အဆင့် — ချုံ့ထားသော edge × hit-rate × breadth bonus (edge·ne/(ne+3)·win/100·(1+0.1·(n−2)))။ နမူနာနည်းခြင်းနှင့် တည်ငြိမ်မှုမရှိခြင်းက အမှတ်ကို လျှော့ချသည်၊ edge အနုတ်ဖြစ်လျှင် ရမှတ်လည်း အနုတ်ဖြစ်သည်">★{w.smart}</span>
          {/if}
          {#if w.edge != null}
            <span class="edge mono" class:up={w.edge > 0} class:down={w.edge < 0}
              title="portfolio ထဲရှိ စောင့်ကြည့်သော token များ၏ ပျမ်းမျှပြန်အမြတ် {data.edge_days || 7} ရက် ({w.ne} ဈေးနှုန်းအပေါ် အခြေခံ) — ရွေးချယ်မှုကျွမ်းကျင်မှု၏ proxy">{fmtEdge(w.edge)}</span>
          {/if}
          {#if w.win != null}
            <span class="win mono" class:up={w.win >= 50} class:down={w.win < 50}
              title="portfolio ထဲရှိ စောင့်ကြည့်သော token များအနက် {data.edge_days || 7} ရက်အတွင်း တက်ခဲ့သော အချိုး ({w.ne} ခုအနက်) — ရွေးချယ်မှု၏ တသမတ်တည်းဖြစ်မှု၊ edge နှင့်မတူဘဲ pump တစ်ခုတည်းက မဆွဲတင်နိုင်ပါ">{w.win}%↑</span>
          {/if}
          {#if w.conv != null}
            <span class="conv mono"
              title="conviction — rank အလေးချိန်ပေး breadth — ထိပ်တန်း holder (rank 1) သည် ~1.0၊ နောက်ပိုင်း (rank 25) သည် ~0.04။ Token အရေအတွက် တူညီသော wallet နှစ်ခုတွင် တစ်ခုက token တိုင်း၏ အကြီးဆုံး holder ဖြစ်ပြီး နောက်တစ်ခုက ထိပ်တန်း 25 တွင် ခက်ခက်ခဲခဲ ပါလျှင် သိသိသာသာ ကွာခြားသည်">⚖{w.conv}</span>
          {/if}
          <span class="n" title="စောင့်ကြည့်နေသော token မည်မျှတွင် ထိပ်တန်း holder ဖြစ်နေသနည်း">{w.n}×</span>
        </div>
        <div class="chips">
          {#each w.toks as t}<span class="chip" class:new={w.new?.includes(t)}>{t}</span>{/each}
        </div>
      </div>
    {/each}
  </div>
  <p class="muted small foot"><b>smart-score</b> (မူလစီစဉ်ပုံ) = «ဘယ်သူ့ကို copy လုပ်ရမလဲ» ဟူသော ပေါင်းစပ်အဆင့် — နမူနာအရွယ်အစားအလိုက် ချုံ့ထားသော edge (ne/(ne+3) — token တစ်ခုတည်းပေါ်ရှိ ကံကောင်းမှုတစ်ခုသည် အလွန်ချုံ့သွားသည်) × hit-rate (စနစ်တကျဖြစ်မှု) × breadth bonus — မက်ထရစ်သုံးခုကို ဂဏန်းတစ်ခုတည်း ပေါင်းစပ်ထားသည်။ <b>edge</b> = wallet ၏ portfolio ထဲရှိ စောင့်ကြည့်သော token များ၏ ပျမ်းမျှ {data.edge_days || 7} ရက် ပြန်အမြတ် (ရလဒ်အလိုက် ရွေးချယ်မှုကျွမ်းကျင်မှု၏ proxy ဖြစ်ပြီး entry-PnL မဟုတ်ပါ) — တက်နေသော token များကို အမှန်တကယ် စုဆောင်းသူများကို bagholder များနှင့် ခွဲခြားပေးသည်။ <b>hit-rate</b> = portfolio ထဲရှိ စောင့်ကြည့်သော token များအနက် ကာလအတွင်း တက်ခဲ့သော အချိုး (ဈေးနှုန်းရှိသည်များအနက်) — ရွေးချယ်မှု၏ တသမတ်တည်းဖြစ်မှု၊ edge +35% သည် pump တစ်ခုတည်းကြောင့် ဖြစ်နိုင်ပြီး hit-rate က ၎င်းသည် စနစ်တကျ ကျွမ်းကျင်မှု ဟုတ်မဟုတ် ပြသည်။ <b>breadth</b> = wallet သည် ထိပ်တန်း {25} holder ထဲတွင် ပါသော စောင့်ကြည့်ထားသည့် token အရေအတွက် (CEX/DEX/pool/scam များ စစ်ထုတ်ထားသည်) — «ecosystem တစ်ခုလုံးအပေါ် whale ယုံကြည်မှု»။ <b>conviction</b> (⚖) = breadth အတူတူပင်ဖြစ်သော်လည်း rank အလေးချိန်ပေးထားသည် — token တစ်ခု၏ ပံ့ပိုးမှု = (26−rank)/25 ဖြစ်သဖြင့် အကြီးဆုံး holder ဖြစ်ခြင်းသည် ~1.0 ရှိပြီး ထိပ်တန်း 25 တွင် ခက်ခက်ခဲခဲ ပါခြင်းသည် ~0.04 သာရှိသည်။ position များတွင် အမှန်တကယ် လွှမ်းမိုးထားသော whale ကို စာရင်းတွင် အမည်ပေါ်ရုံသက်သက် ဖြစ်သူများနှင့် ခွဲခြားပေးသည်။ အသန့်ရှင်းဆုံး copy အချက်ပြမှာ «ဝင်ရောက်မှုအသစ်များ» ပိုင်းဖြစ်သည် (ဒုတိယနေ့မှစ၍ ပြည့်လာမည်)။</p>
{/if}

<style>
  .hd{margin-bottom:16px}
  .hd-top{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}
  h1{font-family:var(--head);font-size:22px;margin:0}
  .legend{margin-top:6px;font-size:12px}
  .small{font-size:12px}
  .pad{padding:20px 0}
  .card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 14px}
  .bad{color:#ff6b6b}
  .sig{margin-bottom:16px;border-color:rgba(34,167,255,.4);background:rgba(34,167,255,.06)}
  .sig-h{font-family:var(--head);font-size:14px;color:var(--accent);display:flex;align-items:center;gap:6px}
  .sig-row{display:flex;gap:10px;align-items:center;margin-top:8px;flex-wrap:wrap}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(248px,1fr));gap:10px}
  .wc-top{display:flex;align-items:center;gap:8px;margin-bottom:8px}
  .rank{color:var(--muted);font-size:12px}
  .addr{color:var(--accent);font-size:13px;text-decoration:none;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .addr:hover{text-decoration:underline}
  .n{font-size:12px;color:var(--text);background:rgba(255,255,255,.06);border-radius:6px;padding:1px 7px}
  .conv{font-size:12px;color:#c9a8ff;background:rgba(167,139,250,.14);border-radius:6px;padding:1px 7px}
  .smart{font-size:12px;font-weight:600;color:var(--muted);background:rgba(255,255,255,.06);border-radius:6px;padding:1px 7px}
  .smart.up{color:#41d68a;background:rgba(65,214,138,.14)}
  .smart.down{color:#ff6b6b;background:rgba(255,107,107,.12)}
  .edge{font-size:12px;color:var(--muted);background:rgba(255,255,255,.06);border-radius:6px;padding:1px 7px}
  .edge.up{color:#41d68a;background:rgba(65,214,138,.12)}
  .edge.down{color:#ff6b6b;background:rgba(255,107,107,.12)}
  .win{font-size:12px;color:var(--muted);background:rgba(255,255,255,.06);border-radius:6px;padding:1px 7px}
  .win.up{color:#41d68a;background:rgba(65,214,138,.12)}
  .win.down{color:#ffae57;background:rgba(255,174,87,.12)}
  .risk{font-size:11px;font-weight:600;text-transform:uppercase;border-radius:6px;padding:1px 7px;cursor:help}
  .risk.low{color:#41d68a;background:rgba(65,214,138,.12)}
  .risk.med{color:#ffae57;background:rgba(255,174,87,.12)}
  .risk.high{color:#ff6b6b;background:rgba(255,107,107,.16)}
  .wc.dirty{opacity:.55}
  .wc.dirty:hover{opacity:.9}
  .sortbar{display:flex;align-items:center;gap:8px;margin-top:10px}
  .sb{font-size:12px;color:var(--muted);background:var(--card);border:1px solid var(--border);border-radius:8px;padding:3px 10px;cursor:pointer}
  .sb.on{color:var(--accent);border-color:rgba(34,167,255,.5);background:rgba(34,167,255,.08)}
  .chips{display:flex;flex-wrap:wrap;gap:4px}
  .chip{font-size:11px;padding:2px 7px;border-radius:6px;background:rgba(255,255,255,.05);color:var(--muted)}
  .chip.new{background:rgba(34,167,255,.18);color:var(--accent)}
  .mono{font-family:ui-monospace,Menlo,Consolas,monospace}
  .foot{margin-top:16px;max-width:680px;line-height:1.5}
  .fav{margin-bottom:16px}
  .fav-h{font-family:var(--head);font-size:14px;display:flex;align-items:center;gap:6px;margin-bottom:2px}
  .fav-row{display:flex;align-items:center;gap:8px;margin-top:7px}
  .fav-tok{flex:0 0 90px;text-align:center;color:var(--text);background:rgba(255,255,255,.06)}
  .fav-bar{flex:1;height:7px;border-radius:4px;background:rgba(255,255,255,.05);overflow:hidden}
  .fav-fill{display:block;height:100%;background:var(--accent);opacity:.55;border-radius:4px}
  .fav-n{font-size:12px;color:var(--text);min-width:30px;text-align:right}
</style>
