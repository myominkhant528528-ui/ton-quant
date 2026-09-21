<script>
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { loadDeskCalibration } from '$lib/data.js';
  import { experimentEvidence, mindmapNextAction, mindmapPrompt, normalizeMindmapNode } from '$lib/mindmap.js';
  const nodes = [
    ['sources', 'စိတ်ကူးရင်းမြစ်များ'],
    ['hypothesis', 'ယူဆချက်'],
    ['experiment', 'အသေးဆုံး စမ်းသပ်ချက်'],
    ['validation', 'Forward / paper-test']
  ];
  const branches = [
    ['desk', 'AI Smart-Money ဒက်စ်'],
    ['showcase', 'ပြသချက်'],
    ['log', 'ဆုံးဖြတ်ချက် မှတ်တမ်း'],
    ['data', 'GitHub Actions → data/*.json'],
    ['ledger', 'Source ledger'],
    ['history', 'Point-in-time universe history']
  ];
  const idName = Object.fromEntries([...nodes, ...branches]);
  const sourceLinks = [
    ['LROO Rug Pull Detector', 'https://arxiv.org/abs/2603.11324', 'အဓိကရင်းမြစ် · leakage ခံနိုင်ရည်ရှိသော အကဲဖြတ်မှု'],
    ['TON DEX rug-pull detection', 'https://arxiv.org/abs/2509.01168', 'အဓိကရင်းမြစ် · platform-aware label များ'],
    ['Crypto momentum state dependence', 'https://papers.ssrn.com/sol3/papers.cfm?abstract_id=6648082', 'လုပ်ငန်းစဉ်စာတမ်း · ယူဆချက်'],
    ['Reddit: on-chain rug detector', 'https://www.reddit.com/r/solanadev/comments/1uk1idx/i_built_an_onchain_cabalrugdetection_api_that/', 'ယူဆချက်သာ · အထောက်အထား မဟုတ်ပါ']
  ];
  const details = {
    sources: ['စိတ်ကူးရင်းမြစ်များ', 'သိပ္ပံစာတမ်းများနှင့် မူလဒေတာများက အခြေခံအကြောင်းပြချက်ကို ပေးသည်၊ မကြာသေးမီက AI လုပ်ငန်းများနှင့် Reddit က စစ်ဆေးရန် ကိုယ်စားလှယ်လောင်းများကို ပေးသည်။'],
    hypothesis: ['ယူဆချက်', 'ကုဒ်မရေးမီ တိုင်းတာနိုင်သော သက်ရောက်မှု၊ baseline၊ မျှော်မှန်းသည့် အလုပ်လုပ်ပုံနှင့် ပယ်ချမည့်အခြေအနေကို ဖော်ထုတ်သည်။'],
    experiment: ['အသေးဆုံး စမ်းသပ်ချက်', 'စုဆောင်းပြီးသား ဒေတာနှင့် စိတ်ကူးကို ချေပနိုင်သော အတိုဆုံး စမ်းသပ်မှုကို အသုံးပြုသည်။'],
    validation: ['Forward / paper-test', 'သင်ကြားမှု နမူနာအပြင်ဘက်တွင် စစ်ဆေးပြီး fee၊ leakage၊ စစ်ဆေးမှုအများအပြားနှင့် အချိန်ကာလအတွင်း တည်ငြိမ်မှုကို ထည့်သွင်းစဉ်းစားသည်။'],
    desk: ['AI Smart-Money ဒက်စ်', 'Deterministic feature များက လုံခြုံသော floor ကို သတ်မှတ်ပေးပြီး LLM က အကဲဖြတ်ချက်ကို ပေါင်းစပ်ကာ calibration က အနာဂတ်ဒေတာပေါ်တွင် စစ်ဆေးသည်။'],
    showcase: ['ပြသချက်', 'Brief၊ analytics၊ wallets နှင့် desk တို့က စစ်ဆေးပြီးသော ရလဒ်များကို ပြသပြီး လေ့လာတွေ့ရှိချက်များကို hypothesis စက်ဝန်းအသစ်သို့ ပြန်ပို့သည်။'],
    log: ['ဆုံးဖြတ်ချက် မှတ်တမ်း', 'ROADMAP-v3.md တွင် ရလဒ်၊ လက်ခံ/ပယ်ချရသည့် အကြောင်းရင်းများနှင့် နောက်ထပ်စစ်ဆေးနိုင်သော မေးခွန်းကို သိမ်းထားသည်။'],
    data: ['ဒေတာစီးကြောင်း', 'GitHub Actions က snapshot များကို data/*.json တွင် စုဆောင်းသည်၊ ဒက်စ်နှင့် static ပြသမျက်နှာစာတို့သည် Git ရှိ ဖိုင်များမှတစ်ဆင့်သာ ဆက်သွယ်သည်။'],
    ledger: ['Source ledger', 'run တစ်ခုလျှင် အေးခဲထားသော hypothesis တစ်ခု၊ deterministic OOS-gate နှင့် factor များကို အလိုအလျောက် promote မလုပ်ခြင်း။'],
    history: ['Point-in-time universe history', 'တစ်နာရီတစ်ကြိမ် append-only OKX snapshot များ။ survivorship-aware သုတေသနအတွက် မှတ်တမ်းမလုံလောက်သေးသရွေ့ status သည် collecting အဖြစ်ရှိနေသည်။']
  };

  let selected = $state('sources');
  let submitState = $state('');
  let calibration = $state(undefined);
  let selectedDetail = $derived(details[selected]);
  let evidence = $derived(experimentEvidence(calibration));
  let nextAction = $derived(mindmapNextAction(calibration));

  function select(id) {
    selected = normalizeMindmapNode(id);
    submitState = '';
    if (typeof window !== 'undefined') {
      localStorage.setItem('tq_mindmap_selected', selected);
      const url = new URL(window.location.href);
      url.searchParams.set('node', selected);
      window.history.replaceState(null, '', url);
    }
  }

  onMount(() => {
    loadDeskCalibration().then((data) => (calibration = data)).catch(() => (calibration = null));
    const urlNode = new URL(window.location.href).searchParams.get('node');
    const savedNode = localStorage.getItem('tq_mindmap_selected');
    select(normalizeMindmapNode(urlNode || savedNode));
  });

  async function submit() {
    const [title, description] = selectedDetail;
    const prompt = mindmapPrompt(title, description, evidence, nextAction);
    if (window.openai?.sendFollowUpMessage) {
      await window.openai.sendFollowUpMessage({ title: `«${title}» ဌာနခွဲကို ဆက်လက်ဖွံ့ဖြိုးရန်`, prompt });
      submitState = 'sent';
      return;
    }
    await navigator.clipboard?.writeText(prompt).catch(() => {});
    const issue = `https://github.com/xpyct1337/ton-quant/issues/new?title=${encodeURIComponent('TON Quant: ' + title)}&body=${encodeURIComponent(prompt)}`;
    window.open(issue, '_blank', 'noopener');
    submitState = 'opened';
  }
