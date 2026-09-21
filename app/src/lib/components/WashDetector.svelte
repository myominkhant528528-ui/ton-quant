<script>
  import { washVerdict } from '$lib/metrics.js';
  import { fmtUsd } from '$lib/format.js';
  let { rows = [] } = $props();

  let model = $derived.by(() => {
    const out = rows.filter((r) => r.core && r.tvl > 0 && r.vol24 >= 0)
      .map((r) => {
        const turnover = r.vol24 / r.tvl;
        const txns = (r.buys || 0) + (r.sells || 0);
        return { sym: r.sym, turnover, txns, avgTrade: txns > 0 ? r.vol24 / txns : 0, verdict: washVerdict(turnover) };
      })
      .sort((a, b) => b.turnover - a.turnover);
    return out.length >= 3 ? out : null;
  });
  const lbl = { wash: '🚿 wash ဖြစ်နိုင်ခြေမြင့်', elevated: '⚠ မြင့်နေသည်', ok: 'ok' };
</script>

{#if !model}
  <div class="empty">Liquidity ရှိသော token များ မလုံလောက်ပါ။</div>
{:else}
  <div class="wrap">
    <table class="w">
      <thead><tr><th></th><th class="r">vol/TVL (လည်ပတ်မှု)</th><th class="r">24 နာရီ အရောင်းအဝယ်</th><th class="r">ပျမ်းမျှ $/အရောင်းအဝယ်</th><th>ဆုံးဖြတ်ချက်</th></tr></thead>
      <tbody>
        {#each model as r}
          <tr>
            <th class="rh">{r.sym}</th>
            <td class="r cell" class:hi={r.turnover >= 5} class:mid={r.turnover >= 3 && r.turnover < 5}>{r.turnover.toFixed(1)}x</td>
            <td class="r m">{r.txns}</td>
            <td class="r m">{fmtUsd(r.avgTrade)}</td>
            <td class="v" class:wash={r.verdict === 'wash'} class:el={r.verdict === 'elevated'}>{lbl[r.verdict]}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <div class="note">လည်ပတ်မှု (turnover) = နေ့စဉ်ပမာဏ / pool liquidity။ အမှန်တကယ် DEX ပမာဏသည် အတုအယောင်ဖောင်းပွမှု မရှိဘဲ တစ်ရက်လျှင် &gt;3–5x ကို ခဲယဉ်းစွာ ထိန်းထားနိုင်သည်။ ၎င်းသည် ခန့်မှန်းနည်းသာဖြစ်ပြီး သက်သေမဟုတ်ပါ — အရောင်းအဝယ်အရေအတွက် အလွန်နည်းပါလျက် turnover မြင့်နေခြင်းသည် ပမာဏကို မိမိအချင်းချင်း လှည့်ပတ်နေခြင်း ဖြစ်နိုင်သည်။</div>
{/if}

<style>
  .wrap{overflow-x:auto}
  .w{width:100%;border-collapse:collapse;font-size:12px}
  .w th{color:var(--dim);font-weight:400;padding:4px 8px;font-size:11px;text-align:left}
  .w .r{text-align:right;font-family:var(--mono)}
  .w td{padding:6px 8px;border-top:1px solid var(--border)}
  .w .rh{text-align:left;color:var(--text);font-weight:500}
  .w .m{color:var(--muted)}
  .cell.mid{background:rgba(214,158,46,.16);color:#e0a93a}
  .cell.hi{background:rgba(207,79,95,.2);color:#e06a78}
  .v{color:var(--muted)} .v.el{color:#e0a93a} .v.wash{color:#e06a78;font-weight:600}
  .note{font-size:12px;color:var(--muted);margin-top:10px;line-height:1.5}
  .empty{color:var(--muted);font-size:13px;padding:24px 4px}
</style>
