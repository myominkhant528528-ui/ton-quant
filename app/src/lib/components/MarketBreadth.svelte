<script>
  import { breadthWindows, breadthRegime, equalWeightIndex, corrColor } from '$lib/metrics.js';
  let { rows = [] } = $props();

  // Longest window that available history supports, capped at 30d. Grows as snapshots accumulate.
  let spanN = $derived.by(() => {
    const maxLen = rows.filter((r) => r.core && r.hist)
      .reduce((m, r) => Math.max(m, (r.hist || []).filter((s) => s && s.price > 0).length), 0);
    return Math.min(30, Math.max(2, maxLen - 1));
  });
  let winList = $derived(spanN > 7 ? [1, 7, spanN] : spanN > 1 ? [1, spanN] : [1]);
  let wins = $derived(breadthWindows(rows, winList));
  let reg = $derived(breadthRegime(wins));
  let idx = $derived(equalWeightIndex(rows, spanN));

  const lbl = (n) => n + ' ရက်';
  const clamp = (p) => Math.max(0, Math.min(100, p));

  // sparkline path for the equal-weight index (rebased to 100)
  let spark = $derived.by(() => {
    if (!idx || idx.length < 2) return null;
    const W = 260, H = 44, n = idx.length;
    const lo = Math.min(...idx), hi = Math.max(...idx), rng = hi - lo || 1;
    const pts = idx.map((v, i) => [i / (n - 1) * W, H - (v - lo) / rng * H]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
    const chg = (idx[n - 1] / idx[0] - 1) * 100;
    return { d, chg, last: pts[n - 1] };
  });
</script>

{#if !reg}
  <div class="empty">မှတ်တမ်းများ စုဆောင်းနေသည် — CORE token များအတွက် အနည်းဆုံး 2 ရက် လိုအပ်သည်။</div>
{:else}
  <div class="verdict" class:on={reg.regime === 'risk-on'} class:off={reg.regime === 'risk-off'}>
    <span class="tag">{reg.regime}</span>
    <span class="vtext">{reg.up}/{reg.total} CORE token များသည် {reg.n} ရက်အလိုကထက် မြင့်နေသည် (တက်နေသူ {reg.pct.toFixed(0)}%)</span>
  </div>

  <table class="br">
    <thead><tr><th>ကာလ</th><th>ကျယ်ပြန့်မှု (တက်နေသည့် %)</th><th class="r">%up</th><th class="r">အလယ်တန်း</th></tr></thead>
    <tbody>
      {#each wins as w}
        <tr>
          <th class="rh">{lbl(w.n)}</th>
          <td>
            {#if w.pct != null}
              <div class="track"><div class="fill" style="width:{clamp(w.pct).toFixed(0)}%"></div><div class="mid"></div></div>
            {:else}<span class="dim">—</span>{/if}
          </td>
          <td class="r m">{w.pct != null ? w.pct.toFixed(0) + '%' : '—'} <span class="dim">{w.up}↑/{w.total - w.up}↓</span></td>
          <td class="r cell" style="background:{w.med != null ? corrColor(Math.max(-1, Math.min(1, w.med / 15))) : 'transparent'}">{w.med != null ? (w.med >= 0 ? '+' : '') + w.med.toFixed(1) + '%' : '—'}</td>
        </tr>
      {/each}
    </tbody>
  </table>

  {#if spark}
    <div class="idx">
      <div class="idx-h"><span class="idx-lbl">TON Quant Index · အညီအမျှအလေးချိန် {spanN} ရက်</span><span class="idx-chg {spark.chg >= 0 ? 'up' : 'dn'}">{spark.chg >= 0 ? '+' : ''}{spark.chg.toFixed(1)}%</span></div>
      <svg viewBox="0 0 260 44" class="spark" preserveAspectRatio="none">
        <path d={spark.d} fill="none" stroke={spark.chg >= 0 ? 'var(--up,#2e9e5b)' : 'var(--down,#cf4f5f)'} stroke-width="1.6" />
        <circle cx={spark.last[0]} cy={spark.last[1]} r="2.4" fill={spark.chg >= 0 ? 'var(--up,#2e9e5b)' : 'var(--down,#cf4f5f)'} />
      </svg>
    </div>
  {/if}

  <div class="note">ကျယ်ပြန့်မှု = ကာလအတွင်း အပေါင်းလက္ခဏာ ပြန်အမြတ်ရသော CORE token များ၏ အချိုး။ အမည်များစွာ တက်သော တိုးတက်မှုသည် အနည်းငယ်က အညွှန်းကိန်းကို ဆွဲတင်သည်ထက် ပိုကျန်းမာသည်။ မီးခိုးရောင်မျဉ်းသည် 50% ကန့်သတ်ချက် ဖြစ်သည်။</div>
{/if}

<style>
  .verdict{display:flex;align-items:center;gap:10px;margin-bottom:12px;font-size:13px;color:var(--muted)}
  .tag{font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.5px;padding:3px 9px;border-radius:6px;background:rgba(255,255,255,.07);color:var(--muted)}
  .verdict.on .tag{background:rgba(46,158,91,.18);color:#5fd08a}
  .verdict.off .tag{background:rgba(207,79,95,.18);color:#e0808c}
  .br{width:100%;border-collapse:collapse;font-size:12px}
  .br th{color:var(--dim);font-weight:400;padding:4px 8px;font-size:11px;text-align:left}
  .br .r{text-align:right;font-family:var(--mono)}
  .br td{padding:6px 8px;border-top:1px solid var(--border)}
  .br .rh{text-align:left;color:var(--text);font-weight:500}
  .br .m{color:var(--muted)}
  .br .dim{color:var(--dim)}
  .track{position:relative;height:10px;background:rgba(255,255,255,.07);border-radius:5px;min-width:130px;overflow:hidden}
  .fill{position:absolute;left:0;top:0;height:100%;background:rgba(46,158,91,.55);border-radius:5px}
  .mid{position:absolute;left:50%;top:-1px;width:1px;height:12px;background:rgba(255,255,255,.35)}
  .idx{margin-top:14px;padding-top:12px;border-top:1px solid var(--border)}
  .idx-h{display:flex;justify-content:space-between;align-items:baseline;font-size:11px;margin-bottom:4px}
  .idx-lbl{color:var(--dim)}
  .idx-chg{font-family:var(--mono);font-size:12px}
  .idx-chg.up{color:#5fd08a}.idx-chg.dn{color:#e0808c}
  .spark{width:100%;height:44px;display:block}
  .note{font-size:12px;color:var(--muted);margin-top:10px;line-height:1.5}
  .empty{color:var(--muted);font-size:13px;padding:24px 4px}
</style>
