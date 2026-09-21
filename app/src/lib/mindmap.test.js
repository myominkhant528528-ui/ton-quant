import test from 'node:test';
import assert from 'node:assert/strict';
import { experimentEvidence, mindmapNextAction, mindmapPrompt, normalizeMindmapNode } from './mindmap.js';

test('mindmap node state fails closed and preserves known branches', () => {
  assert.equal(normalizeMindmapNode('experiment'), 'experiment');
  assert.equal(normalizeMindmapNode('unknown'), 'sources');
  assert.equal(normalizeMindmapNode(null, 'history'), 'history');
});

test('mindmap evidence status fails closed and exposes the IS-data block', () => {
  assert.equal(experimentEvidence(null).label, 'အထောက်အထား: စုဆောင်းနေသည်');
  assert.equal(experimentEvidence({
    bundle_backtest: { candidate: true, confidence: { available: true, passed: false, in_sample: { n: 0 } } }
  }).label, 'အထောက်အထား: in-sample စုဆောင်းနေသည်');
  assert.equal(experimentEvidence({
    bundle_backtest: { candidate: true, confidence: { available: true, passed: true } }
  }).tone, 'good');
  assert.equal(experimentEvidence({
    bundle_backtest: { confidence: { available: false, reason: 'insufficient_matured_dates' } }
  }).label, 'အထောက်အထား: ရင့်ကျက်သောကာလကို စောင့်နေသည်');
  assert.equal(experimentEvidence({
    bundle_backtest: { confidence: { available: false, reason: 'insufficient_matured_dates' } },
    momentum_test: { available: true, passed: false }
  }).label, 'အထောက်အထား: ရင့်ကျက်သောကာလကို စောင့်နေသည် · mom_7d ပယ်ချခံရ');
  assert.equal(experimentEvidence({
    bundle_backtest: { confidence: { available: false, reason: 'insufficient_matured_dates', matured_dates: 3, required_dates: 6 } }
  }).label, 'အထောက်အထား: ရင့်ကျက်သောကာလကို စောင့်နေသည် (3/6)');
});

test('mindmap next action points to data while IS history is empty', () => {
  assert.equal(mindmapNextAction(null).id, 'sources');
  assert.deepEqual(mindmapNextAction({
    bundle_backtest: { candidate: true, confidence: { available: true, passed: false, in_sample: { n: 0 } } }
  }), { id: 'data', label: 'IS မှတ်တမ်း စုဆောင်းရန်' });
  assert.deepEqual(mindmapNextAction({
    bundle_backtest: { confidence: { available: false, reason: 'insufficient_matured_dates' } }
  }), { id: 'data', label: 'ရင့်ကျက်သော IS မှတ်တမ်းကို စောင့်ရန်' });
  assert.equal(mindmapNextAction({
    bundle_backtest: { candidate: true, confidence: { available: true, passed: true } }
  }).id, 'validation');
});

test('submit prompt carries current evidence and next action', () => {
  const prompt = mindmapPrompt('အသေးဆုံး စမ်းသပ်ချက်', 'စိတ်ကူးကို စစ်ဆေးရန်',
    { label: 'အထောက်အထား: စောင့်နေသည် (3/6)' }, { label: 'coverage ကို စောင့်ရန်' });
  assert.match(prompt, /အထောက်အထား: စောင့်နေသည် \(3\/6\)/);
  assert.match(prompt, /coverage ကို စောင့်ရန်/);
});
