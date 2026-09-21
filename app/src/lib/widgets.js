// Widget registry — single source of truth for the Analytics page.
// Each entry: { id, title, group, ready, span, desc, component }.
// `ready:false` widgets are listed (greyed) but not yet renderable.
import Treemap from './components/Treemap.svelte';
import CorrMatrix from './components/CorrMatrix.svelte';
import Momentum from './components/Momentum.svelte';
import Rsi from './components/Rsi.svelte';
import Macd from './components/Macd.svelte';
import Reversal from './components/Reversal.svelte';
import LeadLag from './components/LeadLag.svelte';
import RiskReturn from './components/RiskReturn.svelte';
import Drawdown from './components/Drawdown.svelte';
import WashDetector from './components/WashDetector.svelte';
import PHRatio from './components/PHRatio.svelte';
import Absorption from './components/Absorption.svelte';
import RugRadar from './components/RugRadar.svelte';
import MarketBreadth from './components/MarketBreadth.svelte';

export const GROUPS = ['ခြုံငုံသုံးသပ်ချက်', 'အရှိန်', 'Token အချင်းချင်း', 'အန္တရာယ်', 'ဈေးကွက်ဖွဲ့စည်းပုံ'];

export const WIDGETS = [
  { id: 'treemap', title: 'ဈေးကွက်မြေပုံ', group: 'ခြုံငုံသုံးသပ်ချက်', ready: true, span: 2, component: Treemap,
    desc: 'ဈေးကွက်မြေပုံ — အရွယ်အစား = mcap၊ အရောင် = ရွေးထားသောကာလ၏ ပြန်အမြတ်' },
  { id: 'breadth', title: 'ဈေးကွက် Breadth', group: 'ခြုံငုံသုံးသပ်ချက်', ready: true, span: 2, component: MarketBreadth,
    desc: 'ကာလ 1/7/30 ရက်အလိုက် တက်နေသည့် % + အညီအမျှအလေးချိန် ခြင်းတောင်း အညွှန်းကိန်း (တောင်းဆိုမှု 0)' },

  { id: 'momentum', title: 'Momentum အဆင့်ဇယား', group: 'အရှိန်', ready: true, span: 1, component: Momentum,
    desc: 'RS အဆင့် 7/14/30 ရက် + လမ်းကြောင်း' },
  { id: 'rsi', title: 'RSI + Divergence', group: 'အရှိန်', ready: true, span: 1, component: Rsi,
    desc: 'Wilder RSI(14) + divergence (အနည်းဆုံး ရက် 15 လိုသည်)' },
  { id: 'macd', title: 'MACD လမ်းကြောင်း', group: 'အရှိန်', ready: true, span: 1, component: Macd,
    desc: 'MACD(12,26,9) + ဖြတ်ကျော်မှု + divergence (အနည်းဆုံး ရက် 35 လိုသည်)' },
  { id: 'reversal', title: 'ပြောင်းပြန်လှည့်မှု စောင့်ကြည့်', group: 'အရှိန်', ready: true, span: 1, component: Reversal,
    desc: 'RSI+MACD divergence များ ပေါင်းစပ်ခြင်း (နှစ်ထပ်အတည်ပြု)' },

  { id: 'corr', title: 'ဆက်စပ်မှု matrix', group: 'Token အချင်းချင်း', ready: true, span: 2, component: CorrMatrix,
    desc: 'ထိပ်တန်း 12 ခု၏ ဆက်စပ်မှု (correlation) + ခြင်းတောင်းနှင့် β' },
  { id: 'leadlag', title: 'Lead–lag ရေဒါ', group: 'Token အချင်းချင်း', ready: true, span: 1, component: LeadLag,
    desc: 'ဘယ်သူ ဦးစွာရွေ့သနည်း (1 ရက် နောက်ကျမှု)' },
  { id: 'phratio', title: 'P/H အချိုး', group: 'Token အချင်းချင်း', ready: true, span: 1, component: PHRatio,
    desc: 'Holder တစ်ဦးလျှင် Mcap နှင့် အလယ်တန်းတန်ဖိုး နှိုင်းယှဉ် — တန်ဖိုးကြီးလွန်းမှု စစ်ထုတ်ခြင်း' },

  { id: 'riskret', title: 'အန္တရာယ်–ပြန်အမြတ် မြေပုံ', group: 'အန္တရာယ်', ready: true, span: 2, component: RiskReturn,
    desc: 'ပြန်အမြတ်နှင့် volatility နှိုင်းယှဉ်၊ Sharpe' },
  { id: 'drawdown', title: 'Drawdown ရေဒါ', group: 'အန္တရာယ်', ready: true, span: 1, component: Drawdown,
    desc: '40 ရက် အမြင့်ဆုံးမှ ကျဆင်းမှု + အကွာအဝေးအတွင်း တည်နေရာ' },

  { id: 'wash', title: 'Wash ရှာဖွေကိရိယာ', group: 'ဈေးကွက်ဖွဲ့စည်းပုံ', ready: true, span: 1, component: WashDetector,
    desc: 'vol/TVL လည်ပတ်မှု — ပမာဏ အတုအယောင်ဖောင်းပွမှု အလံ' },
  { id: 'absorption', title: 'ပမာဏ × ဈေးနှုန်း', group: 'ဈေးကွက်ဖွဲ့စည်းပုံ', ready: true, span: 1, component: Absorption,
    desc: 'စုပ်ယူမှု (Absorption): ရောင်းဝယ်စီးဆင်းမှုနှင့် ဈေးနှုန်း' },

  { id: 'rugradar', title: 'Rug ရေဒါ', group: 'အန္တရာယ်', ready: true, span: 1, component: RugRadar,
    desc: 'Liquidity ထွက်ခွာမှု — ဈေးမပြောင်းဘဲ TVL ကျနေခြင်း (တောင်းဆိုမှု 0)' }
];

export const READY_IDS = WIDGETS.filter((w) => w.ready).map((w) => w.id);

// Presets = profiles. Only reference ready ids.
export const PRESETS = {
  'အားလုံး': READY_IDS,
  'ကုန်သွယ်သူ': ['breadth', 'momentum', 'rsi', 'macd', 'reversal', 'absorption', 'treemap'],
  'ရင်းနှီးမြှုပ်နှံသူ': ['breadth', 'corr', 'riskret', 'drawdown', 'phratio', 'treemap'],
  'အန္တရာယ်စီမံသူ': ['riskret', 'drawdown', 'rugradar', 'reversal', 'wash', 'corr']
};
