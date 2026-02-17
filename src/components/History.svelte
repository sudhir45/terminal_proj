<script lang="ts">
  import { afterUpdate } from 'svelte';
  import { history } from '../stores/history';
  import Ps1 from './Ps1.svelte';

  let historyContainer: HTMLDivElement;

  afterUpdate(() => {
    if (historyContainer) {
      historyContainer.scrollTop = historyContainer.scrollHeight;
    }
  });
</script>

<div
  bind:this={historyContainer}
  class="terminal-history"
  role="log"
  aria-live="polite"
  aria-relevant="additions text"
>
  {#each $history as { command, outputs, isSuggestion }, index (`${index}-${command}`)}
    <div class={`history-entry ${isSuggestion ? 'history-suggestion' : ''}`}>
      <div class="flex flex-col md:flex-row">
        <Ps1 />

        <div class="flex">
          <p class="visible md:hidden">❯</p>

          <p class="px-2 break-all">{command}</p>
        </div>
      </div>

      {#each outputs as output}
        <p class="whitespace-pre-wrap break-words leading-relaxed">
          {output}
        </p>
      {/each}
    </div>
  {/each}
</div>
