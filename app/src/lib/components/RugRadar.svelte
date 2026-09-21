<script>
  import { rugRisk } from '$lib/metrics.js';
  let { rows = [] } = $props();

  let model = $derived.by(() => {
    const out = rows.filter((r) => r.core && r.hist)
      .map((r) => { const x = rugRisk(r.hist); return x ? { sym: r.sym, ...x } : null; })
      .filter(Boolean)
      .sort((a, b) => b.div - a.div);
    return out.length >= 3 ? out : null;
  });
  const flagged = $derived(model ? model.filter((r) => r.level !== 'ok') : []);
  const lbl = { high: '🚩 Liquidity ထွက်ခွာနေသည်', watch: '⚠ စောင့်ကြည့်ဆဲ', ok: 'ok' };
  const fmt = (v) => (v >= 0 ? '+' : '') + v.toFixed(0) + '%';
</script>

{#if !model}
  <div class="empty">မှတ်တမ်းများ စုဆောင်းနေသည် — TVL ပါသော snapshot အနည်းဆုံး 4 ရက် လိုအပ်သည်။</div>
{:else}
  <div class="wrap">
    <table class="rr">
      <thead><tr><th></th><th class="r">ΔTVL {model[0].days} ရက်</th><th class="r">Δဈေး</th><th class="r">ကွာဟမှု</th><th>အလံ</th></tr></thead>
      <tbody>
        {#each model as r}
          <tr>
            <th class="rh">{r.sym}</th>
            <td class="r m">{fmt(r.tvlChg)}</td>
            <td class="r m">{fmt(r.priceChg)}</td>
            <td class="r cell" class:hi={r.level === 'high'} class:mid={r.level === 'watch'}>{fmt(r.div)}</td>
            <td class="v" class:high={r.level === 'high'} class:watch={r.level === 'watch'}>{lbl[r.level]}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <div class="note">
    {#if flagged.length}
      ဈေးမပြောင်းဘဲ Liquidity ယိုထွက်နေသည်: {#each flagged as f, i}<strong>{f.sym}</strong>{i < flagged.length - 1 ? ', ' : ''}{/each}။ TVL သည် ဈေးထက် ကြိုတင်ကျဆင်းသွားသည် — dump မတိုင်မီ မကြာခဏတွေ့ရသော ကြိုတင်လက္ခဏာ။
    {:else}
      ထွက်ခွာမှုအချက်ပြ မရှိပါ — မည်သူ၏ TVL မှ ဈေးထက် ပိုမကျပါ။
    {/if}
    ကွာဟမှု = Δဈေး − ΔTVL — မြင့်ခြင်းသည် Liquidity ထုတ်နေစဉ် ဈေးကို ထိန်းထားခြင်းကို ဆိုလိုသည် (TVL သည် USD ဖြင့်ဖြစ်သဖြင့် ဈေးနှင့်အတူ TVL ကျခြင်းသည် ပုံမှန်ဖြစ်ပြီး အလံမဟုတ်ပါ)။
  </div>
{/if}

<style>
  .wrap{overflow-x:auto}
  .rr{width:100%;border-collapse:collapse;font-size:12px}
  .rr th{color:var(--dim);font-weight:400;padding:4px 8px;font-size:11px;text-align:left}
  .rr .r{text-align:right;font-family:var(--mono)}
  .rr td{padding:6px 8px;border-top:1px solid var(--border)}
  .rr .rh{text-align:left;color:var(--text);font-weight:500}
  .rr .m{color:var(--muted)}
  .cell.mid{background:rgba(214,158,46,.16);color:#e0a93a}
  .cell.hi{background:rgba(207,79,95,.2);color:#e06a78}
  .v{color:var(--muted)} .v.watch{color:#e0a93a} .v.high{color:#e06a78;font-weight:600}
  .note{font-size:12px;color:var(--muted);margin-top:10px;line-height:1.5}
  .note strong{color:var(--text)}
  .empty{color:var(--muted);font-size:13px;padding:24px 4px}
</style>
