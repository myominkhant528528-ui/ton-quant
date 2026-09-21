<script>
  import { macdHist, macdDiv, corrColor } from '$lib/metrics.js';
  let { rows = [] } = $props();

  let model = $derived.by(() => {
    const out = rows.filter((r) => r.core && r.hist)
      .map((r) => {
        const spark = r.hist.map((h) => h?.price).filter((p) => p > 0);
        const m = macdHist(spark);
        return m ? { sym: r.sym, ...m, div: macdDiv(spark) } : null;
      }).filter(Boolean);
    if (out.length < 3) return null;
    out.sort((x, y) => y.h - x.h);
    return out;
  });
  const state = (r) => (r.cross ? (r.h > 0 ? 'ဈေးတက် ဖြတ်ကျော်' : 'ဈေးကျ ဖြတ်ကျော်') : r.h > 0 ? 'အပေါင်း' : 'အနုတ်');
</script>

{#if !model}
  <div class="empty">မှတ်တမ်းများ စုဆောင်းနေသည် — MACD(12,26,9) အတွက် snapshot အနည်းဆုံး 35 ရက် လိုအပ်သည်။</div>
{:else}
  <div class="wrap">
    <table class="macd">
      <thead><tr><th></th><th class="r">Histogram</th><th>အရှိန်</th><th>အခြေအနေ</th><th>Divergence</th></tr></thead>
      <tbody>
        {#each model as r}
          <tr>
            <th class="rh">{r.sym}</th>
            <td class="r cell" style="background:{corrColor(Math.max(-1, Math.min(1, r.h / 2)))}">{r.h >= 0 ? '+' : ''}{r.h.toFixed(2)}</td>
            <td class="m">{r.h > r.prev ? '↑ တက်နေ' : '↓ ကျနေ'}</td>
            <td class="st" class:cross={r.cross} class:up={r.cross && r.h > 0} class:dn={r.cross && r.h < 0}>{state(r)}</td>
            <td class="dv" class:bull={r.div?.type === 'bull'} class:bear={r.div?.type === 'bear'}>
              {!r.div?.type ? '—' : r.div.type === 'bull' ? '▲ ဈေးတက်' : '▼ ဈေးကျ'}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <div class="note">အားအကောင်းဆုံး လမ်းကြောင်း: <strong>{model[0].sym}</strong> (hist {model[0].h >= 0 ? '+' : ''}{model[0].h.toFixed(2)}). အားအနည်းဆုံး: <strong>{model[model.length - 1].sym}</strong> (hist {model[model.length - 1].h.toFixed(2)}). MACD ကို base-100 စီးရီးပေါ်တွင် တွက်ထားသည်။ token {model.length} ခု။</div>
{/if}

<style>
  .wrap{overflow-x:auto}
  .macd{width:100%;border-collapse:collapse;font-size:12px}
  .macd th{color:var(--dim);font-weight:400;padding:4px 8px;font-size:11px;text-align:left}
  .macd .r{text-align:right;font-family:var(--mono)}
  .macd td{padding:6px 8px;border-top:1px solid var(--border)}
  .macd .rh{text-align:left;color:var(--text);font-weight:500}
  .macd .m{color:var(--muted)}
  .st{color:var(--muted)} .st.cross{font-weight:600} .st.up{color:#2e9e5b} .st.dn{color:#cf4f5f}
  .dv{color:var(--muted);font-weight:600} .dv.bull{color:#2e9e5b} .dv.bear{color:#cf4f5f}
  .note{font-size:12px;color:var(--muted);margin-top:10px;line-height:1.5}
  .note strong{color:var(--text)}
  .empty{color:var(--muted);font-size:13px;padding:24px 4px}
</style>