</script>

<svelte:head><title>အတွေးမြေပုံ — TON Quant</title></svelte:head>

<header class="hd">
  <div class="hd-top"><h1>အတွေးမြေပုံ</h1><span class="muted">နောက်ထပ် ဖွံ့ဖြိုးရေးဌာနခွဲကို ရွေးပါ</span></div>
</header>

<section class="map" aria-label="TON Quant ၏ အဓိက သုတေသန စက်ဝန်း">
  <div class="flow">
    {#each nodes as node, i}
      <button type="button" class="node" class:selected={selected === node[0]} aria-pressed={selected === node[0]} onclick={() => select(node[0])}>{node[1]}</button>
      {#if i < nodes.length - 1}<span class="arrow" aria-hidden="true">→</span>{/if}
    {/each}
  </div>

  <div class="branches" aria-label="ရလဒ်နှင့် အခြေခံအဆောက်အအုံ ဌာနခွဲများ">
    <div class="branch-label muted">သက်ရောက်မှု အတည်ပြုပါက</div>
    <div class="flow">
      {#each branches.slice(0, 2) as branch}
        <button type="button" class="node" class:selected={selected === branch[0]} aria-pressed={selected === branch[0]} onclick={() => select(branch[0])}>{branch[1]}</button>
      {/each}
    </div>
    <div class="branch-label muted">သက်ရောက်မှု မရှိလျှင် သို့မဟုတ် ဒေတာနည်းလျှင်</div>
    <div class="flow">
      {#each branches.slice(2, 3) as branch}
        <button type="button" class="node" class:selected={selected === branch[0]} aria-pressed={selected === branch[0]} onclick={() => select(branch[0])}>{branch[1]}</button>
      {/each}
    </div>
    <div class="flow infra">
      {#each branches.slice(3) as branch}
        <button type="button" class="node" class:selected={selected === branch[0]} aria-pressed={selected === branch[0]} onclick={() => select(branch[0])}>{branch[1]}</button>
      {/each}
    </div>
  </div>
</section>

<section class="card detail" aria-live="polite">
  <div><strong>{selectedDetail[0]}</strong><p class="muted">{selectedDetail[1]}</p><span class="evidence {evidence.tone}">{evidence.label} · <a href="{base}/desk/">ဒက်စ်ကိုဖွင့်ရန် ↗</a></span><span class="next muted">နောက်တစ်ဆင့်: {nextAction.label} <button type="button" class="jump" onclick={() => select(nextAction.id)}>ဖွင့်ရန် {idName[nextAction.id] ?? nextAction.id} →</button></span>
    {#if selected === 'sources'}
      <div class="source-ledger" aria-label="Source ledger">
        <span class="muted small">source ledger</span>
        {#each sourceLinks as source}
          <a href={source[1]} target="_blank" rel="noreferrer">{source[0]} <span class="muted">· {source[2]}</span></a>
        {/each}
      </div>
    {/if}
  </div>
  <button type="button" class="submit" onclick={submit}>တင်သွင်းရန် → ဖွံ့ဖြိုးရေး</button>
  {#if submitState === 'sent'}<span class="status good">လက်ရှိ Codex task သို့ ပို့ပြီးပါပြီ။</span>{/if}
  {#if submitState === 'opened'}<span class="status good">GitHub issue ကို ပြင်ဆင်ပြီးပါပြီ၊ စာသားကိုလည်း copy ကူးထားပါသည်။</span>{/if}
</section>

<style>
  .hd{margin-bottom:16px}.hd-top{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap}h1{font-size:24px}.map{display:grid;gap:16px}.flow{display:flex;justify-content:center;align-items:center;gap:8px;flex-wrap:wrap}.node{font:inherit;color:var(--text);background:var(--card2);border:1px solid var(--border);border-radius:9px;padding:8px 11px;cursor:pointer}.node:hover,.node.selected{color:var(--accent);border-color:rgba(34,167,255,.55);background:rgba(34,167,255,.1)}.arrow{color:var(--muted)}.branches{display:grid;gap:9px;padding:12px 0;border-block:1px solid var(--border)}.branch-label{text-align:center;font-size:12px}.infra{padding-top:8px}.detail{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap}.detail p{margin:5px 0 0;max-width:720px;line-height:1.5}.evidence{display:block;font-size:12px;margin-top:8px}.evidence.good{color:var(--good)}.evidence.warn{color:var(--warn)}.evidence.muted{color:var(--muted)}.evidence a{color:inherit}.next{display:block;font-size:12px;margin-top:6px}.jump{border:0;background:none;color:var(--accent);cursor:pointer;padding:0;font:inherit}.source-ledger{display:grid;gap:3px;margin-top:12px;font-size:12px}.source-ledger a{color:var(--accent);text-decoration:none}.source-ledger a:hover{text-decoration:underline}.submit{background:var(--accent);color:#04223b;border:0;border-radius:9px;padding:9px 13px;font-weight:500;cursor:pointer}.status{font-size:12px}.good{color:var(--good)}
  @media(max-width:520px){.detail{align-items:stretch;flex-direction:column}.submit{width:100%}}
</style>
