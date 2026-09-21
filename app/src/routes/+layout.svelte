<script>
  import '$lib/style.css';
  import { base } from '$app/paths';
  import { page } from '$app/stores';
  let { children } = $props();
  const nav = [
    { href: base + '/', label: 'ဈေးကွက်', icon: 'ti-home' },
    { href: base + '/brief', label: 'နေ့စဉ်အနှစ်ချုပ်', icon: 'ti-report' },
    { href: base + '/analytics', label: 'ခွဲခြမ်းစိတ်ဖြာ', icon: 'ti-chart-dots' },
    { href: base + '/screener', label: 'စစ်ထုတ်ရှာဖွေ', icon: 'ti-list-search' },
    { href: base + '/arb', label: 'ဈေးကွာအမြတ်', icon: 'ti-arrows-left-right' },
    { href: base + '/perps', label: 'Perps', icon: 'ti-chart-candle' },
    { href: base + '/tgsig', label: 'TG အချက်ပြ', icon: 'ti-brand-telegram' },
    { href: base + '/compare', label: 'နှိုင်းယှဉ်', icon: 'ti-arrows-diff' },
    { href: base + '/portfolio', label: 'ပို့ဖိုလီယို', icon: 'ti-wallet' },
    { href: base + '/wallets', label: 'စမတ်မနီ', icon: 'ti-users-group' },
    { href: base + '/mindmap', label: 'အတွေးမြေပုံ', icon: 'ti-sitemap' },
    { href: base + '/xsmom', label: 'အရှိန်', icon: 'ti-trending-up' },
    { href: base + '/paper', label: 'စမ်းသပ် Bot', icon: 'ti-robot' },
    { href: base + '/desk', label: 'AI ဒက်စ်', icon: 'ti-cpu' },
    { href: base + '/health', label: 'စနစ်ကျန်းမာရေး', icon: 'ti-heartbeat' }
  ];
  const norm = (p) => (p.replace(/\/+$/, '') || '/');
  let current = $derived(norm($page.url.pathname));
  const isActive = (href) => norm(href) === current;
</script>

<svelte:head>
  <title>TON Quant — ဈေးကွက်</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.19.0/dist/tabler-icons.min.css" />
</svelte:head>

<div class="shell">
  <aside class="side">
    <div class="logo"><span class="mark">Q</span><span class="name">TON Quant</span></div>
    <nav>
      {#each nav as n}
        <a class="navlink" class:active={isActive(n.href)} href={n.href}><i class="ti {n.icon}"></i><span>{n.label}</span></a>
      {/each}
    </nav>
    <div class="side-foot muted">v2 · onchain တိုက်ရိုက်</div>
  </aside>
  <main>{@render children()}</main>
</div>

<style>
  .shell{display:flex;min-height:100vh}
  .side{width:var(--nav);flex:none;background:#0a0e16;border-right:1px solid var(--border);
    padding:18px 12px;display:flex;flex-direction:column;gap:6px;position:sticky;top:0;height:100vh}
  .logo{display:flex;align-items:center;gap:9px;padding:4px 8px 16px}
  .mark{width:26px;height:26px;border-radius:7px;background:var(--accent);color:#04223b;
    display:flex;align-items:center;justify-content:center;font-family:var(--head);font-weight:600}
  .name{font-family:var(--head);font-weight:600;font-size:15px}
  .navlink{display:flex;align-items:center;gap:10px;padding:9px 11px;border-radius:9px;color:var(--muted);font-size:14px}
  .navlink:hover{background:var(--card);color:var(--text)}
  .navlink.active{background:rgba(34,167,255,.13);color:var(--accent)}
  .navlink i{font-size:18px}
  .side-foot{margin-top:auto;padding:8px;font-size:11px}
  main{flex:1;min-width:0;padding:22px 26px;max-width:1180px}
  @media(max-width:640px){
    .shell{display:block}
    .side{position:fixed;inset:auto 0 0 0;width:auto;height:auto;flex-direction:row;border-right:none;border-top:1px solid var(--border);padding:4px 2px;gap:0;z-index:50;background:#0a0e16}
    .logo,.side-foot{display:none}
    /* горизонтальный скролл со snap: пунктов больше, чем влезает в экран */
    .side nav{display:flex;flex-direction:row;width:100%;overflow-x:auto;scroll-snap-type:x proximity;
      -webkit-overflow-scrolling:touch;scrollbar-width:none}
    .side nav::-webkit-scrollbar{display:none}
    .navlink{flex:0 0 auto;min-width:62px;scroll-snap-align:start;flex-direction:column;gap:2px;padding:7px 6px;font-size:10px;min-height:48px;align-items:center;justify-content:center;text-align:center}
    .navlink i{font-size:19px}
    .navlink span{font-size:10px;line-height:1.05}
    main{padding:14px 14px 66px;max-width:none}
  }
</style>
