export const MINDMAP_NODE_IDS = new Set([
  'sources', 'hypothesis', 'experiment', 'validation',
  'desk', 'showcase', 'log', 'data', 'ledger', 'history'
]);

export function normalizeMindmapNode(value, fallback = 'sources') {
  return MINDMAP_NODE_IDS.has(value) ? value : fallback;
}

export function mindmapPrompt(title, description, evidence, nextAction) {
  return `TON Quant ကို «${title}» ဌာနခွဲမှ ဆက်လက်လုပ်ဆောင်ပါ။ ${description}\n\nလက်ရှိအခြေအနေ — ${evidence.label}။ နောက်တစ်ဆင့်: ${nextAction.label}။\n\nPonytail နည်းလမ်းအရ သက်သေပြနိုင်/ပယ်ချနိုင်သော အသေးဆုံး နောက်တစ်ဆင့်ကို ရွေးပါ၊ အကောင်အထည်ဖော်ပြီး စစ်ဆေးပါ။ ဆုံးဖြတ်ချက် ပြောင်းလဲမှသာ docs/PROJECT-MAP.md နှင့် ROADMAP-v3.md ကို update လုပ်ပါ။`;
}

function withMomentumStatus(label, calibration) {
  const test = calibration?.momentum_test;
  return test?.available ? `${label} · mom_7d ${test.passed ? 'အောင်မြင်' : 'ပယ်ချခံရ'}` : label;
}

export function experimentEvidence(calibration) {
  const bundle = calibration?.bundle_backtest;
  const confidence = bundle?.confidence;
  if (!bundle || !confidence) return { tone: 'muted', label: withMomentumStatus('အထောက်အထား: စုဆောင်းနေသည်', calibration) };
  if (confidence.reason === 'insufficient_matured_dates') {
    const coverage = confidence.matured_dates && confidence.required_dates ? ` (${confidence.matured_dates}/${confidence.required_dates})` : '';
    return { tone: 'warn', label: withMomentumStatus(`အထောက်အထား: ရင့်ကျက်သောကာလကို စောင့်နေသည်${coverage}`, calibration) };
  }
  if (confidence.passed) return { tone: 'good', label: withMomentumStatus('အထောက်အထား: confidence gate အောင်မြင်ပြီး', calibration) };
  if (bundle.candidate && confidence.available) {
    return confidence.in_sample?.n ?
      { tone: 'warn', label: withMomentumStatus('အထောက်အထား: gate မအောင်မြင်သေးပါ', calibration) } :
      { tone: 'warn', label: withMomentumStatus('အထောက်အထား: in-sample စုဆောင်းနေသည်', calibration) };
  }
  return { tone: 'muted', label: withMomentumStatus('အထောက်အထား: စုဆောင်းနေသည်', calibration) };
}

export function mindmapNextAction(calibration) {
  const bundle = calibration?.bundle_backtest;
  const confidence = bundle?.confidence;
  if (!bundle) return { id: 'sources', label: 'အထောက်အထား စုဆောင်းရန်' };
  if (confidence?.reason === 'insufficient_matured_dates') {
    return { id: 'data', label: 'ရင့်ကျက်သော IS မှတ်တမ်းကို စောင့်ရန်' };
  }
  if (bundle.candidate && confidence?.available && !confidence.passed && !confidence.in_sample?.n) {
    return { id: 'data', label: 'IS မှတ်တမ်း စုဆောင်းရန်' };
  }
  if (bundle.candidate && confidence?.available && !confidence.passed) {
    return { id: 'validation', label: 'confidence gate ကို စစ်ဆေးခွဲခြမ်းရန်' };
  }
  return { id: confidence?.passed ? 'validation' : 'data', label: confidence?.passed ? 'OOS အတည်ပြုရန်' : 'coverage ကို စောင့်ရန်' };
}
