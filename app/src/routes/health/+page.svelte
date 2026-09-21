<script>
  import { onMount } from 'svelte';
  import { loadHealth } from '$lib/data.js';
  import { NODES, nodeStatus } from '$lib/health-graph.js';
  import DependencyGraph from '$lib/components/DependencyGraph.svelte';

  // Health of the data pipeline: every collector as a node, colored by freshness,
  // wired by the dependencies that feed the AI Desk. Freshness is recomputed in the
  // browser against updated_at (like /brief), so it stays honest between snapshot runs.
  let st = $state('loading');
  let generated = $state('');
  let statusOf = $state({});
  let rows = $state([]);

  const LABEL = { ok: 'လတ်ဆတ်', stale: 'ဟောင်းနေ', missing: 'ဖိုင်မရှိ', error: 'အမှား', unknown: 'ဒေတာမရှိ' };

  onMount(() => {
    (async () => {
      const h = await loadHealth();
      if (!h?.sources) { st = 'error'; return; }
      generated = h.generated_at || '';
      const now = Date.now();
      const so = {};
      for (const k of Object.keys(NODES)) {
        const src = h.sources[k];
        so[k] = { ...(src || {}), status: nodeStatus(src, now) };
      }
      statusOf = so;
      rows = Object.keys(NODES).map((k) => ({ key: k, label: NODES[k], ...so[k] }));
      st = 'ready';
    })();
  });

  const issues = $derived(rows.filter((r) => r.status !== 'ok'));
  const okCount = $derived(rows.length - issues.length);
  const fmtAge = (a) => (a == null ? '—' : a < 1 ? `${Math.round(a * 60)} မိနစ်` : `${a.toFixed(1)} နာရီ`);
</script>

<svelte:head><title>ဒေတာ ကျန်းမာရေး — TON Quant</title></svelte:head>

<header class="hd">
  <h1>ဒေတာ ကျန်းမာရေး</h1>
  {#if generated}<span class="muted upd">မှတ်တမ်း {generated}</span>{/if}
  <p class="muted lead">Collector တစ်ခုစီသည် node တစ်ခုဖြစ်ပြီး အရောင် = လတ်ဆတ်မှု။ မြားများသည် မှီခိုမှုများ — ရင်းမြစ်တစ်ခုစီကို ဘာမှ တွက်ချက်သည်နှင့် နောက်ဆုံး AI ဒက်စ်ကို ဘာက ကျွေးသည်ကို ပြသည်။ လတ်ဆတ်မှုကို browser တွင် ပြန်တွက်ထားသဖြင့် စုဆောင်းမှုများကြားတွင် «ခဲမသွား» ပါ။</p>
</header>

{#if st === 'loading'}
  <div class="muted pad">health.json ရယူနေသည်…</div>
{:else if st === 'error'}
  <div class="card bad">health.json ကို မရနိုင်ပါ — ဂရပ်ကို မတည်ဆောက်နိုင်ပါ။</div>
{:else}
  <section class="summary {issues.length ? 'warn' : 'ok'}">
    <i class="ti {issues.length ? 'ti-alert-triangle' : 'ti-circle-check'}"></i>
    {#if issues.length}
      <span>အာရုံစိုက်ရန် လိုသည်: {issues.map((r) => `${r.label} — ${LABEL[r.status] || r.status}`).join(' · ')}</span>
    {:else}
      <span>ရင်းမြစ် {okCount} ခုလုံး လတ်ဆတ်သည်။</span>
    {/if}
  </section>

  <section class="card">
    <DependencyGraph {statusOf} />
    <div class="legend">
      <span><i class="dot ok"></i>လတ်ဆတ်</span>
      <span><i class="dot stale"></i>ဟောင်းနေ</span>
      <span><i class="dot bad"></i>အမှား / ဖိုင်မရှိ</span>
      <span><i class="dot unknown"></i>ဒေတာမရှိ</span>
    </div>
  </section>

  <section class="card">
    <div class="sec-title">ရင်းမြစ်များ <span class="muted">· {rows.length}</span></div>
    <table>
      <thead><tr><th>ရင်းမြစ်</th><th>အခြေအနေ</th><th class="num">မှတ်တမ်း</th><th class="num">အသက်</th><th class="num">ကန့်သတ်ချက်</th></tr></thead>
      <tbody>
        {#each rows as r}
          <tr>
            <td>{r.label} <span class="muted mono">{r.key}</span></td>
            <td><span class="st {r.status}">{LABEL[r.status] || r.status}</span></td>
            <td class="num mono">{r.count ?? '—'}</td>
            <td class="num mono">{fmtAge(r.age_h)}</td>
            <td class="num mono">{r.max_age_h ?? '—'} နာရီ</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
{/if}

<style>
  .summary { display: flex; align-items: center; gap: 9px; padding: 10px 13px; border-radius: 10px; margin: 12px 0; font-size: 14px; }
  .summary.ok { background: rgba(46, 190, 122, .10); color: var(--good); }
  .summary.warn { background: rgba(224, 168, 58, .12); color: var(--warn); }
  .legend { display: flex; flex-wrap: wrap; gap: 16px; margin-top: 12px; color: var(--muted); font-size: 12px; }
  .legend span { display: inline-flex; align-items: center; gap: 6px; }
  .dot { width: 11px; height: 11px; border-radius: 3px; display: inline-block; }
  .dot.ok { background: var(--good); }
  .dot.stale { background: var(--warn); }
  .dot.bad { background: var(--bad); }
  .dot.unknown { background: var(--muted); }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--border); }
  th.num, td.num { text-align: right; }
  .mono { font-family: var(--mono); }
  .st.ok { color: var(--good); }
  .st.stale { color: var(--warn); }
  .st.error, .st.missing { color: var(--bad); }
  .st.unknown { color: var(--muted); }
</style>
