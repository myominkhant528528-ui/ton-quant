<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { loadCompare, loadUniverse } from '$lib/data.js';
  import { fmtUsd, fmtNum } from '$lib/format.js';

  let query = $state('');
  let universe = $state([]);
  let toks = $state([]);
  let busy = $state(false);
  let err = $state('');

  onMount(() => { loadUniverse().then((u) => (universe = u.tokens || [])); });

  // full address shape only — a symbol like "EQUAL" must still hit the dropdown
  const isAddr = (s) => /^(EQ|UQ)[A-Za-z0-9_-]{46}$/.test(s) || /^-?\d+:[0-9a-fA-F]{64}$/.test(s);

  let matches = $derived.by(() => {
    const q = query.trim();
    if (!q || isAddr(q)) return [];               // address typed -> no dropdown
    return universe.filter((t) => t.sym.toLowerCase().includes(q.toLowerCase())).slice(0, 8);
  });

  const rows = [
    ['ဈေးနှုန်း', (t) => fmtUsd(t.price)],
    ['Market cap', (t) => fmtUsd(t.mcap)],
    ['Holder အရေအတွက်', (t) => fmtNum(t.holders)],
    ['Liquidity', (t) => fmtUsd(t.liq)],
    ['ရောင်းဝယ်ပမာဏ 24 နာရီ', (t) => fmtUsd(t.vol)],
    ['TON Quant ရမှတ် ≈', (t) => '≈' + t.score + ' / 100'],
    ['အသက် (ရက်)', (t) => t.ageDays ?? '—'],
    ['အတည်ပြုပြီး', (t) => (t.verification === 'whitelist' ? '✓' : '—')],
    ['Mint အခွင့်အာဏာ စွန့်လွှတ်ပြီး', (t) => (t.adminZero ? '✓' : '—')]
  ];

  async function addByAddr(a) {
    a = a.trim();
    if (!a || toks.some((t) => t.addr === a) || busy) return;
    busy = true; err = '';
    try { toks = [...toks, await loadCompare(a)]; query = ''; }
    catch (e) { err = 'ရယူ၍မရပါ: ' + e.message; }
    busy = false;
  }
  // Enter with a dropdown match -> pick the top match; otherwise treat input as a raw address.
  const onEnter = () => addByAddr(matches.length ? matches[0].addr : query);
  const remove = (a) => (toks = toks.filter((t) => t.addr !== a));
</script>

<svelte:head><title>နှိုင်းယှဉ် — TON Quant</title></svelte:head>
<header class="hd"><h1>နှိုင်းယှဉ်</h1><span class="muted">jetton များကို ဘေးချင်းယှဉ် နှိုင်းယှဉ်ခြင်း</span></header>

<div class="addbar">
  <div class="searchwrap">
    <input class="search" placeholder="Jetton အမည် (REDO…) သို့မဟုတ် လိပ်စာ (EQ…)" bind:value={query} onkeydown={(e) => e.key === 'Enter' && onEnter()} />
    {#if matches.length}
      <div class="dropdown">
        {#each matches as m}
          <button class="opt" onclick={() => addByAddr(m.addr)}>
            <span class="osym">{m.sym}</span><span class="muted small">{fmtUsd(m.price)}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
  <button class="btn" onclick={onEnter} disabled={busy}>{busy ? '…' : 'ထည့်ရန်'}</button>
</div>
{#if err}<div class="muted err">{err}</div>{/if}

{#if !toks.length}
  <div class="muted pad">နှိုင်းယှဉ်ရန် jetton 2 ခုနှင့်အထက်ကို အမည် သို့မဟုတ် လိပ်စာဖြင့် ထည့်ပါ။</div>
{:else}
  <div class="card tw">
    <table>
      <thead><tr><th>တိုင်းတာမှု</th>
        {#each toks as t}<th class="r"><a href="{base}/token?a={t.addr}">{t.sym}</a> <button class="x" onclick={() => remove(t.addr)} aria-label="ဖယ်ရှားရန်">×</button></th>{/each}
      </tr></thead>
      <tbody>
        {#each rows as [label, fn]}
          <tr><td class="muted">{label}</td>{#each toks as t}<td class="r mono">{fn(t)}</td>{/each}</tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="muted note">≈ ဤရမှတ်သည် ခန့်မှန်းချက်သာဖြစ်သည် — မြန်ဆန်စေရန် holder ဖွဲ့စည်းပုံနှင့် transfer အခွန်ကို မယူထားပါ။ တိကျသော TON Quant ရမှတ်ကို token စာမျက်နှာတွင် ကြည့်ပါ။</p>
{/if}

<style>
  .hd{display:flex;align-items:baseline;gap:12px;margin-bottom:16px}h1{font-size:24px}
  .addbar{display:flex;gap:10px;margin-bottom:10px}
  .searchwrap{position:relative;flex:1}
  .search{width:100%;background:var(--card);border:1px solid var(--border);color:var(--text);border-radius:9px;padding:9px 12px;font-size:13px}
  .dropdown{position:absolute;top:calc(100% + 4px);left:0;right:0;z-index:10;background:var(--card2);
    border:1px solid var(--border);border-radius:9px;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.4)}
  .opt{display:flex;justify-content:space-between;align-items:center;width:100%;text-align:left;
    background:none;border:none;color:var(--text);padding:8px 12px;font-size:13px;cursor:pointer}
  .opt:hover{background:rgba(255,255,255,.05)}
  .osym{font-weight:600}
  .small{font-size:11px}
  .btn{background:var(--accent);color:#04223b;border:none;border-radius:9px;padding:0 18px;font-weight:500;cursor:pointer}
  .btn:disabled{opacity:.5}.err{font-size:12px;margin-bottom:10px}.pad{padding:30px 0}
  .note{font-size:11px;margin-top:10px;line-height:1.5}
  .tw{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px}
  th{color:var(--dim);font-weight:400;text-align:left;padding:8px 12px;font-size:12px;white-space:nowrap}
  td{padding:9px 12px;border-top:1px solid var(--border);white-space:nowrap}
  .r{text-align:right}th .r{font-weight:500}
  .x{background:none;border:none;color:var(--dim);cursor:pointer;font-size:14px}.x:hover{color:var(--bad)}
</style>
