<script lang="ts">
  import { onMount } from 'svelte';
  import { history, enteredCommandHistory, addCommandToHistory } from '../stores/history';
  import { commands } from '../utils/commands';
  import { track } from '../utils/tracking';

  let command = '';
  let currentCommandHistory: string[] = [];
  let enteredCommandHistoryIndex = -1;
  // Store the command user was typing before navigating history
  let commandBeforeHistoryNavigation = '';

  enteredCommandHistory.subscribe(value => {
    currentCommandHistory = value;
    // Reset index whenever history changes externally, or set to end
    enteredCommandHistoryIndex = currentCommandHistory.length;
  });

  let input: HTMLInputElement;

  onMount(() => {
    input.focus();
    enteredCommandHistoryIndex = $enteredCommandHistory.length; // Initialize to point "after" the last command

    if ($history.length === 0) {
      const cmd = commands['banner'] as () => string; // Renamed to avoid conflict

      if (cmd) {
        const output = cmd();

        $history = [...$history, { command: 'banner', outputs: [output] }];
      }
    }
  });

  const handleKeyDown = async (event: KeyboardEvent) => {
    const key = event.key;

    if (key === 'Enter') {
      if (command.trim() === '') return; // Ignore empty commands

      const [commandName, ...args] = command.trim().split(' ');

      addCommandToHistory(command.trim()); // Add to our new history store

      if (import.meta.env.VITE_TRACKING_ENABLED === 'true') {
        track(commandName, ...args);
      }

      const commandFunction = commands[commandName];

      if (commandFunction) {
        const output = await commandFunction(args);
        if (commandName !== 'clear') {
          $history = [...$history, { command: command.trim(), outputs: [output] }];
        }
      } else {
        const output = `${commandName}: command not found`;
        $history = [...$history, { command: command.trim(), outputs: [output] }];
      }

      command = '';
      commandBeforeHistoryNavigation = ''; // Clear saved command
      enteredCommandHistoryIndex = currentCommandHistory.length; // Reset index to the end
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      if (currentCommandHistory.length === 0) return;

      if (enteredCommandHistoryIndex === currentCommandHistory.length) {
        // If at the "new command" line, save current input
        commandBeforeHistoryNavigation = command;
      }

      if (enteredCommandHistoryIndex > 0) {
        enteredCommandHistoryIndex--;
        command = currentCommandHistory[enteredCommandHistoryIndex];
      }
    } else if (key === 'ArrowDown') {
      event.preventDefault();
      if (currentCommandHistory.length === 0) return;

      if (enteredCommandHistoryIndex < currentCommandHistory.length - 1) {
        enteredCommandHistoryIndex++;
        command = currentCommandHistory[enteredCommandHistoryIndex];
      } else {
        // Moved past the last history item, restore original command or empty
        enteredCommandHistoryIndex = currentCommandHistory.length;
        command = commandBeforeHistoryNavigation;
      }
    } else if (key === 'Tab') {
      event.preventDefault();
      if (command.trim() === '') return;

      const typedCommand = command.trim();
      const matchingCommands = Object.keys(commands).filter((cmd) =>
        cmd.startsWith(typedCommand)
      );

      if (matchingCommands.length === 1) {
        command = matchingCommands[0] + ' '; // Add a space for convenience
      } else if (matchingCommands.length > 1) {
        // Find the longest common prefix
        let lcp = '';
        if (matchingCommands.every(c => c.startsWith(typedCommand))) {
            lcp = typedCommand;
            for (let i = typedCommand.length; i < matchingCommands[0].length; i++) {
                const char = matchingCommands[0][i];
                if (matchingCommands.every(c => c[i] === char)) {
                    lcp += char;
                } else {
                    break;
                }
            }
        }

        if (lcp && lcp !== typedCommand) {
            command = lcp;
        } else {
            // If no further common prefix, display all suggestions
            const suggestionsString = `Suggestions: ${matchingCommands.join('   ')}`;
            // Add to history for display, ensuring not to add it to command execution history
             $history = [...$history, { command: typedCommand, outputs: [suggestionsString], isSuggestion: true }];
        }
      }
      // If no matching commands, do nothing.
    } else if (event.ctrlKey && key === 'l') {
      event.preventDefault();
      $history = [];
    } else {
      // Any other key press (not Enter, ArrowUp, ArrowDown, Tab, Ctrl+L)
      // should reset the history navigation index if user was navigating.
      if (key !== 'Shift' && key !== 'Control' && key !== 'Alt' && key !== 'Meta') { // Ignore modifier keys
        if (enteredCommandHistoryIndex !== currentCommandHistory.length) {
            enteredCommandHistoryIndex = currentCommandHistory.length;
            // commandBeforeHistoryNavigation = command; // User is now typing a new command based on the old one
        }
      }
    }
  };
</script>

<!-- Need to update history interface if isSuggestion is a new prop -->
<!-- Assuming HistoryItem.svelte can handle or ignore isSuggestion -->

<svelte:window
  on:click={() => {
    input.focus();
  }}
/>

<div class="flex w-full">
  <p class="visible md:hidden">❯</p>

  <input
    id="command-input"
    name="command-input"
    aria-label="Command input"
    class="w-full px-2 bg-transparent outline-none"
    type="text"
    autocomplete="off"
    autocapitalize="off"
    autocorrect="off"
    spellcheck="false"
    bind:value={command}
    on:keydown={handleKeyDown}
    bind:this={input}
  />
</div>
