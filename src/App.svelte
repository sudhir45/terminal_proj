<script lang="ts">
  import { onDestroy } from 'svelte';
  import Ps1 from './components/Ps1.svelte';
  import Input from './components/Input.svelte';
  import History from './components/History.svelte';
  import { theme } from './stores/theme';
  import type { Theme } from './interfaces/theme';

  const variableMappings: Array<[string, keyof Theme]> = [
    ['--term-bg', 'background'],
    ['--term-fg', 'foreground'],
    ['--term-accent', 'green'],
    ['--term-muted', 'brightBlack'],
    ['--term-yellow', 'yellow'],
    ['--term-white', 'white'],
    ['--term-green', 'green']
  ];

  $: {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      variableMappings.forEach(([cssVariable, themeKey]) => {
        root.style.setProperty(cssVariable, $theme[themeKey]);
      });
    }
  }

  onDestroy(() => {
    if (typeof document === 'undefined') {
      return;
    }
    variableMappings.forEach(([cssVariable]) => {
      document.documentElement.style.removeProperty(cssVariable);
    });
  });
</script>

<svelte:head>
  {#if import.meta.env.VITE_TRACKING_ENABLED === 'true'}
    <script
      async
      defer
      data-website-id={import.meta.env.VITE_TRACKING_SITE_ID}
      src={import.meta.env.VITE_TRACKING_URL}
    ></script>
  {/if}
</svelte:head>

<main
  class="terminal-shell h-full border-2 rounded-md p-4 text-xs sm:text-sm md:text-base"
>
  <section class="terminal-history-panel" aria-label="Terminal output">
    <History />
  </section>

  <div class="terminal-input-bar">
    <div class="flex flex-col md:flex-row">
      <Ps1 />

      <Input />
    </div>
  </div>
</main>
