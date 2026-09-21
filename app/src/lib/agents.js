import { persistentSignal } from './metrics.js';

const ago = (date) => {
  const d = Math.round((Date.now() - new Date(date + 'T03:10:00Z').getTime()) / 86400000);
  return d <= 0 ? 'ယနေ့' : d === 1 ? '1 ရက်အကြာ' : d + ' ရက်အကြာ';
};

// Build rule-based "agent" briefing cards from data we already compute.
export function buildAgents({ rows, signals }) {
  const cards = [];
  const byAddr = Object.fromEntries(rows.map((r) => [r.addr, r]));

  // 1. Anomaly / rug-watch — persistent multi-snapshot signals.
  for (const r of rows) {
    const ps = persistentSignal(r.hist);
    if (!ps) continue;
    if (ps.kind === 'rug_confirmed')
      cards.push({ agent: 'ပုံမမှန်မှု', icon: 'ti-radar', tone: 'bad', sym: r.sym, addr: r.addr,
        text: `${r.sym}: TVL ${ps.dtvl.toFixed(1)}% (2 ရက်အတွင်း) — Liquidity ထွက်ခွာမှု အတည်ပြုပြီး (rug-watch)။` });
    else if (ps.kind === 'holder_exodus')
      cards.push({ agent: 'ပုံမမှန်မှု', icon: 'ti-radar', tone: 'bad', sym: r.sym, addr: r.addr,
        text: `${r.sym}: holder များ ${ps.dh.toFixed(1)}% (2 ရက်အတွင်း) — holder များ အစုလိုက် ထွက်ခွာနေသည်။` });
    else if (ps.kind === 'accum_confirmed')
      cards.push({ agent: 'စုဆောင်းမှု', icon: 'ti-trending-up', tone: 'good', sym: r.sym, addr: r.addr,
        text: `${r.sym}: holder များ တိုးလာနေသည် (+${ps.dh.toFixed(1)}%) ဈေးကျနေစဉ် — တိတ်တဆိတ် စုဆောင်းနေခြင်း။` });
  }

  // 2. Today's alpha signals → cards, annotated with score verdict.
  const verdict = (sig) => signals?.scores?.per_sig?.[sig]?.verdict;
  const seen = new Set();
  for (const s of signals?.today?.signals || []) {
    const key = s.sig + s.addr;
    if (seen.has(key)) continue;
    seen.add(key);
    const v = verdict(s.sig);
    const tone = s.sig === 'momentum' || s.sig.includes('accum') || s.sig === 'hidden_buyer' ? 'good' : 'info';
    cards.push({ agent: 'စီးဆင်းမှု', icon: 'ti-chart-arrows', tone, sym: s.sym, addr: s.addr,
      text: `${s.sym}: ${s.sig.replace(/_/g, ' ')}${s.d1 != null ? ' ' + (s.d1 >= 0 ? '+' : '') + s.d1.toFixed(1) + '%' : ''}` +
            `${v ? ` · အချက်ပြ: ${v}` : ''}`, when: signals?.date ? ago(signals.date) : '' });
  }

  // 3. Wash suspects (vol/TVL > 3).
  for (const r of rows.filter((x) => x.volTvl > 3).slice(0, 3))
    cards.push({ agent: 'Wash', icon: 'ti-droplet-filled', tone: 'warn', sym: r.sym, addr: r.addr,
      text: `${r.sym}: vol/TVL = ${r.volTvl.toFixed(1)}× — wash trading ဖြစ်နိုင်ဖွယ်ရှိသည်။` });

  const rank = { bad: 0, good: 1, warn: 2, info: 3 };
  return cards.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 8);
}
