<script>
  import { rsi, rsiDiv, corrColor } from '$lib/metrics.js';
  let { rows = [] } = $props();

  let model = $derived.by(() => {
    const out = rows.filter((r) => r.core && r.hist)
      .map((r) => {
        const spark = r.hist.map((h) => h?.price).filter((p) => p > 0);
        const v = rsi(spark, 14);
        return v == null ? null : { sym: r.sym, v, div: rsiDiv(spark) };
      }).filter(Boolean);
    if (out.length < 3) return null;
    out.sort((x, y) => x.v - y.v);
    return out;
  });
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const zone = (v) => (v >= 70 ? 'ဝယ်လွန်' : v <= 30 ? 'ရောင်းလွန်' : 'ကြားနေ');
</script>

{#if !model}
  <div class="empty">မှတ်တမ်းများ စုဆောင်းနေသည် — RSI(14) အတွက် snapshot အနည်းဆုံး 15 ရက် လိုအပ်သည်။</div>
{:else}
  <div class="wrap">
    <table class="rsi">
      <thead><tr><th></th><th class="r">RSI(14)</th><th>0–30 ရောင်းလွန် (oversold) / 70–100 ဝယ်လွန် (overbought)</th><th>ဇုန်</th><th>Divergence</th></tr></thead>
      <tbody>
        {#each model as r}
          <tr>
            <th class="rh">{r.sym}</th>
            <td class="r cell" style="background:{corrColor((50 - r.v) / 50)}">{r.v.toFixed(0)}</td>
            <td><div class="gauge"><div class="mk" style="left:calc({clamp(r.v).toFixed(0)}% - 4px)"></div></div></td>
            <td class="m">{zone(r.v)}</td>
            <td class="dv" class:bull={r.div?.type === 'bull'} class:bear={r.div?.type === 'bear'}>
              {!r.div?.type ? '—' : r.div.type === 'bull' ? '▲ ဈေးတက်' : '▼ ဈေးကျ'}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <div class="note">ရောင်းလွန်ဆုံး: <strong>{model[0].sym}</strong> (RSI {model[0].v.toFixed(0)}). ဝယ်လွန်ဆုံး: <strong>{model[model.length - 1].sym}</strong> (RSI {model[model.length - 1].v.toFixed(0)}). Divergence = RSI အဆင့်တစ်ခုတည်းက လွတ်သွားတတ်သော ပြောင်းပြန်လှည့်မှု၏ ကြိုတင်အချက်ပြ ဖြစ်သည်။ token {model.length} ခု။</div>
{/if}

<style>
  .wrap{overflow-x:auto}
  .rsi{width:100%;border-collapse:collapse;font-size:12px}
  .rsi th{color:var(--dim);font-weight:400;padding:4px 8px;font-size:11px;text-align:left}
  .rsi .r{text-align:right;font-family:var(--mono)}
  .rsi td{padding:6px 8px;border-top:1px solid var(--border)}
  .rsi .rh{text-align:left;color:var(--text);font-weight:500}
  .rsi .m{color:var(--muted)}
  .gauge{position:relative;height:10px;border-radius:5px;min-width:150px;
    background:linear-gradient(90deg,rgba(46,158,91,.5) 0%,rgba(46,158,91,.5) 30%,rgba(255,255,255,.08) 30%,rgba(255,255,255,.08) 70%,rgba(207,79,95,.5) 70%,rgba(207,79,95,.5) 100%)}
  .mk{position:absolute;top:-1px;width:8px;height:12px;border-radius:2px;background:var(--text);border:1px solid #5a6472}
  .dv{color:var(--muted);font-weight:600} .dv.bull{color:#2e9e5b} .dv.bear{color:#cf4f5f}
  .note{font-size:12px;color:var(--muted);margin-top:10px;line-height:1.5}
  .note strong{color:var(--text)}
  .empty{color:var(--muted);font-size:13px;padding:24px 4px}
</style>
